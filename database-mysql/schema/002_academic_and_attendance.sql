-- =============================================================================
-- EL KAROOZ SCHOOL — MySQL 8.0+ Enterprise Schema
-- Part 2: Academic Terms, Lecturers, Lectures, Curriculum, Attendance & Exams
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Academic Terms
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS terms (
    id CHAR(36) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    is_current TINYINT(1) NOT NULL DEFAULT 0,
    start_date DATE NULL,
    end_date DATE NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_terms_group (group_id),
    INDEX idx_terms_is_current (is_current),
    CONSTRAINT fk_terms_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Lecturers & Fathers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lecturers (
    id CHAR(36) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    title VARCHAR(100) NULL,
    bio TEXT NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(255) NULL,
    avatar_url MEDIUMTEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    INDEX idx_lecturers_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Lectures & Study Sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lectures (
    id CHAR(36) NOT NULL,
    term_id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    lecturer_id CHAR(36) NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    order_num INT NOT NULL DEFAULT 1,
    scheduled_date DATE NULL,
    pdf_url TEXT NULL,
    audio_url TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    INDEX idx_lectures_term (term_id),
    INDEX idx_lectures_group (group_id),
    INDEX idx_lectures_lecturer (lecturer_id),
    INDEX idx_lectures_order (order_num),
    CONSTRAINT fk_lectures_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE CASCADE,
    CONSTRAINT fk_lectures_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
    CONSTRAINT fk_lectures_lecturer FOREIGN KEY (lecturer_id) REFERENCES lecturers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Curriculums (High-Level Course Overview)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curriculums (
    id CHAR(36) NOT NULL,
    term_id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    file_url TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    INDEX idx_curriculums_term (term_id),
    INDEX idx_curriculums_group (group_id),
    CONSTRAINT fk_curriculums_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE CASCADE,
    CONSTRAINT fk_curriculums_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Curriculum Days (Study Days in a Term)
-- Partial unique emulated via virtual generated column: active_term_id
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curriculum_days (
    id CHAR(36) NOT NULL,
    term_id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    day_number INT NOT NULL,
    study_date DATE NULL,
    title VARCHAR(255) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    active_term_id CHAR(36) GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN term_id ELSE NULL END) VIRTUAL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_active_curriculum_day (active_term_id, day_number),
    INDEX idx_curr_days_term (term_id),
    INDEX idx_curr_days_group (group_id),
    INDEX idx_curr_days_date (study_date),
    CONSTRAINT fk_curr_days_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE CASCADE,
    CONSTRAINT fk_curr_days_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Curriculum Entries (Lectures assigned to specific days)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curriculum_entries (
    id CHAR(36) NOT NULL,
    day_id CHAR(36) NOT NULL,
    lecture_id CHAR(36) NULL,
    lecturer_id CHAR(36) NULL,
    order_index INT NOT NULL DEFAULT 1,
    start_time TIME NULL,
    end_time TIME NULL,
    subject VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_curr_entries_day (day_id),
    INDEX idx_curr_entries_lecture (lecture_id),
    INDEX idx_curr_entries_lecturer (lecturer_id),
    INDEX idx_curr_entries_order (order_index),
    CONSTRAINT fk_curr_entries_day FOREIGN KEY (day_id) REFERENCES curriculum_days (id) ON DELETE CASCADE,
    CONSTRAINT fk_curr_entries_lecture FOREIGN KEY (lecture_id) REFERENCES lectures (id) ON DELETE SET NULL,
    CONSTRAINT fk_curr_entries_lecturer FOREIGN KEY (lecturer_id) REFERENCES lecturers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Curriculum Revisions History
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curriculum_revisions (
    id CHAR(36) NOT NULL,
    curriculum_id CHAR(36) NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    change_summary TEXT NULL,
    changed_by CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_curr_revisions_curriculum (curriculum_id),
    CONSTRAINT fk_curr_revisions_curr FOREIGN KEY (curriculum_id) REFERENCES curriculums (id) ON DELETE CASCADE,
    CONSTRAINT fk_curr_revisions_author FOREIGN KEY (changed_by) REFERENCES profiles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Attendance Sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    session_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    closed_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_att_sessions_group (group_id),
    INDEX idx_att_sessions_date (session_date),
    INDEX idx_att_sessions_status (status),
    CONSTRAINT fk_att_sessions_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Attendance Records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
    id CHAR(36) NOT NULL,
    session_id CHAR(36) NOT NULL,
    trainee_id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
    recorded_by CHAR(36) NULL,
    notes TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    deleted_by CHAR(36) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attendance_trainee_session (session_id, trainee_id),
    INDEX idx_att_records_session (session_id),
    INDEX idx_att_records_trainee (trainee_id),
    INDEX idx_att_records_group (group_id),
    INDEX idx_att_records_status (status),
    CONSTRAINT fk_att_records_session FOREIGN KEY (session_id) REFERENCES attendance_sessions (id) ON DELETE CASCADE,
    CONSTRAINT fk_att_records_trainee FOREIGN KEY (trainee_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_att_records_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
    CONSTRAINT fk_att_records_servant FOREIGN KEY (recorded_by) REFERENCES profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Exams
-- Partial unique: uq_active_exam_term emulated via active_term_id
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
    id CHAR(36) NOT NULL,
    term_id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    exam_date DATE NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    deleted_by CHAR(36) NULL,
    active_term_id CHAR(36) GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN term_id ELSE NULL END) VIRTUAL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_active_exam_per_term (active_term_id, group_id),
    INDEX idx_exams_term (term_id),
    INDEX idx_exams_group (group_id),
    INDEX idx_exams_date (exam_date),
    CONSTRAINT fk_exams_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE CASCADE,
    CONSTRAINT fk_exams_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Exam Grades
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_grades (
    id CHAR(36) NOT NULL,
    exam_id CHAR(36) NOT NULL,
    trainee_id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    appreciation VARCHAR(50) NULL,
    graded_by CHAR(36) NULL,
    notes TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    deleted_by CHAR(36) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_exam_trainee (exam_id, trainee_id),
    INDEX idx_exam_grades_exam (exam_id),
    INDEX idx_exam_grades_trainee (trainee_id),
    INDEX idx_exam_grades_group (group_id),
    CONSTRAINT fk_exam_grades_exam FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_grades_trainee FOREIGN KEY (trainee_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_grades_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_grades_servant FOREIGN KEY (graded_by) REFERENCES profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
