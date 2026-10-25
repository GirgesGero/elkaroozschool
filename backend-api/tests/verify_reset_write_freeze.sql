-- Run only against a disposable local Supabase/PostgreSQL database after migrations:
-- psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f backend-api/tests/verify_reset_write_freeze.sql
-- This test changes only synthetic rows and rolls the transaction back.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
    v_actor_id uuid;
    v_user_id uuid;
    v_backup_id uuid;
    v_run_id uuid;
BEGIN
    IF (SELECT active_run_id FROM public.system_reset_gate WHERE singleton = true) IS NOT NULL
       OR EXISTS (SELECT 1 FROM public.system_reset_runs WHERE status IN ('PREPARED', 'MEDIA_CLEANUP', 'DATA_CLEARED', 'PARTIAL')) THEN
        RAISE EXCEPTION 'test requires a disposable database with no open reset';
    END IF;

    SELECT p.id INTO v_actor_id
      FROM public.profiles p JOIN auth.users u ON u.id = p.id
     WHERE p.role_id = 'admin' AND p.is_active = true AND p.deleted_at IS NULL
     ORDER BY p.created_at LIMIT 1;
    SELECT u.id INTO v_user_id
      FROM auth.users u
     WHERE u.id <> v_actor_id
       AND NOT EXISTS (
           SELECT 1 FROM public.profiles p
            WHERE p.id = u.id AND p.role_id = 'admin' AND p.is_active = true AND p.deleted_at IS NULL
       )
     ORDER BY u.created_at LIMIT 1;
    IF v_actor_id IS NULL OR v_user_id IS NULL THEN
        RAISE EXCEPTION 'test requires one active admin and one non-admin Auth user in the disposable database';
    END IF;

    INSERT INTO public.backup_records (
        filename, file_size_bytes, storage_type, storage_path, status, checksum_sha256, created_by
    ) VALUES (
        'reset-write-freeze-test-' || gen_random_uuid()::text || '.zip',
        0, 'HOSTINGER', '/reset-write-freeze-test.zip', 'COMPLETED', repeat('a', 64), v_actor_id
    ) RETURNING id INTO v_backup_id;
    INSERT INTO public.system_reset_runs (actor_id, backup_id, status, data_cleared_at)
    VALUES (v_actor_id, v_backup_id, 'DATA_CLEARED', clock_timestamp())
    RETURNING id INTO v_run_id;
    INSERT INTO public.system_reset_run_users (run_id, user_id, status)
    VALUES (v_run_id, v_user_id, 'PENDING');
    UPDATE public.system_reset_gate
       SET active_run_id = v_run_id, updated_at = clock_timestamp()
     WHERE singleton = true;
END;
$$;

DO $$
BEGIN
    IF public.system_reset_writes_allowed() THEN
        RAISE EXCEPTION 'authenticated RLS helper allowed writes during an open reset';
    END IF;
    RAISE NOTICE 'PASS authenticated RLS helper denies the open reset';
END;
$$;

DO $$
DECLARE
    v_run_id uuid;
    v_user_id uuid;
    v_message text;
BEGIN
    SELECT g.active_run_id, ru.user_id INTO v_run_id, v_user_id
      FROM public.system_reset_gate g
      JOIN public.system_reset_run_users ru ON ru.run_id = g.active_run_id
     WHERE g.singleton = true
     LIMIT 1;
    BEGIN
        DELETE FROM auth.users WHERE id = v_user_id;
        RAISE EXCEPTION 'assertion failed: unpermitted Auth deletion was not blocked';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
        IF v_message <> 'SYSTEM_RESET_AUTH_WRITE_FROZEN' THEN RAISE; END IF;
    END;
    BEGIN
        EXECUTE 'TRUNCATE TABLE auth.users';
        RAISE EXCEPTION 'assertion failed: Auth TRUNCATE was not blocked';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
        IF v_message <> 'SYSTEM_RESET_WRITE_FROZEN' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS Auth TRUNCATE is blocked by the statement barrier';
    RAISE NOTICE 'PASS unpermitted Auth Admin-style deletion is blocked at auth.users';
END;
$$;

DO $$
DECLARE
    v_actor_id uuid;
    v_run_id uuid;
    v_user_id uuid;
    v_message text;
BEGIN
    SELECT r.actor_id, r.id, ru.user_id INTO v_actor_id, v_run_id, v_user_id
      FROM public.system_reset_gate g
      JOIN public.system_reset_runs r ON r.id = g.active_run_id
      JOIN public.system_reset_run_users ru ON ru.run_id = r.id
     WHERE g.singleton = true
     LIMIT 1;
    PERFORM public.system_reset_authorize_auth_delete(v_actor_id, v_run_id, v_user_id);
    BEGIN
        UPDATE auth.users SET updated_at = updated_at WHERE id = v_user_id;
        RAISE EXCEPTION 'assertion failed: Auth update used a delete-only permit';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
        IF v_message <> 'SYSTEM_RESET_AUTH_WRITE_FROZEN' THEN RAISE; END IF;
    END;
    DELETE FROM auth.users WHERE id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'authorized staged Auth deletion did not affect one user';
    END IF;
    BEGIN
        DELETE FROM public.profiles WHERE false;
        RAISE EXCEPTION 'assertion failed: Auth cascade permit survived its statement';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
        IF v_message <> 'SYSTEM_RESET_WRITE_FROZEN' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS the exact staged Auth delete is permitted, its cascade permit is cleared, and updates remain frozen';
END;
$$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001","iat":1}';
DO $$
DECLARE
    v_message text;
BEGIN
    BEGIN
        DELETE FROM public.media_assets WHERE false;
        RAISE EXCEPTION 'assertion failed: authenticated DML was not blocked';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
        IF v_message <> 'SYSTEM_RESET_WRITE_FROZEN' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS authenticated direct DML is blocked by the database barrier';
END;
$$;

RESET ROLE;
CREATE OR REPLACE FUNCTION public.__reset_test_security_definer_writer()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    DELETE FROM public.media_assets WHERE false;
END;
$$;
REVOKE ALL ON FUNCTION public.__reset_test_security_definer_writer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.__reset_test_security_definer_writer() TO authenticated;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001","iat":1}';
DO $$
DECLARE
    v_message text;
BEGIN
    BEGIN
        PERFORM public.__reset_test_security_definer_writer();
        RAISE EXCEPTION 'assertion failed: SECURITY DEFINER write was not blocked';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
        IF v_message <> 'SYSTEM_RESET_WRITE_FROZEN' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS authenticated SECURITY DEFINER RPC cannot bypass the barrier';
END;
$$;
RESET ROLE;
DROP FUNCTION public.__reset_test_security_definer_writer();

SET LOCAL ROLE service_role;
DO $$
DECLARE
    v_message text;
BEGIN
    BEGIN
        DELETE FROM public.media_assets WHERE false;
        RAISE EXCEPTION 'assertion failed: service_role write was not blocked';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
        IF v_message <> 'SYSTEM_RESET_WRITE_FROZEN' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS service_role BYPASSRLS direct DML is blocked by the trigger';
END;
$$;

SET LOCAL app.reset_write_bypass = 'on';
DO $$
DECLARE
    v_message text;
BEGIN
    BEGIN
        DELETE FROM public.media_assets WHERE false;
        RAISE EXCEPTION 'assertion failed: forged session setting bypassed the barrier';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
        IF v_message <> 'SYSTEM_RESET_WRITE_FROZEN' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS caller-controlled GUC cannot forge a reset permit';
END;
$$;

DO $$
BEGIN
    IF has_table_privilege('service_role', 'public.system_reset_write_permits', 'INSERT')
       OR has_table_privilege('authenticated', 'public.system_reset_write_permits', 'INSERT')
       OR has_table_privilege('service_role', 'public.system_reset_auth_delete_permits', 'INSERT')
       OR has_table_privilege('authenticated', 'public.system_reset_auth_delete_permits', 'INSERT') THEN
        RAISE EXCEPTION 'an external role can forge a reset or Auth deletion permit';
    END IF;
    IF has_function_privilege('authenticated', 'public.system_reset_acquire_write_lock()', 'EXECUTE')
       OR has_function_privilege('service_role', 'public.system_reset_acquire_write_lock()', 'EXECUTE')
       OR has_function_privilege('service_role', 'public.system_reset_auth_user_write_barrier()', 'EXECUTE') THEN
        RAISE EXCEPTION 'an external role can invoke a private barrier primitive directly';
    END IF;
    IF has_function_privilege('service_role', 'public.restore_database(jsonb,boolean)', 'EXECUTE')
       OR has_function_privilege('service_role', 'public.restore_table(text,jsonb)', 'EXECUTE')
       OR has_function_privilege('service_role', 'public.restore_accounts(jsonb)', 'EXECUTE') THEN
        RAISE EXCEPTION 'service_role can call an unguarded raw restore RPC';
    END IF;
    IF NOT has_function_privilege('service_role', 'public.system_reset_guarded_restore_database(jsonb,boolean)', 'EXECUTE') THEN
        RAISE EXCEPTION 'service_role cannot call the guarded restore RPC';
    END IF;
    RAISE NOTICE 'PASS service_role cannot forge permits or call raw restore RPCs';
END;
$$;
RESET ROLE;

DO $$
DECLARE
    v_run_id uuid;
    v_message text;
BEGIN
    SELECT active_run_id INTO v_run_id FROM public.system_reset_gate WHERE singleton = true;
    INSERT INTO public.system_reset_write_permits (transaction_id, run_id)
    VALUES (txid_current(), v_run_id);
    DELETE FROM public.media_assets WHERE false;
    DELETE FROM public.system_reset_write_permits
     WHERE transaction_id = txid_current() AND run_id = v_run_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'reset transaction permit was not removed';
    END IF;
    RAISE NOTICE 'PASS reset-only transaction permit allows finalization writes';
END;
$$;

DO $$
DECLARE
    v_expected text[] := ARRAY[
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
    ];
    v_missing integer;
    v_enabled integer;
    v_disabled integer;
BEGIN
    SELECT count(*) FILTER (WHERE n.oid IS NULL),
           count(*) FILTER (WHERE t.tgenabled = 'A'),
           count(*) FILTER (WHERE t.tgname IS NOT NULL AND t.tgenabled <> 'A')
      INTO v_missing, v_enabled, v_disabled
      FROM unnest(v_expected) AS expected(table_name)
      LEFT JOIN pg_class c ON c.relname = expected.table_name
                           AND c.relnamespace = 'public'::regnamespace
      LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      LEFT JOIN pg_trigger t ON t.tgrelid = c.oid
                            AND t.tgname = 'system_reset_write_barrier';
    IF v_missing <> 0 OR v_enabled <> cardinality(v_expected) OR v_disabled <> 0 THEN
        RAISE EXCEPTION 'guarded-table trigger coverage mismatch: missing %, enabled %, disabled %',
            v_missing, v_enabled, v_disabled;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'auth' AND c.relname = 'users'
          AND t.tgname = 'system_reset_auth_user_write_barrier' AND t.tgenabled = 'A'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'auth' AND c.relname = 'users'
          AND t.tgname = 'system_reset_auth_truncate_barrier' AND t.tgenabled = 'A'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'auth' AND c.relname = 'users'
          AND t.tgname = 'system_reset_auth_delete_cleanup' AND t.tgenabled = 'A'
    ) THEN
        RAISE EXCEPTION 'auth.users reset write/cleanup barrier is missing or not ENABLE ALWAYS';
    END IF;
    RAISE NOTICE 'PASS all target and Auth tables have ENABLE ALWAYS write barriers';
END;
$$;

ROLLBACK;
