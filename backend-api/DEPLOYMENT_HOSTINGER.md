# 🚀 Hostinger Deployment Guide - EL KAROOZ School

**Project:** EL KAROOZ School Backend API  
**Date:** 2026-10-06  
**Target:** Hostinger Shared Hosting

---

## 📋 Pre-Deployment Checklist

### ✅ Requirements Verified

- [x] PHP 8.0+ (Hostinger supports 8.0-8.3)
- [x] SQLite PDO extension (Enabled by default)
- [x] Composer dependencies installed
- [x] Bible Encyclopedia database (1.10 GB)
- [x] Environment configuration prepared

### 📦 Total Storage Required

| Component | Size |
|-----------|------|
| Backend PHP files | ~50 MB |
| Bible Encyclopedia SQLite | 1.10 GB |
| Bible JSON indexes | 30 MB |
| Bible images | 11.5 MB |
| Logs & cache | ~10 MB |
| **TOTAL** | **~1.2 GB** |

---

## 📁 Files to Upload

### Structure to Upload to Hostinger

```
public_html/
├── api/                          # Backend API (upload here)
│   ├── public/
│   │   ├── index.php            # Main entry point
│   │   └── .htaccess            # Rewrite rules
│   ├── src/
│   │   ├── Controllers/
│   │   ├── Services/
│   │   ├── Utils/
│   │   └── ...
│   ├── storage/
│   │   ├── bible/
│   │   │   ├── database/
│   │   │   │   └── bible_encyclopedia.sqlite (1.10 GB)
│   │   │   ├── data/
│   │   │   │   ├── tree_data.json
│   │   │   │   ├── sections.json
│   │   │   │   ├── search.json
│   │   │   │   └── takla_bible_cache/ (1,337 files)
│   │   │   └── images/
│   │   │       └── *.jpg (15 images)
│   │   ├── logs/
│   │   └── cache/
│   ├── vendor/                  # Composer dependencies
│   ├── .env                     # Environment config (create from .env.example)
│   └── composer.json
└── (Next.js frontend in root or subdirectory)
```

---

## 🔧 Step-by-Step Deployment

### Step 1: Prepare Local Files

```bash
# Navigate to backend directory
cd "E:\drive progect\ELKAROOZ SCHOOL\backend-api"

# Install/update Composer dependencies (production mode)
composer install --no-dev --optimize-autoloader

# Create production .env file
cp .env.example .env
# Edit .env with production values (see below)

# Verify file structure
ls -la
```

### Step 2: Create Production .env File

Create `backend-api/.env` with these values:

```env
# Production Environment
APP_ENV="production"
APP_DEBUG=false
APP_URL="https://elkaroozschool.com"

# Supabase (replace with your actual values)
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_KEY"

# JWT (generate secure random string)
JWT_SECRET="YOUR_SECURE_JWT_SECRET_HERE"
JWT_ALGORITHM="HS256"
JWT_EXPIRY=86400

# CORS (adjust to your domain)
CORS_ALLOWED_ORIGINS="https://elkaroozschool.com,https://www.elkaroozschool.com"

# File Upload
MAX_UPLOAD_SIZE=10485760
ALLOWED_MIME_TYPES="image/jpeg,image/png,image/webp,application/pdf"

# Logging
LOG_LEVEL="error"
LOG_PATH="storage/logs/php-error.log"

# Security
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

### Step 3: Compress for Upload

```bash
# Create ZIP archive (excluding unnecessary files)
tar -czf elkarooz-backend.tar.gz \
  --exclude="node_modules" \
  --exclude=".git" \
  --exclude=".env.example" \
  --exclude="*.log" \
  --exclude="DEPLOYMENT*.md" \
  --exclude="AUDIT*.md" \
  .
```

**OR** use FileZilla/cPanel File Manager to upload directly.

### Step 4: Upload to Hostinger

#### Option A: Using cPanel File Manager

1. Login to Hostinger cPanel
2. Navigate to **File Manager**
3. Go to `public_html/`
4. Create folder `api/`
5. Upload `elkarooz-backend.tar.gz` to `public_html/api/`
6. Right-click → **Extract**
7. Delete the `.tar.gz` file

#### Option B: Using FTP/SFTP (FileZilla)

```
Host: ftp.elkaroozschool.com (or IP from Hostinger)
Username: your_cpanel_username
Password: your_cpanel_password
Port: 21 (FTP) or 22 (SFTP)

Upload to: /public_html/api/
```

### Step 5: Set Permissions

In cPanel File Manager or via SSH:

```bash
# Storage directories (writable)
chmod 755 storage/
chmod 755 storage/logs/
chmod 755 storage/cache/
chmod 755 storage/bible/

# SQLite database (read-only for PHP)
chmod 644 storage/bible/database/bible_encyclopedia.sqlite

# .env file (secure)
chmod 600 .env

# Public directory
chmod 755 public/
chmod 644 public/index.php
```

### Step 6: Configure .htaccess

Ensure `public/.htaccess` contains:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    
    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} ^(.*)
    RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
    
    # Redirect to index.php
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>

# Disable directory listing
Options -Indexes

# Protect .env file
<Files .env>
    Order allow,deny
    Deny from all
</Files>
```

### Step 7: Verify PHP Version

In Hostinger cPanel:

1. Go to **Advanced** → **Select PHP Version**
2. Select **PHP 8.1** or **PHP 8.2** (recommended)
3. Enable these extensions:
   - ✅ pdo_sqlite
   - ✅ sqlite3
   - ✅ json
   - ✅ mbstring
   - ✅ curl
   - ✅ fileinfo

### Step 8: Test API Endpoints

```bash
# Test health check
curl https://elkaroozschool.com/api/health

# Test Bible API
curl https://elkaroozschool.com/api/bible/stats

# Test Bible search
curl "https://elkaroozschool.com/api/bible/search?q=يسوع"

# Test sections
curl https://elkaroozschool.com/api/bible/sections?grouped=1
```

Expected responses:

```json
// /api/health
{"status":"ok","timestamp":"2026-10-06T18:45:00Z"}

// /api/bible/stats
{
  "total_articles": 49249,
  "total_categories": 4,
  "total_sections": 37,
  "storage": "local",
  "database_size": 1179439104
}
```

---

## 🔍 Troubleshooting

### Issue: "500 Internal Server Error"

**Check PHP error logs:**

```bash
# In cPanel File Manager or FTP
cat storage/logs/php-error.log
```

**Common causes:**

1. ❌ `.env` file missing → Create from `.env.example`
2. ❌ Wrong permissions → Run chmod commands above
3. ❌ PDO SQLite not enabled → Enable in PHP extensions
4. ❌ SQLite file path wrong → Verify `storage/bible/database/bible_encyclopedia.sqlite` exists

### Issue: "SQLite database not found"

```bash
# Verify file exists
ls -lh storage/bible/database/bible_encyclopedia.sqlite

# Should show: -rw-r--r-- 1.1G bible_encyclopedia.sqlite
```

If missing, re-upload the Bible storage folder.

### Issue: "CORS errors from frontend"

Update `.env`:

```env
CORS_ALLOWED_ORIGINS="https://elkaroozschool.com,https://www.elkaroozschool.com"
```

### Issue: "Slow search queries"

**Check SQLite journal mode:**

```php
// Run this via PHP CLI or create test script
<?php
$db = new PDO('sqlite:storage/bible/database/bible_encyclopedia.sqlite');
$result = $db->query("PRAGMA journal_mode")->fetch();
echo "Journal mode: " . $result[0]; // Should be "wal"

// If not WAL, set it:
$db->exec("PRAGMA journal_mode = WAL");
?>
```

---

## 📊 Performance Monitoring

### Recommended Monitoring Points

1. **Disk Usage**
   - Monitor via cPanel → **Disk Usage**
   - Alert if > 80% capacity

2. **API Response Times**
   - Use GTmetrix or Pingdom
   - Target: < 200ms for cached queries

3. **SQLite Database Size**
   - Check monthly: `du -sh storage/bible/database/`
   - Should remain ~1.10 GB

4. **Log Files**
   - Rotate weekly: `logrotate` or manual cleanup
   - Keep max 7 days of logs

---

## 🔒 Security Checklist

- [ ] `.env` file has chmod 600
- [ ] SQLite database NOT in public directory
- [ ] Directory listing disabled (Options -Indexes)
- [ ] Error display OFF in production (APP_DEBUG=false)
- [ ] HTTPS enforced (Hostinger provides free SSL)
- [ ] Rate limiting enabled
- [ ] Strong JWT secret (64+ characters)
- [ ] CORS configured to specific domains only

---

## 🗂️ Backup Strategy

### Automatic Backups (Hostinger)

Hostinger provides automatic daily backups. To restore:

1. cPanel → **Backups**
2. Select date
3. Restore files or database

### Manual Backup (Weekly)

```bash
# Backup Bible database
tar -czf bible-backup-$(date +%Y%m%d).tar.gz storage/bible/

# Download via FTP
# Store offsite (Google Drive, Dropbox, etc.)
```

### Critical Files to Backup

1. `storage/bible/database/bible_encyclopedia.sqlite` (1.10 GB)
2. `.env` (environment config)
3. `storage/logs/` (for debugging)

---

## 🚀 Post-Deployment Steps

### 1. Update Frontend API URL

In Next.js frontend `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://elkaroozschool.com/api
```

### 2. Test All Endpoints

Run the test suite:

```bash
# Bible API tests
curl https://elkaroozschool.com/api/bible/stats
curl https://elkaroozschool.com/api/bible/sections?grouped=1
curl https://elkaroozschool.com/api/bible/tree
curl "https://elkaroozschool.com/api/bible/article?id=1"
curl "https://elkaroozschool.com/api/bible/search?q=في+البدء&limit=10"
```

### 3. Monitor for 48 Hours

- Check error logs daily
- Monitor response times
- Watch disk usage
- Test search performance

### 4. Enable Caching (Optional)

Add to `.htaccess` for static assets:

```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType application/json "access plus 1 day"
</IfModule>
```

---

## 📞 Support

### Hostinger Support

- **Website:** https://www.hostinger.com/contact
- **Live Chat:** 24/7 available in cPanel
- **Email:** support@hostinger.com

### Common Hostinger Limits

| Resource | Typical Limit |
|----------|---------------|
| Disk Space | 50-200 GB |
| Bandwidth | Unlimited (fair use) |
| PHP memory_limit | 512 MB |
| max_execution_time | 300 seconds |
| Concurrent connections | 100-150 |

---

## ✅ Deployment Checklist

- [ ] Composer dependencies installed (`vendor/`)
- [ ] Production `.env` created and configured
- [ ] Files uploaded to `public_html/api/`
- [ ] Permissions set correctly (755/644)
- [ ] PHP version set to 8.1+
- [ ] PDO SQLite extension enabled
- [ ] `.htaccess` configured
- [ ] Bible database uploaded (1.10 GB)
- [ ] API endpoints tested
- [ ] Error logs checked
- [ ] HTTPS/SSL working
- [ ] Frontend connected to API
- [ ] Backup strategy implemented

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Domain:** https://elkaroozschool.com  
**API Endpoint:** https://elkaroozschool.com/api

✅ **Ready for Production**
