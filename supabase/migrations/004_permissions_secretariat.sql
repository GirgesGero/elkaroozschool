-- 004_permissions_secretariat.sql
-- Permissions table, independent servant delegations, and group secretariats

CREATE TABLE IF NOT EXISTS public.permissions (
    id VARCHAR(64) PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.servant_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_id VARCHAR(64) NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_servant_permission UNIQUE (profile_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.group_secretariat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id SMALLINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    appointed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    appointed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_secretariat_profile UNIQUE (profile_id),
    CONSTRAINT uq_secretariat_profile_group UNIQUE (profile_id, group_id)
);

-- Validation Trigger for Maximum 3 Active Secretariats per Group
CREATE OR REPLACE FUNCTION check_secretariat_group_limit()
RETURNS TRIGGER AS $$
DECLARE
    active_count INT;
BEGIN
    SELECT COUNT(*) INTO active_count
    FROM public.group_secretariat
    WHERE group_id = NEW.group_id AND is_active = true AND id != NEW.id;

    IF active_count >= 3 THEN
        RAISE EXCEPTION 'لا يمكن تعيين أكثر من 3 أعضاء سكرتارية لنفس الفرقة الدراسية (الفرقة %)', NEW.group_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_secretariat_limit ON public.group_secretariat;
CREATE TRIGGER trg_check_secretariat_limit
BEFORE INSERT OR UPDATE ON public.group_secretariat
FOR EACH ROW
EXECUTE FUNCTION check_secretariat_group_limit();
