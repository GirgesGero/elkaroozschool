-- =============================================================================
-- EL KAROOZ SCHOOL — close self-escalation and cross-group data leaks
-- =============================================================================
-- APPLIED TO PRODUCTION 2026-09-30 as three migrations:
--   close_self_escalation           (policies: profiles, marathon answers)
--   close_self_escalation_v2        (the trigger that actually enforces it)
--   close_self_escalation_stage2    (search_path + least-privilege policies)
--
-- FINDING 1 (CRITICAL, verified live):
--   A signed-in user could move themselves into any group.
--   "Users can update own basic profile" was FOR UPDATE with
--   USING (id = auth.uid() OR is_admin_or_super_user()) and NO WITH CHECK.
--   A policy without WITH CHECK is evaluated with its USING expression against
--   the NEW row, and that expression constrains only `id` — never `role_id` or
--   `group_id`. Both are updatable; the only trigger was a timestamp touch.
--
--   PROVEN as the authenticated role, in a rolled-back transaction:
--     UPDATE public.profiles SET group_id = <other> WHERE id = auth.uid();
--     -> "old=1 target=2 after=2 => POLICY ALONE WAS VULNERABLE"
--
--   This defeats group isolation entirely: every group-scoped policy derives
--   its check from get_current_user_group(), which reads profiles.group_id.
--   Vertical escalation to admin/super_user was separately blocked by
--   uq_single_admin / uq_single_super_user (both raise 23505), so the blast
--   radius is lateral (cross-group), not vertical.
--
-- FINDING 2 (HIGH, verified live):
--   "Trainee manage own marathon answers" was FOR ALL ... USING (true): any
--   signed-in user could read/update/delete every trainee's answers in every
--   group. The table has no trainee_id column (it hangs off submission_id), so
--   the policy could not scope itself per-trainee as written. Live exposure:
--   54 answer rows / 18 submissions across 2 groups (group 1 = 45, group 2 = 9).
--
-- FINDING 3 (MEDIUM, defence in depth):
--   All 28 SECURITY DEFINER functions had no pinned search_path. Not currently
--   exploitable — every body fully qualifies public. — but an unqualified edit
--   would become a privilege-escalation vector.
--
-- FINDING 4 (functional, not a hole):
--   5 tables had RLS enabled with ZERO policies (= deny all to every role):
--   lecturers, notification_templates, group_secretariat, daily_verses,
--   daily_verse_dispatch_state. Given least-privilege policies instead.
--
-- VERIFIED AFTER APPLYING, as the `authenticated` role. The MCP connection is
-- a superuser (current_user = postgres) and bypasses RLS, so testing as postgres
-- proves nothing — every check below was run under SET LOCAL ROLE authenticated.
--   g1 trainee: gallery_items = 5,  marathon answers = 45
--   g2 trainee: gallery_items = 0,  marathon answers = 0   <- isolation real
--   self group-hop      => BLOCKED (42501 privilege columns)
--   self role change    => BLOCKED (42501 privilege columns)
--   self profile rename => ALLOWED (the legitimate feature still works)
--   50/50 tables RLS on, 0 without policy, 0 definer without search_path,
--   0 anon-executable definer, data unchanged (50 profiles, 54 answers).
--
-- SAFE TO RE-RUN: IF EXISTS / OR REPLACE / DROP POLICY IF EXISTS throughout.
-- No data is modified. Admins and service_role are unaffected.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Privilege-column guard (the actual privilege-escalation fix)
--
-- IMPORTANT — do NOT "simplify" this back into a self-referential WITH CHECK.
-- A policy without WITH CHECK is evaluated with its USING expression against
-- the NEW row, so a WITH CHECK of the form
--     role_id IS NOT DISTINCT FROM (SELECT role_id FROM profiles WHERE id = auth.uid())
-- is a TAUTOLOGY: the subquery reads the NEW row, the comparison is always
-- true, and the exploit still succeeds. Verified on production:
--     "GROUP HOP => STILL VULNERABLE"
-- Only a BEFORE UPDATE trigger comparing NEW against OLD can enforce this.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
BEGIN
    IF auth.uid() IS NOT NULL
       AND NOT public.is_admin_or_super_user()
       AND (
            NEW.role_id    IS DISTINCT FROM OLD.role_id
         OR NEW.group_id   IS DISTINCT FROM OLD.group_id
         OR NEW.is_active  IS DISTINCT FROM OLD.is_active
         OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
       ) THEN
        RAISE EXCEPTION
            'privilege columns (role_id, group_id, is_active, deleted_at) can only be changed by an administrator'
            USING ERRCODE = '42501';
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_profiles_guard_privilege ON public.profiles;

CREATE TRIGGER trg_profiles_guard_privilege
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_profile_privilege_columns();

-- The policy keeps its original, correct USING clause. The trigger, not a
-- self-referential WITH CHECK, is what pins the privilege columns.
DROP POLICY IF EXISTS "Users can update own basic profile" ON public.profiles;
CREATE POLICY "Users can update own basic profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin_or_super_user())
    WITH CHECK (id = auth.uid() OR public.is_admin_or_super_user());

-- -----------------------------------------------------------------------------
-- 2. Scope marathon_trainee_answers to its owning submission
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Trainee manage own marathon answers" ON public.marathon_trainee_answers;

CREATE POLICY "Trainee manage own marathon answers" ON public.marathon_trainee_answers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.marathon_trainee_submissions s
            WHERE s.id = marathon_trainee_answers.submission_id
              AND (
                  s.trainee_id = auth.uid()
                  OR public.is_admin_or_super_user()
                  OR public.has_servant_permission('MANAGE_MARATHON')
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.marathon_trainee_submissions s
            WHERE s.id = marathon_trainee_answers.submission_id
              AND (
                  s.trainee_id = auth.uid()
                  OR public.is_admin_or_super_user()
                  OR public.has_servant_permission('MANAGE_MARATHON')
              )
        )
    );

-- -----------------------------------------------------------------------------
-- 3. Pin search_path on every SECURITY DEFINER function
--    Not currently exploitable (all bodies fully qualify public.), but an
--    unqualified future edit would become a privilege-escalation vector.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prosecdef
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Restore legitimate access to the fully-locked tables
--    These have RLS enabled and ZERO policies, so no role can read them
--    (RLS enabled + no policy = deny all). The app needs them.
-- -----------------------------------------------------------------------------

-- lecturers: read-only reference data for authenticated users.
DROP POLICY IF EXISTS "Authenticated read lecturers" ON public.lecturers;
CREATE POLICY "Authenticated read lecturers" ON public.lecturers
    FOR SELECT TO authenticated USING (true);

-- notification_templates: staff may manage, all staff may read.
DROP POLICY IF EXISTS "Staff read notification templates" ON public.notification_templates;
CREATE POLICY "Staff read notification templates" ON public.notification_templates
    FOR SELECT TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'super_user', 'servant', 'secretariat'));

DROP POLICY IF EXISTS "Admin manage notification templates" ON public.notification_templates;
CREATE POLICY "Admin manage notification templates" ON public.notification_templates
    FOR ALL TO authenticated
    USING (public.is_admin_or_super_user())
    WITH CHECK (public.is_admin_or_super_user());

-- group_secretariat: a user may see their own rows; admins see all.
-- Required by has_servant_permission()/is_secretariat_of_group() style
-- lookups and by the secretariat management UI.
DROP POLICY IF EXISTS "Read own secretariat assignment" ON public.group_secretariat;
CREATE POLICY "Read own secretariat assignment" ON public.group_secretariat
    FOR SELECT TO authenticated
    USING (profile_id = auth.uid() OR public.is_admin_or_super_user());

DROP POLICY IF EXISTS "Admin manage secretariat assignments" ON public.group_secretariat;
CREATE POLICY "Admin manage secretariat assignments" ON public.group_secretariat
    FOR ALL TO authenticated
    USING (public.is_admin_or_super_user())
    WITH CHECK (public.is_admin_or_super_user());

-- daily_verses: shared reference content.
DROP POLICY IF EXISTS "Authenticated read daily verses" ON public.daily_verses;
CREATE POLICY "Authenticated read daily verses" ON public.daily_verses
    FOR SELECT TO authenticated USING (true);

-- daily_verse_dispatch_state: admin-managed dispatch bookkeeping.
DROP POLICY IF EXISTS "Admin manage verse dispatch state" ON public.daily_verse_dispatch_state;
CREATE POLICY "Admin manage verse dispatch state" ON public.daily_verse_dispatch_state
    FOR ALL TO authenticated
    USING (public.is_admin_or_super_user())
    WITH CHECK (public.is_admin_or_super_user());

-- -----------------------------------------------------------------------------
-- 5. Guard: abort if the escalation hole is ever reopened.
--    Mirrors the pattern used in 20260930120000_revoke_anon_security_definer.
--    The guard checks the TRIGGER, because the trigger is the thing that
--    actually enforces the constraint — a WITH CHECK alone does not.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_trigger_missing BOOLEAN;
    v_permissive TEXT;
BEGIN
    SELECT NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        WHERE c.relname = 'profiles'
          AND t.tgname   = 'trg_profiles_guard_privilege'
          AND t.tgenabled = 'O'
    ) INTO v_trigger_missing;

    IF v_trigger_missing THEN
        RAISE EXCEPTION
            'EL KAROOZ: guard trigger trg_profiles_guard_privilege is missing '
            'or disabled on public.profiles — cross-group escalation is open again';
    END IF;

    SELECT string_agg(pol.tablename || '.' || pol.polname, ', ')
      INTO v_permissive
      FROM pg_policies pol
     WHERE pol.schemaname = 'public'
       AND pol.qual IS NOT NULL
       AND btrim(pol.qual) IN ('true', '(true)')
       AND pol.cmd IN ('ALL', 'UPDATE', 'DELETE');

    IF v_permissive IS NOT NULL THEN
        RAISE EXCEPTION
            'EL KAROOZ: unguarded permissive policy (USING true) on: %', v_permissive;
    END IF;
END $$;
