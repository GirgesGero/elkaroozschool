-- =============================================================================
-- EL KAROOZ SCHOOL — MySQL 8.0+ Enterprise Schema
-- Part 7: Seed Data (Roles, Groups, Permissions, Notification Templates)
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. System Roles
-- -----------------------------------------------------------------------------
INSERT INTO roles (id, name_ar, name_en, description, level) VALUES
('admin', 'مدير النظام', 'System Administrator', 'كامل الصلاحيات الفنية والإدارية لإدارة النظام والمستخدمين', 100),
('supervisor', 'مشرف عام', 'General Supervisor', 'إشراف ومتابعة أكاديمية ورعوية وإدارية', 80),
('secretariat', 'سكرتارية', 'Secretariat', 'إدارة الحضور والغياب وشؤون الخدام والمتدربين للفرقة', 60),
('servant', 'خادم', 'Servant', 'إدارة المناهج والامتحانات والأنشطة الرعوية', 40),
('trainee', 'دارس / متدرب', 'Trainee', 'الاطلاع على المناهج والمحاضرات وأداء الامتحانات والماراثون', 20),
('suspended', 'حساب موقوف', 'Suspended', 'حساب معطل وممنوع من الوصول للخدمات', 0)
ON DUPLICATE KEY UPDATE name_ar = VALUES(name_ar), level = VALUES(level);

-- -----------------------------------------------------------------------------
-- 2. Academic Groups (Cohorts)
-- -----------------------------------------------------------------------------
INSERT INTO `groups` (id, name_ar, name_en, code, academic_year) VALUES
(1, 'الفرقة الأولى', 'First Year', 'GROUP_1', '2026/2027'),
(2, 'الفرقة الثانية', 'Second Year', 'GROUP_2', '2026/2027'),
(3, 'الفرقة الثالثة', 'Third Year', 'GROUP_3', '2026/2027')
ON DUPLICATE KEY UPDATE name_ar = VALUES(name_ar), academic_year = VALUES(academic_year);

-- -----------------------------------------------------------------------------
-- 3. Operational Permissions
-- -----------------------------------------------------------------------------
INSERT INTO permissions (id, name_ar, category, description) VALUES
('MANAGE_CURRICULUM', 'إدارة المناهج والمحاضرات', 'ACADEMIC', 'إضافة وتعديل وحذف المناهج والمحاضرات والملفات الأكاديمية'),
('MANAGE_ATTENDANCE', 'إدارة الحضور والغياب', 'ACADEMIC', 'فتح الجلسات ورصد الحضور والغياب واستخراج التقارير'),
('MANAGE_EXAMS', 'إدارة الامتحانات والدرجات', 'ACADEMIC', 'إنشاء الامتحانات ورصد درجات المتدربين'),
('MANAGE_MARATHONS', 'إدارة ماراثون الكتاب المقدس', 'SPIRITUAL', 'إضافة الأسئلة وتحديد الأقسام ومراجعة الإجابات وإعادة فتحها'),
('MANAGE_MEDIA', 'إدارة مكتبة الميديا والمعرض', 'MEDIA', 'رفع وتعديل وإدارة الصور والألبومات والكتب والتسجيلات'),
('MANAGE_STUDENTS', 'إدارة شؤون الدارسين', 'ADMINISTRATIVE', 'إضافة المتدربين وتعديل بياناتهم وتفعيل أو إيقاف الحسابات'),
('VIEW_REPORTS', 'عرض التقارير والإحصائيات', 'ADMINISTRATIVE', 'الاطلاع على تقارير الأداء الأكاديمي والرعوي والغياب')
ON DUPLICATE KEY UPDATE name_ar = VALUES(name_ar), category = VALUES(category);

-- -----------------------------------------------------------------------------
-- 4. Notification Templates
-- -----------------------------------------------------------------------------
INSERT INTO notification_templates (id, category, template_name, title_template, body_template, is_active) VALUES
('tmpl-pastoral-001', 'PASTORAL', 'غـياب متدرب', 'افتقدناك في المحاضرة يا {{student_name}}', 'سلام ونعمة يا حبيبنا {{student_name}}، افتقدنا وجودك معنا اليوم في المحاضرة.. طمنا عليك وصلواتنا معك.', 1),
('tmpl-birthday-001', 'BIRTHDAY', 'تهنئة عيد ميلاد', 'كل سنة وأنت طيب يا {{student_name}}', 'مدرسة الكاروز تهنئك بعيد ميلادك الميمون، نصلي أن تكون سنة مباركة ومملوءة من نعمة الروح القدس.', 1),
('tmpl-verse-001', 'DAILY_VERSE', 'آية اليوم', 'كلمة الله المنيرة اليومية', '{{verse_text}} ({{verse_reference}})', 1)
ON DUPLICATE KEY UPDATE title_template = VALUES(title_template), body_template = VALUES(body_template);

-- -----------------------------------------------------------------------------
-- 5. Canonical Bible Testaments
-- -----------------------------------------------------------------------------
INSERT INTO bible_testaments (id, name_ar, code, order_num) VALUES
(1, 'العهد القديم', 'OT', 1),
(2, 'العهد الجديد', 'NT', 2),
(3, 'الأسفار القانونية الثانية', 'DC', 3)
ON DUPLICATE KEY UPDATE name_ar = VALUES(name_ar), code = VALUES(code);

-- -----------------------------------------------------------------------------
-- 6. Singletons Initialization (Daily Verse State & System Reset Gate)
-- -----------------------------------------------------------------------------
INSERT INTO daily_verse_dispatch_state (id, current_cycle_index, is_rest_day) VALUES
(1, 0, 0)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO system_reset_gate (id, is_open) VALUES
(1, 0)
ON DUPLICATE KEY UPDATE id = id;

SET FOREIGN_KEY_CHECKS = 1;
