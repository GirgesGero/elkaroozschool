-- ============================================================================
-- 20261002 — revoke PUBLIC EXECUTE on data-reading RPCs
-- ============================================================================
--
-- Why this exists
-- ---------------
-- An earlier pass ran the equivalent REVOKEs as ad-hoc SQL. The database state was
-- correct at that moment and has since been rebuilt or reset (see below), which put
-- the grants back. This migration applies the same change through the migration
-- ledger so it is reapplied on every deploy instead of relying on someone having
-- run the statement once by hand.
--
-- The observed state that prompted this, on 2026-10-02:
--
--   check_attendance_session_open()                     acl = {=X/postgres, ...}
--   check_secretariat_group_limit()                     acl = {=X/postgres, ...}
--   get_group_operational_summary(smallint)             acl = {=X/postgres, ...}
--   get_group_secretariat_detailed(smallint)            acl = {=X/postgres, ...}
--   get_group_servants_detailed(smallint)               acl = {=X/postgres, ...}
--   get_trainee_full_profile(uuid)                      acl = {=X/postgres, ...}
--   get_trainee_attendance_summary(uuid)                acl = {=X/postgres, ...}
--   rebalance_marathon_question_weights()               acl = {=X/postgres, ...}
--
-- The leading "=X/postgres" entry is a PUBLIC grant. PUBLIC includes anon, so
-- has_function_privilege('anon', ...) returned true for every one of them --
-- including the two get_trainee_* functions, which return personal data.
--
-- Why revoke rather than rely on the function body
-- ------------------------------------------------
-- Several of these are SECURITY DEFINER, and the two get_trainee_* ones select from
-- tables whose policies are written in terms of the caller's claims. A guard inside
-- the function can be correct today and wrong after the next edit: the grant is the
-- thing that is enforced by the engine rather than by review. Revoking it makes
-- "anon cannot call this" a property of the database, not of a code path.
--
-- PUBLIC is revoked rather than anon named explicitly, because revoking from anon
-- alone would leave any future role inheriting the default grant.
--
-- service_role keeps EXECUTE on everything: it is the trusted server-side caller and
-- is what backup and restore run as. authenticated keeps it on the group and
-- attendance helpers the application legitimately calls.
-- ============================================================================

-- Personal-data readers. Nothing outside the server should be able to reach these.
REVOKE EXECUTE ON FUNCTION public.get_trainee_full_profile(uuid)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_trainee_attendance_summary(uuid)        FROM PUBLIC;

-- Group-scoped readers. SECURITY DEFINER, so the grant is the only boundary.
REVOKE EXECUTE ON FUNCTION public.get_group_operational_summary(smallint)    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_group_secretariat_detailed(smallint)   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_group_servants_detailed(smallint)      FROM PUBLIC;

-- Session and limit helpers. These are check functions whose results feed
-- authorization decisions elsewhere, so an anon caller must not be able to invoke
-- them either.
REVOKE EXECUTE ON FUNCTION public.check_attendance_session_open()            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_secretariat_group_limit()            FROM PUBLIC;

-- Writes to marathon question weights.
REVOKE EXECUTE ON FUNCTION public.rebalance_marathon_question_weights()     FROM PUBLIC;

-- Re-grant exactly what the application and the trusted server path need. These are
-- idempotent, so re-running the migration is safe.
GRANT EXECUTE ON FUNCTION public.get_trainee_full_profile(uuid)              TO service_role;
GRANT EXECUTE ON FUNCTION public.get_trainee_attendance_summary(uuid)        TO service_role;

GRANT EXECUTE ON FUNCTION public.get_group_operational_summary(smallint)    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_group_secretariat_detailed(smallint)   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_group_servants_detailed(smallint)      TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.check_attendance_session_open()            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_secretariat_group_limit()            TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.rebalance_marathon_question_weights()     TO authenticated, service_role;