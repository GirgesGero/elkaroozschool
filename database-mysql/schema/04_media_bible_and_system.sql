-- =============================================================================
-- EL KAROOZ SCHOOL — Production MySQL Database Schema
-- File: 04_media_bible_and_system.sql
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Description: Media assets, library, Bible dataset, system audits & reset engine.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Categories (التصنيفات العامة للكتب والوسائط)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
    `id` VARCHAR(32) NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `type` VARCHAR(32) NOT NULL DEFAULT 'LIBRARY', -- 'LIBRARY', 'GALLERY', 'AUDIO'
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Library Books (مكتبة الكتب والمراجع)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `books` (
    `id` CHAR(36) NOT NULL,
    `category_id` VARCHAR(32) NULL,
    `title` VARCHAR(200) NOT NULL,
    `author` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `cover_url` TEXT NULL,
    `file_url` TEXT NOT NULL,
    `file_size_bytes` BIGINT NOT NULL DEFAULT 0,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_books_category` (`category_id`),
    INDEX `idx_books_deleted` (`deleted_at`),
    CONSTRAINT `fk_books_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_books_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_books_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Researches (أبحاث ومشاريع التخرج للمتدربين)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `researches` (
    `id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `category_id` VARCHAR(32) NULL,
    `title` VARCHAR(200) NOT NULL,
    `author` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `file_url` TEXT NOT NULL,
    `file_size_bytes` BIGINT NOT NULL DEFAULT 0,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_researches_group` (`group_id`),
    INDEX `idx_researches_category` (`category_id`),
    INDEX `idx_researches_deleted` (`deleted_at`),
    CONSTRAINT `fk_researches_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_researches_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_researches_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_researches_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Gallery Albums (ألبومات معارض الصور)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `gallery_albums` (
    `id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NULL, -- NULL = عام
    `category_id` VARCHAR(32) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `cover_url` TEXT NULL,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_galbums_group` (`group_id`),
    INDEX `idx_galbums_category` (`category_id`),
    INDEX `idx_galbums_deleted` (`deleted_at`),
    CONSTRAINT `fk_galbums_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_galbums_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_galbums_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_galbums_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Gallery Items (صور ووسائط المعارض)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `gallery_items` (
    `id` CHAR(36) NOT NULL,
    `album_id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NULL,
    `title` VARCHAR(200) NOT NULL,
    `media_url` TEXT NOT NULL,
    `file_size_bytes` BIGINT NOT NULL DEFAULT 0,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_gitems_album` (`album_id`),
    INDEX `idx_gitems_group` (`group_id`),
    INDEX `idx_gitems_deleted` (`deleted_at`),
    CONSTRAINT `fk_gitems_album` FOREIGN KEY (`album_id`) REFERENCES `gallery_albums` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_gitems_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_gitems_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_gitems_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. MP3 Tracks (المكتبة الصوتية والترانيم والعظات)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mp3_tracks` (
    `id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NULL,
    `lecturer_id` CHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `audio_url` TEXT NOT NULL,
    `duration_seconds` INT NOT NULL DEFAULT 0,
    `file_size_bytes` BIGINT NOT NULL DEFAULT 0,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_mp3_group` (`group_id`),
    INDEX `idx_mp3_lecturer` (`lecturer_id`),
    INDEX `idx_mp3_deleted` (`deleted_at`),
    CONSTRAINT `fk_mp3_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_mp3_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_mp3_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_mp3_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Media Assets (سجل الأصول والملفات وسحابة التخزين)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `media_assets` (
    `id` CHAR(36) NOT NULL,
    `uploader_id` CHAR(36) NULL,
    `group_id` SMALLINT UNSIGNED NULL,
    `storage_provider` VARCHAR(32) NOT NULL DEFAULT 'HOSTINGER_LOCAL', -- 'HOSTINGER_LOCAL', 'GOOGLE_DRIVE'
    `resource_type` VARCHAR(64) NOT NULL, -- 'users', 'curriculum', 'feed', 'gallery', 'books', 'mp3', 'backup'
    `file_name` VARCHAR(255) NOT NULL,
    `relative_path` VARCHAR(512) NOT NULL,
    `file_size_bytes` BIGINT NOT NULL DEFAULT 0,
    `mime_type` VARCHAR(128) NOT NULL,
    `checksum_sha256` CHAR(64) NOT NULL,
    `drive_file_id` VARCHAR(255) NULL,
    `drive_folder_id` VARCHAR(255) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'DELETED'
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_assets_uploader` (`uploader_id`),
    INDEX `idx_assets_group` (`group_id`),
    INDEX `idx_assets_provider` (`storage_provider`),
    INDEX `idx_assets_status` (`status`),
    INDEX `idx_assets_checksum` (`checksum_sha256`),
    CONSTRAINT `fk_assets_uploader` FOREIGN KEY (`uploader_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_assets_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_assets_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Notifications & Push (مركز الإشعارات اللحظية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notification_templates` (
    `id` CHAR(36) NOT NULL,
    `template_key` VARCHAR(64) NOT NULL,
    `template_body` TEXT NOT NULL,
    `updated_by` CHAR(36) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_notif_template_key` (`template_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
    `id` CHAR(36) NOT NULL,
    `recipient_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `category` VARCHAR(32) NOT NULL DEFAULT 'GENERAL',
    `is_read` TINYINT(1) NOT NULL DEFAULT 0,
    `action_url` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_notifs_recipient` (`recipient_id`),
    INDEX `idx_notifs_read` (`is_read`),
    INDEX `idx_notifs_created` (`created_at`),
    CONSTRAINT `fk_notifs_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
    `id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NOT NULL,
    `endpoint` TEXT NOT NULL,
    `keys_p256dh` VARCHAR(255) NOT NULL,
    `keys_auth` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_psub_profile` (`profile_id`),
    CONSTRAINT `fk_psub_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Daily Verses (آيات اليوم والإرسال التلقائي)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `daily_verses` (
    `id` CHAR(36) NOT NULL,
    `verse_text` TEXT NOT NULL,
    `reference` VARCHAR(150) NOT NULL,
    `reflection` TEXT NULL,
    `display_order` INT NOT NULL DEFAULT 1,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_dverses_order` (`display_order`),
    INDEX `idx_dverses_deleted` (`deleted_at`),
    CONSTRAINT `fk_dverses_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_dverses_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `daily_verse_dispatch_state` (
    `id` CHAR(36) NOT NULL,
    `last_verse_id` CHAR(36) NULL,
    `last_dispatch_date` DATE NOT NULL,
    `current_cycle` INT NOT NULL DEFAULT 1,
    `mode` VARCHAR(32) NOT NULL DEFAULT 'SEQUENTIAL',
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_dvds_verse` FOREIGN KEY (`last_verse_id`) REFERENCES `daily_verses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Ecclesiastical Bible Dataset (بيانات الكتاب المقدس والشواهد)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bible_testaments` (
    `id` SMALLINT NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `name_en` VARCHAR(100) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `order_index` INT NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_btestaments_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bible_books` (
    `id` SMALLINT NOT NULL,
    `testament_id` SMALLINT NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `name_en` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `order_index` INT NOT NULL DEFAULT 1,
    `chapters_count` INT NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_bbooks_code` (`code`),
    INDEX `idx_bbooks_testament` (`testament_id`),
    CONSTRAINT `fk_bbooks_testament` FOREIGN KEY (`testament_id`) REFERENCES `bible_testaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bible_chapters` (
    `id` INT NOT NULL,
    `book_id` SMALLINT NOT NULL,
    `chapter_number` INT NOT NULL,
    `verses_count` INT NOT NULL DEFAULT 0,
    `source_url` TEXT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_bchap_book_number` (`book_id`, `chapter_number`),
    CONSTRAINT `fk_bchap_book` FOREIGN KEY (`book_id`) REFERENCES `bible_books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bible_verses` (
    `id` BIGINT NOT NULL,
    `book_id` SMALLINT NOT NULL,
    `chapter_id` INT NOT NULL,
    `verse_number` INT NOT NULL,
    `text_ar` TEXT NOT NULL,
    `text_clean` TEXT NOT NULL,
    `source_url` TEXT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_bverse_chap_number` (`chapter_id`, `verse_number`),
    INDEX `idx_bverses_book` (`book_id`),
    CONSTRAINT `fk_bverses_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `bible_chapters` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bverses_book` FOREIGN KEY (`book_id`) REFERENCES `bible_books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bible_verse_words` (
    `id` BIGINT NOT NULL,
    `verse_id` BIGINT NOT NULL,
    `word_position` INT NOT NULL,
    `word_text` VARCHAR(100) NOT NULL,
    `clean_word` VARCHAR(100) NOT NULL,
    `has_commentary` TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    INDEX `idx_bvwords_verse` (`verse_id`),
    INDEX `idx_bvwords_clean` (`clean_word`),
    CONSTRAINT `fk_bvwords_verse` FOREIGN KEY (`verse_id`) REFERENCES `bible_verses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bible_sources` (
    `id` INT NOT NULL,
    `source_name` VARCHAR(150) NOT NULL,
    `author_name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `base_url` TEXT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bible_commentaries` (
    `id` BIGINT NOT NULL,
    `verse_id` BIGINT NOT NULL,
    `source_id` INT NOT NULL,
    `commentary_title` VARCHAR(255) NULL,
    `commentary_text` LONGTEXT NOT NULL,
    `source_url` TEXT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_bcomm_verse` (`verse_id`),
    INDEX `idx_bcomm_source` (`source_id`),
    CONSTRAINT `fk_bcomm_verse` FOREIGN KEY (`verse_id`) REFERENCES `bible_verses` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bcomm_source` FOREIGN KEY (`source_id`) REFERENCES `bible_sources` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bible_word_commentaries` (
    `id` BIGINT NOT NULL,
    `word_id` BIGINT NOT NULL,
    `source_id` INT NOT NULL,
    `explanation_title` VARCHAR(255) NULL,
    `explanation_text` TEXT NOT NULL,
    `source_url` TEXT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_bwcomm_word` (`word_id`),
    INDEX `idx_bwcomm_source` (`source_id`),
    CONSTRAINT `fk_bwcomm_word` FOREIGN KEY (`word_id`) REFERENCES `bible_verse_words` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bwcomm_source` FOREIGN KEY (`source_id`) REFERENCES `bible_sources` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bible_dictionary_entries` (
    `id` BIGINT NOT NULL,
    `term` VARCHAR(150) NOT NULL,
    `clean_term` VARCHAR(150) NOT NULL,
    `author_name` VARCHAR(150) NULL,
    `original_content` LONGTEXT NOT NULL,
    `source_url` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_bdict_term` (`clean_term`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `word_dictionary_mappings` (
    `id` BIGINT NOT NULL,
    `word_id` BIGINT NOT NULL,
    `dictionary_entry_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_wdm_word` (`word_id`),
    INDEX `idx_wdm_dict` (`dictionary_entry_id`),
    CONSTRAINT `fk_wdm_word` FOREIGN KEY (`word_id`) REFERENCES `bible_verse_words` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_wdm_dict` FOREIGN KEY (`dictionary_entry_id`) REFERENCES `bible_dictionary_entries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bible_content_versions` (
    `id` CHAR(36) NOT NULL,
    `version_number` VARCHAR(32) NOT NULL,
    `description` TEXT NULL,
    `checksum_sha256` CHAR(64) NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_bcvers_active` (`is_active`),
    CONSTRAINT `fk_bcvers_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. System Operations, Audit Logs & Backups
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `actor_id` CHAR(36) NULL,
    `actor_name` VARCHAR(150) NULL,
    `actor_role` VARCHAR(32) NULL,
    `action` VARCHAR(64) NOT NULL,
    `entity_type` VARCHAR(64) NOT NULL,
    `entity_id` VARCHAR(128) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(512) NULL,
    `payload` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_audit_actor` (`actor_id`),
    INDEX `idx_audit_action` (`action`),
    INDEX `idx_audit_entity` (`entity_type`, `entity_id`),
    INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `backup_records` (
    `id` CHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_size_bytes` BIGINT NOT NULL DEFAULT 0,
    `checksum_sha256` CHAR(64) NOT NULL,
    `storage_option` VARCHAR(32) NOT NULL DEFAULT 'SERVER', -- 'SERVER', 'GOOGLE_DRIVE', 'DOWNLOAD_ONLY'
    `status` VARCHAR(32) NOT NULL DEFAULT 'COMPLETED', -- 'IN_PROGRESS', 'COMPLETED', 'FAILED'
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_backups_status` (`status`),
    INDEX `idx_backups_created` (`created_at`),
    CONSTRAINT `fk_backups_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_backups_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `import_history` (
    `id` CHAR(36) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `total_rows` INT NOT NULL DEFAULT 0,
    `imported_count` INT NOT NULL DEFAULT 0,
    `skipped_count` INT NOT NULL DEFAULT 0,
    `error_details` JSON NULL,
    `checksum_sha256` CHAR(64) NOT NULL,
    `execution_time_ms` INT NOT NULL DEFAULT 0,
    `imported_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_import_imported_by` (`imported_by`),
    CONSTRAINT `fk_import_imported_by` FOREIGN KEY (`imported_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. Safe System Reset Engine (نظام إعادة الضبط الذري الشامل)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_reset_runs` (
    `id` CHAR(36) NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `backup_id` CHAR(36) NULL,
    `data_cleared_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_sreset_actor` (`actor_id`),
    CONSTRAINT `fk_sreset_actor` FOREIGN KEY (`actor_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_reset_run_assets` (
    `id` CHAR(36) NOT NULL,
    `run_id` CHAR(36) NOT NULL,
    `asset_id` CHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `checksum_sha256` CHAR(64) NOT NULL,
    `drive_file_id` VARCHAR(255) NULL,
    `drive_folder_id` VARCHAR(255) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    `last_error` TEXT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_srassets_run` (`run_id`),
    CONSTRAINT `fk_srassets_run` FOREIGN KEY (`run_id`) REFERENCES `system_reset_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_reset_run_users` (
    `id` CHAR(36) NOT NULL,
    `run_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    `last_error` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_srusers_run` (`run_id`),
    CONSTRAINT `fk_srusers_run` FOREIGN KEY (`run_id`) REFERENCES `system_reset_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_reset_gate` (
    `singleton` TINYINT(1) NOT NULL DEFAULT 1,
    `active_run_id` CHAR(36) NULL,
    `auth_cutoff_iat` BIGINT NOT NULL DEFAULT 0,
    `last_completed_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`singleton`),
    CONSTRAINT `chk_singleton_reset` CHECK (`singleton` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_reset_write_permits` (
    `transaction_id` CHAR(36) NOT NULL,
    `run_id` CHAR(36) NOT NULL,
    `scope` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`transaction_id`),
    CONSTRAINT `fk_srwp_run` FOREIGN KEY (`run_id`) REFERENCES `system_reset_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_reset_auth_delete_permits` (
    `user_id` CHAR(36) NOT NULL,
    `run_id` CHAR(36) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`user_id`),
    CONSTRAINT `fk_sradp_run` FOREIGN KEY (`run_id`) REFERENCES `system_reset_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
