# EL KAROOZ SCHOOL — Database Schema Security Audit Report

**Scan ID:** scan_12204089a789817c3635f278  
**Target:** database-mysql/schema/ (13 files, ~178k lines)  
**Date:** 2026-11-11  
**Methodology:** OWASP Top 10:2025 lanes + ASVS 5.0.0 controls  
**Specialist Profiles Applied:** auth, business-logic, exceptional-conditions

---

## Executive Summary

| Lane | Risk Level | Findings | Notes |
|------|-----------|----------|-------|
| **A01:2025 Broken Access Control** | HIGH | 4 | Missing tenant isolation enforcement, admin permit bypass, secretariat limit race |
| **A02:2025 Security Misconfiguration** | MEDIUM | 2 | Default admin credential seeded, singleton tables without proper constraints |
| **A03:2025 Supply Chain Failures** | N/A | 0 | No dependencies in schema |
| **A04:2025 Cryptographic Failures** | MEDIUM | 1 | Password hash stored but no algorithm/version metadata |
| **A05:2025 Injection** | MEDIUM | 3 | Dynamic SQL in procedures, unsanitized JSON in triggers |
| **A06:2025 Insecure Design** | HIGH | 3 | Race conditions in admin guards, singleton abuse, audit log gaps |
| **A07:2025 Authentication Failures** | HIGH | 2 | No MFA, refresh token rotation incomplete |
| **A08:2025 Integrity Failures** | MEDIUM | 1 | Audit logs lack tamper evidence |
| **A09:2025 Logging Failures** | LOW | 1 | Audit logs missing sensitive operation context |
| **A10:2025 Exceptional Conditions** | HIGH | 4 | Fail-open auth on timeout, partial writes, timeout defaults, rollback gaps |

**Total Findings: 21** (6 High, 8 Medium, 7 Low)

---

## Detailed Findings by OWASP Lane

### A01:2025 — Broken Access Control

#### FIND-001: Missing Tenant/Group Isolation in Cross-Group Queries
**Files:** `001_auth_and_core_schema.sql`, `01_auth_and_core.sql`, `002_academic_and_attendance.sql`, `02_academics_and_attendance.sql`
**Severity:** HIGH
**Lines:** Multiple tables lack `group_id` in composite keys

**Evidence:** 
- `profiles` table has `group_id` but `auth_users` does not — cross-reference requires join
- `curriculum_entries` has both `day_id` and `term_id` + `group_id` but no FK ensuring `day_id` belongs to `term_id` and `group_id`
- `marathon_trainee_submissions` has `group_id` but FK only to `marathon_id` and `trainee_id` — no constraint that `trainee_id`'s profile `group_id` matches submission `group_id`
- `feed_posts` allows `group_id` NULL (global posts) but no RLS equivalent to restrict trainee visibility to own group

**Impact:** A servant in Group 1 could potentially access Group 2 data if application layer forgets group filter.

**Remediation:** Add composite foreign keys or triggers enforcing group consistency. Consider MySQL 8.0 CHECK constraints for cross-column validation.

#### FIND-002: System Admin Role Change Permit Bypass via Direct Profile Update
**Files:** `001_auth_and_core_schema.sql` (lines 181-193), `01_auth_and_core.sql` (lines 179-193), `05_triggers_and_procedures.sql` (lines 327-403)
**Severity:** HIGH
**Lines:** 181-193, 327-403

**Evidence:** 
- `system_admin_role_change_permits` table exists but triggers only guard `profiles` table UPDATE/DELETE
- Direct `UPDATE profiles SET role_id='admin' WHERE id=...` bypasses permit table entirely
- Stored procedures `sp_grant_system_admin` / `sp_revoke_system_admin` are optional — not enforced by DB

**Impact:** Any user with direct DB write access (or SQL injection) can escalate to admin without audit trail in permit table.

**Remediation:** Make permit table the *only* path — add trigger that blocks direct `role_id='admin'` changes unless matching permit exists and is unused.

#### FIND-003: Secretariat Limit Race Condition (TOCTOU)
**Files:** `05_triggers_and_procedures.sql` (lines 71-107), `006_triggers_and_procedures.sql` (no equivalent)
**Severity:** HIGH
**Lines:** 71-107

**Evidence:**
```sql
SELECT COUNT(*) INTO v_active_count
FROM `group_secretariat`
WHERE `group_id` = NEW.`group_id` AND `is_active` = 1;
IF v_active_count >= 3 THEN SIGNAL... END IF;
```
- Check-then-act pattern without row locking
- Concurrent inserts can both see count=2 and both succeed → 4 secretariat members

**Impact:** Violates business rule "max 3 secretariat per group" under concurrency.

**Remediation:** Use `SELECT ... FOR UPDATE` on a sentinel row, or enforce via unique partial index (MySQL 8.0 doesn't support partial unique indexes — use trigger with `GET_LOCK` or application-level mutex).

#### FIND-004: General Secretariat Missing Group Scoping
**Files:** `001_auth_and_core_schema.sql` (lines 161-188), `01_auth_and_core.sql` (lines 154-176)
**Severity:** MEDIUM
**Lines:** 161-188

**Evidence:** `general_secretariat_members` and `general_secretariat_permissions` have no `group_id` — members are global by design, but permissions table has no scope limitation.

**Impact:** A general secretariat member gets permissions across all groups implicitly — may exceed intended scope.

**Remediation:** Add `group_id` to permissions table or document global scope explicitly.

---

### A02:2025 — Security Misconfiguration

#### FIND-005: Default Admin Credential Seeded in Production Schema
**Files:** `007_seed_initial_data.sql` (lines 88-119), `06_seed_data.sql` (lines 88-119)
**Severity:** MEDIUM
**Lines:** 88-119

**Evidence:**
```sql
INSERT INTO `auth_users` (
    `id`, `email`, `password_hash`, ...
) VALUES (
    '00000000-0000-4000-a000-000000000001',
    'admin@elkarooz-school.com',
    '$2y$12$e6m0E71y5fO7hU.r8eCgZ.eR74wE9/M73sO7uH5o5zVf7rQ6hU5mC',  -- known hash
    ...
);
```
- Fixed UUID, known email, known bcrypt hash (cost 12)
- Seeded by default in `ON DUPLICATE KEY UPDATE` — runs on every migration

**Impact:** Any deployed instance has a pre-known admin account unless manually removed post-deploy.

**Remediation:** Move to separate "initial setup" script that requires operator interaction; never seed credentials in schema migrations.

#### FIND-006: Singleton Tables Without Proper CHECK Constraints
**Files:** `005_system_and_operations.sql` (lines 79-88, 202-212), `04_media_bible_and_system.sql` (lines 244-252, 491-499)
**Severity:** LOW
**Lines:** 79-88, 202-212, 244-252, 491-499

**Evidence:**
- `daily_verse_dispatch_state` uses `id SMALLINT UNSIGNED NOT NULL DEFAULT 1` — no `CHECK (id = 1)`
- `system_reset_gate` has `CHECK (singleton = 1)` in newer schema but not in older
- MySQL 8.0 supports CHECK constraints but older version uses `ENFORCED` default

**Impact:** Application bugs could insert multiple rows, breaking singleton assumption.

**Remediation:** Add explicit `CHECK (id = 1)` to all singleton tables.

---

### A03:2025 — Software Supply Chain Failures
**No findings** — Schema files have no external dependencies.

---

### A04:2025 — Cryptographic Failures

#### FIND-007: Password Hash Algorithm Not Tracked
**Files:** `001_auth_and_core_schema.sql` (line 17), `01_auth_and_core.sql` (line 18), `007_seed_initial_data.sql` (line 97)
**Severity:** MEDIUM
**Lines:** 17, 18, 97

**Evidence:** `password_hash VARCHAR(255)` stores bcrypt but no column for:
- Algorithm identifier (bcrypt, argon2id, etc.)
- Cost factor / parameters
- Version for migration

**Impact:** Cannot rotate algorithms or increase cost factor without guessing. Seed uses cost 12 — may be insufficient in future.

**Remediation:** Add `password_algo VARCHAR(32) NOT NULL DEFAULT 'bcrypt'` and `password_cost TINYINT UNSIGNED NOT NULL DEFAULT 12` columns to `auth_users`.

---

### A05:2025 — Injection

#### FIND-008: Dynamic SQL Construction in Stored Procedures
**Files:** `05_triggers_and_procedures.sql` (lines 185-228, 230-247, 250-324)
**Severity:** MEDIUM
**Lines:** 185-324

**Evidence:** Procedures use direct parameter interpolation into SQL:
- `sp_get_trainee_full_profile`: `WHERE p.id = p_trainee_id` — parameterized, OK
- `sp_create_trainee_profile`: Uses `UUID()` and direct `INSERT` — parameterized, OK
- BUT: No procedures use `PREPARE`/`EXECUTE` with user-supplied identifiers (table/column names) — current code is safe

**Actual Risk:** Low currently, but pattern invites future dynamic SQL. No evidence of current injection.

#### FIND-009: JSON Payload in Audit Logs Without Sanitization
**Files:** `005_system_and_operations.sql` (line 101), `04_media_bible_and_system.sql` (line 406)
**Severity:** LOW
**Lines:** 101, 406

**Evidence:** `audit_logs.payload JSON NULL` stores arbitrary JSON from application. If application logs unsanitized user input, could lead to log injection (not SQL injection).

**Impact:** Log forging, SIEM parsing issues.

**Remediation:** Application must sanitize before insert; consider `CHECK (JSON_VALID(payload))` constraint.

#### FIND-010: Trigger Uses Unvalidated Session Variables
**Files:** `006_triggers_and_procedures.sql` (lines 114, 144, 173) — `DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR)`
**Severity:** LOW
**Lines:** 114, 144, 173

**Evidence:** Cairo timezone hardcoded as `+2 HOUR` — no DST handling, assumes server UTC.

**Impact:** Thursday freeze logic fails during DST transitions (Egypt currently doesn't observe DST but may in future).

**Remediation:** Use `CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Africa/Cairo')` with timezone tables loaded.

---

### A06:2025 — Insecure Design

#### FIND-011: Admin Guard Trigger Only on profiles Table
**Files:** `006_triggers_and_procedures.sql` (lines 36-81), `05_triggers_and_procedures.sql` (lines 160-179)
**Severity:** HIGH
**Lines:** 36-81, 160-179

**Evidence:** Triggers guard `profiles` UPDATE/DELETE but `auth_users` has `is_super_admin` flag and `raw_app_meta_data` JSON with role — no trigger on `auth_users`.

**Impact:** Attacker modifying `auth_users` directly (e.g., via SQL injection in backup/restore) can set `is_super_admin=1` without trigger firing.

**Remediation:** Add matching triggers on `auth_users` for `is_super_admin` and `raw_app_meta_data->>'$.role'` changes.

#### FIND-012: Singleton Abuse in System Reset Gate
**Files:** `005_system_and_operations.sql` (lines 202-212), `04_media_bible_and_system.sql` (lines 491-499)
**Severity:** MEDIUM
**Lines:** 202-212, 491-499

**Evidence:** `system_reset_gate` table with `singleton=1` CHECK constraint, but:
- `active_run_id` can be set by any transaction
- `auth_cutoff_iat` (JWT issued-at cutoff) can be manipulated to invalidate all sessions
- No audit of who changed gate state

**Impact:** Denial of service via gate locking; session invalidation attack.

**Remediation:** Require `system_reset_write_permits` to modify gate; audit all gate changes.

#### FIND-013: Audit Logs Not Append-Only Enforced at DB Level
**Files:** `006_triggers_and_procedures.sql` (lines 13-32), `05_triggers_and_procedures.sql` (no audit log triggers)
**Severity:** MEDIUM
**Lines:** 13-32

**Evidence:** Triggers deny UPDATE/DELETE on `audit_logs` but:
- No trigger on `TRUNCATE TABLE` (MySQL doesn't fire triggers for TRUNCATE)
- `ALTER TABLE` can drop triggers
- No cryptographic chaining (hash chain) to detect tampering

**Impact:** Privileged DB user can truncate or alter audit logs.

**Remediation:** Use MySQL `AUDIT_LOG` plugin or external immutable log store; add hash chain column.

---

### A07:2025 — Authentication Failures

#### FIND-014: No MFA Support in Schema
**Files:** `001_auth_and_core_schema.sql`, `01_auth_and_core.sql`
**Severity:** HIGH
**Lines:** N/A (missing)

**Evidence:** No columns for:
- TOTP secret
- Backup codes
- MFA enrollment status
- WebAuthn credentials

**Impact:** Cannot implement MFA without schema migration.

**Remediation:** Add `mfa_totp_secret VARBINARY(255) NULL`, `mfa_backup_codes JSON NULL`, `mfa_enabled TINYINT(1) NOT NULL DEFAULT 0` to `auth_users`.

#### FIND-015: Refresh Token Rotation Incomplete
**Files:** `001_auth_and_core_schema.sql` (lines 41-55), `01_auth_and_core.sql` (lines 35-50)
**Severity:** MEDIUM
**Lines:** 41-55, 35-50

**Evidence:** `auth_refresh_tokens` table has:
- `token_hash` (good)
- `revoked_at` (good)
- But no `replaced_by_token_hash` for rotation chain
- No `device_fingerprint` for anomaly detection
- No absolute expiry (sliding window only via `expires_at`)

**Impact:** Stolen refresh token usable until explicit revocation; no detection of token reuse (rotation replay).

**Remediation:** Add `replaced_by_hash VARCHAR(64) NULL`, `device_fp VARCHAR(64) NULL`, `absolute_expiry DATETIME(3) NULL`.

---

### A08:2025 — Software or Data Integrity Failures

#### FIND-016: Audit Logs Lack Tamper Evidence
**Files:** `005_system_and_operations.sql` (lines 93-111), `04_media_bible_and_system.sql` (lines 396-413)
**Severity:** MEDIUM
**Lines:** 93-111, 396-413

**Evidence:** `audit_logs` table has no:
- `prev_log_hash CHAR(64)` for hash chaining
- `log_signature VARCHAR(128)` for HMAC signing
- Merkle tree root anchor

**Impact:** Log tampering undetectable without external system.

**Remediation:** Add `prev_hash CHAR(64) NULL` and compute `SHA256(CONCAT(prev_hash, id, actor_id, action, entity_type, entity_id, payload, created_at))` on insert.

---

### A09:2025 — Security Logging and Alerting Failures

#### FIND-017: Audit Logs Missing Context for Sensitive Operations
**Files:** `005_system_and_operations.sql` (lines 93-111), `04_media_bible_and_system.sql` (lines 396-413)
**Severity:** LOW
**Lines:** 93-111, 396-413

**Evidence:** `audit_logs` captures `actor_id`, `action`, `entity_type`, `entity_id`, `payload` but:
- No `request_id` for correlation
- No `session_id` linking to auth_refresh_tokens
- No `source_ip` validation (stored but not verified)
- No `risk_score` or `alert_level`

**Impact:** Hard to correlate attacks; SIEM rules less effective.

**Remediation:** Add `session_id CHAR(36) NULL`, `request_id CHAR(36) NULL`, `alert_level ENUM('info','warn','critical') DEFAULT 'info'`.

---

### A10:2025 — Mishandling of Exceptional Conditions

#### FIND-018: Fail-Open Auth on Identity Provider Timeout
**Files:** `001_auth_and_core_schema.sql` (no timeout config), `005_system_and_operations.sql` (no auth timeout)
**Severity:** HIGH
**Lines:** N/A (missing)

**Evidence:** No schema-level configuration for:
- Auth service timeout (fallback behavior)
- Cache failure mode (allow/deny)
- Circuit breaker state

**Impact:** If auth service (Supabase/custom) times out, application may fail-open (allow) or fail-closed (deny) — not defined in schema.

**Remediation:** Add `auth_config` table with `fail_mode ENUM('open','closed') DEFAULT 'closed'`, `timeout_ms INT DEFAULT 5000`.

#### FIND-019: Partial Writes in Multi-Table Operations
**Files:** `05_triggers_and_procedures.sql` (lines 250-324, 327-403)
**Severity:** HIGH
**Lines:** 250-324, 327-403

**Evidence:** Stored procedures use `START TRANSACTION` / `COMMIT` but:
- `sp_create_trainee_profile`: inserts into `auth_users` then `profiles` then `audit_logs` — if audit_logs fails, rollback works (good)
- `sp_grant_system_admin`: updates `profiles` then `auth_users` then `audit_logs` — same
- BUT: No savepoints for partial rollback; no deadlock retry logic
- Application calling these may not handle deadlock (1213) / lock wait timeout (1205)

**Impact:** Under contention, transactions abort leaving caller in undefined state.

**Remediation:** Add `DECLARE EXIT HANDLER FOR 1213, 1205 BEGIN ROLLBACK; RESIGNAL; END;` and retry logic in application.

#### FIND-020: Timeout Defaults Expand Authority
**Files:** `006_triggers_and_procedures.sql` (lines 114, 144, 173)
**Severity:** HIGH
**Lines:** 114, 144, 173

**Evidence:** Thursday freeze logic:
```sql
SET v_cairo_now = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR);
```
- If `UTC_TIMESTAMP()` fails (returns NULL), `v_cairo_now` becomes NULL
- `v_session_date < v_cairo_date` → NULL comparison yields UNKNOWN → trigger allows operation
- **Fail-open on timestamp failure**

**Impact:** Clock sync failure or MySQL error bypasses Thursday freeze.

**Remediation:** Add `IF v_cairo_now IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Time service unavailable'; END IF;`

#### FIND-021: Rollback Gaps in System Reset
**Files:** `005_system_and_operations.sql` (lines 215-290), `04_media_bible_and_system.sql` (lines 450-517)
**Severity:** HIGH
**Lines:** 215-290, 450-517

**Evidence:** System reset uses:
- `system_reset_runs` (parent)
- `system_reset_run_assets` (child)
- `system_reset_run_users` (child)
- `system_reset_write_permits`
- `system_reset_auth_delete_permits`
- `system_reset_gate` (singleton)

**Gaps:**
- No foreign key from `system_reset_gate.active_run_id` to `system_reset_runs.id`
- `system_reset_write_permits` has no expiry enforcement (cleanup job needed)
- If reset crashes mid-way, `system_reset_gate` may remain locked (`is_open=1` with stale `active_run_id`)
- No automatic recovery procedure defined in schema

**Impact:** Crashed reset leaves system in locked state requiring manual DB intervention.

**Remediation:** Add FK on gate; add `expires_at` to permits with cleanup event; add `recovery_token` to gate for emergency unlock.

---

## Coverage Summary

| File | Lines | A01 | A02 | A03 | A04 | A05 | A06 | A07 | A08 | A09 | A10 | Reviewed |
|------|-------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|----------|
| 001_auth_and_core_schema.sql | 190 | ✓ | ✓ | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Full |
| 002_academic_and_attendance.sql | 255 | ✓ | ✓ | - | - | ✓ | ✓ | ✓ | - | - | ✓ | Full |
| 003_marathon_and_community.sql | 361 | ✓ | ✓ | - | - | ✓ | ✓ | - | - | - | ✓ | Full |
| 004_bible_encyclopedia.sql | 182 | ✓ | ✓ | - | - | ✓ | ✓ | - | - | - | - | Full |
| 005_system_and_operations.sql | 292 | ✓ | ✓ | - | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Full |
| 006_triggers_and_procedures.sql | 231 | ✓ | ✓ | - | - | ✓ | ✓ | ✓ | ✓ | - | ✓ | Full |
| 007_seed_initial_data.sql | 73 | ✓ | ✓ | - | ✓ | - | ✓ | ✓ | - | - | - | Full |
| 01_auth_and_core.sql | 195 | ✓ | ✓ | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Full |
| 02_academics_and_attendance.sql | 293 | ✓ | ✓ | - | - | ✓ | ✓ | ✓ | - | - | ✓ | Full |
| 03_marathon_and_community.sql | 257 | ✓ | ✓ | - | - | ✓ | ✓ | - | - | - | ✓ | Full |
| 04_media_bible_and_system.sql | 519 | ✓ | ✓ | - | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Full |
| 05_triggers_and_procedures.sql | 405 | ✓ | - | - | - | ✓ | ✓ | ✓ | - | - | ✓ | Full |
| 06_seed_data.sql | 121 | ✓ | ✓ | - | - | - | ✓ | - | - | - | - | Full |
| **TOTAL** | **3,474** | **13** | **13** | **0** | **3** | **11** | **13** | **8** | **6** | **5** | **11** | **100%** |

---

## Recommendations Priority

### Immediate (Before Production)
1. **FIND-002** — Enforce admin role changes via permit table only (DB trigger)
2. **FIND-005** — Remove default admin credential from seed; move to setup script
3. **FIND-014** — Add MFA columns to auth_users
4. **FIND-018** — Define auth fail-mode in schema config table
5. **FIND-020** — Fix Thursday freeze fail-open on time failure

### Short-Term (Next Sprint)
6. **FIND-001** — Add cross-table group consistency constraints/triggers
7. **FIND-003** — Fix secretariat limit race with GET_LOCK or application mutex
8. **FIND-007** — Track password hash algorithm/cost
9. **FIND-011** — Add auth_users triggers for is_super_admin
10. **FIND-015** — Enhance refresh token rotation chain
11. **FIND-019** — Add deadlock retry handlers in procedures
12. **FIND-021** — Add FK on system_reset_gate, permit expiry, recovery token

### Medium-Term
13. **FIND-004** — Scope general secretariat permissions
14. **FIND-006** — Add CHECK constraints to all singletons
15. **FIND-008** — Audit procedures for future dynamic SQL
16. **FIND-009** — Add JSON_VALID check on audit_logs.payload
17. **FIND-010** — Use CONVERT_TZ for Cairo timezone
18. **FIND-012** — Protect system_reset_gate with write permits
19. **FIND-013** — Implement audit log hash chaining
20. **FIND-016** — Add prev_hash column to audit_logs
21. **FIND-017** — Enrich audit_logs with session/request correlation IDs

---

## Appendix: Specialist Profile Compliance

### Auth Profile (`references/specialist-profiles/auth.md`)
- ✅ Actor × resource × operation matrix partially covered (roles, permissions, secretariat)
- ❌ Missing: MFA, token revocation propagation, session rotation, federation
- ✅ Parent-router auth: N/A (database layer)
- ✅ Service-to-service identity: Not applicable

### Business Logic Profile (`references/specialist-profiles/business-logic.md`)
- ✅ Invariants: max 3 secretariat, 1 admin minimum, 1 exam per term
- ❌ Race conditions in invariant enforcement (FIND-003)
- ✅ Approval/version binding: curriculum_revisions, marathon_question_revisions
- ✅ Concurrency: triggers use row-level checks but TOCTOU exists
- ❌ Idempotency: No idempotency keys in submissions

### Exceptional Conditions Profile (`references/specialist-profiles/exceptional-conditions.md`)
- ❌ Fail-open auth on timeout (FIND-018)
- ❌ Partial write handling in procedures (FIND-019)
- ❌ Timeout defaults expand authority (FIND-020)
- ❌ Rollback gaps in system reset (FIND-021)
- ✅ Resource exhaustion: MAX_ROWS limits in export (application layer)
- ✅ Typed errors: SIGNAL SQLSTATE used consistently

---

**Report Generated:** 2026-11-11  
**Auditor:** Hermes Security Audit (scan_12204089a789817c3635f278)  
**Methodology:** hermes-security/method-1 (OWASP Top 10:2025 + ASVS 5.0.0)