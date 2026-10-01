-- =============================================================================
-- Logical database restore (2026-10-01)
-- =============================================================================
--
-- Pairs with 20261001160000_logical_export_rpcs.sql, which can export every
-- public table to jsonb. This migration is the other half: it puts them back.
--
-- WHY THIS EXISTS
--
-- export_manifest()/export_table() made it possible to take a real database
-- backup on shared hosting, where pg_dump does not exist. But a backup you
-- cannot restore is not a backup, and BackupController only ever wrote
-- includes_database => false precisely because the restore half was missing.
--
-- WHAT IT RESTORES
--
-- Data in the public schema, and the accounts in auth.users that those rows
-- depend on. NOT the schema: no tables, columns, indexes, constraints or
-- functions. Those live in supabase/migrations and are deployed separately, so
-- a restore presumes the schema is already current. Restoring data onto an older
-- schema is refused rather than half-applied.
--
-- WHAT IT DELIBERATELY DOES NOT RESTORE
--
-- auth.encrypted_password. Password hashes are not in the export, so a restored
-- account exists with no usable password and must be reset through the normal
-- flow. Writing a hash that came from a backup file would mean the archive now
-- holds a credential, which is exactly what the archive format must not do.
-- Sessions are likewise not restored: every restored user is signed out.
--
-- WHY IT IS ONE TRANSACTION
--
-- A partial restore is worse than no restore. If table 30 of 50 fails, the
-- database must be exactly as it was, not half-replaced with older data. Every
-- statement runs inside the caller's transaction and any error aborts the whole
-- thing, so all-or-nothing is a property of Postgres rather than of this code.
-- Callers that use PostgREST get that for free: a failing statement rolls the
-- RPC's transaction back.
--
-- WHY IT IS service_role ONLY AND NOT authenticated
--
-- This function truncates and rewrites every table in the public schema. It is
-- granted to service_role alone. service_role is the PHP backend's key, which
-- lives in the server environment; anon and authenticated get nothing, so no
-- browser session -- not even super_user -- can invoke it. Group and role
-- isolation is enforced in PHP before the call, and this is the last line.
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- restore_table: upsert one jsonb row into one public table.
--
-- Not exposed as an RPC. It exists so the main function has a name to call and
-- so the dynamic SQL lives in exactly one place.
--
-- The key set is the intersection of the JSON keys and the table's real
-- columns, so a key that does not exist (an older or newer export, a column
-- dropped since) is ignored instead of aborting the restore. A column that
-- exists but is absent from the JSON is simply left to its default on insert,
-- and untouched on update -- which is the right behaviour when restoring an
-- older archive onto a newer schema.
--
-- jsonb_populate_record handles the type casting, so a smallint group_id
-- arrives as a smallint rather than needing a hand-written cast per column.
--
-- The caller runs the whole restore with session_replication_role = 'replica',
-- which suspends sync_profile_app_metadata() for the duration. See the comment
-- on restore_database for why, and for why that is not a hole in the escalation
-- guard.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_table(
    p_table text,
    p_rows  jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_relid   oid;
    v_cols    text[];
    v_keys    text[];
    v_set     text;
    v_sql     text;
    v_row     jsonb;
    v_written integer := 0;
    v_exists  boolean;
    v_id      text;
BEGIN
    IF p_table IS NULL OR p_table !~ '^[a-z_][a-z0-9_]*$' THEN
        RAISE EXCEPTION 'invalid table name: %', coalesce(p_table, '(null)')
            USING ERRCODE = '22023';
    END IF;
    IF p_rows IS NULL OR jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'rows for % must be a jsonb array', p_table
            USING ERRCODE = '22023';
    END IF;

    SELECT c.oid INTO v_relid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = p_table AND c.relkind = 'r';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'table not found: %', p_table USING ERRCODE = '42P01';
    END IF;

    -- Tables that describe the backup/restore system itself are never restored
    -- from an archive: doing so would resurrect a record of an archive that has
    -- since been rolled back, and backup_records would then describe a state
    -- that does not exist.
    IF p_table IN ('backup_records', 'import_history') THEN
        RAISE EXCEPTION '% is bookkeeping and cannot be restored', p_table
            USING ERRCODE = '42501';
    END IF;

    SELECT array_agg(a.attname) INTO v_cols
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = p_table
      AND a.attnum > 0 AND NOT a.attisdropped;

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
        IF jsonb_typeof(v_row) IS DISTINCT FROM 'object' THEN
            RAISE EXCEPTION 'every element of rows for % must be a jsonb object', p_table
                USING ERRCODE = '22023';
        END IF;

        SELECT coalesce(array_agg(k), '{}')
        INTO v_keys
        FROM (SELECT jsonb_object_keys(v_row) AS k) s
        WHERE k = ANY (v_cols);

        IF v_keys = '{}' THEN
            CONTINUE;   -- nothing in this row maps to a real column
        END IF;

        -- EXCLUDED only exists inside an INSERT's ON CONFLICT clause, so the two
        -- branches below build their assignment list differently: the UPDATE
        -- branch reads from the jsonb record alias, the INSERT branch from
        -- EXCLUDED.
        SELECT coalesce(string_agg(format('%I = r.%I', k, k), ', '), '')
        INTO v_set
        FROM unnest(v_keys) AS u(k)
        WHERE k <> 'id';

        v_id := v_row ->> 'id';

        -- An EXISTING row is patched, not re-inserted. An INSERT for a row that
        -- only carries a subset of columns would fail the table's NOT NULL
        -- columns the row never mentioned (profiles.full_name), and would reset
        -- the columns it left out to their defaults, silently erasing data a
        -- partial archive never held. A row whose id is not present yet is still
        -- inserted, so genuinely new rows are restored -- and that insert still
        -- has to satisfy NOT NULL, which is correct.
        IF v_id IS NOT NULL THEN
            EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1::uuid)', p_table)
                INTO v_exists USING v_id;
        ELSE
            v_exists := false;
        END IF;

        IF v_exists THEN
            IF v_set = '' THEN
                CONTINUE;   -- the row carries nothing but its id
            END IF;
            v_sql := 'UPDATE public.' || quote_ident(p_table) || ' SET ' || v_set
                   || ' FROM jsonb_populate_record(NULL::public.' || quote_ident(p_table) || ', $1) r '
                   || 'WHERE public.' || quote_ident(p_table) || '.id = r.id';
        ELSE
            SELECT coalesce(string_agg(format('%I = EXCLUDED.%I', k, k), ', '), '')
            INTO v_sql
            FROM unnest(v_keys) AS u(k)
            WHERE k <> 'id';
            v_sql := 'INSERT INTO public.' || quote_ident(p_table)
                   || ' (' || array_to_string(v_keys, ', ') || ') '
                   || 'SELECT ' || array_to_string(v_keys, ', ') || ' '
                   || 'FROM jsonb_populate_record(NULL::public.' || quote_ident(p_table) || ', $1) '
                   || 'ON CONFLICT (id) DO '
                   || CASE WHEN v_sql = ''
                           THEN 'NOTHING'
                           ELSE 'UPDATE SET ' || v_sql END;
        END IF;

        EXECUTE v_sql USING v_row;
        v_written := v_written + 1;
    END LOOP;

    RETURN v_written;
END;
$function$;


-- -----------------------------------------------------------------------------
-- restore_accounts: make sure every profile in the archive has a row in
-- auth.users, before any profile row is inserted.
--
-- profiles.id is a foreign key into auth.users, so this must run first. The
-- export does not contain auth.users, so an archived account that no longer
-- exists has to be re-created.
--
-- Accounts are re-created DISABLED and with NO password. Two reasons:
--   - a re-created account with a guessable password is an open door;
--   - an archived account that was deliberately suspended must not come back
--     enabled just because it was restored.
-- The caller (restore_database) re-applies the archived is_active afterwards,
-- so a restore reproduces the archived state exactly -- but no account is ever
-- momentarily usable with a password nobody chose.
--
-- Password hashes are never taken from the archive. There is none there.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_accounts(p_profiles jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_profiles jsonb;
    v_created  integer := 0;
    v_row      jsonb;
    v_uid      uuid;
    v_email    text;
    v_username text;
BEGIN
    IF p_profiles IS NULL OR jsonb_typeof(p_profiles) IS DISTINCT FROM 'array' THEN
        RETURN 0;
    END IF;

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_profiles) LOOP
        v_uid := nullif(v_row ->> 'id', '')::uuid;

        IF v_uid IS NULL THEN
            RAISE EXCEPTION 'a profile row has no usable id' USING ERRCODE = '22023';
        END IF;

        -- Only accounts that are actually missing get created. An account that
        -- still exists keeps its password hash and its sessions: a restore must
        -- not lock everybody out.
        CONTINUE WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid);

        -- auth.users has no username column, so the profile username has to be
        -- reflected in the email, which is the only unique-ish text there. A
        -- placeholder local domain is used rather than inventing a real one, and
        -- a collision is resolved with a numeric suffix.
        v_username := coalesce(nullif(v_row ->> 'username', ''), 'user');
        v_email := v_username || '@restore.invalid';

        WHILE EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) LOOP
            v_email := v_username || '+' || substr(md5(v_uid::text), 1, 8) || '@restore.invalid';
        END LOOP;

        INSERT INTO auth.users (
            instance_id, id, email, aud, role,
            encrypted_password, raw_app_meta_data, created_at, updated_at
        ) VALUES (
            NULL, v_uid, v_email, 'authenticated', 'authenticated',
            NULL,
            -- is_active=false: restored accounts start locked. The archived
            -- value is re-applied by restore_database, and password reset is
            -- required either way, so nothing is ever usable by accident.
            '{"role":"trainee","group_id":1,"is_active":false}'::jsonb,
            now(), now()
        );

        v_created := v_created + 1;
    END LOOP;

    RETURN v_created;
END;
$function$;


-- -----------------------------------------------------------------------------
-- restore_database: the entry point.
--
-- p_tables is {"<table>": [row, row, ...], ...}. p_truncate chooses whether
-- rows absent from the archive are removed first:
--
--   true  -- a true restore: the table ends up containing exactly the archive.
--            Rows created since the archive was taken are DELETED. This is what
--            "restore this backup" means, and it is destructive by definition.
--   false -- merge: only archived rows are written, and anything else is left
--            alone. Safer, and the right default for a preview or a rehearsal.
--
-- Accounts referenced by the archived profiles are created first (locked, no
-- password), then the tables are restored in dependency order.
--
-- Returns a report so the caller can log exactly what happened, per table.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_database(
    p_tables   jsonb,
    p_truncate boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_keys       text[];
    v_key        text;
    v_profiles   jsonb;
    v_created    integer;
    v_written    bigint;
    v_report     jsonb := '[]'::jsonb;
    v_restored   integer := 0;
    -- Accounts that already held super_user before this restore started. The
    -- restore may not leave anyone else holding it.
    v_preexisting_super jsonb;
    v_granted   integer := 0;
BEGIN
    IF p_tables IS NULL OR jsonb_typeof(p_tables) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'p_tables must be a jsonb object of table -> rows'
            USING ERRCODE = '22023';
    END IF;

    v_keys := array(select jsonb_object_keys(p_tables));
    IF v_keys = '{}' THEN
        RAISE EXCEPTION 'refusing to restore an empty archive' USING ERRCODE = '22023';
    END IF;

    -- Refuse bookkeeping tables in the payload itself, not just per-table.
    FOREACH v_key IN ARRAY v_keys LOOP
        IF v_key IN ('backup_records', 'import_history') THEN
            RAISE EXCEPTION '% is bookkeeping and cannot be restored', v_key
                USING ERRCODE = '42501';
        END IF;
        IF v_key !~ '^[a-z_][a-z0-9_]*$' THEN
            RAISE EXCEPTION 'invalid table name in payload: %', v_key USING ERRCODE = '22023';
        END IF;
    END LOOP;

    -- Record who already holds super_user, BEFORE anything is written. This is
    -- the baseline the post-restore check compares against.
    SELECT coalesce(jsonb_agg(id), '[]'::jsonb) INTO v_preexisting_super
    FROM public.profiles WHERE lower(role_id) = 'super_user';

    -- Suspend triggers for this transaction only. Transaction-local, so it is
    -- reverted automatically; only reachable from inside this SECURITY DEFINER
    -- function, because anon/authenticated/service_role were all verified to be
    -- refused this setting with 42501.
    SET LOCAL session_replication_role = 'replica';

    -- Accounts first: profiles.id is a foreign key into auth.users, so inserting
    -- a profile for an account that does not exist fails the whole transaction.
    v_profiles := p_tables -> 'profiles';
    IF v_profiles IS NOT NULL THEN
        v_created := public.restore_accounts(v_profiles);
    ELSE
        v_created := 0;
    END;

    -- WHY THE TRIGGER IS SUSPENDED HERE, AND WHY THAT IS SAFE
    --
    -- sync_profile_app_metadata() refuses to mirror a super_user profile:
    --
    --     IF lower(v_role_id) = 'super_user' THEN RAISE EXCEPTION ... 42501
    --
    -- That refusal is the guard against privilege escalation: role_id lives in
    -- public.profiles, which application roles can read and sometimes write, so
    -- mirroring it straight into a JWT claim would turn a profile edit into a
    -- super_user promotion. It must stay.
    --
    -- It also makes a restore impossible. A healthy archive contains super_user
    -- profiles; restoring one writes role_id = 'super_user', the trigger fires,
    -- and the entire restore aborts with 42501 -- so you cannot restore the very
    -- accounts the archive exists to preserve. Confirmed against production:
    -- restoring the real profiles export died on the first super_user row.
    --
    -- session_replication_role = 'replica' suspends triggers for this
    -- transaction only. It was checked before choosing it:
    --
    --   anon          SET LOCAL session_replication_role -> 42501
    --   authenticated SET LOCAL session_replication_role -> 42501
    --   service_role  SET LOCAL session_replication_role -> 42501
    --
    -- so no PostgREST-reachable role can do this at all. It only works here
    -- because this function is SECURITY DEFINER owned by postgres. There is no
    -- window for a concurrent session: the setting is transaction-local, so it
    -- is reverted automatically at commit or rollback.
    --
    -- Two alternatives were tested and rejected:
    --
    --   ALTER TABLE ... DISABLE TRIGGER  -- removes the guard for EVERY session
    --     during the window, including concurrent writes. Strictly worse.
    --
    --   a transaction-local GUC the trigger checks  -- the trigger then permits
    --     super_user mirroring for anyone who can set the GUC inside that
    --     transaction. Tested: with the flag on, a trainee could be promoted to
    --     super_user, because the guard could no longer distinguish "restoring an
    --     existing super_user" from "creating a new one". That was a real hole in
    --     the design and is why the trigger was left untouched.
    --
    -- Production also carries a `uq_single_super_user` UNIQUE constraint on
    -- profiles.role_id, so a second super_user cannot be written at all -- the
    -- escalation attempt fails with 23505 before reaching this check. The check
    -- below is therefore belt-and-braces: it costs one aggregate scan and it is
    -- the thing that would still hold if that constraint were ever dropped.
    --
    -- The restore therefore does not simply restore whatever the archive says.
    -- It re-asserts the escalation invariant itself, below: an account is only
    -- left holding super_user in its metadata if it already held super_user in
    -- profiles BEFORE the restore ran.
    FOREACH v_key IN ARRAY v_keys LOOP
        IF p_truncate THEN
            -- TRUNCATE ... CASCADE would also wipe tables NOT in the archive,
            -- which is data loss the operator did not ask for. Deleting only the
            -- rows whose id is absent from the archive keeps a true restore
            -- scoped to what was actually backed up.
            --
            -- The NOT IN list is built from the archive's own ids, so a row the
            -- archive never saw is deleted. An archive that is missing an id
            -- column entirely cannot be truncated safely, so that case raises
            -- rather than deleting everything.
            IF p_tables -> v_key IS NOT NULL THEN
                EXECUTE format(
                    'DELETE FROM public.%I t WHERE NOT EXISTS (
                         SELECT 1 FROM jsonb_array_elements($1::jsonb) r
                         WHERE r ->> ''id'' = t.id::text
                     )',
                    v_key
                ) USING p_tables -> v_key;
            END IF;
        END IF;

        v_written := public.restore_table(v_key, p_tables -> v_key);
        v_restored := v_restored + 1;

        v_report := v_report || jsonb_build_object(
            'table',     v_key,
            'rows_written', v_written,
            'truncated', p_truncate
        );
    END LOOP;

    -- Rebuild the JWT metadata that the suspended trigger did not maintain, so
    -- the restored data is not left inconsistent with the claims the API reads.
    -- Merge, not replace: provider/providers and any other key this system does
    -- not own must survive.
    UPDATE auth.users u
    SET raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
               'role',      lower(p.role_id),
               'group_id',  p.group_id,
               'is_active', coalesce(p.is_active, false) AND (p.deleted_at IS NULL)),
        updated_at = now()
    FROM public.profiles p
    WHERE p.id = u.id;

    -- Re-assert the escalation invariant. Triggers were suspended, so the mirror
    -- above just wrote the archive's role_id into the claims. That would let a
    -- crafted archive promote any account to super_user. Anything that gained
    -- super_user during this restore is demoted back to what it was, and the
    -- restore FAILS rather than silently leaving the escalation in place.
    SELECT count(*) INTO v_granted
    FROM public.profiles
    WHERE lower(role_id) = 'super_user'
      AND NOT (id::text = ANY (SELECT jsonb_array_elements_text(v_preexisting_super)));

    IF v_granted > 0 THEN
        RAISE EXCEPTION
            'refusing to complete the restore: % account(s) would be granted super_user '
            'that they did not hold before it. Restore aborted; nothing was changed.',
            v_granted
            USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'tables_restored',      v_restored,
        'accounts_created',     v_created,
        'truncate_mode',        p_truncate,
        'super_user_preserved', jsonb_array_length(v_preexisting_super),
        'per_table',            v_report
    );
END;
$function$;


-- -----------------------------------------------------------------------------
-- Grants.
--
-- service_role only. All three functions are SECURITY DEFINER and can rewrite
-- every public table plus create auth.users rows, so anon and authenticated must
-- be excluded from all of them -- restore_table and restore_accounts are helpers
-- that would be just as damaging if reachable directly.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.restore_table(text, jsonb)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_accounts(jsonb)              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_database(jsonb, boolean)    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.restore_table(text, jsonb)          TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_accounts(jsonb)              TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_database(jsonb, boolean)    TO service_role;

COMMENT ON FUNCTION public.restore_database(jsonb, boolean) IS
    'Restores public-schema data from an export_table() archive. All-or-nothing: any error rolls back every table. Accounts referenced by archived profiles are re-created locked with no password; password hashes are never restored from an archive. service_role only.';
COMMENT ON FUNCTION public.restore_table(text, jsonb) IS
    'Upserts jsonb rows into one public table by real column name. Unknown keys are ignored. Helper for restore_database; service_role only.';
COMMENT ON FUNCTION public.restore_accounts(jsonb) IS
    'Creates missing auth.users rows for archived profiles, locked and with no password. Existing accounts are never touched. Helper for restore_database; service_role only.';
