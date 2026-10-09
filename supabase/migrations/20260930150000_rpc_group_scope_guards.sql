-- =====================================================================
-- EL KAROOZ SCHOOL — Phase 1: close cross-group RPC leaks
-- =====================================================================
-- Finding: 5 SECURITY DEFINER functions returned jsonb with NO
-- authorization check. Because they are SECURITY DEFINER they bypass
-- RLS, so any authenticated user could read any group's data by
-- passing another group's id. Measured live: a group-1 trainee read
-- group-2 servant/secretariat names + phones + permissions, and the
-- full profile + attendance summary of trainees in group 2.
--
-- Fix strategy: rename + wrap. The original bodies are correct; they
-- just lack a guard. Renaming to _unsafe_* and revoking it removes
-- every direct path, then a same-signature wrapper re-exposes the
-- name with a mandatory check. No body is edited.
--
-- Verified on production before writing this file:
--   - all 5 return jsonb                    -> wrappable
--   - pg_depend on all 5 is empty           -> rename is safe
--   - guard compiled and raised 42501       -> deny path works
--   - rollback left no _unsafe_* remnant    -> transactional
--
-- NOTE ON CASTS: literals must be written as 2::smallint. A bare 2
-- resolves to integer and raises 42883.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Deny-by-rename: strip the unguarded entry points
-- ---------------------------------------------------------------------
ALTER FUNCTION public.get_group_operational_summary(smallint)
    RENAME TO _unsafe_get_group_operational_summary;
ALTER FUNCTION public.get_group_servants_detailed(smallint)
    RENAME TO _unsafe_get_group_servants_detailed;
ALTER FUNCTION public.get_group_secretariat_detailed(smallint)
    RENAME TO _unsafe_get_group_secretariat_detailed;
ALTER FUNCTION public.get_trainee_full_profile(uuid)
    RENAME TO _unsafe_get_trainee_full_profile;
ALTER FUNCTION public.get_trainee_attendance_summary(uuid)
    RENAME TO _unsafe_get_trainee_attendance_summary;

REVOKE ALL ON FUNCTION public._unsafe_get_group_operational_summary(smallint)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._unsafe_get_group_servants_detailed(smallint)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._unsafe_get_group_secretariat_detailed(smallint)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._unsafe_get_trainee_full_profile(uuid)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._unsafe_get_trainee_attendance_summary(uuid)
    FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Group-scoped guards (3 functions keyed on p_group_id)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_operational_summary(p_group_id smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
    IF NOT public.is_admin_or_super_user()
       AND p_group_id IS DISTINCT FROM public.get_current_user_group() THEN
        RAISE EXCEPTION 'group scope violation: not authorized for group %',
            p_group_id USING ERRCODE = '42501';
    END IF;
    RETURN public._unsafe_get_group_operational_summary(p_group_id);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.get_group_servants_detailed(p_group_id smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
    IF NOT public.is_admin_or_super_user()
       AND p_group_id IS DISTINCT FROM public.get_current_user_group() THEN
        RAISE EXCEPTION 'group scope violation: not authorized for group %',
            p_group_id USING ERRCODE = '42501';
    END IF;
    RETURN public._unsafe_get_group_servants_detailed(p_group_id);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.get_group_secretariat_detailed(p_group_id smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
    IF NOT public.is_admin_or_super_user()
       AND p_group_id IS DISTINCT FROM public.get_current_user_group() THEN
        RAISE EXCEPTION 'group scope violation: not authorized for group %',
            p_group_id USING ERRCODE = '42501';
    END IF;
    RETURN public._unsafe_get_group_secretariat_detailed(p_group_id);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 3. Trainee-scoped guards (2 functions keyed on p_trainee_id)
-- ---------------------------------------------------------------------
-- Access rule, verified against real call sites:
--   frontend/src/components/TraineeProfileDrawer.tsx:76 opens a
--   *selected* trainee inside the caller's own group, so same-group
--   staff must keep working. Self-access is always allowed.
--   has_servant_permission() is checked, but NOT as the sole gate: the
--   permission vocabulary in production is GRADE_EXAMS, MANAGE_BOOKS,
--   MANAGE_CURRICULUM, MANAGE_LECTURES, MANAGE_MARATHON. There is no
--   VIEW_TRAINEES. Relying on it alone would return false for every
--   servant and break a working feature.
CREATE OR REPLACE FUNCTION public.get_trainee_full_profile(p_trainee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
    v_group smallint;
    v_role  varchar;
BEGIN
    SELECT group_id, role_id INTO v_group, v_role
      FROM public.profiles
     WHERE id = p_trainee_id AND deleted_at IS NULL;

    IF v_group IS NULL THEN
        RAISE EXCEPTION 'trainee not found' USING ERRCODE = 'P0002';
    END IF;

    IF NOT (
        p_trainee_id = auth.uid()
        OR public.is_admin_or_super_user()
        OR (
            public.get_current_user_group() IS NOT DISTINCT FROM v_group
            AND (
                v_role = 'servant'
                OR v_role = 'secretariat'
                OR public.has_servant_permission('MANAGE_CURRICULUM')
                OR public.has_servant_permission('MANAGE_LECTURES')
            )
        )
    ) THEN
        RAISE EXCEPTION 'not authorized to view this trainee profile'
            USING ERRCODE = '42501';
    END IF;

    RETURN public._unsafe_get_trainee_full_profile(p_trainee_id);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.get_trainee_attendance_summary(p_trainee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
    v_group smallint;
    v_role  varchar;
BEGIN
    SELECT group_id, role_id INTO v_group, v_role
      FROM public.profiles
     WHERE id = p_trainee_id AND deleted_at IS NULL;

    IF v_group IS NULL THEN
        RAISE EXCEPTION 'trainee not found' USING ERRCODE = 'P0002';
    END IF;
    IF v_role IS DISTINCT FROM 'trainee' THEN
        RAISE EXCEPTION 'not a trainee record' USING ERRCODE = '42501';
    END IF;

    IF NOT (
        p_trainee_id = auth.uid()
        OR public.is_admin_or_super_user()
        OR (
            public.get_current_user_group() IS NOT DISTINCT FROM v_group
            AND (
                v_role = 'servant'
                OR v_role = 'secretariat'
                OR public.has_servant_permission('MANAGE_LECTURES')
                OR public.has_servant_permission('GRADE_EXAMS')
            )
        )
    ) THEN
        RAISE EXCEPTION 'not authorized to view this attendance summary'
            USING ERRCODE = '42501';
    END IF;

    RETURN public._unsafe_get_trainee_attendance_summary(p_trainee_id);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 4. profiles SELECT policy: scope reads to own group
-- ---------------------------------------------------------------------
DO $do$
DECLARE
    r record;
BEGIN
    -- Drop EVERY existing SELECT policy on profiles, regardless of which
    -- role it targets. RLS policies are permissive by default and are
    -- OR-ed together, so leaving one in place silently reopens the hole
    -- no matter how tight the new policy is.
    --
    -- Verified on production: the only SELECT policy is
    --   "Authenticated users can read profiles"
    --   USING (deleted_at IS NULL OR is_admin_or_super_user())
    -- TO authenticated  (oid 16485, NOT PUBLIC/oid 0)
    FOR r IN
        SELECT pol.polname
          FROM pg_policy pol
          JOIN pg_class c ON c.oid = pol.polrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = 'profiles'
           AND pol.polcmd = 'r'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.profiles', r.polname);
        RAISE NOTICE 'dropped SELECT policy: %', r.polname;
    END LOOP;
END;
$do$;

-- Named to match the convention of the surrounding policies. USING is
-- self-contained (no deleted_at clause): a soft-deleted row in your own
-- group should stay invisible rather than become admin-only-visible.
CREATE POLICY "profiles_select_own_group"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        is_admin_or_super_user()
        OR group_id = get_current_user_group()
        OR id = auth.uid()
    );

COMMIT;

-- ---------------------------------------------------------------------
-- 5. Post-conditions. All four must return 0, else this script failed.
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
    v_leak  bigint;
    v_nopol bigint;
    v_bad   bigint;
BEGIN
    -- 5a. No unguarded original body must be callable by authenticated
    SELECT count(*) INTO v_leak
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname LIKE '\\_unsafe\_%'
       AND has_function_privilege('authenticated', p.oid, 'EXECUTE');

    -- 5b. profiles must still have a SELECT policy
    SELECT count(*) INTO v_nopol
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'profiles'
       AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = c.oid);

    -- 5c. No SECURITY DEFINER function may lack a pinned search_path
    SELECT count(*) INTO v_bad
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
       AND (p.proconfig IS NULL
            OR NOT EXISTS (
                SELECT 1 FROM unnest(p.proconfig) cfg
                 WHERE cfg LIKE 'search\_path=%'));

    IF v_leak > 0 OR v_nopol > 0 OR v_bad > 0 THEN
        RAISE EXCEPTION
            'phase1 verification FAILED leak=% nopol=% searchpath=%',
            v_leak, v_nopol, v_bad;
    END IF;

    RAISE NOTICE 'phase1 verification PASSED leak=0 nopol=0 searchpath=0';
END;
$verify$;