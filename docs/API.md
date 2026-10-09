# API Reference — El Karooz Backend Gateway
===========================================

Base URL (Production): `https://api.elkaroozschool.com`  
Authentication: `Authorization: Bearer <Supabase_JWT>`

---

## 1. Storage & Media Endpoints

### `GET /storage/file/{asset_id}`
- **Description:** Streams a private file stored in Google Drive or storage cache with HTTP 206 Partial Content support.
- **Headers:** `Authorization: Bearer <JWT>`, `Range: bytes=0-1048576` (optional).
- **Responses:** `200 OK` / `206 Partial Content`, `401 INVALID_TOKEN`, `403 FORBIDDEN`, `404 ASSET_NOT_FOUND`.

### `POST /storage/upload`
- **Description:** Uploads a file, routes to Google Drive, and saves metadata in `media_assets`.
- **Form Data:** `file`, `group_id`, `resource_type`, `folder_type`.
- **Allowed Roles:** `admin`, `super_user`, `servant`, `secretariat`.

---

## 2. Backup & Restore Endpoints

### `POST /backup/create`
- **Description:** Triggers full database and storage export.
- **Allowed Roles:** `admin`, `super_user`.

### `POST /restore/preview`
- **Description:** Inspects and validates a uploaded backup archive without applying.
- **Allowed Roles:** `admin`, `super_user`.

### `POST /restore/execute`
- **Description:** Executes atomic transactional restore.
- **Allowed Roles:** `admin`, `super_user`.

---

## 3. Data Import & Export Endpoints

### `POST /import/trainees`
- **Description:** Batch imports trainees from CSV/Excel via atomic database procedure.
- **Allowed Roles:** `admin`, `super_user`.

### `GET /export/trainees`
- **Description:** Exports group trainee rosters with sanitized formula injection defense.
- **Allowed Roles:** `admin`, `super_user`.
