-- 20261006120000_create_trainee_profile_rpc.sql
-- Enables Secretariat (for their assigned group) and Admins/Super Users (for any group) to create new trainee accounts.

CREATE OR REPLACE FUNCTION public.create_trainee_profile(
    p_username VARCHAR,
    p_full_name VARCHAR,
    p_group_id SMALLINT,
    p_birth_date DATE,
    p_phone VARCHAR DEFAULT NULL,
    p_confession_father VARCHAR DEFAULT NULL,
    p_church VARCHAR DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_password VARCHAR DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role VARCHAR;
    v_actor_name VARCHAR;
    v_username VARCHAR := TRIM(LOWER(COALESCE(p_username, '')));
    v_full_name VARCHAR := TRIM(COALESCE(p_full_name, ''));
    v_user_id UUID;
    v_auth_email VARCHAR;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
    END IF;

    -- Group Isolation & RBAC check:
    -- Caller must be Admin / Super User OR active Secretariat of target group p_group_id
    IF NOT (public.is_admin_or_super_user() OR public.is_secretariat_of_group(p_group_id)) THEN
        RAISE EXCEPTION 'Unauthorized: You are not authorized to create trainees for group %', p_group_id USING ERRCODE = '42501';
    END IF;

    -- Validation
    IF v_username = '' OR LENGTH(v_username) < 3 THEN
        RAISE EXCEPTION 'اسم المستخدم يجب ألا يقل عن 3 أحرف' USING ERRCODE = '22023';
    END IF;

    IF v_full_name = '' THEN
        RAISE EXCEPTION 'الاسم بالكامل مطلوب' USING ERRCODE = '22023';
    END IF;

    IF p_group_id NOT IN (1, 2, 3) THEN
        RAISE EXCEPTION 'الفرقة الدراسية غير صالحة' USING ERRCODE = '22023';
    END IF;

    -- Check if username already exists
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
        RAISE EXCEPTION 'اسم المستخدم "%" مسجل مسبقاً. يرجى اختيار اسم مستخدم آخر.', v_username USING ERRCODE = '23505';
    END IF;

    SELECT role_id, full_name INTO v_actor_role, v_actor_name
    FROM public.profiles WHERE id = v_actor_id;

    -- Create Auth User
    v_user_id := gen_random_uuid();
    v_auth_email := v_username || '@elkarooz-school.com';

    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_auth_email,
        crypt(COALESCE(NULLIF(p_password, ''), 'Trainee123!'), gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('username', v_username, 'full_name', v_full_name),
        NOW(),
        NOW()
    );

    INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
        v_user_id,
        v_user_id::text,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_auth_email),
        'email',
        NOW(),
        NOW(),
        NOW()
    );

    INSERT INTO public.profiles (
        id, username, full_name, role_id, group_id, confession_father, phone, birth_date, church, address, is_active, created_at, updated_at
    ) VALUES (
        v_user_id, v_username, v_full_name, 'trainee', p_group_id, p_confession_father, p_phone, COALESCE(p_birth_date, '2000-01-01'::date), p_church, p_address, true, NOW(), NOW()
    );

    -- Log Audit
    INSERT INTO public.audit_logs (
        actor_id, actor_name, actor_role, action, entity_type, entity_id, new_values
    ) VALUES (
        v_actor_id, v_actor_name, v_actor_role, 'CREATE_TRAINEE_PROFILE', 'profiles', v_user_id::text,
        jsonb_build_object(
            'trainee_id', v_user_id,
            'username', v_username,
            'full_name', v_full_name,
            'group_id', p_group_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'id', v_user_id,
        'username', v_username,
        'full_name', v_full_name,
        'group_id', p_group_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_trainee_profile(VARCHAR, VARCHAR, SMALLINT, DATE, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_trainee_profile(VARCHAR, VARCHAR, SMALLINT, DATE, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR) TO authenticated, service_role;
