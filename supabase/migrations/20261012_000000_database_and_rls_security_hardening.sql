-- =============================================================================
-- Migration: 20261012_000000_database_and_rls_security_hardening.sql
-- Description: Comprehensive Database & RLS Security Hardening
--
-- 1. Core security helpers (CRIT-03, MED-01, MED-02):
--    - Replace get_current_user_role(), get_current_user_group(),
--      is_admin_or_super_user(), has_servant_permission(perm_id),
--      is_secretariat_of_group(target_group), is_servant_or_secretariat().
--    - Set search_path = public, pg_temp on all SECURITY DEFINER functions.
--    - Check 'AND is_active = true AND deleted_at IS NULL' where applicable.
--    - GRANT EXECUTE to authenticated, service_role (REVOKE from PUBLIC, anon).
--
-- 2. Group Isolation in Marathon Submissions & Answers (CRIT-01):
--    - Re-create SELECT policy on public.marathon_trainee_submissions:
--      trainee_id = auth.uid() OR is_admin_or_super_user() OR can_manage_marathon(group_id).
--    - Re-create SELECT policy on public.marathon_trainee_answers:
--      verify submission's group_id via can_manage_marathon(s.group_id).
--
-- 3. PII & Roster Protection on profiles (CRIT-02):
--    - Re-create SELECT policy on public.profiles:
--      users can read their own profile (id = auth.uid()),
--      admins/super_users can read all,
--      students can only read profiles in their own group (group_id = get_current_user_group()),
--      staff (admin, super_user, servant, secretariat) remain visible school-wide.
--
-- 4. Cross-Group Consistency Triggers (HIGH-01):
--    - Add trigger on attendance_records to enforce session's group_id and
--      trainee's group_id match the record's group_id.
--    - Add trigger on exam_grades to enforce exam's group_id and
--      trainee's group_id match the record's group_id.
--
-- 5. Servant Permissions Policy (HIGH-02):
--    - Add ALL policy for admin/super_user and SELECT policy for servants on
--      public.servant_permissions.
--
-- 6. Write Policies for Reference Tables (MED-03):
--    - Add admin write policies for public.mp3_tracks, public.lecturers,
--      public.daily_verses.
--
-- 7. Post Reactors Access (LOW-01):
--    - GRANT EXECUTE ON FUNCTION public.get_post_reactors(uuid) TO authenticated, service_role.
--
-- 8. Transaction boundary (BEGIN ... COMMIT) with DO verification block.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Core Security Helpers (CRIT-03, MED-01, MED-02)
-- -----------------------------------------------------------------------------

-- 1.1 get_current_user_role()
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND is_active = true 
      AND deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, service_role;

-- 1.2 get_current_user_group()
CREATE OR REPLACE FUNCTION public.get_current_user_group()
RETURNS SMALLINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT group_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND is_active = true 
      AND deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.get_current_user_group() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_group() TO authenticated, service_role;

-- 1.3 is_admin_or_super_user()
CREATE OR REPLACE FUNCTION public.is_admin_or_super_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
          AND role_id IN ('admin', 'super_user') 
          AND is_active = true 
          AND deleted_at IS NULL
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin_or_super_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_user() TO authenticated, service_role;

-- 1.4 has_servant_permission(perm_id VARCHAR)
CREATE OR REPLACE FUNCTION public.has_servant_permission(perm_id VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT public.is_admin_or_super_user() OR EXISTS (
        SELECT 1 
        FROM public.servant_permissions sp
        JOIN public.profiles p ON p.id = sp.profile_id
        WHERE sp.profile_id = auth.uid() 
          AND sp.permission_id = perm_id
          AND p.is_active = true 
          AND p.deleted_at IS NULL
    );
$$;

REVOKE ALL ON FUNCTION public.has_servant_permission(VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_servant_permission(VARCHAR) TO authenticated, service_role;

-- 1.5 is_secretariat_of_group(target_group SMALLINT)
CREATE OR REPLACE FUNCTION public.is_secretariat_of_group(target_group SMALLINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT public.is_admin_or_super_user() OR EXISTS (
        SELECT 1 
        FROM public.group_secretariat gs
        JOIN public.profiles p ON p.id = gs.profile_id
        WHERE gs.profile_id = auth.uid() 
          AND gs.group_id = target_group 
          AND gs.is_active = true
          AND p.is_active = true 
          AND p.deleted_at IS NULL
    );
$$;

REVOKE ALL ON FUNCTION public.is_secretariat_of_group(SMALLINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_secretariat_of_group(SMALLINT) TO authenticated, service_role;

-- 1.6 is_servant_or_secretariat()
CREATE OR REPLACE FUNCTION public.is_servant_or_secretariat()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
          AND role_id IN ('servant', 'secretariat') 
          AND is_active = true 
          AND deleted_at IS NULL
    );
$$;

REVOKE ALL ON FUNCTION public.is_servant_or_secretariat() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_servant_or_secretariat() TO authenticated, service_role;

-- 1.7 can_manage_marathon(p_group_id SMALLINT) (guarantee aligned search_path & privileges)
CREATE OR REPLACE FUNCTION public.can_manage_marathon(p_group_id SMALLINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT public.is_admin_or_super_user()
        OR (
            public.get_current_user_group() = p_group_id
            AND (
                public.has_servant_permission('MANAGE_MARATHON')
                OR public.is_secretariat_of_group(p_group_id)
            )
        );
$$;

REVOKE ALL ON FUNCTION public.can_manage_marathon(SMALLINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_marathon(SMALLINT) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 2. Group Isolation in Marathon Submissions & Answers (CRIT-01)
-- -----------------------------------------------------------------------------

-- 2.1 Re-create SELECT policy on public.marathon_trainee_submissions
DROP POLICY IF EXISTS "Read own marathon submission" ON public.marathon_trainee_submissions;
DROP POLICY IF EXISTS "Trainee manage own marathon submission" ON public.marathon_trainee_submissions;
DROP POLICY IF EXISTS "Read marathon submissions with group isolation" ON public.marathon_trainee_submissions;

CREATE POLICY "Read own marathon submission"
ON public.marathon_trainee_submissions
FOR SELECT
TO authenticated
USING (
    trainee_id = auth.uid()
    OR public.is_admin_or_super_user()
    OR public.can_manage_marathon(group_id)
);

-- 2.2 Re-create SELECT policy on public.marathon_trainee_answers
DROP POLICY IF EXISTS "Read own marathon answers" ON public.marathon_trainee_answers;
DROP POLICY IF EXISTS "Trainee manage own marathon answers" ON public.marathon_trainee_answers;
DROP POLICY IF EXISTS "Read marathon answers with group isolation" ON public.marathon_trainee_answers;

CREATE POLICY "Read own marathon answers"
ON public.marathon_trainee_answers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.marathon_trainee_submissions s
        WHERE s.id = marathon_trainee_answers.submission_id
          AND (
              s.trainee_id = auth.uid()
              OR public.is_admin_or_super_user()
              OR public.can_manage_marathon(s.group_id)
          )
    )
);


-- -----------------------------------------------------------------------------
-- 3. PII & Roster Protection on Profiles (CRIT-02)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_group" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.is_admin_or_super_user()
    OR id = auth.uid()
    OR (
        deleted_at IS NULL
        AND (
            role_id IN ('admin', 'super_user', 'servant', 'secretariat')
            OR group_id = public.get_current_user_group()
        )
    )
);


-- -----------------------------------------------------------------------------
-- 4. Cross-Group Consistency Triggers (HIGH-01)
-- -----------------------------------------------------------------------------

-- 4.1 Attendance Records consistency trigger
CREATE OR REPLACE FUNCTION public.enforce_attendance_record_group_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session_group SMALLINT;
    v_trainee_group SMALLINT;
BEGIN
    IF TG_OP = 'INSERT'
       OR NEW.session_id IS DISTINCT FROM OLD.session_id
       OR NEW.trainee_id IS DISTINCT FROM OLD.trainee_id
       OR NEW.group_id IS DISTINCT FROM OLD.group_id THEN

        SELECT group_id INTO v_session_group
        FROM public.attendance_sessions
        WHERE id = NEW.session_id;

        IF v_session_group IS NULL THEN
            RAISE EXCEPTION 'Attendance session % does not exist', NEW.session_id
                USING ERRCODE = 'foreign_key_violation';
        END IF;

        IF v_session_group <> NEW.group_id THEN
            RAISE EXCEPTION 'Cross-group violation: attendance session group (%) does not match record group (%)',
                v_session_group, NEW.group_id
                USING ERRCODE = 'check_violation';
        END IF;

        SELECT group_id INTO v_trainee_group
        FROM public.profiles
        WHERE id = NEW.trainee_id;

        IF v_trainee_group IS NULL THEN
            RAISE EXCEPTION 'Trainee profile % does not exist', NEW.trainee_id
                USING ERRCODE = 'foreign_key_violation';
        END IF;

        IF v_trainee_group <> NEW.group_id THEN
            RAISE EXCEPTION 'Cross-group violation: trainee group (%) does not match record group (%)',
                v_trainee_group, NEW.group_id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_attendance_record_group_consistency() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_attendance_record_group_consistency() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_enforce_attendance_record_group ON public.attendance_records;
CREATE TRIGGER trg_enforce_attendance_record_group
    BEFORE INSERT OR UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_attendance_record_group_consistency();

-- 4.2 Exam Grades consistency trigger
CREATE OR REPLACE FUNCTION public.enforce_exam_grade_group_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_exam_group SMALLINT;
    v_trainee_group SMALLINT;
BEGIN
    IF TG_OP = 'INSERT'
       OR NEW.exam_id IS DISTINCT FROM OLD.exam_id
       OR NEW.trainee_id IS DISTINCT FROM OLD.trainee_id
       OR NEW.group_id IS DISTINCT FROM OLD.group_id THEN

        SELECT group_id INTO v_exam_group
        FROM public.exams
        WHERE id = NEW.exam_id;

        IF v_exam_group IS NULL THEN
            RAISE EXCEPTION 'Exam % does not exist', NEW.exam_id
                USING ERRCODE = 'foreign_key_violation';
        END IF;

        IF v_exam_group <> NEW.group_id THEN
            RAISE EXCEPTION 'Cross-group violation: exam group (%) does not match grade record group (%)',
                v_exam_group, NEW.group_id
                USING ERRCODE = 'check_violation';
        END IF;

        SELECT group_id INTO v_trainee_group
        FROM public.profiles
        WHERE id = NEW.trainee_id;

        IF v_trainee_group IS NULL THEN
            RAISE EXCEPTION 'Trainee profile % does not exist', NEW.trainee_id
                USING ERRCODE = 'foreign_key_violation';
        END IF;

        IF v_trainee_group <> NEW.group_id THEN
            RAISE EXCEPTION 'Cross-group violation: trainee group (%) does not match grade record group (%)',
                v_trainee_group, NEW.group_id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_exam_grade_group_consistency() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_exam_grade_group_consistency() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_enforce_exam_grade_group ON public.exam_grades;
CREATE TRIGGER trg_enforce_exam_grade_group
    BEFORE INSERT OR UPDATE ON public.exam_grades
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_exam_grade_group_consistency();


-- -----------------------------------------------------------------------------
-- 5. Servant Permissions Policy (HIGH-02)
-- -----------------------------------------------------------------------------

ALTER TABLE public.servant_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage servant permissions" ON public.servant_permissions;
CREATE POLICY "Admin manage servant permissions"
ON public.servant_permissions
FOR ALL
TO authenticated
USING (public.is_admin_or_super_user())
WITH CHECK (public.is_admin_or_super_user());

DROP POLICY IF EXISTS "Servants read own permissions" ON public.servant_permissions;
CREATE POLICY "Servants read own permissions"
ON public.servant_permissions
FOR SELECT
TO authenticated
USING (
    profile_id = auth.uid()
    OR public.is_admin_or_super_user()
);


-- -----------------------------------------------------------------------------
-- 6. Write Policies for Reference Tables (MED-03)
-- -----------------------------------------------------------------------------

-- 6.1 mp3_tracks
ALTER TABLE public.mp3_tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage mp3 tracks" ON public.mp3_tracks;
CREATE POLICY "Admin manage mp3 tracks"
ON public.mp3_tracks
FOR ALL
TO authenticated
USING (public.is_admin_or_super_user())
WITH CHECK (public.is_admin_or_super_user());

-- 6.2 lecturers
ALTER TABLE public.lecturers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage lecturers" ON public.lecturers;
CREATE POLICY "Admin manage lecturers"
ON public.lecturers
FOR ALL
TO authenticated
USING (public.is_admin_or_super_user())
WITH CHECK (public.is_admin_or_super_user());

-- 6.3 daily_verses
ALTER TABLE public.daily_verses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage daily verses" ON public.daily_verses;
CREATE POLICY "Admin manage daily verses"
ON public.daily_verses
FOR ALL
TO authenticated
USING (public.is_admin_or_super_user())
WITH CHECK (public.is_admin_or_super_user());


-- -----------------------------------------------------------------------------
-- 7. Post Reactors Access (LOW-01)
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.get_post_reactors(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_post_reactors(uuid) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 8. Post-Conditions Verification Block
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    v_missing_proc text;
    v_bad_searchpath text;
    v_missing_grant text;
    v_missing_trigger text;
BEGIN
    -- 8.1 Verify existence of core security functions
    SELECT string_agg(expected.proname, ', ')
    INTO v_missing_proc
    FROM (
        VALUES 
            ('get_current_user_role'),
            ('get_current_user_group'),
            ('is_admin_or_super_user'),
            ('has_servant_permission'),
            ('is_secretariat_of_group'),
            ('is_servant_or_secretariat'),
            ('can_manage_marathon'),
            ('enforce_attendance_record_group_consistency'),
            ('enforce_exam_grade_group_consistency'),
            ('get_post_reactors')
    ) AS expected(proname)
    LEFT JOIN pg_proc p ON p.proname = expected.proname
      AND p.pronamespace = 'public'::regnamespace
    WHERE p.oid IS NULL;

    IF v_missing_proc IS NOT NULL THEN
        RAISE EXCEPTION 'Verification failed: missing expected function(s): %', v_missing_proc;
    END IF;

    -- 8.2 Verify SECURITY DEFINER and pinned search_path
    SELECT string_agg(p.proname, ', ')
    INTO v_bad_searchpath
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN (
          'get_current_user_role',
          'get_current_user_group',
          'is_admin_or_super_user',
          'has_servant_permission',
          'is_secretariat_of_group',
          'is_servant_or_secretariat',
          'can_manage_marathon',
          'enforce_attendance_record_group_consistency',
          'enforce_exam_grade_group_consistency'
      )
      AND (
          NOT p.prosecdef
          OR p.proconfig IS NULL
          OR NOT EXISTS (
              SELECT 1 FROM unnest(p.proconfig) cfg
              WHERE cfg LIKE 'search\_path=%'
          )
      );

    IF v_bad_searchpath IS NOT NULL THEN
        RAISE EXCEPTION 'Verification failed: functions lacking SECURITY DEFINER or pinned search_path: %', v_bad_searchpath;
    END IF;

    -- 8.3 Verify EXECUTE privileges on authenticated & service_role
    SELECT string_agg(p.proname, ', ')
    INTO v_missing_grant
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN (
          'get_current_user_role',
          'get_current_user_group',
          'is_admin_or_super_user',
          'has_servant_permission',
          'is_secretariat_of_group',
          'is_servant_or_secretariat',
          'can_manage_marathon',
          'enforce_attendance_record_group_consistency',
          'enforce_exam_grade_group_consistency',
          'get_post_reactors'
      )
      AND (
          NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
          OR NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
      );

    IF v_missing_grant IS NOT NULL THEN
        RAISE EXCEPTION 'Verification failed: missing EXECUTE privileges on authenticated/service_role: %', v_missing_grant;
    END IF;

    -- 8.4 Verify triggers exist on attendance_records and exam_grades
    SELECT string_agg(expected.trgname, ', ')
    INTO v_missing_trigger
    FROM (
        VALUES 
            ('attendance_records', 'trg_enforce_attendance_record_group'),
            ('exam_grades', 'trg_enforce_exam_grade_group')
    ) AS expected(tblname, trgname)
    LEFT JOIN pg_trigger t ON t.tgname = expected.trgname
      AND t.tgrelid = ('public.' || expected.tblname)::regclass
      AND NOT t.tgisinternal
    WHERE t.oid IS NULL;

    IF v_missing_trigger IS NOT NULL THEN
        RAISE EXCEPTION 'Verification failed: missing trigger(s): %', v_missing_trigger;
    END IF;

    -- 8.5 Verify RLS policies exist
    -- (a) marathon_trainee_submissions SELECT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'marathon_trainee_submissions'
          AND cmd = 'SELECT'
          AND qual ILIKE '%can_manage_marathon%'
    ) THEN
        RAISE EXCEPTION 'Verification failed: marathon_trainee_submissions missing group-isolated SELECT policy';
    END IF;

    -- (b) marathon_trainee_answers SELECT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'marathon_trainee_answers'
          AND cmd = 'SELECT'
          AND qual ILIKE '%can_manage_marathon%'
    ) THEN
        RAISE EXCEPTION 'Verification failed: marathon_trainee_answers missing group-isolated SELECT policy';
    END IF;

    -- (c) profiles SELECT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'profiles'
          AND cmd = 'SELECT'
          AND qual ILIKE '%get_current_user_group%'
    ) THEN
        RAISE EXCEPTION 'Verification failed: profiles missing roster-scoped SELECT policy';
    END IF;

    -- (d) servant_permissions policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'servant_permissions'
          AND cmd = 'ALL'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'servant_permissions'
          AND cmd = 'SELECT'
    ) THEN
        RAISE EXCEPTION 'Verification failed: servant_permissions missing required policies';
    END IF;

    -- (e) Reference tables write policies for admin
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'mp3_tracks'
          AND cmd = 'ALL'
    ) THEN
        RAISE EXCEPTION 'Verification failed: mp3_tracks missing admin ALL policy';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'lecturers'
          AND cmd = 'ALL'
    ) THEN
        RAISE EXCEPTION 'Verification failed: lecturers missing admin ALL policy';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'daily_verses'
          AND cmd = 'ALL'
    ) THEN
        RAISE EXCEPTION 'Verification failed: daily_verses missing admin ALL policy';
    END IF;

    RAISE NOTICE 'Database & RLS security hardening verification PASSED successfully.';
END;
$$;

COMMIT;
