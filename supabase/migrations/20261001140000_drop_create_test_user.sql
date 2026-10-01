-- Remove public.create_test_user.
--
-- FINDING (verified against production on 2026-10-01):
--   create_test_user inserts directly into auth.users with a caller-supplied role,
--   and is SECURITY DEFINER. It was granted to service_role, so any server-side
--   code path holding the service key could mint a super_user account.
--
--   No application code references it: a search of the PHP backend, the frontend
--   and the migrations finds it only in audit documentation. It is scaffolding
--   that outlived its purpose and has no legitimate caller in production.
--
--   Its failure today is accidental, not designed. The function body calls
--   gen_salt() and crypt(), which live in schema 'extensions', while the function
--   pins search_path = public, pg_temp. Calling it therefore raises
--   "function gen_salt(unknown) does not exist". Nothing about the function
--   intends to be unavailable -- it is one ALTER of the search_path away from
--   working, and it would then create real super_user accounts. Relying on that
--   mistake is not a security control.
--
-- ACTION:
--   Drop it. There is no caller to break. If a seeded demo account is ever
--   genuinely needed, create accounts through the Supabase Admin API instead of a
--   publicly-callable SQL function.
--
-- ROLLBACK: the function can be recreated from this repository's git history
-- (pre-migration state) plus the extensions schema on its search_path.

DROP FUNCTION IF EXISTS public.create_test_user(
    character varying, character varying, character varying,
    character varying, smallint, boolean, date
);

-- Defence in depth, scoped to the specific escalation path that was removed.
-- import_trainees_bulk_atomic also inserts into auth.users, and that one is
-- legitimate: it is the bulk trainee importer, gated on auth.uid() and on an
-- admin/super_user role, and it is what ImportController calls. Asserting that NO
-- SECURITY DEFINER function in public may write to auth.users would forbid a
-- function that is supposed to exist, so the check is narrowed to the shape that
-- was actually dangerous -- a function that takes a caller-supplied role and
-- grants it on insert, with no admin gate.
DO $$
DECLARE
    offender text;
BEGIN
    SELECT p.proname INTO offender
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND pg_get_functiondef(p.oid) ILIKE '%INSERT INTO auth.users%'
      -- No gate of any kind: the dangerous shape is a function that writes a
      -- caller-supplied role straight into raw_app_meta_data.
      AND pg_get_functiondef(p.oid) NOT ILIKE '%%auth.uid()%%'
      AND pg_get_functiondef(p.oid) NOT ILIKE '%%is_admin_or_super_user%%'
      AND pg_get_functiondef(p.oid) NOT ILIKE '%%p_role IS NULL%%'
    LIMIT 1;

    IF offender IS NOT NULL THEN
        RAISE EXCEPTION
            'SECURITY DEFINER function public.% can create accounts with a '
            'caller-supplied role and no authorization gate', offender;
    END IF;
END
$$;
