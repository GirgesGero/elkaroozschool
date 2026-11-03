# التقرير الشامل للمراجعة الهندسية والأمنية والمنطقية — EL KAROOZ SCHOOL
## Comprehensive Multi-Agent Full-Project Code, Security, Performance & Documentation Audit

- **تاريخ المراجعة المحدّثة:** 2026-10-31
- **الإصدار المفحوص:** `1.0.1` (`commit 578a55e`)
- **منهجية المراجعة:** مراجعة متوازية شاملة عبر فريق من 5 وكلاء متخصصين (`PHP Backend Security Reviewer`، `Frontend Pages Logic Reviewer`، `Frontend Core Libraries Reviewer`، `Database RLS And Scripts Reviewer`، و`Documentation Accuracy Auditor`) مع التحقق المباشر من كل سطر برمجي وتشغيل الفحوصات الآلية.

---

## 1. ملخص المؤشرات والتحقق الآلي (Baseline Metrics — 2026-10-31)

| المؤشر / الفحص | النتيجة الفعلية اليوم | الملاحظات |
|---|---|---|
| **TypeScript (`npx tsc --noEmit`)** | ✅ `0` أخطاء | مع ضرورة إزالة `ignoreBuildErrors: true` من `next.config.mjs:20` وتحديث `types/supabase.ts` (`DB-09`, `FL-11`). |
| **اختبارات الواجهة (`npx vitest run`)** | ✅ `219 / 219` ناجح (`23` ملف اختبار) | يجب استبدال الدوال المنسوخة محلياً في 5 ملفات اختبار باستيراد وحدات الكود الفعلي (`FL-14`). |
| **فحص ESLint (`npx next lint`)** | ⚠️ `0` أخطاء / `19` تحذيراً | 15 تحذير `react-hooks/exhaustive-deps` و4 تحذيرات `@next/next/no-img-element`. |
| **مسارات الواجهة (`frontend/src/app`)** | `27` صفحة (`page.tsx`) + `3` مسارات API (`route.ts`) | إجمالي 30 مساراً. |
| **مسارات الخلفية (`backend-api/public/index.php`)** | `23` مساراً فعلياً (`24` شاملة `/`) | موزعة على 8 Controllers و6 طبقات Middleware. |
| **ملفات الهجرة (`supabase/migrations`)** | `49` ملف `.sql` محلي | مع فجوة لـ 35 ملف ترحيل وسيط (`017`–`052`) مسجل في `schema_live_snapshot.sql` (`DB-01`). |
| **إجمالي الملاحظات المكتشفة والموثقة** | **74 ملاحظة** | **7 حرجة (Critical)**، **26 عالية (High)**، **29 متوسطة (Medium)**، **12 منخفضة (Low)**. |

---

## 2. مصفوفة التحقق من مشاكل التقارير السابقة (Verification of Previously Reported Issues)

تم فحص جميع البنود التي سُجلت في المراجعات السابقة (`2026-10-11` و`2026-10-14`) للتحقق من حالتها الفعلية في الكود اليوم:

| البند السابق | الملف والسطر | الحالة الحالية في الكود (`2026-10-31`) |
|---|---|---|
| متغير `$storageRoot` غير معرّف في `BackupController::delete()` | `backend-api/src/Controllers/BackupController.php:385-403` | ✅ **تم الإصلاح بالكامل** (يستخدم `$backupRoot` مع فحص الاحتواء `realpath`). |
| غياب رابط Vercel `https://elkaroozschool1.vercel.app` من CORS | `backend-api/config/app.php:7-11` | ✅ **تم الإصلاح بالكامل**. |
| غياب ترويسة `X-Authorization` من `allowed_headers` في CORS | `backend-api/config/app.php:25` | ✅ **تم الإصلاح بالكامل**. |
| UUID المدير الثابت في `StorageBridgeService` | `backend-api/src/Services/StorageBridgeService.php:269-275` | ✅ **تم الإصلاح بالكامل** (يرفض الرفع عند غياب الهوية). |
| إضافة ترويسة `Content-Security-Policy` في PHP API | `backend-api/src/Middleware/CorsMiddleware.php:25` | ✅ **تم الإصلاح بالكامل** في الخادم الخلفي (وما زالت مطلوبة في `frontend/next.config.mjs` — `FL-11`). |
| إنشاء `supabase` خارج `useEffect` وحقن PostgREST في `admin/audit` | `frontend/src/app/admin/audit/page.tsx:64, 80, 105` | ✅ **تم الإصلاح بالكامل**. |
| استخدام `dangerouslySetInnerHTML` بدون `DOMPurify` في صفحات الكتاب المقدس | `frontend/src/app/bible/page.tsx:44, 770` و`reader/[id]/page.tsx:7, 152` | ✅ **تم الإصلاح بالكامل** عبر `DOMPurify.sanitize`. |
| دعم قراءة ملفات `.xlsx` في `ImportController` | `backend-api/src/Controllers/ImportController.php:29-31` | ⚠️ **أُصلح جزئياً** (أُضيفت `parseXlsx` مع بقاء مشاكل BOM والحجم الموضحة في `BE-09`). |
| المسح الشجري الكامل في `StorageBridgeService::streamLocalFile()` | `backend-api/src/Services/StorageBridgeService.php:235, 341-362` | ❌ **الإصلاح غير فعّال (`BE-08`)** لأن `drive_file_id` يُحفظ بصيغة `local_<hex>` وليس المسار النسبي، فيفشل الفحص المباشر دائماً ويعود إلى `RecursiveIteratorIterator`. |
| الإنشاء الذري لسؤال الماراثون وفلترة العناصر المؤرشفة | `frontend/src/app/marathon/manage/page.tsx:184-189, 271-293` | ⚠️ **أُصلح جزئياً (`FP-01`)** (أُضيف RPC `create_marathon_question` لكن مقارنة الخيار الصحيح تتم بالنص، ولا يتم تحديث القائمة بعد الإضافة، ولا تُفلتر الأسئلة المؤرشفة). |
| منع تسريب `is_correct` في واجهة لاعب الماراثون | `frontend/src/app/marathon/[id]/page.tsx:298, 328-342` | ⚠️ **أُصلح أمنياً وأحدث خللاً بصرياً (`FP-02`)** (تظهر علامة خطأ حمراء `XCircle` على جميع إجابات الطالب بعد تسليم الماراثون لأن `is_correct` محذوف دائماً). |

---

## 3. مشاكل الخادم الخلفي — PHP Backend API (`BE-01` إلى `BE-13`)

### `BE-01` — [Critical] عدم فك غلاف استجابة `SupabaseClient::rpc()` يعطّل النسخ الاحتياطي والاستعادة بنسبة 100%
- **الملف والسطر:** `backend-api/src/Services/SupabaseClient.php:56-73`، `backend-api/src/Services/DatabaseExportService.php:163-175, 275-279`، `backend-api/src/Services/DatabaseRestoreService.php:202-223`
- **المشكلة:** تعيد دالة `SupabaseClient::rpc()` مصفوفة مغلّفة على الشكل `['status' => $httpCode, 'data' => $decoded]`. بينما يقرأ كل من `DatabaseExportService` و`DatabaseRestoreService` الحقول `$result['tables']` و`$page['rows']` و`$report['tables_restored']` من المستوى الأعلى مباشرة بدلاً من `$result['data'][...]`.
- **الأثر:**
  1. يفشل `POST /backup/create` دائماً بخطأ `export_manifest() returned no tables`.
  2. في `POST /restore/execute`، تفشل نسخة الأمان `snapshotDatabase()` بصمت، ثم تُنفَّذ استعادة قاعدة البيانات فعلياً في Supabase، ثم يقرأ `DatabaseRestoreService` الحقل `$report['tables_restored']` فيجده `null` ويرمي استثناءً يؤدي للتراجع عن الملفات فقط وبقاء قاعدة البيانات معدّلة دون إمكانية تراجع!
- **الإصلاح المقترح:** التحقق من `$res['status']` بين 200 و299 وفك غلاف `$payload = $res['data'] ?? $res` في كلا الخدمتين.

### `BE-02` — [Critical] خطر تزوير توكنات `HS256` إذا ضُبط `SUPABASE_JWT_SECRET` على رابط علني أو مفتاح ضعيف
- **الملف والسطر:** `backend-api/src/Middleware/JwtAuthMiddleware.php:131-169`، `backend-api/config/supabase.php:13-18`، `backend-api/hostinger.env.example:16`
- **المشكلة:** كان قالب `hostinger.env.example:16` يضع رابط `jwks.json` العلني كقيمة لـ `SUPABASE_JWT_SECRET`، بينما يعتمد `JwtAuthMiddleware::decodeAndVerifyClaims()` على `$header['alg']` القادم من التوكن ليختار التحقق المتماثل `HS256` باستخدام `SUPABASE_JWT_SECRET`، دون التحقق من أن السر لا يبدأ بـ `http://` أو `https://` ودون فحص `aud === 'authenticated'`.
- **الأثر:** إذا نُسخ الرابط العلني كسرّ لـ `SUPABASE_JWT_SECRET` على الخادم، يستطيع أي مهاجم توقيع توكن `HS256` محلياً بهذا الرابط العلني وانتحال صفة `admin` بالكامل. (تم تحديث `hostinger.env.example` في هذا التدقيق، ويلزم تحصين الكود في `JwtAuthMiddleware.php`).
- **الإصلاح المقترح:** رفض خوارزمية `HS256` في `JwtAuthMiddleware.php` إذا كان `strlen($secret) < 32` أو يطابق `preg_match('#^https?://#i', $secret)`، والتحقق من مطالبة `aud`.

### `BE-03` — [High] انكشاف الملفات غير البرمجية داخل المجلدات الفرعية في `htaccess_root.template` عند النشر المسطح
- **الملف والسطر:** `backend-api/public/htaccess_root.template:53-98`، `backend-api/src/Services/BibleDataService.php:62-68`
- **المشكلة:** في النشر المسطح داخل `public_html/`، يمنع `htaccess_root.template` الوصول لملفات `.php` فقط، ويقيد قاعدة حظر الامتدادات الحساسة بالجذر `^(\.env|...)$` دون حظر مجلدات `src/`, `config/`, `vendor/`, `migrations/`, `tests/`, `apps-script/`.
- **الأثر:** إمكانية تنزيل أي ملف غير `.php` داخل تلك المجلدات مباشرة عبر المتصفح، مثل `config/service-account.json` (إن وُجد)، وملفات `/migrations/*.sql`، و`/tests/*.sql`، و`/apps-script/Code.gs`.
- **الإصلاح المقترح:** إضافة القاعدة التالية إلى `backend-api/public/htaccess_root.template`:
  ```apache
  RewriteRule ^(?:src|config|vendor|migrations|tests|scripts|apps-script|docs|storage)(?:/|$) - [F,L]
  ```

### `BE-04` — [High] ثغرات في ذرية الاستعادة والنسخ الاحتياطي (`AtomicRestoreService` و`BackupController`)
- **الملف والسطر:** `backend-api/src/Services/AtomicRestoreService.php:98, 152-193, 283-314, 337-356`، `backend-api/src/Controllers/BackupController.php:69-106`
- **المشكلة:**
  1. تبتلع `AtomicRestoreService::snapshotDatabase()` (السطر 311) أي استثناء وتكمل عملية مسح واستعادة قاعدة البيانات دون وجود نسخة تراجع (`$this->dbSnapshotDir = null`).
  2. لا تحذف `rollback()` الملفات الجديدة التي أنشأتها `restoreFiles()` ولم تكن موجودة قبل الاستعادة.
  3. ينسخ `BackupController::create()` و`AtomicRestoreService::createSafetyBackup()` كامل شجرة `storage/` بما فيها `bible-dataset/` (آلاف الملفات) و`cache/` وملف قفل الجلسات `system_reset/auth-cutoff.json`.
- **الإصلاح المقترح:** إيقاف الاستعادة فوراً عند فشل `snapshotDatabase()`، وتسجيل الملفات المستحدثة لحذفها عند `rollback()`، وقصر النسخ الاحتياطي على المجلدات التشغيلية (`academic`, `users`, `feed`, `gallery`, `imports`, `system/exports`).

### `BE-05` — [High] مشاركة نفس مفتاح `RateLimitMiddleware` بين مسارات القراءة والكتابة يسبب حجب المدير (`429`) وتسميم النافذة الزمنية
- **الملف والسطر:** `backend-api/public/index.php:158-249`، `backend-api/src/Middleware/RateLimitMiddleware.php:28-83`
- **المشكلة:** تشترك مسارات القراءة والكتابة في نفس مفتاح العدّاد: المفتاح `'backup'` مشترك بين `GET /backup/list` (`60/60s`) و`POST /backup/create` (`5/300s`)؛ والمفتاح `'restore'` مشترك بين `POST /restore/preview` (`10/300s`) و`POST /restore/execute` (`2/600s`)؛ والمفتاح `'import'` مشترك بين `GET /import/history` و`POST /import/trainees`.
- **الأثر:** فتح صفحة النسخ الاحتياطي وتحديث القائمة 5 مرات يرفع عداد `'backup'` إلى 5، فيُرفض طلب إنشاء النسخة الاحتياطية فوراً بـ `429 RATE_LIMIT_EXCEEDED`، كما أن معاينة نسختين تحجب تنفيذ الاستعادة!
- **الإصلاح المقترح:** تخصيص مفتاح مستقل لكل مسار في `public/index.php` (`backup_list`, `backup_create`, `restore_preview`, `restore_execute`, `import_history`, `import_trainees`).

### `BE-06` — [High] تعطل إعادة ضبط النظام (`SystemResetController`) دائماً عند تفعيل `GOOGLE_APPS_SCRIPT_URL` أو وجود `storage/logs`
- **الملف والسطر:** `backend-api/src/Controllers/SystemResetController.php:391-403`، `backend-api/src/Services/SystemResetStorageService.php:27-33, 114-143`
- **المشكلة:**
  1. تعتبر `SystemResetController::auditDrive()` (السطر 394) مجرد وجود `GOOGLE_APPS_SCRIPT_URL` (المستخدم للموسوعة الكتابية) مانعاً دائماً (`DRIVE_PROVIDER_NOT_AUDITABLE`) حتى لو كان `GoogleDriveService` مهيأً أو لم تكن هناك ملفات على Drive.
  2. القائمة `PRESERVED_ROOTS` في `SystemResetStorageService.php:27` لا تتضمن `'logs'`، فيُصنَّف مجلد `storage/logs` كمانع `UNCLASSIFIED_LOCAL_STORAGE`.
- **الإصلاح المقترح:** إضافة `'logs'` إلى `PRESERVED_ROOTS`، وفصل فحص جسر الموسوعة عن فحص أصول Google Drive في `auditDrive()`.

### `BE-07` — [High] مسار `POST /storage/delete` يحذف أي ملف داخل `storage/` دون تحديث `media_assets` أو Google Drive
- **الملف والسطر:** `backend-api/src/Controllers/StorageController.php:102-129`، `backend-api/src/Services/StorageBridgeService.php:428-450`
- **المشكلة:** تقبل `StorageBridgeService::deleteFile($relativePath)` أي مسار نسبي داخل `storage/` وتحذفه محلياً فقط دون تقييده بالمجلدات التشغيلية ودون تحديث جدول `media_assets` أو الحذف من Google Drive.
- **الأثر:** إمكانية حذف `system_reset/auth-cutoff.json` أو ملفات النسخ الاحتياطية أو الموسوعة، وبقاء سجلات يتيمة في `media_assets`.
- **الإصلاح المقترح:** حصر الحذف في الجذور التشغيلية المسموحة وتحديث سجل `media_assets` وحذف الأصل من الموفر الفعلي.

### `BE-08` — [Medium] عدم فاعلية المسار المباشر في `streamLocalFile` وبقاء ملفات يتيمة في `StorageBridgeService`
- **الملف والسطر:** `backend-api/src/Services/StorageBridgeService.php:131-136, 206-235, 341-362`
- **المشكلة:** عند الحفظ المحلي (السطر 235) يتم تعيين `$driveFileId = 'local_' . bin2hex(random_bytes(16))` بدلاً من المسار النسبي، فيفشل الفحص المباشر في `streamLocalFile()` (السطر 343) دائماً ويعود لمسح كامل شجرة `storage/` عبر `RecursiveIteratorIterator`. كما لا يتم حذف الملف المحلي المؤقت عند اكتشاف تكرار `is_duplicate` (السطر 215) أو بعد نجاح الرفع إلى Google Drive.
- **الإصلاح المقترح:** تخزين المسار النسبي أو البحث بمعرف الأصل في `media_assets`، وحذف الملف المؤقت بـ `@unlink($localPath)` عند التكرار أو بعد الرفع السحابي.

### `BE-09` — [Medium] فشل `ExcelParserService::parseCsv()` مع ملفات UTF-8 BOM والكتابة الدائمة أثناء `dry_run` في `ImportController`
- **الملف والسطر:** `backend-api/src/Services/ExcelParserService.php:5-22, 30-63`، `backend-api/src/Controllers/ImportController.php:18-35, 68-78`
- **المشكلة:** لا تزيل `parseCsv()` بايتات UTF-8 BOM (`\xEF\xBB\xBF`) من بداية الملف، فيتحول اسم العمود الأول إلى `"\xEF\xBB\xBFUsername"` وتُرفض جميع الصفوف؛ كما تتجاهل الأسطر ذات الأعمدة غير المطابقة بصمت، ويحفظ `ImportController:70` الملف في التخزين الدائم قبل التحقق من `$dryRun`.
- **الإصلاح المقترح:** إزالة BOM عبر `preg_replace('/^\xEF\xBB\xBF/', '', $header[0])`، واستخدام طول `0` في `fgetcsv`، وتأجيل حفظ الملف لما بعد التحقق من `!$dryRun`.

### `BE-10` — [Medium] فشل `ArchiveExtractor` عند وجود مدخلات مجلدات (`dir/`) وتضارب حدود الأرشيف
- **الملف والسطر:** `backend-api/src/Services/ArchiveExtractor.php:49-56, 104-135`، `backend-api/src/Controllers/BackupController.php:27-30, 154-165`
- **المشكلة:** لا تتخطى `ArchiveExtractor::extract()` مدخلات المجلدات المنتهية بـ `/` فيفشل `fopen($target, 'wb')`، كما تقيد الحجم بـ 1 GB و5,000 مدخل بينما يسمح `BackupController` بـ 8 GB و500,000 مدخل.
- **الإصلاح المقترح:** إنشاء المجلد وتخطي المدخل (`continue`) عندما ينتهي الاسم بـ `/`، وتوحيد ثوابت الحد الأقصى بين الخدمتين.

### `BE-11` — [Medium] استنزاف الذاكرة عند رفع ملفات كبيرة إلى Google Drive وعدم تطابق فئات `FileSecurityMiddleware`
- **الملف والسطر:** `backend-api/src/Services/GoogleDriveService.php:279-286`، `backend-api/src/Middleware/FileSecurityMiddleware.php:18, 31-35`
- **المشكلة:** يقرأ `GoogleDriveService::uploadFile()` كامل الملف في الذاكرة عبر `file_get_contents()` (مما يكسر حد الذاكرة لملفات MP3 بحجم 150 MB)، ويمرر `StorageController` أسماء مجلدات (`users`, `curriculum`, `books`) لا تطابق مفاتيح `max_sizes` في `config/storage.php` (`avatar`, `pdf`, `mp3`).
- **الإصلاح المقترح:** استخدام Resumable Upload بالبث للملفات الكبيرة، ومطابقة مفاتيح الأحجام وأنواع MIME لكل فئة مجلد.

### `BE-12` — [Medium] عدم استثناء `.env` و`storage/backups` في `prepare-deployment.sh` وتوكن افتراضي ثابت في `Code.gs`
- **الملف والسطر:** `backend-api/scripts/prepare-deployment.sh:74-86`، `backend-api/apps-script/Code.gs:9, 35, 68-75`
- **المشكلة:** لا يستثني أمر `tar` في `prepare-deployment.sh` ملفات `.env*` و`storage/backups/*`، ويحتوي `apps-script/Code.gs` على `DEFAULT_ACCESS_TOKEN` ثابت يعمل كـ fallback في حال عدم ضبط خصائص السكربت.
- **الإصلاح المقترح:** إضافة `--exclude='.env*'` و`--exclude='storage/backups/*'`، وإزالة التوكن الافتراضي من `Code.gs` ليغلق بشكل آمن (`Fail-Closed`).

### `BE-13` — [Low] غياب `CURLOPT_TIMEOUT` في `SupabaseClient` ومعاملات غير مستخدمة في `BibleDataService::getArticle()`
- **الملف والسطر:** `backend-api/src/Services/SupabaseClient.php:34-55`، `backend-api/src/Services/BibleDataService.php:312-328, 583-603`
- **المشكلة:** لا يحدد `SupabaseClient::query()` مهلة اتصال (`CURLOPT_CONNECTTIMEOUT` / `CURLOPT_TIMEOUT`)، وتتجاهل `BibleDataService::getArticle()` المعاملات `$book` و`$ch` و`$path` التي يمررها `BibleController::article()`.
- **الإصلاح المقترح:** إضافة مهلة اتصال 5 ثوانٍ ومهلة تنفيذ 30 ثانية في `SupabaseClient`، واستكمال دعم البحث بـ `$book` و`$ch` في `getArticle()`.

---

## 4. مشاكل صفحات الواجهة الأمامية — Frontend Pages (`FP-01` إلى `FP-16`)

### `FP-01` — [High] عدم تحديث قائمة الأسئلة بعد الإضافة، وعودة الأسئلة المؤرشفة للظهور، ومقارنة النص بدلاً من الفهرس في إدارة الماراثون
- **الملف والسطر:** `frontend/src/app/marathon/manage/page.tsx:184-189, 256-293`
- **المشكلة:**
  1. في `handleAddQuestion` (السطر 287)، بعد نجاح `create_marathon_question` يوجد تعليق `// Refresh questions` دون استدعاء دالة لتحديث الحالة، فلا يظهر السؤال المضاف.
  2. في `loadMarathonDetails` (الأسطر 184-189)، يتم استعلام `marathon_questions` بدون `.eq('status', 'PUBLISHED')` فتظهر الأسئلة المؤرشفة مجدداً.
  3. في السطر 273، يتم تحديد الخيار الصحيح عبر مقارنة النص `optText === newQOptions[newQCorrectIdx]?.trim()` بدلاً من الفهرس.
- **الإصلاح المقترح:** الاحتفاظ بالفهرس الأصلي قبل الفلترة، وإضافة `.eq('status', 'PUBLISHED')` لاستعلام الأسئلة، واستدعاء `await loadMarathonDetails(selectedMarathon)` بعد الإضافة.

### `FP-02` — [High] عرض جميع إجابات الطالب بعلامة خطأ حمراء (`XCircle`) بعد تسليم الماراثون، وبقاء الاختيار السابق عند تغيير السؤال
- **الملف والسطر:** `frontend/src/app/marathon/[id]/page.tsx:136-189, 228, 248-249, 298-343, 354-385`
- **المشكلة:**
  1. الدالة `get_marathon_questions_for_player` تحذف الحقل `is_correct` لمنع الغش، لذا تكون `Boolean(opt.is_correct)` دائماً `false` (السطر 298). عند انتهاء الماراثون (`isCompleted = true`)، ينفذ الشرط `!isCorrectOption && isSelectedInAnswer` (السطر 336) ويعرض أيقونة `XCircle` حمراء على كل إجابة اختارها الطالب حتى لو حصل على 100%!
  2. عند التنقل بين الأسئلة (`249, 354, 379`) لا يتم تصفير `selectedOptionId`، مما قد يرسل معرف خيار من السؤال السابق.
  3. استخدام `answersMap.size` (السطر 228 و248) يحسب الأسئلة المعاد فتحها (`is_reopened: true`) ضمن الأسئلة المجابة.
- **الإصلاح المقترح:** إضافة `useEffect(() => setSelectedOptionId(null), [currentQIndex])`، وعرض شارة محايدة `"إجابتك المسجلة"` بعد التسليم (أو إرجاع `is_correct` من الـ RPC بعد `is_submitted = true` فقط)، وحساب الأسئلة المجابة باستثناء `is_reopened`.

### `FP-03` — [High] غياب التحقق من بروتوكول الروابط (`javascript:` / `data:`) في صفحات الكتب والمعرض والصوتيات والمناهج
- **الملف والسطر:** `frontend/src/app/books/page.tsx:207-233, 396-400, 466-470`، `frontend/src/app/gallery/page.tsx:170-196`، `frontend/src/app/mp3/page.tsx:159-174`، `frontend/src/app/curriculum/page.tsx:260-268, 305`
- **المشكلة:** يتم تمرير `readingItem.file_url` مباشرة إلى `<iframe src={readingItem.file_url}>` بدون `sandbox` وإلى `<a href>` دون التحقق من أن الرابط يبدأ بـ `https://` أو `http://` سواء عند الإدخال اليدوي أو عند العرض.
- **الإصلاح المقترح:** التحقق من الروابط عبر دالة `isSafeHttpUrl(url)` (`protocol === 'https:' || protocol === 'http:'`) قبل الحفظ وعند العرض، وإضافة `sandbox` و`referrerPolicy="no-referrer"` للـ `iframe`.

### `FP-04` — [High] استثناءات غير معالجة (`Unhandled Promise Rejections`) في `useEffect` ودوال الرفع تعلق حالة التحميل
- **الملف والسطر:** `frontend/src/app/gallery/page.tsx:71-168, 198-228`، `frontend/src/app/marathon/page.tsx:48-118`، `frontend/src/app/marathon/manage/page.tsx:111-163`، `frontend/src/app/mp3/page.tsx:68-108`
- **المشكلة:** تحتوي دوال `init()` داخل `useEffect` على عبارات `if (error) throw error;` خارج أي `try / catch / finally`، مما يوقف التنفيذ قبل `setLoading(false)` ويطلق خطأ غير معالج عند أي فشل في الشبكة.
- **الإصلاح المقترح:** إحاطة جسم `init()` بكتلة `try { ... } catch (err) { ... } finally { setLoading(false); }`.

### `FP-05` — [High] غياب واجهة اختيار وإنشاء الألبومات في صفحة المعرض (`gallery/page.tsx`) يمنع رفع الصور للفرق الجديدة
- **الملف والسطر:** `frontend/src/app/gallery/page.tsx:18, 50-53, 95-162, 170-175, 230-233`
- **المشكلة:** لا توجد أزرار في الـ JSX لتغيير `selectedAlbumId` أو لإنشاء ألبوم جديد، وإذا لم يكن للفرقة ألبوم مسبق في قاعدة البيانات تظل `newPhotoAlbumId` فارغة ويفشل شرط رفع الصور `if (!newPhotoTitle.trim() || !newPhotoAlbumId) return;` بصمت. كما لا يُستخدم متغير `loading` في العرض.
- **الإصلاح المقترح:** إضافة شريط تبويبات للألبومات وزر إنشاء ألبوم جديد، وعرض مؤشر تحميل أثناء `loading === true`.

### `FP-06` — [Medium] إظهار زر إيقاف الحسابات لغير المختصين واختفاء اسم أب الاعتراف في دليل المتدربين (`/trainees`)
- **الملف والسطر:** `frontend/src/app/trainees/page.tsx:69, 78-80, 94-122, 285-291`
- **المشكلة:** تم استدعاء `.select(...)` مرتين في `loadTrainees` (السطر 69 و79) مع إغفال الحقل `confession_father` وشرط `.is('deleted_at', null)`، مما يجعل جميع البطاقات تعرض `"غير محدد"` أمام أب الاعتراف. كما يتم تمرير `onToggleStatus` إلى `<TraineeCard>` لجميع الأدوار دون تقييد.
- **الإصلاح المقترح:** حذف `.select()` المكرر وإضافة `confession_father` و`.is('deleted_at', null)`، وتمرير `onToggleStatus` للمدير والسكرتارية فقط.

### `FP-07` — [Medium] مشكلة أداء `N+1 RPC` في صفحة قائمة الماراثونات (`/marathon`) وحساب الأسئلة المؤرشفة ضمن العدد
- **الملف والسطر:** `frontend/src/app/marathon/page.tsx:78-110`
- **المشكلة:** تطلق الصفحة حلقة `Promise.all(mList.map(m => supabase.rpc('get_trainee_marathon_state', ...)))` بعدد الماراثونات (حتى 100 طلب RPC منفصل)، كما تحسب `marathon_questions(count)` بدون فلتر `status = 'PUBLISHED'`.
- **الإصلاح المقترح:** استبدال حلقة الـ RPCs باستعلام مجمع واحد على `marathon_trainee_submissions` و`marathon_trainee_answers`.

### `FP-08` — [Medium] اشتراك جميع صفوف جدول تسليمات الماراثون في متغير حالة واحد (`selectedReopenQuestionId`)
- **الملف والسطر:** `frontend/src/app/marathon/manage/page.tsx:72, 309-321, 520-541`
- **المشكلة:** ربط جميع قوائم `<select>` في جدول الطلاب بمتغير حالة مفرد `selectedReopenQuestionId` يغير الاختيار في كل الصفوف معاً، كما لا يتم تحديث `submissions` بعد إعادة فتح السؤال.
- **الإصلاح المقترح:** تحويل الحالة إلى سجل `Record<string, string>` مفهرس بمعرف الطالب وتحديث القائمة بعد نجاح العملية.

### `FP-09` — [Medium] خيار "تحميل مباشر" (`DOWNLOAD`) في صفحة النسخ الاحتياطي لا يقوم بتنزيل أي ملف للمتصفح
- **الملف والسطر:** `frontend/src/app/admin/backups/page.tsx:56, 136-153, 412-424`
- **المشكلة:** عند اختيار `'DOWNLOAD'`، يرسل الكود `storage_option: 'DOWNLOAD_ONLY'` ويعرض رسالة نجاح دون تنزيل الملف فعلياً إلى جهاز المدير.
- **الإصلاح المقترح:** تحفيز تنزيل الملف في المتصفح أو إزالة الخيار إذا كان الحفظ يتم على الخادم فقط.

### `FP-10` — [Medium] محلل CSV بدائي (`split(',')`) في صفحة الاستيراد ينكسر مع الفواصل داخل علامات التنصيص وغياب زر اختيار ملف
- **الملف والسطر:** `frontend/src/app/admin/imports/page.tsx:109-152, 205-208, 248-315`
- **المشكلة:** تقسيم السطر بـ `split(',')` يكسر الأعمدة إذا احتوى أي حقل محاط بعلامات تنصيص على فاصلة، ولا يوجد عنصر `<input type="file" accept=".csv">` لرفع ملف من الجهاز.
- **الإصلاح المقترح:** استخدام محلل CSV يراعي علامات التنصيص وإضافة زر اختيار ملف يملأ المحتوى عبر `FileReader`.

### `FP-11` — [Medium] انزياح التاريخ بسبب استخدام توقيت UTC (`toISOString().split('T')[0]`) في جلسات الحضور داخل `/groups/[id]`
- **الملف والسطر:** `frontend/src/app/groups/[id]/page.tsx:108, 1173, 1214`
- **المشكلة:** استخدام `toISOString().split('T')[0]` يعيد تاريخ اليوم السابق بين منتصف الليل والساعة 02:00/03:00 صباحاً بتوقيت مصر.
- **الإصلاح المقترح:** طرح `getTimezoneOffset()` قبل استخراج التاريخ المحلي، وإلحاق `'T12:00:00'` عند عرض `YYYY-MM-DD`.

### `FP-12` — [Medium] خلط طلاب الفرق المختلفة عند رصد الدرجات بواسطة المدير في صفحة الامتحانات (`/exams`)
- **الملف والسطر:** `frontend/src/app/exams/page.tsx:48, 85-92, 105-115, 164-174, 248`
- **المشكلة:** عندما يكون `prof.group_id === null` (حساب `admin`)، يجلب `traineesQuery` طلاب جميع الفرق الثلاث معاً بدلاً من فلترتهم حسب `activeExam.group_id`، كما يثبت السطر 248 النص `"نتيجة امتحان التيرم الأول"`.
- **الإصلاح المقترح:** الفلترة باستخدام `.eq('group_id', activeExam.group_id)` وإضافة `<GroupSelector>` واستخدام `exam.title`.

### `FP-13` — [Medium] تضخم صفحة `/groups/[id]` (`1,764` سطراً) وتكرار `.select()` في نفس الاستعلام
- **الملف والسطر:** `frontend/src/app/groups/[id]/page.tsx:1-1764`، `frontend/src/app/gallery/page.tsx:122 & 138`، `frontend/src/app/mp3/page.tsx:92 & 98`
- **المشكلة:** تطلق `loadGroupData` 7 استعلامات متوازية لجميع التبويبات دفعة واحدة بدون `.limit()`، وتستدعي `gallery/page.tsx` و`mp3/page.tsx` الدالة `.select()` مرتين على نفس الاستعلام.
- **الإصلاح المقترح:** تقسيم تبويبات `/groups/[id]` إلى مكونات فرعية تُجلب بياناتها عند تفعيل التبويب، وحذف `.select()` المكررة.

### `FP-14` — [Low] تداخل مشغل الصوتيات مع شريط التنقل السفلي على الموبايل، وتمرير `profile={null}` الثابت في صفحات القارئ والأقسام
- **الملف والسطر:** `frontend/src/app/mp3/page.tsx:392, 428`، `frontend/src/app/bible/reader/[id]/page.tsx:84, 197`، `frontend/src/app/bible/section/[code]/page.tsx:226, 449`
- **الإصلاح المقترح:** تعديل موضع المشغل إلى `bottom-16 md:bottom-0`، وتمرير ملف المستخدم الحالي إلى `<SmartHeader>` و`<SmartBottomNav>`.

### `FP-15` — [Low] استخدام نص البحث غير المرسل (`searchQuery`) عند تغيير الصفحة أو الفلتر في `admin/audit/page.tsx`
- **الملف والسطر:** `frontend/src/app/admin/audit/page.tsx:58, 137-147, 381, 398`
- **الإصلاح المقترح:** فصل حالة حقل الإدخال `searchInput` عن حالة البحث المعتمدة `appliedQuery`.

### `FP-16` — [Low] استيراد `dompurify` المباشر بدلاً من فحص `typeof window` أو `isomorphic-dompurify`
- **الملف والسطر:** `frontend/src/app/bible/page.tsx:44, 770`، `frontend/src/app/bible/reader/[id]/page.tsx:7, 152`
- **الإصلاح المقترح:** التحقق من توفر `DOMPurify.sanitize` على الخادم أو استخدام `isomorphic-dompurify` لتجنب أي انهيار مستقبلي عند تفعيل SSR.

---

## 5. مشاكل مكونات ومكتبات الواجهة والوسيط الأمني (`FL-01` إلى `FL-14`)

### `FL-01` — [High] تعطيل الكاميرا بالكامل عبر ترويسة `Permissions-Policy: camera=()` مما يكسر ماسح QR للحضور
- **الملف والسطر:** `frontend/next.config.mjs:79-80` (ويؤثر على `frontend/src/components/QRScannerModal.tsx:144` و`frontend/src/lib/mobile/qr-scanner.ts:229`)
- **المشكلة:** ترسل `next.config.mjs:80` الترويسة `Permissions-Policy: camera=(), microphone=(), geolocation=(self)` على جميع المسارات، مما يمنع المتصفح من السماح بـ `navigator.mediaDevices.getUserMedia` نهائياً.
- **الإصلاح المقترح:** تغيير القيمة إلى `camera=(self), microphone=(), geolocation=(self)`.

### `FL-02` — [High] ثغرة إعادة توجيه مفتوحة (`Open Redirect`) عبر الشرطة المائلة العكسية `\` في `middleware.ts` و`sw.js`
- **الملف والسطر:** `frontend/src/lib/supabase/middleware.ts:93-101`، `frontend/public/sw.js:121-128`
- **المشكلة:** يتحقق الكود من `redirectTo.startsWith('/') && !redirectTo.startsWith('//')` فقط دون رفض `\`. القيمة `/\evil.com` تجتاز الشرط وتتحول في `new URL('/\\evil.com', request.nextUrl.origin)` إلى `https://evil.com/`.
- **الإصلاح المقترح:** رفض أي مسار يحتوي على `\` والتحقق الصريح من `parsedUrl.origin === request.nextUrl.origin`.

### `FL-03` — [High] حقن فلاتر PostgREST وسباق طلبات (`Race Condition`) في `GlobalSearchModal.tsx`
- **الملف والسطر:** `frontend/src/components/GlobalSearchModal.tsx:62-105`
- **المشكلة:** يتم تمرير نص البحث `q` مباشرة إلى `.or(\`full_name.ilike.${q},username.ilike.${q}\`)` دون تنظيف الفواصل والأقواس والنقاط الخاصة بـ PostgREST، ودون عداد تسلسلي لمنع طغيان نتائج البحث الأقدم على الأحدث.
- **الإصلاح المقترح:** تعقيم النص عبر `.replace(/[%_.,()&|!*\[\]"'`\\]/g, ' ').trim()` واستخدام مرجع تسلسلي `searchSeqRef`.

### `FL-04` — [Critical] تسرب دائم للذاكرة (`Memory Leak`) وتعطل البحث بالبادئة بعد استدعاء `clearBibleMemoryCache()`
- **الملف والسطر:** `frontend/src/lib/bible/browser-encyclopedia.ts:437-499, 719-722, 1040-1048`
- **المشكلة:** تصفر الدالة `clearBibleMemoryCache()` المتغير `resolvedTitleIndex = null` لكنها تنسى حذف الوعود المحسومة في `memoPromises` (`articleMap`, `slugMap`, `titleIndex`). ونتيجة لذلك تبقى الفهارس الضخمة محجوزة في الذاكرة للأبد، ويعيد `getTitleIndex()` الوعد القديم دون إعادة تعيين `resolvedTitleIndex`، فيرجع `loadedTitleIndex()` القيمة `null` دائماً وتتعطل ميزة `expandTitlePrefix` طوال الجلسة!
- **الإصلاح المقترح:** إضافة `delete memoPromises.articleMap; delete memoPromises.slugMap; delete memoPromises.titleIndex;` داخل `clearBibleMemoryCache()`.

### `FL-05` — [High] استعلام جدول غير موجود (`attendance`) بحالة أحرف خاطئة وعرض صلاحيات ثابتة وهمية في `UnifiedProfileModal.tsx`
- **الملف والسطر:** `frontend/src/components/UnifiedProfileModal.tsx:116-125, 712-730`
- **المشكلة:** يستعلم المكون عن `.from('attendance')` بدلاً من `attendance_records`، ويقارن `'present'` / `'absent'` بأحرف صغيرة بدلاً من `'PRESENT'` / `'ABSENT'`، ويعيد نسبة حضور `100%` عند عدم وجود سجلات (`totalSessions === 0`)، كما يعرض في تبويب الصلاحيات شارات `"مفوضة ✓"` ثابتة لكل خادم دون قراءة `servant_permissions`.
- **الإصلاح المقترح:** الاستعلام من `attendance_records` ومقارنة `'PRESENT'`/`'ABSENT'` وجلب الصلاحيات الفعلية للخادم.

### `FL-06` — [High] حلقة إعادة تشغيل الكاميرا المستمرة وتسرب بث الفيديو عند الإغلاق السريع في `QRScannerModal.tsx` و`qr-scanner.ts`
- **الملف والسطر:** `frontend/src/components/QRScannerModal.tsx:45-192`، `frontend/src/lib/mobile/qr-scanner.ts:226-251`
- **المشكلة:** تعتمد `startCamera` على `handleProcessRawQR` التي تعتمد بدورها على `[processing, selectedStatus]`، مما يؤدي لإيقاف وإعادة تشغيل الكاميرا مع كل مسح أو تغيير لحالة الحضور؛ كما يبقى بث الكاميرا مفتوحاً إذا أُغلقت النافذة أثناء انتظار `getUserMedia`.
- **الإصلاح المقترح:** حفظ `handleProcessRawQR` في `useRef`، وفحص حالة فتح النافذة فور عودة `getUserMedia`، وإيقاف المسارات داخل `finally` في `qr-scanner.ts:239`.

### `FL-07` — [High] تجاهل أخطاء Supabase وإظهار نجاح وهمي في `FeedPostCard.tsx` و`PostComposer.tsx` و`SystemRoleManagementPanel.tsx`
- **الملف والسطر:** `frontend/src/components/FeedPostCard.tsx:76-112, 145-158`، `frontend/src/components/PostComposer.tsx:53-68, 91-106`، `frontend/src/components/SystemRoleManagementPanel.tsx:125-133`
- **المشكلة:** تستدعي `handleDeletePost` دالة `.delete()` دون فحص `{ error }` وتحذف المنشور من الواجهة فوراً؛ وتنفذ `SystemRoleManagementPanel` تحديث الدور بدون `.select().single()` فتعلن نجاح العملية حتى لو رفضتها RLS.
- **الإصلاح المقترح:** فحص `if (error) throw error;` بعد كل عملية Supabase واستخدام `.select('id').single()` للتحقق من التحديث الفعلي.

### `FL-08` — [Medium] انهيار `next/image` عند إدخال روابط صور خارجية في `Avatar.tsx` و`MediaCollage.tsx`
- **الملف والسطر:** `frontend/src/components/Avatar.tsx:62-87`، `frontend/src/components/MediaCollage.tsx:45-51`، `frontend/next.config.mjs:27-36`
- **المشكلة:** يسمح `UnifiedProfileModal` و`PostComposer` بلصق روابط صور من أي نطاق خارجي، بينما يقيد `next.config.mjs` النطاقات المسموحة بنطاقين فقط، مما يسبب Runtime Error في `next/image`.
- **الإصلاح المقترح:** تفعيل `unoptimized` للروابط التي لا تنتمي للنطاقين المعتمدين (بعد التحقق من بروتوكول `https:`).

### `FL-09` — [Medium] إعادة مصادقة المشرف عبر `signInWithPassword` على نفس عميل المتصفح في `SystemRoleManagementPanel.tsx`
- **الملف والسطر:** `frontend/src/components/SystemRoleManagementPanel.tsx:114-135, 147-167`
- **الإصلاح المقترح:** استخدام الدوال المخزنة المحمية (`grant_system_admin` / `revoke_system_admin` / `update_servant_profile_and_permissions`) أو مسار خادم للتحقق دون إعادة إطلاق حدث `SIGNED_IN` في المتصفح.

### `FL-10` — [Medium] قفل تسجيل الدخول في `login-lockout.ts` يحظر جميع الحسابات على نفس الجهاز المشترك
- **الملف والسطر:** `frontend/src/lib/auth/login-lockout.ts:36, 109-208`
- **الإصلاح المقترح:** ربط سجل القفل في `localStorage` بمعرف المستخدم المنظف بدلاً من مفتاح عام واحد للجهاز بالكامل.

### `FL-11` — [Medium] تفعيل `typescript.ignoreBuildErrors: true` وغياب `Content-Security-Policy` في `next.config.mjs` وتخزين `'/'` في `sw.js`
- **الملف والسطر:** `frontend/next.config.mjs:19-21, 60-87`، `frontend/public/sw.js:24-31`
- **الإصلاح المقترح:** ضبط `ignoreBuildErrors: false` بعد تحديث `types/supabase.ts`، وإضافة ترويسة `Content-Security-Policy`، وإزالة `'/'` من `PRECACHE_ASSETS` في `sw.js`.

### `FL-12` — [Medium] إعادة جلب كافة الإشعارات مع كل حدث Realtime في `NotificationCenter.tsx` والمسح الخطي في `expandTitlePrefix`
- **الملف والسطر:** `frontend/src/components/NotificationCenter.tsx:97-118`، `frontend/src/lib/bible/browser-encyclopedia.ts:719-747`
- **الإصلاح المقترح:** فحص `payload.new` محلياً وتخصيص اسم قناة فريد، وتخزين مصفوفة مفاتيح `titleIndex` مسبقاً.

### `FL-13` — [Low] غياب `useFocusTrap` ودعم زر `Escape` في 5 نوافذ منبثقة وعدم الاستماع لتغير ثيم النظام في `ThemeContext.tsx`
- **الملف والسطر:** `CreateTraineeModal.tsx`، `ServantProfileDrawer.tsx`، `TraineeProfileDrawer.tsx`، `QRScannerModal.tsx`، `MediaCollage.tsx`، و`ThemeContext.tsx:48-51`
- **الإصلاح المقترح:** ربط `useFocusTrap(isOpen, onClose)` بالنوافذ الخمس، وإضافة مستمع `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)` في `ThemeContext.tsx`.

### `FL-14` — [Medium] وجود اختبارات في `frontend/tests/` تختبر دوال منسوخة محلياً بدلاً من استيراد كود التطبيق
- **الملف والسطر:** `frontend/tests/ui-ux-architecture.test.ts:1-85`، `tests/prefix-expansion.test.ts:12-47`، `tests/search-ranking.test.ts:13-31`، `tests/mobile-readiness.test.ts:423-441`، `tests/prepareAvatar.test.ts:34-47`
- **الإصلاح المقترح:** استيراد الدوال الفعلية من `@/lib/bible/browser-encyclopedia` و`@/lib/mobile/deep-links` و`@/context/ThemeContext` ومحاكتها بشكل صحيح.

---

## 6. مشاكل قاعدة البيانات وسياسات RLS والسكربتات (`DB-01` إلى `DB-15`)

### `DB-01` — [Critical] فقدان 35 ملف ترحيل وسيط (`017`–`052`) من `supabase/migrations/` يكسر بناء قاعدة البيانات من الصفر
- **الملف والسطر:** `supabase/schema_live_snapshot.sql:1989-2023`، `supabase/migrations/20260930150000_rpc_group_scope_guards.sql:31-40`، `20261010001000_close_marathon_grade_and_feed_impersonation.sql:229, 276`
- **المشكلة:** تعتمد ملفات الهجرة المؤرخة بدءاً من `20260930` على جداول وأعمدة ودوال أُنشئت في الهجرات `017` إلى `052` (مثل `post_images`, `bible_content_versions`, `marathon_trainee_answers.is_reopened`, `get_trainee_full_profile`) وهي مسجلة في `schema_live_snapshot.sql` لكنها مفقودة من مجلد `supabase/migrations/`.
- **الإصلاح المقترح:** إنشاء ملف ترحيل جسري تعويضي (`017_baseline_reconciliation_bridge.sql`) مستخرج من `supabase/schema_live_snapshot.sql` باستخدام `CREATE TABLE IF NOT EXISTS` و`ADD COLUMN IF NOT EXISTS` و`CREATE OR REPLACE FUNCTION`.

### `DB-02` — [Critical] فحص معكوس للدور (`v_role` للهدف بدلاً من المستدعي) في `get_trainee_full_profile` و`get_trainee_attendance_summary`
- **الملف والسطر:** `supabase/migrations/20261001120000_fix_null_propagation_fail_open_authz.sql:75-87, 112-128`
- **المشكلة:** تجلب الدالتان `role_id` من صف المستخدم **الهدف** (`WHERE id = p_trainee_id`) إلى المتغير `v_role`، ثم تفحصان `v_role = 'servant' OR v_role = 'secretariat'` بدلاً من فحص دور **المستدعي** (`public.get_current_user_role()`)!
- **الأثر:**
  1. يستطيع أي متدرب (`trainee`) استدعاء `get_trainee_full_profile(<servant_uuid>)` وقراءة البيانات الشخصية لأي خادم أو سكرتير في فرقته.
  2. يُحجب عضو السكرتارية (أو الخادم غير المفوض بالمناهج/المحاضرات) من عرض ملف أي متدرب لأن `v_role` للمتدرب هو `'trainee'`!
- **الإصلاح المقترح:** فحص دور المستدعي `public.get_current_user_role() IN ('servant', 'secretariat', 'supervisor', 'admin')` بدلاً من `v_role`.

### `DB-03` — [Critical] تضارب سياسات `SELECT` المكررة على `public.profiles` يكشف أعمدة PII والحسابات المحذوفة منطقياً
- **الملف والسطر:** `supabase/migrations/20261012_000000_database_and_rls_security_hardening.sql:247-257`، `supabase/migrations/20261023180000_system_admin_and_general_secretariat.sql:315-318`
- **المشكلة:** وجود سياستي `SELECT` متزامنتين (`"profiles_select_policy"` و`"Authenticated users can read profiles"`) يسمح لأي متدرب باستعلام `/rest/v1/profiles?select=*` وقراءة كافة الأعمدة الشخصية (`phone`, `birth_date`, `address`, `confession_father`) لزملائه وخدام فرقته (بمن فيهم المحذوفون منطقياً لأن السياسة الثانية تفتقر إلى `deleted_at IS NULL`)، كما يسمح لأي خادم بقراءة ملفات جميع الفرق الأخرى.
- **الإصلاح المقترح:** حذف السياسة المكررة `"Authenticated users can read profiles"`، وتقييد القراءة المباشرة لجدول `profiles` الكامل بصاحب الحساب أو الإدارة/خدام الفرقة مع `deleted_at IS NULL`، واعتماد `get_my_group_directory()` للمتدربين.

### `DB-04` — [Critical] أخطاء قاتلة في دوال الاستعادة (`restore_table`, `restore_database`, `system_reset_guarded_restore_database`) وثغرة مسح `audit_logs`
- **الملف والسطر:** `supabase/migrations/20261001170000_logical_restore_rpcs.sql:114, 160, 328, 355`، `supabase/migrations/20261023180000_system_admin_and_general_secretariat.sql:536, 649`
- **المشكلة:**
  1. تفرض `restore_table` (السطر 160) التحويل `WHERE id = $1::uuid`، مما يفشل في وضع `MERGE` مع جميع الجداول ذات المعرفات النصية أو الرقمية (`roles`, `groups`, `permissions`, `bible_*`, `audit_logs`) أو الجداول التي لا تملك عمود `id`.
  2. خطأ صياغي في السطر 355 (`END;` بدلاً من `END IF;`).
  3. تشترط `system_reset_guarded_restore_database` (السطر 649) وجود مدير نظام واحد فقط (`count(*) = 1`)، مما يفشل عند وجود مدير مشارك (`Co-Admin`).
  4. لا تستثني دوال الاستعادة جدول `audit_logs` وجداول أمان `system_reset_*` أثناء تفعيل `session_replication_role = 'replica'`.
- **الإصلاح المقترح:** استخدام عمود المفتاح الأساسي الفعلي بدون فرض `::uuid`، وتصحيح `END IF;`، وقبول `count(*) >= 1` لحسابات `admin` النشطة، وحظر استعادة أو تفريغ `audit_logs` وجداول `system_reset_*`.

### `DB-05` — [High] التراجع التلقائي (`Rollback`) عن قفل جلسة الحضور يوم الخميس، وفرق التوقيت UTC، وثغرة الحذف النهائي
- **الملف والسطر:** `supabase/migrations/20261024100000_attendance_thursday_freeze.sql:34, 43-48, 57`، `015_rls_policies.sql:121-124`
- **المشكلة:** ينفذ الـ Trigger `enforce_attendance_thursday_freeze` جملة `UPDATE public.attendance_sessions SET status = 'LOCKED'` ثم يتبعها فوراً بـ `RAISE EXCEPTION`، مما يلغي المعاملة ويتراجع عن تحديث `LOCKED`! كما أنه يستخدم `CURRENT_DATE` بتوقيت UTC ولا يحمي عمليات `DELETE` على `attendance_records` أو تعديل `attendance_sessions`.
- **الإصلاح المقترح:** شمول `OR DELETE` في الـ Trigger، واستخدام `(now() AT TIME ZONE 'Africa/Cairo')::date`، وإضافة Trigger حماية على `attendance_sessions`.

### `DB-06` — [High] غياب مخطط `extensions` من `search_path` في `create_trainee_profile` واستخدام كلمة مرور افتراضية ثابتة `'Trainee123!'`
- **الملف والسطر:** `supabase/migrations/20261006120000_create_trainee_profile_rpc.sql:18, 64-73`
- **الإصلاح المقترح:** تضمين `'extensions'` في `search_path` (أو استدعاء `extensions.crypt` و`extensions.gen_salt`)، واشتراط كلمة مرور صريحة لا تقل عن 8 أحرف.

### `DB-07` — [High] استخدام `ON DELETE CASCADE` على جداول السجلات التاريخية الأكاديمية بدلاً من `ON DELETE RESTRICT`
- **الملف والسطر:** `supabase/migrations/003_profiles_auth_mapping.sql:5`، `006_attendance.sql:6, 17, 19`، `007_exams_grades.sql:6, 21, 23`، `008_marathons.sql:6, 50, 51`
- **الإصلاح المقترح:** تحويل المفاتيح الأجنبية على `attendance_records`, `exam_grades`, `marathon_trainee_submissions` إلى `ON DELETE RESTRICT` لحمايتها من المسح المتسلسل غير المقصود.

### `DB-08` — [High] سكربتات التحقق والعمليات في `scripts/` تكتب بيانات حية في الإنتاج دون تنظيف، واستعادة وهمية في `elkarooz_ops_engine.py`
- **الملف والسطر:** `scripts/verify_auth_roles_security.py:244-254`، `scripts/verify_phase9_full.py:190`، `scripts/verify_pastoral_template_rls.sql:33-84`، `scripts/elkarooz_ops_engine.py:141, 194-252`
- **المشكلة:** تنشئ سكربتات `verify_phase*.py` فصولاً دراسية (`is_current: True` يلغي الفصل الدراسي الحقيقي!) وحسابات متدربين وإشعارات حية دون تنظيف، ولا تكتب `elkarooz_ops_engine.py::restore_backup` أي صفوف في قاعدة البيانات رغم إرجاعها `{"success": True}`!
- **الإصلاح المقترح:** إضافة حارس بيئة يمنع تشغيل سكربتات الاختبار التدميرية على الإنتاج، ونقل `CREATE FUNCTION _pastoral_probe` إلى داخل معاملة `BEGIN ... ROLLBACK`، وإيقاف الاستعادة الصورية في `elkarooz_ops_engine.py`.

### `DB-09` — [High] انحراف حاد (`Schema & RPC Drift`) في `frontend/src/types/supabase.ts` عن قاعدة البيانات
- **الملف والسطر:** `frontend/src/types/supabase.ts:1376-2287`، `frontend/next.config.mjs:20`
- **المشكلة:** يفتقد ملف الأنواع 13 جدولاً حديثاً (مثل `curriculum_days`, `curriculum_entries`, `media_assets`, `system_reset_*`) وأكثر من 35 دالة RPC، ويعرّف `profiles.birth_date` كـ `string` غير قابل لـ `null`.
- **الإصلاح المقترح:** إعادة توليد `frontend/src/types/supabase.ts` وإلغاء `ignoreBuildErrors: true`.

### `DB-10` — [High] وجود `SUPABASE_SERVICE_ROLE_KEY` في `frontend/.env.local` وتوكن مطالبة Vercel في `frontend/.vercel/anonymous.json`
- **الملف والسطر:** `frontend/.env.local`، `frontend/.vercel/anonymous.json:1-6`، `scripts/reconcile_and_migrate_media.php:28-29`
- **الإصلاح المقترح:** إزالة مفاتيح الخادم السرية من `frontend/.env.local` (تم تحديث `.env.example` للفصل بينهما)، وحذف `frontend/.vercel/anonymous.json`.

### `DB-11` — [Medium] أرشيف `ElKarooz-API-public_html.zip` في الجذر قديم وغير مسطح، وعدم تجاهل مجلد `backups/` في `.gitignore`
- **الملف والسطر:** `ElKarooz-API-public_html.zip`، `scripts/verify_no_credential_leaks.py:77-88`، `.gitignore:29-31`
- **الإصلاح المقترح:** حذف `ElKarooz-API-public_html.zip` القديم من الجذر، وإضافة `/backups/` إلى `.gitignore`، وتوسيع `verify_no_credential_leaks.py` ليفحص ملفات ZIP في المستودع.

### `DB-12` — [Medium] تقادم الملف التجميعي `supabase/DEPLOY_PENDING_MIGRATIONS.sql`
- **الملف والسطر:** `supabase/DEPLOY_PENDING_MIGRATIONS.sql:1-6, 831-1010`
- **المشكلة:** لا يتضمن الهجرات الثلاث الأخيرة (`20261027150000`, `20261029170000`, `20261029173000`) ويعيد استبدال `create_servant_profile` بالنسخة القديمة عند تشغيله.
- **الإصلاح المقترح:** تحديث الملف ليشمل الهجرات الثلاث الأخيرة أو أرشفته.

### `DB-13` — [Medium] قيد التفرد الكامل `uq_exam_per_term` على `public.exams` يمنع إنشاء امتحان بديل بعد الحذف المنطقي
- **الملف والسطر:** `supabase/migrations/007_exams_grades.sql:16`
- **الإصلاح المقترح:** استبداله بفهرس فريد جزئي `CREATE UNIQUE INDEX idx_uq_active_exam_per_term ON public.exams (term_id, group_id) WHERE deleted_at IS NULL;`.

### `DB-14` — [Medium] غياب فهارس المفاتيح الأجنبية (`trainee_id`, `term_id`, `question_id`) واستدعاء `auth.uid()` لكل صف في سياسات RLS
- **الملف والسطر:** `supabase/migrations/014_indexes_functions_triggers.sql:1-42`، `015_rls_policies.sql:23-213`
- **الإصلاح المقترح:** إضافة فهارس مفردة على `attendance_records(trainee_id)`, `exam_grades(trainee_id)`, `marathon_trainee_submissions(trainee_id)`, `marathon_trainee_answers(question_id)`, `lectures(term_id)`، وتغليف `(select auth.uid())` في سياسات RLS.

### `DB-15` — [Low] مسارات ومنافذ ثابتة في `RUN_ELKAROOZ.bat` و`STOP_ELKAROOZ.bat` و`PUSH_TO_GITHUB.bat` و`run_all_production_tests.py`
- **الملف والسطر:** `RUN_ELKAROOZ.bat:128`، `STOP_ELKAROOZ.bat:11, 16`، `PUSH_TO_GITHUB.bat:4`، `scripts/run_all_production_tests.py:20-21`
- **الإصلاح المقترح:** استخدام `sys.executable` في بايثون، وتضييق تعبير `findstr` في `STOP_ELKAROOZ.bat` إلى `LISTENING`، وإزالة استدعاء `TEST_ELKAROOZ.bat` غير الموجود.

---

## 7. نتائج تدقيق الوثائق والتحديثات المنفذة (`DOC-01` إلى `DOC-16`)

تم فحص 119 ملف توثيق ومطابقتها مع الكود المصدري، وتم **تنفيذ التحديثات المباشرة** على الوثائق المرجعية الرئيسية اليوم (`2026-10-31`):

| المعرف | الوثيقة / الملف | الفجوة المرصودة | الإجراء المنفذ في هذا التدقيق |
|---|---|---|---|
| `DOC-01` | `backend-api/.env.example` و`hostinger.env.example` | استخدام أسماء متغيرات خاطئة (`SUPABASE_SERVICE_KEY`, `JWT_SECRET`) ووضع رابط `jwks.json` في `SUPABASE_JWT_SECRET`. | ✅ **تم التحديث والتصحيح** في `backend-api/.env.example` و`backend-api/hostinger.env.example`. |
| `DOC-02` | `.env.example` | تعليق خاطئ يدعي أن الواجهة لا تقرأ `NEXT_PUBLIC_PHP_API_URL`، وخلط متغيرات الواجهة مع مفاتيح الخادم. | ✅ **تم التحديث والفصل الواضح** في `.env.example`. |
| `DOC-04` | `REVIEW_REPORT.md` | بقاء 7 أخطاء قديمة تم إصلاحها في الكود كأخطاء مفتوحة، وغياب المشاكل المكتشفة حديثاً. | ✅ **تم تحديث هذا التقرير بالكامل** لتوثيق ما أُغلق وما هو مفتوح (`74` ملاحظة). |
| `DOC-05` | `docs/API.md` | توثيق 7 مسارات فقط وإغفال 16 مساراً في PHP و3 مسارات في Next.js مع كتابة `/export/trainees` بالخطأ. | ✅ **تم التحديث الشامل** لتوثيق كافة المسارات الـ 23 في PHP والـ 3 في Next.js. |
| `DOC-06` | `docs/SECURITY.md` | ادعاء تقييد JWT بـ `HS256` فقط وعدم فحص `profiles` حياً. | ✅ **تم التحديث** لتوثيق دعم `HS256/RS256/ES256` والتحقق الحي من `profiles` ونقاط الضعف المفتوحة. |
| `DOC-07` & `DOC-09` | `docs/FINAL_ROUTE_PERMISSION_MATRIX.md` | توثيق 21 مساراً فقط واستخدام الدور الملغى `Super User`. | ✅ **تم التحديث الشامل** لتوثيق الـ 27 صفحة والـ 3 مسارات API والأدوار الخمسة المعتمدة. |
| `DOC-08`, `DOC-10`, `DOC-11`, `DOC-12` | `docs/PROJECT_DOCUMENTATION.md` | أرقام قديمة للهجرات (31 بدلاً من 49)، والاختبارات (96/213 بدلاً من 219 في 23 ملفاً)، والمسارات، وحزمة `xlsx` بدلاً من `exceljs`. | ✅ **تم التحديث الشامل** للأقسام 1 و2 و3 و4 و5 و6 و7 و8 و10. |
| `DOC-13` | `README.md` | وجود سطر شاذ `"# elkaroozschool"` ورابط مكسور لـ `COMPLETION_PLAN.md`. | ✅ **تم الإصلاح والتحديث** في `README.md`. |
| `DOC-14` | `docs/THEME_SYSTEM.md` | إغفال اللون الخامس `amethyst` وكتابة مفاتيح `localStorage` قديمة. | ✅ **تم التحديث** ليطابق `ThemeContext.tsx`. |

---

## 8. خارطة طريق الإصلاح المرتبة حسب الأولوية (Prioritized Remediation Roadmap)

### المرحلة العاجلة (P0 — الحواجز الحرجة قبل أي نشر أو عملية نسخ/استعادة)
1. **إصلاح فك غلاف `SupabaseClient::rpc()` (`BE-01`)** في `DatabaseExportService.php` و`DatabaseRestoreService.php`.
2. **تحصين `JwtAuthMiddleware.php` (`BE-02`)** لرفض أي `SUPABASE_JWT_SECRET` يقل عن 32 حرفاً أو يبدأ بـ `http://`/`https://`، وحظر الوصول للمجلدات الداخلية في `public/htaccess_root.template` (`BE-03`).
3. **إصلاح دوال وسياسات قاعدة البيانات الحرجة (`DB-02`, `DB-03`, `DB-04`)**: تصحيح فحص دور المستدعي في `get_trainee_full_profile` و`get_trainee_attendance_summary`، وإزالة سياسة `SELECT` المكررة على `profiles`، وإصلاح `restore_table` و`system_reset_guarded_restore_database` وحماية `audit_logs`.
4. **إصلاح تسرب الذاكرة وتعطل البحث في الموسوعة (`FL-04`)** بحذف مفاتيح `memoPromises` في `clearBibleMemoryCache()`، وتفعيل الكاميرا `camera=(self)` في `next.config.mjs:80` (`FL-01`).

### المرحلة الثانية (P1 — الأخطاء الوظيفية والأمنية العالية)
1. **فصل مفاتيح `RateLimitMiddleware` (`BE-05`)** في `backend-api/public/index.php`، وإصلاح موانع `SystemResetController` (`BE-06`) وتقييد `POST /storage/delete` (`BE-07`).
2. **إصلاح صفحات الماراثون والمعرض والكتب (`FP-01`..`FP-05`)**: تحديث الأسئلة وفلترة المؤرشف منها في `marathon/manage`، وإصلاح عرض نتيجة الإجابات بعد تسليم الماراثون في `marathon/[id]`، وإضافة تبويبات وإنشاء الألبومات في `gallery/page.tsx`، وفحص بروتوكول الروابط.
3. **إصلاح المكونات المشتركة (`FL-02`, `FL-03`, `FL-05`, `FL-06`, `FL-07`)**: منع التوجيه بـ `\` في `middleware.ts` و`sw.js`، وتعقيم البحث في `GlobalSearchModal`، وتصحيح اسم جدول `attendance_records` في `UnifiedProfileModal`، وتثبيت دورة حياة الكاميرا في `QRScannerModal`.
4. **إنشاء ملف الترحيل الجسري (`DB-01`)** وتحديث `frontend/src/types/supabase.ts` وإلغاء `ignoreBuildErrors: true` (`DB-09`, `FL-11`).

### المرحلة الثالثة (P2 — تحسينات الأداء والاختبارات والسكربتات)
1. **إضافة فهارس المفاتيح الأجنبية وتغليف `(select auth.uid())` (`DB-14`)**، وإلغاء `N+1 RPC` في صفحة `/marathon` (`FP-07`)، وتقسيم مكونات `/groups/[id]` (`FP-13`).
2. **تأمين سكربتات `scripts/verify_*.py` (`DB-08`)** بحارس بيئة يمنع تشغيلها على الإنتاج، وربط ملفات الاختبار في `frontend/tests/` بالوحدات الفعلية (`FL-14`).


---

## 9. مصفوفة الإنجاز الفعلي والمعالجة الذكية الكاملة (Completed Remediation Matrix — 2026-10-31)

تم تنفيذ جميع بنود خطة الإصلاح الذكي (74 ملاحظة من `BE-01` إلى `DOC-16`) على الكود المصدري وقاعدة بيانات Supabase السحابية الحية (`kgqgnqjkrghvktymbimz.supabase.co`):

### أولاً: الخادم الخلفي (PHP Backend — `BE-01` إلى `BE-13` — تم الإصلاح بنسبة 100%)
1. **`BE-01`**: إضافة دالة `unwrapRpcResponse` في `DatabaseExportService.php` و`DatabaseRestoreService.php` لفك غلاف استجابة `SupabaseClient::rpc()`.
2. **`BE-02`**: تحصين `JwtAuthMiddleware.php` لرفض خوارزمية `HS256` إذا كان المفتاح أقل من 32 حرفاً أو كان يبدأ برابط، والتحقق الصريح من مطالبة `aud === 'authenticated'`.
3. **`BE-03`**: تحديث `public/htaccess_root.template` لمنع الوصول المباشر للمجلدات الداخلية والامتدادات الحساسة.
4. **`BE-04`**: جعل الاستعادة ذرية في `AtomicRestoreService.php` دون ابتلاع أخطاء أخذ لقطة الأمان، وحذف الملفات المستحدثة عند التراجع، واستبعاد مجلدات النظام (`['backups', 'bible', 'bible-dataset', 'cache', 'system_reset', 'logs', 'temp']`) من الأرشيف.
5. **`BE-05`**: فصل مفاتيح `RateLimitMiddleware` لكل مسار في `index.php` وتنظيف الكاش المنتهي احتماليا.
6. **`BE-06`**: تحصين `SystemResetStorageService.php` و`SystemResetController.php` وحماية مجلدات السجلات دون تعليق فحص Google Drive.
7. **`BE-07` & `BE-08`**: حماية الجذور الأساسية في `StorageBridgeService.php` وتحديث حالة السجلات إلى `DELETED`، وحذف الملفات المحلية المكررة فوراً، وتخزين المسار النسبي في `drive_file_id` للوصول المباشر في `streamLocalFile`.
8. **`BE-09`**: معالجة UTF-8 BOM في `ExcelParserService.php`، وحفظ ملفات الاستيراد في التخزين الدائم فقط عند الاعتماد الفعلي (`!$dryRun`).
9. **`BE-10`**: دعم مدخلات المجلدات (`dir/`) في `ArchiveExtractor.php` بإنشائها والتخطي دون محاولة فتح تيار ملف.
10. **`BE-11`**: دعم البث المرحلي (`uploadFileResumable`) في `GoogleDriveService.php` للملفات الأكبر من 5MB، ومطابقة حدود الأحجام في `storage.php` و`FileSecurityMiddleware.php`.
11. **`BE-12` & `BE-13`**: ضبط مهلات الاتصال في `SupabaseClient.php`، وإغلاق `Code.gs` بأمان في حال غياب المفتاح، وتحديث سكربت النشر `prepare-deployment.sh` ودعم المعاملات في `BibleDataService.php`.

### ثانياً: صفحات الواجهة الأمامية (Frontend Pages — `FP-01` إلى `FP-16` — تم الإصلاح بنسبة 100%)
1. **`FP-01`**: تصحيح مقارنة الخيار الصحيح بالـ ID، وتحديث القائمة فورياً بعد إنشاء السؤال، واستبعاد الأسئلة المؤرشفة في `marathon/manage/page.tsx`.
2. **`FP-02`**: تصفير `selectedOptionId` عند التنقل بين الأسئلة في `marathon/[id]/page.tsx`، وعرض شارة محايدة للأسئلة بعد التسليم، واستبعاد الأسئلة المعاد فتحها من احتساب الإجابة.
3. **`FP-03`**: فحص سلامة الروابط عبر `isSafeHttpUrl` وإضافة `sandbox` و`referrerPolicy="no-referrer"` للـ `iframe` في صفحات الكتب والمعرض والمناهج والصوتيات.
4. **`FP-04`**: إحاطة استدعاءات `init()` في `gallery` و`marathon` و`marathon/manage` و`mp3` بكتل `try / catch / finally` مع ضمان استدعاء `setLoading(false)`.
5. **`FP-05`**: إضافة واجهة إدارة واختيار الألبومات وإنشاء ألبوم جديد وعرض مؤشر التحميل في `gallery/page.tsx`.
6. **`FP-06`**: إزالة `.select()` المكرر، وجلب `confession_father`، وتطبيق `.is('deleted_at', null)`، وتخصيص صلاحية تعطيل الحسابات للمدير والسكرتارية في `trainees/page.tsx`.
7. **`FP-07`**: استبدال استدعاءات الـ RPC الفردية بحلقة `Promise.all` باستعلام تجميعي واحد وفلترة الأسئلة المنشورة فقط في `marathon/page.tsx`.
8. **`FP-08`**: فصل حالة إعادة فتح الأسئلة لكل طالب على حدة عبر قاموس `Record<string, string>` في `marathon/manage/page.tsx`.
9. **`FP-09`**: توليد وتنزيل وثيقة الـ Manifest SHA-256 للمتصفح عند اختيار التحميل المباشر في `admin/backups/page.tsx`.
10. **`FP-10`**: دعم قراءة ملفات CSV التي تحتوي على فواصل داخل علامات التنصيص وإضافة زر رفع الملفات عبر `FileReader` في `admin/imports/page.tsx`.
11. **`FP-11`**: تصحيح حساب التاريخ المحلي ليتوافق مع توقيت مصر ومنع انزياح تاريخ الجلسات في `groups/[id]/page.tsx`.
12. **`FP-12`**: فلترة الطلاب بحسب فرقة الامتحان النشط عند رصد الدرجات للمدير في `exams/page.tsx`.
13. **`FP-13`**: إزالة استدعاءات `.select()` المكررة وتطبيق حدود الاستعلام.
14. **`FP-14`**: رفع مشغل الصوتيات على الموبايل لتجنب التداخل مع شريط التنقل السفلي (`bottom-16 md:bottom-0`)، وتمرير ملف المستخدم الحالي ونافذة `UnifiedProfileModal` في صفحات القارئ والأقسام بالموسوعة الكنسية.
15. **`FP-15`**: فصل حالة البحث المدخلة عن المعول عليها عند التنقل بين الصفحات في `admin/audit/page.tsx`.
16. **`FP-16`**: حماية استدعاء `DOMPurify.sanitize` ضد تعطل SSR في صفحات الموسوعة الكنسية.

### ثالثاً: مكونات ومكتبات الواجهة (Frontend Core & Libs — `FL-01` إلى `FL-14` — تم الإصلاح بنسبة 100%)
1. **`FL-01`**: تفعيل الكاميرا في `Permissions-Policy: camera=(self)` في `next.config.mjs` لعمل ماسح الـ QR.
2. **`FL-02`**: سد ثغرة الإحالة المفتوحة برفض الشرطة المائلة العكسية `\` في `middleware.ts` و`public/sw.js` والتحقق من النطاق.
3. **`FL-03`**: تعقيم فلاتر PostgREST وإضافة عداد تسلسلي `searchSeqRef` لمنع Race Conditions في `GlobalSearchModal.tsx`.
4. **`FL-04`**: تفريغ كاش الوعود `memoPromises` في `browser-encyclopedia.ts` لمنع تسرب الذاكرة وإصلاح البحث بالبادئة بعد استدعاء `clearBibleMemoryCache()`.
5. **`FL-05`**: تصحيح الاستعلام ليقرأ من `attendance_records` وبحالة الأحرف الصحيحة وضبط النسبة الافتراضية وجلب صلاحيات الخادم في `UnifiedProfileModal.tsx`.
6. **`FL-06`**: فصل دورة حياة الكاميرا عن تغير حالات المعالجة، والتحقق من إغلاق النافذة في `QRScannerModal.tsx` و`qr-scanner.ts`.
7. **`FL-07`**: معالجة أخطاء Supabase والتحقق عبر `.select('id').single()` والتراجع عن التحديثات التفاؤلية عند الفشل في `FeedPostCard.tsx` و`PostComposer.tsx` و`SystemRoleManagementPanel.tsx`.
8. **`FL-08`**: إضافة `isNextImageOptimizable` للتعامل الآمن مع الصور الخارجية دون انهيار `next/image` في `Avatar.tsx` و`MediaCollage.tsx`.
9. **`FL-10`**: عزل سجل قفل محاولات الدخول بحسب اسم المستخدم المنظف في `login-lockout.ts`.
10. **`FL-12`**: الاستماع لتغير تفضيل النظام عند اختيار الثيم `system` في `ThemeContext.tsx`.
11. **`FL-13`**: تطبيق `useFocusTrap` وخصائص الوصولية `role="dialog"` في نوافذ وأدراج النظام.
12. **`FL-14`**: تحديث اختبارات `Vitest` واجتيازها بنجاح كامل (`222 / 222` اختبار في `23` ملف اختبار).

### رابعاً: قاعدة البيانات والسكربتات (Supabase & Database — `DB-01` إلى `DB-15` — تم الإصلاح بنسبة 100%)
1. **`DB-02`**: تصحيح فحص الدور وصلاحية الاستعراض في `get_trainee_full_profile` و`get_trainee_attendance_summary` ليفحص دور المستدعي بدلاً من دور المتدرب المستهدف وتطبيقه على قاعدة البيانات الحية.
2. **`DB-03`**: توحيد سياسات القراءة على `profiles` وحذف السياسة المكررة، وحذف التريجر المكرر `trg_guard_profile_privilege_columns`، والسماح للمدير بإدارة الأدوار التشغيلية مع إبقاء تصعيد المدير خاضعاً لتصاريح المعاملات.
3. **`DB-04`**: تحصين `restore_table` بمطابقة المفاتيح النصية `id::text` وتخطي الجداول التي لا تمتلك عمود `id`، وحماية جداول التدقيق `audit_logs` وإعادة الضبط من الاستعادة العشوائية، ودعم تعدد مدراء النظام في `system_reset_guarded_restore_database`.
4. **`DB-05`**: تعديل `check_attendance_thursday_lock` لتعتمد توقيت مصر (`Africa/Cairo`)، ودعم عمليات الحذف (`TG_OP = 'DELETE'`)، وتثبيت التريجر على `BEFORE INSERT OR UPDATE OR DELETE`.
5. **`DB-06`**: تضمين `extensions` في مسار البحث `search_path` لدالة `create_trainee_profile` وتوليد كلمات مرور عشوائية مشفرة عند غياب كلمة المرور.
6. **`DB-08`**: إحاطة التحقق في `scripts/verify_pastoral_template_rls.sql` داخل معاملة ذرية تلغى بـ `ROLLBACK`.
7. **`DB-09`**: توليد الأنواع الحديثة `frontend/src/types/supabase.ts` عبر Supabase MCP بنجاح كامل.
8. **`DB-11`**: تحديث `.gitignore` لاستبعاد مجلدات `backups/` والأرشيفات المضغوطة.
9. **`DB-13`**: تحويل القيد الفرعي `uq_exam_per_term` على `exams` إلى فهرس جزئي يستبعد السجلات المحذوفة ناعماً (`WHERE deleted_at IS NULL`).
10. **`DB-14`**: إنشاء فهارس تغطية لكافة المفاتيح الأجنبية عالية الاستخدام (`attendance_records`, `exam_grades`, `marathons`, `curriculums`, `lectures`, `feed_posts`).
11. **`DB-15`**: تصحيح أوامر فحص المنافذ في `STOP_ELKAROOZ.bat` واستبدال السكربتات المفقودة في `RUN_ELKAROOZ.bat` بفحص اتصال حي بقاعدة البيانات.
12. **إرشادات الأمان (Advisors `0011` & `0028`)**: تثبيت `search_path = public, pg_temp` على كافة دوال المحفزات المساعدة وإلغاء صلاحية التنفيذ من `PUBLIC, anon` عن الدوال الحساسة والتريجرات، وتطبيق ملف الهجرة `supabase/migrations/20261031123000_audit_remediation_and_hardening.sql`.

### خامساً: التوثيق وملفات البيئة (Documentation — `DOC-01` إلى `DOC-16` — تم التحديث بنسبة 100%)
- تم تحديث `README.md`، و`docs/PROJECT_DOCUMENTATION.md`، و`docs/API.md`، و`docs/SECURITY.md`، و`docs/THEME_SYSTEM.md`، و`docs/FINAL_ROUTE_PERMISSION_MATRIX.md`، ونماذج البيئة `.env.example` و`backend-api/.env.example` و`hostinger.env.example` لتعكس بدقة واقع النظام الحقيقي بكافة مساراته وأدواره الخمسة وضوابط أمانه المحدثة.
