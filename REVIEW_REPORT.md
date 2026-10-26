# مراجعة شاملة لمشروع EL KAROOZ SCHOOL
## Independent Full-Project Code Review
**التاريخ:** 2026-10-14  
**المراجع:** وكيل مراجعة مستقل  
**النطاق:** الواجهة الأمامية (Next.js) + الخادم الخلفي (PHP API)

---

## ملخص الوضع الحالي

| المقياس | النتيجة |
|---------|---------|
| TypeScript (tsc --noEmit) | ✅ 0 أخطاء |
| Vitest | ✅ 184/184 اختبار ناجح (17 ملف) |
| Next.js Build | ✅ 25 مسار ناجح |
| أسرار مكشوفة في الكود | ✅ لا يوجد |
| eval/exec/innerHTML مباشر | ⚠️ 2 استخدام لـ dangerouslySetInnerHTML |

---

# المرحلة الأولى: الأخطاء المنطقية (Logic Errors)

## خطأ 1 — ⛔ حرج: متغير `$storageRoot` غير معرّف في BackupController::delete()
**الملف:** `backend-api/src/Controllers/BackupController.php` **السطر:** 387  
```php
$absolute = $storageRoot . '/' . ltrim(str_replace(['..', "\0"], '', $storagePath), '/\\');
```
المتغير `$storageRoot` غير معرّف. المعرّف هو `$backupRoot` (سطر 385) أو `$storageConfig['root_path']`. هذا يعني أن `$absolute` سيكون دائماً مسار نسبي (لأن `$storageRoot` = `''`/null)، و`realpath()` سيرجع `false`، ولن يتم حذف الملف الفعلي من القرص أبداً رغم أن السجل يُحذف ناعماً. **النتيجة:** ملفات النسخ الاحتياطية المحذوفة تظل على القرص للأبد مستهلكة المساحة.

**الإصلاح:**
```php
$absolute = $backupRoot . '/' . ltrim(str_replace(['..', "\0"], '', $storagePath), '/\\');
```

## خطأ 2 — ⚠️ متوسط: CORS لا يشمل الرابط الفعلي للنشر على Vercel
**الملف:** `backend-api/config/app.php` **السطر:** 7  
تم اعتماد رابط Vercel الحالي `https://elkaroozschool1.vercel.app` في إعداد CORS واختبارات الإنتاج. يجب نشر تحديث إعداد CORS على خادم PHP حتى يُسمح للواجهة بطلبات API.

**الإصلاح:** إضافة `'https://elkaroozschool1.vercel.app'` إلى مصفوفة `$corsOrigins`.

## خطأ 3 — ⚠️ متوسط: `X-Authorization` غير مدرج في allowed_headers الخاص بـ CORS
**الملف:** `backend-api/config/app.php` **السطر:** 25  
Frontend يرسل ترويسة `X-Authorization` (السطر 74 من `php.ts`)، لكن `allowed_headers` في app.php لا يحتوي عليها. المتصفح سيرفض preflight request لأن الترويسة غير مصرح بها.

**الإصلاح:**
```php
'allowed_headers' => ['Content-Type', 'Authorization', 'X-Authorization', 'X-Requested-With', 'X-Group-Scope']
```

## خطأ 4 — ⚠️ متوسط: `useEffect` يعتمد على `supabase` دون إدراجه في dependencies
**الملف:** `frontend/src/app/admin/audit/page.tsx` **السطر:** 47, 63-94  
`const supabase = createClient()` يُنشأ في كل render خارج useEffect، ثم يستخدم داخل useEffect الذي يعتمد فقط على `[router]`. هذا يعني أن `supabase` يتغير في كل render لكن useEffect لا يعرف. الأثر العملي ضئيل لأن Supabase client يُعاد إنشاؤه بنفس المعاملات، لكنه مخالف لقواعد React hooks ويسبب تحذيرات lint.

## خطأ 5 — ⚠️ متوسط: تصفية Audit تسمح بحقن أجزاء من صيغة PostgREST
**الملف:** `frontend/src/app/admin/audit/page.tsx` **السطر:** 112  
التنظيف الحالي يزيل `%.,()` لكن لا يزيل backtick أو الأقواس المربعة أو علامات الاقتباس. قيمة بحث تحتوي على `*` أو `!` قد تنتج سلوك غير متوقع في PostgREST ilike. الخطر منخفض لأن الواجهة محمية بصلاحيات admin فقط، لكن الأفضل هو escape كامل لأحرف PostgREST الخاصة.

## خطأ 6 — 🔶 منخفض: regex فك التشكيل في Bible page معطل بسبب escape
**الملف:** `frontend/src/app/bible/page.tsx` **السطر:** 310  
```typescript
clean_word: word.word_text.replace(/[ً-ْ]/g, ''),
```
هذا regex يعتمد على نطاق Unicode للتشكيل (U+064B إلى U+0652). يعمل بشكل صحيح في بيئة التنفيذ، لكن يجب التأكد من أن الحرف الأول والأخير في النطاق يُعامَلان كـ Unicode codepoints لا كـ bytes.

## خطأ 7 — 🔶 منخفض: regex الخاص بـ `extractBookTokens` لا يعمل كما هو متوقع
**الملف:** `frontend/src/lib/bible/browser-encyclopedia.ts` **السطور:** 548-550  
```typescript
.replace(/\\b1\\b/g, 'الاول')
.replace(/\\b2\\b/g, 'الثاني')
.replace(/\\b3\\b/g, 'الثالث');
```
الـ `\\b` (word boundary) في regex يعمل على حروف ASCII فقط ولا يعمل بشكل موثوق مع نصوص عربية متجاورة. لكن هذا لا يؤثر عملياً لأن الأرقام 1/2/3 نادراً ما تظهر في أسماء الأسفار العربية، والاختبارات تؤكد أن الأسفار تطابق بشكل صحيح.

---

# المرحلة الثانية: المخاطر الأمنية (Security Risks)

## خطر 1 — ⛔ حرج: `dangerouslySetInnerHTML` مع محتوى Encyclopedia
**الملفات:**
- `frontend/src/app/bible/page.tsx` **سطر 619**
- `frontend/src/app/bible/reader/[id]/page.tsx` **سطر 149**

محتوى المقالات (HTML كامل) يُحقن مباشرة في DOM دون تعقيم. المحتوى يأتي من ملفات JSON ثابتة أو من Supabase. إذا تمكن مهاجم من تعديل ملفات `chunk-*.json.gz` أو إدخال سجل في جدول `bible_articles` يحتوي على `<script>` أو `<img onerror>`, فسيتم تشغيل JavaScript في سياق المستخدم.

**درجة الخطورة:** حرج من الناحية النظرية، لكن الاستغلال يتطلب اختراق الخادم أو قاعدة البيانات أولاً (لأن الملفات ثابتة والجداول محمية بـ RLS). لا يزال ينبغي تعقيم HTML.

**الإصلاح المقترح:**
```bash
npm install dompurify @types/dompurify
```
```typescript
import DOMPurify from 'dompurify';
// ...
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
```

## خطر 2 — ⚠️ متوسط: `streamLocalFile` يستخدم مسح شجري كامل للملفات
**الملف:** `backend-api/src/Services/StorageBridgeService.php` **السطور:** 340-348  
```php
$iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root));
foreach ($iterator as $item) {
    if ($item->isFile() && $item->getFilename() === $fileName) {
```
البحث يتم بالمسح الشامل لشجرة التخزين بأكملها عن اسم الملف. على بنية كبيرة (آلاف الملفات) هذا:
1. **أداء**: بطيء جداً — O(n) على كل طلب بث ملف
2. **تسرب معلومات**: لو تطابق اسم ملف في مجلد آخر (مثلاً ملف باسم مشابه في مجلد فرقة مختلفة)، قد يُبث ملف خاطئ
3. **DoS**: طلبات متكررة تثقل I/O

**الإصلاح:** استخدام `drive_file_id` كمسار نسبي محدد بدلاً من البحث الشامل بالاسم.

## خطر 3 — ⚠️ متوسط: تثبيت UUID في كود fallback admin
**الملف:** `backend-api/src/Services/StorageBridgeService.php` **السطر:** 274  
```php
$uploadedBy = $adminRes['data'][0]['id'] ?? 'a864e1f1-5f6c-4c6c-90e0-13a79e3cb558';
```
UUID ثابت hardcoded كـ fallback لـ uploaded_by. إذا حُذف هذا المستخدم من النظام أو تم تغييره، ستظل الملفات تُسجل باسمه. ينبغي رفض العملية بدلاً من استخدام UUID ثابت.

## خطر 4 — 🔶 منخفض: GOOGLE_DRIVE_ROOT_ID ثابت في الكود
**الملف:** `backend-api/src/Services/StorageBridgeService.php` **السطر:** 19  
```php
$this->rootFolderId = (string)(getenv('GOOGLE_DRIVE_ROOT_ID') ?: '1liUd9WOQ_6B9pQ1acj2h5fpLNDF8sPUB');
```
معرف مجلد Google Drive الجذري ثابت في الكود كـ fallback. ينبغي أن يكون env-only بدون fallback.

## خطر 5 — 🔶 منخفض: `console.error` في صفحات الإنتاج
تم رصد 12 استخدام لـ `console.error` في `frontend/src/app/`. بعضها مقبول لكن البعض يُسرّب تفاصيل داخلية (مثل أسماء RPCs الفاشلة). الأفضل استخدام خدمة logging مركزية أو إزالة التفاصيل الحساسة.

## خطر 6 — 🔶 منخفض: إدخال غير منظف في Supabase `.or()` filter
**الملف:** `frontend/src/app/admin/audit/page.tsx` **السطر:** 114-116  
رغم التنظيف الحالي، PostgREST `.or()` يفسر الفاصلة (`,`) كفاصل بين شروط. التنظيف يزيل `,` لكن لا يزيل `&` أو نقاط المقاييس الأخرى. محمي بأن الصفحة admin-only.

---

# المرحلة الثالثة: نقاط الضعف البنيوية والتصميمية

## ضعف 1 — عدم وجود Rate Limiting فعلي
**الملف:** `backend-api/src/Middleware/RateLimitMiddleware.php` — يجب التحقق من أنه مُطبق فعلاً على كل المسارات. بدون rate limiting، يمكن لمهاجم يملك توكن صالح:
- استدعاء `/export/data` آلاف المرات لتصدير كل البيانات
- استدعاء `/backup/create` بشكل متكرر لملء القرص
- استدعاء `/api/storage/file/{id}` مع UUIDs مختلفة لسرد الملفات

## ضعف 2 — عدم وجود CSP (Content Security Policy)
لا يوجد ترويسة `Content-Security-Policy` في `.htaccess` أو في ترويسات PHP. هذا يسمح بتحميل scripts, iframes, أو styles من مصادر خارجية.

## ضعف 3 — اعتماد كامل على HS256 JWT verification
**الملف:** `backend-api/src/Middleware/JwtAuthMiddleware.php` **السطر:** 46  
```php
$decoded = JWT::decode($jwt, new Key($config['jwt_secret'], 'HS256'));
```
Supabase يوقّع access tokens بـ HMAC-SHA256 باستخدام JWT secret معروف. هذا سليم مبدئياً، لكن التعليق في السطر 84-87 يذكر أن "Supabase signs access tokens with RS256/ES256, not the HS256 secret used above" — وهذا تناقض. إذا كان Supabase يستخدم HS256 مع jwt_secret فالكود صحيح. يجب التأكد من أن الخوارزمية تتطابق فعلاً مع إعداد Supabase.

## ضعف 4 — لا يوجد CSR/CSRF protection على PHP API
طلبات POST/PATCH/DELETE على PHP API لا تتحقق من CSRF token. محمي جزئياً بأن CORS يمنع الطلبات من origins غير مصرح بها، لكن CORS وحده ليس حماية كافية ضد CSRF على الطلبات البسيطة.

## ضعف 5 — `ExcelParserService::parseCsv()` يقرأ فقط CSV رغم قبول `.xlsx`
**الملف:** `backend-api/src/Controllers/ImportController.php` **السطر:** 29  
```php
$rows = ExcelParserService::parseCsv($file['tmp_name']);
```
الكود يقبل `.xlsx` كامتداد لكن يستدعى `parseCsv()` فقط. إذا رفع المستخدم ملف Excel حقيقي (.xlsx) فسيتم قراءته كـ CSV وسيفشل أو يُنتج نتائج مشوهة بصمت.

## ضعف 6 — عدم وجود تسجيل خروج أو إبطال توكن في PHP API
`AuthController` يحتوي فقط على `verifySession()`. لا يوجد endpoint لإبطال الجلسة أو تسجيل الخروج. هذا يعني أن المستخدم الموقوف يبقى مصادقاً حتى انتهاء صلاحية التوكن (يُعالج جزئياً بفحص `is_active` في السطر 67-68 من JwtAuthMiddleware).

---

# المرحلة الرابعة: مخاطر الأداء والموثوقية

## أداء 1 — تحميل WingSelector يجلب كل الأقسام مقدماً
`getBibleCategories()` + `getBibleStats()` + `getCategoriesAndSections()` تُنفذ عند فتح الصفحة. مع 36 قسماً و41,000 وثيقة، هذا مقبول لأن البيانات ثابتة ومخزنة مؤقتاً. لا مشكلة حالياً.

## أداء 2 — `resolveArticleId` يحمل فهرسين كاملين في الذاكرة
عند البحث عن سفر بالاسم والإصحاح، يتم تحميل كامل فهرس `sec-holy-bible-complete` ثم `sec-01`. هذا مقبول بسبب التخزين المؤقت في `sectionIndexCache`.

## أداء 3 — `streamLocalFile` recursive directory scan (مكرر من أعلاه)
كل طلب بث ملف محلي يمسح شجرة الملفات بأكملها. هذا خطر أداء حقيقي على production.

---

# المرحلة الخامسة: الحالة العامة للاختبارات

| الفئة | التغطية | ملاحظات |
|-------|---------|---------|
| Bible Resolution | ✅ جيد | 6 اختبارات تغطي الأسفار المتشابهة |
| User Journeys | ✅ جيد | 13 سيناريو تفاعلي |
| PHP API Client | ✅ جيد | 24 اختبار |
| UI Architecture | ⚠️ جزئي | 3 اختبارات فقط |
| Audit Page | ❌ غائب | لا اختبارات لصفحة admin/audit |
| Section Navigation | ❌ غائب | لا اختبارات لـ bible/section/[code] |
| Backend PHP | ❌ غائب بالكامل | لا يوجد أي اختبار PHP |

---

# ملخص الأولويات (خطة التنفيذ المرحلية)

## المرحلة 1: إصلاحات حرجة فورية (يجب قبل أي commit)
1. **إصلاح `$storageRoot` → `$backupRoot` في BackupController::delete()** — سطر 387
2. **إضافة `X-Authorization` إلى CORS allowed_headers** — app.php سطر 25
3. **إضافة origin Vercel الفعلي** (`elkaroozschool1.vercel.app`) إلى CORS origins
4. **تعقيم HTML لمحتوى الموسوعة** — تثبيت DOMPurify واستخدامه في bible/page.tsx و reader/[id]/page.tsx

## المرحلة 2: إصلاحات أمنية ضرورية (خلال أسبوع)
5. **إصلاح `streamLocalFile`** — استبدال البحث الشامل بمسار مباشر من `drive_file_id`
6. **إزالة UUID الثابت** من StorageBridgeService fallback
7. **إزالة Google Drive Root ID الثابت** — جعله env-only
8. **إضافة CSP headers** — في .htaccess أو عبر PHP header
9. **التحقق من تطبيق Rate Limiting** على جميع المسارات

## المرحلة 3: تحسينات الجودة (خلال أسبوعين)
10. **إصلاح ImportController** — parseCsv vs parseXlsx بناءً على الامتداد
11. **إضافة CSRF protection** أو على الأقل double-submit cookie
12. **تحريك `supabase` client** داخل useEffect في audit/page.tsx
13. **تحسين تنظيف البحث** في audit query — escape كامل لأحرف PostgREST
14. **إزالة `console.error` التفصيلية** من صفحات الإنتاج

## المرحلة 4: اختبارات وتوثيق (مستمر)
15. **كتابة اختبارات لصفحة audit** — fetch, filter, pagination, modal
16. **كتابة اختبارات لـ section navigation** — section code vs category code
17. **دراسة إمكانية إنشاء اختبارات PHP** — تغطية المسارات الحرجة على الأقل
18. **التحقق من تطابق خوارزمية JWT** (HS256 vs RS256) مع إعداد Supabase الفعلي

---

# الحكم النهائي

**النتيجة: مقبول مشروطاً — يحتاج إصلاحات المرحلة 1 قبل الدفع**

المشروع ككل بنية سليمة ومحكمة. الأمان الأساسي (JWT, RBAC, path traversal protection, file validation) مُطبق بشكل جيد. الخطأ الأخطر عملياً هو متغير `$storageRoot` غير المعرّف الذي يمنع حذف ملفات النسخ الاحتياطية من القرص. مخاطر XSS عبر `dangerouslySetInnerHTML` نظرية لكن يجب معالجتها بمبدأ defense-in-depth. CORS misconfiguration هو الخطأ الذي سيمنع Frontend من التواصل مع Backend فعلياً على الإنتاج.
