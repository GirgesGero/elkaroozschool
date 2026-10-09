# Production Environment Specification
======================================
**Project:** EL KAROOZ SCHOOL  
**Classification:** PRODUCTION (Target Deployment)  
**Security Level:** High — Zero Credential Exposure

---

## 1. Environment Isolation Principle

Production is an entirely isolated, fresh environment:
- **No Shared Database:** Production connects to a dedicated clean Supabase project (never Staging `kgqgnqjkrghvktymbimz`).
- **No Shared Keys:** Production uses distinct JWT signing secrets, service role keys, and Google Drive Service Account credentials.
- **No Mock / Test Data:** Staging test profiles and debug posts are not migrated to Production.

---

## 2. Environment Variables Matrix

### A. Next.js Frontend (`frontend/.env.production`)

```ini
# Production Supabase Public Endpoints
NEXT_PUBLIC_SUPABASE_URL=https://[PROD_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[REDACTED_PROD_ANON_KEY]

# Production PHP Backend API Gateway
NEXT_PUBLIC_PHP_API_BASE_URL=https://api.elkaroozschool.com
```

### B. PHP Backend Hostinger (`/home/[USER]/.elkarooz-env` outside web root)

```ini
# Production Environment Mode
ENVIRONMENT=production

# Supabase Production Backend Configuration
SUPABASE_URL=https://[PROD_PROJECT_ID].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[REDACTED_PROD_SERVICE_ROLE_KEY]
SUPABASE_JWT_SECRET=[REDACTED_PROD_JWT_SECRET]

# Web Origin Restrictions
ALLOWED_ORIGIN=https://elkaroozschool.com

# Google Drive Service Account Credentials Path (Stored outside web root)
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/home/[USER]/.secrets/google-drive-sa.json
GOOGLE_DRIVE_ROOT_FOLDER_ID=[REDACTED_ROOT_FOLDER_ID]

# Storage Security Paths
STORAGE_ROOT=/home/[USER]/storage
BACKUP_TEMP_DIR=/home/[USER]/tmp/backups
```

---

## 3. Hostinger Deployment File System Hierarchy

```text
/home/[USER]/
├── .elkarooz-env                     (Permissions: 0600 - Denied to web server)
├── .secrets/
│   └── google-drive-sa.json          (Permissions: 0600 - Read only by PHP CLI/FPM)
├── storage/                          (Permissions: 0700 - Protected media cache)
├── public_html/                      (Web Root: Deployable from ElKarooz-API-public_html.zip)
│   ├── .htaccess                     (Denies direct access to PHP except index.php)
│   ├── .user.ini                     (Enforces memory/upload ceilings)
│   ├── index.php                     (Front Controller & Routing Gateway)
│   ├── config/
│   │   └── .htaccess                 (Require all denied)
│   ├── src/
│   │   └── .htaccess                 (Require all denied)
│   └── vendor/
│       └── .htaccess                 (Require all denied)
```

---

## 4. Baseline Role & Account Provisioning

Production launches with a minimal operational authority baseline:
- Exactly **1 Admin** profile for general platform stewardship.
- Exactly **1 Super User** profile for technical administration and emergency maintenance.
- Initial secretariat and servants are invited and assigned their groups on-demand.
