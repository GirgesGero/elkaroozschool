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

-- One database row is the serialization barrier for every ordinary writer.
-- Writers hold FOR SHARE until their transaction ends; begin holds FOR UPDATE,
-- which drains already-running writers before it publishes the active run.
CREATE TABLE IF NOT EXISTS public.system_reset_gate (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    active_run_id uuid REFERENCES public.system_reset_runs(id) ON DELETE RESTRICT,
    last_completed_at timestamptz,
    auth_cutoff_iat bigint,
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO public.system_reset_gate (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

-- Write permits are private transaction-scoped capabilities: finalization can
-- write the reset targets; an exact staged Auth deletion can authorize only its
-- nested FK-cascade statements until that Auth DELETE statement ends.
CREATE TABLE IF NOT EXISTS public.system_reset_write_permits (
    transaction_id bigint PRIMARY KEY,
    run_id uuid NOT NULL REFERENCES public.system_reset_runs(id) ON DELETE CASCADE,
    scope text NOT NULL DEFAULT 'RESET_FINALIZE' CHECK (scope IN ('RESET_FINALIZE', 'AUTH_CASCADE')),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Supabase Auth writes happen through a separate HTTP service, not through the
-- PHP router or PostgREST table triggers. Permit only the exact staged delete
-- performed by the reset worker; all signup/profile/session writes stay frozen.
CREATE TABLE IF NOT EXISTS public.system_reset_auth_delete_permits (
    run_id uuid NOT NULL REFERENCES public.system_reset_runs(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (run_id, user_id)
);
REVOKE ALL ON public.system_reset_auth_delete_permits FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.system_reset_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_reset_run_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_reset_run_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_reset_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_reset_write_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_reset_auth_delete_permits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.system_reset_runs, public.system_reset_run_assets, public.system_reset_run_users FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_reset_runs, public.system_reset_run_assets, public.system_reset_run_users TO service_role;

CREATE OR REPLACE FUNCTION public.system_reset_writes_allowed()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    v_active_run_id uuid;
    v_last_completed_at timestamptz;
    v_auth_cutoff_iat bigint;
    v_claims jsonb;
    v_iat bigint;
BEGIN
    SELECT active_run_id, last_completed_at, auth_cutoff_iat
      INTO v_active_run_id, v_last_completed_at, v_auth_cutoff_iat
      FROM public.system_reset_gate
     WHERE singleton = true;
    IF NOT FOUND OR v_active_run_id IS NOT NULL THEN
        RETURN false;
    END IF;
    IF v_last_completed_at IS NOT NULL AND transaction_timestamp() <= v_last_completed_at THEN
        RETURN false;
    END IF;

    v_claims := auth.jwt();
    IF v_claims ->> 'role' = 'authenticated' AND v_auth_cutoff_iat IS NOT NULL THEN
        BEGIN
            v_iat := NULLIF(v_claims ->> 'iat', '')::bigint;
        EXCEPTION WHEN invalid_text_representation THEN
            RETURN false;
        END;
        IF v_iat IS NULL OR v_iat < v_auth_cutoff_iat THEN
            RETURN false;
        END IF;
    END IF;
    RETURN true;
END;
$$;

-- Called by statement triggers and the restore wrapper. FOR SHARE is held until
-- transaction end, so reset_begin's FOR UPDATE drains earlier writes and makes
-- later writes wait until they can observe and reject the active reset.
CREATE OR REPLACE FUNCTION public.system_reset_acquire_write_lock()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    v_active_run_id uuid;
    v_last_completed_at timestamptz;
    v_auth_cutoff_iat bigint;
    v_claims jsonb;
    v_iat bigint;
BEGIN
    SELECT active_run_id, last_completed_at, auth_cutoff_iat
      INTO v_active_run_id, v_last_completed_at, v_auth_cutoff_iat
      FROM public.system_reset_gate
     WHERE singleton = true
       FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SYSTEM_RESET_GATE_UNAVAILABLE' USING ERRCODE = '55000';
    END IF;

    IF v_active_run_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.system_reset_write_permits
             WHERE transaction_id = txid_current() AND run_id = v_active_run_id
               AND (scope = 'RESET_FINALIZE' OR (scope = 'AUTH_CASCADE' AND pg_trigger_depth() > 1))
        ) THEN
            RETURN;
        END IF;
        RAISE EXCEPTION 'SYSTEM_RESET_WRITE_FROZEN' USING ERRCODE = '55000';
    END IF;

    -- A transaction/request that began before the gate was released stays stale
    -- even if it reaches this trigger only after reset completion.
    IF v_last_completed_at IS NOT NULL AND transaction_timestamp() <= v_last_completed_at THEN
        RAISE EXCEPTION 'SYSTEM_RESET_STALE_TRANSACTION' USING ERRCODE = '55000';
    END IF;

    v_claims := auth.jwt();
    IF v_claims ->> 'role' = 'authenticated' AND v_auth_cutoff_iat IS NOT NULL THEN
        BEGIN
            v_iat := NULLIF(v_claims ->> 'iat', '')::bigint;
        EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'SYSTEM_RESET_STALE_TOKEN' USING ERRCODE = '42501';
        END;
        IF v_iat IS NULL OR v_iat < v_auth_cutoff_iat THEN
            RAISE EXCEPTION 'SYSTEM_RESET_STALE_TOKEN' USING ERRCODE = '42501';
        END IF;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.system_reset_write_barrier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    PERFORM public.system_reset_acquire_write_lock();
    RETURN NULL;
END;
$$;

-- Auth GoTrue mutations bypass the PHP request lease and do not execute the
-- public-table statement triggers. Fence those rows separately; the only active
-- reset exception is a short-lived permit for a user already staged for deletion.
CREATE OR REPLACE FUNCTION public.system_reset_auth_user_write_barrier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    v_active_run_id uuid;
    v_last_completed_at timestamptz;
    v_auth_cutoff_iat bigint;
    v_claims jsonb;
    v_iat bigint;
BEGIN
    SELECT active_run_id, last_completed_at, auth_cutoff_iat
      INTO v_active_run_id, v_last_completed_at, v_auth_cutoff_iat
      FROM public.system_reset_gate
     WHERE singleton = true
       FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SYSTEM_RESET_GATE_UNAVAILABLE' USING ERRCODE = '55000';
    END IF;

    IF v_active_run_id IS NOT NULL THEN
        IF TG_OP = 'DELETE' THEN
            IF EXISTS (
                SELECT 1 FROM public.system_reset_auth_delete_permits p
                 WHERE p.run_id = v_active_run_id
                   AND p.user_id = OLD.id
                   AND p.expires_at > clock_timestamp()
            ) THEN
                INSERT INTO public.system_reset_write_permits (transaction_id, run_id, scope)
                VALUES (txid_current(), v_active_run_id, 'AUTH_CASCADE')
                ON CONFLICT (transaction_id) DO UPDATE
                   SET run_id = EXCLUDED.run_id, scope = EXCLUDED.scope;
                RETURN OLD;
            END IF;
        END IF;
        RAISE EXCEPTION 'SYSTEM_RESET_AUTH_WRITE_FROZEN' USING ERRCODE = '55000';
    END IF;

    IF v_last_completed_at IS NOT NULL AND transaction_timestamp() <= v_last_completed_at THEN
        RAISE EXCEPTION 'SYSTEM_RESET_STALE_TRANSACTION' USING ERRCODE = '55000';
    END IF;
    v_claims := auth.jwt();
    IF v_claims ->> 'role' = 'authenticated' AND v_auth_cutoff_iat IS NOT NULL THEN
        BEGIN
            v_iat := NULLIF(v_claims ->> 'iat', '')::bigint;
        EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'SYSTEM_RESET_STALE_TOKEN' USING ERRCODE = '42501';
        END;
        IF v_iat IS NULL OR v_iat < v_auth_cutoff_iat THEN
            RAISE EXCEPTION 'SYSTEM_RESET_STALE_TOKEN' USING ERRCODE = '42501';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.system_reset_auth_user_write_barrier() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.system_reset_auth_delete_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    DELETE FROM public.system_reset_write_permits
     WHERE transaction_id = txid_current() AND scope = 'AUTH_CASCADE';
    RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.system_reset_auth_delete_cleanup() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.system_reset_writes_allowed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.system_reset_writes_allowed() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.system_reset_acquire_write_lock() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.system_reset_write_barrier() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.system_reset_gate, public.system_reset_write_permits FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.restore_database(jsonb, boolean) FROM service_role;
REVOKE ALL ON FUNCTION public.restore_table(text, jsonb) FROM service_role;
REVOKE ALL ON FUNCTION public.restore_accounts(jsonb) FROM service_role;

-- Keep the existing all-or-nothing restore semantics, but take the same shared
-- barrier before restore_database changes session_replication_role or writes any
-- table (including Auth/profile rows outside the reset target list).
CREATE OR REPLACE FUNCTION public.system_reset_guarded_restore_database(
    p_tables jsonb,
    p_truncate boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
    PERFORM public.system_reset_acquire_write_lock();
    RETURN public.restore_database(p_tables, p_truncate);
END;
$$;
REVOKE ALL ON FUNCTION public.system_reset_guarded_restore_database(jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_reset_guarded_restore_database(jsonb, boolean) TO service_role;

-- The PHP gate cannot stop clients that write to Supabase directly. Restrictive RLS policies
-- are defense in depth for authenticated DML; ALWAYS statement triggers below are the
-- authoritative barrier for SECURITY DEFINER, service_role, restore and in-flight writers.
DO $$
DECLARE
    v_table text;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'profiles', 'backup_records', 'bible_content_versions', 'notification_templates',
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

        EXECUTE format('DROP TRIGGER IF EXISTS system_reset_write_barrier ON public.%I', v_table);
        EXECUTE format(
            'CREATE TRIGGER system_reset_write_barrier BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.system_reset_write_barrier()',
            v_table
        );
        -- ALWAYS is required because the privileged restore RPC sets
        -- session_replication_role=replica to preserve auth/profile semantics.
        EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER system_reset_write_barrier', v_table);
    END LOOP;
END;
$$;

DO $$
BEGIN
    IF to_regclass('auth.users') IS NULL THEN
        RAISE EXCEPTION 'Supabase Auth schema is unavailable; cannot install reset write barrier';
    END IF;
    EXECUTE 'DROP TRIGGER IF EXISTS system_reset_auth_user_write_barrier ON auth.users';
    EXECUTE 'CREATE TRIGGER system_reset_auth_user_write_barrier BEFORE INSERT OR UPDATE OR DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.system_reset_auth_user_write_barrier()';
    EXECUTE 'ALTER TABLE auth.users ENABLE ALWAYS TRIGGER system_reset_auth_user_write_barrier';
    EXECUTE 'DROP TRIGGER IF EXISTS system_reset_auth_truncate_barrier ON auth.users';
    EXECUTE 'CREATE TRIGGER system_reset_auth_truncate_barrier BEFORE TRUNCATE ON auth.users FOR EACH STATEMENT EXECUTE FUNCTION public.system_reset_write_barrier()';
    EXECUTE 'ALTER TABLE auth.users ENABLE ALWAYS TRIGGER system_reset_auth_truncate_barrier';
    EXECUTE 'DROP TRIGGER IF EXISTS system_reset_auth_delete_cleanup ON auth.users';
    EXECUTE 'CREATE TRIGGER system_reset_auth_delete_cleanup AFTER DELETE ON auth.users FOR EACH STATEMENT EXECUTE FUNCTION public.system_reset_auth_delete_cleanup()';
    EXECUTE 'ALTER TABLE auth.users ENABLE ALWAYS TRIGGER system_reset_auth_delete_cleanup';
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

CREATE OR REPLACE FUNCTION public.system_reset_authorize_auth_delete(
    p_actor_id uuid,
    p_run_id uuid,
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_active_run_id uuid;
BEGIN
    PERFORM public.system_reset_assert_admin(p_actor_id);
    SELECT active_run_id INTO v_active_run_id
      FROM public.system_reset_gate
     WHERE singleton = true
       FOR SHARE;
    IF NOT FOUND OR v_active_run_id IS DISTINCT FROM p_run_id THEN
        RAISE EXCEPTION 'SYSTEM_RESET_AUTH_PERMIT_RUN_MISMATCH' USING ERRCODE = '55000';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.system_reset_runs
         WHERE id = p_run_id AND actor_id = p_actor_id
           AND status IN ('DATA_CLEARED', 'PARTIAL')
           AND data_cleared_at IS NOT NULL
    ) OR NOT EXISTS (
        SELECT 1 FROM public.system_reset_run_users
         WHERE run_id = p_run_id AND user_id = p_user_id
           AND status IN ('PENDING', 'FAILED')
    ) OR EXISTS (
        SELECT 1 FROM public.profiles
         WHERE id = p_user_id AND role_id = 'admin'
           AND is_active = true AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'SYSTEM_RESET_AUTH_USER_NOT_STAGED' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.system_reset_auth_delete_permits (run_id, user_id, expires_at)
    VALUES (p_run_id, p_user_id, clock_timestamp() + interval '2 minutes')
    ON CONFLICT (run_id, user_id) DO UPDATE
       SET expires_at = EXCLUDED.expires_at,
           created_at = clock_timestamp();
END;
$$;
REVOKE ALL ON FUNCTION public.system_reset_authorize_auth_delete(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_reset_authorize_auth_delete(uuid, uuid, uuid) TO service_role;

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
    v_active_run_id uuid;
    v_active_actor_id uuid;
    v_active_backup_id uuid;
    v_counts jsonb;
BEGIN
    PERFORM public.system_reset_assert_admin(p_actor_id);

    -- This UPDATE-conflicting row lock waits for all prior guarded writer
    -- transactions, and makes every later writer wait for the active-run commit.
    SELECT active_run_id INTO v_active_run_id
      FROM public.system_reset_gate
     WHERE singleton = true
       FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SYSTEM_RESET_GATE_UNAVAILABLE' USING ERRCODE = '55000';
    END IF;

    IF v_active_run_id IS NOT NULL THEN
        SELECT actor_id, backup_id INTO v_active_actor_id, v_active_backup_id
          FROM public.system_reset_runs
         WHERE id = v_active_run_id
           AND status IN ('PREPARED', 'MEDIA_CLEANUP', 'DATA_CLEARED', 'PARTIAL');
        IF FOUND AND v_active_actor_id = p_actor_id AND v_active_backup_id = p_backup_id THEN
            RETURN v_active_run_id;
        END IF;
        RAISE EXCEPTION 'SYSTEM_RESET_OPEN_RUN_EXISTS' USING ERRCODE = '55000';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.system_reset_runs
        WHERE status IN ('PREPARED', 'MEDIA_CLEANUP', 'DATA_CLEARED', 'PARTIAL')
    ) THEN
        RAISE EXCEPTION 'SYSTEM_RESET_GATE_STATE_INCONSISTENT' USING ERRCODE = '55000';
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
    UPDATE public.system_reset_gate
       SET active_run_id = v_run_id, updated_at = clock_timestamp()
     WHERE singleton = true;

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

    INSERT INTO public.system_reset_write_permits (transaction_id, run_id)
    VALUES (txid_current(), p_run_id);

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

    DELETE FROM public.system_reset_write_permits
     WHERE transaction_id = txid_current() AND run_id = p_run_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SYSTEM_RESET_WRITE_PERMIT_MISSING' USING ERRCODE = '55000';
    END IF;

    RETURN jsonb_build_object('run_id', p_run_id, 'deleted_rows', v_counts, 'status', 'DATA_CLEARED');
END;
$$;

CREATE OR REPLACE FUNCTION public.system_reset_release_gate(p_run_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_completed_at timestamptz := clock_timestamp();
    v_active_run_id uuid;
BEGIN
    DELETE FROM public.system_reset_auth_delete_permits WHERE run_id = p_run_id;
    UPDATE public.system_reset_gate
       SET active_run_id = NULL,
           last_completed_at = v_completed_at,
           auth_cutoff_iat = floor(extract(epoch FROM v_completed_at))::bigint + 1,
           updated_at = v_completed_at
     WHERE singleton = true AND active_run_id = p_run_id;
    IF FOUND THEN
        RETURN;
    END IF;

    -- Idempotent retry after a lost COMPLETE response is safe only if the gate
    -- is already open; a different active run must remain fail-closed.
    SELECT active_run_id INTO v_active_run_id
      FROM public.system_reset_gate
     WHERE singleton = true
       FOR UPDATE;
    IF NOT FOUND OR v_active_run_id IS NOT NULL THEN
        RAISE EXCEPTION 'SYSTEM_RESET_GATE_STATE_INCONSISTENT' USING ERRCODE = '55000';
    END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.system_reset_release_gate(uuid) FROM PUBLIC, anon, authenticated, service_role;

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
    DELETE FROM public.system_reset_auth_delete_permits
     WHERE run_id = p_run_id AND user_id = p_user_id;

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
        PERFORM public.system_reset_release_gate(p_run_id);
    ELSE
        UPDATE public.system_reset_runs
           SET status = CASE WHEN v_failed > 0 THEN 'PARTIAL' ELSE 'DATA_CLEARED' END,
               updated_at = now()
         WHERE id = p_run_id;
    END IF;

    RETURN jsonb_build_object('pending', v_pending, 'failed', v_failed,
        'status', (SELECT status FROM public.system_reset_runs WHERE id = p_run_id),
        'auth_cutoff_iat', (SELECT auth_cutoff_iat FROM public.system_reset_gate WHERE singleton = true));
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
        PERFORM public.system_reset_release_gate(p_run_id);
    END IF;
    SELECT status INTO v_status FROM public.system_reset_runs WHERE id = p_run_id;
    RETURN jsonb_build_object('pending', v_pending, 'failed', v_failed, 'status', v_status,
        'auth_cutoff_iat', (SELECT auth_cutoff_iat FROM public.system_reset_gate WHERE singleton = true));
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
