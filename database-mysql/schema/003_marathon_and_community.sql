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
