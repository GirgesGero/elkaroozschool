# السياسات والضوابط الأمنية — Security Policies & Defensive Controls

> **تاريخ التحديث:** 2026-10-31  
> **الإصدار:** `1.0.1`  
> **الحالة:** مرجع رسمي معتمد (Canonical — محدّث وفق الكود الحالي ومراجعة 2026-10-31)

---

## 1. المصادقة والتحقق من رموز JWT (`JwtAuthMiddleware.php`)

- **دعم الخوارزميات المتماثلة وغير المتماثلة:** يدعم `JwtAuthMiddleware` التحقق من التوقيع عبر `HS256` (باستخدام `SUPABASE_JWT_SECRET`) وكذلك `ES256` و`RS256` عبر جلب مفاتيح JWKS من `/auth/v1/.well-known/jwks.json` وتخزينها مؤقتاً في `storage/temp/supabase_jwks_cache.json`.
- **التحقق الحي من حالة الحساب والدور (`fetchLiveProfile`):** لا يكتفي الخادم الخلفي بمطالبات الدور المخزنة داخل الـ JWT، بل يستعلم في كل طلب عن جدول `public.profiles` للتحقق من أن الحساب نشط (`is_active = true` و`deleted_at IS NULL`) وجلب أحدث `role_id` و`group_id`.
- **إبطال الجلسات بعد إعادة ضبط النظام (`auth-cutoff.json`):** يتحقق الوسيط من طابع `iat`/`auth_time` مقابل ملف القطع الزمني `storage/system_reset/auth-cutoff.json` لرفض أي رمز JWT صُدر قبل عملية إعادة ضبط النظام.
- **عزل مطالبات الواجهة (`routeAccess.ts`):** تعتمد دالة `roleFromVerifiedClaims` في الواجهة الأمامية حصرياً على `app_metadata.role` الموثق من الخادم وتتجاهل `user_metadata` القابل للتعديل من جهة العميل.

## 2. التفويض وعزل الصلاحيات (Authorization & RLS)

- **الأدوار الخمسة المعتمدة:** `admin` (مع دعم تعدد مديري النظام `Co-System Administrators` وحظر حذف أو تعطيل آخر مدير نشط)، `supervisor`، `secretariat`، `servant` (مع مصفوفة الصلاحيات المفوضة `servant_permissions`)، و`trainee`.
- **حماية العمليات الإدارية في PHP (`RbacMiddleware::requireSystemAdmin`):** تقتصر جميع عمليات النسخ الاحتياطي، الاستعادة، التصدير، الاستيراد، وإعادة ضبط النظام على دور `admin` حصراً.
- **حماية المستوى الصفّي (Row Level Security):** مفعّلة على جداول المخطط العام مع سحب صلاحيات `TRUNCATE, TRIGGER, REFERENCES` والدوال الحساسة (`SECURITY DEFINER`) من الدورين `anon` و`PUBLIC`.
- **حماية مسارات إعادة الضبط (`api/system-reset/*`):** تطبق فحص `Origin`/`Host` لمنع CSRF، والتحقق من كلمة مرور المدير، وتوقيع `HMAC-SHA256` الزمني (`crypto.timingSafeEqual`)، وبوابة الأقفال التزامنية `ResetAccessGate` (`flock`).

## 3. أمان الملفات والتخزين والنسخ الاحتياطي

- **منع اجتياز المسار (Path Traversal & Zip-Slip):** فحص المسارات عبر `realpath()` والتأكد من احتوائها داخل الجذر المسموح، وفحص أسماء مدخلات أرشيف ZIP ونسبة الانضغاط والحجم الأقصى في `ArchiveExtractor` و`BackupArchiveInspector`.
- **تشفير النسخ الاحتياطية:** تشفير أرشيفات النسخ الاحتياطي باستخدام `ZipArchive::EM_AES_256` في `ZipEncryptionService`.
- **تحييد حقن المعادلات (CSV/XLSX Formula Injection):** تحييد الخلايا التي تبدأ بـ `=`, `+`, `-`, `@`, `\t`, `\r` في `SpreadsheetWriter`.
- **عزل ملف البيئة (`Environment.php`):** يرفض الخادم الخلفي تحميل أي ملف `.env` يقع داخل `DOCUMENT_ROOT`.
- **حماية عنوان IP العميل (`ClientIp.php`):** لا يثق الخادم بترويسة `X-Forwarded-For` إلا عند قدوم الطلب من وكيل ضمن قائمة `TRUSTED_PROXIES`.
- **تعقيم محتوى HTML:** استخدام `DOMPurify.sanitize` قبل عرض نصوص وتفاسير الموسوعة الكتابية، وتقييد كاش `Service Worker` (`public/sw.js`) على ملفات الموسوعة الثابتة `/storage/bible-dataset/v1/` فقط لمنع تخزين بيانات المستخدمين على الأجهزة المشتركة.

## 4. إخفاء الأخطاء ومنع تسريب المعلومات (`SafeFailure`)

- تحويل أخطاء PostgreSQL/PostgREST في الواجهة عبر `src/lib/errors/db.ts` إلى رسائل عربية واضحة دون كشف تفاصيل المخطط.
- إخفاء تفاصيل الاستثناءات ومسارات الخادم في PHP عبر `SafeFailure` مع إرجاع معرف تتبع فريد (`error_id`) يربط استجابة العميل بسجل الأخطاء الداخلي.

---

## 5. نقاط الضعف المفتوحة المرصودة في مراجعة 2026-10-31 (تتطلب المعالجة قبل الإطلاق)

للتفاصيل الكاملة وأرقام الأسطر، راجع [تقرير المراجعة الشاملة](../REVIEW_REPORT.md):

1. **`BE-02` (حرج):** قالب `backend-api/hostinger.env.example:16` يضع رابط `jwks.json` العلني كقيمة لـ `SUPABASE_JWT_SECRET`، مما يسمح بتزوير توكنات `HS256` إذا نُسخ القالب كما هو. يجب وضع سر `HS256` الحقيقي ورفض أي مفتاح متماثل يبدأ بـ `http://` أو `https://`.
2. **`BE-03` (عالٍ):** ملف `backend-api/public/htaccess_root.template` في النشر المسطح يمنع تنفيذ `.php` فقط داخل المجلدات الفرعية ولا يحظر الوصول المباشر للملفات غير البرمجية داخل `config/`, `migrations/`, `tests/`, `apps-script/`.
3. **`DB-02` و`DB-03` (حرج):** فحص معكوس لمتغير الدور `v_role` في `get_trainee_full_profile` و`get_trainee_attendance_summary`، ووجود سياسة `SELECT` مكررة على `public.profiles` تسمح بقراءة أعمدة البيانات الشخصية (PII) والحسابات المحذوفة منطقياً عبر PostgREST.
4. **`FL-01` و`FL-02` و`FP-03` (عالٍ):** ترويسة `Permissions-Policy: camera=()` في `next.config.mjs:80` تعطل ماسح QR للحضور، والتحقق من مسار التوجيه في `middleware.ts:94` و`sw.js:126` لا يمنع الشرطة المائلة العكسية `/\evil.com`، وحقول الروابط في الكتب/المعرض/الصوتيات تحتاج فحص بروتوكول `https:`/`http:` صريح.
