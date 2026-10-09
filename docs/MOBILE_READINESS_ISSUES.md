# EL KAROOZ SCHOOL — MOBILE READINESS ISSUES

## High priority blockers

1. **Authoritative QR semantics are known; implementation is not.**
   - Payload semantics: `PERSON NAME + PERSON ID`.
   - `PERSON ID` is the authoritative lookup key; name is secondary verification.
   - Exact serialization, generator, file writer, person linkage, and attendance resolver were not located.
   - The mobile layer correctly fails closed and does not invent a replacement.
   - Required evidence to close: real serializer/generator source, persistent `media_assets` linkage, duplicate prevention, and authorized scan-to-person flow.

2. **Native execution deferred.**
   - Android/iOS projects and Capacitor were intentionally not created.
   - Native camera, scanner, push, share sheet, status bar, splash, haptics, badge, and permission dialogs remain unexecuted.

## Medium priority gaps

3. Browser-level camera and file picker interaction tests are not present in the current Vitest suite.
4. Push registration returns a subscription endpoint but does not persist a device registration through a backend contract in this layer.
5. Live Supabase, Google Drive, and Hostinger verification was not part of this local validation run.

## Non-blocking warnings

- Next build succeeds but reports 10 existing ESLint warnings for effect dependencies and `<img>` optimization.
- `git diff --check` succeeds; Git reports normal LF/CRLF conversion warnings on modified Windows files.
