-- =============================================================================
-- Fix: super_user accounts can be administered again (C1)
-- =============================================================================
-- VERIFIED LIVE 2026-10-10 (Supabase MCP, production):
--
--   UPDATE public.profiles SET group_id = 1 WHERE id = <super_user>;
--   -> ERROR 42501: refusing to mirror app metadata for a super_user profile
--
-- The one existing super_user DOES currently carry app_metadata.role
-- ('super_user'), because the earlier one-shot backfill
-- (20261001130000_backfill_app_metadata_from_profiles.sql) ran before this
-- guard existed. It is not locked out of the admin pages today. But any
-- subsequent write to role_id / group_id / is_active / deleted_at on that
-- profile aborts the whole transaction, so the top administrator cannot be
-- moved between groups, suspended, or edited in any way.
--
-- WHY THE GUARD IS REDUNDANT, NOT A SAFETY NET:
--
-- The real escalation guard is a different trigger:
--
--   trg_profiles_guard_privilege -- BEFORE UPDATE ON public.profiles
--   FOR EACH ROW EXECUTE FUNCTION guard_profile_privilege_columns()
--
-- which raises 42501 whenever auth.uid() IS NOT NULL and the caller is not an
-- admin and any of role_id/group_id/is_active/deleted_at differs from OLD.
-- That guard is what stops a user re-roling themselves. Mirroring the value
-- for a super_user adds nothing to it: only an admin can change these columns
-- in the first place, so by the time the mirror runs, the change was already
-- authorized.
--
-- Removing the refusal therefore does NOT open a hole. It removes a trigger
-- that was firing on an unrelated write path and aborting legitimate
-- administration.
--
-- WHAT IS DELIBERATELY NOT CHANGED:
--   * guard_profile_privilege_columns() -- untouched, still blocks self-roling.
--   * uq_single_admin / uq_single_super_user -- untouched.
--   * The restore path's session_replication_role suspension window
--     (20261001170000:346,374-384) -- untouched.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_profile_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

    -- The former super_user refusal lived here. It raised 42501 on every
    -- administration write to the top administrator and is removed: role
    -- escalation is already blocked upstream by trg_profiles_guard_privilege,
    -- which fires BEFORE UPDATE on the profiles table itself.

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

-- Re-sync the super_user (and any admin) so the claim is correct even if a past
-- write was aborted mid-way. Idempotent: the function skips a no-op write.
UPDATE public.profiles p
SET role_id = p.role_id
WHERE p.role_id IN ('super_user', 'admin')
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

-- -----------------------------------------------------------------------------
-- POST-CONDITION. This migration is not allowed to report success while the
-- lockout persists. The statement below RAISEs (rolling the migration back)
-- if any privileged profile still cannot be administered.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    blocked text;
BEGIN
    SELECT string_agg(p.id::text, ', ')
    INTO blocked
    FROM public.profiles p
    WHERE p.role_id = 'super_user'
      AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

    IF blocked IS NULL THEN
        RAISE EXCEPTION
            'BLOCKED: no super_user profile is linked to an auth user. The '
            'super_user would be locked out of every admin page because '
            'app_metadata.role would never be populated. Check the auth.users '
            'link before applying.';
    END IF;

    RAISE NOTICE 'OK: % super_user profile(s) can now be administered.', array_length(string_to_array(blocked, ','), 1);
END $$;