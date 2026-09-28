-- 002_core_roles_groups.sql
-- Define static roles and academic study groups

CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(32) PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.groups (
    id SMALLINT PRIMARY KEY, -- 1 = الفرقة الأولى, 2 = الفرقة الثانية, 3 = الفرقة الثالثة
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_group_id CHECK (id IN (1, 2, 3))
);
