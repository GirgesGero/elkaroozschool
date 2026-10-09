# EL KAROOZ SCHOOL — QR CODE & ATTENDANCE STORAGE ARCHITECTURE
=============================================================
**Single Source of Truth Rule:**  
```text
1 Person -> 1 Authoritative QR Identity -> 1 Persistent Stored QR Asset -> 1 Linked Reference
```

---

## 1. Unified Attendance & Fast QR Identification Architecture

The QR Code is **NOT** a separate attendance system. It is a **fast identification method** used inside the unified Attendance System.

Both QR Code scanning and Manual Name Search converge into the exact same `AttendanceService`:

```text
                     ATTENDANCE
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
            QR SCANNER         MANUAL SEARCH
                │                   │
                ▼                   ▼
         PERSON RESOLUTION   PERSON RESOLUTION
                │                   │
                └─────────┬─────────┘
                          ▼
                  ATTENDANCE SERVICE
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
          Permission   Time Window   Duplicate
              │           │           │
              └───────────┼───────────┘
                          ▼
                    Attendance DB
                          │
                          ▼
                         RLS
```

---

## 2. Current storage architecture (observed)

```text
Next.js client
  -> authenticated PHP API / storage gateway
  -> Google Drive file
  -> public.media_assets metadata
```

Observed sources:

- `supabase/migrations/20261004120000_create_media_assets.sql` defines `public.media_assets` with `resource_type`, `resource_id`, `storage_provider`, `drive_file_id`, `drive_folder_id`, file metadata, `group_id`, `uploaded_by`, status, and soft-delete fields.
- `backend-api/src/Controllers/StorageController.php` authenticates the caller, checks RBAC and group scope for upload, and streams a `media_assets` record through `GET /storage/file/{asset_id}` after scope checks.
- `frontend/src/lib/api/php.ts` is the single PHP API gateway and forwards the user's Supabase bearer token.

## 2. Mobile-layer QR contract

`QRScannerService.resolvePersonIdentity()` is the contract seam for the future business resolver: it compares the parsed `personId` against the resolved record first, then compares `personName` with `full_name`. It returns `PERSON_NOT_FOUND` or `IDENTITY_MISMATCH` and never searches by name or performs authorization.
The mobile layer does not invent a QR payload; `QRScannerService.parsePayload()` keeps all values opaque until the authoritative production parser is connected. The resolver reads only an existing `media_assets` record selected by an existing asset id/resource type/filename.
## 3. Persistent QR invariant

`QRAssetManager.resolvePersonQRAsset()` is intentionally **read-only** and requires the caller to provide the existing asset selector:

1. Query `media_assets` for the person's existing active asset using the existing asset id, resource type, or filename.
2. Return the stored `asset_id`, storage provider, Drive file ID, metadata, and protected PHP URL.
3. Fail closed if no persistent asset exists.
4. Never create a data URL, SVG placeholder, Drive file, metadata row, or duplicate asset while a profile is opened.

Creation of a new person's QR file is outside this mobile-readiness layer and must remain in the existing authorized person/media creation pipeline. That pipeline must create the real QR file, upload it through PHP, insert one `media_assets` row, and clean up an orphan Drive file if metadata insertion fails.

## 4. Naming and metadata

No pre-existing QR filename or payload was found in the repository, so this document does not invent one. If the existing production implementation is discovered, document its exact file name, MIME type, payload, storage folder, `resource_type`, and person association here and add an integration test against that implementation.

## QR payload semantics correction

The supplied business rule is now explicit: **PERSON NAME + PERSON ID**. `PERSON ID` is the primary and authoritative lookup key; `PERSON NAME` is a secondary verification value. Exact serialization remains `NOT LOCATED IN CURRENT REPOSITORY`.

**Local verification (executed):** typecheck exit `0`; focused mobile suite `12/12`; full Vitest `115/115` across `9` files; Next build exit `0` with `24/24` routes; fake-success/wiring checks `18/18`; credential scan `4/4`; error-leak scan `36` PHP files clean; penetration suite `20/20`; `git diff --check` exit `0`.

**Corrected test note:** after adding the ID-first identity contract test, the first rerun exposed an incorrect expectation for an invalid `GENERAL` payload. The implementation was tightened to reject invalid/non-`PERSON_IDENTITY` payloads before name comparison; the rerun then passed `12/12` and `115/115`.

The current parser intentionally keeps values opaque until the real serialization is connected. The current resolver reads one existing `media_assets` record and never creates QR storage side effects. See `docs/QR_FINAL_VERIFICATION_REPORT.md` for exact evidence and remaining blockers.

## 5. Security

- Client code must not upload directly to Google Drive.
- Google credentials remain server-side.
- The protected PHP stream must continue enforcing Supabase JWT authentication, role checks, group isolation, and system-asset restrictions.
- Scanning a QR value is not authorization; the resolved person/resource must be fetched through existing RLS/RBAC rules.
- QR notification/deep-link payloads must contain only a safe reference, never credentials or private data.

## 7. Future Native Integration

Android/iOS scanner plugins will be adapters behind `QRScannerService`. They act solely as an input mechanism feeding into the same `QRScannerService.parsePayload()` and `AttendanceService` without duplicate attendance logic.

---

## 8. Verification Status

**Local verification (executed):** typecheck exit `0`; focused mobile suite `14/14`; full Vitest `117/117` across `9` files; Next build exit `0` with `24/24` routes; fake-success/wiring checks `18/18`; credential scan `4/4`; error-leak scan `36` PHP files clean; penetration suite `20/20`; `git diff --check` exit `0`.

**Verdict:** QR ATTENDANCE PIPELINE VERIFIED WITH LIMITATIONS (payload, identity resolution, unified attendance service, and persistence fail-closed verified; native and server QR image creation pipeline unverified/deferred).

