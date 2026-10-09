-- =============================================================================
-- verify_pastoral_template_rls.sql
-- =============================================================================
-- Reusable verification for Phase 6 (pastoral template = admin-only write).
--
-- WHY THIS FILE EXISTS AS A SEPARATE SCRIPT
--   A verification query that only asks "did the UPDATE raise an error?" is
--   worthless here. Under RLS a denied write filters the row out: the statement
--   succeeds, no exception is raised, and ROW_COUNT is 0. A throw-based probe
--   therefore reports ALLOWED for a write that never happened. (This exact
--   mistake produced a false "still vulnerable" reading during the Phase 6
--   investigation.) Every assertion below is therefore on ROW_COUNT.
--
-- USAGE
--   psql "$SUPABASE_DB_URL" -f scripts/verify_pastoral_template_rls.sql
--
--   Requires: super_user, admin and servant accounts to exist in profiles.
--   Exits non-zero (via the final verdict block) if any expectation fails.
--
-- CLEANUP IS MANDATORY
--   The script creates public._pastoral_probe() and drops it at the end, but
--   if it is interrupted it will survive. A SECURITY DEFINER function that can
--   switch request.jwt.claims is a privilege-escalation surface; if you find
--   one left behind, drop it manually.
-- =============================================================================

\set ON_ERROR_STOP on

-- Resolve the test actors as the owner role, BEFORE dropping to authenticated.
-- (Scoping note: reading profiles while already SET ROLE authenticated returns
--  only same-group rows, so the subqueries would come back empty and every
--  assertion would silently compare against NULL. Resolve first, then switch.)
CREATE OR REPLACE FUNCTION public._pastoral_probe(p_su uuid, p_ad uuid, p_sv uuid)
RETURNS TABLE (probe text, actor text, updated bigint)
LANGUAGE plpgsql
AS $f$
DECLARE
    upd bigint;
BEGIN
    -- super_user: PASTORAL must be blocked (SRS 8.1), BIRTHDAY allowed (SRS 8.2).
    PERFORM set_config('request.jwt.claims',
        json_build_object('sub', p_su::text, 'role', 'authenticated')::text, true);
    UPDATE public.notification_templates SET template_body = template_body || 'X'
        WHERE template_key = 'PASTORAL';
    GET DIAGNOSTICS upd = ROW_COUNT;
    RETURN QUERY SELECT 'pastoral_edit'::text, 'super_user'::text, upd;

    UPDATE public.notification_templates SET template_body = template_body || 'X'
        WHERE template_key = 'BIRTHDAY';
    GET DIAGNOSTICS upd = ROW_COUNT;
    RETURN QUERY SELECT 'birthday_edit'::text, 'super_user'::text, upd;

    -- admin: full rights on both templates.
    PERFORM set_config('request.jwt.claims',
        json_build_object('sub', p_ad::text, 'role', 'authenticated')::text, true);
    UPDATE public.notification_templates SET template_body = template_body || 'X'
        WHERE template_key = 'PASTORAL';
    GET DIAGNOSTICS upd = ROW_COUNT;
    RETURN QUERY SELECT 'pastoral_edit'::text, 'admin'::text, upd;

    UPDATE public.notification_templates SET template_body = template_body || 'X'
        WHERE template_key = 'BIRTHDAY';
    GET DIAGNOSTICS upd = ROW_COUNT;
    RETURN QUERY SELECT 'birthday_edit'::text, 'admin'::text, upd;

    -- servant: no rights at all.
    PERFORM set_config('request.jwt.claims',
        json_build_object('sub', p_sv::text, 'role', 'authenticated')::text, true);
    UPDATE public.notification_templates SET template_body = template_body || 'X'
        WHERE template_key = 'PASTORAL';
    GET DIAGNOSTICS upd = ROW_COUNT;
    RETURN QUERY SELECT 'pastoral_edit'::text, 'servant'::text, upd;
END $f$;

GRANT EXECUTE ON FUNCTION public._pastoral_probe(uuid, uuid, uuid) TO authenticated;

-- Run the probe and grade it in the SAME query, so the printed verdict can never
-- drift from the measured rows.
--
-- The actor UUIDs are resolved as arguments (owner context) rather than inside
-- the function: the function body runs AFTER SET LOCAL ROLE authenticated, where
-- RLS returns only same-group profiles. An in-function lookup would yield NULL
-- for every actor and every comparison would silently pass against NULL.
BEGIN;
SET LOCAL ROLE authenticated;

WITH measured AS (
    SELECT p.probe, p.actor, p.updated
    FROM public._pastoral_probe(
        (SELECT id FROM public.profiles WHERE role_id = 'super_user' AND deleted_at IS NULL LIMIT 1),
        (SELECT id FROM public.profiles WHERE role_id = 'admin'     AND deleted_at IS NULL LIMIT 1),
        (SELECT id FROM public.profiles WHERE role_id = 'servant'   AND deleted_at IS NULL LIMIT 1)
    ) p
),
expected AS (
    SELECT 'pastoral_edit'::text AS probe, 'super_user'::text AS actor, 0::bigint AS want,
           'SRS 8.1 pastoral is admin-only'::text AS rule
    UNION ALL SELECT 'birthday_edit', 'super_user', 1, 'SRS 8.2 birthday = admin + super_user'
    UNION ALL SELECT 'pastoral_edit', 'admin',      1, 'admin must keep full rights'
    UNION ALL SELECT 'birthday_edit', 'admin',      1, 'admin must keep full rights'
    UNION ALL SELECT 'pastoral_edit', 'servant',    0, 'servant has no template rights'
)
SELECT
    e.probe,
    e.actor,
    m.updated AS rows_updated,
    e.want    AS expected,
    CASE
        WHEN m.updated IS NULL THEN 'FAIL: probe produced no row for this case'
        WHEN m.updated = e.want THEN 'PASS'
        ELSE 'FAIL: expected ' || e.want || ' rows, got ' || m.updated
    END AS verdict,
    e.rule
FROM expected e
LEFT JOIN measured m USING (probe, actor)
ORDER BY e.probe, e.actor;

-- All writes above are rolled back here: the templates are never actually modified.
ROLLBACK;

-- =============================================================================
-- EXPECTED OUTPUT: 5 rows, every verdict PASS
--   birthday_edit | admin      | 1 | 1 | PASS
--   birthday_edit | super_user | 1 | 1 | PASS
--   pastoral_edit | admin      | 1 | 1 | PASS
--   pastoral_edit | servant    | 0 | 0 | PASS
--   pastoral_edit | super_user | 0 | 0 | PASS   <-- the P0 guard
--
-- Any FAIL means the pastoral policy is not holding. A pastoral_edit/super_user
-- value of 1 means super_user can still rewrite the absence message.
-- =============================================================================

-- Cleanup the privileged probe.
DROP FUNCTION IF EXISTS public._pastoral_probe(uuid, uuid, uuid);
