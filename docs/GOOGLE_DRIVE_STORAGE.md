# Google Drive Storage Integration & Architecture
=====================================================
**Project:** EL KAROOZ SCHOOL (مدرسة الكاروز للكتاب المقدس)  
**Phase:** 1 — Production Foundation  
**Status:** IMPLEMENTED & TESTED (32/32 Test Probes PASS)

---

## 1. Architectural Overview

Google Drive serves as the **Primary Secure Cloud File Storage** for El Karooz School. File bytes are stored in Google Drive, while metadata is tracked centrally in Supabase PostgreSQL (`public.media_assets`). All file read/write access is mediated exclusively by the PHP Backend Proxy without exposing Google credentials or private Drive IDs to the browser.

```text
┌────────────────────────────────────────────────────────┐
│               Frontend (Next.js PWA)                   │
└──────────────────────────┬─────────────────────────────┘
                           │ 1. Bearer JWT (Authenticated User)
                           ▼
┌────────────────────────────────────────────────────────┐
│             Backend API Gateway (PHP 8.3)              │
│  - JwtAuthMiddleware: Pins HS256, validates signature  │
│  - GroupScopeMiddleware: Enforces tenant isolation     │
│  - RbacMiddleware: Verifies user role / permissions    │
└──────────────────────────┬─────────────────────────────┘
                           │ 2. Local RS256 JWT Token Exchange
                           ▼
┌────────────────────────────────────────────────────────┐
│                Google OAuth2 Token Service             │
│  - Scope: https://www.googleapis.com/auth/drive.file   │
│  - Grant Type: urn:ietf:params:oauth:grant-type:jwt-bearer
│  - Token Lifetime: 3600s (Cached 3300s locally)        │
└──────────────────────────┬─────────────────────────────┘
                           │ 3. Authenticated Stream / Upload
                           ▼
┌────────────────────────────────────────────────────────┐
│               Google Drive API (v3)                    │
│  - Streaming Proxy with HTTP 206 Range support         │
│  - Group-isolated folder hierarchies                   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Credential Security

| Parameter | Configuration / Policy |
| :--- | :--- |
| **Account Type** | Google Cloud Service Account (`@appspot.gserviceaccount.com` or `@*.iam.gserviceaccount.com`) |
| **Authentication Method** | Self-signed JWT (RS256) token exchange against `https://oauth2.googleapis.com/token` |
| **OAuth2 Scope** | Least-privilege scope: `https://www.googleapis.com/auth/drive.file` |
| **Token Caching** | Cached locally in memory / file cache for 55 minutes to minimize auth roundtrips |
| **Client Exposure** | **ZERO.** Google private keys and tokens never leave the PHP server environment |
| **Drive File ID Sanitization** | Strict regex pattern: `/^[a-zA-Z0-9_-]+$/` against injection attacks |

---

## 3. Directory & Folder Hierarchy

```text
EL KAROOZ ROOT DRIVE
├── GROUP 1 (الفرقة الأولى)
│   ├── Images/
│   ├── Gallery/
│   ├── MP3/
│   ├── Lectures/
│   └── Files/
├── GROUP 2 (الفرقة الثانية)
│   ├── Images/
│   ├── Gallery/
│   ├── MP3/
│   ├── Lectures/
│   └── Files/
├── GROUP 3 (الفرقة الثالثة)
│   ├── Images/
│   ├── Gallery/
│   ├── MP3/
│   ├── Lectures/
│   └── Files/
├── BOOKS (المكتبة الرقمية العامة)
├── BIBLE (دراسات وتفاسير الكتاب المقدس)
└── SYSTEM (النسخ الاحتياطي المشفر وملفات الاستيراد)
```

---

## 4. Central Metadata Schema (`public.media_assets`)

All media files reference an entry in `public.media_assets`:

```sql
CREATE TABLE public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'GOOGLE_DRIVE',
    drive_file_id VARCHAR(128) NOT NULL,
    drive_folder_id VARCHAR(128),
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    group_id SMALLINT REFERENCES public.groups(id), -- NULL = Global
    resource_type VARCHAR(64) NOT NULL, -- 'MP3', 'IMAGE', 'BOOK', 'LECTURE', etc.
    resource_id UUID,
    uploaded_by UUID REFERENCES public.profiles(id),
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

---

## 5. Streaming Engine & HTTP 206 Partial Content

The PHP storage proxy (`StorageController::streamFile`) implements RFC 7233 compliant byte-range streaming:
- **Audio Seeking (MP3):** Allows immediate jumping to any timestamp without downloading the entire file.
- **PDF Viewing:** Supports page-by-page partial loading for heavy books and research documents.
- **Header Ordering:** Status `206 Partial Content`, `Content-Range`, `Content-Length`, and `Accept-Ranges: bytes` headers are emitted before flushing bytes to prevent header contamination.

---

## 6. Access Control & Tenant Isolation Matrix

| Role | Global Media (`group_id IS NULL`) | Own Group Media | Other Group Media | System Archives (`BACKUP_ARCHIVE`) |
| :--- | :---: | :---: | :---: | :---: |
| **Admin** | Read / Write | Read / Write | Read / Write | Read / Write |
| **Super User** | Read / Write | Read / Write | Read / Write | Read / Write |
| **Servant** | Read / Write | Read / Write | **FORBIDDEN (403)** | **FORBIDDEN (403)** |
| **Secretariat** | Read / Write | Read / Write | **FORBIDDEN (403)** | **FORBIDDEN (403)** |
| **Trainee** | Read Only | Read Only | **FORBIDDEN (403)** | **FORBIDDEN (403)** |
| **Anonymous** | **REFUSED (401)** | **REFUSED (401)** | **REFUSED (401)** | **REFUSED (401)** |

---

## 7. Verification Evidence

- `scripts/verify_google_drive_streaming.php`: **32/32 PASS** (File ID sanitization, fail-closed handling, UUID validation, scope boundaries).
- `frontend/tests/storage.test.ts`: **2/2 PASS** (Frontend proxy helper contracts).
- `scripts/pentest_security_suite.py`: **20/20 PASS** (Path containment, zero eval/shell execution, Least Privilege ACL).
