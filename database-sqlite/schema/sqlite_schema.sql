PRAGMA foreign_keys = ON;

-- =============================================================================
-- EL KAROOZ SCHOOL — COMPLETE MASTER MYSQL 8.0+ SCHEMA
-- Replaces Supabase (PostgreSQL) with a Native, Fully Autonomous MySQL Database
-- Generated: 2026-11-03 | Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================




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
    id TEXT NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'trainee',
    group_id INTEGER NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    email_confirmed_at TEXT NULL,
    last_sign_in_at TEXT NULL,
    raw_user_meta_data JSON NULL,
    raw_app_meta_data JSON NULL,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_auth_users_email (email),
    UNIQUE KEY uq_auth_users_username (username),
    
    
    
) ;

-- -----------------------------------------------------------------------------
-- 2. Auth Refresh Tokens (JWT Rotation Engine)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_refresh_tokens_hash (token_hash),
    
    
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 3. Roles Table (RBAC Core)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(32) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NULL,
    description TEXT NULL,
    level INT NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) ;

-- -----------------------------------------------------------------------------
-- 4. Permissions Table (Granular Capability Allowlist)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(50) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
) ;

-- -----------------------------------------------------------------------------
-- 5. Academic Groups Table (Cohorts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `groups` (
    id INTEGER NOT NULL AUTO_INCREMENT,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NULL,
    code VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_groups_code (code)
) ;

-- -----------------------------------------------------------------------------
-- 6. User Profiles Table (1:1 with auth_users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT NOT NULL,
    username VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id VARCHAR(32) NOT NULL DEFAULT 'trainee',
    group_id INTEGER NULL,
    phone VARCHAR(50) NULL,
    address TEXT NULL,
    birth_date VARCHAR(30) NULL,
    confession_father VARCHAR(255) NULL,
    avatar_url TEXT NULL,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    deleted_by TEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_profiles_username (username),
    
    
    
    
    CONSTRAINT fk_profiles_auth_user FOREIGN KEY (id) REFERENCES auth_users (id) ON DELETE CASCADE,
    CONSTRAINT fk_profiles_role FOREIGN KEY (role_id) REFERENCES roles (id),
    CONSTRAINT fk_profiles_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 7. Servant Permissions Table (Delegated Operational Permissions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servant_permissions (
    id TEXT NOT NULL,
    servant_id TEXT NOT NULL,
    permission_id VARCHAR(50) NOT NULL,
    granted_by TEXT NULL,
    granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_servant_permission (servant_id, permission_id),
    
    
    CONSTRAINT fk_servant_perm_servant FOREIGN KEY (servant_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_servant_perm_perm FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 8. Group Secretariat Table (Max 3 per Group)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_secretariat (
    id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    servant_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_group_secretariat (group_id, servant_id),
    
    
    CONSTRAINT fk_group_sec_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
    CONSTRAINT fk_group_sec_servant FOREIGN KEY (servant_id) REFERENCES profiles (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 9. General Secretariat Members Table (Cross-Group Staff)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS general_secretariat_members (
    id TEXT NOT NULL,
    servant_id TEXT NOT NULL,
    appointed_by TEXT NOT NULL,
    appointed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    notes TEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gen_sec_servant (servant_id),
    CONSTRAINT fk_gen_sec_servant FOREIGN KEY (servant_id) REFERENCES profiles (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 10. General Secretariat Permissions Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS general_secretariat_permissions (
    id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    permission_key VARCHAR(50) NOT NULL,
    granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    granted_by TEXT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gen_sec_perm (member_id, permission_key),
    
    CONSTRAINT fk_gen_sec_perm_member FOREIGN KEY (member_id) REFERENCES general_secretariat_members (id) ON DELETE CASCADE
) ;

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
    id TEXT NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    group_id INTEGER NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 0,
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    
    CONSTRAINT fk_terms_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 2. Lecturers & Fathers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lecturers (
    id TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    title VARCHAR(100) NULL,
    bio TEXT NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(255) NULL,
    avatar_url TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    PRIMARY KEY (id),
    
) ;

-- -----------------------------------------------------------------------------
-- 3. Lectures & Study Sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lectures (
    id TEXT NOT NULL,
    term_id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    lecturer_id TEXT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    order_num INT NOT NULL DEFAULT 1,
    scheduled_date DATE NULL,
    pdf_url TEXT NULL,
    audio_url TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    PRIMARY KEY (id),
    
    
    
    
    CONSTRAINT fk_lectures_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE CASCADE,
    CONSTRAINT fk_lectures_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
    CONSTRAINT fk_lectures_lecturer FOREIGN KEY (lecturer_id) REFERENCES lecturers (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 4. Curriculums (High-Level Course Overview)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curriculums (
    id TEXT NOT NULL,
    term_id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    file_url TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    PRIMARY KEY (id),
    
    
    CONSTRAINT fk_curriculums_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE CASCADE,
    CONSTRAINT fk_curriculums_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 5. Curriculum Days (Study Days in a Term)
-- Partial unique emulated via virtual generated column: active_term_id
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curriculum_days (
    id TEXT NOT NULL,
    term_id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    day_number INT NOT NULL,
    study_date DATE NULL,
    title VARCHAR(255) NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    active_term_id TEXT GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN term_id ELSE NULL END) VIRTUAL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_active_curriculum_day (active_term_id, day_number),
    
    
    
    CONSTRAINT fk_curr_days_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE CASCADE,
    CONSTRAINT fk_curr_days_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 6. Curriculum Entries (Lectures assigned to specific days)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curriculum_entries (
    id TEXT NOT NULL,
    day_id TEXT NOT NULL,
    lecture_id TEXT NULL,
    lecturer_id TEXT NULL,
    order_index INT NOT NULL DEFAULT 1,
    start_time TIME NULL,
    end_time TIME NULL,
    subject VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    
    
    
    CONSTRAINT fk_curr_entries_day FOREIGN KEY (day_id) REFERENCES curriculum_days (id) ON DELETE CASCADE,
    CONSTRAINT fk_curr_entries_lecture FOREIGN KEY (lecture_id) REFERENCES lectures (id) ON DELETE SET NULL,
    CONSTRAINT fk_curr_entries_lecturer FOREIGN KEY (lecturer_id) REFERENCES lecturers (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 7. Curriculum Revisions History
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curriculum_revisions (
    id TEXT NOT NULL,
    curriculum_id TEXT NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    change_summary TEXT NULL,
    changed_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    CONSTRAINT fk_curr_revisions_curr FOREIGN KEY (curriculum_id) REFERENCES curriculums (id) ON DELETE CASCADE,
    CONSTRAINT fk_curr_revisions_author FOREIGN KEY (changed_by) REFERENCES profiles (id)
) ;

-- -----------------------------------------------------------------------------
-- 8. Attendance Sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    session_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    closed_at TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    
    
    CONSTRAINT fk_att_sessions_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 9. Attendance Records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    trainee_id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
    recorded_by TEXT NULL,
    notes TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    deleted_by TEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attendance_trainee_session (session_id, trainee_id),
    
    
    
    
    CONSTRAINT fk_att_records_session FOREIGN KEY (session_id) REFERENCES attendance_sessions (id) ON DELETE CASCADE,
    CONSTRAINT fk_att_records_trainee FOREIGN KEY (trainee_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_att_records_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
    CONSTRAINT fk_att_records_servant FOREIGN KEY (recorded_by) REFERENCES profiles (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 10. Exams
-- Partial unique: uq_active_exam_term emulated via active_term_id
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
    id TEXT NOT NULL,
    term_id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    max_score REAL NOT NULL DEFAULT 100.00,
    exam_date DATE NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    deleted_by TEXT NULL,
    active_term_id TEXT GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN term_id ELSE NULL END) VIRTUAL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_active_exam_per_term (active_term_id, group_id),
    
    
    
    CONSTRAINT fk_exams_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE CASCADE,
    CONSTRAINT fk_exams_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 11. Exam Grades
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_grades (
    id TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    trainee_id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    score REAL NOT NULL,
    appreciation VARCHAR(50) NULL,
    graded_by TEXT NULL,
    notes TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    deleted_by TEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_exam_trainee (exam_id, trainee_id),
    
    
    
    CONSTRAINT fk_exam_grades_exam FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_grades_trainee FOREIGN KEY (trainee_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_grades_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_grades_servant FOREIGN KEY (graded_by) REFERENCES profiles (id) ON DELETE SET NULL
) ;

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
    id TEXT NOT NULL,
    term_id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    start_date TEXT NULL,
    end_date TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    time_limit_minutes INT NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    deleted_by TEXT NULL,
    PRIMARY KEY (id),
    
    
    
    CONSTRAINT fk_marathons_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathons_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 2. Marathon Sections (Thematic or Chapter Groups)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_sections (
    id TEXT NOT NULL,
    marathon_id TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_num INT NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    CONSTRAINT fk_marathon_sections_marathon FOREIGN KEY (marathon_id) REFERENCES marathons (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 3. Marathon Questions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_questions (
    id TEXT NOT NULL,
    marathon_id TEXT NOT NULL,
    section_id TEXT NULL,
    question_text TEXT NOT NULL,
    score_weight REAL NOT NULL DEFAULT 1.00,
    order_num INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    PRIMARY KEY (id),
    
    
    
    CONSTRAINT fk_marathon_questions_marathon FOREIGN KEY (marathon_id) REFERENCES marathons (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_questions_section FOREIGN KEY (section_id) REFERENCES marathon_sections (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 4. Marathon Answers (Multiple Choice Options)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_answers (
    id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    order_num INT NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    
    CONSTRAINT fk_marathon_answers_question FOREIGN KEY (question_id) REFERENCES marathon_questions (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 5. Marathon Question Revisions History
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_question_revisions (
    id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    change_summary TEXT NULL,
    changed_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    CONSTRAINT fk_marathon_qrev_q FOREIGN KEY (question_id) REFERENCES marathon_questions (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_qrev_user FOREIGN KEY (changed_by) REFERENCES profiles (id)
) ;

-- -----------------------------------------------------------------------------
-- 6. Marathon Trainee Submissions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_trainee_submissions (
    id TEXT NOT NULL,
    marathon_id TEXT NOT NULL,
    trainee_id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    total_score REAL NOT NULL DEFAULT 0.00,
    appreciation VARCHAR(50) NULL,
    is_submitted INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    submitted_at TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_submission_trainee (marathon_id, trainee_id),
    
    
    
    
    CONSTRAINT fk_marathon_subs_marathon FOREIGN KEY (marathon_id) REFERENCES marathons (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_subs_trainee FOREIGN KEY (trainee_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_subs_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 7. Marathon Trainee Answers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marathon_trainee_answers (
    id TEXT NOT NULL,
    submission_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_answer_id TEXT NULL,
    is_correct INTEGER NULL,
    is_reopened INTEGER NOT NULL DEFAULT 0,
    reopened_by TEXT NULL,
    reopened_at TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_trainee_answer_q (submission_id, question_id),
    
    
    
    CONSTRAINT fk_marathon_tans_sub FOREIGN KEY (submission_id) REFERENCES marathon_trainee_submissions (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_tans_q FOREIGN KEY (question_id) REFERENCES marathon_questions (id) ON DELETE CASCADE,
    CONSTRAINT fk_marathon_tans_ans FOREIGN KEY (selected_answer_id) REFERENCES marathon_answers (id) ON DELETE SET NULL,
    CONSTRAINT fk_marathon_tans_reopened_by FOREIGN KEY (reopened_by) REFERENCES profiles (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 8. Feed Posts (Community Wall)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feed_posts (
    id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    group_id INTEGER NULL,
    content TEXT NOT NULL,
    likes_count INT NOT NULL DEFAULT 0,
    comments_count INT NOT NULL DEFAULT 0,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    deleted_by TEXT NULL,
    PRIMARY KEY (id),
    
    
    
    
    CONSTRAINT fk_feed_posts_author FOREIGN KEY (author_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_feed_posts_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 9. Post Images (Multi-image carousel for Feed)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_images (
    id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    order_num INT NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    CONSTRAINT fk_post_images_post FOREIGN KEY (post_id) REFERENCES feed_posts (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 10. Post Comments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_comments (
    id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    deleted_by TEXT NULL,
    PRIMARY KEY (id),
    
    
    
    CONSTRAINT fk_post_comments_post FOREIGN KEY (post_id) REFERENCES feed_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_comments_author FOREIGN KEY (author_id) REFERENCES profiles (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 11. Reactions (Likes & Emoji Reactions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reactions (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id TEXT NOT NULL,
    reaction_type VARCHAR(20) NOT NULL DEFAULT 'LIKE',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_reaction_target (user_id, target_type, target_id),
    
    
    CONSTRAINT fk_reactions_user FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 12. General Library Categories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER NOT NULL AUTO_INCREMENT,
    name_ar VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_code (code)
) ;

-- -----------------------------------------------------------------------------
-- 13. Gallery Albums
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_albums (
    id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    cover_image_url TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    PRIMARY KEY (id),
    
    CONSTRAINT fk_gallery_albums_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 14. Gallery Items (Photos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_items (
    id TEXT NOT NULL,
    album_id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    title VARCHAR(255) NULL,
    image_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    PRIMARY KEY (id),
    
    
    CONSTRAINT fk_gallery_items_album FOREIGN KEY (album_id) REFERENCES gallery_albums (id) ON DELETE CASCADE,
    CONSTRAINT fk_gallery_items_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 15. Electronic Books Library
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
    id TEXT NOT NULL,
    group_id INTEGER NULL,
    category_id INTEGER NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NULL,
    description TEXT NULL,
    file_url TEXT NOT NULL,
    cover_url TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    PRIMARY KEY (id),
    
    
    
    CONSTRAINT fk_books_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE SET NULL,
    CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 16. Research Papers & Articles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS researches (
    id TEXT NOT NULL,
    group_id INTEGER NULL,
    category_id INTEGER NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NULL,
    description TEXT NULL,
    file_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    PRIMARY KEY (id),
    
    
    CONSTRAINT fk_researches_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE SET NULL,
    CONSTRAINT fk_researches_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 17. MP3 Audio Tracks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mp3_tracks (
    id TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    category_id INTEGER NULL,
    lecturer_id TEXT NULL,
    title VARCHAR(255) NOT NULL,
    audio_url TEXT NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    order_num INT NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    PRIMARY KEY (id),
    
    
    
    CONSTRAINT fk_mp3_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
    CONSTRAINT fk_mp3_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
    CONSTRAINT fk_mp3_lecturer FOREIGN KEY (lecturer_id) REFERENCES lecturers (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 18. User Favorites (Bookmarks across media & lessons)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_favorites (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    item_id TEXT NOT NULL,
    notes TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_favorite_item (user_id, item_type, item_id),
    
    
    CONSTRAINT fk_user_fav_user FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
) ;

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
    id INTEGER NOT NULL AUTO_INCREMENT,
    name_ar VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    order_num INT NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_testaments_code (code)
) ;

-- -----------------------------------------------------------------------------
-- 2. Bible Books (Canonical 73 Books)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_books (
    id INTEGER NOT NULL AUTO_INCREMENT,
    testament_id INTEGER NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    chapters_count INT NOT NULL DEFAULT 1,
    order_num INT NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_books_code (code),
    
    
    CONSTRAINT fk_bible_books_testament FOREIGN KEY (testament_id) REFERENCES bible_testaments (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 3. Bible Chapters
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_chapters (
    id TEXT NOT NULL,
    book_id INTEGER NOT NULL,
    chapter_number INT NOT NULL,
    verses_count INT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_book_chapter (book_id, chapter_number),
    
    CONSTRAINT fk_bible_chapters_book FOREIGN KEY (book_id) REFERENCES bible_books (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 4. Bible Verses (Verbatim Text Preservation Law)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_verses (
    id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    verse_number INT NOT NULL,
    text_ar TEXT NOT NULL,
    text_clean TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_chapter_verse (chapter_id, verse_number),
    
    
    CONSTRAINT fk_bible_verses_chapter FOREIGN KEY (chapter_id) REFERENCES bible_chapters (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 5. Positional Verse Words (Interactive Patristic Word Breakdown)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_verse_words (
    id TEXT NOT NULL,
    verse_id TEXT NOT NULL,
    word_position INT NOT NULL,
    word_ar VARCHAR(100) NOT NULL,
    has_commentary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_verse_word_position (verse_id, word_position),
    
    
    CONSTRAINT fk_verse_words_verse FOREIGN KEY (verse_id) REFERENCES bible_verses (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 6. Patristic Commentary Sources (Fathers, Exegesis, Manuscripts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_sources (
    id INTEGER NOT NULL AUTO_INCREMENT,
    name_ar VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NULL,
    source_url TEXT NULL,
    description TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) ;

-- -----------------------------------------------------------------------------
-- 7. Verse Commentaries (Full Contextual Commentary per Verse)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_commentaries (
    id TEXT NOT NULL,
    verse_id TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    commentary_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_verse_commentary_source (verse_id, source_id),
    
    
    
    CONSTRAINT fk_commentaries_verse FOREIGN KEY (verse_id) REFERENCES bible_verses (id) ON DELETE CASCADE,
    CONSTRAINT fk_commentaries_source FOREIGN KEY (source_id) REFERENCES bible_sources (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 8. Word-Level Contextual Commentaries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_word_commentaries (
    id TEXT NOT NULL,
    word_id TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    commentary_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    
    CONSTRAINT fk_word_comm_word FOREIGN KEY (word_id) REFERENCES bible_verse_words (id) ON DELETE CASCADE,
    CONSTRAINT fk_word_comm_source FOREIGN KEY (source_id) REFERENCES bible_sources (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 9. Universal Biblical Dictionary & Glossary Entries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_dictionary_entries (
    id TEXT NOT NULL,
    term_ar VARCHAR(255) NOT NULL,
    definition TEXT NOT NULL,
    source_id INTEGER NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    
    
    CONSTRAINT fk_dict_source FOREIGN KEY (source_id) REFERENCES bible_sources (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 10. Word-to-Dictionary Mapping Junction
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS word_dictionary_mappings (
    id TEXT NOT NULL,
    word_id TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_word_dict_mapping (word_id, entry_id),
    
    
    CONSTRAINT fk_wdm_word FOREIGN KEY (word_id) REFERENCES bible_verse_words (id) ON DELETE CASCADE,
    CONSTRAINT fk_wdm_entry FOREIGN KEY (entry_id) REFERENCES bible_dictionary_entries (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 11. Content Version Ledger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_content_versions (
    id TEXT NOT NULL,
    version_tag VARCHAR(50) NOT NULL,
    release_notes TEXT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_version_tag (version_tag)
) ;

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
    id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    category VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    route_target VARCHAR(255) NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    metadata JSON NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    
    
    
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES profiles (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 2. Notification Templates (Pastoral, Birthday, Daily Verse)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_templates (
    id TEXT NOT NULL,
    category VARCHAR(30) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    body_template TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_template_cat_name (category, template_name)
) ;

-- -----------------------------------------------------------------------------
-- 3. Web Push Subscriptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    CONSTRAINT fk_push_subs_user FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 4. Daily Verse Bank
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_verses (
    id TEXT NOT NULL,
    verse_text TEXT NOT NULL,
    reference VARCHAR(100) NOT NULL,
    order_num INT NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    
) ;

-- -----------------------------------------------------------------------------
-- 5. Daily Verse Dispatch State Singleton
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_verse_dispatch_state (
    id INTEGER NOT NULL DEFAULT 1,
    last_dispatched_verse_id TEXT NULL,
    current_cycle_index INT NOT NULL DEFAULT 0,
    is_rest_day INTEGER NOT NULL DEFAULT 0,
    last_dispatched_date DATE NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT fk_dv_dispatch_verse FOREIGN KEY (last_dispatched_verse_id) REFERENCES daily_verses (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 6. Immutable Audit Logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT NOT NULL,
    actor_id TEXT NULL,
    actor_name VARCHAR(255) NULL,
    actor_role VARCHAR(50) NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id TEXT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    
    
    
) ;

-- -----------------------------------------------------------------------------
-- 7. Backup Records Ledger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS backup_records (
    id TEXT NOT NULL,
    created_by TEXT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    storage_option VARCHAR(50) NOT NULL DEFAULT 'LOCAL_STORAGE',
    includes_database INTEGER NOT NULL DEFAULT 1,
    includes_files INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    deleted_by TEXT NULL,
    PRIMARY KEY (id),
    
    
    CONSTRAINT fk_backup_records_author FOREIGN KEY (created_by) REFERENCES profiles (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 8. Bulk Import History
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_history (
    id TEXT NOT NULL,
    uploaded_by TEXT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL DEFAULT 'EXCEL',
    total_rows INT NOT NULL DEFAULT 0,
    imported_count INT NOT NULL DEFAULT 0,
    skipped_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    error_log JSON NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    CONSTRAINT fk_import_history_user FOREIGN KEY (uploaded_by) REFERENCES profiles (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 9. Central Media Assets Registry
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT NOT NULL,
    uploaded_by TEXT NULL,
    group_id INTEGER NULL,
    resource_type VARCHAR(50) NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'HOSTINGER_LOCAL',
    drive_file_id VARCHAR(255) NULL,
    drive_folder_id VARCHAR(255) NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at TEXT NULL,
    PRIMARY KEY (id),
    
    
    
    
    
    CONSTRAINT fk_media_assets_uploader FOREIGN KEY (uploaded_by) REFERENCES profiles (id) ON DELETE SET NULL,
    CONSTRAINT fk_media_assets_group FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE SET NULL
) ;

-- -----------------------------------------------------------------------------
-- 10. System Admin Role Change Permits (Co-Admin Transfer Protection)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_admin_role_change_permits (
    id TEXT NOT NULL,
    permit_token VARCHAR(64) NOT NULL,
    admin_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_permit_token (permit_token),
    
    
    CONSTRAINT fk_admin_permits_admin FOREIGN KEY (admin_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_admin_permits_target FOREIGN KEY (target_id) REFERENCES profiles (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 11. System Reset Gate (Barrier Locking Singleton)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_gate (
    id INTEGER NOT NULL DEFAULT 1,
    is_open INTEGER NOT NULL DEFAULT 0,
    active_run_id TEXT NULL,
    current_lease_holder TEXT NULL,
    locked_at TEXT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) ;

-- -----------------------------------------------------------------------------
-- 12. System Reset Runs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_runs (
    id TEXT NOT NULL,
    initiated_by TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PREVIEW',
    backup_id TEXT NULL,
    safety_snapshot_path TEXT NULL,
    confirmed_at TEXT NULL,
    completed_at TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    
    CONSTRAINT fk_reset_runs_user FOREIGN KEY (initiated_by) REFERENCES profiles (id)
) ;

-- -----------------------------------------------------------------------------
-- 13. System Reset Run Asset Deletion Ledger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_run_assets (
    id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    deletion_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    error_message TEXT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    CONSTRAINT fk_reset_assets_run FOREIGN KEY (run_id) REFERENCES system_reset_runs (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 14. System Reset Run User Deletion Ledger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_run_users (
    id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    deletion_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    error_message TEXT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    CONSTRAINT fk_reset_users_run FOREIGN KEY (run_id) REFERENCES system_reset_runs (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 15. System Reset Write Permits
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_write_permits (
    id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    permit_hash VARCHAR(64) NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_reset_write_permit (permit_hash),
    
    CONSTRAINT fk_reset_write_run FOREIGN KEY (run_id) REFERENCES system_reset_runs (id) ON DELETE CASCADE
) ;

-- -----------------------------------------------------------------------------
-- 16. System Reset Auth Deletion Permits
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_reset_auth_delete_permits (
    id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    
    
    CONSTRAINT fk_reset_auth_perm_run FOREIGN KEY (run_id) REFERENCES system_reset_runs (id) ON DELETE CASCADE
) ;

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
;

-- -----------------------------------------------------------------------------
-- 2. Academic Groups (Cohorts)
-- -----------------------------------------------------------------------------
INSERT INTO `groups` (id, name_ar, name_en, code, academic_year) VALUES
(1, 'الفرقة الأولى', 'First Year', 'GROUP_1', '2026/2027'),
(2, 'الفرقة الثانية', 'Second Year', 'GROUP_2', '2026/2027'),
(3, 'الفرقة الثالثة', 'Third Year', 'GROUP_3', '2026/2027')
;

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
;

-- -----------------------------------------------------------------------------
-- 4. Notification Templates
-- -----------------------------------------------------------------------------
INSERT INTO notification_templates (id, category, template_name, title_template, body_template, is_active) VALUES
('tmpl-pastoral-001', 'PASTORAL', 'غـياب متدرب', 'افتقدناك في المحاضرة يا {{student_name}}', 'سلام ونعمة يا حبيبنا {{student_name}}، افتقدنا وجودك معنا اليوم في المحاضرة.. طمنا عليك وصلواتنا معك.', 1),
('tmpl-birthday-001', 'BIRTHDAY', 'تهنئة عيد ميلاد', 'كل سنة وأنت طيب يا {{student_name}}', 'مدرسة الكاروز تهنئك بعيد ميلادك الميمون، نصلي أن تكون سنة مباركة ومملوءة من نعمة الروح القدس.', 1),
('tmpl-verse-001', 'DAILY_VERSE', 'آية اليوم', 'كلمة الله المنيرة اليومية', '{{verse_text}} ({{verse_reference}})', 1)
;

-- -----------------------------------------------------------------------------
-- 5. Canonical Bible Testaments
-- -----------------------------------------------------------------------------
INSERT INTO bible_testaments (id, name_ar, code, order_num) VALUES
(1, 'العهد القديم', 'OT', 1),
(2, 'العهد الجديد', 'NT', 2),
(3, 'الأسفار القانونية الثانية', 'DC', 3)
;

-- -----------------------------------------------------------------------------
-- 6. Singletons Initialization (Daily Verse State & System Reset Gate)
-- -----------------------------------------------------------------------------
INSERT INTO daily_verse_dispatch_state (id, current_cycle_index, is_rest_day) VALUES
(1, 0, 0)
;

INSERT INTO system_reset_gate (id, is_open) VALUES
(1, 0)
;

SET FOREIGN_KEY_CHECKS = 1;

-- >>> END OF 007_seed_initial_data.sql <<<

SET FOREIGN_KEY_CHECKS = 1;
