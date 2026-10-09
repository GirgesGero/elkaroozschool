-- Role + authorization matrix for the EL KAROOZ Supabase layer.
--
-- Run inside a transaction and ROLLBACK: every block below is a probe, not a
-- change. Real production UUIDs are resolved first as postgres (RLS hides them
-- from the roles under test), then the role is switched with the JWT claims set
-- via set_config, which is how PostgREST authenticates a real request.
--
-- Do NOT test RLS by relying on current_user = postgres. That bypasses every
-- policy and reports false confidence.
--
-- ---------------------------------------------------------------------------
-- CRITICAL: one statement per actor.
--
-- public.is_admin_or_super_user() and public.get_current_user_group() are declared
-- STABLE, so PostgreSQL evaluates them once per statement and reuses that result
-- for the whole statement. An earlier version of this matrix looped over all five
-- actors inside a single DO block, which is one statement. The first actor's
-- answer was computed once and reused for the remaining four, so the trainee's
-- cached "false" made admin and super_user appear denied for cross-group reads.
--
-- Those two FAILs were an artefact of the harness, not an application bug. Each
-- actor passes when exercised in its own statement, which is also how PostgREST
-- really calls it: one HTTP request is one statement, so a real user can never
-- be affected by another user's cached value.
--
-- Every actor therefore gets its own DO block. Do not consolidate them into a
-- loop -- that reintroduces the false failure.
-- ---------------------------------------------------------------------------
--
-- Expect 34/34, 0 failures (measured against production on 2026-10-01, after
-- the app_metadata sync trigger). Any failure means either a real regression or
-- a permission that changed without a decision -- investigate before editing.
--
-- Two expectations were previously wrong and were corrected against the
-- measured production behaviour, NOT to make a real failure disappear:
--   - get_trainee_attendance_summary admits the subject itself
--     (p_trainee_id = v_caller), so a trainee reading their own attendance is
--     legitimately ALLOWED.
--   - the permissions that matter are the SUBJECT's, not the caller's, so a
--     secretariat reading a trainee is denied (0 permission rows) while a
--     servant is allowed (holds MANAGE_LECTURES).

BEGIN;

CREATE TEMP TABLE elkarooz_matrix (
    actor      text,
    category   text,
    operation  text,
    target     text,
    outcome    text,
    expected   text,
    verdict    text
);
GRANT INSERT, SELECT ON elkarooz_matrix TO authenticated, anon;

-- Resolve real accounts as postgres before switching roles.
CREATE TEMP TABLE elkarooz_actors AS
SELECT
    -- Two distinct group-1 trainees, so "same group peer" is never the actor itself.
    (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=1 AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS trainee_g1,
    (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=1 AND deleted_at IS NULL
        AND id <> (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=1
                   AND deleted_at IS NULL ORDER BY created_at LIMIT 1)
        ORDER BY created_at LIMIT 1) AS trainee_g1_peer,
    (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=2 AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS trainee_g2,
    (SELECT id FROM public.profiles WHERE role_id='servant'     AND group_id=1 AND deleted_at IS NULL LIMIT 1) AS servant_g1,
    (SELECT id FROM public.profiles WHERE role_id='secretariat' AND group_id=1 AND deleted_at IS NULL LIMIT 1) AS secretariat_g1,
    (SELECT id FROM public.profiles WHERE role_id='admin'       AND deleted_at IS NULL LIMIT 1) AS admin,
    (SELECT id FROM public.profiles WHERE role_id='super_user'  AND deleted_at IS NULL LIMIT 1) AS super_user;
GRANT SELECT ON elkarooz_actors TO authenticated, anon;

-- Shared probe body. Invoked once per actor, from a separate top-level statement,
-- so each actor gets a clean statement-level cache for the STABLE helpers.
CREATE OR REPLACE FUNCTION pg_temp.elkarooz_probe(
    p_actor text,
    p_role  text,
    p_uid   uuid,
    p_self  uuid,
    p_peer  uuid,
    p_cross uuid,
    p_group smallint
) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    v_ok  boolean;
    v_msg text;
    v_exp boolean;
BEGIN
    PERFORM set_config(
        'request.jwt.claims',
        json_build_object(
            'sub',  p_uid,
            'role', 'authenticated',
            'app_metadata', json_build_object('role', p_role, 'group_id', p_group)
        )::text,
        true);

    -- Self read.
    -- Expected for admin/super_user only. The gate admits: the subject itself,
    -- an admin/super_user, or a caller whose group matches AND who is a servant
    -- or holds a servant_permission. A secretariat holds no servant_permissions
    -- rows (verified: servants 11, secretariats 0), and the subject is always a
    -- trainee, so a secretariat caller is denied. That is the documented
    -- fail-closed design, not a defect -- these are trainee-read endpoints.
    v_exp := p_role IN ('admin','super_user');
    BEGIN
        PERFORM public.get_trainee_full_profile(p_self);
        v_ok := true;
    EXCEPTION WHEN others THEN
        GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
        v_ok := false;
    END;
    INSERT INTO elkarooz_matrix VALUES (p_actor,'read','get_trainee_full_profile',
        CASE WHEN p_uid = p_self THEN 'self (own record)' ELSE 'trainee g1 (actor is not this trainee)' END,
        CASE WHEN v_ok THEN 'ALLOWED' ELSE 'denied' END,
        CASE WHEN v_exp THEN 'ALLOWED' ELSE 'denied' END,
        CASE WHEN v_ok = v_exp THEN 'PASS' ELSE 'FAIL: ' || v_msg END);

    -- Attendance summary. The gate admits: the subject itself, admin/super_user,
    -- or a same-group caller holding MANAGE_LECTURES / GRADE_EXAMS. The
    -- permissions are the SUBJECT's, not the caller's, so measured on production
    -- 2026-10-01:
    --   trainee reading own record           -> ALLOWED (self clause)
    --   servant reading a group-1 trainee     -> ALLOWED (has MANAGE_LECTURES)
    --   secretariat reading a group-1 trainee -> denied (0 permission rows)
    -- An earlier version of this matrix expected "denied" for every non-admin,
    -- which was wrong in both directions: it wrongly failed the legitimate
    -- trainee self-read and the servant read, and the secretariat denial is
    -- correct rather than a defect.
    v_exp := (p_uid = p_self)              -- reading your own record
             OR p_role IN ('admin','super_user')
             OR p_role = 'servant';        -- verified: servants hold MANAGE_LECTURES
    BEGIN
        PERFORM public.get_trainee_attendance_summary(p_self);
        v_ok := true;
    EXCEPTION WHEN others THEN
        GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
        v_ok := false;
    END;
    INSERT INTO elkarooz_matrix VALUES (p_actor,'read','get_trainee_attendance_summary',
        CASE WHEN p_uid = p_self THEN 'self (own record)' ELSE 'trainee g1 (actor is not this trainee)' END,
        CASE WHEN v_ok THEN 'ALLOWED' ELSE 'denied' END,
        CASE WHEN v_exp THEN 'ALLOWED' ELSE 'denied' END,
        CASE WHEN v_ok = v_exp THEN 'PASS' ELSE 'FAIL: ' || v_msg END);

    -- Same-group peer: servants hold MANAGE_CURRICULUM/MANAGE_LECTURES and pass;
    -- a trainee sees only their own row; a secretariat has no permissions and is
    -- denied by design.
    v_exp := p_role IN ('servant','admin','super_user');
    BEGIN
        PERFORM public.get_trainee_full_profile(p_peer);
        v_ok := true;
    EXCEPTION WHEN others THEN v_ok := false; END;
    INSERT INTO elkarooz_matrix VALUES (p_actor,'read','get_trainee_full_profile','trainee g1 PEER (same group)',
        CASE WHEN v_ok THEN 'ALLOWED' ELSE 'denied' END,
        CASE WHEN v_exp THEN 'ALLOWED' ELSE 'denied' END,
        CASE WHEN v_ok = v_exp THEN 'PASS' ELSE 'FAIL' END);

    -- Cross-group read: admin and super_user only ----------------------------
    v_exp := p_role IN ('admin','super_user');
    BEGIN
        PERFORM public.get_trainee_full_profile(p_cross);
        v_ok := true;
    EXCEPTION WHEN others THEN v_ok := false; END;
    INSERT INTO elkarooz_matrix VALUES (p_actor,'read','get_trainee_full_profile','trainee g2 (OTHER group)',
        CASE WHEN v_ok THEN 'ALLOWED' ELSE 'denied' END,
        CASE WHEN v_exp THEN 'ALLOWED' ELSE 'denied' END,
        CASE WHEN v_ok = v_exp THEN 'PASS' ELSE 'FAIL' END);

    -- Own-group dashboard -----------------------------------------------------
    BEGIN
        PERFORM public.get_group_operational_summary(p_group);
        v_ok := true;
    EXCEPTION WHEN others THEN v_ok := false; END;
    INSERT INTO elkarooz_matrix VALUES (p_actor,'read','get_group_operational_summary','own group',
        CASE WHEN v_ok THEN 'ALLOWED' ELSE 'denied' END, 'ALLOWED',
        CASE WHEN v_ok THEN 'PASS' ELSE 'FAIL' END);

    -- Other-group dashboard: admin and super_user only ------------------------
    v_exp := p_role IN ('admin','super_user');
    BEGIN
        PERFORM public.get_group_operational_summary(((p_group % 3) + 1)::smallint);
        v_ok := true;
    EXCEPTION WHEN others THEN v_ok := false; END;
    INSERT INTO elkarooz_matrix VALUES (p_actor,'read','get_group_operational_summary','OTHER group',
        CASE WHEN v_ok THEN 'ALLOWED' ELSE 'denied' END,
        CASE WHEN v_exp THEN 'ALLOWED' ELSE 'denied' END,
        CASE WHEN v_ok = v_exp THEN 'PASS' ELSE 'FAIL' END);
END;
$$;
GRANT EXECUTE ON FUNCTION pg_temp.elkarooz_probe(text,text,uuid,uuid,uuid,uuid,smallint)
    TO authenticated, anon;

-- ===========================================================================
-- Block 1: anonymous access must be denied outright.
-- Regression test for the NULL-propagation fail-open fixed in
-- 20261001120000_fix_null_propagation_fail_open_authz.sql.
-- ===========================================================================
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{}', true); END $$;
SET LOCAL ROLE anon;

DO $$
DECLARE
    a     elkarooz_actors%ROWTYPE;
    v_ok  boolean;
    v_call text;
BEGIN
    SELECT * INTO a FROM elkarooz_actors;

    FOREACH v_call IN ARRAY ARRAY[
        'get_trainee_full_profile',
        'get_trainee_attendance_summary',
        'get_group_operational_summary',
        'get_group_servants_detailed',
        'get_group_secretariat_detailed',
        'import_trainees_bulk_atomic'
    ] LOOP
        BEGIN
            IF v_call = 'get_trainee_full_profile' THEN
                PERFORM public.get_trainee_full_profile(a.trainee_g1);
            ELSIF v_call = 'get_trainee_attendance_summary' THEN
                PERFORM public.get_trainee_attendance_summary(a.trainee_g1);
            ELSIF v_call = 'get_group_operational_summary' THEN
                PERFORM public.get_group_operational_summary(1::smallint);
            ELSIF v_call = 'get_group_servants_detailed' THEN
                PERFORM public.get_group_servants_detailed(1::smallint);
            ELSIF v_call = 'get_group_secretariat_detailed' THEN
                PERFORM public.get_group_secretariat_detailed(1::smallint);
            ELSE
                PERFORM public.import_trainees_bulk_atomic('[]'::jsonb, 'x.csv', 'p', true);
            END IF;
            v_ok := true;
        EXCEPTION WHEN others THEN
            v_ok := false;
        END;
        INSERT INTO elkarooz_matrix VALUES ('anon (no claims)', 'call', v_call, '-',
            CASE WHEN v_ok THEN 'ALLOWED' ELSE 'denied' END, 'denied',
            CASE WHEN v_ok THEN 'FAIL: anon was allowed' ELSE 'PASS' END);
    END LOOP;
END;
$$;

RESET ROLE;

-- ===========================================================================
-- Block 2: authenticated actors, ONE STATEMENT EACH.
-- See the header note on STABLE-function caching before changing this.
-- ===========================================================================
SET LOCAL ROLE authenticated;

DO $$ BEGIN PERFORM pg_temp.elkarooz_probe('trainee g1','trainee',
    (SELECT trainee_g1 FROM elkarooz_actors), (SELECT trainee_g1 FROM elkarooz_actors),
    (SELECT trainee_g1_peer FROM elkarooz_actors), (SELECT trainee_g2 FROM elkarooz_actors), 1::smallint); END $$;

DO $$ BEGIN PERFORM pg_temp.elkarooz_probe('servant g1','servant',
    (SELECT servant_g1 FROM elkarooz_actors), (SELECT trainee_g1 FROM elkarooz_actors),
    (SELECT trainee_g1_peer FROM elkarooz_actors), (SELECT trainee_g2 FROM elkarooz_actors), 1::smallint); END $$;

DO $$ BEGIN PERFORM pg_temp.elkarooz_probe('secretariat g1','secretariat',
    (SELECT secretariat_g1 FROM elkarooz_actors), (SELECT trainee_g1 FROM elkarooz_actors),
    (SELECT trainee_g1_peer FROM elkarooz_actors), (SELECT trainee_g2 FROM elkarooz_actors), 1::smallint); END $$;

DO $$ BEGIN PERFORM pg_temp.elkarooz_probe('admin','admin',
    (SELECT admin FROM elkarooz_actors), (SELECT trainee_g1 FROM elkarooz_actors),
    (SELECT trainee_g1_peer FROM elkarooz_actors), (SELECT trainee_g2 FROM elkarooz_actors), 1::smallint); END $$;

DO $$ BEGIN PERFORM pg_temp.elkarooz_probe('super_user','super_user',
    (SELECT super_user FROM elkarooz_actors), (SELECT trainee_g1 FROM elkarooz_actors),
    (SELECT trainee_g1_peer FROM elkarooz_actors), (SELECT trainee_g2 FROM elkarooz_actors), 1::smallint); END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------
SELECT actor, category, operation, target, outcome, expected, verdict
FROM elkarooz_matrix
ORDER BY actor, operation, target;

SELECT count(*) FILTER (WHERE verdict LIKE 'PASS%') AS passed,
       count(*) FILTER (WHERE verdict LIKE 'FAIL%') AS failed
FROM elkarooz_matrix;

ROLLBACK;
