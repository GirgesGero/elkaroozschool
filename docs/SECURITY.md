# Security Policies & Defensive Controls
=========================================

## 1. Authentication & JWT Validation

- Algorithm is explicitly pinned to `HS256`.
- Symmetric JWT signature verified on every request using `Firebase\JWT\Key`.
- Fail-closed error handling on unsigned, malformed, or expired tokens.

## 2. Authorization & Least Privilege ACL

- Public / Anonymous access revoked on all administrative RPC routines and file manipulation endpoints.
- Database privileges `TRUNCATE, MAINTAIN, TRIGGER, REFERENCES` revoked from client roles (`anon`, `authenticated`).
- Row Level Security (RLS) active across 100% of tables (51/51).

## 3. Storage Security & Path Traversal Mitigation

- Canonical root containment checks via `realpath()` on write and delete paths.
- Rejection of relative path traversal segments (`..`).
- Google Drive file IDs sanitized with regex `/^[a-zA-Z0-9_-]+$/`.
- Internal directories (`src/`, `config/`, `vendor/`, `storage/`) guarded by deny-all `.htaccess` rules.

## 4. Failure Disclosure & Error Masking

- Database SQLSTATE errors mapped to localized Arabic explanations without echoing internals or filesystem paths.
- PHP exceptions masked via `SafeFailure::refuse` with unique correlation tracking IDs.
