# دليل النشر السريع على Hostinger 🚀

**آخر تحديث:** 2026-10-06  
**الوقت المتوقع:** 30-45 دقيقة  

---

## ✅ قائمة التحقق السريعة (Pre-Deployment Checklist)

قبل البدء، تأكد من توفر:

- [ ] حساب Hostinger نشط مع PHP 8.3+
- [ ] مساحة تخزين 5 GB+ متاحة
- [ ] SSH/FTP access credentials
- [ ] اسم النطاق مرتبط بـ Hostinger
- [ ] Supabase project credentials جاهزة
- [ ] JWT secret key جاهز

---

## 📦 الخطوات الأساسية (5 خطوات فقط)

### 1️⃣ بناء المشروع محليًا (5 دقائق)

```bash
# Frontend Build
cd frontend
npm run build
cd ..

# ضغط الملفات
cd backend-api
tar -czf ../backend-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='storage/logs/*' \
  .

cd ../frontend
tar -czf ../frontend-deploy.tar.gz out/

cd ../backend-api/storage/bible
tar -czf ../../../bible-deploy.tar.gz .
```

**الناتج:**
- `backend-deploy.tar.gz` (~5 MB)
- `frontend-deploy.tar.gz` (~30 MB)
- `bible-deploy.tar.gz` (~500 MB)

---

### 2️⃣ رفع الملفات على Hostinger (15 دقيقة)

**عبر SSH (الأسرع):**

```bash
# الاتصال بـ Hostinger
ssh username@your-domain.com

# إنشاء المجلدات
mkdir -p backend-api public_html

# رفع الملفات (من جهازك المحلي)
scp backend-deploy.tar.gz username@your-domain.com:~/backend-api/
scp frontend-deploy.tar.gz username@your-domain.com:~/public_html/
scp bible-deploy.tar.gz username@your-domain.com:~/backend-api/storage/

# فك الضغط (على الـ SSH)
cd ~/backend-api
tar -xzf backend-deploy.tar.gz
rm backend-deploy.tar.gz

cd ~/public_html
tar -xzf frontend-deploy.tar.gz
mv out/* .
rmdir out
rm frontend-deploy.tar.gz

cd ~/backend-api/storage
mkdir -p bible/database bible/data bible/images
tar -xzf bible-deploy.tar.gz -C bible/
rm bible-deploy.tar.gz
```

---

### 3️⃣ إعداد `.env` (5 دقائق)

```bash
cd ~/backend-api
cp .env.example .env
nano .env
```

**املأ هذه القيم فقط:**

```ini
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-key"
JWT_SECRET="your-random-secret-32chars-min"
APP_URL="https://your-domain.com"
CORS_ALLOWED_ORIGINS="https://your-domain.com"
```

احفظ (Ctrl+O) واخرج (Ctrl+X).

---

### 4️⃣ ضبط Permissions (2 دقيقة)

```bash
cd ~/backend-api

# Storage permissions
chmod -R 755 storage/
chmod 644 storage/bible/database/bible_encyclopedia.sqlite
chmod 644 .env

# Create logs directory
mkdir -p storage/logs
chmod 755 storage/logs
```

---

### 5️⃣ إنشاء `.htaccess` (5 دقائق)

**Backend `.htaccess`:**

```bash
nano ~/backend-api/public/.htaccess
```

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]

php_value max_execution_time 60
php_value memory_limit 256M
```

**Frontend `.htaccess`:**

```bash
nano ~/public_html/.htaccess
```

```apache
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# API Proxy
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ /home/username/backend-api/public/index.php [QSA,L]

# Next.js Routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]
```

**⚠️ استبدل `/home/username/` بمسارك الفعلي!**

---

## 🧪 الاختبار (5 دقائق)

### اختبار Backend API:

```bash
# Health Check
curl https://your-domain.com/api/health

# Bible Sections
curl https://your-domain.com/api/bible/sections

# Bible Search
curl "https://your-domain.com/api/bible/search?q=المسيح&limit=5"
```

**النتيجة المتوقعة:** JSON responses بدون أخطاء.

### اختبار Frontend:

افتح المتصفح:
- `https://your-domain.com/` → الصفحة الرئيسية
- `https://your-domain.com/bible/` → Bible Hub
- جرّب البحث عن "المسيح"
- افتح أي مقال

---

## ❌ إذا ظهرت أخطاء

### خطأ: "Unable to open database"

```bash
# تحقق من المسار
ls -lh ~/backend-api/storage/bible/database/bible_encyclopedia.sqlite

# إصلاح Permissions
chmod 644 ~/backend-api/storage/bible/database/bible_encyclopedia.sqlite
chmod 755 ~/backend-api/storage/bible/database/
```

### خطأ: "Class 'PDO' not found"

**في Hostinger cPanel:**
1. اذهب إلى PHP Configuration
2. Extensions → فعّل `pdo_sqlite` و `sqlite3`
3. Save → Restart

### خطأ: "500 Internal Server Error"

```bash
# تحقق من PHP error log
tail -50 ~/backend-api/storage/logs/php-error.log

# أو في cPanel → Error Logs
```

### خطأ: CORS

**في `backend-api/public/index.php` (أول الملف):**

```php
<?php
header('Access-Control-Allow-Origin: https://your-domain.com');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
```

---

## 🎯 معايير النجاح

بعد إكمال النشر، يجب أن ترى:

✅ API health check returns `{"status": "ok"}`  
✅ Bible sections تعرض 4 categories  
✅ Bible search يعيد نتائج في < 1 ثانية  
✅ Frontend يحمّل بدون أخطاء console  
✅ Bible Hub يعرض 4 أجنحة بشكل صحيح  
✅ قراءة المقالات تعمل  
✅ البحث يعمل مع highlighting  

---

## 📊 حجم التخزين النهائي

| المكون | الحجم |
|--------|-------|
| Backend PHP | ~10 MB |
| Frontend Static | ~50 MB |
| Bible SQLite | 1.12 GB |
| Bible JSON | 10.4 MB |
| Bible Images | 11.5 MB |
| Logs | ~1 MB |
| **الإجمالي** | **~1.2 GB** |

---

## 🔄 التحديثات المستقبلية

### لتحديث Backend فقط:

```bash
# بناء محلي
cd backend-api
tar -czf ../backend-update.tar.gz src/ public/ .env.example

# رفع
scp backend-update.tar.gz username@your-domain.com:~/
ssh username@your-domain.com
cd ~/backend-api
tar -xzf ../backend-update.tar.gz
rm ../backend-update.tar.gz
```

### لتحديث Frontend فقط:

```bash
# بناء محلي
cd frontend
npm run build
tar -czf ../frontend-update.tar.gz out/

# رفع
scp frontend-update.tar.gz username@your-domain.com:~/
ssh username@your-domain.com
cd ~/public_html
rm -rf _next/ bible/ # حذف القديم
tar -xzf ../frontend-update.tar.gz
mv out/* .
rmdir out
rm ../frontend-update.tar.gz
```

---

## 💡 نصائح للأداء

1. **تفعيل OPcache** في Hostinger PHP Configuration
2. **Enable Gzip** في `.htaccess`
3. **استخدم CDN** لـ static assets (Cloudflare مجاني)
4. **فعّل Browser Caching** في Frontend `.htaccess`

---

## ✅ انتهى!

مشروعك الآن حي على Hostinger مع:
- 🔥 49,249 مقال من الموسوعة الكنسية
- ⚡ بحث FTS5 بسرعة < 50ms
- 🎨 واجهة Coptic Dark Luxury
- 🔐 SQLite محلي آمن وسريع

**للدليل الكامل:** راجع `HOSTINGER_DEPLOYMENT_GUIDE.md`

---

**أي مشاكل؟** تحقق من:
1. `~/backend-api/storage/logs/php-error.log`
2. Hostinger cPanel → Error Logs
3. Browser Console (F12) → Network tab
