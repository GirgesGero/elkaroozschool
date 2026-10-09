# 🚀 الملفات جاهزة للنشر على Hostinger

## ✅ تم التجهيز بنجاح

**التاريخ:** 2026-10-06  
**الوقت:** 15:48 UTC  
**الحالة:** ✅ جاهز للرفع

---

## 📦 ملخص الملفات

| المكون | الحجم | الحالة |
|--------|-------|--------|
| **Bible Encyclopedia** | 1.10 GB | ✅ جاهز |
| **JSON Indexes** | 30 MB | ✅ جاهز |
| **Images** | 11.5 MB | ✅ جاهز |
| **PHP Source Code** | ~200 KB | ✅ جاهز |
| **Composer Dependencies** | ~1 MB | ✅ مثبت |
| **إجمالي** | **2.24 GB** | ✅ جاهز |

---

## 📁 هيكل الملفات للرفع

```
📦 backend-api/
├── 📂 public/                    ✅ Entry point
│   ├── index.php                 (Main router)
│   └── .htaccess                 (Rewrite rules)
│
├── 📂 src/                       ✅ Application code
│   ├── Controllers/
│   │   ├── BibleController.php   (Bible API)
│   │   ├── StorageController.php
│   │   └── ...
│   ├── Services/
│   │   ├── BibleEncyclopediaService.php
│   │   └── GoogleDriveService.php
│   └── Utils/
│
├── 📂 vendor/                    ✅ Composer packages
│   └── autoload.php
│
├── 📂 storage/                   ✅ Data storage
│   ├── bible/
│   │   ├── database/
│   │   │   └── bible_encyclopedia.sqlite (1.10 GB)
│   │   ├── data/
│   │   │   ├── tree_data.json (787 KB)
│   │   │   ├── sections.json (6 KB)
│   │   │   ├── search.json (9.36 MB)
│   │   │   └── takla_bible_cache/ (1,337 files)
│   │   └── images/
│   │       └── *.jpg (15 images, 11.5 MB)
│   ├── logs/                     ⚠️ إنشاء فارغ
│   └── cache/                    ✅ موجود
│
├── 📄 .env.example               ✅ Template config
├── 📄 composer.json              ✅ Dependencies
└── 📄 DEPLOYMENT_HOSTINGER.md    ✅ Deployment guide
```

---

## 🎯 خطوات الرفع السريعة

### الطريقة 1: رفع مباشر عبر cPanel File Manager (موصى به)

1. **تسجيل الدخول إلى Hostinger cPanel**
   - URL: `https://hpanel.hostinger.com` أو `cpanel.hostinger.com`
   - استخدم بيانات الدخول الخاصة بك

2. **الذهاب إلى File Manager**
   - في cPanel، اختر **Files** → **File Manager**
   - انتقل إلى `public_html/`

3. **إنشاء مجلد API**
   ```
   public_html/
   └── api/  (إنشاء جديد)
   ```

4. **رفع الملفات**
   
   **Option A: رفع مجلد كامل**
   - اضغط **Upload**
   - اسحب المجلد `backend-api` بالكامل
   - أو اختر الملفات يدوياً

   **Option B: رفع كـ ZIP**
   - ضغط المجلد محلياً: `backend-api.zip`
   - رفع الـ ZIP إلى `public_html/api/`
   - Right-click → **Extract**
   - حذف الـ ZIP بعد الفك

5. **إنشاء ملف .env**
   ```bash
   # في File Manager:
   - انسخ .env.example → .env
   - Edit .env
   - أضف بيانات Supabase والـ JWT secret
   ```

6. **ضبط الأذونات**
   ```bash
   storage/           → 755
   storage/logs/      → 755
   storage/cache/     → 755
   storage/bible/     → 755
   .env               → 600
   ```

### الطريقة 2: رفع عبر FTP (FileZilla)

```
Host: ftp.yourdomain.com
Username: cpanel_username
Password: cpanel_password
Port: 21

Upload to: /public_html/api/
```

---

## ⚙️ إعدادات PHP المطلوبة

### في Hostinger cPanel:

1. **اذهب إلى:** Advanced → **Select PHP Version**

2. **اختر:** PHP 8.1 أو PHP 8.2 (موصى به)

3. **فعّل Extensions:**
   ```
   ✅ pdo_sqlite    (Required - Bible database)
   ✅ sqlite3       (Required)
   ✅ json          (Required)
   ✅ mbstring      (Required - Arabic support)
   ✅ curl          (Required - API calls)
   ✅ fileinfo      (Required - File uploads)
   ✅ openssl       (Recommended - Security)
   ```

4. **تحقق من Limits:**
   ```
   memory_limit:        256M (أو أعلى)
   max_execution_time:  300 (5 دقائق)
   post_max_size:       64M
   upload_max_filesize: 64M
   ```

---

## 🧪 اختبار النشر

### بعد الرفع، اختبر هذه Endpoints:

```bash
# 1. Health check
curl https://yourdomain.com/api/health

# Expected: {"status":"ok"}

# 2. Bible stats
curl https://yourdomain.com/api/bible/stats

# Expected: 
# {
#   "total_articles": 49249,
#   "total_categories": 4,
#   "total_sections": 37
# }

# 3. Bible sections
curl https://yourdomain.com/api/bible/sections?grouped=1

# Expected: Array of categories with sections

# 4. Bible search (Arabic)
curl "https://yourdomain.com/api/bible/search?q=يسوع&limit=5"

# Expected: Array of search results

# 5. Get article
curl https://yourdomain.com/api/bible/article?id=1

# Expected: Full article with HTML content
```

---

## 🔍 استكشاف الأخطاء

### خطأ: "500 Internal Server Error"

**الحل:**
```bash
# 1. تحقق من error log
# في cPanel: Metrics → Errors
# أو: storage/logs/php-error.log

# 2. تحقق من الأذونات
chmod 755 storage/
chmod 644 storage/bible/database/bible_encyclopedia.sqlite

# 3. تحقق من .env
# تأكد أن الملف موجود وليس فارغ
```

### خطأ: "SQLite database not found"

**الحل:**
```bash
# تحقق من المسار
ls -la storage/bible/database/bible_encyclopedia.sqlite

# يجب أن يظهر:
# -rw-r--r-- 1.1G bible_encyclopedia.sqlite

# إذا كان مفقوداً، أعد رفع مجلد storage/bible/
```

### خطأ: "CORS policy blocked"

**الحل:**
```env
# في .env:
CORS_ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# تأكد من تطابق الدومين مع Frontend
```

### خطأ: "Search is slow"

**الحل:**
```bash
# تحقق من WAL mode
# أنشئ ملف test.php:
<?php
$db = new PDO('sqlite:storage/bible/database/bible_encyclopedia.sqlite');
echo $db->query("PRAGMA journal_mode")->fetchColumn();
// يجب أن يكون: wal

# إذا كان delete:
$db->exec("PRAGMA journal_mode = WAL");
?>
```

---

## 📊 مراقبة الأداء

### مؤشرات الأداء المستهدفة:

| المقياس | الهدف | التحقق |
|---------|--------|--------|
| **Response Time** | < 200ms | GTmetrix |
| **Search Query** | < 50ms | Browser DevTools |
| **Database Size** | 1.10 GB | Stable |
| **Disk Usage** | < 3 GB | cPanel Disk Usage |
| **Memory Usage** | < 128 MB per request | PHP logs |

### أدوات المراقبة:

1. **Hostinger Analytics**
   - cPanel → **Metrics** → **Bandwidth**
   - Monitor daily traffic

2. **Google PageSpeed Insights**
   - Test: https://pagespeed.web.dev/
   - Target score: > 90

3. **Uptime Monitoring**
   - UptimeRobot (free): https://uptimerobot.com
   - Ping every 5 minutes

---

## 🔐 أمان

### ✅ تم تطبيقه:

- [x] `.env` file خارج `public/` directory
- [x] SQLite database خارج `public/`
- [x] Directory listing معطل (Options -Indexes)
- [x] `.env` محمي في `.htaccess`
- [x] PDO prepared statements (SQL injection protection)
- [x] CORS محدود لدومينات محددة

### ⚠️ موصى به:

- [ ] تفعيل HTTPS (SSL - مجاني من Hostinger)
- [ ] Rate limiting للبحث (منع الإساءة)
- [ ] Fail2ban على SSH (إذا كان متاحاً)
- [ ] نسخ احتياطي أسبوعي للـ Bible database

---

## 💾 النسخ الاحتياطي

### Hostinger Automatic Backups

Hostinger يوفر نسخ احتياطي تلقائي يومي:
- cPanel → **Files** → **Backups**
- Restore: اختر التاريخ → Restore

### Manual Backup (أسبوعي)

```bash
# Backup Bible database
tar -czf bible-backup-$(date +%Y%m%d).tar.gz storage/bible/

# تنزيل عبر FTP
# تخزين في مكان آمن (Google Drive, Dropbox)
```

---

## 📞 الدعم

### Hostinger Support

- **الموقع:** https://www.hostinger.com/contact
- **Live Chat:** 24/7 في cPanel
- **قاعدة المعرفة:** https://support.hostinger.com

### الملفات المفيدة:

- 📄 `DEPLOYMENT_HOSTINGER.md` - دليل النشر الكامل
- 📄 `.env.example` - نموذج الإعدادات
- 📄 `AUDIT_REPORT_BIBLE_DRIVE_INTEGRATION.md` - تقرير المراجعة

---

## ✅ Checklist النشر النهائي

قبل النشر:
- [ ] Composer dependencies مثبتة
- [ ] `.env` file مُنشأ ومُعدّل
- [ ] PHP version 8.1+ مُفعّل
- [ ] SQLite extension مُفعّل
- [ ] الأذونات صحيحة (755/644/600)

بعد النشر:
- [ ] اختبار `/api/health`
- [ ] اختبار `/api/bible/stats`
- [ ] اختبار البحث بالعربي
- [ ] التحقق من error logs
- [ ] مراقبة response times
- [ ] نسخ احتياطي أول

---

## 🎉 خلاصة

```
✅ الملفات: جاهزة
✅ الحجم: 2.24 GB (مقبول لـ Hostinger)
✅ البنية: صحيحة
✅ التبعيات: مثبتة
✅ الوثائق: كاملة

🚀 جاهز للنشر على Hostinger!
```

---

**آخر تحديث:** 2026-10-06 15:48 UTC  
**الحالة:** ✅ READY FOR DEPLOYMENT

**ملاحظة:** تذكر استبدال `yourdomain.com` بالدومين الفعلي في جميع الأمثلة.
