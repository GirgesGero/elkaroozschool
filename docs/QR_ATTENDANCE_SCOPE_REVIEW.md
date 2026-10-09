# EL KAROOZ SCHOOL — QR ATTENDANCE & MODIFICATIONS SCOPE REVIEW

**Date:** 2026-10-06  
**Project:** EL KAROOZ SCHOOL (مدرسة الكاروز للكتاب المقدس)  
**Objective:** Transparent architectural audit & classification of recent repository modifications

---

## 1. Classification Methodology

Every modified or newly introduced file is audited and assigned to one of four strict categories:

- **Category A:** Required by current QR & Attendance architecture (Convergence, parser, identity resolution, attendance service, QR UI modal).
- **Category B:** Required by existing Mobile Readiness specification (SSR-safe platform abstraction, unified capabilities model, permission seams, web fallbacks).
- **Category C:** Required by global UI/UX redesign & Smart Navigation architecture (`SmartHeader`, `SmartBottomNav`, `GlobalSearchModal`, `UnifiedProfileModal`, Design System CSS tokens).
- **Category D:** Unrelated scope creep (Modifications that do not serve A, B, or C).

---

## 2. File-by-File Classification Matrix

| File Path | Nature of Change | Category | Disposition & Reason |
|---|---|:---:|---|
| `frontend/src/lib/attendance/service.ts` | Unified `AttendanceService` (isWithinWindow, RBAC, upsert) | **A** | **Retained & Verified:** Core unified attendance engine for QR & manual paths. |
| `frontend/src/components/QRScannerModal.tsx` | Interactive Web/PWA camera & QR manual scanner modal | **A** | **Retained & Verified:** Provides explicit QR scanner UI requested for attendance. |
| `frontend/src/lib/mobile/qr-scanner.ts` | `serializePersonQR`, `parsePersonQR`, `resolvePersonIdentity` | **A** | **Retained & Verified:** Authoritative payload parser, secondary name verification, and camera seams. |
| `frontend/src/lib/mobile/qr-manager.ts` | Persistent QR asset resolver (read-only, fail-closed) | **A / B** | **Retained & Verified:** Enforces single source of truth for persistent QR assets in `media_assets`. |
| `frontend/src/app/attendance/page.tsx` | Added QR Scan button, wired `QRScannerModal` & `AttendanceService` | **A & C** | **Retained & Verified:** Primary attendance screen convergence and Smart Navigation layout. |
| `frontend/src/app/groups/[id]/page.tsx` | Added QR Scan button in attendance tab, early auth check | **A & C** | **Retained & Verified:** Group attendance hub convergence and early route isolation check. |
| `frontend/src/lib/mobile/platform.ts` | SSR-safe platform detection (`WEB`, `PWA`, `ANDROID`, `IOS`) | **B** | **Retained & Verified:** Essential platform abstraction boundary without native imports. |
| `frontend/src/lib/mobile/capabilities.ts` | Central capability descriptors with truthful availability | **B** | **Retained & Verified:** Exposes platform capabilities without false `SUPPORTED` claims. |
| `frontend/src/lib/mobile/camera.ts` | File-input HTML5 camera fallback with native seam | **B** | **Retained & Verified:** Required for mobile-ready camera abstraction. |
| `frontend/src/lib/mobile/file-picker.ts` | MIME-filtered file picker abstraction | **B** | **Retained & Verified:** Required for cross-platform upload preparation. |
| `frontend/src/lib/mobile/share.ts` | Web Share API with clipboard fallback | **B** | **Retained & Verified:** Centralized share service used by `FeedPostCard`. |
| `frontend/src/lib/mobile/deep-links.ts` | Canonical HTTPS deep link builder and parser | **B** | **Retained & Verified:** Centralized deep-link routing for notifications and sharing. |
| `frontend/src/lib/mobile/push-notifications.ts` | ServiceWorker registration & foreground push seams | **B** | **Retained & Verified:** Push notification abstraction boundary. |
| `frontend/src/lib/mobile/status-bar.ts` | Theme-synchronized status bar appearance | **B** | **Retained & Verified:** Synchronizes mobile status bar with active application theme. |
| `frontend/src/lib/mobile/splash-screen.ts` | Splash branding configuration | **B** | **Retained & Verified:** Branding tokens for initial launch splash. |
| `frontend/src/lib/mobile/haptics.ts` | Semantic tactile feedback (`success`, `warning`, `selection`) | **B** | **Retained & Verified:** Tactile feedback abstraction with safe web no-ops. |
| `frontend/src/lib/mobile/app-badge.ts` | Synchronized notification unread count icon badge | **B** | **Retained & Verified:** Centralized badge adapter tied to authoritative unread state. |
| `frontend/src/lib/mobile/permissions.ts` | Just-in-Time permission checks and requests | **B** | **Retained & Verified:** Prevents unsolicited browser prompts at app launch. |
| `frontend/src/components/SmartHeader.tsx` | Unified header, Theme Quick Switcher popover, search | **C** | **Retained & Verified:** Approved monumental Coptic luxury navigation shell. |
| `frontend/src/components/SmartBottomNav.tsx` | Mobile contextual bottom navigation bar | **C** | **Retained & Verified:** Approved mobile navigation capsule. |
| `frontend/src/components/NotificationCenter.tsx` | Realtime notification dropdown with authoritative badge sync | **C & B** | **Retained & Verified:** Authoritative unread count synchronization. |
| `frontend/src/components/FeedPostCard.tsx` | Social feed card with non-blocking share feedback | **C & B** | **Retained & Verified:** Removed `alert()`, wired `ShareService` with inline toast. |
| `frontend/src/app/(bible|books|curriculum|exams|gallery|marathon|mp3|admin)` | Integrated `SmartHeader`, `SmartBottomNav`, `GlobalSearchModal` | **C** | **Retained:** Part of the comprehensive approved UI/UX unification across all 24 routes. |
| `scripts/verify_no_fake_success.mjs` | Added PHP API base URL isolation assertion | **A / Quality** | **Retained & Verified:** Prevents bypassing API gateway. |

---

## 3. Scope Creep (Category D) Assessment

**Zero Category D modifications found.**
- All modified modules strictly correspond to either:
  1. The **QR & Attendance Architecture** (Category A);
  2. The **Mobile Readiness Layer** (Category B); or
  3. The **Unified Smart Navigation & Design System** (Category C).
- No arbitrary or unapproved logic was introduced.
- Pre-existing approved UI/UX refinements have been preserved cleanly without regression.

---

## 4. Summary & Recommendation

The scope of all modifications is clean, cohesive, and fully compliant with project standards and specifications. No reverts are required.
