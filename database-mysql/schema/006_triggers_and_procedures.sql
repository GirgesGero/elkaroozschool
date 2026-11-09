-- =============================================================================
-- EL KAROOZ SCHOOL — MySQL 8.0+ Enterprise Schema
-- Part 6: Stored Procedures & Business Integrity Triggers
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1. Audit Logs Immutability Enforcement
-- Prohibits any modification or deletion of audit trail entries
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_logs_deny_update;
DROP TRIGGER IF EXISTS trg_audit_logs_deny_delete;

DELIMITER $$

CREATE TRIGGER trg_audit_logs_deny_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'سجلات التدقيق غير قابلة للتعديل إطلاقاً (Audit logs are strictly immutable)';
END$$

CREATE TRIGGER trg_audit_logs_deny_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'سجلات التدقيق غير قابلة للحذف إطلاقاً (Audit logs are strictly immutable)';
END$$

DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. System Administrator Invariant Guard
-- Prevents demoting or deleting the last active system administrator
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_profiles_guard_last_admin_update;
DROP TRIGGER IF EXISTS trg_profiles_guard_last_admin_delete;

DELIMITER $$

CREATE TRIGGER trg_profiles_guard_last_admin_update
BEFORE UPDATE ON profiles
FOR EACH ROW
BEGIN
    DECLARE v_active_admin_count INT;
    IF OLD.role_id = 'admin' AND NEW.role_id <> 'admin' THEN
        SELECT COUNT(*) INTO v_active_admin_count
        FROM profiles
        WHERE role_id = 'admin'
          AND deleted_at IS NULL
          AND id <> OLD.id;
          
        IF v_active_admin_count < 1 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'لا يمكن إلغاء دور مدير النظام دون وجود مدير نظام نشط آخر على الأقل';
        END IF;
    END IF;
END$$

CREATE TRIGGER trg_profiles_guard_last_admin_delete
BEFORE DELETE ON profiles
FOR EACH ROW
BEGIN
    DECLARE v_active_admin_count INT;
    IF OLD.role_id = 'admin' THEN
        SELECT COUNT(*) INTO v_active_admin_count
        FROM profiles
        WHERE role_id = 'admin'
          AND deleted_at IS NULL
          AND id <> OLD.id;
          
        IF v_active_admin_count < 1 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'لا يمكن حذف مدير النظام الأخير؛ يجب وجود مدير نظام نشط آخر دائماً';
        END IF;
    END IF;
END$$

DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. Thursday Attendance Session Lock
-- Evaluated against Africa/Cairo local time (UTC+2)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_attendance_thursday_freeze_insert;
DROP TRIGGER IF EXISTS trg_attendance_thursday_freeze_update;
DROP TRIGGER IF EXISTS trg_attendance_thursday_freeze_delete;

DELIMITER $$

CREATE TRIGGER trg_attendance_thursday_freeze_insert
BEFORE INSERT ON attendance_records
FOR EACH ROW
BEGIN
    DECLARE v_session_date DATE;
    DECLARE v_session_status VARCHAR(20);
    DECLARE v_cairo_now DATETIME;
    DECLARE v_cairo_date DATE;
    DECLARE v_day_of_week INT;

    SELECT session_date, status INTO v_session_date, v_session_status
    FROM attendance_sessions
    WHERE id = NEW.session_id;

    IF v_session_status = 'LOCKED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'جلسة الحضور مغلقة ومقفلة بالكامل';
    END IF;

    SET v_cairo_now = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR);
    SET v_cairo_date = DATE(v_cairo_now);
    SET v_day_of_week = DAYOFWEEK(v_cairo_now); -- 5 = Thursday, 6 = Friday

    -- If session is from an earlier date and we crossed Thursday night
    IF v_session_date < v_cairo_date AND (v_day_of_week >= 5 OR DATEDIFF(v_cairo_date, v_session_date) > 6) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'تم قفل تعديل الحضور لجلسات الأسابيع السابقة آلياً يوم الخميس (توقيت القاهرة)';
    END IF;
END$$

CREATE TRIGGER trg_attendance_thursday_freeze_update
BEFORE UPDATE ON attendance_records
FOR EACH ROW
BEGIN
    DECLARE v_session_date DATE;
    DECLARE v_session_status VARCHAR(20);
    DECLARE v_cairo_now DATETIME;
    DECLARE v_cairo_date DATE;
    DECLARE v_day_of_week INT;

    SELECT session_date, status INTO v_session_date, v_session_status
    FROM attendance_sessions
    WHERE id = NEW.session_id;

    IF v_session_status = 'LOCKED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'جلسة الحضور مغلقة ومقفلة بالكامل';
    END IF;

    SET v_cairo_now = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR);
    SET v_cairo_date = DATE(v_cairo_now);
    SET v_day_of_week = DAYOFWEEK(v_cairo_now);

    IF v_session_date < v_cairo_date AND (v_day_of_week >= 5 OR DATEDIFF(v_cairo_date, v_session_date) > 6) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'تم قفل تعديل الحضور لجلسات الأسابيع السابقة آلياً يوم الخميس (توقيت القاهرة)';
    END IF;
END$$

CREATE TRIGGER trg_attendance_thursday_freeze_delete
BEFORE DELETE ON attendance_records
FOR EACH ROW
BEGIN
    DECLARE v_session_date DATE;
    DECLARE v_session_status VARCHAR(20);
    DECLARE v_cairo_now DATETIME;
    DECLARE v_cairo_date DATE;
    DECLARE v_day_of_week INT;

    SELECT session_date, status INTO v_session_date, v_session_status
    FROM attendance_sessions
    WHERE id = OLD.session_id;

    IF v_session_status = 'LOCKED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'جلسة الحضور مغلقة ومقفلة بالكامل';
    END IF;

    SET v_cairo_now = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR);
    SET v_cairo_date = DATE(v_cairo_now);
    SET v_day_of_week = DAYOFWEEK(v_cairo_now);

    IF v_session_date < v_cairo_date AND (v_day_of_week >= 5 OR DATEDIFF(v_cairo_date, v_session_date) > 6) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'تم قفل حذف الحضور لجلسات الأسابيع السابقة آلياً يوم الخميس (توقيت القاهرة)';
    END IF;
END$$

DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. Feed Post Comments & Likes Counter Synchronization
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_post_comments_count_insert;
DROP TRIGGER IF EXISTS trg_post_comments_count_delete;
DROP TRIGGER IF EXISTS trg_reactions_count_insert;
DROP TRIGGER IF EXISTS trg_reactions_count_delete;

DELIMITER $$

CREATE TRIGGER trg_post_comments_count_insert
AFTER INSERT ON post_comments
FOR EACH ROW
BEGIN
    IF NEW.deleted_at IS NULL THEN
        UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    END IF;
END$$

CREATE TRIGGER trg_post_comments_count_delete
AFTER UPDATE ON post_comments
FOR EACH ROW
BEGIN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        UPDATE feed_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = NEW.post_id;
    END IF;
END$$

CREATE TRIGGER trg_reactions_count_insert
AFTER INSERT ON reactions
FOR EACH ROW
BEGIN
    IF NEW.target_type = 'POST' THEN
        UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
    END IF;
END$$

CREATE TRIGGER trg_reactions_count_delete
AFTER DELETE ON reactions
FOR EACH ROW
BEGIN
    IF OLD.target_type = 'POST' THEN
        UPDATE feed_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.target_id;
    END IF;
END$$

DELIMITER ;
