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
-- Expect 15/15. Any failure means either a real regression or that a permission
-- changed without a decision -- investigate before editing.

\set ON_ERROR_STOP on

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

-- ---------------------------------------------------------------------------
-- Resolve real accounts as postgres before switching roles.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE elkarooz_actors AS
SELECT
    -- Two distinct group-1 trainees, so "same group peer" is never the actor itself.
    (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=1 AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS trainee_g1,
    (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=1 AND deleted_at IS NULL
        AND id <> (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=1
                   AND deleted_at IS NULL ORDER BY created_at LIMIT 1)
        ORDER BY created_at LIMIT 1) AS trainee_g1_peer,
    (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=2 AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS trainee_g2,
    (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=3 AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS trainee_g3,
    (SELECT id FROM public.profiles WHERE role_id='servant'     AND group_id=1 AND deleted_at IS NULL LIMIT 1) AS servant_g1,
    (SELECT id FROM public.profiles WHERE role_id='secretariat' AND group_id=1 AND deleted_at IS NULL LIMIT 1) AS secretariat_g1,
    (SELECT id FROM public.profiles WHERE role_id='admin'       AND deleted_at IS NULL LIMIT 1) AS admin,
    (SELECT id FROM public.profiles WHERE role_id='super_user'  AND deleted_at IS NULL LIMIT 1) AS super_user;

DO $$
DECLARE
    a            elkarooz_actors%ROWTYPE;
    actors       text[];
    uids         uuid[];
    roles_list   text[];
    groups_list  int[];
    i            int;
    actor_name   text;
    actor_uid    uuid;
    actor_role   text;
    actor_group  int;
    outcome      text;
    was_allowed  boolean;
BEGIN
    SELECT * INTO a FROM elkarooz_actors;

    actors      := ARRAY['trainee g1','servant g1','secretariat g1','admin','super_user'];
    uids        := ARRAY[a.trainee_g1, a.servant_g1, a.secretariat_g1, a.admin, a.super_user];
    roles_list  := ARRAY['trainee','servant','secretariat','admin','super_user'];
    groups_list := ARRAY[1,1,1,1,1];

    -- =======================================================================
    -- Block 1: anonymous access must be denied outright.
    -- Regression test for the NULL-propagation fail-open fixed in
    -- 20261001120000_fix_null_propagation_fail_open_authz.sql.
    -- =======================================================================
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '{}', true);

    BEGIN
        PERFORM public.get_trainee_full_profile(a.trainee_g1);
        outcome := 'ALLOWED';
    EXCEPTION WHEN others THEN outcome := 'denied'; END;
    INSERT INTO elkarooz_matrix VALUES ('anon (no claims)','read','get_trainee_full_profile','trainee g1',
        outcome, 'denied', CASE WHEN outcome='denied' THEN 'PASS' ELSE 'FAIL' END);

    BEGIN
        PERFORM public.get_trainee_attendance_summary(a.trainee_g1);
        outcome := 'ALLOWED';
    EXCEPTION WHEN others THEN outcome := 'denied'; END;
    INSERT INTO elkarooz_matrix VALUES ('anon (no claims)','read','get_trainee_attendance_summary','trainee g1',
        outcome, 'denied', CASE WHEN outcome='denied' THEN 'PASS' ELSE 'FAIL' END);

    BEGIN
        PERFORM public.get_group_operational_summary(1::smallint);
        outcome := 'ALLOWED';
    EXCEPTION WHEN others THEN outcome := 'denied'; END;
    INSERT INTO elkarooz_matrix VALUES ('anon (no claims)','read','get_group_operational_summary','group 1',
        outcome, 'denied', CASE WHEN outcome='denied' THEN 'PASS' ELSE 'FAIL' END);

    BEGIN
        PERFORM public.get_group_servants_detailed(1::smallint);
        outcome := 'ALLOWED';
    EXCEPTION WHEN others THEN outcome := 'denied'; END;
    INSERT INTO elkarooz_matrix VALUES ('anon (no claims)','read','get_group_servants_detailed','group 1',
        outcome, 'denied', CASE WHEN outcome='denied' THEN 'PASS' ELSE 'FAIL' END);

    -- =======================================================================
    -- Block 2: authenticated role matrix.
    -- =======================================================================
    SET LOCAL ROLE authenticated;

    FOR i IN 1..5 LOOP
        actor_name  := actors[i];
        actor_uid   := uids[i];
        actor_role  := roles_list[i];
        actor_group := groups_list[i];

        PERFORM set_config('request.jwt.claims',
            json_build_object(
                'sub',  actor_uid,
                'role', 'authenticated',
                'app_metadata', json_build_object('role', actor_role, 'group_id', actor_group)
            )::text, true);

        -- Read own profile -----------------------------------------------------
        BEGIN PERFORM public.get_trainee_full_profile(actor_uid); was_allowed := true;
        EXCEPTION WHEN others THEN was_allowed := false; END;
        INSERT INTO elkarooz_matrix VALUES (actor_name,'read','get_trainee_full_profile','self',
            CASE WHEN was_allowed THEN 'ALLOWED' ELSE 'denied' END, 'ALLOWED',
            CASE WHEN was_allowed THEN 'PASS' ELSE 'FAIL' END);

        -- Read own attendance summary ------------------------------------------
        BEGIN PERFORM public.get_trainee_attendance_summary(actor_uid); was_allowed := true;
        EXCEPTION WHEN others THEN was_allowed := false; END;
        INSERT INTO elkarooz_matrix VALUES (actor_name,'read','get_trainee_attendance_summary','self',
            CASE WHEN was_allowed THEN 'ALLOWED' ELSE 'denied' END, 'ALLOWED',
            CASE WHEN was_allowed THEN 'PASS' ELSE 'FAIL' END);

        -- Read another trainee in the SAME group --------------------------------
        BEGIN PERFORM public.get_trainee_full_profile(a.trainee_g1_peer); was_allowed := true;
        EXCEPTION WHEN others THEN was_allowed := false; END;
        INSERT INTO elkarooz_matrix VALUES (actor_name,'read','get_trainee_full_profile','trainee g1 PEER (same group)',
            CASE WHEN was_allowed THEN 'ALLOWED' ELSE 'denied' END,
            CASE WHEN actor_role IN ('servant','admin','super_user') THEN 'ALLOWED' ELSE 'denied' END,
            CASE WHEN was_allowed = (actor_role IN ('servant','admin','super_user')) THEN 'PASS' ELSE 'FAIL' END);

        -- Read a trainee in a DIFFERENT group ----------------------------------
        BEGIN PERFORM public.get_trainee_full_profile(a.trainee_g2); was_allowed := true;
        EXCEPTION WHEN others THEN was_allowed := false; END;
        INSERT INTO elkarooz_matrix VALUES (actor_name,'read','get_trainee_full_profile','trainee g2 (OTHER group)',
            CASE WHEN was_allowed THEN 'ALLOWED' ELSE 'denied' END,
            CASE WHEN actor_role IN ('admin','super_user') THEN 'ALLOWED' ELSE 'denied' END,
            CASE WHEN was_allowed = (actor_role IN ('admin','super_user')) THEN 'PASS' ELSE 'FAIL' END);

        -- Group dashboard for OWN group -----------------------------------------
        BEGIN PERFORM public.get_group_operational_summary(actor_group::smallint); was_allowed := true;
        EXCEPTION WHEN others THEN was_allowed := false; END;
        INSERT INTO elkarooz_matrix VALUES (actor_name,'read','get_group_operational_summary','own group',
            CASE WHEN was_allowed THEN 'ALLOWED' ELSE 'denied' END, 'ALLOWED',
            CASE WHEN was_allowed THEN 'PASS' ELSE 'FAIL' END);

        -- Group dashboard for ANOTHER group -------------------------------------
        BEGIN PERFORM public.get_group_operational_summary(((actor_group % 3) + 1)::smallint); was_allowed := true;
        EXCEPTION WHEN others THEN was_allowed := false; END;
        INSERT INTO elkarooz_matrix VALUES (actor_name,'read','get_group_operational_summary','OTHER group',
            CASE WHEN was_allowed THEN 'ALLOWED' ELSE 'denied' END,
            CASE WHEN actor_role IN ('admin','super_user') THEN 'ALLOWED' ELSE 'denied' END,
            CASE WHEN was_allowed = (actor_role IN ('admin','super_user')) THEN 'PASS' ELSE 'FAIL' END);
    END LOOP;
END;
$$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------
SELECT actor, category, operation, target, outcome, expected, verdict
FROM elkarooz_matrix
ORDER BY actor, operation, target;

SELECT count(*) FILTER (WHERE verdict='PASS') AS passed,
       count(*) FILTER (WHERE verdict='FAIL') AS failed
FROM elkarooz_matrix;

ROLLBACK;