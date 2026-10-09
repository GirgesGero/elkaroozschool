/**
 * Storage & Media Assets Types for Google Drive Integration
 */

export type StorageResourceType =
  | 'CURRICULUM'
  | 'LECTURE_AUDIO'
  | 'LECTURE_ATTACHMENT'
  | 'BOOK_FILE'
  | 'BOOK_COVER'
  | 'RESEARCH_FILE'
  | 'MP3_TRACK'
  | 'GALLERY_ITEM'
  | 'GALLERY_COVER'
  | 'POST_IMAGE'
  | 'AVATAR'
  | 'BACKUP_ARCHIVE'
  | 'IMPORT_FILE'
  | 'GENERAL';

export type StorageProvider = 'GOOGLE_DRIVE' | 'HOSTINGER_LOCAL';

export type MediaAssetStatus = 'PENDING' | 'ACTIVE' | 'FAILED' | 'DELETED';

export interface MediaAsset {
  id: string;
  resource_type: StorageResourceType;
  resource_id?: string | null;
  storage_provider: StorageProvider;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string;
  group_id?: number | null;
  uploaded_by: string;
  status: MediaAssetStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface StorageUploadResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    asset_id: string;
    filename: string;
    file_url: string;
    file_size: number;
    mime_type: string;
    sha256: string;
    group_id?: number | null;
    resource_type: StorageResourceType;
  };
  code?: string;
  correlation_id?: string;
}
