# Deployment Guide — Production Foundation
==========================================

## 1. Prerequisites

- Hostinger Shared / Cloud Hosting with PHP 8.3+ and HTTPS SSL.
- Clean Production Supabase Project.
- Google Cloud Service Account JSON Key file.
- Vercel Hosting for Next.js Frontend.

## 2. Deploying Backend API to Hostinger

1. Locate the deployable package: `backend-api/package/ElKarooz-API-public_html.zip`.
2. Upload and extract into Hostinger's `public_html/`.
3. Create `/home/[USER]/.elkarooz-env` outside `public_html/` and configure environment variables (see `docs/PRODUCTION_ENVIRONMENT.md`).
4. Place Google Service Account key at `/home/[USER]/.secrets/google-drive-sa.json` (`chmod 600`).
5. Run health check probe: `GET https://api.elkaroozschool.com/`.

## 3. Deploying Frontend to Vercel

1. Link repository to Vercel project.
2. Set Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_PHP_API_BASE_URL`).
3. Deploy branch `main`.
4. Verify PWA installation and service worker registration.
