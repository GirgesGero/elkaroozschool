-- 20261011_100100_harden_curriculum_privileges.sql
-- Follow-up hardening: remove inherited/PUBLIC/legacy anon grants after phase 1.
BEGIN;

REVOKE ALL ON FUNCTION public.can_manage_curriculum(smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_curriculum(smallint) TO authenticated;

REVOKE ALL ON FUNCTION public.publish_curriculum_day(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_curriculum_day(uuid) TO authenticated;

REVOKE ALL ON public.curriculum_days, public.curriculum_entries, public.curriculum_revisions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_days, public.curriculum_entries TO authenticated;
REVOKE UPDATE, DELETE ON public.curriculum_revisions FROM authenticated;
GRANT SELECT, INSERT ON public.curriculum_revisions TO authenticated;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.can_manage_curriculum(smallint)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can still execute can_manage_curriculum';
  END IF;
  IF has_function_privilege('anon', 'public.publish_curriculum_day(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can still execute publish_curriculum_day';
  END IF;
  IF has_table_privilege('anon', 'public.curriculum_entries', 'SELECT') THEN
    RAISE EXCEPTION 'anon can still select curriculum_entries';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.curriculum_entries', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated lost curriculum_entries INSERT';
  END IF;
  IF has_table_privilege('authenticated', 'public.curriculum_revisions', 'UPDATE') THEN
    RAISE EXCEPTION 'authenticated has unexpected curriculum_revisions UPDATE';
  END IF;
END;
$$;

COMMIT;
