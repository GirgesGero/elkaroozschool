# خطة نقل تخزين الملفات إلى Google Drive

> **الحالة:** المرحلة 0 قيد التنفيذ؛ لا تكامل Google Drive ولا نقل ملفات. host Supabase MCP طابق إعداد المستودع والمضيف الذي أكده المالك؛ تصنيف البيئة staging/production لا يزال غير محسوم. migration `20261004141649` موجودة في ledger، وproposalا `media_assets` وRPC hardening غير مطبقين.
> **تنبيه اتصال Supabase — 4 أكتوبر 2026:** أُعيدت قراءات catalog/ledger/metadata للقراءة فقط على المشروع المطابق. لا تُجرَ كتابة دائمة أو probe مؤقت قبل حسم نوع البيئة والمراجعة.
> **تاريخ إعداد الخطة:** 3 أكتوبر 2026.
> **النطاق:** تحويل التخزين الحالي إلى Google Drive مع إبقاء Next.js للواجهة، وSupabase Auth/PostgreSQL/RLS للهوية والبيانات والـmetadata، وPHP المستضاف على Hostinger بوابةً موثقة ومصرحًا لها لعمليات الملفات.
> **المرجع الحالي:** [توثيق المشروع المبني على المصدر](PROJECT_DOCUMENTATION.md).

---

## 1. النتيجة المستهدفة وحدودها

```text
Next.js / PWA
  ├── Supabase Auth + PostgreSQL + RLS
  │     └── users, roles, groups, business data, file metadata
  └── Supabase JWT ──HTTPS──> PHP API على Hostinger
                               └── Google Drive خاص للملفات
```

- يظل Supabase مصدر الحقيقة للمستخدمين والأدوار والمجموعات والبيانات والصلاحيات. لا تنقل مصادقة المستخدمين أو منطق الحضور والامتحانات والماراثون والموجز والإشعارات ضمن هذا العمل.
- يستخدم PHP للعمليات التي تحتاج سر Google أو رفع/قراءة/حذف ملف أو معالجة/تدقيق عملية تخزين. تظل استعلامات البيانات التي يحميها RLS مباشرةً عبر Supabase متى كان ذلك آمنًا وموافقًا للعقد الحالي.
- لا تُعرَض ملفات Drive للعامة لمجرد تسهيل عرضها، ولا يُعامل `drive_file_id` أو `drive_folder_id` الوارد من المتصفح كإثبات ملكية أو صلاحية.
- الخطة لا تعتمد نوع حساب Google أو طريقة OAuth أو نوع Drive أو صلاحية OAuth قبل حسمها بالدليل واختبارها.
- لا يتغير منطق الأعمال أو مصفوفة الأدوار إلا بالقدر الضروري لربط الملف بمالكه/مجموعته، وبعد توثيق القرار واختبار عدم تغيير الصلاحيات المقصودة.

## 2. خط أساس مرصود من المستودع

هذه ملاحظات من الملفات الحالية، وليست إثباتًا لحالة الاستضافة الحية:

| المجال | المرصود الآن | دليل المصدر |
|---|---|---|
| موفر الملفات | `StorageBridgeService` يكتب ويحذف من قرص PHP المحلي؛ يبني `file_url` من `STORAGE_PUBLIC_URL`. لم يظهر تكامل Google Drive أو حقلا `drive_file_id`/`drive_folder_id` في بحث المصدر الحالي. | `backend-api/config/storage.php`, `backend-api/src/Services/StorageBridgeService.php`, `backend-api/src/Controllers/StorageController.php` |
| حماية عمليات التخزين | الرفع يتحقق من JWT والدور ونطاق المجموعة وملف الرفع؛ الحذف الحالي يقبل `file_path` من جسم الطلب ويطبق خدمة حذف محلية. يجب أن يحل التصميم الجديد مورد الملف من سجل موثوق في قاعدة البيانات بدل قبول Drive ID/مسار كمرجع صلاحية من العميل. | `backend-api/src/Controllers/StorageController.php`, `backend-api/src/Middleware/JwtAuthMiddleware.php`, `GroupScopeMiddleware.php`, `FileSecurityMiddleware.php` |
| ملفات تعليمية ومكتبية | `curriculums.file_url`; `lectures.audio_url` و`lectures.attachments_metadata`; `books.file_url` و`cover_url`; `researches.file_url`; `mp3_tracks.audio_url`. | `supabase/migrations/005_academic_terms_lectures.sql`, `011_library_media.sql` |
| معرض وموجز وصور شخصية | `gallery_albums.cover_url`, `gallery_items.image_url`, `feed_posts.images_metadata` بصيغة JSONB، `profiles.avatar_url`، و`lecturers.avatar_url`. | `003_profiles_auth_mapping.sql`, `005_academic_terms_lectures.sql`, `009_feed_social.sql`, `011_library_media.sql` |
| العزل | في المصدر المحلي ترتبط عدة موارد بـ`group_id`، لكن migrations المحلية التي فُحصت لا تتضمن `group_id` للمعرض. على MCP target غير المطابق، أظهر catalog أن `gallery_albums` و`gallery_items` يحتويان `group_id` وسياسات المجموعة؛ وأظهرت سياسات `books` و`researches` قراءة للمصادقين بلا شرط مجموعة. هذه النتائج لا تُنسب لقاعدة التطبيق. قرار `group_id IS NULL` كمحتوى عالمي محفوظ. سياسة `post_images` العامة عولجت تاريخيًا على MCP target فقط؛ لا يمكن تأكيد البيئة أو أثر production قبل حسم mismatch. يلزم reconciliation قبل أي تغيير. | migrations المحلية المذكورة في العمود السابق؛ تقارير المرحلة 0 وmigration `20261004141649` على MCP target |
| النسخ والاستيراد | `backup_records.storage_type` افتراضيًا `HOSTINGER` وله `storage_path`; `import_history.original_file_storage_path` يحفظ مسار الملف الأصلي. لا يجوز إسقاط هذين التدفقين من تصميم النقل. | `supabase/migrations/013_audit_backup_import.sql` |
| إعداد الملفات | حدود المصدر الأولية هي avatar/feed/pdf/mp3/backup، لكن `StorageController` يمرر `folder_type` إلى فحص الحجم مباشرة؛ فئات مثل `users`, `curriculum`, `lectures`, `books`, `research`, `gallery` لا تطابق المفاتيح وتستخدم fallback قدره 20 MiB. هذه قراءة للكود المحلي فقط، وحدود PHP/Hostinger الفعلية غير مقاسة. | `backend-api/config/storage.php`, `backend-api/src/Middleware/FileSecurityMiddleware.php`, `backend-api/src/Controllers/StorageController.php` |
| فحص البيئة الحية | المشروع المطابق: 69 إصدارًا، 50 جدولًا وRLS على 50/50، 90 policy، 79 routine، 24 trigger، 36 index غير primary؛ statements موجودة في 61/69. البيئة staging/production غير مصنفة. | `schema_live_snapshot.sql` جزئي وغير قابل لإعادة التشغيل. Vercel وHostinger غير متحققين مباشرةً؛ لا كتابة أو deployment في هذا التحديث. |
| إعداد Google | لا يوجد في ملفات المستودع التي فُحصت اختيار موثق لنوع حساب Google أو طريقة المصادقة أو صلاحيات OAuth أو ملكية الملفات. | فحص ملفات الإعداد و`backend-api` و`supabase/migrations` في 3 أكتوبر 2026 |

**أثر خط الأساس الحي:** لا يصح استنتاج حالة Supabase من migrations المحلية وحدها. المعرض مقيّد بالمجموعة في schema/RLS الحيين رغم غياب الأعمدة عن migrations المحلية المفحوصة؛ المكتبة مقروءة عالميًا للمصادقين وفق السياسات الحية؛ وصور Feed لها سياسة `SELECT TO public USING (true)` أوسع من قراءة المنشور. لا تُغيّر هذه الحدود ضمن النقل قبل reconcile واختبار السلوك المقصود.

## 3. قواعد التنفيذ غير القابلة للتجاوز

1. كل مرحلة تبدأ بفحص واعتماد مخرجات المرحلة السابقة؛ لا تجرِ تغييرًا على production لمجرد أن التصميم يبدو مكتملًا.
2. لا أسرار أو مفاتيح أو tokens فعلية في Git أو الواجهة أو الوثائق أو سجل الاختبار. توثق أسماء المتغيرات ومكان حفظها فقط، وتُستخدم آلية آمنة لإدخالها على Hostinger.
3. الرفض يكون افتراضيًا: JWT غير صالح/منتهي، مستخدم معطل، دور غير مخول، مورد غير موجود، أو نطاق مجموعة غير مطابق لا يصل إلى Drive.
4. هوية المستخدم والدور والمجموعة تُستخرج أو تُراجع على الخادم من JWT موثوق وبيانات Supabase. لا تثق في `user_id`, `role`, `group_id`, `drive_file_id` أو `drive_folder_id` لمجرد ورودها من المتصفح.
5. قبل الكتابة إلى Drive: تحقق من MIME الفعلي/توقيع الملف حيث ينطبق، الامتداد والاسم والحجم، الفئة، المجموعة، والصلاحية. لا تضف أنواع ملفات غير مطلوبة من تدفقات النظام القائمة.
6. عملية رفع ناجحة تتطلب تأكيد حفظ metadata في Supabase وتسجيل التدقيق. إذا فشل الحفظ بعد الرفع، تُزال النسخة اليتيمة أو تُسجل في طابور معالجة موثوق قابل لإعادة المحاولة؛ لا تُعرض نجاحًا جزئيًا.
7. كل نقل ملفات قابل لإعادة المحاولة ومُسجل بمعرّف عملية، مع manifest وحالة لكل ملف. لا تُحذف نسخة Hostinger أثناء النقل أو الاختبار.
8. لا يُعلن `READY` قبل اكتمال بوابة الإنتاج والقائمة النهائية في القسم 14 بدليل قابل لإعادة التحقق.
9. تبقى استضافة PHP على Hostinger وNext.js على Vercel وSupabase للهوية/البيانات، ما لم يقرر مالك المشروع خلاف ذلك بعد تحليل موثق.

## 4. مراحل التنفيذ والمهام

### المرحلة 0 — تثبيت خط الأساس وجرد تدفقات الملفات

**الهدف:** معرفة كل ملف ومصدره ووجهة استعماله قبل اختيار تصميم قاعدة البيانات أو تعديل API.

**تعتمد على:** لا شيء.
**المهام:**

| المعرّف | المهمة التفصيلية | مخرج/معيار قبول |
|---|---|---|
| 0.1 | جرد كل call site في الواجهة وPHP للرفع والعرض والتنزيل والحذف والاستبدال، بما يشمل Gallery وMP3 وBooks وResearch وCurriculum وLecture audio/attachments وFeed وavatars وlecture-announcement images. | جدول لكل نوع ملف: صفحة/مكوّن → query/endpoint → حقل metadata → عملية القراءة/الكتابة؛ وكل مسار غير موصول معلّم صراحةً. |
| 0.2 | استخدم اتصال Supabase MCP للقراءة فقط لمطابقة هوية المشروع مع إعدادات المستودع، ثم قارن سجل migrations الحي بالـmigrations المحلية وافحص schema/RLS/RPC/grants من `pg_catalog` دون قراءة بيانات شخصية أو إجراء كتابة. إن لم يطابق المشروع المتوقع، أوقف الفحص واسأل عن المشروع الصحيح؛ استخدم staging للاختبارات التي تحتاج كتابة. | تقرير schema diff مؤرخ بلا بيانات شخصية أو أسرار، وحالة تطابق/اختلاف كل migration وسياسة/دالة لازمة، وقائمة الفروقات المفتوحة. |
| 0.3 | جرد صفوف metadata ومراجع الملفات الحالية ومجلدات PHP بأقل قدر لازم من البيانات؛ احسب إجمالي الحجم/العدد والأنواع والأحجام القصوى دون نسخ ملفات المستخدمين إلى Git. | manifest أولي موحد مع مصدر الملف ومعرّف صفه وحالته وحجمه وchecksum عند إمكان قراءة البايتات؛ لا تُخترع أعدادًا قبل المسح الفعلي. |
| 0.4 | حسم scope لكل resource من قواعد الأعمال الحالية: group-scoped، global، user-owned أو موروث من parent؛ ركز على gallery albums/items وfeed وlecturers وavatars. | مصفوفة scope مع دليل RLS/الـqueries/المتطلب؛ كل صف غير محسوم يصبح مانعًا للتنفيذ. |
| 0.5 | قياس حدود الرفع الفعلية: allowlist والحجم حسب `FileSecurityMiddleware` و`config/storage.php` وPHP `upload_max_filesize`/`post_max_size` وحدود Hostinger. | مصفوفة limits موقعة؛ تميّز بين الإعداد المرصود والحد الفعلي على Hostinger. |
| 0.6 | حصر الملفات اليتيمة، الروابط الخارجية/العامة، الصفوف ذات URLs المفقودة، صيغ metadata JSON الحالية، وسلوك soft-delete. | تقرير حالات استثنائية وخطة معالجة لكل فئة قبل أي migration. |
| 0.7 | تسجيل baseline لأوامر build/typecheck/tests وفحوص PHP/security الحالية ونتائجها كما نُفذت. | أوامر ومخرجات/exit codes مؤرخة؛ لا تُنسب نتيجة سابقة إلى تشغيل جديد. |
| 0.8 | فحص أسماء إعدادات الأسرار والـ`.gitignore` ومسارات نشر PHP دون طباعة قيم الأسرار. | قائمة أسماء متغيرات ومواقع الإعداد المطلوبة؛ لا قيمة سرية في التقرير. |

**بوابة الخروج:** اعتماد inventory للموارد، وscope كل نوع ملف، وخط أساس يمكن مقارنة ما بعد التنفيذ به. أي عدم وضوح في مجموعة معرض أو طريقة الوصول يوقف المرحلة التالية.

### سجل تنفيذ المرحلة 0 — 4 أكتوبر 2026

| المهمة | الحالة الحالية | الدليل/المتبقي |
|---|---|---|
| 0.1 جرد مسارات الملفات | `PARTIAL` (مصدر محلي متتبع) | Gallery/MP3/Books/Research/Feed تحفظ URLs/metadata؛ curriculum وavatars عرض فقط؛ اختيار الملفات الوحيد في الواجهة لاستعادة ZIP. لا caller ظاهر لـ`/storage/upload`, `/storage/delete`, `/import/trainees`. `LectureAnnouncementService` بلا call site ويشير إلى `feed_post_images` غير الموجود حيًا وحقول/طريقة غير متاحة. المتبقي: ملفات/إعدادات Hostinger وسلوك deployment الفعلي. |
| 0.2 مطابقة Supabase | `PARTIAL` | على المشروع المطابق: 69 إصدارًا حيًا، 31 ملف migration، 61/69 statements؛ 9 exact، و40 live-only و20 version drift. فحص 37 `SECURITY DEFINER`: `anon=0`, `authenticated=28`, `service_role=37` وجميعها لها `search_path`. البيئة غير مصنفة؛ snapshot غير كامل ومراجعة bodies وACL/RPCs مفتوحة. |
| 0.3 جرد الملفات | `BLOCKED` جزئيًا | `backend-api/storage/` المحلي يحوي `.htaccess` فقط؛ جرد Hostinger البعيد غير متاح. |
| 0.4 scope | `PARTIAL` | إصلاح `post_images`/`get_post_reactors` موجود في ledger المشروع المطابق؛ فجوتا `get_trainee_marathon_state` و`log_operational_event` نتائج static. proposal hardening محلية اجتازت shape check فقط، ولم تُختبر على PostgreSQL أو تُطبق. تبقى role matrix وdirect/default ACL وبقية RPCs وDDL، مع حسم نوع البيئة. |
| 0.5 limits | `PARTIAL` | قُرئت الحدود المحلية وظهر عدم تطابق لبعض `folder_type` مع مفاتيح الحجم؛ قيم PHP/Hostinger الحية غير معروفة. |
| 0.6 الروابط والملفات اليتيمة | `PARTIAL` | أعداد URL/JSON وorphan/soft-delete من MCP target فقط، وهو غير مطابق لإعداد المستودع؛ لا تُنسب هذه الأعداد للتطبيق قبل تأكيد المالك. البايتات/الحجم/checksum غير متحققة، وHostinger غير متاح. |
| 0.7 خط أساس الاختبارات المحلية | `COMPLETE` محليًا | في 4 أكتوبر 2026: typecheck و98/98 Vitest؛ environment 9/9، security 115/115، storage 62/62، failure disclosure 11/11، credential leaks 4/4، error leaks 36 ملفًا/0 تسرب، و`git diff --check` ناجح. لا تثبت تكامل Drive أو النشر. |
| 0.8 الأسرار ومسارات النشر | `PARTIAL` | فحص Git/archives و`.gitignore` محليًا؛ إعدادات Vercel وHostinger وlogs الحية غير متاحة. |

طُبقت migration واحدة دائمة على Supabase staging بإذن المالك؛ لم تُكتب على production أو Vercel ولم يُنقل أي ملف. شجرة Git تحتوي تغييرات غير committed سابقة؛ لا تُستبدل.

### المرحلة 1 — قرارات Google Drive وتصميم التهديدات

**الهدف:** إغلاق القرارات التي لا يمكن استنتاجها من المستودع، دون إنشاء credentials أو مشاركة الملفات للعامة.

**تعتمد على:** مخرجات المرحلة 0.
**المهام:**

| المعرّف | المهمة التفصيلية | مخرج/معيار قبول |
|---|---|---|
| 1.1 | تحديد نوع حساب Google المملوك للمشروع والجهة المالكة للملفات وإمكانية استعادتها عند مغادرة مسؤول فردي. | توثيق `Google Account Type` ومالك الحساب ومسؤول الاسترداد؛ إن لم يُحسم، الحالة `BLOCKED`. |
| 1.2 | مقارنة OAuth 2.0 وserver-to-server/service account والبدائل المتاحة للحساب المختار، بما يشمل دعم الرفع والوصول للمجلدات ومشاركة الملكية. | ADR يشرح الاختيار وأسباب رفض البدائل، مع تحقق من الوثائق الرسمية وتجربة sandbox. لا يُفترض Gmail شخصي أو Workspace أو Service Account. |
| 1.3 | تحديد نوع Drive (My Drive أو Shared Drive إن كان متاحًا) وبنية الملكية والمشاركة والاستعادة. | توثيق `Drive Type` و`File Ownership Model` ومسؤولية نقل الملكية/إلغاء وصول موظف. |
| 1.4 | اختبار أقل OAuth scopes ممكنة، ومنها تقييم صلاحية `drive.file` فقط إن كانت ملائمة فعلًا لطريقة إنشاء/اختيار المجلدات والملفات. | توثيق `OAuth Scope` مع دليل اختبار العمليات المطلوبة؛ لا تُستخدم صلاحية Drive كاملة دون مبرر موثق. |
| 1.5 | اختيار وصول الملفات الخاصة: PHP proxy/stream أو آلية مؤقتة قصيرة العمر إذا دعمتها المعمارية المختارة. | قرار يشرح حماية رابط الملف، انتهاء الصلاحية، منع مشاركة URL عام، وتجربة `<img>`, PDF viewer وMP3. |
| 1.6 | تصميم شجرة المجلدات المنطقية للمدرسة والمجموعات والفئات، واستخدام معرفات Drive الداخلية في mapping موثوق لا أسماء المجلدات وحدها. | رسم هيكل ومصفوفة mapping؛ لا تُنشأ مجلدات production بعد. |
| 1.7 | تحديد سياسة التخزين والاحتفاظ للنسخ الاحتياطية وملفات الاستيراد والـtemporary/orphan files: Drive أو Hostinger أو وجهة أخرى. | ADR منفصل يوضح ما يدخل في `FULL_SYSTEM`/`FILES_ONLY`/`DATABASE_ONLY`، والاحتفاظ والتشفير والاستعادة. |
| 1.8 | تحديد حدود مسؤولية Supabase المباشر مقابل PHP، وسجل التدقيق، ومعدلات الطلب، وأخطاء المستخدم مقابل تفاصيل اللوج. | مخطط تسلسل وthreat model يغطي سرقة JWT، تجاوز المجموعة، replay، إساءة الرفع، Google API failure وتسرب URL. |

**بوابة الخروج:** اعتماد المالك لنوع الحساب، طريقة المصادقة، Drive، الصلاحيات، نموذج الوصول، ومكان النسخ. لا تبدأ المرحلة 2 إذا بقي أحدها تخمينًا.

### المرحلة 2 — عقد الملفات ونموذج metadata/RLS

**الهدف:** تصميم علاقة ثابتة بين سجل العمل والملف، من دون فرض schema غير ملائم على الجداول الحالية.

**تعتمد على:** المرحلتان 0 و1.
**المهام:**

| المعرّف | المهمة التفصيلية | مخرج/معيار قبول |
|---|---|---|
| 2.1 | مقارنة خيار جدول `media_assets` موحد بخيار إضافة metadata مرجعية إلى الجداول الحالية؛ قرر بناءً على JSON metadata الحالية، المشاركة، soft delete، وملكية الملفات. | ADR لنموذج البيانات؛ لا تُنشأ migration قبل اعتماد القرار. |
| 2.2 | تعريف العقد الأدنى للملف: resource/table + record ID، provider، `drive_file_id` و`drive_folder_id` إن لزما، الاسم، MIME، الحجم، الفئة، uploader، timestamps، checksum، الحالة، soft-delete، group/owner scope. | schema proposal يوضح nullability والقيود والفهارس والـforeign keys؛ حقول Drive سرية تشغيليًا ولا تُعرض بلا حاجة للواجهة. |
| 2.3 | رسم mapping لكل حقل قديم إلى النموذج الجديد، بما فيه `file_url`, `image_url`, `audio_url`, `cover_url`, `attachments_metadata`, `images_metadata`, `avatar_url` ومسارات backup/import. | جدول تحويل كامل؛ لكل حقل قرار: ترحيل/اشتقاق/توافق مؤقت/إزالة مؤجلة. |
| 2.4 | reconcile علاقة المجموعة المرصودة حيًا للمعرض (صفوف مرتبطة بمجموعة، و`group_id IS NULL` عالمي في السياسات بقرار المالك) مع migrations المحلية، ثم اختبارها دون توسيع/تضييق قواعد المنتج. | migration متوافقة واختبارات RLS قبل/بعد؛ لا يُستنتج `group_id` من طلب المتصفح وحده ولا يُغيّر معنى NULL بلا اعتماد. |
| 2.5 | كتابة migrations متوافقة للخلف وقابلة للتطبيق على staging، مع سياسات RLS وقيود النزاهة المطلوبة. | migrations جديدة فقط، تطبيق على نسخة staging، rollback/restore proof، وجرد policy لكل operation. |
| 2.6 | توليد/تحديث أنواع TypeScript من المخطط بعد تطبيقه على بيئة الاختبار. | `frontend/src/types/supabase.ts` يطابق الـschema الفعلي؛ typecheck ناجح. |
| 2.7 | تعريف حالات دورة الملف (pending/uploaded/metadata_saved/failed/deleted أو حالات مكافئة معتمدة) وآلية تعويض الرفع الجزئي. | state diagram وقواعد انتقال واختبارات عدم الإبلاغ عن نجاح جزئي. |
| 2.8 | تثبيت عقد metadata API وإخفاء المفاتيح الداخلية والروابط غير الآمنة من استجابات العميل. | أمثلة JSON منقحة للنجاح والخطأ وpermission-denied؛ لا secrets أو روابط عامة. |

**بوابة الخروج:** migration تجريبية وتغطية RLS بالـrole matrix وقرار لا يغير أدوار أو منطق أعمال خارج ربط الملفات.

### المرحلة 3 — موفر Google Drive في PHP والتحقق الأمني

**الهدف:** وضع تكامل Drive خلف seam داخل PHP، بحيث لا تتعامل الواجهة مع Google SDK أو credentials.

**تعتمد على:** المرحلة 2 وقرارات الحساب في المرحلة 1.
**المهام:**

| المعرّف | المهمة التفصيلية | مخرج/معيار قبول |
|---|---|---|
| 3.1 | تحديد متطلبات مكتبة Google/API المتوافقة مع PHP وإصداره واستضافة Hostinger وطريقة المصادقة المختارة؛ تحقق من composer package والامتدادات وحدود shared hosting. | تقرير توافق واختبار اتصال sandbox؛ لا اعتماد على shell/background process غير متاح على الاستضافة. |
| 3.2 | بناء module/adapter للتخزين بواجهة داخلية صغيرة (upload/read/stream/delete/metadata) ومحول Google Drive منفصل عن controllers. | اختبارات unit عبر fake adapter، ولا توجد Google calls مباشرة داخل صفحات/Controllers متعددة. |
| 3.3 | تحميل الاعتمادات من server-side environment/ملفات محمية خارج `public/`؛ إعداد rotation/revoke دون إظهار قيمها. | تعليمات إعداد وتشغيل، وفحص package/config/Git يثبت عدم وجود credential حقيقي في bundle أو المستودع. |
| 3.4 | تنفيذ JWT validation عند كل endpoint حساس، بما يشمل signature/algorithm/expiration والهوية وحالة المستخدم وفق العقد المعتمد. | اختبارات token صالح/منتهي/مزور/خوارزمية مرفوضة/مستخدم موقوف؛ لا قبول للـpayload غير الموثق. |
| 3.5 | تطبيق RBAC ثم authorization على سجل الملف ومجموعته/مالكه/سياق المنشور بعد lookup من Supabase. | مصفوفة دور × عملية × scope؛ Group 1 لا يقرأ/يكتب/يحذف ملف Group 2. |
| 3.6 | تطبيق تحقق مركزي من الاسم وMIME الفعلي والتوقيع والحجم والامتداد والقائمة حسب فئة المورد، مع الحفاظ على حدود الاستخدام المطلوبة. | اختبارات امتداد مضلل، MIME مزور، اسم traversal، ملف فارغ/تالف وحجم متجاوز. |
| 3.7 | جعل upload idempotent أو قابلاً للتعويض، مع التعامل مع فشل Google قبل/بعد إنشاء الملف وفشل قاعدة البيانات بعد الرفع. | اختبارات فشل مرحلية تثبت عدم وجود نجاح كاذب أو orphan غير مسجل/غير قابل للتنظيف. |
| 3.8 | إضافة audit للأحداث المهمة وrequest ID ولوج منقح، وإضافة rate limit لـupload/delete/stream/backup/restore حسب تكلفة العملية. | اختبارات 401/403/404/429، ومراجعة logs لا تحتوي JWT أو أسماء شخصية غير لازمة أو credentials. |

**بوابة الخروج:** تشغيل PHP unit/integration tests على fake وDrive sandbox، مع إثبات authz وgroup scope قبل السماح لأي controller بعملية Drive.

### المرحلة 4 — API وصول الملفات وStreaming

**الهدف:** إتاحة الملف لمستخدم مخول دون جعل Drive public أو كشف credentials.

**تعتمد على:** المرحلة 3.
**المهام:**

| المعرّف | المهمة التفصيلية | مخرج/معيار قبول |
|---|---|---|
| 4.1 | اعتماد routes وعقود upload/read/stream/delete/replace/metadata وربط كل route بـmiddleware محدد. | جدول routes وطرق HTTP وحقول الطلب/الاستجابة/الأدوار/الأخطاء؛ أي route غير مطلوب لا يُنشأ. |
| 4.2 | في الحذف والاستبدال، استقبل resource ID من النظام ثم ابحث في Supabase وتحقق من الملكية/المجموعة؛ لا تحذف اعتمادًا على `drive_file_id` أو `file_path` من العميل. | اختبار يغير IDs يدويًا ويثبت عدم حذف أي ملف خارج المورد المصرح به. |
| 4.3 | تنفيذ private read/stream عبر PHP أو الآلية المؤقتة المعتمدة مع عدم إرجاع credential أو رابط Drive دائم. | طلب بلا JWT مرفوض؛ رابط مؤقت (إن اختير) محدود العمر والسياق، أو stream عبر PHP. |
| 4.4 | دعم ترويسات MIME و`Content-Disposition` الصحيحة، وطلبات range/206 اللازمة لتشغيل MP3 عند اختيار proxy. | اختبار player seek/range وملف PDF وصورة على متصفحات الدعم. |
| 4.5 | ضبط CORS إلى origins الفعلية وHTTPS/security headers، وتحديد أخطاء Google/Supabase العامة الآمنة مقابل logs الداخلية. | اختبار preflight وorigin غير مسموح؛ لا stack traces ولا مسارات داخلية في الاستجابة. |
| 4.6 | تعريف cache policy خاصة بالملفات المصادق عليها، وعدم وضع JWT أو محتوى خاص في CDN/shared cache/PWA Cache. | اختبار Cache-Control وService Worker يثبت عدم تخزين محتوى مستخدم خاص بعد logout/تبديل الحساب. |
| 4.7 | توحيد استجابات الأخطاء والـcorrelation ID والتعامل مع timeout/quota/network failure من Google. | العقد يميز 400/401/403/404/413/429/502/503 دون كشف تفاصيل داخلية. |

**بوابة الخروج:** كل route يختبر أمنيًا؛ الصور وPDF والصوت تُعرض من التطبيق فقط ولا تحتاج فتح Google Drive للمستخدم.

### المرحلة 5 — ربط واجهة Next.js/PWA بكل مسارات الوسائط

**الهدف:** استبدال إدخال/استخدام روابط التخزين القديمة بتكاملات فعلية مع API الجديد مع الحفاظ على UX وقواعد المجال.

**تعتمد على:** عقد metadata في المرحلة 2 وAPI في المرحلة 4.
**المهام:**

| المعرّف | المهمة التفصيلية | مخرج/معيار قبول |
|---|---|---|
| 5.1 | بناء عميل PHP API موحد يمرر Supabase JWT ويعالج أخطاء HTTP و`payload.status` دون تكوين Google client في المتصفح. | اختبارات العميل/الأخطاء؛ لا `NEXT_PUBLIC_*` يحتوي سر Google أو خدمة Supabase. |
| 5.2 | دمج upload/view/delete للـGallery وصور الغلاف مع album/scope المعتمدين. | E2E album CRUD/media read، وتحقق مجموعة شامل. |
| 5.3 | دمج رفع وتشغيل/seek وحذف MP3 مع سجل `mp3_tracks` والصلاحيات القائمة. | اختبار متصفح فعلي للرفع والعرض والـseek والتبديل بين مجموعتين. |
| 5.4 | دمج curriculum files وlecture audio/attachments والصور المستخدمة في إعلانات المحاضرات والقوالب/النشر في Feed. | سيناريو end-to-end يحافظ على موعد ومحاضر ومجموعة ومنع duplicate كما هو معرف في المنتج. |
| 5.5 | دمج كتب وبحوث وقراءة PDF/cover، مع تطبيق scope الحالي لكل صف وعدم تحويلها إلى عامة تلقائيًا. | اختبار إنشاء/قراءة/استبدال/soft delete واستعادة مع group matrix. |
| 5.6 | دمج `feed_posts.images_metadata` بصورة مرتبطة بالمنشور وتحقق صلاحية قراءة المنشور قبل الصورة. | صورة غير متاحة عند عدم السماح بقراءة المنشور؛ إنشاء المنشور/التعديل/الحذف لا يغير قواعد الـFeed. |
| 5.7 | تقرير اعتماد صور `profiles.avatar_url` و`lecturers.avatar_url`: نوع الوصول ومدة cache والخصوصية، ثم ربطهما إن كانا ضمن القرار. | لا avatar عام غير مقصود؛ الصور الشخصية مرتبطة بهوية/سجل موثوق. |
| 5.8 | فحص Service Worker وmanifest وأي caching/download/offline behavior وإزالة cache للملفات المحمية. | اختبار بعد logout وتبديل المستخدم يثبت عدم ظهور ملف الجلسة السابقة. |
| 5.9 | إظهار progress/failure/retry ورسائل مفهومة للرفع والقراءة والحذف دون fake success. | اختبارات نجاح وفشل الشبكة وDrive/RLS؛ المستخدم يرى نتيجة العملية الحقيقية فقط. |

**بوابة الخروج:** كل صفحة/مكوّن ظهر في inventory بالمرحلة 0 إما مربوط ومختبر، أو موثق كمسار غير مستخدم مع قرار صريح.

### المرحلة 6 — النسخ والاستعادة والاستيراد وسجل التدقيق

**الهدف:** إبقاء النسخ والاستعادة والاستيراد متوافقة مع موفر الملفات الجديد ومن دون فقد بيانات.

**تعتمد على:** قرارات المرحلة 1 وعقد metadata/API في المراحل 2–4.
**المهام:**

| المعرّف | المهمة التفصيلية | مخرج/معيار قبول |
|---|---|---|
| 6.1 | تعريف الفرق بين نسخة DB فقط وملفات فقط ونسخة النظام كاملة؛ قرر هل تحفظ bytes نفسها أم manifest/IDs أو كليهما حسب متطلبات الاستعادة. | ADR ونموذج restore يحدد ما الذي يمكن استعادته إلى Drive نفسه أو حساب/Drive جديد. |
| 6.2 | تحديث backup manifest ليتضمن معرفات الملفات وchecksums/الحجم/scope وروابط metadata المطلوبة دون تضمين أسرار أو روابط عامة. | schema manifest versioned مع توافق/رفض صريح للنسخ القديمة. |
| 6.3 | ضمان أن `backup_records` يسجل provider والحالة والموقع بمعنى صحيح، وأن ملفات النسخ نفسها لها سياسة خاصة معتمدة. | اختبار record مقابل مكان الملف الحقيقي؛ لا قيمة `HOSTINGER` لملف صار في Drive. |
| 6.4 | تحديث restore preview/execute للتحقق من manifest/files/group mapping قبل أي كتابة، مع safety snapshot وrollback/compensation مناسب. | restore staging round-trip ناجح وفشل متعمد يعيد DB/metadata والملفات لحالة سليمة. |
| 6.5 | تحديد نتيجة restore عند Drive API أو Supabase failure، وتجنب نصف استعادة لا تظهر للمسؤول. | حالات failure موثقة واختبارات retry/rollback؛ رسالة API لا تدعي النجاح الجزئي كنجاح كامل. |
| 6.6 | تحديد مكان ملفات import الأصلية ومراجع `import_history.original_file_storage_path` وفترة الاحتفاظ بها. | استيراد dry-run ونجاح وفشل مع فتح ملف التاريخ من خلال API مخول. |
| 6.7 | تدقيق `AuditLogService` لتسجيل upload/delete/replace/restore/backup/denied/storage failure مع request ID ودون secrets. | عينات سجلات منقحة واختبارات تتأكد من حذف التوكن والبيانات الشخصية غير المطلوبة. |
| 6.8 | اختبار generated lecture announcement image + Feed publishing وارتباط الملف بالدفعة المناسبة ومنع التكرار. | اختبار آلي/تكاملي يثبت صحة المجموعة والتاريخ والمحاضر والمرفقات كما في السلوك الحالي. |

**بوابة الخروج:** اختبار restore كامل مع ملفات اختبار وmanifest/checksum ومقارنة المصدر بالوجهة بعد استرجاع تجريبي.

### المرحلة 7 — أداة نقل الملفات من Hostinger إلى Google Drive

**الهدف:** ترحيل قابل للاستئناف والتدقيق مع الاحتفاظ بالمصدر حتى تحقق كل ملف.

**تعتمد على:** اعتماد المراحل 0–6، ووجود Drive sandbox ومخطط metadata مطبق في staging.
**المهام:**

| المعرّف | المهمة التفصيلية | مخرج/معيار قبول |
|---|---|---|
| 7.1 | إنشاء manifest مصدر ثابت يربط كل صف بالمورد والملف الحالي وscope، مع العدد والحجم والـchecksum وحالة soft-delete. | manifest قابل لإعادة الإنتاج؛ كل استثناء مصنف، ولا أرقام تقديرية. |
| 7.2 | بناء أداة dry-run تعرض ما سينقل وما سيتخطى وما يفشل، وتحسب العدد/الحجم المتوقعين من بيانات المصدر الفعلية. | تشغيل dry-run مرتين يعطي نفس النتائج عند عدم تغير المصدر، ولا يكتب أو يحذف شيئًا. |
| 7.3 | إنشاء مجلدات Drive وفق ADR وحفظ mapping IDs، مع فحص صلاحيات الوصول والملكية قبل الرفع الدفعي. | تقرير mapping group/category/Drive folder IDs محفوظ server-side واختبار read/write في sandbox. |
| 7.4 | رفع دفعات محدودة مع retry/backoff مناسب، idempotency key، حدود rate/quota، وحالة لكل ملف. | إعادة تشغيل الدفعة لا تنشئ duplicates ولا تسقط الملفات التي فشلت جزئيًا. |
| 7.5 | بعد الرفع: تحقق من file ID وsize وchecksum حيث يمكن، واحفظ metadata في Supabase، ثم جرّب القراءة عبر المسار الخاص من PHP. | manifest يفرق بين `uploaded`, `metadata_saved`, `access_verified`؛ لا يُعلّم الصف ناجحًا قبل الثلاثة. |
| 7.6 | عالج تعارض الاسم، الملفات المكررة، المراجع المفقودة، الأرشيفات الكبيرة، الصور غير الصالحة، والملفات التي تغيرت أثناء النقل. | قواعد deterministic لكل حالة وتقارير conflict قابلة لمراجعة المسؤول. |
| 7.7 | نفذ rehearsal كامل على عينة/نسخة staging ممثلة لكل فئة ومجموعة، ثم قارن counts/sizes/checksums وروابط metadata. | تقرير فرق source/destination؛ جميع الفروقات إما صفر أو لها تفسير واعتماد مكتوب. |
| 7.8 | إعداد خطة cutover وfreeze/last delta أو آلية تضمن التقاط التغييرات أثناء النقل، وخطة رجوع لا تحذف المصدر. | runbook بخطوات دقيقة، مسؤول قرار go/no-go، وشروط إيقاف/استئناف. |

**بوابة الخروج:** rehearsal ناجح على جميع فئات الملفات والمجموعات، ومجموع الملفات غير المتحقق منها صفر قبل أي cutover. لا تحذف Hostinger files في هذه المرحلة.

### المرحلة 8 — بوابة الاختبارات والأمن في staging

**الهدف:** إثبات الوظائف والعزل والفشل الآمن قبل نشر التكامل.

**تعتمد على:** المراحل 2–7.
**المهام:**

| المعرّف | المهمة التفصيلية | مخرج/معيار قبول |
|---|---|---|
| 8.1 | اختبارات unit لمحول Google عبر fake adapter: upload/read/delete/timeout/quota/malformed response/retry. | اختبارات حتمية لا تحتاج اتصال production أو credentials حقيقية. |
| 8.2 | اختبارات integration على Google Drive sandbox وSupabase staging، مع fixtures غير شخصية. | سجلات منقحة تثبت create/read/delete وتسجيل metadata الصحيح. |
| 8.3 | مصفوفة المستخدمين والمجموعات 1 و2 و3 لكل عملية قراءة/رفع/استبدال/حذف. | المستخدم المخول ينجح ضمن scope فقط؛ Group 1 → Group 2 يفشل 403 أو 404 حسب العقد، بلا تسريب وجود المورد. |
| 8.4 | اختبار JWT صالح/منتهي/معدل التوقيع/مفقود، جلسة أو حساب معطل، ودور بلا permission. | الطلبات المرفوضة لا تستدعي Google API ولا تنشئ سجلات/ملفات. |
| 8.5 | اختبار input/files: extension مزور، MIME غير مطابق، magic bytes، حجم زائد، filename خبيث، duplicate واستبدال. | رفض قبل التخزين وتسجيل السبب الآمن دون حفظ الملف. |
| 8.6 | اختبار فشل بين رفع Drive وحفظ metadata، والعكس، واستعادة/تنظيف orphan. | لا نجاح كاذب، وكل حالة قابلة للمصالحة أو التنظيف دون حذف ملف آخر. |
| 8.7 | اختبار streaming لصورة وPDF وMP3، Range/seek، انتهاء الوصول المؤقت، CORS وcache وlogout/PWA. | كل viewer/player يعمل دون فتح Drive أو تخزين ملف مصرح سابقًا لحساب آخر. |
| 8.8 | E2E لـGallery وMP3 وLectures/announcement images وFeed images وBooks/Research وprofile images إذا اعتمدت. | تقارير كل مسار مع resource ID غير حساس ونتيجة API الفعلية. |
| 8.9 | اختبارات backup/restore للـDB والملفات والـmetadata وgroup mapping وchecksums، مع فشل restore متعمد. | round-trip staging ناجح وإثبات rollback عند الفشل؛ لا تستخدم backup production للتجربة. |
| 8.10 | اختبارات PHP syntax، frontend typecheck/build/unit tests، وكل سكربتات الأمان والـCI المرتبطة. | أوامر كاملة ومخرجات حقيقية وexit codes مسجلة؛ لا يكفي نجاح build. |
| 8.11 | فحص secrets وbundles وGit history/config/archive والـlogs، وفحص CORS/HTTPS/rate limit/security headers. | نتيجة scans بلا أسرار؛ إن ظهر سر، يوقف الإطلاق ويُلغى/يدوّر السر من المالك. |
| 8.12 | اختبار حمل متناسب مع الحدود الفعلية للملفات وHostinger وGoogle quota، ورصد timeout والذاكرة/المساحة. | قياس موثق وحدود قبول يوافق عليها المالك؛ لا تعلن scalable بلا قياس. |

**بوابة الخروج:** جميع الاختبارات المطلوبة ناجحة على staging، ولا يوجد Critical/High مفتوح يمس تسريب ملفات أو تجاوز مجموعة أو فقدان بيانات.

### المرحلة 9 — النشر المرحلي والقطع والتدقيق النهائي

**الهدف:** تشغيل متدرج يمكن التراجع عنه، ثم إغلاق التخزين المحلي فقط بعد تحقق نهائي.

**تعتمد على:** اعتماد المرحلة 8 وبوابة نقل المرحلة 7.
**المهام:**

| المعرّف | المهمة التفصيلية | مخرج/معيار قبول |
|---|---|---|
| 9.1 | إعداد Vercel للواجهة فقط، Hostinger لملفات PHP/config/secret، Supabase للمصادقة والـDB/RLS، وDrive للملفات الخاصة وفق ADR. | جدول نشر ومتغيرات بأسماء فقط، HTTPS، وCORS يسمح للأصول المقصودة. |
| 9.2 | نشر migrations وPHP API بترتيب متوافق، دون توسيع صلاحيات Google أو Supabase service key إلى المتصفح. | release checklist ونسخة artifact/commit وتحقق config بعد النشر دون طباعة أسرار. |
| 9.3 | تشغيل smoke tests على endpoints وملف تجريبي غير حساس من كل نوع، مع اختبار Group 1 ضد Group 2. | response codes وrequest IDs وmetadata readback محفوظة بدليل منقح. |
| 9.4 | تنفيذ cutover تدريجي/feature flag حسب نوع الوسائط الذي اعتمده ADR، مع مراقبة الأخطاء والquota والملفات اليتيمة. | تقرير كل batch، وقرار continue/rollback عند كل checkpoint. |
| 9.5 | تنفيذ delta sync/freeze المعتمد، والتحقق من أن كل مرجع حي يصل إلى الملف الصحيح بعد التحويل. | صفر ملفات/صفوف غير متطابقة أو وثيقة استثناءات معتمدة؛ لا حذف لمصدر Hostinger. |
| 9.6 | إثبات خطة rollback: توجيه القراءة/الكتابة إلى المصدر السابق دون فقد تغييرات ما بعد cutover، أو إيقاف آمن مع حفظ العمليات الجديدة. | rehearsal rollback ناجح قبل go-live؛ وجود خطة رجوع مكتوبة فقط لا يكفي. |
| 9.7 | تحديث/إنشاء الوثائق المطلوبة بعد تحقق التنفيذ، مع فصل ما نفذ فعليًا عما ما زال توصية/غير محسوم. | تحديث `docs/ARCHITECTURE.md`, `docs/STORAGE.md`, `docs/API.md`, `docs/SECURITY.md`, `docs/BACKUP_RESTORE.md`, `docs/PWA.md`, `docs/DEPLOYMENT.md`, `docs/ENVIRONMENT.md`, `docs/PROJECT_STRUCTURE.md`, `docs/FINAL_GO_LIVE_AUDIT.md`, `docs/GOOGLE_DRIVE_STORAGE.md`, و`docs/GOOGLE_DRIVE_MIGRATION_AUDIT.md` أو توحيدها/ربطها بمراجع موجودة لمنع تضارب مصادر الحقيقة. |
| 9.8 | تعبئة audit نهائي بأرقام مأخوذة من manifest/الاختبارات الحقيقية: عدد الملفات المهاجرة/المتحقق منها/الفاشلة، scope، OAuth، الخطة، النتائج والمخاطر. | لا تقديرات؛ كل total يطابق آليًا manifest وتقرير الاختبار. |
| 9.9 | إيقاف الكتابة إلى التخزين القديم، ثم إبقاء ملفات Hostinger read-only خلال retention window مع backup قبل الحذف النهائي. | إزالة قديمة بعد موافقة المالك فقط وبعد اجتياز الاحتفاظ والمطابقة؛ لا حذف آلي ضمن مهمة النقل. |

**بوابة الخروج:** Go-live فقط عند اجتياز قائمة القسم 10 وموافقة مالك المشروع؛ إذا فشل أي شرط أمني أو نزاهة، أوقف التوسيع وفعّل rollback.

## 5. اعتماديات ومخاطر يجب حسمها مبكرًا

| الاعتمادية/المخاطرة | سببها | طريقة الإغلاق |
|---|---|---|
| حساب Google/Drive | النوع محسوم؛ تفاصيل الملكية والاسترداد غير مكتملة | حساب شخصي + My Drive؛ توثيق مالك الحساب والاسترداد/نقل الملكية مطلوب |
| اختلاف schema المعرض بين المستودع وSupabase الحي | المحلي لا يعرّف `group_id` في migrations المفحوصة، بينما الحي يعرّفه ويطبق سياسات مجموعة؛ قرار المالك: NULL عالمي | reconciliation موثق جزئيًا، ثم اختبار staging يحافظ على السلوك الحي المقصود. |
| طرق حفظ الصور داخل JSONB | `feed_posts.images_metadata` و`lectures.attachments_metadata` قد تحمل أشكالًا متعددة | عينات منقحة فعلية من staging وتحويل versioned واختبارات decode. |
| PHP/Hostinger limits وGoogle quota | streaming/رفع الملفات الكبيرة قد يتجاوز حدود الذاكرة أو الوقت | قياس حدود المزود ورفع chunks/streaming عند الحاجة؛ لا تضع أرقامًا تخمينية. |
| روابط ملفات حالية مباشرة | تغيير الصيغة قد يعطل PWA والعارض والروابط القديمة | دعم توافق مؤقت/redirect خاص/ترحيل مراجع مع خطة انتهاء محددة. |
| المزامنة بين Supabase وGoogle ليست معاملة ذرية واحدة | قد ينجح أحد الطرفين ويفشل الآخر | state machine، idempotency، compensation، orphan reconciliation. |
| النسخ والاستعادة وتغيير Drive | IDs قد لا تصلح في Drive بديل أو حساب جديد | manifest versioned وخريطة إعادة إنشاء IDs وتجربة restore خارج production. |

## 6. نموذج إعدادات وأدلة (لا يتضمن قيم أسرار)

يُحسم الاسم الفعلي للمتغيرات بعد قرار المصادقة، ثم يوثق هذا الجدول بالأسماء فقط:

| المكان | ما يستضيفه | معلومات/إعدادات موثقة بالاسم فقط |
|---|---|---|
| Vercel | Next.js frontend | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_PHP_API_URL`؛ لا Google secret ولا Supabase service-role key. |
| Hostinger | PHP API | Supabase server-side config، Google OAuth/service-account config حسب ADR، app URL، CORS، rate-limit/storage policy؛ القيم في إعداد server-side محمي. |
| Supabase | Auth + PostgreSQL + RLS + metadata | migrations، grants، RLS، RPC، متغيرات خدمة backend غير مكشوفة. |
| Google Drive | ملفات المدرسة الخاصة | Drive/folder IDs وملكية ومشاركة أقل صلاحية؛ لا `Anyone with the link` دون مطلب معتمد. |

لا توضع credentials الحقيقية في هذا الجدول أو سجل Git أو طلبات المحادثة. وثّق طريقة الإنشاء والتخزين والاختبار والتدوير والإلغاء عبر قناة آمنة يملكها المستخدم.

## 7. معايير إيقاف/رجوع النقل

أوقف الدفعة أو ارجع إلى نسخة المصدر إذا تحقق أي مما يلي:

- metadata أو checksum أو حجم غير متطابق، أو ملف يتيم لا يمكن ربطه بسجل موثوق.
- وصول غير مصرح به أو محاولة cross-group تنجح.
- تسريب رابط Drive دائم أو secret أو JWT في bundle/log/cache.
- فشل restore أو تعذر التراجع عن دفعة جزئية.
- تجاوز معدل فشل/وقت/quota الحد الذي يوافق عليه المالك قبل الإطلاق.
- اختلاف تعداد المصدر/الوجهة دون تفسير وأثر موثق.

في الرجوع، تحفظ الملفات الجديدة التي أُنشئت بعد القطع ويُمنع فقدها: إما مزامنتها العكسية إلى المصدر القديم بعد تحققها، أو إبقاء النظام في وضع قراءة/إيقاف كتابة آمن حتى تسوية الفروقات.

## 8. سجل القرارات المطلوب قبل التنفيذ

املأ كل بند بمصدر الدليل واسم المعتمد والتاريخ قبل بدء التطوير:

| القرار | الحالة الآن | القيمة المطلوبة قبل التنفيذ |
|---|---|---|
| Google Account Type | محسوم | حساب Google شخصي؛ توثيق مالك الحساب ومسؤول الاستعادة ما زال مطلوبًا |
| Authentication Method | غير محسوم | OAuth 2.0 / server-to-server / خيار آخر مع rationale |
| Drive Type | محسوم | My Drive؛ Shared Drive غير معتمد |
| OAuth Scope | غير محسوم | أقل scopes نجحت في sandbox |
| File Ownership Model | غير محسوم | من يملك الملف وكيف تنتقل الملكية/الاستعادة |
| Private File Access | قرار معماري | PHP backend proxy؛ يلزم sandbox وrange/auth tests |
| Gallery scope | محسوم كقرار منتج | `group_id IS NULL` = محتوى عالمي مقصود؛ host المشروع مطابق، لكن تصنيف البيئة غير محسوم ولا يثبت probe خصوصية bytes |
| Backup bytes location | محسوم | Google Drive الشخصي؛ سياسة retention والاستعادة التفصيلية ما زالت مطلوبة |
| Cutover/rollback | غير محسوم | آلية delta، تجميد الكتابة، الرجوع وحفظ الملفات الجديدة |

## 9. Definition of Done لكل مهمة

لا يُعلّم task بأنه مكتمل إلا إذا أرفق:

1. ملفات المصدر أو migration التي تغيرت (إن وجدت) ومعرّفاتها الدقيقة.
2. أمر الاختبار أو طلب HTTP/SQL الآمن المنفذ فعلًا، ونتيجته وexit code.
3. دليل readback من المورد نفسه: metadata من Supabase، وملف/حالة من Drive sandbox أو المسار المنشور، دون أسرار.
4. نتيجة الحالات السلبية ذات الصلة، خصوصًا رفض المجموعة الأخرى والفشل الجزئي.
5. تحديث الوثيقة المعنية، وإضافة مخاطر/استثناءات غير مغلقة بدل وصفها نجاحًا.

---

## 10. قائمة قبول Go-live والأدلة المطلوبة

لا تُعلّم أي خانة قبل تنفيذ الاختبار وقراءة النتيجة من النظام المستهدف. لكل بند سجّل: البيئة، التاريخ، الأمر/الطلب، النتيجة، ومعرّف الدليل المنقح. استخدم الحالات `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`؛ ابدأ كل البنود `NOT RUN`.

| # | شرط الإطلاق | دليل القبول المطلوب | الحالة |
|---|---|---|---|
| 1 | PHP يتحقق من Supabase JWT (التوقيع والخوارزمية والانتهاء والهوية وحالة الحساب وفق التصميم). | اختبارات صالح/منتهي/مزوّر/مفقود على staging ونتائج HTTP. | `NOT RUN` |
| 2 | PHP يطبق الدور والصلاحية على الخادم ولا يكتفي بإخفاء أزرار الواجهة. | Role × operation matrix بنتائج سماح ورفض موثقة. | `NOT RUN` |
| 3 | PHP يتحقق من مجموعة/ملكية المورد من بيانات موثوقة لا من body/query فقط. | تتبع lookup للمورد واختبارات مجموعات على كل عملية ملفات. | `NOT RUN` |
| 4 | Google credentials لا تصل إلى Frontend أو bundle أو المتصفح. | فحص bundle وnetwork وconfig مع إثبات server-side-only دون تسجيل القيم. | `NOT RUN` |
| 5 | الملفات تُرفع فعلًا إلى Google Drive الخاص. | رفع ملف اختباري إلى sandbox/البيئة المعتمدة وقراءة بياناته من Drive readback. | `NOT RUN` |
| 6 | metadata تُحفظ وتُقرأ من Supabase بعد الرفع. | قراءة الصف من Supabase ومطابقة المورد وID والحجم وMIME والحالة. | `NOT RUN` |
| 7 | Cross-Group access ممنوع، بما في ذلك تغيير IDs يدويًا. | مستخدم Group 1 يحاول read/upload/delete لملف Group 2؛ جميعها مرفوضة بلا أثر جانبي. | `NOT RUN` |
| 8 | Gallery تعمل في السيناريوهات المسموحة. | رفع/عرض/حذف أو soft-delete/قراءة صورة مع تحقق scope الألبوم. | `NOT RUN` |
| 9 | MP3 يعمل دون رابط عام لـDrive. | تشغيل وseek/Range وإيقاف/استكمال ضمن مستخدم مخول، ورفض مستخدم غير مخول. | `NOT RUN` |
| 10 | صور/مرفقات إعلان المحاضرة تعمل مع القالب والمحاضر والتاريخ والمجموعة والنشر في Feed. | E2E يمنع التكرار ويطابق metadata والسجل المنشور. | `NOT RUN` |
| 11 | Feed images تتبع صلاحية المنشور ودورة رفع/عرض/حذف الصورة. | اختبار منشور مصرح وآخر غير مصرح، وفشل upload/metadata دون نجاح كاذب. | `NOT RUN` |
| 12 | Books/Research files تعمل مع قواعد scope الحالية والقراءة/soft-delete. | اختبارات create/read/replace/soft-delete/restore مع تحقق عدم تغيير صلاحيات المجال. | `NOT RUN` |
| 13 | Backup/Restore متوافقان مع DB والملفات والmetadata وmapping. | Full round-trip على staging ومقارنة manifest/counts/checksums وإثبات rollback للفشل. | `NOT RUN` |
| 14 | Production frontend build ينجح. | تشغيل `npm run build` من checkout/config مطابقين للإصدار المعد للإطلاق، مع exit code ومخرجات محفوظة. | `NOT RUN` |
| 15 | اختبارات المشروع المطلوبة تنجح، ومنها Frontend وPHP وintegration/E2E الخاصة بـDrive. | أوامر ومخرجات/exit codes لكل suite؛ لا يستبدل build اختبارات التكامل. | `NOT RUN` |
| 16 | لا توجد أسرار مكشوفة في المستودع أو الحزم أو اللوجات أو الوثائق. | secret scan ومراجعة logs/bundles؛ أي سر مكتشف يُلغى/يدوّر قبل إعادة الفحص. | `NOT RUN` |

**قرار الإطلاق:** `READY` فقط عندما تكون البنود الـ16 جميعًا `PASS` على البيئة المقصودة، ولا توجد ثغرة Critical/High مفتوحة، وتم اعتماد تقرير `docs/GOOGLE_DRIVE_MIGRATION_AUDIT.md`. خلاف ذلك تكون الحالة `NOT READY` مع ذكر البنود `FAIL/BLOCKED/NOT RUN` وأصحاب المتطلبات المعلقة.

---

**الحالة الحالية:** بدأ تنفيذ المرحلة 0 فقط. المهمة `0.7` أُغلقت على الشجرة المحلية الحالية؛ `0.1`–`0.6` و`0.8` جزئية أو محجوبة كما في سجل التنفيذ. المراحل 1–9 لم تبدأ، وكل بنود Go-live الـ16 ما زالت `NOT RUN`. لا توجد أدلة على تكامل Google Drive أو تشغيله، ولا يصح وصف المعمارية المستهدفة بأنها production-ready قبل تطبيق بوابات القبول أعلاه.
