# مرجع مشروع مدرسة الكاروز — ELKAROOZ SCHOOL

> **نوع الوثيقة:** توثيق تقني مبني على التنفيذ الحالي (as-built)، وليس إعادة صياغة لمتطلبات المشروع فقط.<br>
> **مراجعة وتحديث المصدر:** 31 أكتوبر 2026 (الإصدار `1.0.1`).<br>
> **مسار المستودع:** `E:\drive progect\ELKAROOZ SCHOOL`
> **حدود مراجعة المصدر:** قُرئت كافة ملفات التنفيذ والتهيئات والـ migrations الـ 49 والاختبارات؛ استُبعدت أشجار الاعتماديات والمخرجات مثل `node_modules/`, `.next/`, و`backend-api/vendor/` من جرد الكود. تم توثيق نتائج المراجعة الشاملة لـ 74 ملاحظة تقنية وأمنية ومنطقية في [تقرير المراجعة الشاملة](../REVIEW_REPORT.md).

## كيف تُقرأ هذه الوثيقة

- **مرصود من المصدر:** سلوك ظاهر في ملفات المستودع؛ يُذكر بجواره مسار الدليل.
- **مُنفّذ/متحقق:** أمر شُغّل فعليًا في بيئة التطوير؛ النتيجة موثقة في قسم التحقق.
- **استنتاج:** نتيجة منطقية من تركيب المصدر، لكنها ليست إثباتًا من النظام المنشور.
- **غير محسوم:** يحتاج سرًا أو اتصالًا أو فحصًا على البيئة الحية.

هذا المرجع يشرح خريطة النظام، واجهاته، البيانات، الأمن، التشغيل، وما يحتاج مراجعة. لا يعني أن كل تكامل خارجي يعمل أو أن كل سطر في المشروع خضع لاختبار حي. عند التعارض، **الكود والـmigration الحالية يصفان ما ينفّذه المستودع**؛ وثيقة المتطلبات تصف المقصود، وتقارير التدقيق القديمة قد تكون متقادمة.

---

## 1. الملخص التنفيذي

**EL KAROOZ SCHOOL** منصة عربية RTL للتعليم وإدارة مدرسة كتاب مقدس، تضم حسابات وأدوارًا ومجموعات دراسية، محتوى ومناهج ومحاضرات، حضورًا وامتحانات وماراثونات، مكتبة وكتابًا مقدسًا، موجزًا اجتماعيًا وإشعارات، وأدوات استيراد وتصدير ونسخ احتياطي واستعادة.

تقنيًا هي تطبيق هجين من ثلاث طبقات:

```text
المتصفح / PWA
   ├── Supabase Auth + PostgREST/RPC + Realtime
   │      └── PostgreSQL: بيانات النظام وRLS
   └── PHP API (Bearer JWT)
          ├── عمليات الملفات والنسخ والاستعادة والاستيراد/التصدير
          ├── Supabase عبر PostgREST/RPC
          └── قرص الخادم: storage/
```

الواجهة هي **Next.js 14 App Router + React + TypeScript**. يحتوي migrations المحلية على **54 اسم جدول فريدًا** في أوامر `CREATE TABLE`، بينما أظهر الجرد الحالي للقراءة فقط **55 جدولًا في public**؛ توجد فروقات بين قائمة migrations والـsnapshot/المخطط الحي، ولا يُفترض التطابق. صُنفت جداول reset في [الخطة الآمنة](SAFE_SYSTEM_RESET_PLAN.md). نتيجة RLS التاريخية (50 جدولًا) لا تمثل تدقيقًا حديثًا لكل الجداول الـ55. لا يزال تصنيف المشروع كـstaging/production غير محسوم.

### صورة الحالة من التحقق المحلي — 31 أكتوبر 2026

- Frontend `npm run typecheck` (`tsc --noEmit`): ناجح (`0` أخطاء).
- Vitest (`npm test`): **219 اختبارًا عبر 23 ملف اختبار ناجحة بالكامل (`219/219`)**. ظهر تحذير JSDOM عن navigation غير مدعومة في اختبار روابط دون فشل أي اختبار.
- `npm run lint` (`next lint`): exit 0 مع 19 تحذيرًا (`react-hooks/exhaustive-deps` و`@next/next/no-img-element`).
- ملفات الهجرة المحلية في `supabase/migrations/`: **49 ملف SQL** (مع فجوة تاريخية بين `016` و`20260930` موثقة في `DB-01`).
- اختبارات الخلفية في `backend-api/tests/`: **10 ملفات اختبار** (9 ملفات PHP + ملف SQL واحد).
- مسارات الواجهة في `frontend/src/app/`: **27 صفحة (`page.tsx`) + 3 مسارات API (`route.ts`) = 30 مسارًا**.
- مسارات الخادم الخلفي في `backend-api/public/index.php`: **23 مسارًا فعليًا** (24 شاملة مسار الجذر `/`).

---

## 2. هدف المنتج والأدوار

الملخص التالي يجمع المجال الظاهر في `docs/SRS_ELKAROOZ_SCHOOL.md` مع الأدوار المعتمدة في `frontend/src/lib/auth/routeAccess.ts` وملفات الهجرة حتى `20261029173000`. تم إلغاء الدور القديم `super_user` واعتماد نموذج تعدد مديري النظام (`Co-System Administrators` في `20261027150000_co_system_administrators.sql`):

| الدور (`AppRole`) | المقصود وظيفيًا | صلاحيات/حدود تقنية مرصودة |
|---|---|---|
| `admin` | إدارة النظام (يدعم تعدد المديرين مع حماية آخر مدير نشط) | عالمي في سياسات SQL وPHP؛ مسارات `/admin/*` وإعادة ضبط النظام والنسخ والاستعادة مسموحة له حصراً. |
| `supervisor` | إشراف عام / أمانة عامة | وصول إشرافي عبر الفرق؛ مسموح له في `routeAccess.ts` بمسارات `/trainees`, `/marathon/manage`, `/attendance`, `/exams` ورفع الملفات في `StorageController`. |
| `secretariat` | سكرتارية فرقة / أمانة عامة | إدارة الحضور وبيانات متدربي الفرقة، مع دعم جدول `general_secretariat_members`. |
| `servant` | خادم | صلاحيات أساسية، ومهام مفوضة عبر `servant_permissions` و`has_servant_permission(...)`. |
| `trainee` | متدرب/مخدوم | يقرأ بياناته والمحتوى المسموح ويتفاعل ويؤدي الماراثون؛ يُمنع من مسارات الإدارة وإنشاء المنشورات. |

الصلاحيات المفوضة المزروعة في `016_seed_data.sql`: `MANAGE_LECTURES`, `MANAGE_CURRICULUM`, `MANAGE_MARATHON`, `GRADE_EXAMS`, `MANAGE_BOOKS`. المجموعات المزروعة: الفرق الأولى والثانية والثالثة بأرقام `1`, `2`, `3`.

---

## 3. هيكل المستودع ومسؤولية كل جزء

| المسار | دوره |
|---|---|
| `frontend/` | تطبيق Next.js وواجهات الصفحات والمكونات والاختبارات. |
| `frontend/src/app/` | صفحات App Router؛ أغلبها client-side وتستعلم مباشرةً من Supabase. |
| `frontend/src/lib/` | عملاء Supabase، فحص الجلسة والمسارات، بوابة PHP، وتطبيع أخطاء DB. |
| `frontend/src/components/` | عناصر مشتركة: محدد المجموعة، بطاقات لوحة المجموعة، مركز الإشعارات، وملفات ملفات تعريف المستخدم. |
| `backend-api/public/index.php` | مدخل PHP، تحميل الأصناف، CORS، وتوزيع المسارات. |
| `backend-api/src/Controllers/` | معالجات المصادقة والتخزين والنسخ والاستعادة والاستيراد والتصدير. |
| `backend-api/src/Middleware/` | JWT وRBAC ونطاق المجموعة وحماية الملفات وCORS وrate limit. |
| `backend-api/src/Services/` | PostgREST، تخزين الملفات، أرشيف ZIP، الاستعادة، الاستيراد/التصدير، وسجل التدقيق. |
| `backend-api/config/` | إعدادات التطبيق وCORS، Supabase، وحدود التخزين. |
| `backend-api/storage/` | مساحة ملفات PHP؛ يجب أن تكون محمية من تنفيذ السكربتات ومهيأة حسب الاستضافة. |
| `supabase/migrations/` | DDL والسياسات والدوال والمشغلات والـseed والتعديلات الأمنية. |
| `scripts/` | فحوص واختبارات مرحلية وأمنية وحزم النشر. |
| `docs/` | SRS وتصميم وتقارير مراحل وأدلة تشغيل وتدقيق؛ بعض ملفاتها أقدم من المصدر الحالي. |
| `vercel.json` | إعداد بناء Vercel لمجلد `frontend` من جذر المستودع. |
| `RUN_ELKAROOZ.bat`, `STOP_ELKAROOZ.bat`, `PUSH_TO_GITHUB.bat` | سكربتات تشغيل/إيقاف محلي ودفع Git لنظام Windows (ملف `TEST_ELKAROOZ.bat` المشار إليه داخل `RUN_ELKAROOZ.bat` غير موجود). |
| `.env.example` | عقد أسماء متغيرات البيئة للواجهة والخادم الخلفي دون قيم سرية حية. |

---

## 4. معمارية الواجهة الأمامية

### التقنية والإعداد

- `frontend/package.json`: Next.js `14.2.35`, React `18.3.1`, TypeScript `5.7.3`، Supabase JS و`@supabase/ssr`، React Query، Tailwind، Vitest، Testing Library، Zod، `dompurify` (`^3.4.17`)، و`exceljs` (`^4.4.0`).
- `frontend/tsconfig.json`: TypeScript strict وalias `@/*` إلى `src/*`.
- `frontend/src/app/layout.tsx`: `lang="ar"`, `dir="rtl"`، metadata عربية، manifest وPWA، وتسجيل `/sw.js` عند تحميل الصفحة.
- `frontend/src/context/ThemeContext.tsx`: أربعة أوضاع عرض هي `light`, `dark`, `luxury`, `system`، وخمسة ألوان تمييز هي `gold`, `burgundy`, `navy`, `emerald`, `amethyst`، مع حفظ الخيار في `localStorage` تحت `elkarooz-theme` و`elkarooz-accent`.
- `frontend/src/app/providers.tsx`: React Query `staleTime=60s` و`refetchOnWindowFocus=false`، مع ThemeProvider. وجود React Query لا يعني أن كل استعلامات الصفحات تستخدمه.
- ملفات PWA: `frontend/public/manifest.json` و`frontend/public/sw.js`.

### خريطة الصفحات ومسارات الـ API (27 صفحة + 3 مسارات API)

المسارات أدناه مطابقة لملفات `frontend/src/app/**/page.tsx` و`route.ts`:

| المسار | الدور الوظيفي للصفحة / المسار | المصدر |
|---|---|---|
| `/` | الموجز الاجتماعي؛ منشورات وتعليقات وتفاعلات وإشعارات وملخصات المجموعات. | `src/app/page.tsx` |
| `/login` | تسجيل الدخول؛ اسم المستخدم يُحوّل إلى بريد اصطناعي بصيغة نطاق التطبيق ثم يستعمل Supabase Auth. | `src/app/login/page.tsx` |
| `/about` | تعريف بالمدرسة؛ مسار عام. | `src/app/about/page.tsx` |
| `/presentation` | العرض التعريفي التفاعلي للمدرسة؛ مسار عام. | `src/app/presentation/page.tsx` |
| `/bible` | الموسوعة والكتاب المقدس، السفر والإصحاح والبحث وشروح الكلمات؛ مسار عام. | `src/app/bible/page.tsx` |
| `/bible/section/[code]` | استعراض مقالات وفهارس قسم من أقسام الموسوعة العشرة؛ مسار عام. | `src/app/bible/section/[code]/page.tsx` |
| `/bible/reader/[id]` | قارئ المقالات والتفاسير الكتابية؛ مسار عام. | `src/app/bible/reader/[id]/page.tsx` |
| `/books` | الكتب والأبحاث والتصنيفات والبحث والقارئ والمفضلة وإضافة المحتوى بحسب الصلاحيات. | `src/app/books/page.tsx` |
| `/research` | تحويل إلى `/books` أو عرض الأبحاث. | `src/app/research/page.tsx` |
| `/favorites` | تحويل إلى `/books` (تبويب المفضلة). | `src/app/favorites/page.tsx` |
| `/curriculum` | مناهج ومحاضرات وملفات المجموعة. | `src/app/curriculum/page.tsx` |
| `/mp3` | مكتبة ومشغل تسجيلات صوتية. | `src/app/mp3/page.tsx` |
| `/gallery` | ألبومات وصور وعرض صورة موسع. | `src/app/gallery/page.tsx` |
| `/notifications` | صفحة إشعارات المستخدم وتنبيهاته. | `src/app/notifications/page.tsx` |
| `/settings` | إعدادات الحساب، المظهر، إدارة أدوار النظام، وبوابة إعادة ضبط النظام للمسؤول. | `src/app/settings/page.tsx` |
| `/marathon` | قائمة الماراثونات وحالة المتدرب. | `src/app/marathon/page.tsx` |
| `/marathon/[id]` | أداء الماراثون وحفظ الإجابات والتقدم. | `src/app/marathon/[id]/page.tsx` |
| `/marathon/manage` | إنشاء وإدارة الماراثونات والأسئلة ومراجعة الإجابات. | `src/app/marathon/manage/page.tsx` |
| `/attendance` | إدارة الجلسات والحضور للأدوار المخولة. | `src/app/attendance/page.tsx` |
| `/exams` | عرض الدرجات أو إدخالها للأدوار المخولة. | `src/app/exams/page.tsx` |
| `/trainees` | دليل المتدربين وإدارة حالتهم ومجموعاتهم. | `src/app/trainees/page.tsx` |
| `/groups` | لوحة المجموعات أو تحويل المستخدم إلى مجموعته. | `src/app/groups/page.tsx` |
| `/groups/[id]` | تفاصيل المجموعة: الخدام والسكرتارية والمتدربون والحضور والمناهج وتقارير المجموعة. | `src/app/groups/[id]/page.tsx` |
| `/admin/audit` | سجل التدقيق والمراقبة الأمنية لمدير النظام. | `src/app/admin/audit/page.tsx` |
| `/admin/backups` | إنشاء/قائمة/حذف النسخ وواجهة الاستعادة. | `src/app/admin/backups/page.tsx` |
| `/admin/imports` | استيراد وتصدير جماعي للمتدربين ومعاينة/تحقق. | `src/app/admin/imports/page.tsx` |
| `/admin/notifications` | إدارة قوالب الإشعارات والآيات وإرسالها. | `src/app/admin/notifications/page.tsx` |
| `GET /api/health` | مسار فحص صحة خادم الواجهة. | `src/app/api/health/route.ts` |
| `POST /api/system-reset/preview` | بوابة معاينة إعادة ضبط النظام وتوليد رمز التأكيد الزمني `HMAC-SHA256`. | `src/app/api/system-reset/preview/route.ts` |
| `POST /api/system-reset/execute` | بوابة تنفيذ إعادة ضبط النظام بعد التحقق من الرمز الزمني وكلمة مرور المدير. | `src/app/api/system-reset/execute/route.ts` |

### عناصر مشتركة ومكتبات

- `GroupSelector.tsx`: اختيار المجموعة.
- `GroupDashboardCards.tsx`: بطاقات ملخص المجموعة.
- `NotificationCenter.tsx`: مركز الإشعارات واشتراك Realtime.
- `TraineeProfileDrawer.tsx`, `ServantProfileDrawer.tsx`: لوحات ملفات شخصية.
- `src/lib/supabase/client.ts`: عميل browser؛ يتم إنشاؤه عند الحاجة لتجنب إنشائه أثناء prerender.
- `src/lib/supabase/server.ts`: عميل server مربوط بالـcookies.
- `src/lib/supabase/middleware.ts`: تحديث الجلسة وفحص المسار والدور.
- `src/lib/auth/routeAccess.ts`: مصفوفة role gating ومساراتها.
- `src/lib/api/php.ts`: بوابة PHP الوحيدة المفترض استخدامها من الواجهة؛ ترسل session JWT وتحوّل الفشل إلى `PhpApiError`.
- `src/lib/errors/db.ts`: تحويل أخطاء PostgreSQL/RLS إلى رسائل مناسبة.
- `src/types/database.ts`, `src/types/supabase.ts`: أنواع نطاقية وأنواع Supabase.

### الدخول وتوجيه الصفحات

التسلسل في `frontend/src/middleware.ts` ثم `src/lib/supabase/middleware.ts`:

1. يستثني matcher ملفات Next الثابتة والصور وبعض الامتدادات.
2. المسارات العامة في الدالة `isPublicPath`: `/login`, `/bible`, `/about`, `/presentation`, `/api/health`, `/storage/bible-dataset`, `/icons...`, `/manifest.json`, `/sw.js`, `/logo.png`.
3. عند غياب `NEXT_PUBLIC_SUPABASE_URL` أو `NEXT_PUBLIC_SUPABASE_ANON_KEY`: يسمح للمسار العام ويحوّل غير العام إلى `/login`.
4. وإلا ينشئ `createServerClient` مع cookies ويطلب `auth.getUser()`؛ الزائر للمسار المحمي يذهب إلى `/login`.
5. للمستخدم المصادق، يطلب `auth.getClaims()` ويقرأ الدور **حصرياً** من `app_metadata.role` (ويتجاهل `user_metadata` تماماً لمنع التصعيد الذاتي) ثم يستدعي `canAccessPath`.
6. `routeAccess.ts` يقيّد `/admin` بـ `['admin']`، ويقيّد `/trainees`, `/marathon/manage`, `/attendance`, `/exams` بـ `['admin', 'supervisor', 'secretariat', 'servant']`. أي مسار غير مدرج لا يفرض هذه الدالة عليه دورًا خاصًا (`requiredRolesFor` ترجع `null`).
7. إذا كان الدخول إلى `/login` والمستخدم مسجلًا بالفعل، يُحوّل إلى `/`.

هذه بوابة واجهة، وليست بديلًا عن RLS أو تفويض PHP. الدور المعروض أو إخفاء زر ليس حماية لقاعدة البيانات. في المقابل، صفحة `/marathon/manage` تقبل دور `servant` أو `secretariat` على مستوى المسار العام بغض النظر عن امتلاك `MANAGE_MARATHON`؛ يجب فحص التفويض الفعلي لكل RPC/كتابة وعدم اعتبار gate كافيًا.

---

## 5. واجهة PHP API

### مدخل الطلب وترتيب الحماية

`backend-api/public/index.php` هو Front Controller:

1. يكتشف جذر التطبيق في layout المستودع أو layout المسطح للاستضافة.
2. يحمل Composer ثم ملفات الأصناف المطلوبة.
3. يشغّل `CorsMiddleware::handle()`؛ طلب `OPTIONS` ينتهي بـ204.
4. يستخرج المسار من URI، يحذف prefix `/api` ثم يوزع `method + path` عبر شروط `if/elseif`.
5. المسارات المحدودة تمر على `RateLimitMiddleware::check()` قبل الكنترولر.
6. الكنترولر ينفذ `JwtAuthMiddleware::authenticate()` ثم `RbacMiddleware` حسب الإجراء؛ upload يضيف نطاق المجموعة وفحص الملف.
7. `Response` يبني envelope موحدًا؛ الاستثناء العام يُسجل داخليًا ويرجع خطأ 500 مع correlation reference بدل مسار/stack trace.

الترتيب ليس pipeline موحدًا: بعض التحقق داخل الكنترولر. CORS allowlist وإعداد البيئة في `backend-api/config/app.php`؛ حدود MIME/الحجم وجذر القرص في `config/storage.php`.

### قائمة المسارات

حدود الطلب/الحقول أدناه مرصودة من `public/index.php` وControllers؛ يجب اعتبار الأنواع والـJSON الفعلي هو العقد النهائي عند تغيير الكود.

| Method + path | العملية | المصادقة والتفويض | Rate limit |
|---|---|---|---|
| `GET /` و `GET /health` | صحة خدمة PHP وإصدارها | عام | غير مقيد |
| `GET /auth/verify` | التحقق من جلسة المستخدم والملف الحي من `profiles` | JWT | 30 لكل 60 ثانية، bucket `auth` |
| `POST /storage/upload` | رفع ملف إلى مسار مسموح (محلي أو Google Drive) | JWT؛ `admin, supervisor, servant, secretariat` مع group scope وفحص الملف | 20 لكل 60 ثانية، `upload` |
| `POST /storage/delete` | حذف ملف من مساحة التخزين | JWT و`admin` فقط (`requireSystemAdmin`) | 20/60 ثانية، `upload` |
| `GET /storage/file/{id}` | بث ملف أو جلبه مع دعم `206 Partial Content` | عام/موقّع حسب الأصل | 120/60 ثانية، `storage_stream` |
| `POST /backup/create` | إنشاء ZIP مشفر بـ AES-256 ونسخ metadata | JWT و`admin` فقط؛ `encryption_password`, `storage_option` | 5/300 ثانية، `backup` |
| `GET /backup/list` | قراءة سجل النسخ | JWT و`admin` فقط | 60/60 ثانية، `backup` |
| `POST /backup/validate-zip` | فحص أرشيف قبل اعتماده | JWT و`admin` فقط؛ multipart `backup_zip`, `encryption_password` | 10/60 ثانية، `backup` |
| `POST /backup/delete` | soft-delete للسجل وحذف ملف الـ ZIP | JWT و`admin` فقط؛ `backup_id` | 30/60 ثانية، `backup` |
| `POST /restore/preview` | فك وفحص وعرض ملخص دون تغيير البيانات | JWT و`admin` فقط؛ multipart ZIP وكلمة المرور | 10/300 ثانية، `restore` |
| `POST /restore/execute` | تنفيذ الاستعادة الذرية | JWT و`admin` فقط؛ `restore_mode`, `confirm_restore=YES`, اختياريًا `truncate_mode=MERGE\|TRUNCATE` | 2/600 ثانية، `restore` |
| `POST /import/trainees` | استيراد متدربين (CSV/XLSX) والتحقق التجريبي | JWT و`admin` فقط؛ ملف `file`, و`dry_run` | 10/300 ثانية، `import` |
| `GET /import/history` | سجل الاستيراد؛ `limit` بين 1 و200 | JWT و`admin` فقط | 60/60 ثانية، `import` |
| `GET /export/data` | تصدير كيان حسب `entity`/`format`/`group_id` | JWT و`admin` فقط | 5/300 ثانية، `export` |
| `POST /system-reset/preview` | معاينة نطاق reset وإظهار run قابلة للاستئناف بلا حذف | JWT؛ `admin` نشط من قاعدة البيانات و`auth_time` حديث | 10 لكل 60 ثانية، `system_reset` |
| `POST /system-reset/execute` | تنفيذ/استئناف reset متعدد المراحل بعد تأكيد ونسخة حديثة متحققة | JWT؛ `admin` نشط، `auth_time` حديث، عبارة التأكيد، backup ZIP/SHA-256 صالح | 20 لكل 60 ثانية، `system_reset` |
| `GET /bible/manifest` | بيان حالة وإحصاءات بيانات الموسوعة الكتابية | عام | 120/60 ثانية، `bible` |
| `GET /bible/sections` | الأقسام العشرة الرئيسية للموسوعة | عام | 120/60 ثانية، `bible` |
| `GET /bible/section-articles` | مقالات قسم محدد مع ترقيم الصفحات | عام | 120/60 ثانية، `bible` |
| `GET /bible/tree` | شجرة الأسفار والإصحاحات أو الأقسام الفرعية | عام | 120/60 ثانية، `bible` |
| `GET /bible/article` | جلب نص مقال أو إصحاح أو تفسير كامل | عام | 180/60 ثانية، `bible_article` |
| `GET /bible/search` | البحث النصي في آيات وتفاسير ومقالات الموسوعة | عام | 120/60 ثانية، `bible_search` |
| `GET /bible/stats` | إحصاءات شاملة للموسوعة والأقسام | عام | 120/60 ثانية، `bible` |

المسارات المجهولة ترجع `404 ROUTE_NOT_FOUND`. `public/.htaccess` يعيد المسارات إلى index ويمنع بعض verbs/الملفات الحساسة. ملف `public/htaccess_root.template` مهم في نشر flattened لحماية ملفات التطبيق خارج public root (راجع `BE-03` في تقرير المراجعة لتعزيز حظر الملفات غير البرمجية في المجلدات الفرعية).

### ملفات الطبقات الخلفية

**Controllers:**

- `AuthController.php`: التحقق من الجلسة/الملف.
- `StorageController.php`: رفع وحذف وبث الملفات (`upload`, `delete`, `serveFile`).
- `BackupController.php`: إنشاء/قراءة/فحص/حذف النسخ.
- `RestoreController.php`: preview وexecute.
- `ImportController.php`: استيراد المتدربين وسجل الاستيراد.
- `ExportController.php`: تصدير البيانات.
- `SystemResetController.php`: معاينة وإعادة ضبط إدارية متعددة المراحل قابلة للاستئناف.
- `BibleController.php`: مسارات الموسوعة الكتابية السبعة (`/bible/*`).
- `SafeFailure.php`: تسجيل التفاصيل داخليًا وإخفاؤها عن العميل مع مرجع الخطأ.

**Middleware:** `CorsMiddleware`, `JwtAuthMiddleware`, `RbacMiddleware`, `GroupScopeMiddleware`, `FileSecurityMiddleware`, `RateLimitMiddleware`, و`ResetAccessGate` (بوابة وصول أثناء reset).

**Services:** `SupabaseClient`, `StorageBridgeService`, `GoogleDriveService`, `GoogleAppsScriptBridgeService`, `BibleDataService`, `BibleEncyclopediaService`, `AuditLogService`, `ZipEncryptionService`, `ArchiveExtractor`, `BackupArchiveInspector`, `DatabaseExportService`, `DatabaseRestoreService`, `AtomicRestoreService`, `ExcelParserService`, `SpreadsheetWriter`, `LectureAnnouncementService`, و`SystemResetStorageService`/`SupabaseAuthAdminClient` لخطة reset.

**ملاحظات العقد:** `SupabaseClient::query()` و`rpc()` يعيدان envelope داخليًا من الشكل `['status' => HTTP status, 'data' => decoded response]`. أي مستهلك RPC يجب أن يقرأ النتيجة من `data` لا أن يفترض أن حقول PostgreSQL على المستوى الأعلى (راجع `BE-01`).

### المصادقة في PHP

- `JwtAuthMiddleware` يبحث عن Authorization في `HTTP_AUTHORIZATION` و`HTTP_X_AUTHORIZATION` ومتغيرات الخادم.
- يفرض `Bearer <token>`، ويدعم الخوارزميات `HS256` (باستخدام `SUPABASE_JWT_SECRET`) وكذلك `RS256` و`ES256` عبر جلب مفاتيح JWKS من `/auth/v1/.well-known/jwks.json`.
- يستعلم حياً في كل طلب (`fetchLiveProfile`) عن جدول `profiles` عبر `serviceRoleKey` للتحقق من أن الحساب نشط (`is_active = true`, `deleted_at IS NULL`) وجلب أحدث `role_id` و`group_id`، كما يتحقق من طابع القطع الزمني `storage/system_reset/auth-cutoff.json`.
- `RbacMiddleware::requireSystemAdmin()` يسمح فقط بدور `admin` في العمليات السيادية.
- `config/supabase.php` يفشل مغلقًا إذا غاب أي من `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.

---

## 6. قاعدة البيانات وSupabase

### جرد الجداول

جرد Supabase للقراءة فقط بتاريخ **21 أكتوبر 2026** أعاد **55 جدولًا** في `public`. أما نص migrations المحلية فيحتوي 54 اسمًا فريدًا لـ`CREATE TABLE`؛ المجموعتان ليستا متطابقتين تمامًا، فلا يُستنتج من العدد أن ملفات migrations تمثل المخطط الحي كاملًا. تشمل قاعدة البيانات جداول Bible والمناهج والمراجعات و`media_assets` وبيانات التشغيل، إضافةً إلى جداول reset جديدة محلية لم تُطبق بعد.

| المجال | الجداول الحالية في جرد Supabase |
|---|---|
| الهوية والصلاحيات | `roles`, `groups`, `profiles`, `permissions`, `servant_permissions`, `group_secretariat` |
| الدراسة والمناهج | `terms`, `lecturers`, `lectures`, `curriculums`, `curriculum_days`, `curriculum_entries`, `curriculum_revisions` |
| الحضور والامتحانات | `attendance_sessions`, `attendance_records`, `exams`, `exam_grades` |
| الماراثون | `marathons`, `marathon_sections`, `marathon_questions`, `marathon_question_revisions`, `marathon_answers`, `marathon_trainee_submissions`, `marathon_trainee_answers` |
| المجتمع | `feed_posts`, `post_comments`, `post_images`, `reactions` |
| الإشعارات | `notification_templates`, `notifications`, `push_subscriptions`, `daily_verses`, `daily_verse_dispatch_state` |
| الكتب والوسائط | `categories`, `books`, `researches`, `gallery_albums`, `gallery_items`, `mp3_tracks`, `media_assets`, `user_favorites` |
| الكتاب المقدس | `bible_testaments`, `bible_books`, `bible_chapters`, `bible_verses`, `bible_verse_words`, `bible_sources`, `bible_commentaries`, `bible_word_commentaries`, `bible_dictionary_entries`, `word_dictionary_mappings`, `bible_content_versions` |
| التشغيل والتدقيق | `audit_logs`, `backup_records`, `import_history` |

مفعّل RLS في migrations المحلية على جداول baseline السابقة. لم يُجرَ تدقيق شامل حديث لكل سياسات RLS والمنح على الجداول الـ55؛ لكن استعلام catalog للقراءة فقط على عمليات الكتابة في نطاق reset (36 جدولًا) أعاد السياسات الموجودة موجهة إلى `authenticated` فقط، دون استهداف `anon` أو `public`. migration الجديدة تضيف سياسات تقييدية للـwrite على هذا النطاق عند وجود reset مفتوح؛ راجع [الخطة الآمنة](SAFE_SYSTEM_RESET_PLAN.md) للاختبارات المتبقية.

**العلاقات الرئيسية المرصودة:** `profiles.id` مرتبط بـ`auth.users`; المستخدم يرتبط بدور ومجموعة. الصلاحية المفوضة تربط profile بـpermission. الدراسة مرتبطة بالمجموعات والفصول والمحاضرات والمناهج والامتحانات والماراثونات. الحضور يربط جلسة/مجموعة بمتدرب. درجات الامتحان تربط الامتحان بالمتدرب. الماراثون يضم أقسامًا وأسئلة وإجابات ثم submissions وإجابات المتدرب. الكتاب المقدس يتدرج من testament إلى book ثم chapter وverse وword مع مصادر وشروحات.

بعض العلاقات polymorphic وليست مفاتيح أجنبية مباشرة، مثل `reactions.target_type/target_id` و`user_favorites.item_type/item_id`. يجب فحص DDL لكل جدول قبل الاعتماد على التكامل المرجعي أو الحذف المتسلسل.

### سياسات RLS ومجموعة الدوال

`015_rls_policies.sql` يفعّل RLS صراحةً على الجداول الـ46. يعرّف دوال مساعدة مثل:

- `get_current_user_role()` و`get_current_user_group()`.
- `is_admin_or_super_user()`.
- `has_servant_permission(perm_id)`.
- `is_secretariat_of_group(target_group)`.

السياسات توزع القراءة العامة للكتاب المقدس وبعض lookup tables، وتقيّد بيانات المدرسة إلى المستخدم أو المجموعة أو الدور/الصلاحية. سياسات المجتمع تمنع المتدرب من إنشاء منشور؛ الإشعارات مقيدة بالمستلم؛ أدوات النسخ/الاستيراد/التدقيق إدارية.

**نقطتان تستحقان مراجعة مباشرة على DB:**

1. `servant_permissions` و`marathon_sections` مفعّل عليهما RLS في `015`، ولم يظهر `CREATE POLICY ON public.<table>` لهما في ملفات migrations الـ28 المفحوصة. افتراضيًا يعني هذا منع الوصول المباشر لأدوار Postgres المقيدة؛ تحقّق هل هذا مقصود أو أن الـRPCs هي المدخل الوحيد.
2. الجداول الفرعية/متعددة الأنواع ذات scope مكرر أو polymorphic قد تحتاج invariants داخل SQL/RPC، لا في واجهة المستخدم فقط.

### Functions وTriggers

العدّ النصي للمigrations وجد 22 تعريفًا مميزًا للدوال التالية:

`check_secretariat_group_limit`, `compute_exam_appreciation`, `export_manifest`, `export_table`, `get_current_user_group`, `get_current_user_role`, `get_group_operational_summary`, `get_group_secretariat_detailed`, `get_group_servants_detailed`, `get_trainee_attendance_summary`, `get_trainee_full_profile`, `guard_profile_privilege_columns`, `has_servant_permission`, `is_admin_or_super_user`, `is_secretariat_of_group`, `rebalance_marathon_question_weights`, `restore_accounts`, `restore_database`, `restore_table`, `sync_profile_app_metadata`, `touch_updated_at`, `update_post_counts`.

المشغلات الـ20 المعرفة في migrations تشمل: حد السكرتارية، تقدير الامتحان، إعادة توزيع أوزان أسئلة الماراثون، تحديث `updated_at`، عدادات التعليقات والتفاعلات، حماية أعمدة صلاحيات الملف، ومزامنة metadata عند تحديث profile.

هذه الأسماء مستخرجة من المصدر، لا من `pg_proc` على الإنتاج. كما أن **15 اسم RPC ظهر في استدعاءات الكود ولم يظهر له تعريف باسم مطابق في migrations المفحوصة**: `dispatch_daily_verse_notification`, `get_chapter_verses_with_words`, `get_post_reactors`, `get_trainee_marathon_state`, `get_word_details`, `import_trainees_bulk_atomic`, `log_operational_event`, `reopen_marathon_question`, `restore_deleted_post`, `search_bible_content`, `soft_delete_comment`, `soft_delete_post`, `submit_marathon_answer`, `toggle_post_reaction`, `trigger_birthday_notifications`. قد تكون معرفة في قاعدة حية أو مصدر آخر؛ هذه **فجوة reproducibility** وليست برهانًا أن الدوال غير موجودة في الإنتاج.

### ملفات migrations (49 ملف SQL محلي)

يوجد في `supabase/migrations/` **49 ملف `.sql`**: 16 ملف تأسيسي (`001` إلى `016`) و33 ملف تعزيز أمني وتشغيلي وميزات لاحقة (`20260930095254` إلى `20261029173000`).  
> **ملاحظة حرجة (`DB-01`):** توجد فجوة تاريخية لـ 35 ملف ترحيل وسيط (`017` إلى `052`) مسجلة في `supabase/schema_live_snapshot.sql:1989-2023` ولكنها غير موجودة في مجلد `supabase/migrations/`، مما يستلزم إنشاء ملف ترحيل جسري تعويضي قبل بناء أي قاعدة بيانات جديدة من الصفر.

المجموعة التأسيسية (`001`–`016`):

```text
001_extensions.sql
002_core_roles_groups.sql
003_profiles_auth_mapping.sql
004_permissions_secretariat.sql
005_academic_terms_lectures.sql
006_attendance.sql
007_exams_grades.sql
008_marathons.sql
009_feed_social.sql
010_notifications_verses.sql
011_library_media.sql
012_bible_local.sql
013_audit_backup_import.sql
014_indexes_functions_triggers.sql
015_rls_policies.sql
016_seed_data.sql
```

ملفات التصلب الأمني والتشغيل والميزات اللاحقة (`33` ملفًا):

```text
20260930095254_add_group_id_to_gallery_albums_and_items.sql
20260930120000_revoke_anon_security_definer.sql
20260930140000_close_self_escalation.sql
20260930150000_rpc_group_scope_guards.sql
20260930200000_pastoral_template_admin_only.sql
20261001120000_fix_null_propagation_fail_open_authz.sql
20261001130000_backfill_app_metadata_from_profiles.sql
20261001140000_drop_create_test_user.sql
20261001150000_sync_profile_app_metadata.sql
20261001160000_logical_export_rpcs.sql
20261001170000_logical_restore_rpcs.sql
20261001_revoke_anon_execute_on_group_rpcs.sql
20261002_revoke_public_execute_on_data_reading_rpcs.sql
20261004120000_create_media_assets.sql
20261004141649_phase0_post_image_and_reactor_visibility.sql
20261004202345_harden_marathon_and_audit_rpcs.sql
20261006120000_create_trainee_profile_rpc.sql
20261010001000_close_marathon_grade_and_feed_impersonation.sql
20261011_110000_marathon_schema_and_rls_fix.sql
20261011_110100_marathon_player_and_grading_rpcs.sql
20261011_110200_lecture_Completion_and_pastoral_rpcs.sql
20261011_110300_username_to_email_rpc.sql
20261012_000000_database_and_rls_security_hardening.sql
20261014_curriculum_days_and_entries.sql
20261016000000_servant_pastoral_profile_fields.sql
20261021170000_safe_system_reset.sql
20261023180000_system_admin_and_general_secretariat.sql
20261024100000_attendance_thursday_freeze.sql
20261024110000_create_servant_profile_rpc.sql
20261025120000_audit_logs_and_rls_fixes.sql
20261027150000_co_system_administrators.sql
20261029170000_replace_servant_permissions.sql
20261029173000_update_servant_profile_and_permissions.sql
```

### Seed data

`016_seed_data.sql` يزرع الأدوار، 3 مجموعات، الصلاحيات المفوضة، 3 قوالب إشعار (`PASTORAL`, `BIRTHDAY`, `SYSTEM`)، العهدين، مصدر Bible واحد، وصفًا واحدًا لحالة الآية اليومية.

---

## 7. تتبع تدفقات البيانات المهمة

### تسجيل الدخول والتحقق من الجلسة — مرصود من المصدر

`/login` → Supabase Auth `signInWithPassword` باسم المستخدم بعد توليد synthetic email → جلسة Supabase/cookies → middleware `getUser()` → `getClaims()` موثّق للدور من `app_metadata.role` → `canAccessPath()` عند المسارات المقيدة. بيانات الصفحات تظل محمية فعليًا بسياسات RLS وقيود RPC، لا بمجرد المسار.

### استعلامات الصفحات — نمط عام مرصود

الصفحات تستورد عميل Supabase browser وتقرأ/تكتب عبر PostgREST أو RPC مباشرةً. لذلك يجب تتبع كل handler من الصفحة إلى اسم الجدول/RPC ثم سياسة RLS المقابلة. وجود `php.ts` لا يعني أن كل العمليات تمر عبر PHP.

### النسخ الاحتياطي والاستعادة — حالة العقد الحالي (مراجعة 2026-10-31)

المسار المقصود: `/admin/backups` → `phpApi('/backup/create')` مع JWT المستخدم → PHP ينشئ ZIP ويصدر البيانات → يحفظ الملف/metadata → يعرض النتيجة؛ الاستعادة ترفع الملف إلى `/restore/preview` أو `/restore/execute` مع تأكيد ونمط محدد.

- **ما تم إصلاحه سابقًا:**
  1. يكتب `DatabaseExportService.php:248-261` كلاً من `database/<table>.json` والملف الموحد `database/database.json`، وتقرأ `DatabaseRestoreService.php:131-181` كليهما.
  2. تم إصلاح متغير `$backupRoot` في `BackupController::delete()` (`السطر 385-403`).
- **نقاط مانعة ما زالت قائمة (موثقة في `BE-01` و`BE-04` و`DB-04`):**
  1. `SupabaseClient::rpc()` يعيد `['status' => $httpCode, 'data' => $decoded]`. بينما يقرأ `DatabaseExportService::listTables()` و`exportToDirectory()` و`DatabaseRestoreService::restore()` حقول النتيجة (`tables`, `rows`, `tables_restored`) من المستوى الأعلى مباشرةً دون فك `$result['data']` (`BE-01`).
  2. في SQL (`20261001170000_logical_restore_rpcs.sql:160`)، تحول `restore_table` المعرّف قسريًا إلى `$1::uuid` مما يفشل في وضع `MERGE` مع الجداول ذات المفاتيح النصية أو الرقمية، كما تشترط `system_reset_guarded_restore_database` وجود مدير نظام واحد فقط (`count(*) = 1`) مما يتعارض مع ميزة المدير المشارك `co-admin` (`DB-04`).

### الاستيراد — مساران (واجهة مباشرة وبوابة PHP)

- الواجهة `/admin/imports` تحلل CSV وتستدعي RPC في Supabase مباشرةً (راجع `FP-10` بخصوص محلل CSV البسيط `split(',')`).
- PHP يوفّر `POST /import/trainees` ويفحص الامتداد في `ImportController.php:29-31` ليستدعي `ExcelParserService::parseXlsx()` لملفات `.xlsx` و`parseCsv()` لملفات `.csv` (راجع `BE-09` بخصوص UTF-8 BOM في `parseCsv`).

### الإشعارات والـRealtime

`NotificationCenter` وصفحة الموجز يشتركان في Realtime من Supabase `postgres_changes` على بيانات الإشعار/الموجز. المخطط يضم `notifications`, `push_subscriptions`, `notification_templates`, `daily_verses`, `daily_verse_dispatch_state`.

### الملفات وجسر التخزين (`StorageController` + `StorageBridgeService`)

يدعم `StorageBridgeService` الحفظ المحلي على قرص الخادم والربط مع Google Drive عبر `GoogleDriveService` و`GoogleAppsScriptBridgeService` مع تسجيل الأصول في جدول `media_assets` (راجع `BE-07` و`BE-08` و`BE-11` في تقرير المراجعة).

---

## 8. الأمن والتشغيل — ملخص نتائج مراجعة 31 أكتوبر 2026

### الضوابط المفعّلة في المصدر

- RLS مفعّل على جداول المخطط العام مع حواجز منع التصعيد الذاتي (`guard_profile_privilege_columns`) وسحب صلاحيات `anon/PUBLIC` من الدوال الحساسة.
- يدعم `JwtAuthMiddleware` في PHP التحقق من `HS256` و`RS256` و`ES256` (عبر JWKS) ويستعلم حياً في كل طلب عن جدول `profiles` (`is_active`, `deleted_at`, `role_id`, `group_id`).
- تطبيق `DOMPurify.sanitize` على نصوص الموسوعة الكتابية في `bible/page.tsx` و`bible/reader/[id]/page.tsx`.
- حماية مسارات `/api/system-reset/*` بتوقيع `HMAC-SHA256` الزمني والتحقق من كلمة مرور المدير وبوابة الأقفال `ResetAccessGate`.

### أهم المخاطر والفجوات المفتوحة (مرجعها الكامل في [`REVIEW_REPORT.md`](../REVIEW_REPORT.md))

1. **حرج (`BE-01` & `DB-04`) — النسخ الاحتياطي والاستعادة:** عدم فك غلاف `SupabaseClient::rpc()` (`['status', 'data']`) في `DatabaseExportService` و`DatabaseRestoreService`، وفرض `$1::uuid` في `restore_table`، وشرط المدير الوحيد في `system_reset_guarded_restore_database`.
2. **حرج (`BE-02`) — سر JWT في قالب Hostinger:** وضع رابط `jwks.json` العلني كقيمة لـ `SUPABASE_JWT_SECRET` في القالب القديم يسمح بتزوير توكنات `HS256` إذا لم يُستبدل بسر عشوائي خاص.
3. **حرج (`DB-01` & `DB-02` & `DB-03`) — قاعدة البيانات وسياسات RLS:** فجوة الترحيلات الوسيطة (`017`–`052`)، وفحص الدور المعكوس (`v_role` للهدف بدلاً من المستدعي) في `get_trainee_full_profile` و`get_trainee_attendance_summary`، وتضارب سياستي `SELECT` على `public.profiles`.
4. **حرج (`FL-04`) — ذاكرة الموسوعة الكتابية:** عدم تفريغ `memoPromises` في `clearBibleMemoryCache()` يؤدي لتسرب الذاكرة وتعطل `expandTitlePrefix` بعد التفريغ.
5. **عالٍ (`BE-03`, `BE-05`, `BE-06`, `BE-07`) — الخادم الخلفي:** حماية الملفات غير البرمجية في `htaccess_root.template`، ومشاركة مفاتيح `RateLimitMiddleware` بين القراءة والكتابة، ومانع `GOOGLE_APPS_SCRIPT_URL` و`storage/logs` في `SystemResetController`، واتساع نطاق `POST /storage/delete`.
6. **عالٍ (`FL-01`, `FL-02`, `FL-03`, `FL-05`, `FL-06`, `FL-07`, `FP-01`..`FP-05`) — الواجهة الأمامية:** تعطيل الكاميرا بسبب `Permissions-Policy: camera=()` في `next.config.mjs:80`، وثغرة التوجيه `/\evil.com`، وحقن فلاتر البحث في `GlobalSearchModal`، واسم جدول الحضور في `UnifiedProfileModal`، ومشاكل عرض وتسليم الماراثون والمعرض.

---

## 9. المتغيرات والأوامر

### أسماء البيئة المرصودة

لا تُدرج قيمًا سرية في هذا الملف. العقد الذي يحتاجه الكود يتضمن:

- Frontend/Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Frontend/PHP: `NEXT_PUBLIC_PHP_API_URL`.
- PHP/Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.
- PHP/runtime: `APP_ENV`, `APP_DEBUG`, `APP_URL`, `STORAGE_PUBLIC_URL`؛ راجع `backend-api/config/*.php` و`.env.example` لمعرفة القائمة الدقيقة بحسب البيئة.

بعض الأدلة القديمة تشير إلى `NEXT_PUBLIC_BACKEND_API_URL`؛ هذا الاسم لا يطابق بوابة PHP الحالية التي تقرأ `NEXT_PUBLIC_PHP_API_URL` من `frontend/src/lib/api/php.ts`.

### أوامر من manifests

من جذر المشروع:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run verify
```

هذه الأوامر تفوض إلى `frontend` حسب `package.json` الجذر. من `frontend/`:

```bash
npm test
npm run test:watch
```

لتشغيل PHP محليًا بحسب `RUN_ELKAROOZ.bat`، من مجلد `backend-api`:

```bash
php -S localhost:8000 -t public
```

الواجهة المحلية تعمل على المنفذ `3000`. تشغيل API محلي يتطلب PHP والامتدادات والإعدادات المطلوبة في config؛ إذا لم يوجد PHP launcher يتوقع الاتصال بالـAPI المستضاف. لا ترفع مفاتيح الخدمة إلى متغير `NEXT_PUBLIC_*`.

### النشر

- Vercel يوجه الإعداد إلى Next.js داخل `frontend/` عبر `vercel.json`.
- PHP يُنشر منفصلًا كما يصف `docs/PRODUCTION_DEPLOYMENT.md`، مع اختلاف أن `public/index.php` الحالي يدعم repo layout وflattened layout.
- Supabase يحتاج تطبيق migrations وضبط Auth/RLS/RPC grants منفصلًا. لا توجد من المصدر هنا خطوة CI تنشر migrations تلقائيًا.
- أسماء URLs المسجلة في بعض الوثائق هي معلومات تاريخية حتى يتم فحصها مباشرة؛ لا تعتمد عليها بوصفها endpoints حية.

---

## 10. الاختبارات وما الذي تثبته (تحديث 31 أكتوبر 2026)

### Frontend (`frontend/tests/` — 23 ملف اختبار، 219 اختبارًا)

تغطي ملفات الاختبار الـ 23 في `frontend/tests/` الجوانب التالية:
- `phpApi.test.ts` (24 اختبارًا): عقد بوابة PHP API وحالات الخطأ والمهلة الزمنية.
- `serviceWorker.test.ts` (24 اختبارًا) و`manifest.test.ts` (10 اختبارات): أمان كاش PWA وبيان التطبيق.
- `routeAccess.test.ts` (16 اختبارًا) و`navigation.test.ts` (9 اختبارات) و`nav-bar.test.tsx` (14 اختبارًا): مصفوفة صلاحيات المسارات والتنقل.
- `mobile-readiness.test.ts` (15 اختبارًا): خدمات الجوال والبدائل الآمنة للويب.
- `dbErrors.test.ts` (15 اختبارًا): تعريب أخطاء PostgreSQL/RLS.
- `user-journeys.test.tsx` (13 اختبارًا): مسارات المستخدم الأساسية.
- `audit-page.test.ts` (12 اختبارًا): فلترة وتعقيم صفحة سجل التدقيق.
- `GroupSelector.test.tsx` (11 اختبارًا): اختيار الفرقة الدراسية.
- `bible-resolution.test.ts` (9 اختبارات)، `prefix-expansion.test.ts` (9 اختبارات)، `search-ranking.test.ts` (6 اختبارات)، `encyclopedia-navigation-regression.test.ts` (4 اختبارات)، `TenSectionSelector.test.tsx` (1 اختبار)، `encyclopedia-sections.test.ts` (1 اختبار): الموسوعة الكتابية والبحث.
- `prepareAvatar.test.ts` (6 اختبارات)، `login-lockout.test.ts` (6 اختبارات)، `ui-ux-architecture.test.ts` (5 اختبارات)، `curriculum-display.test.ts` (4 اختبارات)، `curriculum-access.test.ts` (3 اختبارات)، `storage.test.ts` (2 اختبار).

**نتائج الأمر المنفذ (`2026-10-31`):** `npx.cmd tsc --noEmit` ناجح (`0` أخطاء)؛ `npx.cmd vitest run` نجح بالكامل: **`23 passed (23)`، `219 passed (219)`**. `npx.cmd next lint` نجح مع 19 تحذيرًا (`react-hooks/exhaustive-deps` و`no-img-element`). راجع `FL-14` في [تقرير المراجعة الشاملة](../REVIEW_REPORT.md) بخصوص بعض الاختبارات التي تختبر دوال محلية بدلاً من استيراد وحدات التطبيق مباشرةً.

### Backend (`backend-api/tests/` — 10 ملفات اختبار) و`scripts/`

- يحتوي مجلد `backend-api/tests/` على 10 ملفات اختبار (`verify_auth_admin_delete.php`, `verify_google_drive_delete_status.php`, `verify_reset_access_gate.php`, `verify_reset_database_concurrency.php`, `verify_reset_request_barrier.php`, `verify_reset_write_freeze.sql`, `verify_reset_write_freeze_contract.php`, `verify_system_reset_contract.php`, `verify_system_reset_storage.php`, `verify_system_role_management_contract.php`).
- يحتوي مجلد `scripts/` على 43 أداة وسكربت تحقق (تنبيه هام في `DB-08`: لا تشغّل سكربتات `verify_phase*.py` مباشرة على قاعدة بيانات الإنتاج لأنها تكتب بيانات اختبارية حية دون تنظيف).

### ما يلزم قبل توقيع إطلاق فعلي

1. تطبيق migrations على بيئة staging نظيفة، ثم مقارنة catalog حي بالجداول والدوال والسياسات grants.
2. تنفيذ role matrix من حسابات فعلية لكل دور ومجموعة، مع محاولة عابرة للمجموعات والـRPC مباشرةً.
3. إجراء backup → inspect → restore على DB وملفات اختبارية، ومقارنة row counts/checksums قبل/بعد، واختبار rollback متعمد.
4. تجربة CSV وXLSX كبير/معطوب وdry-run وall-or-nothing.
5. اختبار CORS وJWT ومعدل الطلبات وحماية المسارات على API المنشور.
6. إصلاح/التحقق من YAML CI وتشغيل workflow كامل على clean checkout.

---

## 11. سجل الاختلاف بين الوثائق والمصدر

قبل تعديل مستند قديم، قارن ادعاءه بالكود؛ ظهرت أمثلة ملموسة:

- `README.md` السابق كان يكرر اسم المشروع ولا يشرح تشغيله أو محتوياته.
- `docs/LOCAL_DEVELOPMENT_GUIDE.md` يستخدم `NEXT_PUBLIC_BACKEND_API_URL`، بينما كود PHP يقرأ `NEXT_PUBLIC_PHP_API_URL`.
- `docs/PRODUCTION_DEPLOYMENT.md` يذكر 50 جدولًا؛ جرد migrations الحالي وجد 46 تعريف جدول فريدًا.
- بعض تقارير التدقيق/الخطة القديمة تذكر أسماء tables/RPCs غير ظاهرة في DDL الحالي. استخدم جرد migrations و`pg_catalog` الحي للفصل بين drift في الوثائق وبين objects أنشئت خارج المستودع.
- `docs/DATABASE_IMPLEMENTATION_PLAN.md` لا يغطي كل ملفات hardening المؤرخة اللاحقة لـ`016`.
- `docs/SRS_ELKAROOZ_SCHOOL.md` مصدر متطلبات المجال، لكنه لا يثبت توصيل كل endpoint ولا صحة بيئة النشر الحالية.

### مرجع الملفات ذات الصلة

- المتطلبات: `docs/SRS_ELKAROOZ_SCHOOL.md`.
- التصميم: `docs/TECHNICAL_DESIGN_ELKAROOZ_SCHOOL.md`.
- التشغيل المحلي: `docs/LOCAL_DEVELOPMENT_GUIDE.md`.
- النشر: `docs/PRODUCTION_DEPLOYMENT.md`, `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md`.
- المصادقة والأدوار: `docs/PHASE_3_AUTH_ROLE_REPORT.md`, `docs/FINAL_ROUTE_PERMISSION_MATRIX.md`.
- تدقيق الأمن: `docs/FINAL_SECURITY_AUDIT.md`, `docs/CODE_REVIEW_2026-09-30.md`.
- النسخ والاستعادة: `docs/BACKUP_RESTORE_OPERATION_GUIDE.md`, `docs/PHASE_9_BACKUP_IMPORT_AUDIT_REPORT.md`.
- تقارير المراحل: `docs/PHASE_4...` حتى `docs/PHASE_11...`.

التقارير المرحلة مفيدة لفهم تاريخ العمل، لكنها ليست مصدر الحقيقة إذا تعارضت مع التنفيذ الحالي أو لم يكن معها أمر تحقق قابل لإعادة الإنتاج.

---

## 12. حدود المعرفة والمرحلة التالية

**يمكن الجزم من هذا الفحص:** هيكل التطبيق، صفحات frontend، مسارات PHP المسجلة، أسماء الجداول والدوال في migrations، ونتائج أوامر التحقق المحلي المذكورة. لكن إعادة التحقق بتاريخ 4 أكتوبر 2026 أظهرت أن host الذي أعاده Supabase MCP لا يطابق `frontend/.env.local`. لذلك فكل أعداد migrations ونتائج schema/RPC ونتيجة migration التاريخية تخص مشروع MCP فقط؛ المالك وصفه بأنه staging، لكن لا يمكن تأكيد أنه staging التطبيق أو الجزم بحالة production حتى يؤكد المالك المشروع الصحيح. لم تُجرَ كتابة على قاعدة البيانات في المتابعة الحالية.

**لا يمكن الجزم دون فحص إضافي:** التطابق الكامل بين 69 إصدارًا حيًا و31 ملف migration محليًا، أو تطابق محتوى SQL والسياسات/RPC/grants، وصحة وجود الملفات الفعلية خلف metadata. لم تُفحص إعدادات Vercel أو deployments ولا استضافة PHP مباشرة؛ لم تُختبر بيانات أو endpoints مستخدمين. قراءة schema وحدها لا تثبت إتاحة بايتات الملفات أو عمل التكاملات الحية.

الخطوة التالية هي إكمال reconciliation لـSupabase الحي/local migrations وRLS/RPC/grants، ثم إكمال ربط Vercel وجرد إعداداته للقراءة فقط، والحصول على جرد Hostinger آمن. خطة Google Drive وسجل التنفيذ في `docs/GOOGLE_DRIVE_STORAGE_PLAN.md` و`docs/GOOGLE_DRIVE_PHASE0_AUDIT.md`. أي كتابة أخرى على Supabase/Vercel أو نشر production تبقى خارج النطاق دون موافقة صريحة وبعد اختيار staging.

---

## 13. الخطة المستهدفة: نقل التخزين إلى Google Drive

> **الحالة: وصف المعمارية المستهدفة؛ تكامل Google Drive لم يبدأ. مرحلة 0 ما زالت جزئية؛ migration `20261004141649` موجودة في ledger المشروع المطابق بعد الإذن السابق، لكن تصنيف البيئة staging/production غير محسوم.**

طلب التحول المستهدف هو: Next.js للواجهة، وSupabase Auth/PostgreSQL/RLS للمستخدمين والبيانات وmetadata، وPHP على Hostinger كبوابة ملفات آمنة، وGoogle Drive لتخزين الملفات الخاصة. يبقى الوصف التفصيلي للتنفيذ الحالي في الأقسام السابقة؛ الرسم التالي **هدف مستقبلي** وليس as-built:

```text
Next.js / PWA
  ├── Supabase Auth + PostgreSQL + RLS
  │     └── بيانات النظام + metadata الملفات
  └── Supabase JWT → PHP API على Hostinger → Google Drive خاص
```

### خط الأساس الذي يؤثر في ترتيب العمل

- التخزين المرصود حاليًا محلي في PHP: `StorageBridgeService` يكتب ويحذف من filesystem ويبني URL من `STORAGE_PUBLIC_URL`؛ لم يظهر Google Drive adapter أو `drive_file_id`/`drive_folder_id` في الملفات التي فُحصت (`backend-api/config/storage.php`, `backend-api/src/Services/StorageBridgeService.php`).
- metadata موزعة حاليًا بين `file_url`, `image_url`, `audio_url`, `cover_url`, وحقول JSONB مثل `feed_posts.images_metadata` و`lectures.attachments_metadata`؛ لا تفترض وجود جدول موحد للملفات.
- سياسات الصفوف المحلية التي فُحصت لا تعرّف `group_id` في `gallery_albums` و`gallery_items`. القراءة الحية على المشروع المطابق أظهرت العمودين وسياسات group scope؛ يلزم استكمال normalized DDL reconciliation. قرار المالك أن `group_id IS NULL` يعني محتوى عالميًا. migration `post_images` موجودة في ledger؛ لا يثبت ذلك خصوصية bytes المضيف الخارجي أو تصنيف البيئة.
- `backup_records` و`import_history` يحتفظان بمراجع تخزين Hostinger؛ يجب تحديد سياسة النسخ والاستعادة والاستيراد عند تصميم النقل.
- الحساب الشخصي وMy Drive وموقع backup bytes على Drive محسومة بقرار المالك؛ هوية المالك/الاسترداد، OAuth scopes، نقل الملكية، اختبار sandbox، ونمط cutover/rollback ما زالت غير محسومة. الوصول الخاص مخطط عبر PHP backend proxy.

### ترتيب التنفيذ والبوابات

| المرحلة | النتيجة المطلوبة | بوابة الانتقال |
|---|---|---|
| 0. جرد وخط أساس | inventory لتدفقات الملفات، metadata، المجموعة/المالك، حدود الاستضافة، وحالات الملفات القديمة | مراجعة كل نوع ملف وتحديد أي mapping أو scope غير محسوم |
| 1. قرارات Drive والأمن | اختيار موثق للحساب، المصادقة، نوع Drive، أقل scopes، نموذج ملكية ووصول، وسياسة النسخ | اعتماد القرارات من مالك المشروع واختبار sandbox |
| 2. عقد metadata وRLS | تصميم وربط metadata وresource IDs وسياسات العزل دون فرض جدول/حقول قبل مراجعة الاستخدام | migrations مطبقة على staging واختبارات RLS/role matrix |
| 3. موفر Drive في PHP | adapter داخلي، أسرار server-side، JWT/RBAC/scope، validation، audit وrate limits | فحوص PHP وfake/sandbox تثبت الفشل الآمن وعدم كشف الأسرار |
| 4. API الملفات | routes رفع/قراءة/stream/حذف بعقد واضح ووصول خاص وCORS/cache مناسبين | اختبارات سلبية وإثبات أن العميل لا يختار Drive ID للحذف/القراءة |
| 5. تكامل الواجهة وPWA | Gallery وMP3 والمناهج والمحاضرات وFeed والكتب/الأبحاث والصور المعتمدة | كل مسار ظاهر في inventory موصول ومختبر أو مستثنى بقرار |
| 6. Backup/restore/import | manifests وmetadata وملفات واستعادة وعمليات audit متوافقة | round-trip وrollback تجريبيان مع مطابقة الملفات والبيانات |
| 7. أداة الترحيل | dry-run ثم نقل idempotent مع checksum/readback وسجل لكل ملف | rehearsal يثبت عدم وجود ملفات غير متحققة ولا حذف للمصدر |
| 8. staging والجودة | مصفوفة الأدوار والمجموعات، اختبارات الملفات والـstreaming والفشل والـCI | جميع اختبارات الأمان والتكامل المطلوبة ناجحة بلا Critical/High مفتوح |
| 9. النشر والقطع والتدقيق | نشر Vercel/Hostinger/Supabase/Drive، cutover متدرج، rollback موثوق، وتحديث الأدلة | قائمة go-live مكتملة؛ يظل Hostinger محفوظًا حتى تحقق واعتماد الإزالة |

الخطة الدقيقة، بما فيها معرفات المهام ومعايير قبول كل مهمة واعتمادياتها ومخاطرها وخطة الرجوع وقائمة الأدلة النهائية، موجودة في [خطة نقل التخزين إلى Google Drive](GOOGLE_DRIVE_STORAGE_PLAN.md). نتائج ما أُنجز في المرحلة 0 موجودة في [تقرير التنفيذ](GOOGLE_DRIVE_PHASE0_AUDIT.md). لا توجد مدة تنفيذ مقدرة لأن نوع الحساب والحدود والبيانات الفعلية والاستضافة لم تُقَس بعد.

**تغييرات تنفيذ المرحلة 0 حتى الآن:** تحديث الخطة وتقرير التدقيق توثيقي، مع استعلامات Supabase للقراءة فقط واختبارات محلية. لم تُنشأ credentials أو Google Drive folders، ولم تُجرَ كتابة على Supabase أو Vercel، ولم يُنقل أو يُحذف أي ملف. توجد تغييرات Git غير committed في ملفات أخرى؛ لا ينسبها هذا التقرير إلى نقل Google Drive ولا يستبدلها.

## 14. تحديث تنفيذ الواجهة وخطة إعادة الضبط — 21 أكتوبر 2026

### ما تغير محليًا

- `frontend/src/app/curriculum/page.tsx`: فحص أخطاء استعلامات المناهج بدل تحويل فشل الشبكة/RLS إلى حالة فارغة، إضافة skeleton ورسالة خطأ وإعادة محاولة، وجلب بيانات المحاضر بواسطة `curriculum_entries.lecturer_id`. تغيّر الفصل المحدد لا يعيد تحميل كل استعلامات الصفحة.
- `frontend/src/components/CurriculumManagementPanel.tsx`: رفع ملفات المنهج يرسل `activeGroupId` الذي اختاره المسؤول بدل `profile.group_id`.
- `frontend/src/app/layout.tsx`: الشعار watermark ثابت وخفيف فوق خلفيات الصفحات المعتمة، وغير ذي أولوية تحميل.
- `frontend/src/lib/curriculum/display.ts` و`frontend/tests/curriculum-display.test.ts`: دوال عرض صغيرة واختبارات حالات الخطأ وأسماء الفرق.

### تحقق هذه الدفعة

- `cd frontend && npx tsc --noEmit` — exit 0.
- `cd frontend && npm test -- --reporter=dot` — **20 ملفًا، 213 اختبارًا ناجحًا**. ظهر تحذير JSDOM عن تنقل الرابط غير المدعوم وتحذير Node عن `localStorage` التجريبي؛ لم يفشل أي اختبار.
- اختبارات خاصة بدوال المناهج: 4/4 ناجحة بعد مشاهدة فشل اختبارات الميزات الجديدة قبل إضافة التنفيذ.
- `cd frontend && npm run build` — Next.js production build نجح بعد التعديلات؛ صفحة `/curriculum` 5.59 kB وFirst Load JS 198 kB. بقيت **17 تحذير lint** في ملفات/مكونات أخرى (بعضها في `CurriculumManagementPanel`؛ لا توجد أخطاء build).

### إعادة ضبط النظام

**تنفيذ محلي فقط — 21 أكتوبر 2026:** أضيفت migration `20261021170000_safe_system_reset.sql`، والـRPCs، وخدمتا التخزين/Auth، و`ResetAccessGate`، و`SystemResetController` ومسارا preview/execute، وواجهة المسؤول في `/settings`. قفل RLS المضاف يقيّد DML المباشر من `authenticated` على الجداول الـ36 المستهدفة أثناء reset؛ لكنه لا يوقف دوال `SECURITY DEFINER` التي تتجاوز RLS، ولا `service_role` ذي `BYPASSRLS`، ولا الطلبات الخلفية التي اجتازت بوابة PHP قبل بدء reset. فحص المراجعة أكد وجود RPCs متاحة لـ`authenticated` تكتب ضمن النطاق؛ لذلك تجميد كل مسارات الكتابة غير مكتمل، والمشروع غير جاهز للتشغيل.

مطابقة المخطط للقراءة فقط صنفت 55/55 جدولًا عامًا: 35 جدولًا للحذف، `media_assets` لتنظيف ملفات التشغيل، `profiles` لحذف Auth انتقائي مع إبقاء admin، و18 جدولًا للحفظ. جرد الوسائط أعاد 4 سجلات غير احتياطية، كلها `HOSTINGER_LOCAL`؛ لم تُفحص bytes الملفات على Hostinger. لا توجد buckets/objects في Supabase Storage وقت الفحص. السياسات الكتابية المرصودة لنطاق الـ36 موجهة إلى `authenticated` فقط؛ علاقات FK الحالية ذات الصلة فُحصت ولم يظهر ترتيب حذف مخالف.

**تصحيح نتيجة مراجعة مستقلة:** الشبهة بأن FK `profiles → auth.users` يمنع حذف حسابات Auth غير مدعومة بالمخطط الحالي؛ استعلام catalog الحي و`003_profiles_auth_mapping.sql` يثبتان `ON DELETE CASCADE`. لقطة `schema_live_snapshot.sql` المحلية قديمة في هذه العلاقة، لذا لا تُستخدم وحدها كدليل. لم يُختبر تنفيذ migration على PostgreSQL فعلي.

**غير جاهز للتشغيل:** migration غير مطبقة، وجداول `system_reset_*` غير موجودة في قاعدة البيانات. اختبارات PHP المحلية التي شُغلت سابقًا 117/117، واختبارات Vitest 213/213؛ typecheck/build نجحا، وتحليل syntax المحلي قبل 44 statement وكتل PL/pgSQL. لم يُنفذ reset أو restore تجريبي؛ لا توجد تجربة migration/سياسات RLS على PostgreSQL فعلي ولا اختبار Hostinger/staging. هذه الفحوص لا تثبت التنفيذ الحي. تفاصيل النطاق والموانع في [خطة reset الآمنة](SAFE_SYSTEM_RESET_PLAN.md).

### الأداء

هذه التعديلات تعالج تكرار استعلام غير لازم وحالة عرض الصفحة، لكنها لا تثبت تحسنًا كميًا في السرعة. لا توجد قياسات جديدة LCP/INP/CLS أو p50/p95، ولا اختبار حمل. بقيت خطة القياس والخطوات التالية في [COMPLETION_PLAN.md](COMPLETION_PLAN.md) كما هي مع تحديث الحالة.

### النشر وحالة Git

هذه التغييرات محلية فقط؛ لم يحدث `git push` أو نشر إلى Vercel/Hostinger/Supabase. حالة العمل قبل تحديث الوثائق: الفرع `main`، مع تغييرات سابقة غير committed في ملفات الواجهة؛ افحص `git status` قبل commit.
