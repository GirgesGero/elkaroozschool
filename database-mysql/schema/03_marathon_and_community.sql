-- =============================================================================
-- EL KAROOZ SCHOOL — Production MySQL Database Schema
-- File: 03_marathon_and_community.sql
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Description: Bible marathons, questions, grading, feed posts, comments & reactions.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Marathons (مسابقات وماراثونات الكتاب المقدس)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `marathons` (
    `id` CHAR(36) NOT NULL,
    `term_id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `total_score` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_marathons_term` (`term_id`),
    INDEX `idx_marathons_group` (`group_id`),
    INDEX `idx_marathons_active` (`is_active`),
    INDEX `idx_marathons_deleted` (`deleted_at`),
    CONSTRAINT `fk_marathons_term` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_marathons_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_marathons_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_marathons_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Marathon Sections (أقسام وأجزاء الماراثون)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `marathon_sections` (
    `id` CHAR(36) NOT NULL,
    `marathon_id` CHAR(36) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `order_index` INT NOT NULL DEFAULT 1,
    `status` VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_msections_marathon` (`marathon_id`),
    CONSTRAINT `fk_msections_marathon` FOREIGN KEY (`marathon_id`) REFERENCES `marathons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Marathon Questions (أسئلة الماراثون)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `marathon_questions` (
    `id` CHAR(36) NOT NULL,
    `marathon_id` CHAR(36) NOT NULL,
    `section_id` CHAR(36) NULL,
    `question_text` TEXT NOT NULL,
    `question_type` VARCHAR(32) NOT NULL DEFAULT 'MCQ', -- 'MCQ'
    `score_weight` DECIMAL(6,3) NOT NULL DEFAULT 0.000,
    `order_index` INT NOT NULL DEFAULT 1,
    `status` VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
    `published_by` CHAR(36) NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_mquestions_marathon` (`marathon_id`),
    INDEX `idx_mquestions_section` (`section_id`),
    INDEX `idx_mquestions_status` (`status`),
    CONSTRAINT `fk_mquestions_marathon` FOREIGN KEY (`marathon_id`) REFERENCES `marathons` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_mquestions_section` FOREIGN KEY (`section_id`) REFERENCES `marathon_sections` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_mquestions_published_by` FOREIGN KEY (`published_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Marathon Answers (خيارات الإجابة)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `marathon_answers` (
    `id` CHAR(36) NOT NULL,
    `question_id` CHAR(36) NOT NULL,
    `answer_text` TEXT NOT NULL,
    `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
    `order_index` INT NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    INDEX `idx_manswers_question` (`question_id`),
    INDEX `idx_manswers_correct` (`is_correct`),
    CONSTRAINT `fk_manswers_question` FOREIGN KEY (`question_id`) REFERENCES `marathon_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Marathon Question Revisions (أرشيف تعديلات الأسئلة)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `marathon_question_revisions` (
    `id` CHAR(36) NOT NULL,
    `question_id` CHAR(36) NOT NULL,
    `order_index` INT NOT NULL DEFAULT 1,
    `options` JSON NOT NULL,
    `changed_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_mq_revisions_question` (`question_id`),
    CONSTRAINT `fk_mq_revisions_question` FOREIGN KEY (`question_id`) REFERENCES `marathon_questions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_mq_revisions_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Marathon Trainee Submissions (تسليمات الطلاب)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `marathon_trainee_submissions` (
    `id` CHAR(36) NOT NULL,
    `marathon_id` CHAR(36) NOT NULL,
    `trainee_id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `total_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `appreciation_grade` VARCHAR(32) NOT NULL DEFAULT 'ضعيف',
    `is_submitted` TINYINT(1) NOT NULL DEFAULT 0,
    `submitted_at` DATETIME(3) NULL,
    `is_reopened` TINYINT(1) NOT NULL DEFAULT 0,
    `reopened_by` CHAR(36) NULL,
    `reopened_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_marathon_trainee_sub` (`marathon_id`, `trainee_id`),
    INDEX `idx_msubmissions_trainee` (`trainee_id`),
    INDEX `idx_msubmissions_group` (`group_id`),
    INDEX `idx_msubmissions_submitted` (`is_submitted`),
    CONSTRAINT `fk_msubs_marathon` FOREIGN KEY (`marathon_id`) REFERENCES `marathons` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_msubs_trainee` FOREIGN KEY (`trainee_id`) REFERENCES `profiles` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_msubs_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_msubs_reopened_by` FOREIGN KEY (`reopened_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Marathon Trainee Answers (إجابات الطالب الفردية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `marathon_trainee_answers` (
    `id` CHAR(36) NOT NULL,
    `submission_id` CHAR(36) NOT NULL,
    `question_id` CHAR(36) NOT NULL,
    `selected_answer_id` CHAR(36) NULL,
    `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
    `score_awarded` DECIMAL(6,3) NOT NULL DEFAULT 0.000,
    `is_reopened` TINYINT(1) NOT NULL DEFAULT 0,
    `answered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_sub_question` (`submission_id`, `question_id`),
    INDEX `idx_mtanswers_question` (`question_id`),
    INDEX `idx_mtanswers_answer` (`selected_answer_id`),
    CONSTRAINT `fk_mtanswers_sub` FOREIGN KEY (`submission_id`) REFERENCES `marathon_trainee_submissions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_mtanswers_question` FOREIGN KEY (`question_id`) REFERENCES `marathon_questions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_mtanswers_answer` FOREIGN KEY (`selected_answer_id`) REFERENCES `marathon_answers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Feed Posts (حائط المشاركات والأخبار)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `feed_posts` (
    `id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NULL, -- NULL = عام لكافة الفرق
    `author_id` CHAR(36) NOT NULL,
    `content` TEXT NOT NULL,
    `content_text` TEXT NULL,
    `post_type` VARCHAR(32) NOT NULL DEFAULT 'ANNOUNCEMENT', -- 'ANNOUNCEMENT', 'GENERAL', 'MEDITATION'
    `pinned` TINYINT(1) NOT NULL DEFAULT 0,
    `comments_count` INT NOT NULL DEFAULT 0,
    `likes_count` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_feed_group` (`group_id`),
    INDEX `idx_feed_author` (`author_id`),
    INDEX `idx_feed_pinned` (`pinned`),
    INDEX `idx_feed_deleted` (`deleted_at`),
    CONSTRAINT `fk_feed_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_feed_author` FOREIGN KEY (`author_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_feed_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Post Images (صور المنشورات)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `post_images` (
    `id` CHAR(36) NOT NULL,
    `post_id` CHAR(36) NOT NULL,
    `image_url` TEXT NOT NULL,
    `file_size_bytes` BIGINT NOT NULL DEFAULT 0,
    `width` INT NULL,
    `height` INT NULL,
    `order_index` INT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_pimages_post` (`post_id`),
    CONSTRAINT `fk_pimages_post` FOREIGN KEY (`post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Post Comments (التعليقات على المنشورات)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `post_comments` (
    `id` CHAR(36) NOT NULL,
    `post_id` CHAR(36) NOT NULL,
    `author_id` CHAR(36) NOT NULL,
    `content` TEXT NOT NULL,
    `comment_text` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_pcomments_post` (`post_id`),
    INDEX `idx_pcomments_author` (`author_id`),
    INDEX `idx_pcomments_deleted` (`deleted_at`),
    CONSTRAINT `fk_pcomments_post` FOREIGN KEY (`post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pcomments_author` FOREIGN KEY (`author_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pcomments_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Reactions (التفاعلات والإعجابات)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reactions` (
    `id` CHAR(36) NOT NULL,
    `target_type` VARCHAR(32) NOT NULL DEFAULT 'POST', -- 'POST', 'COMMENT'
    `target_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `reaction_type` VARCHAR(32) NOT NULL DEFAULT 'LIKE', -- 'LIKE', 'HEART', 'AMEN'
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_target_reaction` (`user_id`, `target_id`, `target_type`),
    INDEX `idx_reactions_target` (`target_id`, `target_type`),
    INDEX `idx_reactions_user` (`user_id`),
    CONSTRAINT `fk_reactions_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. User Favorites (المفضلة الشخصية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_favorites` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `item_type` VARCHAR(32) NOT NULL, -- 'BIBLE_VERSE', 'BOOK', 'LECTURE', 'MP3'
    `item_id` VARCHAR(128) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_fav_item` (`user_id`, `item_type`, `item_id`),
    INDEX `idx_ufav_user` (`user_id`),
    CONSTRAINT `fk_ufav_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
