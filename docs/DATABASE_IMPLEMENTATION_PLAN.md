# خطة تنفيذ قاعدة بيانات سوبابيس (Database Implementation Plan)
## مشروع: مدرسة الكاروز — EL KAROOZ School
**المرحلة:** Phase 2 — Supabase Database Implementation  
**الحالة:** Ready for Migration Execution  

---

### 1. تسلسل وهيكلية الـ Migrations (Migration Sequence)

تم تقسيم مخطط قاعدة البيانات إلى 16 ملف هجرة (Migration) متدرج ومنطقي لتفادي أي تعارض في التبعيات (Dependencies):

```text
supabase/migrations/
├── 001_extensions.sql              # تفعيل الامتدادات (pgcrypto, uuid-ossp, pg_trgm)
├── 002_core_roles_groups.sql        # الجداول الأساسية للأدوار والفرق الدراسية
├── 003_profiles_auth_mapping.sql    # جدول الملفات الشخصية profiles والربط مع auth.users
├── 004_permissions_secretariat.sql # الصلاحيات المفوضة وتعيين سكرتارية الفرق
├── 005_academic_terms_lectures.sql  # التيرمات الأكاديمية والمحاضرون والمحاضرات والمناهج
├── 006_attendance.sql               # جلسات الحضور الأسبوعية (الجمعة) وسجلات الحضور
├── 007_exams_grades.sql             # امتحانات التيرم وسجلات درجات المتدربين
├── 008_marathons.sql                # الماراثون، الأقسام، الأسئلة وتوزيع الـ 100 درجة آلياً
├── 009_feed_social.sql              # منشورات المجتمع، التعليقات، التفاعلات
├── 010_notifications_verses.sql     # قوالب وسجلات الإشعارات وبنك الآيات اليومية
├── 011_library_media.sql            # الكتب، الأبحاث، المعرض، الصوتيات MP3 والمفضلة
├── 012_bible_local.sql              # قاعدة الكتاب المقدس المحلية والتفاسير وشروحات الكلمات
├── 013_audit_backup_import.sql      # سجل المراقبة audit_logs، النسخ الاحتياطية والاستيراد
├── 014_indexes_functions_triggers.sql # الفهارس، الدوال المخزنة، وقواعد الحذف الآمن والتدقيق
├── 015_rls_policies.sql             # سياسات الأمان وعزل الفرق وصلاحيات الأدوار
└── 016_seed_data.sql                # البيانات التأسيسية (الأدوار، الفرق، الصلاحيات، القوالب)
```

---

### 2. مصفوفة التبعيات والعلاقات (Entity Dependencies & Relationships)

| الجدول | يعتمد على (Dependencies) | نوع العلاقة | الغرض الأمني والوظيفي |
| :--- | :--- | :--- | :--- |
| `roles` | لا يوجد | الأساس | الأدوار الخمسة الثابتة |
| `groups` | لا يوجد | الأساس | الفرق الدراسية الثلاث |
| `permissions` | لا يوجد | الأساس | الصلاحيات المفوضة المستقلة |
| `profiles` | `auth.users`, `roles`, `groups` | Many-to-One | بيانات المستخدمين ونطاق الفرقة والدور |
| `servant_permissions` | `profiles`, `permissions` | Many-to-Many | تفويض الصلاحيات الفردية للخدام |
| `group_secretariat` | `profiles`, `groups` | Many-to-One | تحديد سكرتارية كل فرقة (بحد أقصى 3) |
| `terms` | `groups` | Many-to-One | التيرمات الدراسية لكل فرقة |
| `lecturers` | لا يوجد | الأساس | المحاضرون والآباء الكهنة |
| `lectures` | `terms`, `groups`, `lecturers`, `profiles` | Many-to-One | المحاضرات والتسجيلات والمرفقات |
| `curriculums` | `terms`, `groups`, `profiles` | Many-to-One | المناهج والمذكرات الدراسية |
| `attendance_sessions` | `groups` | Many-to-One | جلسات حضور الجمعة الأسبوعية |
| `attendance_records` | `attendance_sessions`, `profiles` (trainee), `groups` | Many-to-One | رصد الحضور (حاضر/غائب/متأخر) |
| `exams` | `terms`, `groups` | One-to-One (Unique per term) | امتحان واحد لكل تيرم |
| `exam_grades` | `exams`, `profiles` (trainee), `groups` | Many-to-One | رصد الدرجات مع التقدير اللفظي |
| `marathons` | `terms`, `groups` | Many-to-One | الماراثون بوزن 100 درجة موزع آلياً |
| `marathon_sections` | `marathons` | Many-to-One | أقسام الماراثون |
| `marathon_questions` | `marathons`, `marathon_sections` | Many-to-One | الأسئلة وأوزانها المتساوية |
| `marathon_answers` | `marathon_questions` | Many-to-One | الخيارات الإجابات المتعددة |
| `marathon_submissions`| `marathons`, `profiles` (trainee) | Many-to-One | إجابات المتدربين والنتيجة النهائية |
| `feed_posts` | `profiles` (author) | Many-to-One | منشورات المجتمع العام |
| `post_comments` | `feed_posts`, `profiles` (author) | Many-to-One | التعليقات على المنشورات |
| `reactions` | `profiles`, (target polymorphic) | Many-to-One | التفاعلات (تفاعل واحد لكل مستخدم) |
| `notifications` | `profiles` (recipient) | Many-to-One | الإشعارات (غياب، أعياد ميلاد، آيات) |
| `daily_verses` | `profiles` (created_by) | Many-to-One | بنك الآيات المجدول يوماً بعد يوم |
| `bible_testaments` | لا يوجد | الأساس | العهدين القديم والجديد |
| `bible_books` | `bible_testaments` | Many-to-One | أسفار الكتاب المقدس ومصادرها |
| `bible_chapters` | `bible_books` | Many-to-One | إصحاحات الأسفار |
| `bible_verses` | `bible_chapters`, `bible_books` | Many-to-One | الآيات ونصوصها ومصادر تكلا |
| `bible_verse_words` | `bible_verses` | Many-to-One | الكلمات والشروحات التفاعلية |
| `bible_commentaries` | `bible_verses`, `bible_sources` | Many-to-One | تفاسير الآيات المعتمدة |
| `bible_word_commentaries` | `bible_verse_words`, `bible_sources` | Many-to-One | شروحات وقواميس الكلمات |
| `audit_logs` | `profiles` (actor) | Many-to-One | سجل تدقيق غير قابل للحذف |
| `backup_records` | `profiles` (created_by) | Many-to-One | سجلات النسخ المشفرة |
| `import_history` | `profiles` (created_by) | Many-to-One | سجلات استيراد المتدربين |

---

### 3. خطة المصادقة المعتمدة (Username-Only Authentication Mapping)

- **الآلية:** يدخل المستخدم اسم المستخدم `username` وكلمة المرور `password`.
- **الطبقة البينية في Supabase:** يُربط اسم المستخدم داخلياً بـ `username@elkarooz-school.internal`.
- **الربط المتزامن:** يتم وضع Trigger على جدول `public.profiles` لإنشاء وتحديث المستخدم في `auth.users` والتحقق من قيود الأدوار (مسؤول واحد فقط، سوبر يوزر واحد فقط).
- **العزل والأمان:** كافة واجهات الـ Frontend و PHP Backend تتعامل مع `username` و `role_id` و `group_id`.

---

### 4. التحقق والفحوصات بعد الهجرة (Verification Strategy)
1. تنفيذ ملفات الـ Migration بالترتيب الدقيق عبر `Supabase MCP`.
2. فحص وجود كافة الجداول (46 جدولاً) والقيود (Constraints) والفهارس (Indexes).
3. إدراج وتأكيد البيانات التأسيسية (`roles`, `groups`, `permissions`, `notification_templates`).
4. اختبار سياسات RLS عبر استعلامات تقمص أدوار مختلفة للتأكد من عزل بيانات الفرق بنسبة 100%.
