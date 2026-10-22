-- Additive, server-only workflow for the administrator-requested operational reset.
-- This migration creates bookkeeping/RPCs only; it does not execute a reset.
BEGIN;

CREATE TABLE IF NOT EXISTS public.system_reset_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    backup_id uuid NOT NULL REFERENCES public.backup_records(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'PREPARED' CHECK (
        status IN ('PREPARED', 'MEDIA_CLEANUP', 'DATA_CLEARED', 'PARTIAL', 'COMPLETE')
    ),
    preview_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    data_cleared_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_system_reset_one_open_run
    ON public.system_reset_runs ((true))
    WHERE status IN ('PREPARED', 'MEDIA_CLEANUP', 'DATA_CLEARED', 'PARTIAL');

CREATE TABLE IF NOT EXISTS public.system_reset_run_assets (
    run_id uuid NOT NULL REFERENCES public.system_reset_runs(id) ON DELETE CASCADE,
    asset_id uuid NOT NULL,
    storage_provider varchar(32) NOT NULL,
    drive_file_id varchar(128) NOT NULL,
    drive_folder_id varchar(128) NOT NULL,
    file_name varchar(255) NOT NULL,
    checksum_sha256 varchar(64) NOT NULL,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DELETED', 'FAILED')),
    last_error text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (run_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_system_reset_run_assets_pending
    ON public.system_reset_run_assets (run_id, status, storage_provider);

CREATE TABLE IF NOT EXISTS public.system_reset_run_users (
    run_id uuid NOT NULL REFERENCES public.system_reset_runs(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DELETED', 'FAILED')),
    last_error text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (run_id, user_id)
);

ALTER TABLE public.system_reset_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_reset_run_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_reset_run_users ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.system_reset_runs, public.system_reset_run_assets, public.system_reset_run_users FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_reset_runs, public.system_reset_run_assets, public.system_reset_run_users TO service_role;

CREATE OR REPLACE FUNCTION public.system_reset_writes_allowed()
RETURNS boolean
LANGUAGE sql
-- VOLATILE avoids reusing a command-start snapshot for a write racing reset start.
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM public.system_reset_runs
        WHERE status IN ('PREPARED', 'MEDIA_CLEANUP', 'DATA_CLEARED', 'PARTIAL')
    );
$$;
REVOKE ALL ON FUNCTION public.system_reset_writes_allowed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.system_reset_writes_allowed() TO authenticated, service_role;

-- The PHP gate cannot stop clients that write to Supabase directly. These restrictive
-- policies freeze every operational table for authenticated clients after begin commits,
-- while preserving reads. SECURITY DEFINER reset RPCs and service_role bypass ordinary RLS.
DO $$
DECLARE
    v_table text;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'attendance_records', 'attendance_sessions', 'exam_grades', 'exams',
        'marathon_trainee_answers', 'marathon_trainee_submissions', 'marathon_question_revisions',
        'marathon_answers', 'marathon_questions', 'marathon_sections', 'marathons',
        'post_images', 'post_comments', 'reactions', 'feed_posts',
        'curriculum_revisions', 'curriculum_entries', 'curriculum_days', 'curriculums',
        'lectures', 'terms', 'mp3_tracks', 'lecturers', 'gallery_items', 'gallery_albums',
        'books', 'researches', 'user_favorites', 'notifications', 'push_subscriptions',
        'daily_verse_dispatch_state', 'daily_verses', 'servant_permissions', 'group_secretariat',
        'import_history', 'media_assets'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS system_reset_write_guard_insert ON public.%I', v_table);
        EXECUTE format('DROP POLICY IF EXISTS system_reset_write_guard_update ON public.%I', v_table);
        EXECUTE format('DROP POLICY IF EXISTS system_reset_write_guard_delete ON public.%I', v_table);
        EXECUTE format(
            'CREATE POLICY system_reset_write_guard_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.system_reset_writes_allowed())',
            v_table
        );
        EXECUTE format(
            'CREATE POLICY system_reset_write_guard_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.system_reset_writes_allowed()) WITH CHECK (public.system_reset_writes_allowed())',
            v_table
        );
        EXECUTE format(
            'CREATE POLICY system_reset_write_guard_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.system_reset_writes_allowed())',
            v_table
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.system_reset_assert_admin(p_actor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF p_actor_id IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_actor_id
          AND p.role_id = 'admin'
          AND p.is_active = true
          AND p.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'SYSTEM_RESET_ADMIN_REQUIRED' USING ERRCODE = '42501';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.system_reset_preview(p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_counts jsonb;
    v_media jsonb;
BEGIN
    PERFORM public.system_reset_assert_admin(p_actor_id);

    SELECT COALESCE(jsonb_object_agg(provider, total), '{}'::jsonb)
      INTO v_media
      FROM (
          SELECT storage_provider AS provider, count(*)::bigint AS total
          FROM public.media_assets
          WHERE resource_type <> 'BACKUP_ARCHIVE'
          GROUP BY storage_provider
      ) media_counts;

    SELECT jsonb_build_object(
        'attendance_records', (SELECT count(*) FROM public.attendance_records),
        'attendance_sessions', (SELECT count(*) FROM public.attendance_sessions),
        'exam_grades', (SELECT count(*) FROM public.exam_grades),
        'exams', (SELECT count(*) FROM public.exams),
        'marathon_trainee_answers', (SELECT count(*) FROM public.marathon_trainee_answers),
        'marathon_trainee_submissions', (SELECT count(*) FROM public.marathon_trainee_submissions),
        'marathon_question_revisions', (SELECT count(*) FROM public.marathon_question_revisions),
        'marathon_answers', (SELECT count(*) FROM public.marathon_answers),
        'marathon_questions', (SELECT count(*) FROM public.marathon_questions),
        'marathon_sections', (SELECT count(*) FROM public.marathon_sections),
        'marathons', (SELECT count(*) FROM public.marathons),
        'post_images', (SELECT count(*) FROM public.post_images),
        'post_comments', (SELECT count(*) FROM public.post_comments),
        'reactions', (SELECT count(*) FROM public.reactions),
        'feed_posts', (SELECT count(*) FROM public.feed_posts),
        'curriculum_revisions', (SELECT count(*) FROM public.curriculum_revisions),
        'curriculum_entries', (SELECT count(*) FROM public.curriculum_entries),
        'curriculum_days', (SELECT count(*) FROM public.curriculum_days),
        'curriculums', (SELECT count(*) FROM public.curriculums),
        'lectures', (SELECT count(*) FROM public.lectures),
        'terms', (SELECT count(*) FROM public.terms),
        'lecturers', (SELECT count(*) FROM public.lecturers),
        'books', (SELECT count(*) FROM public.books),
        'researches', (SELECT count(*) FROM public.researches),
        'gallery_items', (SELECT count(*) FROM public.gallery_items),
        'gallery_albums', (SELECT count(*) FROM public.gallery_albums),
        'mp3_tracks', (SELECT count(*) FROM public.mp3_tracks),
        'user_favorites', (SELECT count(*) FROM public.user_favorites),
        'notifications', (SELECT count(*) FROM public.notifications),
        'push_subscriptions', (SELECT count(*) FROM public.push_subscriptions),
        'daily_verse_dispatch_state', (SELECT count(*) FROM public.daily_verse_dispatch_state),
        'daily_verses', (SELECT count(*) FROM public.daily_verses),
        'servant_permissions', (SELECT count(*) FROM public.servant_permissions),
        'group_secretariat', (SELECT count(*) FROM public.group_secretariat),
        'import_history', (SELECT count(*) FROM public.import_history),
        'non_admin_auth_users', (
            SELECT count(*) FROM auth.users u
            WHERE NOT EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = u.id AND p.role_id = 'admin' AND p.deleted_at IS NULL
            )
        ),
        'admin_profiles_retained', (
            SELECT count(*) FROM public.profiles p
            WHERE p.role_id = 'admin' AND p.deleted_at IS NULL
        ),
        'registered_media_by_provider', v_media,
        'backup_records_retained', (SELECT count(*) FROM public.backup_records WHERE deleted_at IS NULL),
        'groups_retained', (SELECT count(*) FROM public.groups),
        'permissions_retained', (SELECT count(*) FROM public.permissions)
    ) INTO v_counts;

    RETURN jsonb_build_object('counts', v_counts, 'preserved', jsonb_build_array(
        'bible_reference_data', 'groups', 'roles', 'permissions', 'categories',
        'notification_templates', 'audit_logs', 'backup_records', 'BACKUP_ARCHIVE media'
    ));
END;
$$;

CREATE OR REPLACE FUNCTION public.system_reset_begin(p_actor_id uuid, p_backup_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_run_id uuid;
    v_counts jsonb;
BEGIN
    PERFORM public.system_reset_assert_admin(p_actor_id);

    SELECT id INTO v_run_id
    FROM public.system_reset_runs
    WHERE actor_id = p_actor_id AND backup_id = p_backup_id
      AND status IN ('PREPARED', 'MEDIA_CLEANUP', 'DATA_CLEARED', 'PARTIAL')
    ORDER BY created_at DESC
    LIMIT 1;
    IF v_run_id IS NOT NULL THEN
        RETURN v_run_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.system_reset_runs
        WHERE status IN ('PREPARED', 'MEDIA_CLEANUP', 'DATA_CLEARED', 'PARTIAL')
    ) THEN
        RAISE EXCEPTION 'SYSTEM_RESET_OPEN_RUN_EXISTS' USING ERRCODE = '55000';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.backup_records b
        WHERE b.id = p_backup_id
          AND b.created_by = p_actor_id
          AND b.status = 'COMPLETED'
          AND b.storage_type = 'HOSTINGER'
          AND b.deleted_at IS NULL
          AND b.created_at >= now() - interval '15 minutes'
          AND b.storage_path IS NOT NULL
          AND b.checksum_sha256 ~ '^[a-f0-9]{64}$'
    ) THEN
        RAISE EXCEPTION 'SYSTEM_RESET_BACKUP_NOT_VERIFIED' USING ERRCODE = '22023';
    END IF;

    SELECT public.system_reset_preview(p_actor_id)->'counts' INTO v_counts;
    INSERT INTO public.system_reset_runs (actor_id, backup_id, preview_counts)
    VALUES (p_actor_id, p_backup_id, v_counts)
    RETURNING id INTO v_run_id;

    INSERT INTO public.system_reset_run_assets (
        run_id, asset_id, storage_provider, drive_file_id, drive_folder_id,
        file_name, checksum_sha256
    )
    SELECT v_run_id, a.id, a.storage_provider, a.drive_file_id, a.drive_folder_id,
           a.file_name, a.checksum_sha256
    FROM public.media_assets a
    WHERE a.resource_type <> 'BACKUP_ARCHIVE';

    INSERT INTO public.system_reset_run_users (run_id, user_id)
    SELECT v_run_id, u.id
    FROM auth.users u
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = u.id AND p.role_id = 'admin' AND p.deleted_at IS NULL
    );

    UPDATE public.system_reset_runs
       SET status = 'MEDIA_CLEANUP', updated_at = now()
     WHERE id = v_run_id;

    RETURN v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.system_reset_mark_asset_results(
    p_actor_id uuid,
    p_run_id uuid,
    p_results jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_updated integer := 0;
    v_pending integer := 0;
    v_failed integer := 0;
BEGIN
    PERFORM public.system_reset_assert_admin(p_actor_id);

    IF NOT EXISTS (
        SELECT 1 FROM public.system_reset_runs
        WHERE id = p_run_id AND actor_id = p_actor_id AND status IN ('MEDIA_CLEANUP', 'PARTIAL')
    ) THEN
        RAISE EXCEPTION 'SYSTEM_RESET_RUN_NOT_FOUND' USING ERRCODE = '42501';
    END IF;

    UPDATE public.system_reset_run_assets a
       SET status = CASE WHEN r.deleted THEN 'DELETED' ELSE 'FAILED' END,
           last_error = CASE WHEN r.deleted THEN NULL ELSE left(coalesce(r.error, 'provider refused deletion'), 300) END,
           updated_at = now()
      FROM jsonb_to_recordset(coalesce(p_results, '[]'::jsonb)) AS r(asset_id uuid, deleted boolean, error text)
     WHERE a.run_id = p_run_id AND a.asset_id = r.asset_id
       AND a.storage_provider = 'GOOGLE_DRIVE';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    SELECT count(*) FILTER (WHERE status = 'PENDING'), count(*) FILTER (WHERE status = 'FAILED')
      INTO v_pending, v_failed
      FROM public.system_reset_run_assets WHERE run_id = p_run_id;

    RETURN jsonb_build_object('updated', v_updated, 'pending', v_pending, 'failed', v_failed);
END;
$$;

CREATE OR REPLACE FUNCTION public.system_reset_mark_local_media_deleted(p_actor_id uuid, p_run_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_updated integer := 0;
BEGIN
    PERFORM public.system_reset_assert_admin(p_actor_id);
    IF NOT EXISTS (
        SELECT 1 FROM public.system_reset_runs
        WHERE id = p_run_id AND actor_id = p_actor_id AND status IN ('MEDIA_CLEANUP', 'PARTIAL')
    ) THEN
        RAISE EXCEPTION 'SYSTEM_RESET_RUN_NOT_FOUND' USING ERRCODE = '42501';
    END IF;

    UPDATE public.system_reset_run_assets
       SET status = 'DELETED', last_error = NULL, updated_at = now()
     WHERE run_id = p_run_id AND storage_provider = 'HOSTINGER_LOCAL'
       AND status <> 'DELETED';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.system_reset_finalize_data(p_actor_id uuid, p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_actor uuid;
    v_counts jsonb := '{}'::jsonb;
    v_rows bigint;
BEGIN
    PERFORM public.system_reset_assert_admin(p_actor_id);

    SELECT actor_id INTO v_actor
    FROM public.system_reset_runs
    WHERE id = p_run_id AND status IN ('MEDIA_CLEANUP', 'PARTIAL');
    IF v_actor IS DISTINCT FROM p_actor_id THEN
        RAISE EXCEPTION 'SYSTEM_RESET_RUN_NOT_FOUND' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.system_reset_run_assets
        WHERE run_id = p_run_id AND status <> 'DELETED'
    ) THEN
        RAISE EXCEPTION 'SYSTEM_RESET_MEDIA_INCOMPLETE' USING ERRCODE = '55000';
    END IF;

    DELETE FROM public.post_images; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('post_images', v_rows);
    DELETE FROM public.post_comments; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('post_comments', v_rows);
    DELETE FROM public.reactions; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('reactions', v_rows);
    DELETE FROM public.feed_posts; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('feed_posts', v_rows);

    DELETE FROM public.attendance_records; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('attendance_records', v_rows);
    DELETE FROM public.attendance_sessions; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('attendance_sessions', v_rows);
    DELETE FROM public.exam_grades; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('exam_grades', v_rows);
    DELETE FROM public.exams; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('exams', v_rows);

    DELETE FROM public.marathon_trainee_answers; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('marathon_trainee_answers', v_rows);
    DELETE FROM public.marathon_trainee_submissions; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('marathon_trainee_submissions', v_rows);
    DELETE FROM public.marathon_question_revisions; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('marathon_question_revisions', v_rows);
    DELETE FROM public.marathon_answers; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('marathon_answers', v_rows);
    DELETE FROM public.marathon_questions; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('marathon_questions', v_rows);
    DELETE FROM public.marathon_sections; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('marathon_sections', v_rows);
    DELETE FROM public.marathons; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('marathons', v_rows);

    DELETE FROM public.curriculum_revisions; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('curriculum_revisions', v_rows);
    DELETE FROM public.curriculum_entries; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('curriculum_entries', v_rows);
    DELETE FROM public.curriculum_days; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('curriculum_days', v_rows);
    DELETE FROM public.curriculums; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('curriculums', v_rows);
    DELETE FROM public.lectures; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lectures', v_rows);
    DELETE FROM public.terms; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('terms', v_rows);
    DELETE FROM public.mp3_tracks; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('mp3_tracks', v_rows);
    DELETE FROM public.lecturers; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lecturers', v_rows);

    DELETE FROM public.gallery_items; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('gallery_items', v_rows);
    DELETE FROM public.gallery_albums; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('gallery_albums', v_rows);
    DELETE FROM public.books; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('books', v_rows);
    DELETE FROM public.researches; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('researches', v_rows);
    DELETE FROM public.user_favorites; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('user_favorites', v_rows);
    DELETE FROM public.notifications; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('notifications', v_rows);
    DELETE FROM public.push_subscriptions; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('push_subscriptions', v_rows);
    DELETE FROM public.daily_verse_dispatch_state; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('daily_verse_dispatch_state', v_rows);
    DELETE FROM public.daily_verses; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('daily_verses', v_rows);
    DELETE FROM public.servant_permissions; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('servant_permissions', v_rows);
    DELETE FROM public.group_secretariat; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('group_secretariat', v_rows);
    DELETE FROM public.import_history; GET DIAGNOSTICS v_rows = ROW_COUNT; v_counts := v_counts || jsonb_build_object('import_history', v_rows);

    -- Preserve the immutable Bible content version manifest, but remove creator PII
    -- for accounts that this reset is about to delete.
    UPDATE public.bible_content_versions
       SET created_by = NULL
     WHERE created_by IN (SELECT user_id FROM public.system_reset_run_users WHERE run_id = p_run_id);
    UPDATE public.notification_templates
       SET updated_by = NULL
     WHERE updated_by IN (SELECT user_id FROM public.system_reset_run_users WHERE run_id = p_run_id);
    UPDATE public.media_assets
       SET uploaded_by = p_actor_id
     WHERE resource_type = 'BACKUP_ARCHIVE'
       AND uploaded_by IN (SELECT user_id FROM public.system_reset_run_users WHERE run_id = p_run_id);

    DELETE FROM public.media_assets WHERE resource_type <> 'BACKUP_ARCHIVE';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('media_assets', v_rows);

    UPDATE public.system_reset_runs
       SET status = 'DATA_CLEARED', data_cleared_at = now(),
           preview_counts = preview_counts || jsonb_build_object('deleted_rows', v_counts),
           last_error = NULL, updated_at = now()
     WHERE id = p_run_id;

    INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action, entity_type, entity_id, new_values)
    VALUES (p_actor_id, 'إدارة', 'admin', 'SYSTEM_RESET_DATA_CLEARED', 'system_reset_runs', p_run_id::text,
            jsonb_build_object('deleted_rows', v_counts, 'backup_id', (SELECT backup_id FROM public.system_reset_runs WHERE id = p_run_id)));

    RETURN jsonb_build_object('run_id', p_run_id, 'deleted_rows', v_counts, 'status', 'DATA_CLEARED');
END;
$$;

CREATE OR REPLACE FUNCTION public.system_reset_mark_user_result(
    p_actor_id uuid,
    p_run_id uuid,
    p_user_id uuid,
    p_deleted boolean,
    p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_pending integer;
    v_failed integer;
BEGIN
    PERFORM public.system_reset_assert_admin(p_actor_id);
    IF NOT EXISTS (
        SELECT 1 FROM public.system_reset_runs
        WHERE id = p_run_id AND actor_id = p_actor_id AND data_cleared_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'SYSTEM_RESET_RUN_NOT_FOUND' USING ERRCODE = '42501';
    END IF;

    UPDATE public.system_reset_run_users
       SET status = CASE WHEN p_deleted THEN 'DELETED' ELSE 'FAILED' END,
           last_error = CASE WHEN p_deleted THEN NULL ELSE left(coalesce(p_error, 'Auth deletion failed'), 300) END,
           updated_at = now()
     WHERE run_id = p_run_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SYSTEM_RESET_USER_NOT_FOUND' USING ERRCODE = '42501';
    END IF;

    SELECT count(*) FILTER (WHERE status = 'PENDING'), count(*) FILTER (WHERE status = 'FAILED')
      INTO v_pending, v_failed
      FROM public.system_reset_run_users WHERE run_id = p_run_id;

    IF v_pending = 0 AND v_failed = 0 THEN
        UPDATE public.system_reset_runs
           SET status = 'COMPLETE', completed_at = now(), updated_at = now(), last_error = NULL
         WHERE id = p_run_id;
        INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action, entity_type, entity_id, new_values)
        VALUES (p_actor_id, 'إدارة', 'admin', 'SYSTEM_RESET_COMPLETE', 'system_reset_runs', p_run_id::text,
                jsonb_build_object('run_id', p_run_id));
    ELSE
        UPDATE public.system_reset_runs
           SET status = CASE WHEN v_failed > 0 THEN 'PARTIAL' ELSE 'DATA_CLEARED' END,
               updated_at = now()
         WHERE id = p_run_id;
    END IF;

    RETURN jsonb_build_object('pending', v_pending, 'failed', v_failed,
        'status', (SELECT status FROM public.system_reset_runs WHERE id = p_run_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.system_reset_complete_if_no_users(p_actor_id uuid, p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_pending integer;
    v_failed integer;
    v_status text;
BEGIN
    PERFORM public.system_reset_assert_admin(p_actor_id);
    IF NOT EXISTS (
        SELECT 1 FROM public.system_reset_runs
        WHERE id = p_run_id AND actor_id = p_actor_id AND data_cleared_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'SYSTEM_RESET_RUN_NOT_FOUND' USING ERRCODE = '42501';
    END IF;

    SELECT count(*) FILTER (WHERE status = 'PENDING'), count(*) FILTER (WHERE status = 'FAILED')
      INTO v_pending, v_failed
      FROM public.system_reset_run_users WHERE run_id = p_run_id;

    IF v_pending = 0 AND v_failed = 0 THEN
        UPDATE public.system_reset_runs
           SET status = 'COMPLETE', completed_at = now(), updated_at = now(), last_error = NULL
         WHERE id = p_run_id AND status <> 'COMPLETE';
        IF FOUND THEN
            INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action, entity_type, entity_id, new_values)
            VALUES (p_actor_id, 'إدارة', 'admin', 'SYSTEM_RESET_COMPLETE', 'system_reset_runs', p_run_id::text,
                    jsonb_build_object('run_id', p_run_id));
        END IF;
    END IF;
    SELECT status INTO v_status FROM public.system_reset_runs WHERE id = p_run_id;
    RETURN jsonb_build_object('pending', v_pending, 'failed', v_failed, 'status', v_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.system_reset_mark_partial(p_actor_id uuid, p_run_id uuid, p_error text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    PERFORM public.system_reset_assert_admin(p_actor_id);
    UPDATE public.system_reset_runs
       SET status = 'PARTIAL', last_error = left(coalesce(p_error, 'Reset step incomplete'), 300), updated_at = now()
     WHERE id = p_run_id AND actor_id = p_actor_id AND status <> 'COMPLETE';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SYSTEM_RESET_RUN_NOT_FOUND' USING ERRCODE = '42501';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.system_reset_assert_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_reset_preview(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_reset_begin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_reset_mark_asset_results(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_reset_mark_local_media_deleted(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_reset_finalize_data(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_reset_mark_user_result(uuid, uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_reset_complete_if_no_users(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_reset_mark_partial(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.system_reset_assert_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_reset_preview(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_reset_begin(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_reset_mark_asset_results(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_reset_mark_local_media_deleted(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_reset_finalize_data(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_reset_mark_user_result(uuid, uuid, uuid, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_reset_complete_if_no_users(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_reset_mark_partial(uuid, uuid, text) TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_reset_runs')
       OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'system_reset_finalize_data') THEN
        RAISE EXCEPTION 'safe system reset schema verification failed';
    END IF;
END;
$$;

COMMIT;
