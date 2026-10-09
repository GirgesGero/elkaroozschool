# EL KAROOZ School — Hostinger Deployment Guide

> PHP Backend API deployment on Hostinger shared hosting.

## 1. Project Structure

```
public_html/                    ← Hostinger web root
├── index.php                   ← Front controller (from backend-api/public/)
├── .htaccess                   ← Root guard  (from backend-api/public/htaccess_root.template)
├── .user.ini                   ← PHP ini overrides (from backend-api/public/)
├── config/
│   ├── app.php
│   ├── supabase.php
│   └── storage.php
├── src/
│   ├── Controllers/
│   │   ├── AuthController.php
│   │   ├── BackupController.php
│   │   ├── ExportController.php
│   │   ├── ImportController.php
│   │   ├── RestoreController.php
│   │   ├── SafeFailure.php
│   │   └── StorageController.php
│   ├── Middleware/
│   │   ├── CorsMiddleware.php
│   │   ├── FileSecurityMiddleware.php
│   │   ├── GroupScopeMiddleware.php
│   │   ├── JwtAuthMiddleware.php
│   │   ├── RateLimitMiddleware.php
│   │   └── RbacMiddleware.php
│   ├── Services/
│   │   ├── ArchiveExtractor.php
│   │   ├── AtomicRestoreService.php
│   │   ├── AuditLogService.php
│   │   ├── BackupArchiveInspector.php
│   │   ├── DatabaseExportService.php
│   │   ├── DatabaseRestoreService.php
│   │   ├── ExcelParserService.php
│   │   ├── LectureAnnouncementService.php
│   │   ├── SpreadsheetWriter.php
│   │   ├── StorageBridgeService.php
│   │   ├── SupabaseClient.php
│   │   └── ZipEncryptionService.php
│   └── Utils/
│       ├── AppRoot.php
│       ├── ClientIp.php
│       ├── FsHelper.php
│       ├── Response.php
│       └── Security.php
├── vendor/                     ← Composer dependencies
│   ├── autoload.php
│   ├── composer/
│   └── firebase/php-jwt/
└── storage/                    ← Runtime file storage
    └── .htaccess               ← Deny direct access
```

**Key point:** The deployment is **flattened** — `backend-api/public/*` contents go into
`public_html/` directly, and `config/`, `src/`, `vendor/`, `storage/` sit as siblings in
`public_html/`. The `htaccess_root.template` becomes `public_html/.htaccess` and denies
direct access to those internal directories.

## 2. PHP Requirements

| Requirement      | Value              |
|------------------|--------------------|
| **PHP version**  | ≥ 8.1              |
| **Extensions**   | `json`, `mbstring`, `openssl`, `curl`, `zip`, `fileinfo` |
| **Composer deps**| `firebase/php-jwt ^6.10`, `phpoffice/phpspreadsheet ^2.1` |

Hostinger shared plans ship PHP 8.1+ with all required extensions enabled by default.

Verify in Hostinger panel: **Advanced → PHP Configuration → PHP version** — select 8.1 or higher.

## 3. .htaccess Configuration

Two `.htaccess` files are deployed:

### Root `.htaccess` (public_html/.htaccess)

Use `htaccess_root.template` as the source. It:

1. **Denies all PHP files** in the web root (`<FilesMatch "\.php$">` → `Require all denied`)
2. **Re-grants `index.php` only** (`<Files "index.php">` → `Require all granted`)
3. **Rewrites** all non-file, non-directory requests to `index.php`
4. **Blocks** dangerous HTTP methods (TRACE, TRACK, CONNECT, DEBUG)
5. **Blocks** sensitive files by extension (`.env`, `.git`, `.sql`, `.bak`, `.log`, etc.)
6. **Sets security headers** (X-Content-Type-Options, X-Frame-Options, etc.)
7. **Disables directory listing** (via `mod_autoindex` IfModule guard for LiteSpeed compat)

### Storage `.htaccess` (storage/.htaccess)

Denies all direct access to uploaded files. Already exists in `backend-api/storage/.htaccess`.

### Important: Order matters

The deny-all-PHP section **must** come before the index.php grant. Reversing them exposes
every PHP file including `config/supabase.php`.

## 4. Environment Variables

The PHP bootstrap loads a private `.env` file from the directory immediately above
`public_html/`. Upload `backend-api/hostinger.env.example` there, rename it to `.env`,
then replace every `<...>` placeholder with the exact values from your own dashboards.
Never put the real `.env` in `public_html/`, Git, or the deploy ZIP. Host-provided
environment variables also work and take precedence over values in the file. If you
store the file elsewhere, set the server variable `ELKAROOZ_ENV_FILE` to its absolute
path; the loader rejects any path inside the web document root.

```env
# ─── Required: Supabase connection ───────────────────────
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<copy-the-project-anon-or-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-or-secret-key>
SUPABASE_JWT_SECRET=<project-HS256-signing-secret>

# ─── Optional: Application config ───────────────────────
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<your-hostinger-api-domain>
STORAGE_PUBLIC_URL=https://<your-existing-public-media-host>
```

> **CRITICAL:** The app **fails closed** if any of the 4 required Supabase variables are
> missing, empty, or still containing `<...>` placeholders — it returns `CONFIG_MISSING` (500) instead of silently falling back.
> This is intentional: a misconfigured host must not boot with guessable credentials.
> **JWT compatibility is not yet verified:** the current PHP verifier accepts HS256 only.
> Confirm the live Supabase project's JWT signing algorithm and test a real authenticated
> request on staging before upload; ES256/RS256 tokens will not authenticate with this code.
>
> Google Drive is not yet connected to the storage routes. Do not place a service-account
> key in this template or expect Drive uploads to work until the integration is implemented
> and tested against the user's Drive folder.

## 5. Upload Instructions

### Option A: File Manager (Hostinger hPanel)

1. Open **Hostinger hPanel → Files → File Manager**
2. Navigate to `public_html/`
3. Back up existing files before replacing them; do not delete an existing deployment blindly
4. Upload the flattened package:
   - `index.php`, `.htaccess`, `.user.ini` → `public_html/`
   - `config/` folder → `public_html/config/`
   - `src/` folder → `public_html/src/`
   - `vendor/` folder → `public_html/vendor/`
   - `storage/` folder → `public_html/storage/` (ensure `.htaccess` is inside)
5. Upload the separately prepared private `.env` to the directory above `public_html/`;
   the ZIP deliberately does not contain it.

### Option B: SSH + Git (recommended)

```bash
# SSH into Hostinger
ssh u123456789@your-server.hostinger.com

# Clone or pull the repo
cd ~
git clone https://github.com/your-org/ELKAROOZ-SCHOOL.git app
cd app

# Install PHP dependencies (no dev)
composer install --no-dev --optimize-autoloader

# Deploy the flattened layout
rm -rf ~/public_html/*
cp backend-api/public/index.php ~/public_html/
cp backend-api/public/htaccess_root.template ~/public_html/.htaccess
cp backend-api/public/.user.ini ~/public_html/
cp -r backend-api/config ~/public_html/config
cp -r backend-api/src ~/public_html/src
cp -r backend-api/vendor ~/public_html/vendor
cp -r backend-api/storage ~/public_html/storage

# Place the completed private env file one directory above public_html.
# Never copy it into public_html or the ZIP.

# Set permissions
chmod 755 ~/public_html/storage
chmod 644 ~/public_html/.htaccess ~/public_html/.user.ini
```

### Option C: Automated packaging

If `scripts/package_zip.php` exists, run it to create a deployment-ready ZIP:

```bash
php scripts/package_zip.php
# Produces a ZIP with the correct flattened layout ready to extract into public_html/
```

### Post-upload verification

```bash
# Health check
curl -s https://your-api-domain.com/health | python3 -m json.tool

# Security: these must all return 403 or connection-dropped
curl -s -o /dev/null -w "%{http_code}" https://your-api-domain.com/config/supabase.php  # → 403
curl -s -o /dev/null -w "%{http_code}" https://your-api-domain.com/src/Utils/AppRoot.php # → 403
curl -s -o /dev/null -w "%{http_code}" https://your-api-domain.com/vendor/autoload.php   # → 403
curl -s -o /dev/null -w "%{http_code}" https://your-api-domain.com/storage/              # → 403
curl -s -o /dev/null -w "%{http_code}" https://your-api-domain.com/.user.ini             # → 403
curl -s -o /dev/null -w "%{http_code}" https://your-api-domain.com/composer.json         # → 403
```

## 6. Security Checklist

### Pre-deployment

- [ ] **PHP version** ≥ 8.1 set in Hostinger panel
- [ ] **All 4 Supabase env vars** set with real values (not placeholders), outside public_html
- [ ] **`APP_DEBUG=false`** in production — never `true`
- [ ] **`APP_ENV=production`** — prevents localhost CORS origin
- [ ] **`composer install --no-dev`** — no dev dependencies deployed

### File security

- [ ] **Root `.htaccess`** deployed from `htaccess_root.template` (deny-before-grant order)
- [ ] **`storage/.htaccess`** present — blocks direct file access
- [ ] **`.user.ini`** present — `display_errors = Off`, `log_errors = On`
- [ ] **`.env` file** is a sibling of public_html; loader rejects it inside the web root
- [ ] **JWT algorithm** confirmed compatible with the current HS256-only PHP verifier
- [ ] **Google Drive** not claimed active until the storage route integration is implemented and tested
- [ ] **`.git/` directory** not uploaded to production

### Access control verification

- [ ] `GET /health` → 200 with service info
- [ ] `GET /config/supabase.php` → 403 (not 200!)
- [ ] `GET /src/Utils/AppRoot.php` → 403
- [ ] `GET /vendor/autoload.php` → 403
- [ ] `GET /.user.ini` → 403
- [ ] `GET /nonexistent` → 404 JSON error from app (not Apache default)

### Runtime security

- [ ] **Rate limiting** active on all routes (built into the app)
- [ ] **JWT auth** validates Supabase tokens (not guessable fallback)
- [ ] **CORS** restricts origins to production domains only
- [ ] **Error responses** return correlation IDs, never stack traces
- [ ] **Security headers** set: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

### Ongoing

- [ ] Keep PHP version updated when Hostinger releases patches
- [ ] Run `composer update --no-dev` periodically for security fixes in dependencies
- [ ] Monitor error logs in Hostinger panel → **Advanced → Error Logs**
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY` if it may have been exposed

## 7. API Endpoints Reference

| Method | Path                 | Auth | Rate Limit    | Description               |
|--------|----------------------|------|---------------|---------------------------|
| GET    | `/health`            | No   | —             | Health check              |
| GET    | `/auth/verify`       | JWT  | 30/min        | Verify session            |
| POST   | `/storage/upload`    | JWT  | 20/min        | Upload file               |
| POST   | `/storage/delete`    | JWT  | 20/min        | Delete file               |
| POST   | `/backup/create`     | JWT  | 5/5min        | Create backup             |
| GET    | `/backup/list`       | JWT  | 60/min        | List backups              |
| POST   | `/backup/validate-zip` | JWT | 10/min       | Validate backup archive   |
| POST   | `/backup/delete`     | JWT  | 30/min        | Delete backup             |
| POST   | `/restore/preview`   | JWT  | 10/5min       | Preview restore           |
| POST   | `/restore/execute`   | JWT  | 2/10min       | Execute restore           |
| POST   | `/import/trainees`   | JWT  | 10/5min       | Bulk import trainees      |
| GET    | `/import/history`    | JWT  | 60/min        | Import history            |
| GET    | `/export/data`       | JWT  | 5/5min        | Export database           |

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 500 `VENDOR_MISSING` | `vendor/autoload.php` not found | Run `composer install --no-dev` and re-upload `vendor/` |
| 500 `CONFIG_MISSING` | Supabase env vars not set | Set all 4 required vars in Hostinger panel |
| 403 on `/health` | Root `.htaccess` denying `index.php` | Ensure the `<Files "index.php">` grant section is AFTER the deny section |
| "Something Went Wrong" blank page | `Options -Indexes` in `.htaccess` on LiteSpeed | Use the `<IfModule mod_autoindex.c>` wrapper (already in template) |
| CORS errors in browser | `APP_ENV` not set or wrong origin | Set `APP_ENV=production` and verify `config/app.php` origins list |
| JWT auth fails | Wrong secret or unsupported JWT algorithm | Verify the signing algorithm is HS256 and copy its exact signing secret |
