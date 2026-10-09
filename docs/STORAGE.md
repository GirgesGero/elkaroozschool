# Storage Architecture & Media Management
=========================================

## 1. Storage Tiers

1. **Cloud Object Storage (Primary):** Google Drive via Service Account with scope `drive.file`.
2. **Metadata Repository:** Supabase `public.media_assets` table.
3. **Local Scratch / Backup Cache:** `/home/[USER]/storage` on Hostinger with strict directory permissions and `.htaccess` denial.

## 2. Media Asset Lifecycle

```text
Upload (Next.js) 
  → PHP Storage Controller (Validate MIME, Size, Quota)
  → GroupScopeMiddleware (Check Actor Group)
  → Google Drive Upload (Stream directly via Service Account)
  → Insert Supabase media_assets Record
  → Return Asset ID to Client
```

## 3. Streaming & Partial Content (HTTP 206)

Clients stream MP3 audio and PDF books via `/storage/file/{asset_id}`.
The PHP controller validates the caller's JWT, resolves the file ID from `media_assets`, verifies group tenancy, and streams chunks from Google Drive with byte-range headers (`Content-Range`, `Accept-Ranges: bytes`).
