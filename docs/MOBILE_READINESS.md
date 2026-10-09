# EL KAROOZ SCHOOL — MOBILE READINESS ARCHITECTURE
===================================================
**Project:** EL KAROOZ SCHOOL (مدرسة الكاروز للكتاب المقدس)  
**Deliverable:** Mobile Readiness Layer (Preparation Only)  
**Status:** ARCHITECTURE READY — NO NATIVE PLATFORMS INJECTED  
**Date:** 2026-10-05  

---

## 1. Executive Summary

This architecture prepares **EL KAROOZ SCHOOL** for future native Android and iOS mobile app compilation without converting the active Web/PWA codebase.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CENTRAL APP ARCHITECTURE                        │
│                                                                        │
│   Next.js App Router (RTL Arabic UI, React 18, Tailwind CSS, PWA)     │
│                                ↓                                       │
│                MOBILE READINESS / CAPABILITY LAYER                     │
│                     (src/lib/mobile/*)                                 │
│          ┌─────────────────────┴─────────────────────┐                 │
│          ▼                                           ▼                 │
│   [CURRENT ACTIVE]                           [FUTURE ADAPTERS]         │
│   Web / PWA Capabilities                     Capacitor Native Plugins  │
│   - HTML5 Media / Video Stream               - @capacitor/camera       │
│   - Web Share API / Clipboard Fallback       - @capacitor/barcode-scan │
│   - ServiceWorker Push Notifications         - @capacitor/haptics      │
│   - HTML Meta Theme Colors                   - @capacitor/status-bar   │
│   - Web Badging API                          - @capacitor/push-notif   │
│   - Canonical HTTPS Routes                   - App Links / Univ Links  │
│                                                                        │
│                                ↓                                       │
│   Supabase Auth & Database  ↔  PHP Backend API  ↔  Google Drive Media  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Invariants

1. **Zero Native Bloat:** No `android/` or `ios/` folders are created during this phase.
2. **Web/PWA Primary:** The Web application remains 100% functional and unmodified in business logic.
3. **Isolation:** UI components never call `navigator.mediaDevices`, `window.Capacitor`, or browser globals directly; all interactions route through `src/lib/mobile/*`.
4. **SSR Safe:** All mobile readiness modules are strictly safe during Next.js SSR, static optimization, and server component execution.
5. **Security Boundary Preserved:** The readiness layer does not bypass RBAC, RLS, group isolation, PHP authorization, or Google Drive authorization. Claims about live deployment remain separate from this local architecture layer.
