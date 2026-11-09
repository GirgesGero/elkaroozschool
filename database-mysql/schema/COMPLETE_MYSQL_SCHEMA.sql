-- =============================================================================
-- EL KAROOZ SCHOOL — COMPLETE MASTER MYSQL 8.0+ SCHEMA
-- Replaces Supabase (PostgreSQL) with a Native, Fully Autonomous MySQL Database
-- Generated: 2026-11-03 | Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

CREATE DATABASE IF NOT EXISTS elkarooz_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE elkarooz_school;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;


-- >>> START OF 001_auth_and_core_schema.sql <<<
-- =============================================================================
-- EL KAROOZ SCHOOL — MySQL 8.0+ Enterprise Schema
-- Part 1: Authentication, RBAC, Profiles & Secretariat
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Authentication Table (Replaces Supabase auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_users (
    id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'trainee',
    group_id SMALLINT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    email_confirmed_at DATETIME(3) NULL,
    last_sign_in_at DATETIME(3) NULL,
    raw_user_meta_data JSON NULL,
    raw_app_meta_data JSON NULL,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_auth_users_email (email),
    UNIQUE KEY uq_auth_users_username (username),
    INDEX idx_auth_users_role (role),
    INDEX idx_auth_users_group_id (group_id),
    INDEX idx_auth_users_status (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Auth Refresh Tokens (JWT Rotation Engine)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    expires_at DATETIME(3) NOT NULL,
    revoked_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_refresh_tokens_hash (token_hash),
    INDEX idx_refresh_tokens_user (user_id),
    INDEX idx_refresh_tokens_expires (expires_at),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Roles Table (RBAC Core)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(32) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NULL,
    description TEXT NULL,
    level INT NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Permissions Table (Granular Capability Allowlist)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(50) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_permissions_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Academic Groups Table (Cohorts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `groups` (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NULL,
    code VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_groups_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. User Profiles Table (1:1 with auth_users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id CHAR(36) NOT NULL,
    username VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id VARCHAR(32) NOT NULL DEFAULT 'trainee',
    group_id SMALLINT UNSIGNED NULL,
    phone VARCHAR(50) NULL,
    address TEXT NULL,
    birth_date VARCHAR(30) NULL,
    confession_father VARCHAR(255) NULL,
    avatar_url MEDIUMTEXT NULL,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    deleted_by CHAR(36) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_profiles_username (username),
    INDEX idx_profiles_role (role_id),
    INDEX idx_profiles_group (group_id),
    INDEX idx_profiles_status (account_status),
    INDEX idx_profiles_deleted (deleted_at),
    CONSTRAINT fk_profiles_auth_user FOREIGN KEY (id) REFERENCES auth_users (id) ON DELETE CASCADE,
    CONSTRAINT fk_profiles_role FOREIGN KEY (role_id) REFERENCES roles (id),
    CONSTRAINT fk_profiles_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Servant Permissions Table (Delegated Operational Permissions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servant_permissions (
    id CHAR(36) NOT NULL,
    servant_id CHAR(36) NOT NULL,
    permission_id VARCHAR(50) NOT NULL,
    granted_by CHAR(36) NULL,
    granted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_servant_permission (servant_id, permission_id),
    INDEX idx_servant_perm_servant (servant_id),
    INDEX idx_servant_perm_perm (permission_id),
    CONSTRAINT fk_servant_perm_servant FOREIGN KEY (servant_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_servant_perm_perm FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Group Secretariat Table (Max 3 per Group)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_secretariat (
    id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    servant_id CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_group_secretariat (group_id, servant_id),
    INDEX idx_group_secretariat_group (group_id),
    INDEX idx_group_secretariat_servant (servant_id),
    CONSTRAINT fk_group_sec_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
    CONSTRAINT fk_group_sec_servant FOREIGN KEY (servant_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. General Secretariat Members Table (Cross-Group Staff)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS general_secretariat_members (
    id CHAR(36) NOT NULL,
    servant_id CHAR(36) NOT NULL,
    appointed_by CHAR(36) NOT NULL,
    appointed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    notes TEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gen_sec_servant (servant_id),
    CONSTRAINT fk_gen_sec_servant FOREIGN KEY (servant_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. General Secretariat Permissions Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS general_secretariat_permissions (
    id CHAR(36) NOT NULL,
    member_id CHAR(36) NOT NULL,
    permission_key VARCHAR(50) NOT NULL,
    granted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    granted_by CHAR(36) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gen_sec_perm (member_id, permission_key),
    INDEX idx_gen_sec_perm_member (member_id),
    CONSTRAINT fk_gen_sec_perm_member FOREIGN KEY (member_id) REFERENCES general_secretariat_members (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- >>> END OF 001_auth_and_core_schema.sql <<<

-- >>> START OF 002_academic_and_attendance.sql <<<
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

-- >>> END OF 002_academic_and_attendance.sql <<<

-- >>> START OF 003_marathon_and_community.sql <<<
-- =============================================================================
-- EL KAROOZ SCHOOL — MySQL 8.0+ Enterprise Schema
-- Part 3: Marathon Competition, Feed, Gallery, Library, MP3 & Favorites
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Marathons (Bible Quizzes & Competitions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathons (
    id CHAR(36) NOT NULL,
    term_id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    start_date DATETIME(3) NULL,
    end_date DATETIME(3) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    time_limit_minutes INT NOT NULL DEFAULT 0,
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    deleted_by CHAR(36) NULL,
    PRIMARY KEY (id),
    INDEX idx_marathons_term (term_id),
    INDEX idx_marathons_group (group_id),
    INDEX idx_marathons_status (status),
    CONSTRAINT fk_marathons_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathons_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Marathon Sections (Thematic or Chapter Groups)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_sections (
    id CHAR(36) NOT NULL,
    marathon_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_num INT NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_marathon_sections_marathon (marathon_id),
    CONSTRAINT fk_marathon_sections_marathon FOREIGN KEY (marathon_id) REFERENCES marathons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Marathon Questions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_questions (
    id CHAR(36) NOT NULL,
    marathon_id CHAR(36) NOT NULL,
    section_id CHAR(36) NULL,
    question_text TEXT NOT NULL,
    score_weight DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    order_num INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    INDEX idx_marathon_questions_marathon (marathon_id),
    INDEX idx_marathon_questions_section (section_id),
    INDEX idx_marathon_questions_status (status),
    CONSTRAINT fk_marathon_questions_marathon FOREIGN KEY (marathon_id) REFERENCES marathons (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_questions_section FOREIGN KEY (section_id) REFERENCES marathon_sections (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Marathon Answers (Multiple Choice Options)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_answers (
    id CHAR(36) NOT NULL,
    question_id CHAR(36) NOT NULL,
    answer_text TEXT NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    order_num INT NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_marathon_answers_question (question_id),
    INDEX idx_marathon_answers_correct (is_correct),
    CONSTRAINT fk_marathon_answers_question FOREIGN KEY (question_id) REFERENCES marathon_questions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Marathon Question Revisions History
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_question_revisions (
    id CHAR(36) NOT NULL,
    question_id CHAR(36) NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    change_summary TEXT NULL,
    changed_by CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_marathon_qrev_q (question_id),
    CONSTRAINT fk_marathon_qrev_q FOREIGN KEY (question_id) REFERENCES marathon_questions (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_qrev_user FOREIGN KEY (changed_by) REFERENCES profiles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Marathon Trainee Submissions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_trainee_submissions (
    id CHAR(36) NOT NULL,
    marathon_id CHAR(36) NOT NULL,
    trainee_id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    total_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    appreciation VARCHAR(50) NULL,
    is_submitted TINYINT(1) NOT NULL DEFAULT 0,
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    submitted_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_submission_trainee (marathon_id, trainee_id),
    INDEX idx_marathon_subs_marathon (marathon_id),
    INDEX idx_marathon_subs_trainee (trainee_id),
    INDEX idx_marathon_subs_group (group_id),
    INDEX idx_marathon_subs_submitted (is_submitted),
    CONSTRAINT fk_marathon_subs_marathon FOREIGN KEY (marathon_id) REFERENCES marathons (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_subs_trainee FOREIGN KEY (trainee_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_subs_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Marathon Trainee Answers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_trainee_answers (
    id CHAR(36) NOT NULL,
    submission_id CHAR(36) NOT NULL,
    question_id CHAR(36) NOT NULL,
    selected_answer_id CHAR(36) NULL,
    is_correct TINYINT(1) NULL,
    is_reopened TINYINT(1) NOT NULL DEFAULT 0,
    reopened_by CHAR(36) NULL,
    reopened_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_trainee_answer_q (submission_id, question_id),
    INDEX idx_marathon_tans_sub (submission_id),
    INDEX idx_marathon_tans_q (question_id),
    INDEX idx_marathon_tans_ans (selected_answer_id),
    CONSTRAINT fk_marathon_tans_sub FOREIGN KEY (submission_id) REFERENCES marathon_trainee_submissions (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_tans_q FOREIGN KEY (question_id) REFERENCES marathon_questions (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_tans_ans FOREIGN KEY (selected_answer_id) REFERENCES marathon_answers (id) ON DELETE SET NULL,
    CONSTRAINT fk_marathon_tans_reopened_by FOREIGN KEY (reopened_by) REFERENCES profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Feed Posts (Community Wall)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feed_posts (
    id CHAR(36) NOT NULL,
    author_id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NULL,
    content TEXT NOT NULL,
    likes_count INT NOT NULL DEFAULT 0,
    comments_count INT NOT NULL DEFAULT 0,
    is_pinned TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    deleted_by CHAR(36) NULL,
    PRIMARY KEY (id),
    INDEX idx_feed_posts_author (author_id),
    INDEX idx_feed_posts_group (group_id),
    INDEX idx_feed_posts_created (created_at),
    INDEX idx_feed_posts_deleted (deleted_at),
    CONSTRAINT fk_feed_posts_author FOREIGN KEY (author_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_feed_posts_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Post Images (Multi-image carousel for Feed)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_images (
    id CHAR(36) NOT NULL,
    post_id CHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    order_num INT NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_post_images_post (post_id),
    CONSTRAINT fk_post_images_post FOREIGN KEY (post_id) REFERENCES feed_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Post Comments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_comments (
    id CHAR(36) NOT NULL,
    post_id CHAR(36) NOT NULL,
    author_id CHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    deleted_by CHAR(36) NULL,
    PRIMARY KEY (id),
    INDEX idx_post_comments_post (post_id),
    INDEX idx_post_comments_author (author_id),
    INDEX idx_post_comments_deleted (deleted_at),
    CONSTRAINT fk_post_comments_post FOREIGN KEY (post_id) REFERENCES feed_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_comments_author FOREIGN KEY (author_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Reactions (Likes & Emoji Reactions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reactions (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id CHAR(36) NOT NULL,
    reaction_type VARCHAR(20) NOT NULL DEFAULT 'LIKE',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_reaction_target (user_id, target_type, target_id),
    INDEX idx_reactions_target (target_type, target_id),
    INDEX idx_reactions_user (user_id),
    CONSTRAINT fk_reactions_user FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. General Library Categories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name_ar VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. Gallery Albums
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_albums (
    id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    cover_image_url TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    INDEX idx_gallery_albums_group (group_id),
    CONSTRAINT fk_gallery_albums_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. Gallery Items (Photos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_items (
    id CHAR(36) NOT NULL,
    album_id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    title VARCHAR(255) NULL,
    image_url TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    INDEX idx_gallery_items_album (album_id),
    INDEX idx_gallery_items_group (group_id),
    CONSTRAINT fk_gallery_items_album FOREIGN KEY (album_id) REFERENCES gallery_albums (id) ON DELETE CASCADE,
    CONSTRAINT fk_gallery_items_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. Electronic Books Library
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
    id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NULL,
    category_id SMALLINT UNSIGNED NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NULL,
    description TEXT NULL,
    file_url TEXT NOT NULL,
    cover_url TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    INDEX idx_books_group (group_id),
    INDEX idx_books_category (category_id),
    INDEX idx_books_title (title),
    CONSTRAINT fk_books_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE SET NULL,
    CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. Research Papers & Articles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS researches (
    id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NULL,
    category_id SMALLINT UNSIGNED NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NULL,
    description TEXT NULL,
    file_url TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    INDEX idx_researches_group (group_id),
    INDEX idx_researches_category (category_id),
    CONSTRAINT fk_researches_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE SET NULL,
    CONSTRAINT fk_researches_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 17. MP3 Audio Tracks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mp3_tracks (
    id CHAR(36) NOT NULL,
    group_id SMALLINT UNSIGNED NOT NULL,
    category_id SMALLINT UNSIGNED NULL,
    lecturer_id CHAR(36) NULL,
    title VARCHAR(255) NOT NULL,
    audio_url TEXT NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    order_num INT NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    INDEX idx_mp3_group (group_id),
    INDEX idx_mp3_category (category_id),
    INDEX idx_mp3_lecturer (lecturer_id),
    CONSTRAINT fk_mp3_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
    CONSTRAINT fk_mp3_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
    CONSTRAINT fk_mp3_lecturer FOREIGN KEY (lecturer_id) REFERENCES lecturers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 18. User Favorites (Bookmarks across media & lessons)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_favorites (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    item_id CHAR(36) NOT NULL,
    notes TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_favorite_item (user_id, item_type, item_id),
    INDEX idx_user_fav_user (user_id),
    INDEX idx_user_fav_item (item_type, item_id),
    CONSTRAINT fk_user_fav_user FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- >>> END OF 003_marathon_and_community.sql <<<

-- >>> START OF 004_bible_encyclopedia.sql <<<
-- =============================================================================
-- EL KAROOZ SCHOOL — MySQL 8.0+ Enterprise Schema
-- Part 4: Canonical Bible Engine & Patristic Encyclopedia
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Bible Testaments (Old / New / Deuterocanonical)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_testaments (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name_ar VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    order_num INT NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_testaments_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Bible Books (Canonical 73 Books)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_books (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    testament_id SMALLINT UNSIGNED NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    chapters_count INT NOT NULL DEFAULT 1,
    order_num INT NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_books_code (code),
    INDEX idx_bible_books_testament (testament_id),
    INDEX idx_bible_books_order (order_num),
    CONSTRAINT fk_bible_books_testament FOREIGN KEY (testament_id) REFERENCES bible_testaments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Bible Chapters
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_chapters (
    id CHAR(36) NOT NULL,
    book_id SMALLINT UNSIGNED NOT NULL,
    chapter_number INT NOT NULL,
    verses_count INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_book_chapter (book_id, chapter_number),
    INDEX idx_bible_chapters_book (book_id),
    CONSTRAINT fk_bible_chapters_book FOREIGN KEY (book_id) REFERENCES bible_books (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Bible Verses (Verbatim Text Preservation Law)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_verses (
    id CHAR(36) NOT NULL,
    chapter_id CHAR(36) NOT NULL,
    verse_number INT NOT NULL,
    text_ar TEXT NOT NULL,
    text_clean TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_chapter_verse (chapter_id, verse_number),
    INDEX idx_bible_verses_chapter (chapter_id),
    FULLTEXT INDEX ft_bible_verses_clean (text_clean),
    CONSTRAINT fk_bible_verses_chapter FOREIGN KEY (chapter_id) REFERENCES bible_chapters (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Positional Verse Words (Interactive Patristic Word Breakdown)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_verse_words (
    id CHAR(36) NOT NULL,
    verse_id CHAR(36) NOT NULL,
    word_position INT NOT NULL,
    word_ar VARCHAR(100) NOT NULL,
    has_commentary TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_verse_word_position (verse_id, word_position),
    INDEX idx_verse_words_verse (verse_id),
    INDEX idx_verse_words_commentary (has_commentary),
    CONSTRAINT fk_verse_words_verse FOREIGN KEY (verse_id) REFERENCES bible_verses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Patristic Commentary Sources (Fathers, Exegesis, Manuscripts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_sources (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name_ar VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NULL,
    source_url TEXT NULL,
    description TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Verse Commentaries (Full Contextual Commentary per Verse)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_commentaries (
    id CHAR(36) NOT NULL,
    verse_id CHAR(36) NOT NULL,
    source_id SMALLINT UNSIGNED NOT NULL,
    commentary_text MEDIUMTEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_verse_commentary_source (verse_id, source_id),
    INDEX idx_commentaries_verse (verse_id),
    INDEX idx_commentaries_source (source_id),
    FULLTEXT INDEX ft_commentary_text (commentary_text),
    CONSTRAINT fk_commentaries_verse FOREIGN KEY (verse_id) REFERENCES bible_verses (id) ON DELETE CASCADE,
    CONSTRAINT fk_commentaries_source FOREIGN KEY (source_id) REFERENCES bible_sources (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Word-Level Contextual Commentaries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_word_commentaries (
    id CHAR(36) NOT NULL,
    word_id CHAR(36) NOT NULL,
    source_id SMALLINT UNSIGNED NOT NULL,
    commentary_text TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_word_comm_word (word_id),
    INDEX idx_word_comm_source (source_id),
    CONSTRAINT fk_word_comm_word FOREIGN KEY (word_id) REFERENCES bible_verse_words (id) ON DELETE CASCADE,
    CONSTRAINT fk_word_comm_source FOREIGN KEY (source_id) REFERENCES bible_sources (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Universal Biblical Dictionary & Glossary Entries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_dictionary_entries (
    id CHAR(36) NOT NULL,
    term_ar VARCHAR(255) NOT NULL,
    definition MEDIUMTEXT NOT NULL,
    source_id SMALLINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_dict_term (term_ar),
    INDEX idx_dict_source (source_id),
    FULLTEXT INDEX ft_dict_def (definition),
    CONSTRAINT fk_dict_source FOREIGN KEY (source_id) REFERENCES bible_sources (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Word-to-Dictionary Mapping Junction
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS word_dictionary_mappings (
    id CHAR(36) NOT NULL,
    word_id CHAR(36) NOT NULL,
    entry_id CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_word_dict_mapping (word_id, entry_id),
    INDEX idx_wdm_word (word_id),
    INDEX idx_wdm_entry (entry_id),
    CONSTRAINT fk_wdm_word FOREIGN KEY (word_id) REFERENCES bible_verse_words (id) ON DELETE CASCADE,
    CONSTRAINT fk_wdm_entry FOREIGN KEY (entry_id) REFERENCES bible_dictionary_entries (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Content Version Ledger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_content_versions (
    id CHAR(36) NOT NULL,
    version_tag VARCHAR(50) NOT NULL,
    release_notes TEXT NULL,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_version_tag (version_tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- >>> END OF 004_bible_encyclopedia.sql <<<

-- >>> START OF 005_system_and_operations.sql <<<
-- =============================================================================
-- EL KAROOZ SCHOOL — MySQL 8.0+ Enterprise Schema
-- Part 5: Notifications, Daily Verse, Audit, Backups, Media & Safe System Reset
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. In-App Notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) NOT NULL,
    recipient_id CHAR(36) NOT NULL,
    category VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    route_target VARCHAR(255) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    metadata JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_notifications_recipient (recipient_id),
    INDEX idx_notifications_category (category),
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_created (created_at),
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Notification Templates (Pastoral, Birthday, Daily Verse)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_templates (
    id CHAR(36) NOT NULL,
    category VARCHAR(30) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    body_template TEXT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_template_cat_name (category, template_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Web Push Subscriptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_push_subs_user (user_id),
    CONSTRAINT fk_push_subs_user FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Daily Verse Bank
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_verses (
    id CHAR(36) NOT NULL,
    verse_text TEXT NOT NULL,
    reference VARCHAR(100) NOT NULL,
    order_num INT NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_daily_verses_order (order_num),
    INDEX idx_daily_verses_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Daily Verse Dispatch State Singleton
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_verse_dispatch_state (
    id SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    last_dispatched_verse_id CHAR(36) NULL,
    current_cycle_index INT NOT NULL DEFAULT 0,
    is_rest_day TINYINT(1) NOT NULL DEFAULT 0,
    last_dispatched_date DATE NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT fk_dv_dispatch_verse FOREIGN KEY (last_dispatched_verse_id) REFERENCES daily_verses (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Immutable Audit Logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id CHAR(36) NOT NULL,
    actor_id CHAR(36) NULL,
    actor_name VARCHAR(255) NULL,
    actor_role VARCHAR(50) NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id CHAR(36) NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_audit_logs_actor (actor_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_resource (resource_type, resource_id),
    INDEX idx_audit_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Backup Records Ledger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS backup_records (
    id CHAR(36) NOT NULL,
    created_by CHAR(36) NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    storage_option VARCHAR(50) NOT NULL DEFAULT 'LOCAL_STORAGE',
    includes_database TINYINT(1) NOT NULL DEFAULT 1,
    includes_files TINYINT(1) NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    deleted_by CHAR(36) NULL,
    PRIMARY KEY (id),
    INDEX idx_backup_records_created (created_at),
    INDEX idx_backup_records_status (status),
    CONSTRAINT fk_backup_records_author FOREIGN KEY (created_by) REFERENCES profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Bulk Import History
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_history (
    id CHAR(36) NOT NULL,
    uploaded_by CHAR(36) NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL DEFAULT 'EXCEL',
    total_rows INT NOT NULL DEFAULT 0,
    imported_count INT NOT NULL DEFAULT 0,
    skipped_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    error_log JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_import_history_created (created_at),
    CONSTRAINT fk_import_history_user FOREIGN KEY (uploaded_by) REFERENCES profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Central Media Assets Registry
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
    id CHAR(36) NOT NULL,
    uploaded_by CHAR(36) NULL,
    group_id SMALLINT UNSIGNED NULL,
    resource_type VARCHAR(50) NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'HOSTINGER_LOCAL',
    drive_file_id VARCHAR(255) NULL,
    drive_folder_id VARCHAR(255) NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    INDEX idx_media_assets_group (group_id),
    INDEX idx_media_assets_resource (resource_type),
    INDEX idx_media_assets_provider (storage_provider),
    INDEX idx_media_assets_checksum (checksum_sha256),
    INDEX idx_media_assets_drive_id (drive_file_id),
    CONSTRAINT fk_media_assets_uploader FOREIGN KEY (uploaded_by) REFERENCES profiles (id) ON DELETE SET NULL,
    CONSTRAINT fk_media_assets_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. System Admin Role Change Permits (Co-Admin Transfer Protection)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_admin_role_change_permits (
    id CHAR(36) NOT NULL,
    permit_token VARCHAR(64) NOT NULL,
    admin_id CHAR(36) NOT NULL,
    target_id CHAR(36) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    used_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_permit_token (permit_token),
    INDEX idx_admin_permits_admin (admin_id),
    INDEX idx_admin_permits_target (target_id),
    CONSTRAINT fk_admin_permits_admin FOREIGN KEY (admin_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_admin_permits_target FOREIGN KEY (target_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. System Reset Gate (Barrier Locking Singleton)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_gate (
    id SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    is_open TINYINT(1) NOT NULL DEFAULT 0,
    active_run_id CHAR(36) NULL,
    current_lease_holder CHAR(36) NULL,
    locked_at DATETIME(3) NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. System Reset Runs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_runs (
    id CHAR(36) NOT NULL,
    initiated_by CHAR(36) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PREVIEW',
    backup_id CHAR(36) NULL,
    safety_snapshot_path TEXT NULL,
    confirmed_at DATETIME(3) NULL,
    completed_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_reset_runs_initiator (initiated_by),
    INDEX idx_reset_runs_status (status),
    CONSTRAINT fk_reset_runs_user FOREIGN KEY (initiated_by) REFERENCES profiles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. System Reset Run Asset Deletion Ledger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_run_assets (
    id CHAR(36) NOT NULL,
    run_id CHAR(36) NOT NULL,
    asset_id CHAR(36) NOT NULL,
    deletion_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    error_message TEXT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_reset_assets_run (run_id),
    CONSTRAINT fk_reset_assets_run FOREIGN KEY (run_id) REFERENCES system_reset_runs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. System Reset Run User Deletion Ledger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_run_users (
    id CHAR(36) NOT NULL,
    run_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    deletion_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    error_message TEXT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_reset_users_run (run_id),
    CONSTRAINT fk_reset_users_run FOREIGN KEY (run_id) REFERENCES system_reset_runs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. System Reset Write Permits
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_write_permits (
    id CHAR(36) NOT NULL,
    run_id CHAR(36) NOT NULL,
    permit_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_reset_write_permit (permit_hash),
    INDEX idx_reset_write_run (run_id),
    CONSTRAINT fk_reset_write_run FOREIGN KEY (run_id) REFERENCES system_reset_runs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. System Reset Auth Deletion Permits
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_auth_delete_permits (
    id CHAR(36) NOT NULL,
    run_id CHAR(36) NOT NULL,
    target_user_id CHAR(36) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_reset_auth_perm_run (run_id),
    INDEX idx_reset_auth_perm_target (target_user_id),
    CONSTRAINT fk_reset_auth_perm_run FOREIGN KEY (run_id) REFERENCES system_reset_runs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- >>> END OF 005_system_and_operations.sql <<<

-- >>> START OF 006_triggers_and_procedures.sql <<<
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

-- >>> END OF 006_triggers_and_procedures.sql <<<

-- >>> START OF 007_seed_initial_data.sql <<<
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

-- >>> END OF 007_seed_initial_data.sql <<<

SET FOREIGN_KEY_CHECKS = 1;
