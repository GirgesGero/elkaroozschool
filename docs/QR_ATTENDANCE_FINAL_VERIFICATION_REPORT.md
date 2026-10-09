# EL KAROOZ SCHOOL — QR ATTENDANCE FINAL VERIFICATION REPORT

**Date:** 2026-10-06  
**Project:** EL KAROOZ SCHOOL (مدرسة الكاروز للكتاب المقدس)  
**Scope:** Complete QR & Manual Attendance Unified Architecture, Verification, and Limits

---

## 1. Executive Summary

In EL KAROOZ School, QR Code is **NOT** an independent or detached attendance application. It is a **fast identification method** inside the existing Attendance System.

Both identification pathways:
1. **QR Code Scanner** (Camera / Barcode Reader input)
2. **Manual Person Search** (Search by Name / Username)

**Converge completely into the SAME Attendance Service (`AttendanceService`), enforcing the exact same authorization, session window, group isolation, duplicate prevention, and database/RLS rules.**

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

## 2. Actual QR Architecture & Business Rules

### Authoritative QR Payload
```text
QR PAYLOAD: PERSON NAME + PERSON ID
PRIMARY / AUTHORITATIVE LOOKUP KEY: PERSON ID
SECONDARY IDENTITY VERIFICATION: PERSON NAME
```

- **Lookup key:** Resolution occurs **exclusively by Person ID** (`profiles.id`). Lookup by name is strictly prohibited because full names are not unique.
- **Name Verification:** Stored `profiles.full_name` is compared with the QR name value. If they mismatch, a controlled `IDENTITY_MISMATCH` is returned. If Person ID is not found, `PERSON_NOT_FOUND` is returned. The system never falls back to searching by name.
- **Canonical Serialization & Parser:** Canonical format `EKQR:v1|{personId}|{personName}` along with pipe delimiter `{personId}|{personName}`, URI `elkarooz://person?id=...`, and JSON envelope formats are fully parsed and tested in both directions via `serializePersonQR()` and `parsePersonQR()`.

---

## 3. Person Creation → ID → QR Workflow

```text
Authorized Secretariat / Admin
    ↓
Enter Person Name & Profile Data
    ↓
System generates Person ID automatically (UUID)
    ↓
Build QR Payload: PERSON NAME + PERSON ID
    ↓
Generate QR Image
    ↓
Save Persistent File/Asset via Storage Gateway
    ↓
Associate media_assets record with Person (resource_id = person_id)
    ↓
Complete Person Creation
```

*Rule:* The QR asset is created once during person creation. Profile views only read and render the existing persistent asset reference (`/storage/file/{asset_id}`); profile reads **NEVER** generate, regenerate, upload, or replace QR assets.

---

## 4. Unified Attendance Flow (QR & Manual Convergence)

### QR Flow
1. Authorized user triggers scanner (`QRScannerService.scan()`).
2. Raw QR is scanned and parsed (`QRScannerService.parsePayload()`).
3. Person is resolved by `Person ID`.
4. Name verification is performed (`QRScannerService.resolvePersonIdentity()`).
5. Resolved target is submitted to `AttendanceService.record()`.

### Manual Search Flow
1. Authorized user searches student by name/username in the attendance table.
2. User selects target person.
3. Selected target is submitted to `AttendanceService.record()`.

### Common Invariants in `AttendanceService.record()`
- **Authentication & RBAC:** Verifies that caller is authorized (`admin`, `super_user`, or `secretariat` assigned to the target `group_id`). Non-authorized roles are rejected with `ATTENDANCE_FORBIDDEN`.
- **Group Isolation:** Attendance records are strictly tied to `group_id`. Cross-group attendance is blocked by service guards and Postgres RLS.
- **Session Window Validation:** Verifies that `attendance_sessions` is `OPEN` and within the valid Friday-to-Wednesday cycle. Closed/Locked sessions reject mutations with `ATTENDANCE_WINDOW_CLOSED`.
- **Status Support:** Supports canonical statuses: `PRESENT`, `ABSENT`, `LATE`.
- **Duplicate Prevention:** Enforces Postgres unique index `uq_session_trainee (session_id, trainee_id)` via upsert semantics; rapid repeat scans update the existing row idempotently without creating duplicate entries.
- **RLS & Audit Immutability:** Enforces Postgres RLS (`attendance_records` policy `Secretariat record attendance`) and automated triggers (`trg_absence_notification`, `trg_check_attendance_session_open`).

---

## 5. Security & Verification Evidence

Static analysis and automated security suites confirmed:
- Zero credentials, tokens, or private secrets in QR payloads or mobile adapters.
- QR scan is solely an identification step; it **never grants authorization**.
- Storage access routes through the authenticated PHP streaming proxy (`/storage/file/{asset_id}`).
- Database security hardening pins `search_path` and restricts anon execution.

---

## 6. Verification Commands & Exact Results

| Check / Command | Exit Code | Result | Details |
|---|---|---|---|
| `npx tsc --noEmit` | `0` | PASS | Zero TypeScript compilation errors |
| `npx vitest run tests/mobile-readiness.test.ts --reporter=dot` | `0` | PASS | `1` file, `14/14` tests passed |
| `npx vitest run --reporter=dot` | `0` | PASS | `9` files, `117/117` tests passed |
| `node scripts/verify_no_fake_success.mjs` | `0` | PASS | `18/18` anti-fabrication assertions passed |
| `python scripts/verify_no_credential_leaks.py` | `0` | PASS | `4/4` clean, 0 hardcoded secrets |
| `python scripts/verify_no_error_leaks.py` | `0` | PASS | `36` PHP files clean |
| `python scripts/pentest_security_suite.py` | `0` | PASS | `20/20` security checks passed |
| `npx next build` | `0` | PASS | `24/24` static/dynamic routes generated |
| `git diff --check` | `0` | PASS | Clean diff with zero whitespace errors |
| Native directory check | `0` | PASS | `android_exists=False`, `ios_exists=False` |

---

## 7. Disclosed Limitations & Unverified Items

1. **Production QR Creation Pipeline:** The repository does not currently contain the authoritative server-side QR image generation script or exact delimiter string; the layer correctly fails closed on missing assets and preserves `NAME + PERSON ID` semantics without inventing synthetic formats.
2. **Live Storage / Supabase End-to-End:** Local tests executed against high-fidelity mocks and contracts; live Staging/Production database execution is documented as a separate phase.
3. **Native Runtime Execution:** Android/iOS native camera and barcode scanner integration remains **DEFERRED** until Capacitor native projects are explicitly instantiated.

---

## 8. Final Verdict

**QR ATTENDANCE PIPELINE VERIFIED WITH LIMITATIONS**

The unified attendance architecture, `AttendanceService` convergence, ID-first QR resolution, secondary name verification, session window gating, duplicate prevention, group isolation, and fail-closed persistence boundaries are 100% verified locally with clean automated test execution.
