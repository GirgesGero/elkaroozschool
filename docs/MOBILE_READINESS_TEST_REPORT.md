# EL KAROOZ SCHOOL — MOBILE READINESS TEST REPORT

**Verification mode:** local Web/PWA and contract verification only  
**Native mode:** DEFERRED — no Android/iOS project or emulator exists  
**Date:** 2026-10-05

## 1. Final matrix

| Capability | Functional | Failure | SSR | Security | Regression | Web | Native | Status |
|---|---|---|---|---|---|---|---|---|
| Platform detection | PASS | PASS by guarded runtime checks | PASS by import/build | PASS — no secrets | PASS | PASS | DEFERRED | PASS |
| Push notifications | PARTIAL — adapter and foreground path | PASS — unavailable/permission paths return state | PASS | PARTIAL — no secret exposure; backend persistence not in adapter | PASS | PARTIAL | DEFERRED | PARTIAL |
| Camera | PARTIAL — API/fallback contract, no browser automation | PASS — SSR/cancel/read errors are controlled | PASS | PASS — no storage side effect | PASS | PARTIAL | DEFERRED | PARTIAL |
| QR scanner | PARTIAL — normalized boundary only | PASS — unknown/empty values remain opaque | PASS | PASS — parser does not authorize access | PASS | PARTIAL | DEFERRED | PARTIAL |
| Persistent QR assets | PARTIAL — read-only resolver tested | PASS — missing/unsupported asset fails closed | PASS | PASS — reads metadata; no client Drive upload | PASS | PARTIAL | DEFERRED | PARTIAL |
| File picker | PARTIAL — category/max-size contract | PASS — SSR/cancel/oversize paths | PASS | PASS — no direct Drive access | PASS | PARTIAL | DEFERRED | PARTIAL |
| Share | PASS by contract tests and canonical call site | PASS — cancellation and fallback path | PASS | PARTIAL — authorization remains destination concern | PASS | PASS | DEFERRED | PASS |
| Deep links | PASS — parser and navigation tests | PASS — unknown routes do not navigate | PASS | PARTIAL — target page must enforce Auth/RLS/RBAC | PASS | PASS | DEFERRED | PASS |
| Status bar | PASS — theme mapping and Web fallback | PASS — native absence is isolated | PASS | PASS | PASS | PASS | DEFERRED | PASS |
| Splash screen | PASS — Web config/service safety | PASS — Web fallback/no-op | PASS | PASS | PASS | PASS | DEFERRED | PASS |
| Haptics | PARTIAL — semantic methods and safe fallback | PASS — browser failures ignored | PASS | PASS | PASS | PARTIAL | DEFERRED | PARTIAL |
| App badge | PASS — normalization and unread adapter state | PASS — unsupported API is safe no-op | PASS | PASS — no independent business source | PASS | PASS | DEFERRED | PASS |
| Permissions | PARTIAL — JIT abstraction and checks | PASS — denied/SSR paths are controlled | PASS | PASS — no startup bulk request | PASS | PARTIAL | DEFERRED | PARTIAL |

**Allowed statuses:** `PASS`, `FAIL`, `PARTIAL`, `DEFERRED`, `NOT APPLICABLE`.

## 2. Commands and exact results

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit `0` |
| `npx vitest run tests/mobile-readiness.test.ts --reporter=dot` | `1` file, `14/14` tests, exit `0` |
| `npx vitest run --reporter=dot` | `9` files, `117/117` tests, exit `0` |
| `node scripts/verify_no_fake_success.mjs` | `18/18` checks, exit `0` |
| `python scripts/verify_no_credential_leaks.py` | `4/4`, exit `0` |
| `python scripts/verify_no_error_leaks.py` | `36` PHP files clean, exit `0` |
| `python scripts/pentest_security_suite.py` | `20/20`, exit `0` |
| `npx next build` | exit `0`, `24/24` routes generated |
| `git diff --check` | exit `0`; only normal CRLF conversion warnings |
| native directory check | `android_exists=False`, `ios_exists=False` |

The production build emitted 10 non-fatal existing ESLint warnings: missing `useEffect` dependencies and `<img>` optimization warnings. They are not reported as resolved.

## 3. SSR and build verification

The mobile modules do not execute browser APIs at module import. Platform checks guard `window`, `document`, and `navigator`; the build and typecheck succeeded. Service-worker registration is isolated in `ServiceWorkerRegistration.tsx`, a client component.

Native behavior is **not** marked PASS. Native plugin execution, native permission dialogs, native share sheets, native status bars, native splash screens, native haptics, and native badges remain deferred until actual Android/iOS runtimes exist.

## 4. QR verification

Verified now:

- Unknown QR strings remain opaque and invalid.
- Empty QR input is invalid.
- The mobile layer has no QR renderer, no `data:` QR output, and no alternate QR generator.
- `QRAssetManager.resolvePersonQRAsset()` queries an existing active `media_assets` record and returns its protected `/storage/file/{asset_id}` path.
- Missing persistent asset fails closed.
- Unsupported storage provider fails closed.

Not verified because the repository search did not find the production QR creation/parser pipeline:

- Create-person → exactly-one-asset transaction.
- Existing-person production asset preservation against live data.
- Attendance resolution and group authorization after a real scan.
- Duplicate detection against production data.

- QR identity resolution helper is contract-tested as ID-first: a mismatched stored name returns `IDENTITY_MISMATCH`; a different person ID returns `PERSON_NOT_FOUND` and never falls back to name search.

## 5. Security and failure injection

- `node scripts/verify_no_fake_success.mjs`: `18/18` checks passed after narrowing the gateway ownership assertion to actual env-var references; the canonical host in `deep-links.ts` is a deep-link concern, not a second PHP API base URL.

Static inspection found no Google credentials, Supabase service-role key, or private backend secret in the mobile layer. The QR resolver never uploads directly to Google Drive. Deep-link parsing does not grant authorization; destination routes must enforce existing Auth/RLS/RBAC.
- Failure paths covered by code/tests include SSR access, empty QR, missing QR asset, unsupported QR storage provider, missing service-worker support, denied notification permission, absent badge API, haptics failure, share cancellation, and unknown deep links.

A full live network-fault matrix, browser camera denial, native permission denial, and production storage fault injection were not executed in this local report.

The security and failure commands executed successfully: credential scan `4/4`, error-leak scan `36` PHP files clean, penetration suite `20/20`, and fake-success/static-wiring scan `18/18`. These are local repository checks, not live-provider proof.

## 6. Performance and regression observations

- No mobile service registers listeners at module scope.
- Service-worker registration is owned by one client component.
- Profile QR resolution performs a read only; no profile-open write is possible through the resolver.
- Badge state updates are normalized to non-negative integers.
- Existing full Vitest and Next build remain green.

Potential non-blocking existing warning: several UI effects have dependency warnings reported by Next lint.

## 7. Native boundary

The following are explicitly deferred until native projects exist:

- Android/iOS Camera
- Android/iOS QR scanner
- Android/iOS push registration and dialogs
- Android/iOS share sheet
- Android/iOS status bar and splash screen
- Android/iOS haptics
- Android/iOS app badge
- Native permission dialogs

## 8. Verdict

**READY WITH BLOCKERS**

The Web/PWA abstraction layer is build-safe, type-safe, regression-safe under the executed local suite, and documented. It is not a native verification result. Blockers before claiming complete mobile readiness are:

1. Locate or explicitly integrate the real authoritative QR generator, payload, persistent creation flow, and person/attendance resolver.
2. Add browser-level tests for camera/file-picker interactions and explicit notification enable flow.
3. Persist Web/native device registration through the existing notification backend when that contract is defined.
4. Execute native adapter tests only after real Android/iOS projects and runtimes are intentionally created.
5. Re-run live Supabase/Google Drive/Hostinger verification separately from this local report.
