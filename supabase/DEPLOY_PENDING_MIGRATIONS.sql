-- ====================================================================
-- EL KAROOZ SCHOOL — COMPLETE CONSOLIDATED MIGRATIONS DEPLOYMENT SCRIPT
-- Generated: 2026-10-25
-- Apply via Supabase Dashboard SQL Editor (Project kgqgnqjkrghvktymbimz)
-- Order: 1. Safe Reset Barrier -> 2. System Admin/Secretariat -> 3. Thursday Lock
-- ====================================================================

-- >>> START OF 20261021170000_safe_system_reset.sql <<<
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

-- >>> END OF 20261021170000_safe_system_reset.sql <<<

-- >>> START OF 20261023180000_system_admin_and_general_secretariat.sql <<<
BEGIN;

-- One administrator owns system-wide authority. The legacy super_user becomes
-- an ordinary, group-scoped supervisor; existing servant permissions remain.
INSERT INTO public.roles (id, name_ar, description)
VALUES ('supervisor', 'مشرف', 'مشرف محدود بنطاق فرقته وبالصلاحيات التشغيلية الممنوحة له فقط')
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description;

UPDATE public.profiles
SET role_id = 'supervisor', updated_at = now()
WHERE role_id = 'super_user';

UPDATE public.roles
SET name_ar = 'دور قديم غير مستخدم',
    description = 'دور متوافق مؤقتًا مع الأرشيف القديم؛ لا يمنح صلاحيات إدارية.'
WHERE id = 'super_user';

DROP INDEX IF EXISTS public.uq_single_super_user;
-- The original migration created uq_single_admin on (role_id) WHERE role_id='admin'
-- AND deleted_at IS NULL. IF NOT EXISTS would silently retain that definition and
-- inactive undeleted admins could still block an atomic promotion. Replace it.
DROP INDEX IF EXISTS public.uq_single_admin;
CREATE UNIQUE INDEX uq_single_admin
  ON public.profiles(role_id)
  WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL;

-- A role swap can only happen inside transfer_system_admin(). A caller-set GUC
-- is intentionally not used as an authorization signal.
CREATE TABLE IF NOT EXISTS public.system_admin_role_change_permits (
  transaction_id bigint NOT NULL,
  actor_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  old_role_id text NOT NULL,
  new_role_id text NOT NULL,
  PRIMARY KEY (transaction_id, profile_id)
);
ALTER TABLE public.system_admin_role_change_permits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.system_admin_role_change_permits FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_system_role_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role_id = 'admin' THEN
      RAISE EXCEPTION 'Transfer system administrator before deleting the current administrator'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role_id IN ('admin','supervisor','super_user') THEN
    RAISE EXCEPTION 'Sensitive roles may only be assigned by the approved system workflow'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.system_admin_role_change_permits p
      WHERE p.transaction_id = txid_current() AND p.profile_id = OLD.id
        AND (p.actor_id = auth.uid() OR (auth.uid() IS NULL AND session_user = 'postgres'))
        AND p.old_role_id = OLD.role_id
        AND p.new_role_id = NEW.role_id
    ) THEN
      RAISE EXCEPTION 'Sensitive role changes require the system-admin transfer workflow'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role_id = 'admin'
     AND (NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at)
     AND NOT EXISTS (
       SELECT 1 FROM public.system_admin_role_change_permits p
       WHERE p.transaction_id = txid_current() AND p.profile_id = OLD.id AND p.actor_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'Transfer system administrator before suspending the current administrator'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_system_role_changes ON public.profiles;
CREATE TRIGGER trg_guard_system_role_changes
BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_system_role_changes();
REVOKE ALL ON FUNCTION public.guard_system_role_changes() FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.general_secretariat_members (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  appointed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.general_secretariat_permissions (
  profile_id uuid NOT NULL REFERENCES public.general_secretariat_members(profile_id) ON DELETE CASCADE,
  permission_id varchar(64) NOT NULL REFERENCES public.permissions(id) ON DELETE RESTRICT,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, permission_id)
);

ALTER TABLE public.general_secretariat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_secretariat_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own or manage general secretariat members" ON public.general_secretariat_members;
CREATE POLICY "Read own or manage general secretariat members"
ON public.general_secretariat_members FOR SELECT TO authenticated
USING (profile_id = auth.uid() OR public.is_admin_or_super_user());

DROP POLICY IF EXISTS "Read own or manage general secretariat permissions" ON public.general_secretariat_permissions;
CREATE POLICY "Read own or manage general secretariat permissions"
ON public.general_secretariat_permissions FOR SELECT TO authenticated
USING (profile_id = auth.uid() OR public.is_admin_or_super_user());

-- Compatibility name retained because existing policies/RPCs call it. Its
-- meaning is deliberately narrowed: only the active singleton admin is global.
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role_id = 'admin'
      AND p.is_active = true AND p.deleted_at IS NULL
  );
$$;
REVOKE ALL ON FUNCTION public.is_system_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT public.is_system_admin(); $$;
REVOKE ALL ON FUNCTION public.is_admin_or_super_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_user() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.system_admin_assert_current()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only the current system administrator may perform this action'
      USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.system_admin_assert_current() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transfer_permitted boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    SELECT EXISTS (
      SELECT 1 FROM public.system_admin_role_change_permits p
      WHERE p.transaction_id = txid_current()
        AND (p.actor_id = auth.uid() OR (auth.uid() IS NULL AND session_user = 'postgres'))
        AND p.profile_id = OLD.id AND p.old_role_id = OLD.role_id
        AND p.new_role_id = NEW.role_id
    ) INTO v_transfer_permitted;
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_system_admin() AND NOT v_transfer_permitted
     AND (
       NEW.role_id IS DISTINCT FROM OLD.role_id
       OR NEW.group_id IS DISTINCT FROM OLD.group_id
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     ) THEN
    RAISE EXCEPTION 'Sensitive profile fields may only be changed by the system administrator'
      USING ERRCODE = '42501';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_general_secretariat_permission(p_permission_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_permission_id IN ('MANAGE_LECTURES','MANAGE_CURRICULUM','MANAGE_MARATHON','GRADE_EXAMS','MANAGE_BOOKS')
    AND EXISTS (
      SELECT 1
      FROM public.general_secretariat_members gm
      JOIN public.general_secretariat_permissions gp ON gp.profile_id = gm.profile_id
      JOIN public.profiles p ON p.id = gm.profile_id
      WHERE gm.profile_id = auth.uid() AND gm.is_active = true
        AND gp.permission_id = p_permission_id
        AND p.is_active = true AND p.deleted_at IS NULL
    );
$$;
REVOKE ALL ON FUNCTION public.has_general_secretariat_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_general_secretariat_permission(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_servant_permission(perm_id varchar)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_system_admin()
    OR public.has_general_secretariat_permission(perm_id)
    OR EXISTS (
      SELECT 1 FROM public.servant_permissions sp
      JOIN public.profiles p ON p.id = sp.profile_id
      WHERE sp.profile_id = auth.uid() AND sp.permission_id = perm_id
        AND p.is_active = true AND p.deleted_at IS NULL
    );
$$;
REVOKE ALL ON FUNCTION public.has_servant_permission(varchar) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_servant_permission(varchar) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_manage_group_permission(p_permission_id text, p_group_id smallint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_system_admin()
    OR public.has_general_secretariat_permission(p_permission_id)
    OR (
      public.get_current_user_group() = p_group_id
      AND public.has_servant_permission(p_permission_id)
    );
$$;
REVOKE ALL ON FUNCTION public.can_manage_group_permission(text, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_group_permission(text, smallint) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_manage_curriculum(p_group_id smallint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_system_admin()
    OR public.has_general_secretariat_permission('MANAGE_CURRICULUM')
    OR public.has_general_secretariat_permission('MANAGE_LECTURES')
    OR (
      public.get_current_user_group() = p_group_id
      AND (
        public.has_servant_permission('MANAGE_CURRICULUM')
        OR public.has_servant_permission('MANAGE_LECTURES')
        OR public.is_secretariat_of_group(p_group_id)
      )
    );
$$;
REVOKE ALL ON FUNCTION public.can_manage_curriculum(smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_curriculum(smallint) TO authenticated, service_role;

-- Carry delegate permissions across all curriculum child tables; permissive RLS
-- policies are OR-combined, so replace the old group-only names explicitly.
DROP POLICY IF EXISTS "Read curriculum days in own group" ON public.curriculum_days;
CREATE POLICY "Read curriculum days in authorized scope" ON public.curriculum_days
FOR SELECT TO authenticated
USING (
  (group_id = public.get_current_user_group() OR public.can_manage_curriculum(group_id))
  AND (status = 'PUBLISHED' OR public.can_manage_curriculum(group_id))
  AND deleted_at IS NULL
);
DROP POLICY IF EXISTS "Manage curriculum days in own group" ON public.curriculum_days;
CREATE POLICY "Manage curriculum days in authorized scope" ON public.curriculum_days
FOR ALL TO authenticated USING (public.can_manage_curriculum(group_id))
WITH CHECK (public.can_manage_curriculum(group_id));

DROP POLICY IF EXISTS "Read curriculum entries in own group" ON public.curriculum_entries;
CREATE POLICY "Read curriculum entries in authorized scope" ON public.curriculum_entries
FOR SELECT TO authenticated
USING (
  (group_id = public.get_current_user_group() OR public.can_manage_curriculum(group_id))
  AND (status = 'PUBLISHED' OR public.can_manage_curriculum(group_id))
  AND deleted_at IS NULL
);
DROP POLICY IF EXISTS "Manage curriculum entries in own group" ON public.curriculum_entries;
CREATE POLICY "Manage curriculum entries in authorized scope" ON public.curriculum_entries
FOR ALL TO authenticated USING (public.can_manage_curriculum(group_id))
WITH CHECK (public.can_manage_curriculum(group_id));

DROP POLICY IF EXISTS "Read curriculum revisions in own group" ON public.curriculum_revisions;
CREATE POLICY "Read curriculum revisions in authorized scope" ON public.curriculum_revisions
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.curriculum_entries e
  WHERE e.id = entry_id AND public.can_manage_curriculum(e.group_id)));

CREATE OR REPLACE FUNCTION public.can_manage_marathon(p_group_id smallint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_system_admin()
    OR public.has_general_secretariat_permission('MANAGE_MARATHON')
    OR (
      public.get_current_user_group() = p_group_id
      AND (
        public.has_servant_permission('MANAGE_MARATHON')
        OR public.is_secretariat_of_group(p_group_id)
      )
    );
$$;
REVOKE ALL ON FUNCTION public.can_manage_marathon(smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_marathon(smallint) TO authenticated, service_role;

-- Profile reads stay scoped for supervisors; the system admin alone is global.
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read profiles" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR group_id = public.get_current_user_group() OR public.is_system_admin());

-- Give operational delegates only the rows covered by their selected permission.
DROP POLICY IF EXISTS "Read terms in same group or admin" ON public.terms;
CREATE POLICY "Read terms in same group or authorized delegate" ON public.terms
FOR SELECT TO authenticated
USING (group_id = public.get_current_user_group() OR public.can_manage_group_permission('MANAGE_CURRICULUM', group_id) OR public.can_manage_group_permission('MANAGE_LECTURES', group_id));
DROP POLICY IF EXISTS "Manage terms with permission" ON public.terms;
CREATE POLICY "Manage terms with permission" ON public.terms
FOR ALL TO authenticated
USING (public.can_manage_group_permission('MANAGE_CURRICULUM', group_id))
WITH CHECK (public.can_manage_group_permission('MANAGE_CURRICULUM', group_id));

DROP POLICY IF EXISTS "Read lectures in same group or admin" ON public.lectures;
CREATE POLICY "Read lectures in same group or authorized delegate" ON public.lectures
FOR SELECT TO authenticated
USING ((group_id = public.get_current_user_group() OR public.can_manage_group_permission('MANAGE_LECTURES', group_id)) AND (deleted_at IS NULL OR public.is_system_admin()));
DROP POLICY IF EXISTS "Manage lectures with permission" ON public.lectures;
CREATE POLICY "Manage lectures with permission" ON public.lectures
FOR ALL TO authenticated
USING (public.can_manage_group_permission('MANAGE_LECTURES', group_id))
WITH CHECK (public.can_manage_group_permission('MANAGE_LECTURES', group_id));

DROP POLICY IF EXISTS "Read curriculums in same group or admin" ON public.curriculums;
CREATE POLICY "Read curriculums in same group or authorized delegate" ON public.curriculums
FOR SELECT TO authenticated
USING ((group_id = public.get_current_user_group() OR public.can_manage_group_permission('MANAGE_CURRICULUM', group_id)) AND (deleted_at IS NULL OR public.is_system_admin()));
DROP POLICY IF EXISTS "Manage curriculums with permission" ON public.curriculums;
CREATE POLICY "Manage curriculums with permission" ON public.curriculums
FOR ALL TO authenticated
USING (public.can_manage_group_permission('MANAGE_CURRICULUM', group_id))
WITH CHECK (public.can_manage_group_permission('MANAGE_CURRICULUM', group_id));

CREATE POLICY "Supervisor read attendance records in own group" ON public.attendance_records
FOR SELECT TO authenticated
USING (group_id = public.get_current_user_group() AND public.get_current_user_role() = 'supervisor');

DROP POLICY IF EXISTS "Read exams in same group" ON public.exams;
CREATE POLICY "Read exams in authorized scope" ON public.exams
FOR SELECT TO authenticated
USING (group_id = public.get_current_user_group()
  OR public.can_manage_group_permission('GRADE_EXAMS', group_id));
DROP POLICY IF EXISTS "Admin manage exams" ON public.exams;
CREATE POLICY "System admin manage exams" ON public.exams
FOR ALL TO authenticated
USING (public.is_system_admin()) WITH CHECK (public.is_system_admin());
DROP POLICY IF EXISTS "Read exam grades" ON public.exam_grades;
CREATE POLICY "Read exam grades" ON public.exam_grades
FOR SELECT TO authenticated
USING (trainee_id = auth.uid()
  OR (group_id = public.get_current_user_group() AND public.get_current_user_role() IN ('servant','secretariat','supervisor','admin'))
  OR public.can_manage_group_permission('GRADE_EXAMS', group_id));
DROP POLICY IF EXISTS "Servant with GRADE_EXAMS manage grades" ON public.exam_grades;
CREATE POLICY "Authorized staff manage exam grades" ON public.exam_grades
FOR ALL TO authenticated
USING (public.can_manage_group_permission('GRADE_EXAMS', group_id))
WITH CHECK (public.can_manage_group_permission('GRADE_EXAMS', group_id));

DROP POLICY IF EXISTS "Read marathons in same group" ON public.marathons;
CREATE POLICY "Read marathons in authorized scope" ON public.marathons
FOR SELECT TO authenticated
USING (group_id = public.get_current_user_group() OR public.can_manage_marathon(group_id));
DROP POLICY IF EXISTS "Manage marathons with permission" ON public.marathons;
CREATE POLICY "Manage marathons with permission" ON public.marathons
FOR ALL TO authenticated
USING (public.can_manage_marathon(group_id))
WITH CHECK (public.can_manage_marathon(group_id));

DROP POLICY IF EXISTS "Read published marathon questions in own group" ON public.marathon_questions;
CREATE POLICY "Read published marathon questions in own group" ON public.marathon_questions
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.marathons m WHERE m.id = marathon_questions.marathon_id
    AND (m.group_id = public.get_current_user_group() OR public.can_manage_marathon(m.group_id))
    AND m.deleted_at IS NULL)
  AND (status = 'PUBLISHED' OR public.can_manage_marathon(
    (SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_questions.marathon_id)))
);
DROP POLICY IF EXISTS "Manage marathon questions in own group" ON public.marathon_questions;
DROP POLICY IF EXISTS "Manage marathon questions" ON public.marathon_questions;
CREATE POLICY "Manage marathon questions in authorized scope" ON public.marathon_questions
FOR ALL TO authenticated
USING (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_questions.marathon_id)))
WITH CHECK (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_questions.marathon_id)));

DROP POLICY IF EXISTS "Read published marathon sections in own group" ON public.marathon_sections;
CREATE POLICY "Read published marathon sections in own group" ON public.marathon_sections
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.marathons m WHERE m.id = marathon_sections.marathon_id
    AND (m.group_id = public.get_current_user_group() OR public.can_manage_marathon(m.group_id)) AND m.deleted_at IS NULL)
  AND (status = 'PUBLISHED' OR public.can_manage_marathon(
    (SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_sections.marathon_id)))
);
DROP POLICY IF EXISTS "Manage marathon sections in own group" ON public.marathon_sections;
DROP POLICY IF EXISTS "Manage marathon sections" ON public.marathon_sections;
CREATE POLICY "Manage marathon sections in authorized scope" ON public.marathon_sections
FOR ALL TO authenticated
USING (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_sections.marathon_id)))
WITH CHECK (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_sections.marathon_id)));

DROP POLICY IF EXISTS "Staff read marathon answers in own group" ON public.marathon_answers;
DROP POLICY IF EXISTS "Manage marathon answers in own group" ON public.marathon_answers;
DROP POLICY IF EXISTS "Manage marathon answers" ON public.marathon_answers;
CREATE POLICY "Authorized staff read marathon answers" ON public.marathon_answers
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.marathon_questions q JOIN public.marathons m ON m.id = q.marathon_id
  WHERE q.id = marathon_answers.question_id AND public.can_manage_marathon(m.group_id)));
CREATE POLICY "Authorized staff manage marathon answers" ON public.marathon_answers
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.marathon_questions q JOIN public.marathons m ON m.id = q.marathon_id
  WHERE q.id = marathon_answers.question_id AND public.can_manage_marathon(m.group_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.marathon_questions q JOIN public.marathons m ON m.id = q.marathon_id
  WHERE q.id = marathon_answers.question_id AND public.can_manage_marathon(m.group_id)));

DROP POLICY IF EXISTS "Manage books with permission" ON public.books;
CREATE POLICY "Manage books with permission" ON public.books
FOR ALL TO authenticated
USING (public.can_manage_group_permission('MANAGE_BOOKS', group_id))
WITH CHECK (public.can_manage_group_permission('MANAGE_BOOKS', group_id));
DROP POLICY IF EXISTS "Manage researches with permission" ON public.researches;
CREATE POLICY "Manage researches with permission" ON public.researches
FOR ALL TO authenticated
USING (public.can_manage_group_permission('MANAGE_BOOKS', group_id))
WITH CHECK (public.can_manage_group_permission('MANAGE_BOOKS', group_id));

CREATE OR REPLACE FUNCTION public.transfer_system_admin(p_target_profile_id uuid, p_confirmation text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target_role text;
  v_auth_time numeric;
  v_target_name text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('elkarooz-system-admin-transfer', 0));
  PERFORM public.system_admin_assert_current();

  v_auth_time := NULLIF(auth.jwt()->>'auth_time', '')::numeric;
  IF v_auth_time IS NULL OR to_timestamp(v_auth_time) < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'Recent reauthentication is required' USING ERRCODE = '42501';
  END IF;
  IF p_confirmation IS DISTINCT FROM 'نقل مسؤول النظام' THEN
    RAISE EXCEPTION 'Confirmation phrase does not match' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.profiles
  WHERE id = v_actor AND role_id = 'admin' AND is_active AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current system administrator not found' USING ERRCODE = '42501'; END IF;

  SELECT role_id, full_name INTO v_target_role, v_target_name
  FROM public.profiles
  WHERE id = p_target_profile_id AND is_active = true AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR p_target_profile_id = v_actor
     OR v_target_role NOT IN ('supervisor','servant','secretariat') THEN
    RAISE EXCEPTION 'Target must be an active eligible staff member' USING ERRCODE = '22023';
  END IF;

  -- Private transaction-scoped permits authorize only this exact two-row swap.
  INSERT INTO public.system_admin_role_change_permits(transaction_id, actor_id, profile_id, old_role_id, new_role_id)
  VALUES
    (txid_current(), v_actor, v_actor, 'admin', 'supervisor'),
    (txid_current(), v_actor, p_target_profile_id, v_target_role, 'admin');

  -- Demote before promotion inside this transaction; the partial unique index
  -- is never violated, and any error rolls both changes back.
  UPDATE public.profiles SET role_id = 'supervisor', updated_at = now() WHERE id = v_actor;
  UPDATE public.profiles SET role_id = 'admin', updated_at = now() WHERE id = p_target_profile_id;
  DELETE FROM public.system_admin_role_change_permits WHERE transaction_id = txid_current();

  INSERT INTO public.audit_logs(actor_id, actor_name, actor_role, action, entity_type, entity_id, old_values, new_values)
  VALUES (v_actor, (SELECT full_name FROM public.profiles WHERE id = v_actor), 'admin',
    'SYSTEM_ADMIN_TRANSFER', 'profiles', p_target_profile_id::text,
    jsonb_build_object('previous_admin_id', v_actor, 'new_admin_role', v_target_role),
    jsonb_build_object('new_admin_id', p_target_profile_id, 'new_admin_name', v_target_name));

  RETURN jsonb_build_object('previous_admin_id', v_actor, 'new_admin_id', p_target_profile_id, 'new_admin_name', v_target_name);
END;
$$;
REVOKE ALL ON FUNCTION public.transfer_system_admin(uuid, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_system_admin(uuid, text) TO authenticated;

-- Break-glass is intentionally unavailable to PostgREST roles. Run only from a
-- verified provider-owner SQL session after two-person identity/approval checks.
CREATE OR REPLACE FUNCTION public.system_admin_break_glass_recovery(
  p_target_profile_id uuid,
  p_confirmation text,
  p_operator_reference text,
  p_approval_reference text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_admin_id uuid;
  v_target_role text;
  v_target_name text;
BEGIN
  IF session_user <> 'postgres' THEN
    RAISE EXCEPTION 'Break-glass recovery is restricted to the database owner session'
      USING ERRCODE = '42501';
  END IF;
  IF p_confirmation IS DISTINCT FROM 'RECOVER SYSTEM ADMIN' OR
     length(trim(COALESCE(p_operator_reference, ''))) < 8 OR
     length(trim(COALESCE(p_approval_reference, ''))) < 8 THEN
    RAISE EXCEPTION 'Recovery confirmation and documented references are required'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('elkarooz-system-admin-transfer', 0));
  SELECT id INTO v_current_admin_id FROM public.profiles
  WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL FOR UPDATE;
  IF v_current_admin_id IS NULL OR
     (SELECT count(*) FROM public.profiles WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Recovery requires exactly one existing system administrator; use the documented provider incident process if absent'
      USING ERRCODE = '42501';
  END IF;
  SELECT role_id, full_name INTO v_target_role, v_target_name FROM public.profiles
  WHERE id = p_target_profile_id AND is_active = true AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR p_target_profile_id = v_current_admin_id OR
     v_target_role NOT IN ('supervisor','servant','secretariat') THEN
    RAISE EXCEPTION 'Recovery target must be a different active eligible staff member'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.system_admin_role_change_permits(transaction_id, actor_id, profile_id, old_role_id, new_role_id)
  VALUES
    (txid_current(), v_current_admin_id, v_current_admin_id, 'admin', 'supervisor'),
    (txid_current(), v_current_admin_id, p_target_profile_id, v_target_role, 'admin');
  UPDATE public.profiles SET role_id = 'supervisor', updated_at = now() WHERE id = v_current_admin_id;
  UPDATE public.profiles SET role_id = 'admin', updated_at = now() WHERE id = p_target_profile_id;
  DELETE FROM public.system_admin_role_change_permits WHERE transaction_id = txid_current();

  INSERT INTO public.audit_logs(actor_id, actor_name, actor_role, action, entity_type, entity_id, old_values, new_values)
  VALUES (v_current_admin_id, 'database-owner:' || trim(p_operator_reference), 'break_glass_operator',
    'SYSTEM_ADMIN_BREAK_GLASS_RECOVERY', 'profiles', p_target_profile_id::text,
    jsonb_build_object('previous_admin_id', v_current_admin_id, 'approval_reference', trim(p_approval_reference)),
    jsonb_build_object('new_admin_id', p_target_profile_id, 'new_admin_name', v_target_name));
  RETURN jsonb_build_object('previous_admin_id', v_current_admin_id, 'new_admin_id', p_target_profile_id,
    'approval_reference', trim(p_approval_reference));
END;
$$;
REVOKE ALL ON FUNCTION public.system_admin_break_glass_recovery(uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_general_secretariat(
  p_profile_id uuid,
  p_permission_ids text[],
  p_enabled boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
  v_name text;
  v_was_enabled boolean := false;
  v_old text[];
  v_new text[];
  v_allowed constant text[] := ARRAY['MANAGE_LECTURES','MANAGE_CURRICULUM','MANAGE_MARATHON','GRADE_EXAMS','MANAGE_BOOKS'];
BEGIN
  PERFORM public.system_admin_assert_current();
  PERFORM 1 FROM public.profiles WHERE id = p_profile_id FOR UPDATE;
  SELECT role_id, full_name INTO v_role, v_name FROM public.profiles
  WHERE id = p_profile_id AND is_active = true AND deleted_at IS NULL;
  IF NOT FOUND OR v_role NOT IN ('admin','supervisor','servant','secretariat') THEN
    RAISE EXCEPTION 'Target must be an active staff profile' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(bool_or(is_active), false) INTO v_was_enabled
  FROM public.general_secretariat_members WHERE profile_id = p_profile_id;
  SELECT COALESCE(array_agg(permission_id ORDER BY permission_id), ARRAY[]::text[])
  INTO v_old FROM public.general_secretariat_permissions WHERE profile_id = p_profile_id;
  v_new := ARRAY(SELECT DISTINCT x FROM unnest(COALESCE(p_permission_ids, ARRAY[]::text[])) x ORDER BY x);
  IF EXISTS (SELECT 1 FROM unnest(v_new) x WHERE NOT (x = ANY(v_allowed))) THEN
    RAISE EXCEPTION 'Permission is outside the operational allowlist' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_new) x WHERE NOT EXISTS (SELECT 1 FROM public.permissions p WHERE p.id = x)) THEN
    RAISE EXCEPTION 'Requested permission is not present in the permission catalog' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.general_secretariat_members(profile_id, appointed_by, is_active)
  VALUES (p_profile_id, auth.uid(), p_enabled)
  ON CONFLICT (profile_id) DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = now();

  DELETE FROM public.general_secretariat_permissions WHERE profile_id = p_profile_id;
  IF p_enabled THEN
    INSERT INTO public.general_secretariat_permissions(profile_id, permission_id, granted_by)
    SELECT p_profile_id, x, auth.uid() FROM unnest(v_new) x;
  END IF;

  INSERT INTO public.audit_logs(actor_id, actor_name, actor_role, action, entity_type, entity_id, old_values, new_values)
  VALUES (auth.uid(), (SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'admin',
    'GENERAL_SECRETARIAT_UPDATE', 'profiles', p_profile_id::text,
    jsonb_build_object('enabled', v_was_enabled, 'permissions', v_old),
    jsonb_build_object('enabled', p_enabled, 'permissions', CASE WHEN p_enabled THEN v_new ELSE ARRAY[]::text[] END));

  RETURN jsonb_build_object('profile_id', p_profile_id, 'full_name', v_name, 'enabled', p_enabled,
    'permissions', CASE WHEN p_enabled THEN to_jsonb(v_new) ELSE '[]'::jsonb END);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_general_secretariat(uuid, text[], boolean) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_general_secretariat(uuid, text[], boolean) TO authenticated;

-- Restore is a privileged, trigger-suspending operation. Sanitize role data in
-- this wrapper so an archive can neither remove nor transfer the live admin.
CREATE OR REPLACE FUNCTION public.system_reset_guarded_restore_database(
  p_tables jsonb,
  p_truncate boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_current_admin_id uuid;
  v_current_admin jsonb;
  v_tables jsonb := p_tables;
  v_profile_rows jsonb;
BEGIN
  PERFORM public.system_reset_acquire_write_lock();
  SELECT p.id, to_jsonb(p) INTO v_current_admin_id, v_current_admin
  FROM public.profiles p
  WHERE p.role_id = 'admin' AND p.is_active = true AND p.deleted_at IS NULL
  FOR UPDATE;
  IF v_current_admin_id IS NULL OR
     (SELECT count(*) FROM public.profiles WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL) <> 1 THEN
    RAISE EXCEPTION 'restore requires exactly one current system administrator'
      USING ERRCODE = '42501';
  END IF;

  IF v_tables ? 'profiles' THEN
    IF jsonb_typeof(v_tables->'profiles') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'profiles restore data must be a JSON array' USING ERRCODE = '22023';
    END IF;
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN row_data->>'id' = v_current_admin_id::text THEN v_current_admin
        WHEN lower(COALESCE(row_data->>'role_id','')) IN ('admin','super_user')
          THEN jsonb_set(row_data, '{role_id}', '"supervisor"'::jsonb, true)
        ELSE row_data
      END
    ), '[]'::jsonb)
    INTO v_profile_rows
    FROM jsonb_array_elements(v_tables->'profiles') AS item(row_data);
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_profile_rows) AS item(row_data)
                   WHERE row_data->>'id' = v_current_admin_id::text) THEN
      v_profile_rows := v_profile_rows || jsonb_build_array(v_current_admin);
    END IF;
    v_tables := jsonb_set(v_tables, '{profiles}', v_profile_rows, true);
  ELSIF p_truncate THEN
    RAISE EXCEPTION 'truncate restore must include profiles to preserve the system administrator'
      USING ERRCODE = '22023';
  END IF;

  RETURN public.restore_database(v_tables, p_truncate);
END;
$$;
REVOKE ALL ON FUNCTION public.system_reset_guarded_restore_database(jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_reset_guarded_restore_database(jsonb, boolean) TO service_role;

-- Only the system admin may use raw role-management/profile-management paths.
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;
CREATE POLICY "System admin can manage profiles" ON public.profiles
FOR ALL TO authenticated USING (public.is_system_admin()) WITH CHECK (public.is_system_admin());
DROP POLICY IF EXISTS "Manage servant permissions" ON public.servant_permissions;
DROP POLICY IF EXISTS "System admin manage servant permissions" ON public.servant_permissions;
CREATE POLICY "System admin manage servant permissions" ON public.servant_permissions
FOR ALL TO authenticated USING (public.is_system_admin()) WITH CHECK (public.is_system_admin());

-- The reset barrier is table-specific; protect the new appointment tables too.
DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['general_secretariat_members','general_secretariat_permissions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS system_reset_write_barrier ON public.%I', v_table);
    EXECUTE format('CREATE TRIGGER system_reset_write_barrier BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.system_reset_write_barrier()', v_table);
    EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER system_reset_write_barrier', v_table);
    EXECUTE format('DROP POLICY IF EXISTS system_reset_write_guard_insert ON public.%I', v_table);
    EXECUTE format('DROP POLICY IF EXISTS system_reset_write_guard_update ON public.%I', v_table);
    EXECUTE format('DROP POLICY IF EXISTS system_reset_write_guard_delete ON public.%I', v_table);
    EXECUTE format('CREATE POLICY system_reset_write_guard_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.system_reset_writes_allowed())', v_table);
    EXECUTE format('CREATE POLICY system_reset_write_guard_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.system_reset_writes_allowed()) WITH CHECK (public.system_reset_writes_allowed())', v_table);
    EXECUTE format('CREATE POLICY system_reset_write_guard_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.system_reset_writes_allowed())', v_table);
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Migration requires exactly one active system administrator';
  END IF;
  IF EXISTS (SELECT 1 FROM public.general_secretariat_permissions gp
    WHERE gp.permission_id NOT IN ('MANAGE_LECTURES','MANAGE_CURRICULUM','MANAGE_MARATHON','GRADE_EXAMS','MANAGE_BOOKS')) THEN
    RAISE EXCEPTION 'Unexpected non-operational general-secretariat permission exists';
  END IF;
END;
$$;

COMMIT;

-- >>> END OF 20261023180000_system_admin_and_general_secretariat.sql <<<

-- >>> START OF 20261024100000_attendance_thursday_freeze.sql <<<
BEGIN;

-- 20261024100000_attendance_thursday_freeze.sql
-- Enforce Friday-to-Wednesday cycle and Thursday mandatory lock on attendance records

CREATE OR REPLACE FUNCTION public.check_attendance_thursday_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session record;
    v_diff_days integer;
BEGIN
    SELECT id, session_date, status
    INTO v_session
    FROM public.attendance_sessions
    WHERE id = NEW.session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'جلسة الحضور المحددة غير موجودة'
            USING ERRCODE = 'P0002';
    END IF;

    -- 1. Check if session is explicitly locked
    IF v_session.status = 'LOCKED' THEN
        RAISE EXCEPTION 'الجلسة مغلقة نهائياً؛ لا يمكن تسجيل أو تعديل الحضور'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Enforce Friday-to-Wednesday cycle (Thursday freeze)
    -- Friday = Day 0, Wednesday = Day +5, Thursday = Day +6 (Locked)
    v_diff_days := (CURRENT_DATE - v_session.session_date);

    IF v_diff_days < 0 THEN
        RAISE EXCEPTION 'لا يمكن تسجيل الحضور قبل تاريخ الجلسة'
            USING ERRCODE = '42501';
    END IF;

    IF v_diff_days > 5 THEN
        -- Update session status to LOCKED
        UPDATE public.attendance_sessions
        SET status = 'LOCKED', closed_at = COALESCE(closed_at, now())
        WHERE id = v_session.id AND status = 'OPEN';

        RAISE EXCEPTION 'الجلسة مغلقة نهائياً (قفل الخميس الإجباري)؛ لا يمكن تسجيل أو تعديل الحضور'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_thursday_freeze ON public.attendance_records;
CREATE TRIGGER trg_attendance_thursday_freeze
    BEFORE INSERT OR UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.check_attendance_thursday_lock();

COMMIT;

-- >>> END OF 20261024100000_attendance_thursday_freeze.sql <<<

-- >>> START OF 20261027150000_co_system_administrators.sql <<<
BEGIN;

-- 1. Drop the single-admin constraint so multiple active admins can exist concurrently
DROP INDEX IF EXISTS public.uq_single_admin;

-- Fast index for looking up active administrators
CREATE INDEX IF NOT EXISTS idx_active_system_admins
  ON public.profiles(role_id)
  WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL;

-- 2. Update guard trigger on profiles to ensure:
--    a) Direct INSERT of sensitive roles ('admin', 'supervisor', 'super_user') is blocked
--    b) Sensitive role changes still require transaction-scoped permits in system_admin_role_change_permits
--    c) An administrator cannot be deleted or demoted/deactivated if they are the LAST remaining active admin!
CREATE OR REPLACE FUNCTION public.guard_system_role_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

  IF TG_OP = 'INSERT' AND NEW.role_id IN ('admin','supervisor','super_user') THEN
    RAISE EXCEPTION 'Sensitive roles may only be assigned by the approved system workflow'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role_id IS DISTINCT FROM OLD.role_id THEN
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

    IF NOT EXISTS (
      SELECT 1 FROM public.system_admin_role_change_permits p
      WHERE p.transaction_id = txid_current() AND p.profile_id = OLD.id
        AND (p.actor_id = auth.uid() OR (auth.uid() IS NULL AND session_user = 'postgres'))
        AND p.old_role_id = OLD.role_id
        AND p.new_role_id = NEW.role_id
    ) THEN
      RAISE EXCEPTION 'Sensitive role changes require the system-admin management workflow'
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
$$;

-- 3. Function to grant system admin privileges to another staff user (Co-Administrator)
CREATE OR REPLACE FUNCTION public.grant_system_admin(p_target_profile_id uuid, p_confirmation text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_target_role text;
  v_auth_time numeric;
  v_target_name text;
  v_target_username text;
  v_active_admins_count int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('elkarooz-system-admin-transfer', 0));
  PERFORM public.system_admin_assert_current();

  v_auth_time := NULLIF(auth.jwt()->>'auth_time', '')::numeric;
  IF v_auth_time IS NULL OR to_timestamp(v_auth_time) < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'Recent reauthentication is required' USING ERRCODE = '42501';
  END IF;

  IF p_confirmation IS DISTINCT FROM 'إضافة مسؤول نظام' AND p_confirmation IS DISTINCT FROM 'منح صلاحية مسؤول النظام' THEN
    RAISE EXCEPTION 'Confirmation phrase does not match' USING ERRCODE = '22023';
  END IF;

  SELECT full_name INTO v_actor_name
  FROM public.profiles
  WHERE id = v_actor AND role_id = 'admin' AND is_active = true AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current system administrator not found' USING ERRCODE = '42501'; END IF;

  SELECT role_id, full_name, username INTO v_target_role, v_target_name, v_target_username
  FROM public.profiles
  WHERE id = p_target_profile_id AND is_active = true AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found or inactive' USING ERRCODE = '22023';
  END IF;

  IF p_target_profile_id = v_actor THEN
    RAISE EXCEPTION 'You are already a system administrator' USING ERRCODE = '22023';
  END IF;

  IF v_target_role = 'admin' THEN
    RAISE EXCEPTION 'Target user is already a system administrator' USING ERRCODE = '22023';
  END IF;

  IF v_target_role NOT IN ('supervisor','servant','secretariat') THEN
    RAISE EXCEPTION 'Target must be an active eligible staff member (supervisor, servant, or secretariat)' USING ERRCODE = '22023';
  END IF;

  -- Create role change permit for promotion
  INSERT INTO public.system_admin_role_change_permits(transaction_id, actor_id, profile_id, old_role_id, new_role_id)
  VALUES (txid_current(), v_actor, p_target_profile_id, v_target_role, 'admin');

  -- Promote target user to admin (actor stays admin!)
  UPDATE public.profiles
  SET role_id = 'admin', updated_at = now()
  WHERE id = p_target_profile_id;

  DELETE FROM public.system_admin_role_change_permits WHERE transaction_id = txid_current();

  SELECT count(*) INTO v_active_admins_count
  FROM public.profiles
  WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL;

  INSERT INTO public.audit_logs(actor_id, actor_name, actor_role, action, entity_type, entity_id, old_values, new_values)
  VALUES (
    v_actor,
    v_actor_name,
    'admin',
    'SYSTEM_ADMIN_GRANT',
    'profiles',
    p_target_profile_id::text,
    jsonb_build_object('target_old_role', v_target_role),
    jsonb_build_object('target_new_role', 'admin', 'target_name', v_target_name, 'active_admins_count', v_active_admins_count)
  );

  RETURN jsonb_build_object(
    'success', true,
    'actor_id', v_actor,
    'new_admin_id', p_target_profile_id,
    'new_admin_name', v_target_name,
    'new_admin_username', v_target_username,
    'active_admins_count', v_active_admins_count
  );
END;
$$;
REVOKE ALL ON FUNCTION public.grant_system_admin(uuid, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.grant_system_admin(uuid, text) TO authenticated;

-- 4. Function to revoke/demote a co-administrator back to supervisor
CREATE OR REPLACE FUNCTION public.revoke_system_admin(p_target_profile_id uuid, p_demote_to_role text, p_confirmation text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_target_role text;
  v_auth_time numeric;
  v_target_name text;
  v_demote_role text := COALESCE(NULLIF(trim(p_demote_to_role), ''), 'supervisor');
  v_active_admins_count int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('elkarooz-system-admin-transfer', 0));
  PERFORM public.system_admin_assert_current();

  v_auth_time := NULLIF(auth.jwt()->>'auth_time', '')::numeric;
  IF v_auth_time IS NULL OR to_timestamp(v_auth_time) < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'Recent reauthentication is required' USING ERRCODE = '42501';
  END IF;

  IF p_confirmation IS DISTINCT FROM 'إلغاء صلاحية مسؤول النظام' THEN
    RAISE EXCEPTION 'Confirmation phrase does not match' USING ERRCODE = '22023';
  END IF;

  IF v_demote_role NOT IN ('supervisor', 'servant', 'secretariat') THEN
    RAISE EXCEPTION 'Demote role must be supervisor, servant, or secretariat' USING ERRCODE = '22023';
  END IF;

  SELECT full_name INTO v_actor_name
  FROM public.profiles
  WHERE id = v_actor AND role_id = 'admin' AND is_active = true AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current system administrator not found' USING ERRCODE = '42501'; END IF;

  SELECT role_id, full_name INTO v_target_role, v_target_name
  FROM public.profiles
  WHERE id = p_target_profile_id AND is_active = true AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found or inactive' USING ERRCODE = '22023';
  END IF;

  IF v_target_role <> 'admin' THEN
    RAISE EXCEPTION 'Target user is not a system administrator' USING ERRCODE = '22023';
  END IF;

  -- Ensure at least one OTHER active admin remains
  SELECT count(*) INTO v_active_admins_count
  FROM public.profiles
  WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL AND id <> p_target_profile_id;

  IF v_active_admins_count < 1 THEN
    RAISE EXCEPTION 'Cannot revoke the only active system administrator' USING ERRCODE = '42501';
  END IF;

  -- Create permit for demotion
  INSERT INTO public.system_admin_role_change_permits(transaction_id, actor_id, profile_id, old_role_id, new_role_id)
  VALUES (txid_current(), v_actor, p_target_profile_id, 'admin', v_demote_role);

  UPDATE public.profiles
  SET role_id = v_demote_role, updated_at = now()
  WHERE id = p_target_profile_id;

  DELETE FROM public.system_admin_role_change_permits WHERE transaction_id = txid_current();

  INSERT INTO public.audit_logs(actor_id, actor_name, actor_role, action, entity_type, entity_id, old_values, new_values)
  VALUES (
    v_actor,
    v_actor_name,
    'admin',
    'SYSTEM_ADMIN_REVOKE',
    'profiles',
    p_target_profile_id::text,
    jsonb_build_object('target_old_role', 'admin'),
    jsonb_build_object('target_new_role', v_demote_role, 'target_name', v_target_name, 'remaining_admins_count', v_active_admins_count)
  );

  RETURN jsonb_build_object(
    'success', true,
    'actor_id', v_actor,
    'revoked_profile_id', p_target_profile_id,
    'revoked_name', v_target_name,
    'new_role', v_demote_role,
    'remaining_admins_count', v_active_admins_count
  );
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_system_admin(uuid, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_system_admin(uuid, text, text) TO authenticated;

COMMIT;

-- >>> END OF 20261027150000_co_system_administrators.sql <<<

