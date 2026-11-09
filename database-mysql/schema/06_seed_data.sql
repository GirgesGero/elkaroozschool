-- =============================================================================
-- EL KAROOZ SCHOOL — Production MySQL Database Schema
-- File: 06_seed_data.sql
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Description: Core master seed data (Roles, Groups, Permissions, Categories).
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Static Roles
-- -----------------------------------------------------------------------------
INSERT INTO `roles` (`id`, `name_ar`, `description`) VALUES
('admin', 'مدير النظام', 'صلاحيات كاملة على مستوى المنصة وكافة الفرق والعمليات الحساسة'),
('supervisor', 'مشرف عام', 'إشراف على الفرق الدراسية ومتابعة الحضور وسجلات الطلاب الأكاديمية'),
('secretariat', 'سكرتارية الفرقة', 'تسجيل الحضور الأسبوعي ورصد درجات وإدارة شؤون الدارسين في الفرقة'),
('servant', 'خادم بالفرقة', 'متابعة المتدربين والمناهج والأنشطة الخاصة بالفرقة المسندة إليه'),
('trainee', 'دارس / متدرب', 'حساب الطالب لمتابعة المحاضرات والمناهج والماراثونات ودرجات الامتحانات')
ON DUPLICATE KEY UPDATE `name_ar` = VALUES(`name_ar`), `description` = VALUES(`description`);

-- -----------------------------------------------------------------------------
-- 2. Academic Study Groups
-- -----------------------------------------------------------------------------
INSERT INTO `groups` (`id`, `name_ar`, `description`) VALUES
(1, 'الفرقة الأولى', 'مستوى الأساسيات والمقدمات اللاهوتية والكتابية'),
(2, 'الفرقة الثانية', 'مستوى الدراسات المتقدمة وتاريخ الكنيسة والعقيدة'),
(3, 'الفرقة الثالثة', 'مستوى التخرج والدراسات التخصصية والبحثية')
ON DUPLICATE KEY UPDATE `name_ar` = VALUES(`name_ar`), `description` = VALUES(`description`);

-- -----------------------------------------------------------------------------
-- 3. System Permissions Catalog
-- -----------------------------------------------------------------------------
INSERT INTO `permissions` (`id`, `name_ar`, `description`) VALUES
('MANAGE_STUDENTS', 'إدارة الدارسين', 'صلاحية إضافة وتعديل وتجميد حسابات الطلاب والاطلاع على بياناتهم'),
('MANAGE_ATTENDANCE', 'إدارة الحضور والغياب', 'صلاحية فتح جلسات الحضور وتمرير ماسح الـ QR ورصد الحضور يدوياً'),
('MANAGE_CURRICULUM', 'إدارة المنهج الدراسي', 'صلاحية رفع ملفات المنهج وترتيب جدول اليوم الدراسي للمحاضرات'),
('MANAGE_LECTURES', 'إدارة المحاضرات والصوتيات', 'صلاحية جدولة المحاضرات وربط المحاضرين ورفع التسجيلات الصوتية'),
('MANAGE_EXAMS', 'إدارة الامتحانات والدرجات', 'صلاحية إنشاء الامتحانات ورصد وتعديل درجات الطلاب وإصدار التقديرات'),
('MANAGE_MARATHON', 'إدارة ماراثون الكتاب المقدس', 'صلاحية نشر الأسئلة ومراجعة التسليمات وإعادة فتح الأسئلة للطلاب'),
('MANAGE_FEED', 'إدارة حائط المشاركات', 'صلاحية نشر وتثبيت الإعلانات وحذف التعليقات المخالفة'),
('MANAGE_GALLERY', 'إدارة معرض الصور', 'صلاحية إنشاء الألبومات ورفع وتصنيف صور أنشطة المدرسة'),
('MANAGE_AUDIO', 'إدارة المكتبة الصوتية', 'صلاحية إضافة وترتيب الترانيم والمحاضرات الصوتية في قسم MP3'),
('MANAGE_LIBRARY', 'إدارة مكتبة الكتب', 'صلاحية فهرسة الكتب والأبحاث والمراجع الروحية والكنسية'),
('VIEW_REPORTS', 'استعراض التقارير والإحصائيات', 'صلاحية فحص سجلات التدقيق وتقارير نسب الحضور والغياب العامة')
ON DUPLICATE KEY UPDATE `name_ar` = VALUES(`name_ar`), `description` = VALUES(`description`);

-- -----------------------------------------------------------------------------
-- 4. Media & Library Categories
-- -----------------------------------------------------------------------------
INSERT INTO `categories` (`id`, `name_ar`, `type`) VALUES
('CAT_THEOLOGY', 'اللاهوت والعقيدة', 'LIBRARY'),
('CAT_BIBLE_STUDY', 'دراسات الكتاب المقدس', 'LIBRARY'),
('CAT_PATROLOGY', 'أقوال وكتابات الآباء', 'LIBRARY'),
('CAT_CHURCH_HISTORY', 'تاريخ الكنيسة القبطية', 'LIBRARY'),
('CAT_RITUALS', 'الطقوس والألحان الكنسية', 'LIBRARY'),
('CAT_GENERAL_GALLERY', 'الأنشطة العامة والمؤتمرات', 'GALLERY'),
('CAT_PRAYER_MEETINGS', 'صلوات ونهضات روحية', 'GALLERY'),
('CAT_HYMNS', 'ألحان وترانيم روحية', 'AUDIO')
ON DUPLICATE KEY UPDATE `name_ar` = VALUES(`name_ar`), `type` = VALUES(`type`);

-- -----------------------------------------------------------------------------
-- 5. Notification Templates
-- -----------------------------------------------------------------------------
INSERT INTO `notification_templates` (`id`, `template_key`, `template_body`) VALUES
('NOTIF_TMPL_DAILY_VERSE', 'DAILY_VERSE', 'آية اليوم: {{verse_text}} — {{reference}}'),
('NOTIF_TMPL_ATTENDANCE', 'ATTENDANCE_STATUS', 'تم رصد حالة حضورك ليوم الجمعة {{date}}: {{status}}'),
('NOTIF_TMPL_EXAM_GRADE', 'EXAM_RESULT', 'تم رصد نتيجتك في {{exam_title}}: الدرجة {{score}} ({{grade}})'),
('NOTIF_TMPL_MARATHON_OPEN', 'MARATHON_ANNOUNCEMENT', 'تم فتح ماراثون جديد: {{marathon_title}}')
ON DUPLICATE KEY UPDATE `template_body` = VALUES(`template_body`);

-- -----------------------------------------------------------------------------
-- 6. Bible Testaments
-- -----------------------------------------------------------------------------
INSERT INTO `bible_testaments` (`id`, `name_ar`, `name_en`, `code`, `order_index`) VALUES
(1, 'العهد القديم', 'Old Testament', 'OT', 1),
(2, 'العهد الجديد', 'New Testament', 'NT', 2)
ON DUPLICATE KEY UPDATE `name_ar` = VALUES(`name_ar`), `name_en` = VALUES(`name_en`);

-- -----------------------------------------------------------------------------
-- 7. System Reset Gate Singleton Initialization
-- -----------------------------------------------------------------------------
INSERT INTO `system_reset_gate` (`singleton`, `active_run_id`, `auth_cutoff_iat`, `last_completed_at`)
VALUES (1, NULL, 0, NULL)
ON DUPLICATE KEY UPDATE `singleton` = 1;

-- -----------------------------------------------------------------------------
-- 8. Seed Default System Admin (Initial Operator)
--    Email: admin@elkarooz-school.com
--    Password Hash: Bcrypt hash for standard initial provisioning
-- -----------------------------------------------------------------------------
INSERT INTO `auth_users` (
    `id`, `email`, `password_hash`, `raw_app_meta_data`, `raw_user_meta_data`, `is_super_admin`, `confirmed_at`
) VALUES (
    '00000000-0000-4000-a000-000000000001',
    'admin@elkarooz-school.com',
    '$2y$12$e6m0E71y5fO7hU.r8eCgZ.eR74wE9/M73sO7uH5o5zVf7rQ6hU5mC',
    JSON_OBJECT('role', 'admin'),
    JSON_OBJECT('full_name', 'المدير العام للنظام', 'username', 'admin'),
    1,
    CURRENT_TIMESTAMP(3)
) ON DUPLICATE KEY UPDATE `confirmed_at` = VALUES(`confirmed_at`);

INSERT INTO `profiles` (
    `id`, `username`, `full_name`, `birth_date`, `phone`, `address`, `church`,
    `confession_father`, `role_id`, `group_id`, `is_active`
) VALUES (
    '00000000-0000-4000-a000-000000000001',
    'admin',
    'المدير العام للنظام',
    '1980-01-01',
    '01000000000',
    'مقر الكنيسة — مدرسة الكاروز',
    'كنيسة مارمرقس الرسول',
    'نيافة الأنبا مرقص',
    'admin',
    NULL,
    1
) ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role_id` = 'admin';

SET FOREIGN_KEY_CHECKS = 1;
