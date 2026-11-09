-- =============================================================================
-- EL KAROOZ SCHOOL — Production MySQL Database Schema
-- File: 05_triggers_and_procedures.sql
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Description: Stored Procedures & Business Integrity Triggers.
-- Translates critical PostgreSQL PL/pgSQL RPCs & Triggers into MySQL 8.0+.
-- =============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- 1. Trigger: Compute Exam Appreciation Grade (حساب تقدير درجات الامتحانات)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_compute_exam_appreciation_insert`$$
CREATE TRIGGER `trg_compute_exam_appreciation_insert`
BEFORE INSERT ON `exam_grades`
FOR EACH ROW
BEGIN
    DECLARE v_exam_max DECIMAL(5,2);
    DECLARE v_percentage DECIMAL(5,2);

    SELECT `max_score` INTO v_exam_max FROM `exams` WHERE `id` = NEW.`exam_id`;
    IF v_exam_max IS NULL OR v_exam_max <= 0 THEN
        SET v_exam_max = 100.00;
    END IF;

    SET v_percentage = (NEW.`numeric_score` / v_exam_max) * 100.00;

    IF v_percentage < 60.00 THEN
        SET NEW.`appreciation_grade` = 'ضعيف';
    ELSEIF v_percentage < 70.00 THEN
        SET NEW.`appreciation_grade` = 'مقبول';
    ELSEIF v_percentage < 80.00 THEN
        SET NEW.`appreciation_grade` = 'جيد';
    ELSEIF v_percentage < 90.00 THEN
        SET NEW.`appreciation_grade` = 'جيد جدًا';
    ELSE
        SET NEW.`appreciation_grade` = 'ممتاز';
    END IF;
END$$

DROP TRIGGER IF EXISTS `trg_compute_exam_appreciation_update`$$
CREATE TRIGGER `trg_compute_exam_appreciation_update`
BEFORE UPDATE ON `exam_grades`
FOR EACH ROW
BEGIN
    DECLARE v_exam_max DECIMAL(5,2);
    DECLARE v_percentage DECIMAL(5,2);

    SELECT `max_score` INTO v_exam_max FROM `exams` WHERE `id` = NEW.`exam_id`;
    IF v_exam_max IS NULL OR v_exam_max <= 0 THEN
        SET v_exam_max = 100.00;
    END IF;

    SET v_percentage = (NEW.`numeric_score` / v_exam_max) * 100.00;

    IF v_percentage < 60.00 THEN
        SET NEW.`appreciation_grade` = 'ضعيف';
    ELSEIF v_percentage < 70.00 THEN
        SET NEW.`appreciation_grade` = 'مقبول';
    ELSEIF v_percentage < 80.00 THEN
        SET NEW.`appreciation_grade` = 'جيد';
    ELSEIF v_percentage < 90.00 THEN
        SET NEW.`appreciation_grade` = 'جيد جدًا';
    ELSE
        SET NEW.`appreciation_grade` = 'ممتاز';
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- 2. Trigger: Check Secretariat Group Limit (حد أقصى 3 أعضاء سكرتارية للفرقة)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_check_secretariat_limit_insert`$$
CREATE TRIGGER `trg_check_secretariat_limit_insert`
BEFORE INSERT ON `group_secretariat`
FOR EACH ROW
BEGIN
    DECLARE v_active_count INT;

    SELECT COUNT(*) INTO v_active_count
    FROM `group_secretariat`
    WHERE `group_id` = NEW.`group_id` AND `is_active` = 1;

    IF v_active_count >= 3 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'لا يمكن تعيين أكثر من 3 أعضاء سكرتارية لنفس الفرقة الدراسية';
    END IF;
END$$

DROP TRIGGER IF EXISTS `trg_check_secretariat_limit_update`$$
CREATE TRIGGER `trg_check_secretariat_limit_update`
BEFORE UPDATE ON `group_secretariat`
FOR EACH ROW
BEGIN
    DECLARE v_active_count INT;

    IF NEW.`is_active` = 1 AND OLD.`is_active` = 0 THEN
        SELECT COUNT(*) INTO v_active_count
        FROM `group_secretariat`
        WHERE `group_id` = NEW.`group_id` AND `is_active` = 1 AND `id` != NEW.`id`;

        IF v_active_count >= 3 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'لا يمكن تعيين أكثر من 3 أعضاء سكرتارية لنفس الفرقة الدراسية';
        END IF;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- 3. Trigger: Feed Comments Counter (مزامنة عداد التعليقات تلقائياً)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_feed_comment_insert`$$
CREATE TRIGGER `trg_feed_comment_insert`
AFTER INSERT ON `post_comments`
FOR EACH ROW
BEGIN
    UPDATE `feed_posts`
    SET `comments_count` = `comments_count` + 1
    WHERE `id` = NEW.`post_id`;
END$$

DROP TRIGGER IF EXISTS `trg_feed_comment_delete`$$
CREATE TRIGGER `trg_feed_comment_delete`
AFTER DELETE ON `post_comments`
FOR EACH ROW
BEGIN
    UPDATE `feed_posts`
    SET `comments_count` = GREATEST(0, `comments_count` - 1)
    WHERE `id` = OLD.`post_id`;
END$$

-- -----------------------------------------------------------------------------
-- 4. Trigger: Feed Reactions Counter (مزامنة عداد التفاعلات تلقائياً)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_feed_reaction_insert`$$
CREATE TRIGGER `trg_feed_reaction_insert`
AFTER INSERT ON `reactions`
FOR EACH ROW
BEGIN
    IF NEW.`target_type` = 'POST' THEN
        UPDATE `feed_posts`
        SET `likes_count` = `likes_count` + 1
        WHERE `id` = NEW.`target_id`;
    END IF;
END$$

DROP TRIGGER IF EXISTS `trg_feed_reaction_delete`$$
CREATE TRIGGER `trg_feed_reaction_delete`
AFTER DELETE ON `reactions`
FOR EACH ROW
BEGIN
    IF OLD.`target_type` = 'POST' THEN
        UPDATE `feed_posts`
        SET `likes_count` = GREATEST(0, `likes_count` - 1)
        WHERE `id` = OLD.`target_id`;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- 5. Trigger: Guard Minimum One System Admin (منع حذف أو إلغاء آخر مدير نظام نشط)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_guard_admin_profile_update`$$
CREATE TRIGGER `trg_guard_admin_profile_update`
BEFORE UPDATE ON `profiles`
FOR EACH ROW
BEGIN
    DECLARE v_active_admin_count INT;

    IF OLD.`role_id` = 'admin' AND (NEW.`role_id` != 'admin' OR NEW.`is_active` = 0 OR NEW.`deleted_at` IS NOT NULL) THEN
        SELECT COUNT(*) INTO v_active_admin_count
        FROM `profiles`
        WHERE `role_id` = 'admin' AND `is_active` = 1 AND `deleted_at` IS NULL AND `id` != OLD.`id`;

        IF v_active_admin_count = 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'لا يمكن إلغاء أو تخفيض رتبة آخر مدير نظام نشط في المنصة.';
        END IF;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- 6. Stored Procedure: Get Trainee Full Profile (عرض الملف الأكاديمي الشامل)
--    يتحقق من دور المستدعي (Admin, Supervisor, Secretariat, Servant, or Self)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_get_trainee_full_profile`$$
CREATE PROCEDURE `sp_get_trainee_full_profile`(
    IN p_caller_id CHAR(36),
    IN p_trainee_id CHAR(36)
)
BEGIN
    DECLARE v_caller_role VARCHAR(32);
    DECLARE v_caller_group SMALLINT UNSIGNED;
    DECLARE v_trainee_group SMALLINT UNSIGNED;
    DECLARE v_is_authorized TINYINT(1) DEFAULT 0;

    -- جلب بيانات المستدعي
    SELECT `role_id`, `group_id` INTO v_caller_role, v_caller_group
    FROM `profiles`
    WHERE `id` = p_caller_id AND `deleted_at` IS NULL;

    -- جلب فرقة الطالب
    SELECT `group_id` INTO v_trainee_group
    FROM `profiles`
    WHERE `id` = p_trainee_id AND `deleted_at` IS NULL;

    -- التحقق من الصلاحية
    IF p_caller_id = p_trainee_id THEN
        SET v_is_authorized = 1;
    ELSEIF v_caller_role = 'admin' THEN
        SET v_is_authorized = 1;
    ELSEIF v_caller_role IN ('supervisor', 'secretariat') AND (v_caller_group = v_trainee_group OR v_caller_group IS NULL) THEN
        SET v_is_authorized = 1;
    ELSEIF v_caller_role = 'servant' AND v_caller_group = v_trainee_group THEN
        SET v_is_authorized = 1;
    END IF;

    IF v_is_authorized = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'غير مصرح لك بعرض الملف الأكاديمي لهذا الدارس.';
    END IF;

    -- إرجاع بيانات الملف الشخصي
    SELECT p.*, g.`name_ar` AS `group_name`, r.`name_ar` AS `role_name`
    FROM `profiles` p
    LEFT JOIN `groups` g ON g.`id` = p.`group_id`
    LEFT JOIN `roles` r ON r.`id` = p.`role_id`
    WHERE p.`id` = p_trainee_id AND p.`deleted_at` IS NULL;
END$$

-- -----------------------------------------------------------------------------
-- 7. Stored Procedure: Get Trainee Attendance Summary (ملخص حضور الدارس)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_get_trainee_attendance_summary`$$
CREATE PROCEDURE `sp_get_trainee_attendance_summary`(
    IN p_caller_id CHAR(36),
    IN p_trainee_id CHAR(36)
)
BEGIN
    SELECT 
        COUNT(*) AS `total_recorded_sessions`,
        SUM(IF(`status` = 'PRESENT', 1, 0)) AS `present_count`,
        SUM(IF(`status` = 'ABSENT', 1, 0)) AS `absent_count`,
        SUM(IF(`status` = 'LATE', 1, 0)) AS `late_count`,
        ROUND(IFNULL(SUM(IF(`status` = 'PRESENT', 1, 0)) / NULLIF(COUNT(*), 0) * 100, 0), 2) AS `attendance_percentage`
    FROM `attendance_records`
    WHERE `trainee_id` = p_trainee_id AND `deleted_at` IS NULL;
END$$

-- -----------------------------------------------------------------------------
-- 8. Stored Procedure: Create Trainee Profile (إنشاء حساب دارس ذرياً)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_create_trainee_profile`$$
CREATE PROCEDURE `sp_create_trainee_profile`(
    IN p_creator_id CHAR(36),
    IN p_username VARCHAR(64),
    IN p_email VARCHAR(255),
    IN p_password_hash VARCHAR(255),
    IN p_full_name VARCHAR(150),
    IN p_birth_date DATE,
    IN p_phone VARCHAR(32),
    IN p_address TEXT,
    IN p_church VARCHAR(150),
    IN p_confession_father VARCHAR(150),
    IN p_group_id SMALLINT UNSIGNED,
    OUT p_new_user_id CHAR(36)
)
BEGIN
    DECLARE v_new_id CHAR(36);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SET v_new_id = UUID();

    -- 1. إنشاء المستخدم في جدول المصادقة
    INSERT INTO `auth_users` (
        `id`, `email`, `password_hash`, `raw_app_meta_data`, `raw_user_meta_data`, `confirmed_at`
    ) VALUES (
        v_new_id,
        LOWER(TRIM(p_email)),
        p_password_hash,
        JSON_OBJECT('role', 'trainee', 'group_id', p_group_id),
        JSON_OBJECT('full_name', p_full_name, 'username', p_username),
        CURRENT_TIMESTAMP(3)
    );

    -- 2. إنشاء الملف الشخصي
    INSERT INTO `profiles` (
        `id`, `username`, `full_name`, `birth_date`, `phone`, `address`,
        `church`, `confession_father`, `role_id`, `group_id`, `is_active`
    ) VALUES (
        v_new_id,
        p_username,
        p_full_name,
        p_birth_date,
        p_phone,
        p_address,
        p_church,
        p_confession_father,
        'trainee',
        p_group_id,
        1
    );

    -- 3. تسجيل الحدث في سجل التدقيق
    INSERT INTO `audit_logs` (
        `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `payload`
    ) VALUES (
        UUID(),
        p_creator_id,
        'CREATE_TRAINEE_PROFILE',
        'profiles',
        v_new_id,
        JSON_OBJECT('username', p_username, 'full_name', p_full_name, 'group_id', p_group_id)
    );

    COMMIT;

    SET p_new_user_id = v_new_id;
END$$

-- -----------------------------------------------------------------------------
-- 9. Stored Procedure: Grant / Revoke Co-System Admin
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_grant_system_admin`$$
CREATE PROCEDURE `sp_grant_system_admin`(
    IN p_admin_id CHAR(36),
    IN p_target_user_id CHAR(36)
)
BEGIN
    DECLARE v_admin_role VARCHAR(32);

    SELECT `role_id` INTO v_admin_role FROM `profiles` WHERE `id` = p_admin_id AND `deleted_at` IS NULL;
    IF v_admin_role != 'admin' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'فقط مدير النظام يملك صلاحية منح رتبة مدير مشارك.';
    END IF;

    START TRANSACTION;

    UPDATE `profiles`
    SET `role_id` = 'admin', `group_id` = NULL, `updated_at` = CURRENT_TIMESTAMP(3)
    WHERE `id` = p_target_user_id;

    UPDATE `auth_users`
    SET `raw_app_meta_data` = JSON_SET(IFNULL(`raw_app_meta_data`, JSON_OBJECT()), '$.role', 'admin')
    WHERE `id` = p_target_user_id;

    INSERT INTO `audit_logs` (
        `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `payload`
    ) VALUES (
        UUID(), p_admin_id, 'GRANT_SYSTEM_ADMIN', 'profiles', p_target_user_id,
        JSON_OBJECT('target_user', p_target_user_id)
    );

    COMMIT;
END$$

DROP PROCEDURE IF EXISTS `sp_revoke_system_admin`$$
CREATE PROCEDURE `sp_revoke_system_admin`(
    IN p_admin_id CHAR(36),
    IN p_target_user_id CHAR(36),
    IN p_demote_role VARCHAR(32)
)
BEGIN
    DECLARE v_admin_role VARCHAR(32);
    DECLARE v_active_admins INT;

    SELECT `role_id` INTO v_admin_role FROM `profiles` WHERE `id` = p_admin_id AND `deleted_at` IS NULL;
    IF v_admin_role != 'admin' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'فقط مدير النظام يملك صلاحية تخفيض رتبة مدير مشارك.';
    END IF;

    SELECT COUNT(*) INTO v_active_admins
    FROM `profiles`
    WHERE `role_id` = 'admin' AND `is_active` = 1 AND `deleted_at` IS NULL AND `id` != p_target_user_id;

    IF v_active_admins = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'لا يمكن تخفيض آخر مدير نظام نشط في المنصة.';
    END IF;

    START TRANSACTION;

    UPDATE `profiles`
    SET `role_id` = p_demote_role, `updated_at` = CURRENT_TIMESTAMP(3)
    WHERE `id` = p_target_user_id;

    UPDATE `auth_users`
    SET `raw_app_meta_data` = JSON_SET(IFNULL(`raw_app_meta_data`, JSON_OBJECT()), '$.role', p_demote_role)
    WHERE `id` = p_target_user_id;

    INSERT INTO `audit_logs` (
        `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `payload`
    ) VALUES (
        UUID(), p_admin_id, 'REVOKE_SYSTEM_ADMIN', 'profiles', p_target_user_id,
        JSON_OBJECT('demoted_to', p_demote_role)
    );

    COMMIT;
END$$

DELIMITER ;
