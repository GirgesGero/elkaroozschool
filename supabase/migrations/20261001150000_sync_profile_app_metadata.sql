-- Keep auth.users.raw_app_meta_data in step with public.profiles.
--
-- WHY
--
-- The PHP API authorizes every request from the JWT's app_metadata claims
-- (role, group_id, is_active). Those claims are copied into the token when it
-- is issued and only change when the token is reissued, so
-- raw_app_meta_data is what actually governs access -- not the profiles row.
--
-- Migration 20261001130000_backfill_app_metadata_from_profiles.sql copied the
-- three fields across once. It was a one-shot snapshot: production verified
-- 50/50 rows matching on role, group_id and is_active, but nothing keeps them
-- aligned afterwards. The next role change, group move or suspension made
-- through the app updates profiles only, the live token keeps serving the old
-- claim, and the authorization gap reopens silently.
--
-- This trigger closes that. It is deliberately narrow:
--   * AFTER INSERT OR UPDATE OF the privilege columns -- a bio edit must not
--     touch auth.users.
--   * It mirrors only role / group_id / is_active. Other metadata keys belong
--     to whatever wrote them and are left alone.
--   * It refuses to act on the super_user role rather than silently demoting.
--     Changing who is super_user is a deliberate act done directly in SQL; if
--     it ever arrives as an ordinary profile update, that is an escalation
--     attempt and should fail loudly.
--
-- SCHEMA NOTES
--
-- roles.id is itself the role name ('admin', 'super_user', 'trainee', ...) and
-- is varchar, not an integer key. profiles.role_id stores that same string.
-- An earlier draft of this migration joined to a nonexistent roles.role_name
-- column and would have failed on apply; it is deliberately not used here.
--
-- SECURITY
--
-- SECURITY DEFINER is required because the application role cannot write
-- auth.users directly. search_path is pinned so a hijacked search_path cannot
-- redirect the update at a different table. The function takes no arguments and
-- reads only NEW plus auth.users by primary key, so it exposes nothing an
-- UPDATE on profiles could not already reach.

CREATE OR REPLACE FUNCTION public.sync_profile_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_role_id   text;
    v_group_id  smallint;
    v_is_active boolean;
    v_meta      jsonb;
    v_existing  jsonb;
BEGIN
    -- deleted_at is folded into is_active so a soft-deleted profile cannot keep
    -- an active claim alive.
    SELECT p.role_id,
           p.group_id,
           COALESCE(p.is_active, false) AND (p.deleted_at IS NULL)
    INTO v_role_id, v_group_id, v_is_active
    FROM public.profiles p
    WHERE p.id = NEW.id;

    -- A profile with no auth user (service row, or a profile created before the
    -- account existed) has nothing to mirror.
    IF NOT FOUND OR v_role_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF lower(v_role_id) = 'super_user' THEN
        RAISE EXCEPTION
            'refusing to mirror app metadata for a super_user profile (id=%)', NEW.id
            USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(raw_app_meta_data, '{}'::jsonb)
    INTO v_existing
    FROM auth.users
    WHERE id = NEW.id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Merge rather than replace, so keys this function does not own survive.
    v_meta := v_existing || jsonb_build_object(
        'role',      lower(v_role_id),
        'group_id',  v_group_id,
        'is_active', v_is_active);

    -- Skip the write when nothing changed, to avoid churning auth.users.
    IF v_meta = v_existing THEN
        RETURN NULL;
    END IF;

    UPDATE auth.users
    SET raw_app_meta_data = v_meta,
        updated_at         = now()
    WHERE id = NEW.id;

    RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.sync_profile_app_metadata() IS
    'Mirrors profiles.role_id / group_id / is_active into auth.users.raw_app_meta_data. '
    'SECURITY DEFINER because the app role cannot write auth.users. Refuses super_user by design.';

-- Dropped first so this migration is re-runnable.
DROP TRIGGER IF EXISTS trg_sync_profile_app_metadata ON public.profiles;

CREATE TRIGGER trg_sync_profile_app_metadata
AFTER INSERT OR UPDATE OF role_id, group_id, is_active, deleted_at
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_app_metadata();

-- Trigger bodies are not meant to be invoked directly: a manual call has no
-- NEW/OLD and would fail confusingly.
REVOKE ALL ON FUNCTION public.sync_profile_app_metadata() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profile_app_metadata() TO service_role;