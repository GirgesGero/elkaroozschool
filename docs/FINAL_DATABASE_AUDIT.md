# تقرير تدقيق قاعدة البيانات والجداول والـ RLS (Database Audit)
## مشروع: مدرسة الكاروز للكتاب المقدس — EL KAROOZ School

**تاريخ التدقيق:** 2026-09-26  
**الإصدار:** v1.0.0-PROD  
**قاعدة البيانات:** Supabase PostgreSQL  

---

### 1. إحصائيات الجداول وسياسات الأمان (Tables & RLS Coverage)
- **إجمالي الجداول المنشأة والمفعلة:** **46 جدولاً**
- **تغطية سياسات RLS:** **100% (46 / 46 جدولاً مفعل عليه RLS)**
- **الجداول الأساسية في النظام:**
  1. `roles` (الأدوار الـ 5 المعتمدة)
  2. `permissions` (الصلاحيات المفوضة الـ 5 المستقلة)
  3. `role_permissions` (جدول الربط)
  4. `user_delegated_permissions` (الصلاحيات الممنوحة للخدام)
  5. `academic_years` (السنوات الدراسية)
  6. `terms` (الترم الأول والثاني)
  7. `study_groups` (الفرق الثلاث: Group 1, Group 2, Group 3)
  8. `profiles` (بيانات المستخدمين المركزية)
  9. `trainees_profiles` (بيانات المتدربين التفصيلية والخرائط)
  10. `secretariat_assignments` (تعيينات السكرتارية للفرق)
  11. `servant_assignments` (تعيينات الخدام للفرق)
  12. `curriculums` (المناهج الدراسية)
  13. `lectures` (المحاضرات الثنائية لكل جمعة)
  14. `attendance_weeks` (أسابيع الحضور والجمعات)
  15. `attendance_records` (سجلات الحضور والغياب المقفلة بالخميس)
  16. `exams` (الامتحانات الفصلية والدرجة العظمى)
  17. `exam_grades` (درجات وتصحيحات الامتحانات)
  18. `marathons` (الماراثونات الفصلية)
  19. `marathon_questions` (أسئلة الماراثون وخياراتها)
  20. `marathon_answers` (إجابات الطلاب والدرجات المحجوبة والتسلسل)
  21. `marathon_question_reopens` (إعادة الفتح الانتقائي للأسئلة)
  22. `feed_posts` (منشورات الحائط العام)
  23. `feed_post_images` (صور المنشورات)
  24. `comments` (تعليقات الحائط العام)
  25. `reactions` (التفاعلات الحصرية الأربعة)
  26. `user_favorites` (المفضلة الشخصية)
  27. `library_categories` (تصنيفات المكتبة الرقمية)
  28. `library_books` (الكتب الرقمية العامة)
  29. `library_researches` (الأبحاث والمقالات العامة)
  30. `gallery_albums` (ألبومات صور الفرق المعزولة)
  31. `gallery_photos` (صور الألبومات المعزولة)
  32. `mp3_files` (التسجيلات الصوتية المعزولة للفرق)
  33. `bible_books` (أسفار العهدين القديم والجديد)
  34. `bible_chapters` (إصحاحات الكتاب المقدس)
  35. `bible_verses` (آيات الكتاب المقدس)
  36. `bible_commentaries` (تفاسير الآباء Verbatim)
  37. `bible_dictionary` (قاموس ألفاظ ومعاني الكتاب المقدس)
  38. `bible_word_mappings` (ربط كلمات الآيات بشروحات القاموس)
  39. `notification_templates` (قوالب الافتقاد وأعياد الميلاد)
  40. `daily_verses` (بنك الآيات اليومية وجدولة التدوير)
  41. `notifications` (سجلات الإشعارات الموجهة)
  42. `push_subscriptions` (اشتراكات Web Push)
  43. `backup_records` (سجلات تتبع النسخ الاحتياطية المشفرة)
  44. `import_batches` (دفعات الاستيراد الجماعي للطلاب)
  45. `import_errors` (سجلات أخطاء الاستيراد المفصلة)
  46. `audit_logs` (سجل التدقيق غير القابل للتعديل أو الحذف)

---

### 2. تدقيق القيود والعلاقات والدوال (Constraints, Triggers & RPCs)
- **Unique Partial Indexes:**
  - `idx_single_admin`: يضمن حساب مسؤول واحد فقط.
  - `idx_single_super_user`: يضمن حساب سوبر يوزر واحد فقط.
- **Triggers:**
  - `trg_attendance_thursday_freeze`: يفرض قفل تسجيل الحضور إجبارياً يوم الخميس عند منتصف الليل.
  - `trg_marathon_sequential_check`: يمنع القفز بين الأسئلة ويفرض التسلسل `1 ➔ 2 ➔ 3`.
- **RPC Functions:**
  - `import_trainees_bulk_atomic`: ينفذ الاستيراد الذري بنظام All-or-Nothing.
  - `dispatch_daily_verse_notification`: يدير التدوير الذكي للآيات اليومية (يوم ويوم).
  - `trigger_absence_notification_bulk`: يرسل إشعار الغياب الفوري لفرق العمل المعنية.
  - `reopen_marathon_question_for_trainee`: يتيح إعادة فتح سؤال ماراثون محدد.
- **سلامة العلاقات والصفوف المعزولة (Orphan Rows Check):** **0 صفوف معزولة (Zero Orphans)**.
- **النتيجة:** ✅ PASS.
