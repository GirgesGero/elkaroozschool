-- 013_audit_backup_import.sql
-- Immutable Audit Log (excluding login/logout), Encrypted Backup Records, and Trainee Bulk Import History

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name VARCHAR(150),
    actor_role VARCHAR(32),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.backup_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(200) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_type VARCHAR(32) NOT NULL DEFAULT 'HOSTINGER', -- 'HOSTINGER' | 'DOWNLOAD_ONLY'
    storage_path TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED' | 'FAILED'
    checksum_sha256 VARCHAR(64) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(200) NOT NULL,
    original_file_storage_path TEXT NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    new_accounts_count INT NOT NULL DEFAULT 0,
    updated_accounts_count INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS' | 'FAILED'
    error_details JSONB,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
