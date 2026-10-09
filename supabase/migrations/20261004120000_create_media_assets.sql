-- ============================================================================
-- Migration: 20261004120000_create_media_assets.sql
-- Description: Central media assets registry for Google Drive storage integration
-- Backward compatible: Does not modify or drop existing tables or columns.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    resource_type VARCHAR(64) NOT NULL CHECK (
        resource_type IN (
            'CURRICULUM',
            'LECTURE_AUDIO',
            'LECTURE_ATTACHMENT',
            'BOOK_FILE',
            'BOOK_COVER',
            'RESEARCH_FILE',
            'MP3_TRACK',
            'GALLERY_ITEM',
            'GALLERY_COVER',
            'POST_IMAGE',
            'AVATAR',
            'BACKUP_ARCHIVE',
            'IMPORT_FILE',
            'GENERAL'
        )
    ),
    resource_id UUID NULL,
    
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'GOOGLE_DRIVE' CHECK (
        storage_provider IN ('GOOGLE_DRIVE', 'HOSTINGER_LOCAL')
    ),
    drive_file_id VARCHAR(128) NOT NULL,
    drive_folder_id VARCHAR(128) NOT NULL,
    
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    checksum_sha256 VARCHAR(64) NOT NULL,
    
    group_id SMALLINT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (
        status IN ('PENDING', 'ACTIVE', 'FAILED', 'DELETED')
    ),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_media_assets_resource ON public.media_assets (resource_type, resource_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_group ON public.media_assets (group_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_uploader ON public.media_assets (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_assets_drive_file ON public.media_assets (drive_file_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_assets_active_file ON public.media_assets (drive_file_id) WHERE (deleted_at IS NULL);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER trg_media_assets_updated_at
BEFORE UPDATE ON public.media_assets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS Policies
DROP POLICY IF EXISTS "Admin and SuperUser read all media assets" ON public.media_assets;
CREATE POLICY "Admin and SuperUser read all media assets"
ON public.media_assets
FOR SELECT
TO authenticated
USING (public.is_admin_or_super_user());

DROP POLICY IF EXISTS "Authenticated users read own group or global media assets" ON public.media_assets;
CREATE POLICY "Authenticated users read own group or global media assets"
ON public.media_assets
FOR SELECT
TO authenticated
USING (
    (deleted_at IS NULL) AND (
        (group_id IS NULL)
        OR (group_id = public.get_current_user_group())
        OR (uploaded_by = auth.uid())
    )
);

DROP POLICY IF EXISTS "Authorized staff insert media assets" ON public.media_assets;
CREATE POLICY "Authorized staff insert media assets"
ON public.media_assets
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin_or_super_user()
    OR (
        public.is_servant_or_secretariat() 
        AND (group_id = public.get_current_user_group() OR group_id IS NULL)
        AND (uploaded_by = auth.uid())
    )
);

DROP POLICY IF EXISTS "Owners and admins delete media assets" ON public.media_assets;
CREATE POLICY "Owners and admins delete media assets"
ON public.media_assets
FOR UPDATE
TO authenticated
USING (
    public.is_admin_or_super_user()
    OR (uploaded_by = auth.uid() AND group_id = public.get_current_user_group())
)
WITH CHECK (
    public.is_admin_or_super_user()
    OR (uploaded_by = auth.uid() AND group_id = public.get_current_user_group())
);
