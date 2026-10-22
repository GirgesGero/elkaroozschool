# قرار التنفيذ الآمن لإعادة ضبط النظام

**الحالة في 21 أكتوبر 2026: الكود محلي وغير منشور؛ migration غير مطبقة؛ لم يُنفذ حذف حي.**

يوثق هذا الملف نطاق العملية وموانع اعتمادها. لا يُعد وجود واجهة أو endpoint موافقة على تطبيق migration أو تشغيل حذف حي. لم يحدث رفع إلى GitHub أو نشر.

## ما طلبه المالك

إجراء إداري يتطلب إعادة إدخال كلمة مرور المسؤول قبل مسح بيانات المناهج والماراثون والصور والخدام والمخدومين. المطلوب إجراء تدميري؛ بناء الواجهة وحده لا يثبت أنه آمن أو أن كل البيانات التابعة له قد حُذفت.

## ما أُضيف محليًا

- Migration additive في `supabase/migrations/20261021170000_safe_system_reset.sql` لمعاينة النطاق، بدء/استئناف عملية، تسجيل النتائج وحذف بيانات التشغيل ضمن RPC.
- أُضيفت قيود RLS تقييدية على عمليات DML المباشرة للجداول الـ36 المستهدفة. هذه القيود لا تكفي وحدها لتجميد الكتابة: لا تنطبق داخل دوال `SECURITY DEFINER` المالكة للجداول، ولا على `service_role` ذي `BYPASSRLS`؛ راجع المانع الأمني أدناه.
- مسارا PHP `POST /system-reset/preview` و`POST /system-reset/execute`؛ الخادم يتحقق من `admin` النشط، حداثة `auth_time`، عبارة التأكيد، والنسخة المشفرة الحديثة قبل بدء الحذف.
- واجهة مسؤول في `/settings` لإعادة المصادقة عبر Supabase، عرض المعاينة، إنشاء نسخة مشفرة، تأكيد التنفيذ ومتابعة الحالات الجزئية.
- التنظيف يشمل PostgreSQL وSupabase Auth والوسائط المحلية وGoogle Drive؛ هذه الأنظمة لا تشترك في معاملة ذرية، لذا العملية تسجل النتائج وتستأنف الإخفاقات.

## موانع الاعتماد الحالية

1. لم تُطبق migration على أي قاعدة بيانات، ولم يُنفذ reset حي. جداول `system_reset_*` غير موجودة بعد في المشروع الحالي؛ المسارات غير جاهزة للاستخدام قبل تطبيق migration في بيئة اختبار معتمدة.
2. قراءة schema/catalog من Supabase كانت للقراءة فقط: 55 جدولًا عامًا مصنفة كلها (35 حذف صفوف، `media_assets` تنظيف ملفات وسجلات، `profiles` حذف Auth انتقائي، و18 جدولًا محفوظًا). جرد سجلات الوسائط غير الاحتياطية أعاد 4 سجلات، كلها `HOSTINGER_LOCAL` (واحد لكل من `AVATAR`, `CURRICULUM`, `GENERAL`, `LECTURE_ATTACHMENT`)؛ هذا جرد metadata لا يثبت وجود كل ملف على القرص. لا توجد buckets أو objects في مخطط `storage` عند آخر جرد؛ أعد الفحص قبل التشغيل.
3. فُحص ترتيب FK الحالي ولم تظهر مخالفة ترتيب بين الجداول المحددة للحذف. فحص محلل PostgreSQL محلي لا يعادل تشغيل migration أو اختبار أنواع الأعمدة والمنح وملكية RPC على الخادم.
4. لم يُجرَ restore تجريبي للنسخة المشفرة على بيئة معزولة. فحص checksum وZIP والـmanifest بالـbackend لا يثبت قابلية الاستعادة.
5. لم يُختبر ثبات ملف حالة `ResetAccessGate` أو صلاحياته على Hostinger، ولم يُختبر فشل/استئناف كامل على staging أو جلسة مدير حقيقية.
6. **قفل الكتابة غير مكتمل ويمنع الاعتماد:** قفل RLS الحالي لا يصدّ استدعاءات دوال `SECURITY DEFINER` التي يملكها مالك الجداول، ولا طلبات `service_role` التي تتجاوز RLS. الجرد الحي أظهر دوالًا متاحة لـ`authenticated` تكتب إلى جداول reset، مثل `submit_marathon_answer`, `create_marathon_question`, `publish_curriculum_day` و`update_curriculum_day`. كما أن `SupabaseClient` يستخدم مفتاح `service_role` افتراضيًا؛ بوابة PHP تُفحص عند دخول الطلب ولا توقف طلبًا بدأ قبل فتح reset. يلزم تجميد واختبار كل مسارات الكتابة، بما فيها RPCs والطلبات المتزامنة، قبل اعتماد التصميم.
7. يجب تنفيذ تمرين staging شامل قبل أي rollout، ثم طلب موافقة منفصلة وصريحة قبل reset حي. لا نشر أو رفع ضمن هذا التغيير.

## قرار النطاق المتحقق

من جرد Supabase للقراءة فقط في 21 أكتوبر 2026 صُنفت **55/55** من جداول `public`: 35 جدول تشغيل للحذف، `media_assets` للتنظيف المحلي/الخارجي، `profiles` وفق الدور، و18 جدولًا للاحتفاظ. كما فُحصت علاقات FK المرتبطة بصفوف الحذف؛ لم يظهر ترتيب حذف مخالف. جداول `system_reset_*` مضافة في migration المحلية فقط ولا تظهر في المخطط الحي بعد. فحص catalog أكد RLS مفعّلًا على **36/36** جدولًا مستهدفًا (دون FORCE RLS). سياسات الكتابة المسجلة في النطاق لم تُظهر استهداف `anon` أو `public`؛ الموجودة موجهة إلى `authenticated`، وهو الدور الذي تستهدفه قيود RLS الجديدة.

**الحذف:**

`attendance_records`, `attendance_sessions`, `exam_grades`, `exams`, `marathon_trainee_answers`, `marathon_trainee_submissions`, `marathon_question_revisions`, `marathon_answers`, `marathon_questions`, `marathon_sections`, `marathons`, `post_images`, `post_comments`, `reactions`, `feed_posts`, `curriculum_revisions`, `curriculum_entries`, `curriculum_days`, `curriculums`, `lectures`, `terms`, `mp3_tracks`, `lecturers`, `gallery_items`, `gallery_albums`, `books`, `researches`, `user_favorites`, `notifications`, `push_subscriptions`, `daily_verse_dispatch_state`, `daily_verses`, `servant_permissions`, `group_secretariat`, `import_history`.

**الاحتفاظ:** بيانات الكتاب المقدس (`bible_testaments`, `bible_books`, `bible_chapters`, `bible_verses`, `bible_verse_words`, `bible_sources`, `bible_commentaries`, `bible_word_commentaries`, `bible_dictionary_entries`, `word_dictionary_mappings`, `bible_content_versions`)، إضافةً إلى `groups`, `roles`, `permissions`, `categories`, `notification_templates`, `audit_logs`, و`backup_records`.

- من جدول `profiles` تُبقى حسابات `admin` النشطة؛ تُحذف بقية حسابات Auth، ويُحذف ملفها الشخصي وفق FK. هذا يتضمن `super_user`, `secretariat`, `servant`, `trainee` وأي دور آخر غير `admin`.
- تُحذف سجلات `media_assets` غير الخاصة بـ`BACKUP_ARCHIVE` بعد محاولة حذف الملف الخارجي؛ تحفظ سجلات وأصول النسخ الاحتياطية. في جرد 21 أكتوبر ظهرت 4 سجلات غير احتياطية وكلها `HOSTINGER_LOCAL`؛ وجود السجل لا يثبت وجود الملف. مسح Drive يتطلب جذرًا مضبوطًا، ويوقف التنفيذ عند وجود ملفات غير مسجلة أو تعذر الجرد.
- تقفل قيود RLS الكتابة من `authenticated` على الجداول المستهدفة طوال حالات reset المفتوحة، وتسمح بالقراءة؛ تبقى الحاجة لاختبار الصلاحيات والسلوك على قاعدة PostgreSQL معزولة قبل الاعتماد.
- الملفات المحلية تُحذف فقط من جذور تشغيل معروفة. تحفظ بيانات Bible والنسخ والـcache وحالة reset الأمنية؛ أي جذر غير مصنف يوقف التنظيف.
- قراءة `storage.buckets`/`storage.objects` أظهرت عدم وجود buckets/objects في المشروع وقت الفحص. لا يغطي التنفيذ Supabase Storage؛ يجب تكرار الفحص قبل التشغيل.

## شروط الاعتماد قبل أي تشغيل

1. تطبيق migration على staging بعد مراجعتها، واختبار وظائف RPC والمنح وRLS باستخدام PostgreSQL فعلي.
2. التحقق على الخادم من دوام ملف بوابة reset وسلامة صلاحياته، وضبط مفاتيح Supabase ومقدمي التخزين.
3. إنشاء نسخة مشفرة، تنزيلها خارج الخادم، واستعادتها تجريبيًا في بيئة معزولة مع مطابقة manifest والبيانات والوسائط.
4. تنفيذ تمرين staging شامل يشمل رفض الجلسات القديمة وغير المديرين، الفشل الجزئي والاستئناف، قراءة راجعة كاملة، وبقاء تسجيل دخول admin.
5. طلب موافقة صريحة منفصلة قبل أي reset على بيئة حية. لا رفع إلى GitHub أو نشر ضمن المهمة الحالية.

## تحقق محلي مسجل

- PHP lint لكل الملفات المعدلة والاختبارات نجح.
- اختبارات PHP: contract **85/85**؛ storage **11/11**؛ access gate **7/7**؛ Auth Admin **5/5**؛ Google Drive **7/7**.
- Frontend: typecheck ناجح، Vitest **213/213 عبر 20 ملفًا**، lint والبناء ناجحان مع تحذيرات hooks وصور موجودة في المشروع؛ اختبار user journeys يطبع تحذير JSDOM عن navigation غير المدعومة.
- حلل `pglast` بنية SQL وكتل PL/pgSQL محليًا؛ هذا لا يعادل تشغيلها على PostgreSQL.
- جرد Supabase والـFK وStorage كان للقراءة فقط؛ لم تُطبق migration ولم تتغير بيانات. لا توجد تجربة restore أو تحقق نشر حي.

