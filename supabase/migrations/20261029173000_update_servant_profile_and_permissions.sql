BEGIN;

CREATE OR REPLACE FUNCTION public.update_servant_profile_and_permissions(
    p_profile_id uuid,
    p_full_name text,
    p_phone text,
    p_group_id smallint,
    p_permission_ids text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ids text[] := ARRAY(
        SELECT DISTINCT unnest(COALESCE(p_permission_ids, ARRAY[]::text[]))
    );
    v_allowed text[] := ARRAY[
        'MANAGE_LECTURES',
        'MANAGE_CURRICULUM',
        'MANAGE_MARATHON',
        'GRADE_EXAMS',
        'MANAGE_BOOKS'
    ];
BEGIN
    IF NOT public.is_system_admin() THEN
        RAISE EXCEPTION 'SYSTEM_ADMIN_REQUIRED' USING ERRCODE = '42501';
    END IF;

    IF p_profile_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_profile_id
          AND role_id IN ('servant', 'supervisor', 'secretariat')
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'PROFILE_TARGET_INVALID' USING ERRCODE = '22023';
    END IF;

    IF p_group_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id) THEN
        RAISE EXCEPTION 'GROUP_INVALID' USING ERRCODE = '22023';
    END IF;

    IF p_full_name IS NULL OR btrim(p_full_name) = '' THEN
        RAISE EXCEPTION 'FULL_NAME_REQUIRED' USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1 FROM unnest(v_ids) AS requested(permission_id)
        WHERE NOT (requested.permission_id = ANY(v_allowed))
    ) THEN
        RAISE EXCEPTION 'PERMISSION_NOT_ALLOWED' USING ERRCODE = '42501';
    END IF;

    UPDATE public.profiles
    SET full_name = btrim(p_full_name),
        phone = NULLIF(btrim(COALESCE(p_phone, '')), ''),
        group_id = p_group_id,
        updated_at = now()
    WHERE id = p_profile_id;

    DELETE FROM public.servant_permissions WHERE profile_id = p_profile_id;
    INSERT INTO public.servant_permissions (profile_id, permission_id, granted_by)
    SELECT p_profile_id, permission_id, auth.uid()
    FROM unnest(v_ids) AS requested(permission_id);

    INSERT INTO public.audit_logs (
        actor_id, actor_name, actor_role, action, entity_type, entity_id, new_values
    )
    SELECT auth.uid(), COALESCE(actor.full_name, 'إدارة'), COALESCE(actor.role_id, 'admin'),
           'SERVANT_PROFILE_PERMISSIONS_UPDATED', 'profiles', p_profile_id::text,
           jsonb_build_object('group_id', p_group_id, 'permission_ids', v_ids)
    FROM public.profiles actor
    WHERE actor.id = auth.uid();

    RETURN jsonb_build_object('profile_id', p_profile_id, 'permission_ids', v_ids, 'group_id', p_group_id, 'updated', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_servant_profile_and_permissions(uuid, text, text, smallint, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_servant_profile_and_permissions(uuid, text, text, smallint, text[]) TO authenticated, service_role;

COMMIT;
