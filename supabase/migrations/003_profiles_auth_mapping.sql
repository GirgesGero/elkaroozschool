-- 003_profiles_auth_mapping.sql
-- Profiles table linked to Supabase Auth and enforcing unique constraints

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(64) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    birth_date DATE NOT NULL,
    phone VARCHAR(32),
    address TEXT,
    church VARCHAR(150),
    confession_father VARCHAR(150),
    role_id VARCHAR(32) NOT NULL REFERENCES public.roles(id) ON UPDATE CASCADE,
    group_id SMALLINT NOT NULL REFERENCES public.groups(id) ON UPDATE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_profiles_username UNIQUE (username)
);

-- Unique Partial Indexes to strictly enforce Single Admin and Single Super User
CREATE UNIQUE INDEX IF NOT EXISTS uq_single_admin ON public.profiles(role_id) 
WHERE role_id = 'admin' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_single_super_user ON public.profiles(role_id) 
WHERE role_id = 'super_user' AND deleted_at IS NULL;
