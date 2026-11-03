# مرجع واجهات البرمجة — EL KAROOZ SCHOOL API Reference

> **تاريخ التحديث:** 2026-10-31  
> **الإصدار:** `1.0.1`  
> **الحالة:** مرجع رسمي معتمد (Canonical — مطابق لـ `backend-api/public/index.php` و`frontend/src/app/api/`)

---

## 1. نظرة عامة وعقد الاستجابة

ينقسم النظام البرمجي الخلفي إلى طبقتين من المسارات:
1. **بوابة الخادم الخلفي PHP API (`backend-api/public/index.php`):** تضم **23 مساراً فعلياً** (24 شاملة مسار الجذر `/`) وتُستدعى من الواجهة عبر `phpApi()` في `frontend/src/lib/api/php.ts` باستخدام المتغير `NEXT_PUBLIC_PHP_API_URL`.
2. **مسارات Next.js الداخلية (`frontend/src/app/api/**/route.ts`):** تضم **3 مسارات** للفحص الصحي وتمرير طلبات إعادة ضبط النظام الآمنة بعد التحقق من رمز التأكيد الزمني (`HMAC-SHA256`) وكلمة مرور مدير النظام.

### الترويسات وعقد الغلاف (Response Envelope)
- **المصادقة:** `Authorization: Bearer <Supabase_JWT>` (مع دعم `X-Authorization: Bearer <Supabase_JWT>` كبديل).
- **غلاف النجاح (HTTP 200):**
  ```json
  {
    "status": "success",
    "message": "...",
    "data": {}
  }
  ```
- **غلاف الخطأ (HTTP 4xx / 5xx):**
  ```json
  {
    "status": "error",
    "error_code": "ERROR_CODE",
    "message": "رسالة عربية واضحة للمستخدم",
    "error_id": "ERR-..."
  }
  ```
  > ترفض دالة `phpApi()` في الواجهة الأمامية أي استجابة لا تحمل `"status": "success"` حتى لو كانت حالة HTTP هي `200`.

### الأدوار المعتمدة في النظام (`AppRole`)
- `admin`: مدير النظام (مع دعم تعدد مديري النظام `Co-System Administrators`).
- `supervisor`: المشرف العام / الأمين العام.
- `secretariat`: سكرتارية الفرقة / الأمانة العامة.
- `servant`: خادم الفرقة (مع صلاحيات مفوضة في `servant_permissions`).
- `trainee`: متدرب / مخدوم.
> **ملاحظة:** تم إلغاء الدور القديم `super_user` واستبداله بنموذج `admin` المتعدد و`supervisor`.

---

## 2. مسارات الخادم الخلفي PHP API (`backend-api/public/index.php`)

### 2.1 الصحة والمصادقة (Health & Auth)

| الطريقة والمسار | الوظيفة | المصادقة والأدوار | حد المعدل (Rate Limit) |
|---|---|---|---|
| `GET /` و `GET /health` | فحص صحة خادم PHP وإصدار البيئة | عام (بدون JWT) | غير مقيد |
| `GET /auth/verify` | التحقق من صلاحية رمز JWT وجلب الملف الحي من `profiles` (`role_id`, `group_id`, `is_active`) | JWT صالح (جميع الأدوار النشطة) | `30` طلب / `60` ثانية (مفتاح `auth`) |

### 2.2 التخزين والوسائط (`StorageController`)

| الطريقة والمسار | الوظيفة | المصادقة والأدوار | حد المعدل (Rate Limit) |
|---|---|---|---|
| `POST /storage/upload` | رفع ملف وفحص MIME وتوجيهه إلى Google Drive أو التخزين المحلي وتسجيله في `media_assets` | JWT — الأدوار: `admin`, `supervisor`, `servant`, `secretariat` (مع فحص `GroupScopeMiddleware` و`FileSecurityMiddleware`) | `20` طلب / `60` ثانية (مفتاح `upload`) |
| `POST /storage/delete` | حذف ملف من مساحة التخزين بناءً على `file_path` | JWT — الدور: `admin` فقط (`RbacMiddleware::requireSystemAdmin`) | `20` طلب / `60` ثانية (مفتاح `upload`) |
| `GET /storage/file/{id}` | بث ملف أو جلبه عبر معرف الأصل أو `drive_file_id` مع دعم `HTTP 206 Partial Content` | عام/موقّع حسب سجل `media_assets` | `120` طلب / `60` ثانية (مفتاح `storage_stream`) |

### 2.3 النسخ الاحتياطي والاستعادة الذرية (`BackupController` & `RestoreController`)

| الطريقة والمسار | الوظيفة | المصادقة والأدوار | حد المعدل (Rate Limit) |
|---|---|---|---|
| `POST /backup/create` | تصدير قاعدة البيانات والملفات وإنشاء أرشيف ZIP مشفر بـ AES-256 وتسجيله في `backup_records` | JWT — الدور: `admin` فقط | `5` طلبات / `300` ثانية (مفتاح `backup`) |
| `GET /backup/list` | عرض قائمة النسخ الاحتياطية المسجلة وحالتها | JWT — الدور: `admin` فقط | `60` طلب / `60` ثانية (مفتاح `backup`) |
| `POST /backup/validate-zip` | فحص سلامة وتشفير ومحتويات أرشيف نسخة احتياطية مرفوع (`backup_zip`, `encryption_password`) | JWT — الدور: `admin` فقط | `10` طلبات / `60` ثانية (مفتاح `backup`) |
| `POST /backup/delete` | حذف ناعم لسجل النسخة في `backup_records` وحذف ملف الـ ZIP من القرص | JWT — الدور: `admin` فقط | `30` طلب / `60` ثانية (مفتاح `backup`) |
| `POST /restore/preview` | معاينة وفحص أرشيف النسخة الاحتياطية قبل الاستعادة دون تعديل البيانات | JWT — الدور: `admin` فقط | `10` طلبات / `300` ثانية (مفتاح `restore`) |
| `POST /restore/execute` | تنفيذ الاستعادة الذرية (`FULL` / `DATABASE_ONLY` / `FILES_ONLY` مع `MERGE` أو `TRUNCATE`) | JWT — الدور: `admin` فقط | `2` طلب / `600` ثانية (مفتاح `restore`) |

### 2.4 الاستيراد والتصدير (`ImportController` & `ExportController`)

| الطريقة والمسار | الوظيفة | المصادقة والأدوار | حد المعدل (Rate Limit) |
|---|---|---|---|
| `POST /import/trainees` | استيراد جماعي للمتدربين من ملف CSV أو XLSX عبر الدالة الذرية `import_trainees_bulk_atomic` مع دعم `dry_run` | JWT — الدور: `admin` فقط | `10` طلبات / `300` ثانية (مفتاح `import`) |
| `GET /import/history` | استعراض سجل عمليات الاستيراد السابقة (`limit` من `1` إلى `200`) | JWT — الدور: `admin` فقط | `60` طلب / `60` ثانية (مفتاح `import`) |
| `GET /export/data` | تصدير البيانات (`entity=trainees\|attendance\|grades\|marathon\|audit`, `format=xlsx\|csv`, `group_id`) مع تحييد حقن المعادلات | JWT — الدور: `admin` فقط | `5` طلبات / `300` ثانية (مفتاح `export`) |

### 2.5 إعادة ضبط النظام الآمنة (`SystemResetController`)

| الطريقة والمسار | الوظيفة | المصادقة والأدوار | حد المعدل (Rate Limit) |
|---|---|---|---|
| `POST /system-reset/preview` | معاينة نطاق إعادة الضبط والتحقق من الجاهزية والموانع دون حذف | JWT حديث (`auth_time`) — الدور: `admin` نشط + `ResetAccessGate` | `10` طلبات / `60` ثانية (مفتاح `system_reset`) |
| `POST /system-reset/execute` | تنفيذ أو استئناف إعادة ضبط النظام متعددة المراحل بعد التحقق من النسخة الاحتياطية الحديثة وعبارة التأكيد | JWT حديث (`auth_time`) — الدور: `admin` نشط + `ResetAccessGate` | `20` طلب / `60` ثانية (مفتاح `system_reset`) |

### 2.6 موسوعة الكتاب المقدس والتفاسير (`BibleController`)

| الطريقة والمسار | الوظيفة | المعاملات (`Query Params`) | حد المعدل (Rate Limit) |
|---|---|---|---|
| `GET /bible/manifest` | جلب بيان حالة وإحصاءات بيانات الموسوعة الكتابية | — | `120` طلب / `60` ثانية (مفتاح `bible`) |
| `GET /bible/sections` | جلب الأقسام العشرة الرئيسية للموسوعة | — | `120` طلب / `60` ثانية (مفتاح `bible`) |
| `GET /bible/section-articles` | جلب قائمة مقالات قسم محدد مع ترقيم الصفحات | `section` (إلزامي)، `page`، `per_page`، `q` | `120` طلب / `60` ثانية (مفتاح `bible`) |
| `GET /bible/tree` | جلب شجرة الأسفار والإصحاحات أو الأقسام الفرعية | `section` (اختياري) | `120` طلب / `60` ثانية (مفتاح `bible`) |
| `GET /bible/article` | جلب نص مقال أو إصحاح أو تفسير كامل | `id` أو `slug` (ويدعم الكنترولر تمرير `path`, `book`, `ch`) | `180` طلب / `60` ثانية (مفتاح `bible_article`) |
| `GET /bible/search` | البحث النصي في آيات وتفاسير ومقالات الموسوعة | `q` (إلزامي)، `section`، `testament`، `book`، `page`، `per_page` | `120` طلب / `60` ثانية (مفتاح `bible_search`) |
| `GET /bible/stats` | جلب إحصاءات شاملة للموسوعة والأقسام | — | `120` طلب / `60` ثانية (مفتاح `bible`) |

---

## 3. مسارات Next.js API الداخلية (`frontend/src/app/api/`)

| الطريقة والمسار | الملف المصدري | الوظيفة والضوابط الأمنية |
|---|---|---|
| `GET /api/health` | `frontend/src/app/api/health/route.ts` | فحص جاهزية تطبيق Next.js (`status: ok`). |
| `POST /api/system-reset/preview` | `frontend/src/app/api/system-reset/preview/route.ts` | يتحقق من جلسة Supabase ودور `admin` النشط وترويسة `Origin`/`Host` وحد المعدل، ويصدر رمز تأكيد زمني موقّع بـ `HMAC-SHA256` مع تمرير المعاينة لبوابة PHP. |
| `POST /api/system-reset/execute` | `frontend/src/app/api/system-reset/execute/route.ts` | يتحقق من رمز `HMAC-SHA256` عبر `crypto.timingSafeEqual`، ويعيد التحقق من كلمة مرور المدير أمام Supabase Auth، ثم يمرر طلب التنفيذ لبوابة PHP. |
