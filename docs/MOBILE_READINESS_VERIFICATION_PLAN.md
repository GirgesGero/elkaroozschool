# EL KAROOZ SCHOOL — MOBILE READINESS VERIFICATION PLAN

## Scope

This is a verification phase for the existing `frontend/src/lib/mobile/` layer. No Android/iOS project, Capacitor package, native plugin, or native directory was created.

## Repository findings

| Area | Observed implementation | Evidence status |
|---|---|---|
| Platform | `platform.ts` | SSR-safe runtime checks; native bridge is optional |
| Capabilities | `capabilities.ts` | Central contract: `supported`, `available`, `platform`, `status` |
| Camera | `camera.ts` | HTML file-input fallback; native plugin seam |
| QR scanner | `qr-scanner.ts` | Opaque normalized-input boundary; no decoder or invented payload |
| QR asset | `qr-manager.ts` | Read-only `media_assets` resolver; fail-closed on missing asset |
| File picker | `file-picker.ts` | HTML input, category MIME filters, max-size check |
| Share | `share.ts` | Native seam, Web Share, clipboard fallback |
| Deep links | `deep-links.ts` | Canonical route parser and router handoff |
| Push | `push-notifications.ts` | Service Worker/native seams; registration remains explicit |
| Status/splash | `status-bar.ts`, `splash-screen.ts` | Web fallbacks; native seams |
| Haptics | `haptics.ts` | Native seam and best-effort `navigator.vibrate` |
| Badge | `app-badge.ts` | In-memory unread adapter + Web Badge/native seam |
| Permissions | `permissions.ts` | JIT `check()`/`request()` boundary |

## Consumers audited

- `FeedPostCard.tsx` uses `ShareService` and canonical post URLs.
- `NotificationCenter.tsx` uses `BadgeService`, foreground notification adapter, and canonical deep-link parsing. It does not request push permission on mount.
- `ServiceWorkerRegistration.tsx` owns client-side service-worker registration.
- `layout.tsx` imports the client registration component instead of evaluating browser APIs in server layout code.

## Direct API usage audit

Direct browser API references exist in approved boundaries under `src/lib/mobile/`, plus pre-existing UI concerns:

- `ThemeContext.tsx`: `localStorage`, `document`, `window.matchMedia` for the existing theme system; client component and effect-bound.
- `SmartHeader.tsx` and `SmartBottomNav.tsx`: scroll listeners and animation frame logic; client UI behavior, not device capability logic.
- `GlobalSearchModal.tsx` and `NotificationCenter.tsx`: DOM event listeners; client effects.
- `layout.tsx`: no direct browser API remains; registration is delegated to `ServiceWorkerRegistration`.
- No `@capacitor/*` import or native package was found.
- No Google credential, service-role key, or direct Google Drive access was found in `src/lib/mobile/`.

## Test inventory and gaps

Existing focused suite: `frontend/tests/mobile-readiness.test.ts` (11 tests). It covers platform shape, capability contract, deep links, opaque QR parsing, persistent QR resolution/fail-closed behavior, push deep-link routing, status-bar mapping, splash config, badge state, and permission checks.

Remaining gaps are intentionally classified rather than hidden:

- No native Android/iOS runtime exists, so native plugin execution and native permission dialogs are deferred.
- Web camera/file-picker UI interactions are not fully browser-automated in the existing Vitest suite.
- The current repository contains no authoritative QR generator/payload/creation pipeline; end-to-end QR creation, duplicate prevention against production data, and attendance resolution require that implementation or external integration to be identified.
- Push subscription persistence to a backend device table is not implemented in this adapter layer.
- Live Supabase/Google Drive/Hostinger verification is outside this local run.

## Verification commands

```text
npx tsc --noEmit
npx vitest run tests/mobile-readiness.test.ts --reporter=dot
npx vitest run --reporter=dot
npx next build
git diff --check
explicit android/ and ios/ existence check
```

## Classification rules

- **Web/PWA verified:** executed in the current browser-compatible code or local build/test harness.
- **Contract/mocked verified:** validated through pure logic, boundary, or mock adapter tests.
- **Native deferred:** requires a real Capacitor Android/iOS runtime and must never be reported as native PASS now.
