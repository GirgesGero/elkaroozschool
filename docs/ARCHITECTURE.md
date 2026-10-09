# System Architecture — EL KAROOZ SCHOOL
========================================

## 1. High-Level System Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                    Next.js 14 Frontend PWA                    │
│   - App Router, React Server / Client Components, Tailwind    │
│   - Cinematic Dark Luxury Aesthetic (#070b14, #c29938)        │
│   - PWA Offline Engine & IndexedDB Client Storage             │
└──────────────┬────────────────────────────────┬───────────────┘
               │                                │
               │ Direct Supabase Client (Auth)  │ PHP API Gateway (Proxy)
               ▼                                ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│  Supabase PostgreSQL (BaaS) │   │     Hostinger PHP API       │
│  - 51 Tables (RLS 100%)     │   │  - Auth & RBAC Middleware   │
│  - RPC Hardened Engine      │   │  - Safe Failure & Masking   │
│  - ACL Least Privilege      │   │  - Google Drive RS256 Proxy │
└─────────────────────────────┘   └──────────────┬──────────────┘
                                                 │
                                                 │ OAuth2 Service Account
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │      Google Drive Cloud     │
                                  │  - Primary Media Storage    │
                                  │  - Group-Isolated Folders   │
                                  └─────────────────────────────┘
```

## 2. Component Roles & Separation of Concerns

1. **Supabase PostgreSQL:**
   - Single source of truth for user identities, profiles, role permissions, group secretariats, attendance cycles, curriculum, marathons, and media metadata (`media_assets`).
   - Enforces database-level access rules through Row Level Security (RLS) and locked RPC routines.

2. **Hostinger PHP API (Backend Gateway):**
   - High-performance, lightweight gateway for secured file uploads, media streaming (HTTP 206), encrypted full database backups, and batch spreadsheet imports.
   - Shields Google credentials from the browser.

3. **Google Drive API:**
   - Private cloud object storage for audio files, high-resolution gallery images, research papers, and encrypted system backups.
