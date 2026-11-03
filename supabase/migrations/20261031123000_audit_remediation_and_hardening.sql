-- =============================================================================
-- Migration: 20261031123000_audit_remediation_and_hardening.sql
-- Purpose:
--   1. DB-02: Fix inverted caller-vs-target role authorization in
--      get_trainee_full_profile(uuid) and get_trainee_attendance_summary(uuid).
--   2. DB-03: Drop duplicate permissive policy "Authenticated users can read profiles"
--      on public.profiles, harden profiles_select_policy, remove duplicate
--      privilege-guard trigger, and allow system admins to manage operational
--      roles while keeping admin/super_user permit-gated.
--   3. DB-04: Harden restore_table, restore_database, and
--      system_reset_guarded_restore_database against non-UUID PK cast crashes,
--      audit_logs/system_reset_* tampering, and multi-admin (Co-System Admin)
--      lockout during restore.
--   4. DB-05: Fix check_attendance_thursday_lock() to use Africa/Cairo date,
--      handle DELETE operations, and remove dead pre-exception UPDATE.
--   5. DB-06: Include extensions in create_trainee_profile search_path and
--      replace hardcoded default password fallback with cryptographic random bytes.
--   6. DB-13: Replace full-table uq_exam_per_term constraint with a partial
--      unique index excluding soft-deleted exams (deleted_at IS NULL).
--   7. DB-14: Add covering indexes for high-traffic foreign keys.
--   8. Security Advisors (0011 & 0028): Pin search_path on trigger helpers and
--      revoke anon/PUBLIC execution from SECURITY DEFINER functions and triggers.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. DB-02: Fix get_trainee_full_profile & get_trainee_attendance_summary
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_trainee_full_profile(p_trainee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_profile RECORD;
    v_caller_role VARCHAR(32);
    v_attendance_summary JSONB;
    v_attendance_log JSONB;
    v_exam_grades JSONB;
    v_marathon_subs JSONB;
BEGIN
    SELECT p.*, g.name_ar AS group_name, r.name_ar AS role_name
    INTO v_profile
    FROM public.profiles p
    LEFT JOIN public.groups g ON g.id = p.group_id
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = p_trainee_id AND p.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'الدارس غير موجود');
    END IF;

    v_caller_role := public.get_current_user_role();

    IF NOT (
        (SELECT auth.uid()) = p_trainee_id
        OR public.is_admin_or_super_user()
        OR (
            v_caller_role IN ('supervisor', 'servant', 'secretariat')
            AND v_profile.group_id IS NOT NULL
            AND v_profile.group_id = public.get_current_user_group()
        )
    ) THEN
        RAISE EXCEPTION 'غير مصرح لك بعرض ملف هذا الدارس';
    END IF;

    SELECT public.get_trainee_attendance_summary(p_trainee_id) INTO v_attendance_summary;

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO v_attendance_log
    FROM (
        SELECT
            ar.id,
            s.session_date,
            l.title AS lecture_title,
            ar.status,
            ar.excuse_reason,
            ar.recorded_at
        FROM public.attendance_records ar
        JOIN public.attendance_sessions s ON s.id = ar.session_id
        LEFT JOIN public.lectures l ON l.id = s.lecture_id
        WHERE ar.trainee_id = p_trainee_id AND ar.deleted_at IS NULL AND s.deleted_at IS NULL
        ORDER BY s.session_date DESC
    ) t;

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO v_exam_grades
    FROM (
        SELECT
            eg.id,
            e.title AS exam_title,
            e.exam_date,
            e.max_score,
            tm.name_ar AS term_name,
            eg.numeric_score,
            eg.appreciation_grade,
            eg.notes
        FROM public.exam_grades eg
        JOIN public.exams e ON e.id = eg.exam_id
        LEFT JOIN public.terms tm ON tm.id = e.term_id
        WHERE eg.trainee_id = p_trainee_id AND eg.deleted_at IS NULL AND e.deleted_at IS NULL
        ORDER BY e.exam_date DESC
    ) t;

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO v_marathon_subs
    FROM (
        SELECT
            ms.id,
            m.title AS marathon_title,
            tm.name_ar AS term_name,
            ms.status,
            ms.score,
            ms.total_questions,
            ms.submitted_at
        FROM public.marathon_trainee_submissions ms
        JOIN public.marathons m ON m.id = ms.marathon_id
        LEFT JOIN public.terms tm ON tm.id = m.term_id
        WHERE ms.trainee_id = p_trainee_id AND m.deleted_at IS NULL
        ORDER BY ms.submitted_at DESC NULLS LAST
    ) t;

    RETURN jsonb_build_object(
        'profile', row_to_json(v_profile),
        'attendance_summary', v_attendance_summary,
        'attendance_log', v_attendance_log,
        'exam_grades', v_exam_grades,
        'marathon_submissions', v_marathon_subs
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_trainee_full_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trainee_full_profile(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_trainee_attendance_summary(p_trainee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_group SMALLINT;
    v_caller_role VARCHAR(32);
    v_total_sessions INT := 0;
    v_present INT := 0;
    v_late INT := 0;
    v_excused INT := 0;
    v_absent INT := 0;
    v_percentage NUMERIC(5,2) := 0.00;
BEGIN
    SELECT group_id INTO v_group
    FROM public.profiles
    WHERE id = p_trainee_id AND deleted_at IS NULL;

    v_caller_role := public.get_current_user_role();

    IF NOT (
        (SELECT auth.uid()) = p_trainee_id
        OR public.is_admin_or_super_user()
        OR (
            v_caller_role IN ('supervisor', 'servant', 'secretariat')
            AND v_group IS NOT NULL
            AND v_group = public.get_current_user_group()
        )
    ) THEN
        RAISE EXCEPTION 'غير مصرح لك بعرض سجل حضور هذا الدارس';
    END IF;

    SELECT COUNT(*) INTO v_total_sessions
    FROM public.attendance_sessions s
    WHERE s.group_id = v_group AND s.deleted_at IS NULL;

    SELECT
        COUNT(*) FILTER (WHERE ar.status = 'PRESENT'),
        COUNT(*) FILTER (WHERE ar.status = 'LATE'),
        COUNT(*) FILTER (WHERE ar.status = 'EXCUSED'),
        COUNT(*) FILTER (WHERE ar.status = 'ABSENT')
    INTO v_present, v_late, v_excused, v_absent
    FROM public.attendance_records ar
    JOIN public.attendance_sessions s ON s.id = ar.session_id
    WHERE ar.trainee_id = p_trainee_id
      AND ar.deleted_at IS NULL
      AND s.deleted_at IS NULL;

    IF v_total_sessions > 0 THEN
        v_percentage := ROUND(((v_present + v_late)::numeric / v_total_sessions::numeric) * 100.0, 2);
    END IF;

    RETURN jsonb_build_object(
        'trainee_id', p_trainee_id,
        'group_id', v_group,
        'total_sessions', v_total_sessions,
        'present', v_present,
        'late', v_late,
        'excused', v_excused,
        'absent', v_absent,
        'attendance_percentage', v_percentage
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_trainee_attendance_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trainee_attendance_summary(uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. DB-03: Profiles RLS & Role Change Trigger Hardening
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND (
        id = (SELECT auth.uid())
        OR public.is_system_admin()
        OR public.has_general_secretariat_permission('MANAGE_CURRICULUM')
        OR public.has_general_secretariat_permission('MANAGE_LECTURES')
        OR public.has_general_secretariat_permission('MANAGE_MARATHON')
        OR public.has_general_secretariat_permission('GRADE_EXAMS')
        OR public.has_general_secretariat_permission('MANAGE_BOOKS')
        OR (
            public.get_current_user_group() IS NOT NULL
            AND group_id = public.get_current_user_group()
        )
    )
);

DROP POLICY IF EXISTS "Users can update own basic profile" ON public.profiles;
CREATE POLICY "Users can update own basic profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

-- Remove duplicate privilege-guard trigger (keep trg_profiles_guard_privilege which fires on all updates)
DROP TRIGGER IF EXISTS trg_guard_profile_privilege_columns ON public.profiles;

-- Allow system administrators (or service_role) to assign/change operational roles
-- ('supervisor', 'servant', 'secretariat', 'trainee') while strictly requiring
-- transaction permits for 'admin' and blocking 'super_user'.
CREATE OR REPLACE FUNCTION public.guard_system_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_remaining_admins int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role_id = 'admin' THEN
      SELECT count(*) INTO v_remaining_admins
      FROM public.profiles
      WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL AND id <> OLD.id;

      IF v_remaining_admins < 1 THEN
        RAISE EXCEPTION 'Cannot delete the last remaining active system administrator'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role_id IN ('admin', 'super_user') THEN
      RAISE EXCEPTION 'Sensitive roles may only be assigned by the approved system workflow'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.role_id = 'supervisor'
       AND auth.uid() IS NOT NULL
       AND NOT public.is_system_admin() THEN
      RAISE EXCEPTION 'Only a system administrator may create a supervisor profile'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    IF NEW.role_id = 'super_user' THEN
      RAISE EXCEPTION 'Deprecated role super_user cannot be assigned'
        USING ERRCODE = '42501';
    END IF;

    -- Check if demoting the last active admin
    IF OLD.role_id = 'admin' AND NEW.role_id <> 'admin' THEN
      SELECT count(*) INTO v_remaining_admins
      FROM public.profiles
      WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL AND id <> OLD.id;

      IF v_remaining_admins < 1 THEN
        RAISE EXCEPTION 'Cannot demote the last remaining active system administrator'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    -- Promoting to or demoting from 'admin' requires a transaction permit
    IF OLD.role_id = 'admin' OR NEW.role_id = 'admin' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.system_admin_role_change_permits p
        WHERE p.transaction_id = txid_current() AND p.profile_id = OLD.id
          AND (p.actor_id = auth.uid() OR (auth.uid() IS NULL AND session_user = 'postgres'))
          AND p.old_role_id = OLD.role_id
          AND p.new_role_id = NEW.role_id
      ) THEN
        RAISE EXCEPTION 'System administrator role changes require the system-admin management workflow'
          USING ERRCODE = '42501';
      END IF;
    ELSIF auth.uid() IS NOT NULL AND NOT public.is_system_admin() THEN
      RAISE EXCEPTION 'Role changes require an active system administrator'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role_id = 'admin'
     AND (NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN
    IF (NEW.is_active = false OR NEW.deleted_at IS NOT NULL) THEN
      SELECT count(*) INTO v_remaining_admins
      FROM public.profiles
      WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL AND id <> OLD.id;

      IF v_remaining_admins < 1 THEN
        RAISE EXCEPTION 'Cannot suspend or deactivate the last remaining active system administrator'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    IF NOT EXISTS (
       SELECT 1 FROM public.system_admin_role_change_permits p
       WHERE p.transaction_id = txid_current() AND p.profile_id = OLD.id AND p.actor_id = auth.uid()
     ) AND NOT (SELECT public.is_system_admin()) THEN
      RAISE EXCEPTION 'Sensitive status changes on system administrators require an active administrator'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_system_role_changes() FROM PUBLIC, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. DB-04: Harden restore_table, restore_database, and system_reset_guarded_restore_database
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_table(p_table text, p_rows jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_exists boolean;
    v_cols text[];
    v_has_id boolean := false;
    v_row jsonb;
    v_row_id text;
    v_set_list text;
    v_updated bigint;
    v_applied bigint := 0;
BEGIN
    IF p_table IS NULL OR p_table !~ '^[a-z_][a-z0-9_]*$' THEN
        RAISE EXCEPTION 'restore_table: invalid table identifier %', coalesce(p_table, '<null>')
            USING ERRCODE = '42602';
    END IF;

    IF p_table IN (
        'backup_records',
        'import_history',
        'audit_logs',
        'system_reset_runs',
        'system_reset_run_assets',
        'system_reset_run_users',
        'system_reset_gate',
        'system_reset_write_permits',
        'system_reset_auth_delete_permits',
        'system_admin_role_change_permits'
    ) THEN
        RAISE EXCEPTION 'restore_table: table % is protected and may not be restored', p_table
            USING ERRCODE = '42501';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name = p_table
    ) INTO v_exists;

    IF NOT v_exists THEN
        RAISE EXCEPTION 'restore_table: table public.% does not exist', p_table
            USING ERRCODE = '42P01';
    END IF;

    IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
        RAISE EXCEPTION 'restore_table: p_rows must be a JSON array'
            USING ERRCODE = '22023';
    END IF;

    IF jsonb_array_length(p_rows) = 0 THEN
        RETURN 0;
    END IF;

    SELECT array_agg(column_name ORDER BY ordinal_position)
    INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND is_generated = 'NEVER';

    v_has_id := ('id' = ANY(v_cols));

    IF v_has_id THEN
        SELECT string_agg(format('%I = r.%I', c, c), ', ')
        INTO v_set_list
        FROM unnest(v_cols) AS c
        WHERE c <> 'id';
    END IF;

    PERFORM set_config('session_replication_role', 'replica', true);

    FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
    LOOP
        v_updated := 0;
        v_row_id := v_row->>'id';

        IF v_has_id AND v_row_id IS NOT NULL AND v_set_list IS NOT NULL THEN
            EXECUTE format(
                'UPDATE public.%I AS t SET %s FROM jsonb_populate_record(NULL::public.%I, $1) AS r WHERE t.id::text = $2',
                p_table, v_set_list, p_table
            ) USING v_row, v_row_id;
            GET DIAGNOSTICS v_updated = ROW_COUNT;
        END IF;

        IF v_updated = 0 THEN
            EXECUTE format(
                'INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1) ON CONFLICT DO NOTHING',
                p_table,
                (SELECT string_agg(format('%I', c), ', ') FROM unnest(v_cols) AS c),
                (SELECT string_agg(format('%I', c), ', ') FROM unnest(v_cols) AS c),
                p_table
            ) USING v_row;
        END IF;

        v_applied := v_applied + 1;
    END LOOP;

    RETURN v_applied;
END;
$function$;

REVOKE ALL ON FUNCTION public.restore_table(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_table(text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.restore_database(p_tables jsonb, p_truncate boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_order text[] := ARRAY[
        'roles', 'groups', 'permissions',
        'bible_testaments', 'bible_books', 'bible_chapters', 'bible_verses',
        'bible_interpretation_sources', 'bible_commentaries', 'bible_word_commentaries',
        'bible_dictionary_entries', 'word_dictionary_mappings', 'bible_content_versions',
        'book_categories', 'gallery_categories',
        'profiles', 'lecturers', 'terms',
        'servant_permissions', 'group_secretariat',
        'general_secretariat_members', 'general_secretariat_permissions',
        'lectures', 'curriculums', 'curriculum_days', 'curriculum_entries', 'curriculum_revisions',
        'attendance_sessions', 'attendance_records',
        'exams', 'exam_grades',
        'marathons', 'marathon_sections', 'marathon_questions', 'marathon_answers',
        'marathon_question_revisions', 'marathon_trainee_submissions', 'marathon_trainee_answers',
        'books', 'researches', 'mp3_tracks', 'gallery_albums', 'gallery_items', 'media_assets',
        'feed_posts', 'post_images', 'post_comments', 'reactions',
        'notification_templates', 'notifications', 'push_subscriptions',
        'daily_verses', 'daily_verse_dispatch_state', 'user_favorites'
    ];
    v_protected text[] := ARRAY[
        'backup_records',
        'import_history',
        'audit_logs',
        'system_reset_runs',
        'system_reset_run_assets',
        'system_reset_run_users',
        'system_reset_gate',
        'system_reset_write_permits',
        'system_reset_auth_delete_permits',
        'system_admin_role_change_permits'
    ];
    v_tbl text;
    v_rows jsonb;
    v_res jsonb;
    v_summary jsonb := '{}'::jsonb;
    v_total integer := 0;
BEGIN
    IF p_tables IS NULL OR jsonb_typeof(p_tables) <> 'object' THEN
        RAISE EXCEPTION 'restore_database: p_tables must be a JSON object mapping table -> rows[]'
            USING ERRCODE = '22023';
    END IF;

    PERFORM set_config('session_replication_role', 'replica', true);

    IF coalesce(p_truncate, false) THEN
        FOR v_tbl IN
            SELECT key FROM jsonb_object_keys(p_tables) AS key
            WHERE NOT (key = ANY(v_protected))
        LOOP
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = v_tbl
            ) THEN
                EXECUTE format('TRUNCATE TABLE public.%I CASCADE', v_tbl);
            END IF;
        END LOOP;
    END IF;

    FOREACH v_tbl IN ARRAY v_order
    LOOP
        IF p_tables ? v_tbl AND NOT (v_tbl = ANY(v_protected)) THEN
            v_rows := p_tables -> v_tbl;
            IF jsonb_typeof(v_rows) = 'array' AND jsonb_array_length(v_rows) > 0 THEN
                v_res := public.restore_table(v_tbl, v_rows);
                v_summary := v_summary || jsonb_build_object(v_tbl, (v_res ->> 'rows_restored')::int);
                v_total := v_total + (v_res ->> 'rows_restored')::int;
            ELSE
                v_summary := v_summary || jsonb_build_object(v_tbl, 0);
            END IF;
        END IF;
    END LOOP;

    FOR v_tbl IN
        SELECT key FROM jsonb_object_keys(p_tables) AS key
        WHERE NOT (key = ANY(v_order))
          AND NOT (key = ANY(v_protected))
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = v_tbl
        ) THEN
            v_rows := p_tables -> v_tbl;
            IF jsonb_typeof(v_rows) = 'array' AND jsonb_array_length(v_rows) > 0 THEN
                v_res := public.restore_table(v_tbl, v_rows);
                v_summary := v_summary || jsonb_build_object(v_tbl, (v_res ->> 'rows_restored')::int);
                v_total := v_total + (v_res ->> 'rows_restored')::int;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'tables_restored', v_summary,
        'total_rows_restored', v_total
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.restore_database(jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_database(jsonb, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.system_reset_guarded_restore_database(
    p_tables jsonb,
    p_truncate boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_admin_ids text[];
    v_admin_rows jsonb;
    v_tables jsonb := p_tables;
    v_profile_rows jsonb;
    v_admin_row jsonb;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended('elkarooz-system-reset', 0));

    SELECT
        array_agg(p.id::text),
        COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
    INTO v_admin_ids, v_admin_rows
    FROM (
        SELECT *
        FROM public.profiles
        WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL
        FOR UPDATE
    ) p;

    IF v_admin_ids IS NULL OR coalesce(array_length(v_admin_ids, 1), 0) < 1 THEN
        RAISE EXCEPTION 'restore requires at least one current active system administrator'
            USING ERRCODE = '42501';
    END IF;

    IF v_tables ? 'profiles' THEN
        IF jsonb_typeof(v_tables->'profiles') IS DISTINCT FROM 'array' THEN
            RAISE EXCEPTION 'profiles restore data must be a JSON array' USING ERRCODE = '22023';
        END IF;

        -- Preserve every currently active admin row; downgrade any other archived row claiming admin/super_user
        SELECT COALESCE(jsonb_agg(
            CASE
                WHEN (row_data->>'id') = ANY(v_admin_ids) THEN (
                    SELECT adm
                    FROM jsonb_array_elements(v_admin_rows) AS adm
                    WHERE adm->>'id' = row_data->>'id'
                    LIMIT 1
                )
                WHEN lower(COALESCE(row_data->>'role_id', '')) IN ('admin', 'super_user')
                    THEN jsonb_set(row_data, '{role_id}', '"supervisor"'::jsonb, true)
                ELSE row_data
            END
        ), '[]'::jsonb)
        INTO v_profile_rows
        FROM jsonb_array_elements(v_tables->'profiles') AS item(row_data);

        -- Append any current active admin missing from the archive payload
        FOR v_admin_row IN SELECT value FROM jsonb_array_elements(v_admin_rows)
        LOOP
            IF NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(v_profile_rows) AS item(row_data)
                WHERE row_data->>'id' = v_admin_row->>'id'
            ) THEN
                v_profile_rows := v_profile_rows || jsonb_build_array(v_admin_row);
            END IF;
        END LOOP;

        v_tables := jsonb_set(v_tables, '{profiles}', v_profile_rows, true);
    ELSIF p_truncate THEN
        RAISE EXCEPTION 'truncate restore must include profiles to preserve the system administrator(s)'
            USING ERRCODE = '22023';
    END IF;

    RETURN public.restore_database(v_tables, p_truncate);
END;
$function$;

REVOKE ALL ON FUNCTION public.system_reset_guarded_restore_database(jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_reset_guarded_restore_database(jsonb, boolean) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. DB-05: Fix check_attendance_thursday_lock() & check_attendance_session_open()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_attendance_session_open()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_target_session_id UUID;
    v_session_status VARCHAR(32);
    v_session_date DATE;
BEGIN
    v_target_session_id := COALESCE(NEW.session_id, OLD.session_id);

    SELECT status, session_date INTO v_session_status, v_session_date
    FROM public.attendance_sessions
    WHERE id = v_target_session_id;

    IF v_session_status = 'LOCKED' THEN
        RAISE EXCEPTION 'لا يمكن تسجيل أو تعديل الحضور: الجلسة مغلقة نهائياً (جلسة %)', v_session_date;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_attendance_thursday_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_target_session_id UUID;
    v_session_date DATE;
    v_session_status VARCHAR(32);
    v_lock_deadline DATE;
    v_days_to_thursday INT;
    v_cairo_today DATE;
BEGIN
    v_target_session_id := COALESCE(NEW.session_id, OLD.session_id);

    SELECT session_date, status INTO v_session_date, v_session_status
    FROM public.attendance_sessions
    WHERE id = v_target_session_id;

    IF NOT FOUND THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    IF v_session_status = 'LOCKED' THEN
        RAISE EXCEPTION 'لا يمكن تعديل سجل الحضور: تم إغلاق الجلسة نهائياً'
            USING ERRCODE = '42501';
    END IF;

    -- DOW: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    v_days_to_thursday := (4 - EXTRACT(DOW FROM v_session_date)::int + 7) % 7;
    IF v_days_to_thursday = 0 THEN
        v_days_to_thursday := 7;
    END IF;
    v_lock_deadline := v_session_date + v_days_to_thursday;
    v_cairo_today := (now() AT TIME ZONE 'Africa/Cairo')::date;

    IF v_cairo_today >= v_lock_deadline THEN
        RAISE EXCEPTION 'تم إغلاق تعديل الحضور والغياب لهذه المحاضرة تلقائياً (انتهت مهلة التعديل بنهاية يوم الأربعاء — الخميس %)', v_lock_deadline
            USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_attendance_thursday_freeze ON public.attendance_records;
CREATE TRIGGER trg_attendance_thursday_freeze
BEFORE INSERT OR UPDATE OR DELETE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.check_attendance_thursday_lock();

DROP TRIGGER IF EXISTS trg_check_attendance_session_open ON public.attendance_records;
CREATE TRIGGER trg_check_attendance_session_open
BEFORE INSERT OR UPDATE OR DELETE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.check_attendance_session_open();

-- -----------------------------------------------------------------------------
-- 5. DB-06: Harden create_trainee_profile
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_trainee_profile(
    p_username character varying,
    p_full_name character varying,
    p_group_id smallint,
    p_birth_date date,
    p_phone character varying DEFAULT NULL::character varying,
    p_confession_father character varying DEFAULT NULL::character varying,
    p_church character varying DEFAULT NULL::character varying,
    p_address text DEFAULT NULL::text,
    p_password character varying DEFAULT NULL::character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
    v_caller_role VARCHAR(32);
    v_caller_group SMALLINT;
    v_user_id UUID;
    v_clean_username VARCHAR(64);
    v_email VARCHAR(255);
    v_actual_pass VARCHAR(128);
BEGIN
    v_caller_role := public.get_current_user_role();
    v_caller_group := public.get_current_user_group();

    IF NOT (
        public.is_admin_or_super_user()
        OR (v_caller_role IN ('supervisor', 'servant', 'secretariat') AND v_caller_group = p_group_id)
    ) THEN
        RAISE EXCEPTION 'غير مصرح لك بإضافة مخدومين في هذه الفرقة';
    END IF;

    v_clean_username := lower(trim(p_username));
    IF v_clean_username = '' OR v_clean_username IS NULL THEN
        RAISE EXCEPTION 'اسم المستخدم مطلوب';
    END IF;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = v_clean_username) THEN
        RAISE EXCEPTION 'اسم المستخدم مسجل بالفعل';
    END IF;

    v_user_id := gen_random_uuid();
    v_email := v_clean_username || '@elkarooz.local';
    v_actual_pass := COALESCE(
        NULLIF(trim(p_password), ''),
        encode(gen_random_bytes(16), 'hex') || 'A1!'
    );

    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id, 'authenticated', 'authenticated', v_email,
        crypt(v_actual_pass, gen_salt('bf')),
        NOW(),
        jsonb_build_object(
            'provider', 'email',
            'providers', ARRAY['email'],
            'role_id', 'trainee',
            'group_id', p_group_id,
            'is_active', true
        ),
        jsonb_build_object('username', v_clean_username, 'full_name', trim(p_full_name)),
        NOW(), NOW(),
        '', '', '', ''
    );

    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_user_id, v_user_id::text,
        jsonb_build_object(
            'sub', v_user_id::text,
            'email', v_email,
            'email_verified', true,
            'phone_verified', false
        ),
        'email', NOW(), NOW(), NOW()
    );

    INSERT INTO public.profiles (
        id, username, full_name, date_of_birth, mobile_number,
        confession_father, church_name, role_id, group_id, notes, is_active
    ) VALUES (
        v_user_id, v_clean_username, trim(p_full_name), p_birth_date, p_phone,
        p_confession_father, p_church, 'trainee', p_group_id, p_address, true
    );

    RETURN jsonb_build_object('status', 'SUCCESS', 'id', v_user_id, 'username', v_clean_username);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_trainee_profile(varchar, varchar, smallint, date, varchar, varchar, varchar, text, varchar) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_trainee_profile(varchar, varchar, smallint, date, varchar, varchar, varchar, text, varchar) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. DB-13: Partial Unique Index on public.exams for Soft-Delete Compatibility
-- -----------------------------------------------------------------------------
ALTER TABLE public.exams DROP CONSTRAINT IF EXISTS uq_exam_per_term;
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_active_exam_per_term
    ON public.exams (term_id, group_id)
    WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 7. DB-14: Covering Indexes for Foreign Keys
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_attendance_records_trainee_id ON public.attendance_records(trainee_id);
CREATE INDEX IF NOT EXISTS idx_exam_grades_trainee_id ON public.exam_grades(trainee_id);
CREATE INDEX IF NOT EXISTS idx_marathon_submissions_trainee_id ON public.marathon_trainee_submissions(trainee_id);
CREATE INDEX IF NOT EXISTS idx_marathon_submissions_group_id ON public.marathon_trainee_submissions(group_id);
CREATE INDEX IF NOT EXISTS idx_marathon_trainee_answers_question_id ON public.marathon_trainee_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_marathon_trainee_answers_selected_answer_id ON public.marathon_trainee_answers(selected_answer_id);
CREATE INDEX IF NOT EXISTS idx_marathon_questions_marathon_id ON public.marathon_questions(marathon_id);
CREATE INDEX IF NOT EXISTS idx_marathon_questions_section_id ON public.marathon_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_marathon_sections_marathon_id ON public.marathon_sections(marathon_id);
CREATE INDEX IF NOT EXISTS idx_marathon_answers_question_id ON public.marathon_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_lectures_term_id ON public.lectures(term_id);
CREATE INDEX IF NOT EXISTS idx_lectures_group_id ON public.lectures(group_id);
CREATE INDEX IF NOT EXISTS idx_lectures_lecturer_id ON public.lectures(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_curriculums_term_id ON public.curriculums(term_id);
CREATE INDEX IF NOT EXISTS idx_curriculums_group_id ON public.curriculums(group_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_days_group_id ON public.curriculum_days(group_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_entries_lecture_id ON public.curriculum_entries(lecture_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_entries_lecturer_id ON public.curriculum_entries(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_exams_term_id ON public.exams(term_id);
CREATE INDEX IF NOT EXISTS idx_exams_group_id ON public.exams(group_id);
CREATE INDEX IF NOT EXISTS idx_marathons_term_id ON public.marathons(term_id);
CREATE INDEX IF NOT EXISTS idx_marathons_group_id ON public.marathons(group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_group_id ON public.profiles(group_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_author_id ON public.feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON public.post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON public.post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);

-- -----------------------------------------------------------------------------
-- 8. Security Advisors (0011 & 0028): Pin search_path & Revoke anon Execution
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.compute_exam_appreciation() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_post_counts() SET search_path = public, pg_temp;
ALTER FUNCTION public.touch_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_attendance_session_open() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_feed_content() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_comment_content() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_secretariat_group_limit() SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.check_attendance_thursday_lock() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enforce_curriculum_group_consistency() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.guard_feed_authorship() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enforce_attendance_record_group_consistency() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enforce_exam_grade_group_consistency() FROM PUBLIC, anon;

COMMIT;
