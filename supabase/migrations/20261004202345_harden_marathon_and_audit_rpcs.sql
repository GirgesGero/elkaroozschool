-- LOCAL PROPOSAL ONLY — do not apply until this project is confirmed non-production
-- staging and the full migration/schema reconciliation is approved.
-- The connected MCP project host now matches frontend/.env.local and the owner's
-- confirmed host. Staging-versus-production classification is still unknown.
-- This proposal has not been executed against Supabase.

-- Keep the original result-building implementation intact, but make it unreachable
-- to user JWTs. The wrapper below enforces self/group/permission scope first.
ALTER FUNCTION public.get_trainee_marathon_state(uuid, uuid)
    RENAME TO _unsafe_get_trainee_marathon_state;

REVOKE ALL ON FUNCTION public._unsafe_get_trainee_marathon_state(uuid, uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._unsafe_get_trainee_marathon_state(uuid, uuid)
    TO service_role;

CREATE OR REPLACE FUNCTION public.get_trainee_marathon_state(
    p_marathon_id uuid,
    p_trainee_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_actor_id uuid := auth.uid();
    v_actor_role varchar;
    v_actor_group_id smallint;
BEGIN
    -- Preserve trusted backend access; ordinary user tokens must pass a scope check.
    IF auth.role() = 'service_role' THEN
        RETURN public._unsafe_get_trainee_marathon_state(p_marathon_id, p_trainee_id);
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;

    SELECT p.role_id, p.group_id
      INTO v_actor_role, v_actor_group_id
      FROM public.profiles AS p
     WHERE p.id = v_actor_id
       AND p.is_active IS TRUE
       AND p.deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;

    -- Admins retain the existing cross-group operational view.
    IF public.is_admin_or_super_user() THEN
        RETURN public._unsafe_get_trainee_marathon_state(p_marathon_id, p_trainee_id);
    END IF;

    -- A user may read only their own state, and only for a marathon in their group.
    IF v_actor_id = p_trainee_id
       AND EXISTS (
            SELECT 1
              FROM public.marathons AS m
             WHERE m.id = p_marathon_id
               AND m.group_id = v_actor_group_id
               AND m.deleted_at IS NULL
       ) THEN
        RETURN public._unsafe_get_trainee_marathon_state(p_marathon_id, p_trainee_id);
    END IF;

    -- A servant may view a trainee's state only with the existing permission
    -- vocabulary and only when both the trainee and marathon belong to that group.
    IF v_actor_role = 'servant'
       AND public.has_servant_permission('MANAGE_MARATHON')
       AND EXISTS (
            SELECT 1
              FROM public.profiles AS trainee
              JOIN public.marathons AS m
                ON m.group_id = trainee.group_id
             WHERE trainee.id = p_trainee_id
               AND trainee.role_id = 'trainee'
               AND trainee.deleted_at IS NULL
               AND m.id = p_marathon_id
               AND m.group_id = v_actor_group_id
               AND m.deleted_at IS NULL
       ) THEN
        RETURN public._unsafe_get_trainee_marathon_state(p_marathon_id, p_trainee_id);
    END IF;

    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
END;
$function$;

REVOKE ALL ON FUNCTION public.get_trainee_marathon_state(uuid, uuid)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trainee_marathon_state(uuid, uuid)
    TO authenticated, service_role;

-- Audit writes are available to administrators and trusted backend service-role
-- calls only. Actorless service-role events are labelled as system, never admin.
CREATE OR REPLACE FUNCTION public.log_operational_event(
    p_operation character varying,
    p_entity_type character varying,
    p_entity_id character varying,
    p_status character varying,
    p_details jsonb,
    p_checksum character varying DEFAULT NULL::character varying
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_actor_id uuid := auth.uid();
    v_request_role text := auth.role();
    v_actor_role varchar;
    v_actor_name varchar;
    v_log_id bigint;
BEGIN
    IF v_request_role IS DISTINCT FROM 'service_role'
       AND NOT public.is_admin_or_super_user() THEN
        RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;

    IF v_actor_id IS NOT NULL THEN
        SELECT p.role_id, p.full_name
          INTO v_actor_role, v_actor_name
          FROM public.profiles AS p
         WHERE p.id = v_actor_id
           AND p.deleted_at IS NULL;
    END IF;

    IF v_actor_role IS NULL THEN
        IF v_request_role = 'service_role' THEN
            v_actor_name := 'النظام الآلي';
            v_actor_role := 'system';
        ELSE
            RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
        END IF;
    END IF;

    INSERT INTO public.audit_logs (
        actor_id,
        actor_name,
        actor_role,
        action,
        entity_type,
        entity_id,
        new_values
    ) VALUES (
        v_actor_id,
        v_actor_name,
        v_actor_role,
        p_operation,
        p_entity_type,
        p_entity_id,
        jsonb_build_object(
            'status', p_status,
            'details', p_details,
            'checksum', p_checksum,
            'timestamp', now()
        )
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.log_operational_event(
    character varying, character varying, character varying,
    character varying, jsonb, character varying
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_operational_event(
    character varying, character varying, character varying,
    character varying, jsonb, character varying
) TO authenticated, service_role;
