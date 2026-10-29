BEGIN;

CREATE OR REPLACE FUNCTION public.replace_servant_permissions(
    p_profile_id uuid,
    p_permission_ids text[],
    p_granted_by uuid DEFAULT auth.uid()
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
        RAISE EXCEPTION 'PERMISSION_TARGET_INVALID' USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1 FROM unnest(v_ids) AS requested(permission_id)
        WHERE NOT (requested.permission_id = ANY(v_allowed))
    ) THEN
        RAISE EXCEPTION 'PERMISSION_NOT_ALLOWED' USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.servant_permissions
    WHERE profile_id = p_profile_id;

    INSERT INTO public.servant_permissions (profile_id, permission_id, granted_by)
    SELECT p_profile_id, permission_id, auth.uid()
    FROM unnest(v_ids) AS requested(permission_id);

    INSERT INTO public.audit_logs (
        actor_id, actor_name, actor_role, action, entity_type, entity_id, new_values
    )
    SELECT auth.uid(),
           COALESCE(actor.full_name, 'إدارة'),
           COALESCE(actor.role_id, 'admin'),
           'SERVANT_PERMISSIONS_REPLACED',
           'servant_permissions',
           p_profile_id::text,
           jsonb_build_object('permission_ids', v_ids)
    FROM public.profiles actor
    WHERE actor.id = auth.uid();

    RETURN jsonb_build_object(
        'profile_id', p_profile_id,
        'permission_ids', v_ids,
        'updated', true
    );
END;
$$;

REVOKE ALL ON FUNCTION public.replace_servant_permissions(uuid, text[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_servant_permissions(uuid, text[], uuid) TO authenticated, service_role;

COMMIT;
