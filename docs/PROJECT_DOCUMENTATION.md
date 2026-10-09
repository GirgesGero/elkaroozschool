# مرجع مشروع مدرسة الكاروز — ELKAROOZ SCHOOL

> **نوع الوثيقة:** توثيق تقني مبني على التنفيذ الحالي (as-built)، وليس إعادة صياغة لمتطلبات المشروع فقط.<br>
> **مراجعة المصدر:** 3 أكتوبر 2026.<br>
> **مسار المستودع:** `E:\drive progect\ELKAROOZ SCHOOL`
> **حدود مراجعة المصدر:** قُرئت ملفات التنفيذ والتهيئات والـmigrations والاختبارات؛ استُبعدت أشجار الاعتماديات والمخرجات مثل `node_modules/`, `.next/`, و`backend-api/vendor/` من جرد الكود. لم تُفحص Vercel أو استضافة PHP مباشرةً. **تحديث 4 أكتوبر 2026:** host Supabase MCP طابق `frontend/.env.local` والمضيف الذي أكده المالك؛ أُعيدت قراءات catalog/ledger للقراءة فقط. المشروع يحتوي 69 إصدار migration حيًا و50 جدولًا عليها RLS و31 ملف migration محليًا. تصنيف البيئة staging/production غير محسوم؛ لا كتابة دائمة أو deployment في هذا التحديث.

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

الواجهة هي **Next.js 14 App Router + React + TypeScript**. يحتوي المستودع على 31 ملف migration: 28 تاريخيًا، migration إصلاح موجودة في ledger، وproposalان غير مطبقين (`media_assets` وRPC hardening). ويعرّف 46 جدولًا بحسب المصدر المحلي. القراءات الأخيرة على مشروع Supabase المطابق للمضيف أعادت 69 إصدارًا حيًا و50 جدولًا عليها RLS؛ تصنيف البيئة staging/production غير محسوم. يُفصّل الاختلاف في تقريري المرحلة 0 والمصالحة. الـPHP API تطبيق Front Controller صغير بلا إطار عمل routing منفصل. الواجهة تتصل غالبًا بقاعدة Supabase مباشرةً عبر RLS، مع PHP API متاح لموارد وعمليات محددة.

### صورة الحالة من التحقق المحلي

- Frontend typecheck: ناجح.
- Vitest: **98 اختبارًا ناجحًا من 6 ملفات** (نتيجة محلية موثقة في تدقيق 4 أكتوبر 2026).
- Next.js production build: ناجح، مع **9 تحذيرات lint** (اعتماديات `useEffect` وصور `<img>`).
- PHP syntax: **61 ملف PHP** من `backend-api/` و`scripts/` دون أخطاء صياغة.
- `verify_no_fake_success.mjs`: **18/18**.
- `verify_no_credential_leaks.py`: **4/4**.
- تحقق اتصال Supabase للقراءة فقط: host الذي أعاده MCP **لا يطابق** host `frontend/.env.local`؛ سجل migrations وقراءات schema تخص اتصال MCP فقط، ولا يمكن نسبها لقاعدة المستودع قبل تأكيد المشروع. لم يُنفّذ اتصال مباشر بـVercel أو Hostinger. نجاح البناء والاختبارات المحلية لا يثبت نجاح النظام المنشور.

---

## 2. هدف المنتج والأدوار

الملخص التالي يجمع المجال الظاهر في `docs/SRS_ELKAROOZ_SCHOOL.md` مع الأدوار المزروعة في `supabase/migrations/016_seed_data.sql`. **المتطلبات لا تُعد وحدها إثباتًا أن كل حكم منفذ بنفس الصورة.**

| الدور | المقصود وظيفيًا | صلاحيات/حدود تقنية مرصودة |
|---|---|---|
| `admin` | إدارة النظام | عالمي في سياسات SQL وPHP؛ مسارات `/admin` مسموحة. |
| `super_user` | إدارة عليا مشتركة مع المسؤول | يعامل كمسؤول في كثير من قواعد RLS وPHP؛ تفاصيله تحتاج مراجعة مقارنةً بنص SRS لكل عملية. |
| `secretariat` | سكرتارية فرقة | نطاق المجموعة يُفترض أن يكون محدودًا؛ توجد سياسات حضور ونطاق مجموعة. |
| `servant` | خادم | صلاحيات أساسية، وبعض المهام المفوضة عبر `servant_permissions` و`has_servant_permission(...)`. |
| `trainee` | متدرب/مخدوم | يقرأ بياناته/المحتوى المسموح ويتفاعل؛ سياسة إنشاء المنشورات تمنع هذا الدور. |

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
| `.github/workflows/ci.yml` | خطتا CI للواجهة وPHP. الملف الحالي يحتاج فحصًا نحويًا بسبب اختلاف indentation في آخر الخطوات. |
| `vercel.json` | إعداد بناء Vercel لمجلد `frontend` من جذر المستودع. |
| `RUN_ELKAROOZ.bat`, `STOP_ELKAROOZ.bat`, `TEST_ELKAROOZ.bat` | تشغيل/إيقاف محلي واختبارات Windows؛ راجع محتوى الملفات قبل الاعتماد على نصوصها التسويقية أو أعداد الاختبارات. |
| `.env.example` | أسماء متغيرات البيئة دون اعتبارها قيمًا تشغيلية حية. لا تنسخ أسرارًا إلى التوثيق. |

---

## 4. معمارية الواجهة الأمامية

### التقنية والإعداد

- `frontend/package.json`: Next.js `14.2.35`, React `18.3.1`, TypeScript `5.7.3`، Supabase JS و`@supabase/ssr`، React Query، Tailwind، Vitest، Testing Library، Zod، و`xlsx`.
- `frontend/tsconfig.json`: TypeScript strict وalias `@/*` إلى `src/*`.
- `frontend/src/app/layout.tsx`: `lang="ar"`, `dir="rtl"`، metadata عربية، manifest وPWA، وتسجيل `/sw.js` عند تحميل الصفحة.
- `frontend/src/context/ThemeContext.tsx`: ثلاثة themes هي `light`, `dark`, `luxury`، مع حفظ الخيار في `localStorage` تحت `elkarooz-theme`.
- `frontend/src/app/providers.tsx`: React Query `staleTime=60s` و`refetchOnWindowFocus=false`، مع ThemeProvider. وجود React Query لا يعني أن كل استعلامات الصفحات تستخدمه.
- ملفات PWA: `frontend/public/manifest.json` و`frontend/public/sw.js`.

### خريطة الصفحات

المسارات أدناه مستنتجة من ملفات `frontend/src/app/**/page.tsx`؛ بعض صفحات المحتوى client-rendered. `/_not-found` مولد من Next وليس صفحة مجال مستقلة.

| المسار | الدور الوظيفي للصفحة | المصدر |
|---|---|---|
| `/` | الموجز الاجتماعي؛ منشورات وتعليقات وتفاعلات وإشعارات وملخصات المجموعات. | `src/app/page.tsx` |
| `/login` | تسجيل الدخول؛ اسم المستخدم يُحوّل إلى بريد اصطناعي بصيغة نطاق التطبيق ثم يستعمل Supabase Auth. | `src/app/login/page.tsx` |
| `/about` | تعريف بالمدرسة؛ مسار عام. | `src/app/about/page.tsx` |
| `/bible` | الكتاب المقدس، السفر والإصحاح والبحث وشروح الكلمات؛ مسار عام. | `src/app/bible/page.tsx` |
| `/books` | الكتب والأبحاث والتصنيفات والبحث والقارئ والمفضلة وإضافة المحتوى بحسب الصلاحيات. | `src/app/books/page.tsx` |
| `/research` | تحويل إلى `/books`. | `src/app/research/page.tsx` |
| `/favorites` | تحويل إلى `/books`. | `src/app/favorites/page.tsx` |
| `/curriculum` | مناهج ومحاضرات وملفات المجموعة. | `src/app/curriculum/page.tsx` |
| `/mp3` | مكتبة ومشغل تسجيلات صوتية. | `src/app/mp3/page.tsx` |
| `/gallery` | ألبومات وصور وعرض صورة موسع. | `src/app/gallery/page.tsx` |
| `/marathon` | قائمة الماراثونات وحالة المتدرب. | `src/app/marathon/page.tsx` |
| `/marathon/[id]` | أداء الماراثون وحفظ الإجابات والتقدم. | `src/app/marathon/[id]/page.tsx` |
| `/marathon/manage` | إنشاء وإدارة الماراثونات والأسئلة ومراجعة الإجابات. | `src/app/marathon/manage/page.tsx` |
| `/attendance` | عرض حضور المتدرب أو إدارة الجلسات والحضور للأدوار المخولة. | `src/app/attendance/page.tsx` |
| `/exams` | عرض الدرجات أو إدخالها للأدوار المخولة. | `src/app/exams/page.tsx` |
| `/trainees` | دليل المتدربين وإدارة حالتهم ومجموعاتهم. | `src/app/trainees/page.tsx` |
| `/groups` | لوحة المجموعات أو تحويل المستخدم إلى مجموعته. | `src/app/groups/page.tsx` |
| `/groups/[id]` | تفاصيل المجموعة: الخدام والسكرتارية والمتدربون والحضور والمناهج وتقارير المجموعة. | `src/app/groups/[id]/page.tsx` |
| `/admin/backups` | إنشاء/قائمة/حذف النسخ وواجهة الاستعادة. | `src/app/admin/backups/page.tsx` |
| `/admin/imports` | استيراد جماعي للمتدربين ومعاينة/تحقق. | `src/app/admin/imports/page.tsx` |
| `/admin/notifications` | إدارة قوالب الإشعارات والآيات وإرسالها. | `src/app/admin/notifications/page.tsx` |

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
2. المسارات العامة في الدالة `isPublicPath`: `/login`, `/bible`, `/about`, `/icons...`, `/manifest.json`, `/sw.js`, `/logo.png`.
3. عند غياب `NEXT_PUBLIC_SUPABASE_URL` أو `NEXT_PUBLIC_SUPABASE_ANON_KEY`: يسمح للمسار العام ويحوّل غير العام إلى `/login`.
4. وإلا ينشئ `createServerClient` مع cookies ويطلب `auth.getUser()`؛ الزائر للمسار المحمي يذهب إلى `/login`.
5. للمستخدم المصادق، يطلب `auth.getClaims()` ويقرأ الدور من `app_metadata.role` أو `user_metadata.role_id` ثم يستدعي `canAccessPath`.
6. `routeAccess.ts` يقيّد `/admin`, `/trainees`, `/marathon/manage`, `/attendance`, `/exams`. أي مسار غير مدرج لا يفرض هذه الدالة عليه دورًا خاصًا (`requiredRolesFor` ترجع `null`).
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
| `GET /` | صحة خدمة PHP | عام | لا يظهر rate limit في الراوتر |
| `GET /health` | صحة الخدمة وإصدار PHP | عام | لا يظهر rate limit في الراوتر |
| `GET /auth/verify` | التحقق من جلسة المستخدم/الملف والصلاحيات | JWT | 30 لكل 60 ثانية، bucket `auth` |
| `POST /storage/upload` | رفع ملف إلى مسار مسموح | JWT؛ admin/super_user/servant/secretariat حسب `StorageController`، مع group scope وفحص الملف | 20 لكل 60 ثانية، `upload` |
| `POST /storage/delete` | حذف ملف | JWT وadmin/super_user | يشارك bucket `upload`: 20/60 ثانية |
| `POST /backup/create` | إنشاء ZIP مشفر ونسخ metadata | JWT وadmin/super_user؛ `encryption_password`, `storage_option` | 5/300 ثانية، `backup` |
| `GET /backup/list` | قراءة سجل النسخ | JWT وadmin/super_user | 60/60 ثانية، `backup` |
| `POST /backup/validate-zip` | فحص أرشيف قبل اعتماده | JWT وadmin/super_user؛ multipart `backup_zip`, `encryption_password` | 10/60 ثانية، `backup` |
| `POST /backup/delete` | soft-delete للسجل ومحاولة حذف الملف | JWT وadmin/super_user؛ `backup_id` | 30/60 ثانية، `backup` |
| `POST /restore/preview` | فك وفحص وعرض ملخص دون تغيير البيانات | JWT وadmin/super_user؛ multipart ZIP وكلمة المرور | 10/300 ثانية، `restore` |
| `POST /restore/execute` | تنفيذ الاستعادة | JWT وadmin/super_user؛ `restore_mode`, `confirm_restore=YES`, اختياريًا `truncate_mode=MERGE\|TRUNCATE` | 2/600 ثانية، `restore` |
| `POST /import/trainees` | استيراد متدربين والتحقق التجريبي | JWT وadmin/super_user؛ ملف `file`, و`dry_run` | 10/300 ثانية، `import` |
| `GET /import/history` | سجل الاستيراد؛ `limit` بين 1 و200 | JWT وadmin/super_user | 60/60 ثانية، `import` |
| `GET /export/data` | تصدير كيان حسب format/group | JWT وadmin/super_user؛ query parameters | 5/300 ثانية، `export` |

المسارات المجهولة ترجع `404 ROUTE_NOT_FOUND`. `public/.htaccess` يعيد المسارات إلى index ويمنع بعض verbs/الملفات الحساسة. ملف `public/htaccess_root.template` مهم في نشر flattened لحماية ملفات التطبيق خارج public root.

### ملفات الطبقات الخلفية

**Controllers:**

- `AuthController.php`: التحقق من الجلسة/الملف.
- `StorageController.php`: رفع وحذف الملفات.
- `BackupController.php`: إنشاء/قراءة/فحص/حذف النسخ.
- `RestoreController.php`: preview وexecute.
- `ImportController.php`: استيراد المتدربين وسجل الاستيراد.
- `ExportController.php`: تصدير البيانات.
- `SafeFailure.php`: تسجيل التفاصيل داخليًا وإخفاؤها عن العميل مع مرجع الخطأ.

**Middleware:** `CorsMiddleware`, `JwtAuthMiddleware`, `RbacMiddleware`, `GroupScopeMiddleware`, `FileSecurityMiddleware`, `RateLimitMiddleware`.

**Services:** `SupabaseClient`, `StorageBridgeService`, `AuditLogService`, `ZipEncryptionService`, `ArchiveExtractor`, `BackupArchiveInspector`, `DatabaseExportService`, `DatabaseRestoreService`, `AtomicRestoreService`, `ExcelParserService`, `SpreadsheetWriter`, `LectureAnnouncementService`.

**ملاحظات العقد:** `SupabaseClient::query()` و`rpc()` يعيدان envelope داخليًا من الشكل `['status' => HTTP status, 'data' => decoded response]`. أي مستهلك RPC يجب أن يقرأ النتيجة من `data` لا أن يفترض أن حقول PostgreSQL على المستوى الأعلى.

### المصادقة في PHP

- `JwtAuthMiddleware` يبحث عن Authorization في `HTTP_AUTHORIZATION` ثم redirect variants.
- يفرض `Bearer <token>`، ثم `Firebase\JWT\JWT::decode` مع `Key(..., 'HS256')`؛ لا يوجد fallback لفك JWT بلا توقيع.
- الدور والمجموعة يأتيان من claims؛ يتم رفض الحساب غير النشط إذا كان claim مناسب موجودًا.
- `RbacMiddleware::requireAdminOrSuperUser()` يسمح فقط بالدورين الإداريين (الأدوار الإدارية تعبر أيضًا من `requireRoles`).
- `config/supabase.php` يفشل مغلقًا إذا غاب أي من `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.

**غير محسوم:** يجب اختبار نوع توقيع JWT الذي تصدره بيئة Supabase الفعلية مقابل اشتراط HS256 في PHP. يوجد تعليق في `JwtAuthMiddleware.php` عن رفض مسارات RS256/ES256/fallback؛ لا يكفي وجود secret في `.env` لإثبات التوافق.

---

## 6. قاعدة البيانات وSupabase

### جرد الجداول

التحليل الآلي لنص migrations عثر على **46 اسم جدول فريد**. هذا يصف DDL في المستودع، وليس بالضرورة جدولًا حيًا بعد تطبيق/تعديل يدوي خارج Git.

| المجال | الجداول |
|---|---|
| الهوية والصلاحيات | `roles`, `groups`, `profiles`, `permissions`, `servant_permissions`, `group_secretariat` |
| الدراسة والمحاضرات | `terms`, `lecturers`, `lectures`, `curriculums` |
| الحضور والامتحانات | `attendance_sessions`, `attendance_records`, `exams`, `exam_grades` |
| الماراثون | `marathons`, `marathon_sections`, `marathon_questions`, `marathon_answers`, `marathon_trainee_submissions`, `marathon_trainee_answers` |
| المجتمع | `feed_posts`, `post_comments`, `reactions` |
| الإشعارات | `notification_templates`, `notifications`, `push_subscriptions`, `daily_verses`, `daily_verse_dispatch_state` |
| الكتب والوسائط | `categories`, `books`, `researches`, `gallery_albums`, `gallery_items`, `mp3_tracks`, `user_favorites` |
| الكتاب المقدس | `bible_testaments`, `bible_books`, `bible_chapters`, `bible_verses`, `bible_verse_words`, `bible_sources`, `bible_commentaries`, `bible_word_commentaries` |
| التشغيل والتدقيق | `audit_logs`, `backup_records`, `import_history` |

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

### ملفات migrations

يوجد 31 ملفًا: 28 تاريخيًا، migration إصلاح صور/RPC موجودة في ledger المشروع المطابق، وproposalان غير مطبقيْن (`media_assets` و`harden_marathon_and_audit_rpcs`). تصنيف المشروع staging/production غير مؤكد. المجموعة الأساسية:

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

ثم hardening/تشغيل:

```text
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
```

أسماء هذه الملفات لا تثبت أنها طُبقت على مشروع Supabase الحي. لا يوجد في الجرد `supabase/config.toml` أو مجلد `supabase/seed` أو workflow يطبق migrations تلقائيًا. وثّق وسجّل migration history الحي قبل ترقية قاعدة البيانات.

### Seed data

`016_seed_data.sql` يزرع الأدوار الخمسة، 3 مجموعات، 5 صلاحيات مفوضة، 3 قوالب إشعار (`PASTORAL`, `BIRTHDAY`, `SYSTEM`)، العهدين، مصدر Bible واحد، وصفًا واحدًا لحالة الآية اليومية. لا يزرع حسابات المستخدمين أو ملفًا كاملًا للمحتوى الكتابي/الكتب.

---

## 7. تتبع تدفقات البيانات المهمة

### تسجيل الدخول والتحقق من الجلسة — مرصود من المصدر

`/login` → Supabase Auth `signInWithPassword` باسم المستخدم بعد توليد synthetic email → جلسة Supabase/cookies → middleware `getUser()` → `getClaims()` موثّق للدور → `canAccessPath()` عند المسارات المقيدة. بيانات الصفحات تظل محمية فعليًا بسياسات RLS وقيود RPC، لا بمجرد المسار.

### استعلامات الصفحات — نمط عام مرصود

الصفحات تستورد عميل Supabase browser وتقرأ/تكتب عبر PostgREST أو RPC مباشرةً. لذلك يجب تتبع كل handler من الصفحة إلى اسم الجدول/RPC ثم سياسة RLS المقابلة. وجود `phpApi.ts` لا يعني أن كل العمليات تمر عبر PHP.

### النسخ الاحتياطي والاستعادة — واجهة موصولة، وعقد التنفيذ الحالي غير متسق

المسار المقصود: `/admin/backups` → `phpApi('/backup/create')` مع JWT المستخدم → PHP ينشئ ZIP ويصدر البيانات → يحفظ الملف/metadata → يعرض النتيجة؛ الاستعادة ترفع الملف إلى `/restore/preview` أو `/restore/execute` مع تأكيد ونمط محدد.

لكن مراجعة ملفات التنفيذ تكشف نقاط مانعة قبل اعتبار التدفق سليمًا end-to-end:

1. `SupabaseClient::rpc()` يعيد `['status', 'data']`. `DatabaseExportService::listTables()` يقرأ `$result['tables']` مباشرةً، وقراءة الصفحات تبحث عن `$page['rows']` بدل `$page['data']['rows']`. بالمقابل RPC `export_manifest()` يرجع JSON فيه `tables` و`export_table()` يرجع `rows` داخل body. المتوقع من هذا العقد أن قائمة الجداول تصبح فارغة ويرفض النسخ قاعدة البيانات.
2. مُصدر DB يكتب `database/<table>.json` لكل جدول؛ `DatabaseRestoreService::restore()` يبحث عن `database/database.json` ويتوقع object مجمعًا من table إلى rows. صيغة الأرشيف الحالية المصدّرة لا تطابق مدخل الاستعادة.
3. خدمة restore تقرأ `tables_restored` على المستوى الأعلى بعد RPC مع أن العميل يغلف الرد تحت `data`؛ ذلك يخلق فشلًا عند تفسير النتيجة.
4. `BackupController::create()` يطبع سطرًا باستخدام `printf()` قبل envelope JSON؛ إذا وصل التنفيذ لمرحلة النجاح، قد يختلط النص مع JSON الذي يتوقعه `phpApi.ts`.
5. `BackupController::delete()` يعرّف `$backupRoot` ثم يبني المسار باستخدام `$storageRoot`؛ يجب إصلاح/اختبار حذف الملف فعليًا.

هذه عيوب مستنتجة مباشرة من عقود الملفات، ولم يُنفّذ هنا اتصالًا حيًا يثبت استجابة الاستضافة. تعامل مع النسخ والاستعادة على أنهما **غير متحققين تشغيليًا** إلى أن تنجح اختبارات round-trip حقيقية على نسخة اختبارية مع قراءة أثر الملفات والصفوف بعد العملية.

### الاستيراد — مساران مختلفان

- الواجهة `/admin/imports` تستخدم Supabase/RPC مباشرة وفق مصدر الصفحة.
- PHP يوفّر `POST /import/trainees` ويستدعي `import_trainees_bulk_atomic` مع actor JWT.
- `ImportController` يسمح امتدادي `csv` و`xlsx` لكنه يستدعي `ExcelParserService::parseCsv()` في الحالتين، والخدمة تقرأ CSV عبر `fgetcsv`. لذلك دعم XLSX غير مثبت، والامتداد وحده لا يعني أن ملف Excel يُحلّل.
- الدالة `import_trainees_bulk_atomic` مستعملة في المصدر، لكنها لم تظهر ضمن تعريفات migrations الـ28؛ تحقق من عقدها في DB قبل اعتماد أي من المسارين.

### الإشعارات والـRealtime

`NotificationCenter` وصفحة الموجز يشتركان في Realtime من Supabase `postgres_changes` على بيانات الإشعار/الموجز. المخطط يضم `notifications`, `push_subscriptions`, `notification_templates`, `daily_verses`, `daily_verse_dispatch_state`. دوال dispatch/birthday التي تناديها الواجهة لا تظهر في migrations المفحوصة؛ لا تخلط بين Realtime داخل التطبيق وبين إثبات عمل Web Push أو scheduler حي.

### الملفات

`StorageController` + `StorageBridgeService` مسؤولان عن الكتابة المحلية في PHP. حدود الملفات تسمح بأنواع MIME محددة، مع حدود ظاهرة في `config/storage.php`: avatar 10 MiB، feed 15 MiB، pdf 50 MiB، mp3 150 MiB، backup 2 GiB. يجب اختبار MIME magic bytes وrealpath containment والامتدادات على الخادم المنشور؛ القيم في config لا تثبت حدود PHP/الويب سيرفر مثل `upload_max_filesize` و`post_max_size`.

---

## 8. الأمن والتشغيل

### ضوابط موجودة في المصدر

- RLS على الجداول والسياسات بحسب user/group/role/permission.
- حواجز لاحقة لإغلاق self-escalation، group-scoped RPCs، حالات NULL في التفويض، وسحب صلاحيات `anon/PUBLIC` لبعض الدوال.
- JWT signature validation مقيد في PHP إلى HS256؛ فشل مغلق عند token غير صالح.
- RBAC في PHP قبل أعمال النسخ والتصدير والاستعادة؛ فحص group scope وملف upload.
- CORS allowlist، rate limit باستخدام middleware، وأخطاء عامة مع correlation ID.
- أسماء ملفات/مسارات وحماية أرشيف ZIP عبر خدمات مخصصة؛ يوجد عدد من اختبارات الهجمات ضمن `scripts/`.
- فحص machine-readable لمنع credential literals ولعدم عرض نجاح وهمي.

### مخاطر/فجوات أولوية

**حرج — سلامة النسخ والاستعادة:** عدم تطابق envelope RPC ومسار ملفات DB الموضح أعلاه؛ لا تخزن أو تستعد بيانات إنتاج قبل round-trip test.

**عالٍ — reproducibility للبيانات:** أسماء RPC المستخدمة التي لا تظهر في migrations؛ يلزم جلب DDL حي أو إضافته إلى migrations، ومقارنة `pg_proc`, grants, RLS من البيئة.

**عالٍ — اتساق المصادقة:** تحقق من نوع JWT الحقيقي في Supabase وإعداد السر المقابل لاشتراط HS256 في PHP، واختبر رفض/قبول التوكنات على staging.

**عالٍ — اختلافات importer/UI:** الواجهة والـPHP endpoint قد يكونان مسارين منفصلين؛ XLSX يمر إلى parser CSV في PHP، ويجب توحيد العقد واختبار عدم إنشاء حساب عند الفشل.

**متوسط — حذف backup:** متغير `$storageRoot` غير معرّف في مسار بناء الملف.

**متوسط — endpoint routing:** الملفات `LectureAnnouncementService.php` موجودة لكن لا يظهر مسار endpoint مرتبط بها في الراوتر؛ لا تعتبرها feature متاحة للمستخدم دون wiring.

**متوسط — authorization للمسارات:** `routeAccess` تستخدم default permissive للمسارات غير المدرجة؛ أي صفحة إدارية جديدة تحتاج إضافة gate مناسب، مع استمرار فرض الحماية على مستوى DB/API.

**متوسط — UI fallback/error handling:** تحذيرات `useEffect` قد تنتج stale closures، واستخدام `<img>` تحذير تحسين. بعض fallback values ورسائل العمليات تحتاج مراجعة حتى لا تُعرض أرقام تبدو ناجحة عند فشل query.

**متوسط — التشغيل:** CI يحتوي اختلاف indentation في آخر الخطوات؛ لم يتم هنا التحقق من parse أو تشغيل GitHub Actions. كما أن مجلد `docs/` فيه أدلة قديمة أو claims عن عدد جداول/مسارات/متغيرات يختلف عن المصدر الحالي.

**معياري/سهولة الوصول:** `viewport` في `layout.tsx` يضبط `maximumScale=1` و`userScalable=false`، ما يمنع تكبير الواجهة للمستخدم.

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

## 10. الاختبارات وما الذي تثبته

### Frontend

الاختبارات في `frontend/tests/` تشمل:

- `phpApi.test.ts`: بوابة API وأشكال الخطأ/الفشل.
- `routeAccess.test.ts`: مصفوفة السماح للمسارات والأدوار.
- `serviceWorker.test.ts`, `manifest.test.ts`: أصول PWA.
- `dbErrors.test.ts`: تفسير أخطاء DB.
- `GroupSelector.test.tsx`: سلوك اختيار المجموعة.

**نتائج الأمر المنفذ:** `npm run typecheck` ناجح؛ `npm test` نجح: 6 files، 96 tests. `npm run build` ناجح؛ Next ولّد الصفحات، لكنه عرض 9 تحذيرات من hooks و`<img>`. اجتياز هذه الاختبارات لا يثبت صحة بيانات Supabase الحية أو صلاحياتها.

### Backend / scripts

- تم تنفيذ `php -l` على **61 ملف PHP** من `backend-api/` و`scripts/`: 0 أخطاء صياغة.
- `node scripts/verify_no_fake_success.mjs`: 18 pass، 0 failure.
- `python scripts/verify_no_credential_leaks.py`: 4 checks ناجحة، ومسح 3 archives وفق مخرجات الأداة.
- ملفات `scripts/verify_*.php`, `*.py`, `*.sql` تشمل مصفوفات أدوار، HTTP، ZIP attacks، atomicity، exports/restores، rate limiting، تخزين، تسريب الأخطاء وE2E. لا يعني وجودها أنها كلها شُغلت في هذا التحقق.
- لا يوجد ضمن ما فُحص إعداد PHPUnit أو CI يثبت تنفيذ كل تلك الفحوص. الـworkflow يتضمن خطوات PHP/Python لكنه لم يُشغّل هنا.

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
