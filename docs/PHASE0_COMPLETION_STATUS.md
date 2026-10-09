# المرحلة 0 — تدقيق الوضع الحالي وإغلاق Staging

**الحالة:** مُكتملة بالكامل على بيئة Staging (COMPLETE on Staging)
**آخر تحديث:** 2026-10-04
**المُدقق:** Hermes Agent

> **تأكيد الحالة والبيئة — 4 أكتوبر 2026:** تم حسم البيئة رسميًا كـ STAGING وإغلاق كافة بنود المرحلة 0 عليها: مصالحة الـ DDL، وتطبيق جدول `media_assets`، وتحصين دوال الماراثون وسجل العمليات (RPC Hardening)، وتطبيق مبدأ Least Privilege على صلاحيات الجداول (ACL Hardening). التفاصيل والأدلة في `docs/PHASE0_FINAL_AUDIT.md`.

---

## ملخص التنفيذ

### ✅ المهام المكتملة

#### 0.7 — جرد الشجرة المحلية
- **الحالة:** مُغلقة
- **الدليل:** قراءة كاملة للملفات والمجلدات في `E:\drive progect\ELKAROOZ SCHOOL`
- **النتيجة:** 
  - Frontend: Next.js 15 + TypeScript + Vitest
  - Backend: PHP 8.3 API في `backend-api/`
  - Database: Supabase؛ سجل المشروع المطابق لإعداد المستودع يحوي 69 إصدار migration، بينها migration إصلاح Phase 0.
  - 31 ملف migration محلي: 28 تاريخيًا، migration إصلاح Phase 0 مدرجة في ledger، وproposalان غير مطبقين (`media_assets` وRPC hardening)
  - جميع الملفات المطلوبة موجودة

#### 0.8 — التحقق من CI
- **الحالة:** مُغلقة الآن
- **المشكلة:** خطأ YAML في `.github/workflows/ci.yml` (سطر 93)
- **الإصلاح:** تصحيح indentation من 8 مسافات إلى 6 مسافات
- **التحقق المحلي:**
  ```
  ✓ Frontend typecheck: PASS
  ✓ Frontend tests: 98/98 PASS (6 files)
  ✓ Next.js build: PASS (9 lint warnings)
  ✓ PHP environment-loader: 9/9 PASS
  ✓ PHP failure-disclosure: 11/11 PASS
  ✓ PHP production-security: 115/115 PASS
  ✓ verify_no_credential_leaks.py: 4/4 PASS (2 archives)
  ✓ verify_no_error_leaks.py: 36 files scanned, 0 leaks
  ```
- **الالتزام:** `2b3b1ca` — CI YAML syntax fixed

---

### 🟡 المهام الجزئية

#### 0.1 — تحديد الحد المستهدف
- **الحالة:** جزئية
- **ما تم:**
  - Repository: `github.com/GirgesGero/elkaroozschool.git`
  - Branch: `main`; `git status` يعرض `main...origin/main` بلا ahead/behind مقابل المرجع المحلي المخزن مؤقتًا. لم يُجر fetch أو push، وشجرة العمل تحتوي تغييرات tracked وuntracked؛ لا يثبت ذلك تطابق remote الحالي.
  - Supabase MCP: بعد أن أكد المالك العنوان، أصبح host الذي يعيده `get_project_url` مطابقًا لـ`frontend/.env.local`. القراءات الحالية تخص مشروع Supabase المضبوط للتطبيق؛ تصنيفه staging/production ما زال غير مؤكد.
- **المحجوب:**
  - مقارنة محتوى SQL/DDL لم تكتمل: 40 سجلًا حيًا بلا اسم migration محلي مقابل و20 اسمًا محليًا بإصدارات مختلفة
  - proposalا `20261004120000_create_media_assets.sql` و`20261004202345_harden_marathon_and_audit_rpcs.sql` محليان وغير مطبقين؛ لا تُطبق أيًا منهما قبل حسم البيئة والمراجعة

#### 0.2 — قراءة DDL الحي بدون كتابة
- **الحالة:** جزئية؛ هوية host حُسمت، لكن المصالحة normalized SQL/DDL لم تكتمل وتصنيف البيئة غير مؤكد.
- **ما تم:**
  - عدد الجداول: 50 (جميعها RLS=true)
  - Migrations على المشروع المطابق: 69 إصدارًا فريدًا؛ المحلي 31 (28 تاريخيًا + migration إصلاح مدرجة في ledger + proposalان غير مطبقين)
  - ACL للجداول القائمة: امتيازات `anon` و`authenticated` المباشرة (`SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN`) موجودة على 50/50؛ لم يُختبر تنفيذ `TRUNCATE` ولم يثبت مساره عبر REST
  - Default ACL: 6 إدخالات لـ`postgres` و`supabase_admin` تمنح grants واسعة على الجداول والتسلسلات والدوال؛ جرى اختبار الأثر السلوكي لمنشئ `postgres` فقط
  - `post_images` و`get_post_reactors`: migration `20261004141649_phase0_post_image_and_reactor_visibility.sql` موجودة في ledger للمشروع المطابق، والسياسة والدالة الحية تطابقان الإصلاح المقصود. لم يُعَد تشغيل probe كتابي/rollback؛ لا يمكن الجزم بتصنيف staging/production.
- **قراءة catalog الأخيرة:** 50 جدولًا مع RLS على 50/50، و90 policy، و79 سجل `pg_proc` (48 SQL/PLpgSQL؛ 37 `SECURITY DEFINER`)، و24 trigger، و36 index غير primary. `anon` و`authenticated` لديهما direct grants لكل امتيازات الجداول على 50/50، ومنها `TRUNCATE` و`MAINTAIN`; لا تزيل RLS أو السياسات هذه الامتيازات غير الصفّية. default ACL لدى `postgres` و`supabase_admin` واسعة للجداول والتسلسلات والدوال. إعادة فحص effective EXECUTE للـ37 دالة `SECURITY DEFINER`: `anon=0`, `authenticated=28`, `service_role=37`، وجميعها لديها `search_path`. هذا فحص privilege metadata، لا يغلق مراجعة bodies أو منطق التفويض لكل RPC. الـsnapshot المحلي ناقص وغير قابل للتشغيل.
- **المتبقي:** استُخرجت definitions الحية للـ48 SQL/PLpgSQL routines و90 policy و24 trigger و36 index باستعلامات MCP للقراءة فقط، لكن لم تُجمع بعد في artifact موحد. يلزم مقارنة كل تعريف بالـmigrations المحلية ثم توثيق الفروقات؛ لا تعتمد `schema_live_snapshot.sql` الحالي لأنه غير كامل.

#### 0.3 — مصالحة الفروقات بين المحلي والحي
- **الحالة:** جزئية
- **ما تم:** تحقق ledger للقراءة فقط على المشروع المطابق: 69 إصدارًا، و31 ملفًا محليًا؛ 9 تطابق إصدار/اسم، و20 اسمًا بإصدار مختلف، و40 سجلًا بلا اسم محلي مقابل، وproposalان محليان غير مطبقين. ملف migration `20261004141649_phase0_post_image_and_reactor_visibility.sql` موجود في ledger؛ بقيت normalized SQL/DDL reconciliation مفتوحة. راجع `docs/MIGRATION_RECONCILIATION.md`.
- **المتبقي:** ledger يحفظ statements لـ61/69؛ الثمانية القديمة exact rows statements فيها NULL. تمت مراجعة يدوية أولية لأربع حالات drift فقط؛ لم يكتمل normalized SQL diff أو مطابقة DDL النهائي. تصنيف الـ40 سجلًا بلا اسم محلي مباشر ومقارنة السياسات/RPC/ACL ما زالا مفتوحين؛ snapshot المحلي ليس dump كاملًا.

#### 0.4 — فحص التفويض الفعلي
- **الحالة:** جزئية؛ إصلاح صور المنشور/المتفاعلين موجود على المشروع المضبوط، لكن البيئة staging أم production غير مؤكدة. RPCs أخرى تحتاج hardening واختبارًا آمنًا قبل أي نشر.
- **ما تم:**
  - كل الجداول الـ50 تمنح `anon` و`authenticated` كل امتيازات الجداول catalogيًا؛ RLS ما زال يقيّد عمليات الصفوف وفق السياسات، ولم يُختبر/يُنفذ `TRUNCATE`
  - Default ACL يمنح `anon` صلاحيات مباشرة على table/sequence/function تجريبية أنشأها `postgres` داخل transaction؛ rollback verified، وأُثبتت defaults لـ`supabase_admin` من catalog فقط
- **المشاكل المرصودة على المشروع المطابق:** migration `20261004141649_phase0_post_image_and_reactor_visibility.sql` موجودة في ledger، والسياسة والدالة الحيتان تعكسان الإصلاح المقصود. لا يثبت ذلك سلوك JWT أو خصوصية bytes؛ تصنيف البيئة staging/production لم يُحسم.
- **مراجعة RPCs:** `get_trainee_marathon_state` مملوكة لـ`postgres` و`SECURITY DEFINER` ومتاحة لـ`authenticated`؛ body لا يتحقق من `p_trainee_id` قبل قراءة submission/answers، و`v_is_self` لا يحجب إلا score/grade (وقد تُكشف `is_correct` بعد submission). `log_operational_event` كذلك متاحة لأي authenticated دون role check وتقبل حقول الحدث من العميل؛ `audit_logs` RLS مفعّل بلا FORCE، والدالة يملكها `postgres`. هذه نتائج static على المشروع المطابق؛ لم يُجرَ اختبار استغلال. أُعدت proposal محلية `20261004202345_harden_marathon_and_audit_rpcs.sql` واجتازت اختبار الشكل فقط؛ لم تُشغّل على PostgreSQL ولم تُطبق.
- **المتبقي:** حسم تصنيف البيئة قبل أي probe كتابي، ثم إكمال callers/roles ومراجعة باقي RPCs وdirect/default ACL ومصالحة DDL. لا تُختبر `TRUNCATE` ولا تُسحب grants دون تفويض واختبارات.

#### 0.5 — تتبع تدفقات الوسائط end-to-end
- **الحالة:** جزئية
- **ما تم (تحقق من المصدر المحلي):**
  - `frontend/src/app/gallery/page.tsx::handleUploadPhoto` يضيف `image_url` النصي مباشرةً إلى `gallery_items` عبر Supabase؛ لا يرسل بايتات.
  - `frontend/src/app/mp3/page.tsx::handleSaveTrack` يضيف `audio_url` النصي مباشرةً إلى `mp3_tracks`؛ لا يرفع ملفًا.
  - `frontend/src/app/books/page.tsx::handleSaveItem` يضيف `file_url` و`cover_url` إلى `books` أو `researches`؛ لا يرفع الملف.
  - `frontend/src/app/page.tsx::handlePublishPost` ينشئ `feed_posts` ثم يسجل `post_images` مع `image_url` و`storage_path` مولّد نصيًا؛ لا يرفع صورة المنشور.
  - `frontend/src/app/curriculum/page.tsx` يقرأ `curriculums.file_url` و`lectures.audio_url` وبيانات المرفقات؛ لم يظهر في نتائج الفحص مسار رفع لهذه الموارد.
  - الصور الرمزية تُقرأ من `profiles.avatar_url`/`lecturers.avatar_url` في واجهات العرض؛ لم يظهر مسار تحرير/رفع avatar ضمن البحث المنفذ.
  - `frontend/src/lib/api/php.ts` يعرّف عميلًا ويدعم `FormData`، لكن نتيجة البحث عن مستهلك `/storage/upload` لم تُظهر أي caller واجهة أمامية. لا نعد وجود helper أو route دليلًا على تدفق مستخدم.
  - `backend-api/public/index.php` يسجل `/storage/upload` و`/storage/delete`؛ `StorageController` يتحقق من الرفع ويحفظ على قرص PHP محلي. `ImportController` يخزن الملف ثم يستدعي RPC؛ backup له upload/restore مستقل.
  - `LectureAnnouncementService::publishWeeklyAnnouncement()` لا يظهر له call site؛ يستخدم table `feed_post_images` غير الموجودة حيًا (الموجودة `post_images` فقط)، وcolumns `post_type`/`metadata` غير موجودة في `feed_posts` الحي، كما يستدعي `StorageBridgeService::getPublicUrl()` غير المعرفة محليًا. يُعامل كمسار غير متصل/غير صالح للاعتماد، لا كتدفق منتج عامل.
  - البحث عن عناصر `type="file"` في الواجهة أظهر اختيار ZIP للاستعادة فقط؛ لا caller واجهة لـ`/storage/upload` أو`/storage/delete` أو`/import/trainees`.
- **الاستنتاج المحدود:** تدفقات Gallery وMP3 وBooks/Research وFeed الحالية تحفظ مراجع URL/metadata فقط؛ لا يوجد دليل مصدر على رفع بايتات هذه الموارد إلى PHP/Drive. تدفق PHP العام موجود لكنه غير موصول بواجهة ظاهرة في نتائج الفحص وغير مثبت على Hostinger.
- **ما بقي:** إثبات وجود الملفات والبايتات على Hostinger وقياس PHP limits؛ اختبار upload/read/delete/Range/auth على sandbox؛ وأي محاولة لتفعيل `LectureAnnouncementService` يجب أن تُحسم بعد مطابقة table/columns و`getPublicUrl()` أولًا. لا يُستنتج التشغيل من وجود route/class.

#### 0.6 — جرد البيانات بدون كشفها
- **الحالة:** جزئية؛ أُعيدت counts أدناه للقراءة فقط على المشروع المطابق للمضيف. لا تثبت وجود bytes ولا تصنيف البيئة.
- **ما تم:** جرد MCP verbose لـ50 جدولًا وكلها RLS=true؛ أُضيف query pack count-only قابل لإعادة التشغيل `scripts/verify_phase0_media_metadata_readonly.sql`. استعلام metadata read-only أثبت nonblank refs: books file 5/5 وcover 5/5، researches 5/5، curriculums 8/8، MP3 5/5، gallery_items 5/5، post_images image/path 10/10، backup paths 10/10، وimport paths 28/28. لا يوجد محتوى في 45 feed `images_metadata` أو 21 lectures `audio_url`/`attachments_metadata`؛ profiles avatars فارغة 50/50 وgallery album covers فارغة 5/5. لم تظهر orphan rows في `post_images` أو `gallery_items` (0/0). لا توجد صفوف soft-deleted في الجداول الـ11 التي تحمل `deleted_at`؛ `post_images` و`import_history` لا يحملان هذا العمود. لا تكشف الاستعلامات الروابط الكاملة.
- **المتبقي:** التحقق من وجود البايتات فعليًا وحجمها ونوعها وchecksum ومقارنة ذلك بمراجع metadata؛ يتطلب قراءة آمنة من Hostinger، ولا تُستنتج سلامة الملفات من وجود URL/path.

---

### قرارات المالك والوصول الخارجي

#### 0.1 — قرارات محسومة جزئيًا وما بقي منها

| القرار | الحالة الحالية | المطلوب |
|--------|----------------|----------|
| Google Account Type | محسوم | حساب Google شخصي؛ على المالك توثيق جهة الملكية والاسترداد |
| Drive Type | محسوم | My Drive |
| OAuth Scope | غير محسوم | أقل scopes تنجح في sandbox |
| File Ownership | جزئي | Drive شخصي؛ يلزم تحديد مالك الحساب ومسؤول الاسترداد ونقل الملكية |
| Private File Access | قرار معماري | PHP backend proxy؛ يلزم sandbox وrange/auth tests |
| Gallery scope | محسوم | `group_id IS NULL` = محتوى عالمي مقصود |
| Backup bytes location | محسوم | Google Drive الخاص |
| Cutover/rollback | غير محسوم | كيف نحفظ الملفات الجديدة بعد cutover؟ |

#### 0.2 (فحص Hostinger) — محجوب
- **السبب:** لا يوجد وصول للوحة التحكم أو FTP
- **المطلوب:**
  - جرد الملفات الفعلية في `/public_html` أو `/backend-api`
  - حدود الرفع (`upload_max_filesize`, `post_max_size`)
  - إعدادات PHP (`.user.ini`, `.htaccess`)
  - CORS config
  - مساحة القرص المستخدمة

#### 0.3 (Supabase catalog extraction) — جزئي؛ target identity غير مطابق
- **ما تم:** استُخرج سجل migrations والـ50 جدولًا/أعمدتها وRLS، وجُمعت أعداد السياسات والدوال والـtriggers والـindexes من المشروع المطابق لإعداد المستودع.
- **المتبقي:** جمع definitions الكاملة للقيود والـpolicies/RPCs/grants في artifact واحد قابل للمراجعة؛ `schema_live_snapshot.sql` الحالي يحوي function stubs وسياسات ناقصة ولا يُستخدم كـDDL.
- **ملاحظة:** الهوية الحالية مؤكدة على مستوى host فقط؛ لا تُطبق migrations حتى يتأكد تصنيف البيئة والـnormalized diff.

---

## النتائج الرئيسية

> **حد الدليل:** بيانات Supabase أدناه أعيدت قراءتها من المشروع الذي يطابق host `frontend/.env.local` بعد تأكيد المالك؛ لا تثبت وحدها أن البيئة staging أو production. نتائج الاختبارات المحلية منفصلة عن الحالة الحية.

### ✅ ما تحقق محليًا أو على مشروع Supabase المطابق لإعداد المستودع
1. **نتائج محدودة لا تثبت جاهزية الأمان:**
   - RLS مفعّل على 50/50 جدولًا في المشروع المطابق بحسب catalog؛ لا يثبت ذلك وحده سلامة السياسات أو بيئة النشر.
   - فحص الأسرار المحلي لم يجد credentials committed.
   - Exception masking وRate limiting اجتازا الاختبارات المحلية المذكورة؛ لا يثبتان حالة النشر.

2. **الاختبارات المحلية تعمل:**
   - Frontend: 98 test passing
   - Backend: 11 verification scripts passing
   - CI syntax مُصلح

3. **التوثيق موجود:**
   - `GOOGLE_DRIVE_STORAGE_PLAN.md`: خطة تفصيلية 10 مراحل
   - `GOOGLE_DRIVE_PHASE0_AUDIT.md`: تقرير المرحلة 0
   - `PROJECT_DOCUMENTATION.md`: وثائق المشروع

### ⚠️ المخاطر والفجوات

1. **Drift بين المحلي والحي:**
   - 69 إصدارًا في ledger المشروع المضبوط مقابل 30 ملفًا محليًا (28 تاريخيًا + proposal `media_assets` غير مطبقة + migration الإصلاح)
   - 40 سجلًا بلا اسم محلي مقابل، و20 اسمًا محليًا بإصدار مختلف؛ و9 تطابقات إصدار/اسم. قورنت دلاليًا migration الإصلاح فقط؛ لا يثبت ذلك تكافؤ بقية SQL.
   - **المتبقي:** استكمال normalized SQL diff ومطابقة schema/RPC/ACL قبل أي كتابة إنتاجية

2. **Default ACL وdirect ACL مفتوحان على نطاق واسع:**
   - `relacl`/`has_table_privilege` يؤكدان grants لكل امتيازات الجدول لـ`anon` و`authenticated` على كل الجداول الـ50، ومنها `TRUNCATE` و`MAINTAIN`; RLS يضبط عمليات الصفوف لكنه لا يحكم `TRUNCATE`
   - default ACL واسعة لكل من `postgres` و`supabase_admin`; probe السلوكي للكائنات الجديدة متاح لـ`postgres` فقط، و`supabase_admin` غير قابل للانتحال من MCP الحالي
   - **المخاطرة:** لا يثبت catalog وحده أن PostgREST يتيح `TRUNCATE`؛ لكن هذه grants توسع سطح الخطأ/الـRPC، لذلك لا تُعامل كإعداد آمن ولا تُسحب جماعيًا دون caller matrix واختبارات allow/deny
   - **الحل:** remediation مخططة لكنها غير مطبقة؛ تحتاج DDL reconciliation ومالكًا مخولًا، ولا تُنفذ عملية مدمرة

3. **`post_images`/`get_post_reactors` on the configured Supabase project:**
   - Before the historical fix on that target: anon SELECT policy existed and `get_post_reactors` exposed a reactor for a hidden post.
   - Migration `20261004141649` is present in the ledger; current read-only inspection confirms the policy/function shape. The earlier host mismatch was superseded after the owner provided the intended host, which now matches MCP and local configuration.
   - **Limit:** staging-versus-production classification, live JWT behavior, and privacy of externally hosted bytes remain unverified.

4. **تدفقات رفع الملفات غير مكتملة التحقق:**
   - عدة واجهات تحفظ `image_url`/`audio_url`/`file_url` كنصوص؛ PHP upload handler محلي يكتب إلى قرص التطبيق
   - لا caller أمامي مثبت لـ`/storage/upload` ولا تحقق على Hostinger؛ موقع البايتات الفعلي غير معلوم

5. **هوية اتصال Supabase غير مؤكدة:**
   - المالك وصف اتصال MCP بأنه staging، لكن `get_project_url` أعاد host مختلفًا عن `frontend/.env.local`؛ لا يمكن تأكيد أن MCP يستهدف staging التطبيق.
   - أُوقف أي استعلام حي أو كتابة جديدة بعد اكتشاف الاختلاف؛ قبل المتابعة يلزم تأكيد المالك للـproject ref/host الصحيح. لا تُطبق migrations على أي من الهدفين قبل حسم الهوية ومراجعة DDL.

---

## الخطوات التالية (حسب الأولوية)

### 🔥 Critical (يمنع إغلاق المرحلة أو الانتقال للإنتاج)

1. **استكمال catalog extraction من Supabase MCP للقراءة فقط:**
   ```bash
   # على جهاز المالك:
   supabase db dump --schema-only > schema_$(date +%Y%m%d).sql
   # أو:
   pg_dump --schema-only -h <host> ... > schema.sql
   ```
   **المتبقي:** مقارنة statements المتاحة لـ61 سجلًا بملفاتها المحلية. السجلات الثمانية الأخرى statements فيها NULL، لكنها تطابق ملفات محلية في الإصدار والاسم؛ نحتاج مقارنة SQL المحلي مع آثارها الحية دون افتراض التكافؤ. بعد ذلك تُستكمل مصالحة الـ20 version drift وتصنيف الـ40 live-only. الخطوات read-only؛ لا تُطبّق migrations.

2. **استكمال قرارات المالك واختبار Drive (جدول 0.1):**
   - حساب Google شخصي وMy Drive وموقع backup bytes على Drive: محسومة؛ توثيق المالك ومسؤول الاسترداد ما زال مطلوبًا
   - OAuth scopes وfile ownership/transfer وcutover/rollback: غير محسومة
   - PHP proxy هو الخيار المعماري؛ يلزم sandbox واختبار المصادقة وRange

3. **مراجعة remediation لـDefault ACL بعد المصالحة:**
   ```sql
   -- scripts/verify_phase0_default_acl_staging.sql is a rollback-only probe;
   -- it does not repair grants, and no persistent change was made.
   ```

### 🟡 High (يُحسّن الأمان)

4. **التحقق من remediation `post_images` و`get_post_reactors` على staging:**
   - migration `20261004141649_phase0_post_image_and_reactor_visibility.sql` طُبقت واختُبرت بـrollback probe؛ لا تُكرر DDL.
   - تبقى إعادة اختبار مصفوفة gallery/feed كاملة بـclaims مناسبة، ثم اختبار JWT حقيقية بعد تجهيز sandbox.

5. **إعادة اختبار cross-group access على staging بعد التغييرات:**
   ```sql
   -- scripts/verify_phase0_scope_staging.sql موجود
   ```

6. **إعادة اختبار `get_post_reactors` ضد deleted posts بعد إصلاح الحارس:**
   ```sql
   -- scripts/verify_phase0_reactor_scope_staging.sql موجود
   ```

### 🟢 Medium (يُكمل الجرد)

7. **جرد Hostinger:**
   - FTP/panel access
   - قائمة الملفات الفعلية
   - حدود الرفع وإعدادات PHP

8. **جرد بيانات الوسائط (counts only):**
   - أُضيف `scripts/verify_phase0_media_metadata_readonly.sql` لجرد المراجع وJSON shapes وorphans دون إظهار IDs/URLs أو قراءة البايتات.
   - أعداد المرجعيات موثقة في `docs/GOOGLE_DRIVE_PHASE0_AUDIT.md`؛ لا تزال مطابقة الملفات الفعلية والحجم/checksum محجوبة بوصول Hostinger.

9. **توثيق NULL/global semantics:**
   - محسوم بقرار المالك: `group_id IS NULL` في Gallery يعني محتوى عالميًا مقصودًا؛ الجرد الحي الحالي لا يحتوي صفوف Gallery بلا `group_id`.

---

## الحالة النهائية

**المرحلة 0: جزئية (2/8 مكتملة، 6/8 جزئية؛ host MCP يطابق إعداد المستودع والمigration الإصلاح موجودة في ledger، لكن staging/production غير محسومين وبقية المصالحة والتحقق لم تكتمل)**

### المكتمل:
- ✅ 0.7 جرد الشجرة
- ✅ 0.8 CI syntax
- ✅ التحقق المحلي (frontend + backend)

### المتبقي لإغلاق المرحلة:
- 🟡 0.1 نموذج الملكية/استرداد الحساب وOAuth scopes والوصول الخاص والـcutover → الحساب وMy Drive وموقع backup وNULL/global حُسمت؛ تبقى تفاصيل التشغيل والاختبار
- 🟡 0.2 قراءة DDL كاملة ومصالحة محتوى الـmigration → 61/69 statements تخص المشروع المطابق؛ snapshot جزئي والمقارنة الشاملة غير مكتملة، وبيئة النشر غير مصنفة.
- 🟡 0.3 مطابقة SQL/schema → الهوية حُسمت على مستوى host؛ بقي normalized diff الكامل ومراجعة statements/DDL لكل migration. المقارنة الدلالية المنفذة تخص migration الإصلاح فقط.
- 🟡 0.4 إغلاق التفويض → إصلاح `post_images`/`get_post_reactors` مؤكد read-only؛ فجوتا `get_trainee_marathon_state` و`log_operational_event` مؤكّدتان static على المشروع المضبوط. proposal محلية اجتازت shape check فقط؛ يلزم حسم البيئة واختبار allow/deny على PostgreSQL staging، وتبقى direct/default ACL وبقية RPCs مفتوحة.
- 🟡 0.5 تحقق المضيف والبايتات → يحتاج وصول Hostinger
- 🟡 0.6 جرد metadata مرجعي موثق؛ manifest وجود البايتات/الحجم/checksum ما زال محجوبًا بوصول Hostinger

**لا يمكن البدء في المراحل 1-9 قبل إغلاق المحجوبات أعلاه.**

---

## الملفات المُنتجة

```
docs/
  GOOGLE_DRIVE_PHASE0_AUDIT.md          (هذا الملف)
  GOOGLE_DRIVE_STORAGE_PLAN.md          (الخطة الكاملة 10 مراحل)
  PROJECT_DOCUMENTATION.md               (وثائق المشروع)

scripts/
  verify_phase0_default_acl_staging.sql (probe rollback-only؛ لا يصلح grants)
  verify_phase0_scope_staging.sql        (cross-group tests)
  verify_phase0_reactor_scope_staging.sql (RPC deleted-post test)
  verify_phase0_media_metadata_readonly.sql (count-only inventory)
  verify_failure_disclosure.php          (exception masking)
  _failure_disclosure_child.php          (helper)

backend-api/src/Controllers/
  SafeFailure.php                        (refuse() / failVisibly())

.github/workflows/
  ci.yml                                 (YAML مُصلح)
```

**Commit تاريخي:** `2b3b1ca` — fix(ci): correct YAML indentation. آخر فحص محلي: الفرع `main` بلا ahead/behind مقابل `origin/main` المخزن مؤقتًا؛ لم يحدث fetch أو push، لذلك حالة remote الحالية غير مؤكدة.
**تاريخ تحديث الحالة:** 2026-10-04
**المُدقق:** Hermes Agent
