# دليل النشر المباشر والتشغيل الحي (Production Deployment Runbook)
## مشروع: مدرسة الكاروز للكتاب المقدس — EL KAROOZ School

**الإصدار:** v1.0.0-PROD  
**تاريخ الإصدار:** 2026-09-26  
**الفئة المستهدفة:** مهندسو النشر وإدارة النظام

---

### 1. خطوات نشر الواجهة الأمامية (Frontend Deployment on Vercel / Production Server):
1. ربط مستودع المشروع بمنصة النشر (Vercel / Next.js Server).
2. ضبط مسار الجذر على مجلد `frontend/`.
3. إدخال المتغيرات البيئية الإنتاجية:
   - `NEXT_PUBLIC_SUPABASE_URL=https://kgqgnqjkrghvktymbimz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=[REDACTED_PUBLIC_ANON_KEY]`
   - `NEXT_PUBLIC_BACKEND_API_URL=https://api.elkarooz-school.com`
4. تشغيل أمر البناء: `npm run build`.
5. التحقق من تفعيل شهادة SSL/TLS والتوجيه التلقائي `HTTP ➔ HTTPS`.

---

### 2. خطوات نشر الخادم الخلفي (Backend API Deployment on Hostinger):
1. رفع محتويات مجلد `backend-api/` إلى المجلد المخصص على خادم Hostinger (مثل `public_html/api/`).
2. التأكد من إصدار PHP: **PHP 8.1 أو PHP 8.2** مع تفعيل الامتدادات (`pdo, openssl, mbstring, json, zip`).
3. التأكد من إعدادات الإنتاج في `config/app.php`:
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `display_errors = Off` في إعدادات `php.ini`.
4. التحقق من صلاحيات مجلدات التخزين:
   - منح صلاحية `0755` لمجلدات `storage/gallery/`, `storage/mp3/`, `storage/books/`, `storage/backups/`.
   - التأكد من وجود ملف `storage/.htaccess` لمنع تنفيذ أي ملفات برمجية.

---

### 3. خطوات التحقق من قاعدة بيانات الإنتاج (Supabase PostgreSQL):
1. التأكد من تفعيل RLS على كافة الجداول الـ 46 بنسبة 100%.
2. التأكد من تفعيل Supabase Realtime على جداول `notifications` و `feed_posts` و `post_comments`.
3. التأكد من تعيين روابط النطاق المعتمدة (Site URL & Redirect URLs) على النطاق الرسمي `https://elkarooz-school.com`.

---

### 4. التحقق من إطلاق PWA و Web Push:
1. اختبار تثبيت التطبيق على هواتف Android و iOS وسطح المكتب.
2. التحقق من استلام إشعارات الويب وتوجيه الروابط العميقة (Deep Links) بنجاح.
