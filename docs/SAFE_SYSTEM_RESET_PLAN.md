# قرار التنفيذ الآمن لإعادة ضبط النظام

**الحالة في 23 أكتوبر 2026: تغييرات محلية قيد التحقق؛ migration غير مطبقة؛ لم يُنفذ reset حي أو staging.**

يوثق هذا الملف نطاق العملية وموانع اعتمادها. لا يُعد وجود واجهة أو endpoint موافقة على تطبيق migration أو تشغيل حذف حي. لم يحدث رفع إلى GitHub أو نشر.

## ما طلبه المالك

إجراء إداري يتطلب إعادة إدخال كلمة مرور المسؤول قبل مسح بيانات المناهج والماراثون والصور والخدام والمخدومين. المطلوب إجراء تدميري؛ بناء الواجهة وحده لا يثبت أنه آمن أو أن كل البيانات التابعة له قد حُذفت.

## ما أُضيف محليًا

- Migration additive في `supabase/migrations/20261021170000_safe_system_reset.sql` لمعاينة النطاق، بدء/استئناف عملية، تسجيل النتائج وحذف بيانات التشغيل ضمن RPC.
- أُضيفت قيود RLS تقييدية كدفاع إضافي، ومعها triggers من نوع `ENABLE ALWAYS` على جداول الحذف والبيانات المحفوظة التي تتأثر بعلاقات FK أو تحديثات التنقيح، وعلى `auth.users` للإدراج/التعديل/الحذف و`TRUNCATE`. القفل المعتمد محليًا هو قفل صف gate داخل قاعدة البيانات مع permits محصورة بمعاملة finalize أو بحذف Auth staged محدد، وليس RLS وحده. لم تُشغّل هذه الآليات على PostgreSQL بعد.
- مسارا PHP `POST /system-reset/preview` و`POST /system-reset/execute`؛ الخادم يتحقق من `admin` النشط، حداثة `auth_time`، عبارة التأكيد، والنسخة المشفرة الحديثة قبل بدء الحذف.
- واجهة مسؤول في `/settings` لإعادة المصادقة عبر Supabase، عرض المعاينة، إنشاء نسخة مشفرة، تأكيد التنفيذ ومتابعة الحالات الجزئية.
- التنظيف يشمل PostgreSQL وSupabase Auth والوسائط المحلية وGoogle Drive؛ هذه الأنظمة لا تشترك في معاملة ذرية، لذا العملية تسجل النتائج وتستأنف الإخفاقات.

## موانع الاعتماد الحالية

1. لم تُطبق migration على أي قاعدة بيانات، ولم يُنفذ reset حي. جداول `system_reset_*` غير موجودة بعد في المشروع الحالي؛ المسارات غير جاهزة للاستخدام قبل تطبيق migration في بيئة اختبار معتمدة.
2. قراءة schema/catalog من Supabase كانت للقراءة فقط: 55 جدولًا عامًا مصنفة كلها (35 حذف صفوف، `media_assets` تنظيف ملفات وسجلات، `profiles` حذف Auth انتقائي، و18 جدولًا محفوظًا). جرد سجلات الوسائط غير الاحتياطية أعاد 4 سجلات، كلها `HOSTINGER_LOCAL` (واحد لكل من `AVATAR`, `CURRICULUM`, `GENERAL`, `LECTURE_ATTACHMENT`)؛ هذا جرد metadata لا يثبت وجود كل ملف على القرص. لا توجد buckets أو objects في مخطط `storage` عند آخر جرد؛ أعد الفحص قبل التشغيل.
3. فُحص ترتيب FK الحالي ولم تظهر مخالفة ترتيب بين الجداول المحددة للحذف. فحص محلل PostgreSQL محلي لا يعادل تشغيل migration أو اختبار أنواع الأعمدة والمنح وملكية RPC على الخادم.
4. لم يُجرَ restore تجريبي للنسخة المشفرة على بيئة معزولة. فحص checksum وZIP والـmanifest بالـbackend لا يثبت قابلية الاستعادة.
5. لم يُختبر ثبات ملف حالة `ResetAccessGate` أو صلاحياته على Hostinger، ولم يُختبر فشل/استئناف كامل على staging أو جلسة مدير حقيقية.
6. **التجميد مطبق محليًا كمرشح لكنه غير معتمد:** triggers `ENABLE ALWAYS` صُممت لقفل DML و`TRUNCATE` على جداول التشغيل والبيانات المتأثرة بالتنقيح/العلاقات، بما يشمل مسارات `SECURITY DEFINER` و`service_role` و`session_replication_role=replica`. بوابة PHP تمسك shared lease للطلب حتى خروجه، وبداية reset تنتظر exclusive lease؛ كما يوجد اختبار race متعدد جلستين لبوابة PostgreSQL. اختبارات PHP والـparser المحلية لا تثبت سلوك trigger أو Auth/FK؛ اختبار SQL وسباق PostgreSQL لم يُشغّلا لعدم توفر runtime محلي.
7. يجب تنفيذ تمرين staging شامل قبل أي rollout، ثم طلب موافقة منفصلة وصريحة قبل reset حي. لا نشر أو رفع ضمن هذا التغيير.

## قرار النطاق المتحقق

من جرد Supabase للقراءة فقط في 21 أكتوبر 2026 صُنفت **55/55** من جداول `public`: 35 جدول تشغيل للحذف، `media_assets` للتنظيف المحلي/الخارجي، `profiles` وفق الدور، و18 جدولًا للاحتفاظ. كما فُحصت علاقات FK المرتبطة بصفوف الحذف؛ لم يظهر ترتيب حذف مخالف. جداول `system_reset_*` مضافة في migration المحلية فقط ولا تظهر في المخطط الحي بعد. فحص catalog أكد RLS مفعّلًا على **36/36** جدولًا تشغيليًا مستهدفًا (دون FORCE RLS). محليًا أُضيفت triggers حراسة لأربع جداول محتفظ بها/مرتبطة (profiles, backup_records, bible_content_versions, notification_templates) إلى جانب جداول التشغيل ووسائطها و`auth.users`؛ لم يُتحقق من هذا التوسع في catalog PostgreSQL بعد.

**الحذف:**

`attendance_records`, `attendance_sessions`, `exam_grades`, `exams`, `marathon_trainee_answers`, `marathon_trainee_submissions`, `marathon_question_revisions`, `marathon_answers`, `marathon_questions`, `marathon_sections`, `marathons`, `post_images`, `post_comments`, `reactions`, `feed_posts`, `curriculum_revisions`, `curriculum_entries`, `curriculum_days`, `curriculums`, `lectures`, `terms`, `mp3_tracks`, `lecturers`, `gallery_items`, `gallery_albums`, `books`, `researches`, `user_favorites`, `notifications`, `push_subscriptions`, `daily_verse_dispatch_state`, `daily_verses`, `servant_permissions`, `group_secretariat`, `import_history`.

**الاحتفاظ:** بيانات الكتاب المقدس (`bible_testaments`, `bible_books`, `bible_chapters`, `bible_verses`, `bible_verse_words`, `bible_sources`, `bible_commentaries`, `bible_word_commentaries`, `bible_dictionary_entries`, `word_dictionary_mappings`, `bible_content_versions`)، إضافةً إلى `groups`, `roles`, `permissions`, `categories`, `notification_templates`, `audit_logs`, و`backup_records`.

- من جدول `profiles` تُبقى حسابات `admin` النشطة؛ تُحذف بقية حسابات Auth، ويُحذف ملفها الشخصي وفق FK. هذا يتضمن `super_user`, `secretariat`, `servant`, `trainee` وأي دور آخر غير `admin`.
- تُحذف سجلات `media_assets` غير الخاصة بـ`BACKUP_ARCHIVE` بعد محاولة حذف الملف الخارجي؛ تحفظ سجلات وأصول النسخ الاحتياطية. في جرد 21 أكتوبر ظهرت 4 سجلات غير احتياطية وكلها `HOSTINGER_LOCAL`؛ وجود السجل لا يثبت وجود الملف. مسح Drive يتطلب جذرًا مضبوطًا، ويوقف التنفيذ عند وجود ملفات غير مسجلة أو تعذر الجرد.
- صُممت triggers قاعدة البيانات لإغلاق الكتابة لجميع الأدوار على الجداول المحمية أثناء reset، وRLS التقييدي دفاع إضافي لدور `authenticated`. تصريح Auth قصير ومحدد يرافق فقط حذف مستخدم مرحلي ويسمح بتوابعه FK داخل العبارة نفسها؛ لم يُثبت هذا السلوك قبل اختبار Auth/FK على PostgreSQL فعلي.
- الملفات المحلية تُحذف فقط من جذور تشغيل معروفة. تحفظ بيانات Bible والنسخ والـcache وحالة reset الأمنية؛ أي جذر غير مصنف يوقف التنظيف.
- قراءة `storage.buckets`/`storage.objects` أظهرت عدم وجود buckets/objects في المشروع وقت الفحص. لا يغطي التنفيذ Supabase Storage؛ يجب تكرار الفحص قبل التشغيل.

## شروط الاعتماد قبل أي تشغيل

1. تشغيل migration واختبار `verify_reset_write_freeze.sql` واختبار الجلسات المتزامنة على قاعدة PostgreSQL/Supabase محلية disposable؛ لا تُطبق على قاعدة حية.
2. بعد نجاح runtime المحلي ومراجعة migration، تطبيقها على staging واختبار المنح وRLS وAuth/FK/RPCs.
3. التحقق على الخادم من دوام ملف بوابة reset وسلامة صلاحياته، وضبط مفاتيح Supabase ومقدمي التخزين.
4. إنشاء نسخة مشفرة، تنزيلها خارج الخادم، واستعادتها تجريبيًا في بيئة معزولة مع مطابقة manifest والبيانات والوسائط.
5. تنفيذ تمرين staging شامل يشمل رفض الجلسات القديمة وغير المديرين، الفشل الجزئي والاستئناف، قراءة راجعة كاملة، وبقاء تسجيل دخول admin.
6. طلب موافقة صريحة منفصلة قبل أي reset على بيئة حية. لا رفع إلى GitHub أو نشر ضمن المهمة الحالية.

## تحقق محلي مسجل

- PHP lint لكل ملفات PHP المتغيرة نجح.
- اختبارات reset المحلية: request-barrier **12/12** (عمليات PHP متزامنة فعلية)، write-freeze contract **26/26**، access gate **7/7**، storage **11/11**، reset contract **87/87**.
- `pglast` حلل صياغة SQL الخارجية: migration **70 statement** واختبار DB **26 statement**؛ أجسام PL/pgSQL داخل `$$` لم تُتحقق وقت التشغيل أو تُحلل كـPL/pgSQL.
- اختبار `verify_reset_write_freeze.sql` واختبار PostgreSQL المتعدد الجلسات لم يُشغّلا: `psql` وPostgreSQL وDocker وWSL غير متاحة محليًا. ملف سباق DB يرفض أي host غير loopback ويتطلب إقرار قاعدة disposable.
- نتائج frontend المسجلة سابقًا: typecheck ناجح، Vitest **213/213 عبر 20 ملفًا**، lint والبناء ناجحان مع التحذيرات المسجلة في المشروع.
- جرد Supabase والـFK وStorage السابق كان للقراءة فقط؛ لم تُطبق migration ولم تتغير بيانات. لا توجد تجربة restore أو staging أو تحقق نشر حي.

