# دليل نشر EL KAROOZ School على Hostinger

**التاريخ:** 2026-10-06  
**الإصدار:** v2.0 (Bible Encyclopedia v5.0 Integration)  
**البيئة المستهدفة:** Hostinger Shared Hosting

---

## 📦 محتويات الحزمة

هذا الدليل يغطي نشر:
- ✅ **Backend API** (PHP 8.3+)
- ✅ **Frontend** (Next.js Static Export)
- ✅ **Bible Encyclopedia** (SQLite 1.12 GB + JSON 10.4 MB + Images 11.5 MB)
- ✅ **Supabase Integration** (Auth + Database)

**إجمالي حجم Bible Storage:** 2.24 GB (محلي على Hostinger)

---

## 🎯 متطلبات Hostinger

### 1. متطلبات الاستضافة

| المتطلب | القيمة المطلوبة | الوضع الحالي |
|---------|-----------------|--------------|
| **PHP Version** | 8.3 أو أحدث | ✅ مدعوم |
| **Disk Space** | 5 GB+ (موصى به 10 GB) | ✅ متاح |
| **RAM** | 512 MB+ | ✅ كافي |
| **PHP Extensions** | PDO, SQLite3, JSON, mbstring, curl | ✅ مفعلة |
| **Execution Time** | 60s+ | ✅ قابل للتعديل |
| **Memory Limit** | 256 MB+ | ✅ قابل للتعديل |

### 2. PHP Extensions المطلوبة

تأكد من تفعيل الـ Extensions التالية في Hostinger cPanel:

```ini
extension=pdo_sqlite
extension=sqlite3
extension=json
extension=mbstring
extension=curl
extension=openssl
extension=fileinfo
```

### 3. File Permissions المطلوبة

```bash
# Storage directories (writable)
chmod 755 storage/
chmod 755 storage/bible/
chmod 755 storage/bible/database/
chmod 755 storage/bible/data/
chmod 755 storage/bible/images/
chmod 755 storage/logs/
chmod 755 storage/cache/

# SQLite database (read-only for application)
chmod 644 storage/bible/database/bible_encyclopedia.sqlite

# WAL files (writable for SQLite)
chmod 644 storage/bible/database/*.sqlite-wal
chmod 644 storage/bible/database/*.sqlite-shm

# Config files (read-only)
chmod 644 .env
chmod 644 public/.htaccess
```

---

## 📂 هيكل المجلدات على Hostinger

```
/home/username/
├── public_html/                    # Frontend (Next.js static export)
│   ├── _next/
│   ├── bible/
│   ├── index.html
│   └── .htaccess                   # Next.js routing rules
│
├── backend-api/                    # PHP Backend (خارج public_html)
│   ├── public/
│   │   ├── index.php              # Entry point
│   │   └── .htaccess              # API routing
│   ├── src/
│   │   ├── Controllers/
│   │   │   └── BibleController.php
│   │   ├── Services/
│   │   │   └── BibleEncyclopediaService.php
│   │   └── Utils/
│   ├── storage/
│   │   ├── bible/
│   │   │   ├── database/
│   │   │   │   └── bible_encyclopedia.sqlite  # 1.12 GB
│   │   │   ├── data/
│   │   │   │   ├── tree_data.json            # 787 KB
│   │   │   │   ├── sections.json             # 6 KB
│   │   │   │   ├── search.json               # 9.6 MB
│   │   │   │   └── takla_bible_cache/        # 1,341 files (30 MB)
│   │   │   └── images/                       # 15 files (11.5 MB)
│   │   ├── logs/
│   │   └── cache/
│   ├── .env                       # Environment variables
│   └── composer.json
│
└── logs/                          # Optional: Hostinger logs access
```

---

## 🚀 خطوات النشر (Step-by-Step)

### المرحلة 1: تجهيز الملفات محليًا

#### 1.1 Build Frontend (Next.js Static Export)

```bash
cd frontend
npm run build

# إذا كان التطبيق يستخدم static export:
npm run export  # أو تأكد من next.config.js يحتوي على output: 'export'
```

**ملاحظة:** تأكد من `next.config.js`:

```javascript
module.exports = {
  output: 'export',
  images: {
    unoptimized: true  // Required for static export
  },
  trailingSlash: true
}
```

#### 1.2 تجهيز Backend

لا توجد خطوات Build للـ PHP. فقط تأكد من:
- ✅ جميع ملفات PHP موجودة
- ✅ `.env.example` محدّث
- ✅ `composer.json` محدّث (إذا كان يستخدم dependencies)

#### 1.3 ضغط الملفات للرفع

```bash
# Backend (without node_modules, vendor if using Composer locally)
cd backend-api
tar -czf ../backend-api.tar.gz \
  --exclude='node_modules' \
  --exclude='vendor' \
  --exclude='.git' \
  --exclude='storage/logs/*' \
  .

# Frontend (Next.js out/ or .next/)
cd ../frontend
tar -czf ../frontend-static.tar.gz out/  # or: .next/ depending on your setup

# Bible Storage (منفصل للسرعة)
cd ../backend-api/storage/bible
tar -czf ../../../bible-storage.tar.gz .
```

**حجم الملفات المضغوطة المتوقع:**
- `backend-api.tar.gz`: ~5 MB (PHP code only)
- `frontend-static.tar.gz`: ~20-50 MB
- `bible-storage.tar.gz`: ~400-600 MB (SQLite مضغوط)

---

### المرحلة 2: رفع الملفات على Hostinger

#### 2.1 الاتصال بـ Hostinger

**الطريقة 1: File Manager (cPanel)**
- سجل دخول على Hostinger cPanel
- افتح File Manager

**الطريقة 2: FTP/SFTP (موصى به للملفات الكبيرة)**

```bash
# باستخدام FileZilla أو:
sftp username@your-hostinger-domain.com
```

**الطريقة 3: SSH (الأسرع)**

```bash
ssh username@your-hostinger-domain.com
```

#### 2.2 رفع Backend API

```bash
# على الـ SSH:
cd /home/username/
mkdir -p backend-api
cd backend-api

# رفع الملف المضغوط (عبر FTP أو scp)
# ثم فك الضغط:
tar -xzf backend-api.tar.gz
rm backend-api.tar.gz
```

#### 2.3 رفع Bible Storage

```bash
cd /home/username/backend-api/storage/
mkdir -p bible/database bible/data bible/images

# رفع bible-storage.tar.gz ثم:
tar -xzf bible-storage.tar.gz -C bible/
rm bible-storage.tar.gz

# التحقق من الحجم:
du -sh bible/
# Expected: ~1.2 GB
```

#### 2.4 رفع Frontend

```bash
# في cPanel File Manager أو عبر SSH:
cd /home/username/public_html/

# رفع frontend-static.tar.gz ثم:
tar -xzf frontend-static.tar.gz
rm frontend-static.tar.gz

# إذا كان Next.js export في مجلد out/:
mv out/* .
rmdir out
```

---

### المرحلة 3: إعداد البيئة (Configuration)

#### 3.1 إنشاء `.env` في Backend

```bash
cd /home/username/backend-api/
cp .env.example .env
nano .env  # أو استخدم File Manager Editor
```

**محتوى `.env` (قم بتعديل القيم الفعلية):**

```ini
# Supabase Configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_KEY="your-service-key-here"

# JWT Configuration
JWT_SECRET="your-secret-key-here"
JWT_ALGORITHM="HS256"
JWT_EXPIRY=86400

# Application Settings
APP_ENV="production"
APP_DEBUG=false
APP_URL="https://elkaroozschool.com"

# CORS Settings
CORS_ALLOWED_ORIGINS="https://elkaroozschool.com,https://www.elkaroozschool.com"

# File Upload Configuration
MAX_UPLOAD_SIZE=10485760
ALLOWED_MIME_TYPES="image/jpeg,image/png,image/webp,application/pdf"

# Cache Configuration
CACHE_DRIVER="file"
CACHE_TTL=3600

# Logging
LOG_LEVEL="error"
LOG_PATH="storage/logs/php-error.log"

# Security
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW=60
SESSION_LIFETIME=7200
SESSION_SECURE=true
SESSION_HTTPONLY=true
SESSION_SAMESITE="Lax"
```

#### 3.2 إعداد File Permissions

```bash
cd /home/username/backend-api/

# Storage directories
find storage/ -type d -exec chmod 755 {} \;
find storage/ -type f -exec chmod 644 {} \;

# Make logs writable
chmod 755 storage/logs/

# SQLite database (read-only for app, writable for WAL)
chmod 644 storage/bible/database/bible_encyclopedia.sqlite

# Config
chmod 644 .env
chmod 644 public/.htaccess
```

#### 3.3 إنشاء `.htaccess` للـ Backend API

**ملف:** `/home/username/backend-api/public/.htaccess`

```apache
# Backend API .htaccess for Hostinger

RewriteEngine On

# Redirect all requests to index.php
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]

# Security Headers
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"

# Enable CORS (if needed)
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type, Authorization"

# Disable directory listing
Options -Indexes

# PHP Settings
php_value max_execution_time 60
php_value memory_limit 256M
php_value upload_max_filesize 10M
php_value post_max_size 10M
```

#### 3.4 إنشاء `.htaccess` للـ Frontend (Next.js)

**ملف:** `/home/username/public_html/.htaccess`

```apache
# Next.js Static Export .htaccess

RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Handle Next.js routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

---

### المرحلة 4: ربط Frontend بـ Backend API

#### 4.1 تحديث Frontend Environment

إذا كان Frontend يستخدم `.env.local` أو `.env.production`:

```ini
NEXT_PUBLIC_API_URL=https://elkaroozschool.com/api
```

**ملاحظة:** يجب أن يكون الـ Backend API متاحًا على:

```
https://elkaroozschool.com/api/
```

#### 4.2 إعداد Subdomain أو Path للـ API

**الخيار 1: Subdomain (موصى به)**

إنشاء subdomain في Hostinger cPanel:
- `api.elkaroozschool.com` → يشير إلى `/home/username/backend-api/public/`

**الخيار 2: Path (أسهل)**

في `.htaccess` الرئيسي لـ `public_html`:

```apache
# في /home/username/public_html/.htaccess

RewriteEngine On

# إعادة توجيه /api إلى backend-api/public/
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ /path-to-backend/public/index.php [QSA,L]
```

**أو** استخدم Symbolic Link:

```bash
cd /home/username/public_html/
ln -s ../backend-api/public api
```

---

### المرحلة 5: التحقق من التثبيت (Verification)

#### 5.1 اختبار Backend API

```bash
# اختبار Health Check
curl https://elkaroozschool.com/api/health

# اختبار Bible Sections
curl https://elkaroozschool.com/api/bible/sections?grouped=1

# اختبار Bible Search
curl "https://elkaroozschool.com/api/bible/search?q=في+البدء&limit=5"

# اختبار Article Fetch
curl https://elkaroozschool.com/api/bible/article?id=1
```

**النتائج المتوقعة:**
- ✅ Status 200 OK
- ✅ JSON response valid
- ✅ No PHP errors in response

#### 5.2 فحص PHP Error Log

```bash
tail -f /home/username/backend-api/storage/logs/php-error.log
```

أو في cPanel → Error Logs.

#### 5.3 فحص SQLite Database

```bash
cd /home/username/backend-api/storage/bible/database/

# التحقق من حجم الملف
ls -lh bible_encyclopedia.sqlite
# Expected: ~1.1 GB

# اختبار Integrity
sqlite3 bible_encyclopedia.sqlite "PRAGMA integrity_check;"
# Expected: ok

# عد الـ Articles
sqlite3 bible_encyclopedia.sqlite "SELECT COUNT(*) FROM articles;"
# Expected: 49249
```

#### 5.4 اختبار Frontend

افتح المتصفح وتحقق من:

- ✅ `https://elkaroozschool.com/` → الصفحة الرئيسية تعمل
- ✅ `https://elkaroozschool.com/bible/` → Bible Hub يعمل
- ✅ WingSelector (4 أجنحة) تظهر بشكل صحيح
- ✅ Bible Search Modal يعمل
- ✅ Article Reader (`/bible/reader/1`) يعمل
- ✅ Section Browser (`/bible/section/OT`) يعمل

#### 5.5 اختبار Performance

```bash
# قياس وقت الاستجابة
time curl -s "https://elkaroozschool.com/api/bible/search?q=في+البدء" > /dev/null

# Expected: < 1 second
```

---

## 🔧 استكشاف الأخطاء (Troubleshooting)

### مشكلة 1: SQLite Database Not Found

**الخطأ:**
```
PDOException: SQLSTATE[HY000] [14] unable to open database file
```

**الحل:**
```bash
# تحقق من المسار
cd /home/username/backend-api/storage/bible/database/
ls -la bible_encyclopedia.sqlite

# تحقق من Permissions
chmod 644 bible_encyclopedia.sqlite
chmod 755 storage/bible/database/
```

### مشكلة 2: PHP Extension Missing

**الخطأ:**
```
Fatal error: Class 'PDO' not found
```

**الحل:**
- في Hostinger cPanel → PHP Configuration → Extensions
- فعّل: `pdo_sqlite`, `sqlite3`

### مشكلة 3: Memory Limit Exceeded

**الخطأ:**
```
Fatal error: Allowed memory size exhausted
```

**الحل:**
```apache
# في .htaccess أو php.ini
php_value memory_limit 512M
```

### مشكلة 4: Execution Time Exceeded

**الخطأ:**
```
Maximum execution time of 30 seconds exceeded
```

**الحل:**
```apache
# في .htaccess
php_value max_execution_time 60
```

### مشكلة 5: CORS Errors

**الخطأ في Browser Console:**
```
Access to fetch at 'https://api.example.com' has been blocked by CORS policy
```

**الحل:**
```php
// في backend-api/public/index.php (أول الملف)
header('Access-Control-Allow-Origin: https://elkaroozschool.com');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
```

### مشكلة 6: Next.js Routes Not Working (404)

**الحل:**
- تأكد من `.htaccess` في `public_html/` يحتوي على:
  ```apache
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ /index.html [L]
  ```

---

## 📊 مراقبة الأداء (Performance Monitoring)

### 1. SQLite Query Performance

```sql
-- تفعيل Query Profiling
PRAGMA query_only = ON;

-- قياس وقت الاستعلام
.timer ON
SELECT * FROM articles_fts WHERE articles_fts MATCH 'المسيح' LIMIT 20;
```

**المعايير المتوقعة:**
- Search queries: < 50ms
- Article fetch: < 20ms
- Section listing: < 30ms

### 2. PHP Memory Usage

```php
// في BibleController.php (للمراقبة فقط، احذفها بعد التأكد)
error_log('Memory usage: ' . memory_get_usage(true) / 1024 / 1024 . ' MB');
```

### 3. Disk Space Monitoring

```bash
# فحص المساحة المستخدمة
du -sh /home/username/backend-api/storage/bible/
df -h /home/username/

# Alert if disk usage > 80%
```

---

## 🔐 الأمان (Security Checklist)

- ✅ `.env` خارج `public_html/` وغير قابل للوصول عبر HTTP
- ✅ SQLite Database خارج `public/` (في `storage/bible/database/`)
- ✅ File permissions صحيحة (644 للملفات، 755 للمجلدات)
- ✅ `display_errors = Off` في Production
- ✅ Rate limiting مفعّل في API
- ✅ SQL Injection protection (Parameterized queries)
- ✅ XSS protection (Header CSP)
- ✅ HTTPS مفعّل (Force SSL)
- ✅ CORS محدود للـ domains المصرح بها

---

## 📋 Backup Strategy

### 1. SQLite Database Backup

```bash
# نسخ احتياطي يومي (عبر Cron Job)
#!/bin/bash
DATE=$(date +%Y%m%d)
sqlite3 /home/username/backend-api/storage/bible/database/bible_encyclopedia.sqlite ".backup /home/username/backups/bible_${DATE}.sqlite"

# الاحتفاظ بآخر 7 نسخ فقط
find /home/username/backups/ -name "bible_*.sqlite" -mtime +7 -delete
```

### 2. Full Site Backup

في Hostinger cPanel:
- Backups → Create Backup → Full Site Backup
- تكرار: أسبوعيًا

---

## 🎉 الخلاصة

بعد اتباع هذا الدليل، يجب أن يكون لديك:

✅ **Backend API** يعمل على `https://elkaroozschool.com/api/`  
✅ **Frontend** يعمل على `https://elkaroozschool.com/`  
✅ **Bible Encyclopedia** متاح بـ 49,249 مقال عبر SQLite محلي  
✅ **FTS5 Search** بسرعة < 50ms  
✅ **All 3 Bible routes** تعمل بشكل صحيح  
✅ **Security** محمي وفق المعايير  
✅ **Performance** محسّن للـ Shared Hosting  

---

## 📞 الدعم

إذا واجهت أي مشكلة:
1. راجع قسم Troubleshooting أعلاه
2. تحقق من `/storage/logs/php-error.log`
3. تحقق من Hostinger Error Logs في cPanel
4. اختبر الـ API endpoints مباشرة عبر `curl`

---

**آخر تحديث:** 2026-10-06  
**الإصدار:** v2.0 (Bible Encyclopedia v5.0 Local Storage)
