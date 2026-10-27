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
