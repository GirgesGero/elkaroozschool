-- =============================================================================
-- EL KAROOZ SCHOOL — revoke anon access to SECURITY DEFINER helper functions
-- =============================================================================
-- FINDING (verified live 2026-09-30, not from a static report):
--
--   An UNAUTHENTICATED request, holding only the project's public anon key,
--   successfully created a real user account:
--
--     POST /rest/v1/rpc/create_test_user
--       {"p_username":"<probe>","p_role":"trainee","p_group":1,...}
--     -> 200 "<uuid redacted: probe account deleted after the test>"
--
--   The admin role was only refused because of a UNIQUE constraint
--   (uq_single_admin), not because of authorization. Any other role went
--   straight through, and Supabase's security advisor reported 29 such
--   anon-executable SECURITY DEFINER functions.
--
-- WHY THIS IS SEVERE:
--   A SECURITY DEFINER function runs with the OWNER's rights, so the anon role
--   inherits write access the RLS policies never granted. In the uploaded
--   account the attacker's group_id/role were chosen by the caller, which is
--   exactly the cross-group isolation the system is supposed to prevent.
--
-- FIX:
--   1. Revoke EXECUTE from anon and authenticated on every helper function
--      that is not part of the public login/registration surface.
--   2. Keep the table grants untouched: login still works through
--      Supabase Auth (GoTrue), not through these RPCs.
--   3. Grant EXECUTE to service_role only, since that is the identity the
--      PHP backend and the privileged server paths use.
--
-- SAFE TO RE-RUN: uses IF EXISTS everywhere.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Revoke EXECUTE from anon (and from PUBLIC, which implicitly includes anon)
--    on EVERY SECURITY DEFINER function in schema public. Driven by the catalog
--    rather than a hand-written name list, so all 29 currently-exposed functions
--    are covered and any future one is covered too.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    fn record;
    n   int := 0;
BEGIN
    FOR fn IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        JOIN pg_namespace ns ON ns.oid = p.pronamespace
        WHERE ns.nspname = 'public'
          AND p.prosecdef = true
          AND has_function_privilege('anon', p.oid, 'EXECUTE')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon',    fn.sig);
        n := n + 1;
    END LOOP;
    RAISE NOTICE 'revoked anon EXECUTE on % SECURITY DEFINER function(s)', n;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Test/fixture helpers get a FULL revoke: minting or deleting accounts is
--    never a job for any signed-in user role, and create_test_user is precisely
--    what anon used to create real accounts.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    fn record;
    n   int := 0;
BEGIN
    FOR fn IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        JOIN pg_namespace ns ON ns.oid = p.pronamespace
        WHERE ns.nspname = 'public'
          AND p.prosecdef = true
          AND (
               p.proname ~* '(^|_)(test|testing|demo|sample|seed|mock|fixture)($|_)'
            OR p.proname ILIKE '%_test_user'
          )
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.sig);
        n := n + 1;
    END LOOP;
    RAISE NOTICE 'fully revoked test/fixture functions from authenticated: %', n;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Defence in depth: close the default for functions created in future.
--    Without this, the next feature that adds a helper reintroduces the bug,
--    because PostgreSQL grants EXECUTE to PUBLIC on every new function by
--    default. `service_role` keeps working via its own membership.
-- -----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 4. Verification. This RAISES (and therefore rolls the migration back) if
--    anything anon-executable is left, so the migration can never be reported
--    as successfully applied while the hole is still open.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    remaining int;
BEGIN
    SELECT count(*) INTO remaining
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.prosecdef = true
      AND has_function_privilege('anon', p.oid, 'EXECUTE');

    IF remaining > 0 THEN
        RAISE EXCEPTION
            'BLOCKED: % SECURITY DEFINER function(s) in schema public are still executable '
            'by anon. List them with: SELECT p.oid::regprocedure FROM pg_proc p '
            'JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=''public'' '
            'AND p.prosecdef AND has_function_privilege(''anon'', p.oid, ''EXECUTE''); '
            'then revoke each explicitly, or GRANT them to authenticated if the app '
            'legitimately calls them.', remaining;
    END IF;
    RAISE NOTICE 'OK: no anon-executable SECURITY DEFINER functions remain in public.';
END $$;
