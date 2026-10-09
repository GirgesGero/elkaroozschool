-- 016_seed_data.sql
-- Base lookup seed data for Roles, Groups, Permissions, Notification Templates, Bible Testaments, and Sources

-- 1. Seed Roles
INSERT INTO public.roles (id, name_ar, description) VALUES
    ('admin', 'مسؤول النظام (Admin)', 'مسؤول النظام الرئيسي بصلاحيات كاملة وغير مقيدة'),
    ('super_user', 'المسؤول المتميز (Super User)', 'مستخدم متميز بصلاحيات مطابقة للمسؤول تماماً عدا تعيين مسؤولين جدد'),
    ('servant', 'خادم (Servant)', 'خادم الفرقة الدراسية بصلاحيات أساسية وصلاحيات مفوضة مستقلة'),
    ('secretariat', 'سكرتارية (Secretariat)', 'سكرتارية الفرقة الدراسية المخصصة لتسجيل الحضور والافتقاد'),
    ('trainee', 'مخدوم / متدرب (Trainee)', 'دارس بمدرسة الكاروز بصلاحيات تفاعلية واستعراض دون نشر')
ON CONFLICT (id) DO UPDATE SET name_ar = EXCLUDED.name_ar, description = EXCLUDED.description;

-- 2. Seed Groups
INSERT INTO public.groups (id, name_ar, description) VALUES
    (1, 'الفرقة الأولى', 'المرحلة الدراسية التمهيدية الأولى بمدرسة الكاروز'),
    (2, 'الفرقة الثانية', 'المرحلة الدراسية المتوسطة الثانية بمدرسة الكاروز'),
    (3, 'الفرقة الثالثة', 'المرحلة الدراسية النهائية الثالثة بمدرسة الكاروز')
ON CONFLICT (id) DO UPDATE SET name_ar = EXCLUDED.name_ar, description = EXCLUDED.description;

-- 3. Seed Delegated Permissions
INSERT INTO public.permissions (id, name_ar, description) VALUES
    ('MANAGE_LECTURES', 'إدارة المحاضرات', 'صلاحية رفع وإدارة المحاضرات والتسجيلات والمرفقات للفرقة'),
    ('MANAGE_CURRICULUM', 'إدارة المناهج', 'صلاحية رفع وتحديث المذكرات والمناهج الدراسية للفرقة'),
    ('MANAGE_MARATHON', 'إنشاء وإدارة الماراثون', 'صلاحية إنشاء أقسام وأسئلة الماراثون ومتابعة المتسابقين'),
    ('GRADE_EXAMS', 'إدخال وتصحيح درجات الامتحانات', 'صلاحية رصد وتعديل درجات المتدربين في امتحانات التيرم'),
    ('MANAGE_BOOKS', 'إدارة الكتب والأبحاث', 'صلاحية إضافة وتحديث مكتبة الكتب والأبحاث التابعة للفرقة')
ON CONFLICT (id) DO UPDATE SET name_ar = EXCLUDED.name_ar, description = EXCLUDED.description;

-- 4. Seed Notification Templates
INSERT INTO public.notification_templates (template_key, template_body) VALUES
    ('PASTORAL', 'سلام ونعمة.. نفتقدك في مدرسة الكاروز للكتاب المقدس. نتمنى حضورك ومشاركتنا الجمعة القادمة لكلمة الله والشركة المقدسة.'),
    ('BIRTHDAY', 'كل سنة وأنت طيب وبخير بمناسبة عيد ميلادك! مدرسة الكاروز وخدامها يتمنون لك عاماً مباركاً مليئاً بالنعمة والسلام.'),
    ('SYSTEM', 'إشعار إداري من مدرسة الكاروز للكتاب المقدس.')
ON CONFLICT (template_key) DO UPDATE SET template_body = EXCLUDED.template_body;

-- 5. Seed Bible Testaments & Sources
INSERT INTO public.bible_testaments (id, code, name_ar, name_en, order_index) VALUES
    (1, 'OT', 'العهد القديم', 'Old Testament', 1),
    (2, 'NT', 'العهد الجديد', 'New Testament', 2)
ON CONFLICT (id) DO UPDATE SET name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en;

INSERT INTO public.bible_sources (id, author_name, source_name, base_url, description) VALUES
    ('st_takla', 'موقع القديس الأنبا تكلا هيمانوت', 'موسوعة الكتاب المقدس والتفاسير المعتمدة للكنيسة القبطية الأرثوذكسية', 'https://st-takla.org/Bibles/Bible-Search/index.php', 'المصدر المعتمد للنصوص، التفاسير الآبائية وقاموس الكلمات')
ON CONFLICT (id) DO UPDATE SET source_name = EXCLUDED.source_name, base_url = EXCLUDED.base_url;

-- 6. Initialize Dispatch State for Daily Verse
INSERT INTO public.daily_verse_dispatch_state (id, mode, current_cycle)
VALUES (1, 'SEQUENTIAL', 1)
ON CONFLICT (id) DO NOTHING;
