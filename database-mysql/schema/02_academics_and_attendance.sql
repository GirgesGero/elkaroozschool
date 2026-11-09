-- =============================================================================
-- EL KAROOZ SCHOOL — Production MySQL Database Schema
-- File: 02_academics_and_attendance.sql
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Description: Terms, lecturers, lectures, curriculum matrix, attendance & exams.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Academic Terms (الفصول الدراسية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `terms` (
    `id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `academic_year` VARCHAR(50) NOT NULL,
    `is_current` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_terms_group` (`group_id`),
    INDEX `idx_terms_current` (`is_current`),
    INDEX `idx_terms_deleted` (`deleted_at`),
    CONSTRAINT `fk_terms_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_terms_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Lecturers (هيئة التدريس والمحاضرين)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lecturers` (
    `id` CHAR(36) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `title` VARCHAR(100) NOT NULL, -- e.g. 'القمص / القس / الشماس / الخادم'
    `avatar_url` TEXT NULL,
    `bio` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_lecturers_name` (`full_name`),
    INDEX `idx_lecturers_deleted` (`deleted_at`),
    CONSTRAINT `fk_lecturers_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Curriculums (المناهج والملخصات الأكاديمية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `curriculums` (
    `id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `term_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `file_url` TEXT NOT NULL,
    `file_type` VARCHAR(32) NOT NULL DEFAULT 'PDF',
    `file_size_bytes` BIGINT NOT NULL DEFAULT 0,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_curriculums_group` (`group_id`),
    INDEX `idx_curriculums_term` (`term_id`),
    INDEX `idx_curriculums_deleted` (`deleted_at`),
    CONSTRAINT `fk_curriculums_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_curriculums_term` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_curriculums_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_curriculums_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Curriculum Days Matrix (مصفوفة أيام المنهج الدراسي)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `curriculum_days` (
    `id` CHAR(36) NOT NULL,
    `term_id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `day_number` INT NOT NULL,
    `study_date` DATE NULL,
    `title` VARCHAR(200) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'POSTPONED'
    `notes` TEXT NULL,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    -- MySQL 8.0 Virtual generated column for conditional uniqueness:
    `active_term_day_key` VARCHAR(100) GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, CONCAT(`term_id`, '_', `day_number`), NULL)) STORED,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_curriculum_days_active` (`active_term_day_key`),
    INDEX `idx_curriculum_days_term` (`term_id`),
    INDEX `idx_curriculum_days_group` (`group_id`),
    INDEX `idx_curriculum_days_date` (`study_date`),
    INDEX `idx_curriculum_days_deleted` (`deleted_at`),
    CONSTRAINT `fk_cdays_term` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cdays_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cdays_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_cdays_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Lectures (سجل المحاضرات الأساسي)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lectures` (
    `id` CHAR(36) NOT NULL,
    `term_id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `lecturer_id` CHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `lecture_date` DATE NOT NULL,
    `audio_url` TEXT NULL,
    `attachments_metadata` JSON NULL,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_lectures_term` (`term_id`),
    INDEX `idx_lectures_group` (`group_id`),
    INDEX `idx_lectures_lecturer` (`lecturer_id`),
    INDEX `idx_lectures_date` (`lecture_date`),
    INDEX `idx_lectures_deleted` (`deleted_at`),
    CONSTRAINT `fk_lectures_term` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lectures_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lectures_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_lectures_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_lectures_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Curriculum Entries (حصص وجدول اليوم الدراسي)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `curriculum_entries` (
    `id` CHAR(36) NOT NULL,
    `day_id` CHAR(36) NOT NULL,
    `term_id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `curriculum_id` CHAR(36) NULL,
    `lecture_id` CHAR(36) NULL,
    `lecturer_id` CHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `start_time` TIME NULL,
    `end_time` TIME NULL,
    `order_index` INT NOT NULL DEFAULT 1,
    `audio_asset_id` CHAR(36) NULL,
    `content_metadata` JSON NULL,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_centries_day` (`day_id`),
    INDEX `idx_centries_term` (`term_id`),
    INDEX `idx_centries_group` (`group_id`),
    INDEX `idx_centries_lecture` (`lecture_id`),
    INDEX `idx_centries_lecturer` (`lecturer_id`),
    INDEX `idx_centries_deleted` (`deleted_at`),
    CONSTRAINT `fk_centries_day` FOREIGN KEY (`day_id`) REFERENCES `curriculum_days` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_centries_term` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_centries_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_centries_curriculum` FOREIGN KEY (`curriculum_id`) REFERENCES `curriculums` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_centries_lecture` FOREIGN KEY (`lecture_id`) REFERENCES `lectures` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_centries_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_centries_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_centries_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Curriculum Revisions (أرشيف ومراجعات المناهج)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `curriculum_revisions` (
    `id` CHAR(36) NOT NULL,
    `entry_id` CHAR(36) NOT NULL,
    `revision_number` INT NOT NULL DEFAULT 1,
    `snapshot` JSON NOT NULL,
    `changed_by` CHAR(36) NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_crevisions_entry` (`entry_id`),
    CONSTRAINT `fk_crevisions_entry` FOREIGN KEY (`entry_id`) REFERENCES `curriculum_entries` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_crevisions_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Attendance Sessions (جلسات الحضور الأسبوعية — دورة الجمعة)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance_sessions` (
    `id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `session_date` DATE NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- 'OPEN' | 'LOCKED'
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_group_session_date` (`group_id`, `session_date`),
    INDEX `idx_attendance_sessions_status` (`status`),
    CONSTRAINT `fk_asessions_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Attendance Records (سجلات حضور الطلاب)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance_records` (
    `id` CHAR(36) NOT NULL,
    `session_id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `trainee_id` CHAR(36) NOT NULL,
    `status` VARCHAR(32) NOT NULL, -- 'PRESENT' | 'ABSENT' | 'LATE'
    `notes` TEXT NULL,
    `recorded_by` CHAR(36) NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_session_trainee` (`session_id`, `trainee_id`),
    INDEX `idx_arecords_group` (`group_id`),
    INDEX `idx_arecords_trainee` (`trainee_id`),
    INDEX `idx_arecords_status` (`status`),
    INDEX `idx_arecords_deleted` (`deleted_at`),
    CONSTRAINT `fk_arecords_session` FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_arecords_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_arecords_trainee` FOREIGN KEY (`trainee_id`) REFERENCES `profiles` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_arecords_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_arecords_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Exams (الامتحانات الفصلية — امتحان واحد لكل تيرم نشط)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `exams` (
    `id` CHAR(36) NOT NULL,
    `term_id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `max_score` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    `exam_date` DATE NOT NULL,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    -- MySQL 8.0 Virtual generated column for conditional uniqueness (DB-13):
    `active_term_exam_key` VARCHAR(100) GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, CONCAT(`term_id`, '_', `group_id`), NULL)) STORED,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_uq_active_exam_per_term` (`active_term_exam_key`),
    INDEX `idx_exams_term` (`term_id`),
    INDEX `idx_exams_group` (`group_id`),
    INDEX `idx_exams_deleted` (`deleted_at`),
    CONSTRAINT `fk_exams_term` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_exams_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_exams_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_exams_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Exam Grades (رصد درجات الطلاب والتقديرات)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `exam_grades` (
    `id` CHAR(36) NOT NULL,
    `exam_id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `trainee_id` CHAR(36) NOT NULL,
    `numeric_score` DECIMAL(5,2) NOT NULL,
    `appreciation_grade` VARCHAR(32) NOT NULL,
    `notes` TEXT NULL,
    `graded_by` CHAR(36) NULL,
    `graded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_exam_trainee` (`exam_id`, `trainee_id`),
    INDEX `idx_grades_group` (`group_id`),
    INDEX `idx_grades_trainee` (`trainee_id`),
    INDEX `idx_grades_deleted` (`deleted_at`),
    CONSTRAINT `fk_grades_exam` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_grades_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_grades_trainee` FOREIGN KEY (`trainee_id`) REFERENCES `profiles` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_grades_graded_by` FOREIGN KEY (`graded_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_grades_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
