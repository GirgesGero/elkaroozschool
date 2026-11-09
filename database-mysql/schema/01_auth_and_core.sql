-- =============================================================================
-- EL KAROOZ SCHOOL — Production MySQL Database Schema
-- File: 01_auth_and_core.sql
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Description: Core identity, roles, study groups, permissions & user profiles.
-- Replaces Supabase Auth (auth.users) with native enterprise identity.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Native Authentication Users (Replaces Supabase auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auth_users` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `raw_app_meta_data` JSON NULL,
    `raw_user_meta_data` JSON NULL,
    `is_super_admin` TINYINT(1) NOT NULL DEFAULT 0,
    `confirmed_at` DATETIME(3) NULL,
    `last_sign_in_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_auth_users_email` (`email`),
    INDEX `idx_auth_users_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Auth Refresh Tokens & Sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auth_refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `user_agent` VARCHAR(512) NULL,
    `ip_address` VARCHAR(45) NULL,
    `revoked` TINYINT(1) NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_auth_tokens_hash` (`token_hash`),
    INDEX `idx_auth_tokens_user` (`user_id`),
    INDEX `idx_auth_tokens_expires` (`expires_at`),
    CONSTRAINT `fk_auth_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `auth_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Static System Roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
    `id` VARCHAR(32) NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Academic Study Groups (الفرق الدراسية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `groups` (
    `id` SMALLINT UNSIGNED NOT NULL, -- 1 = الفرقة الأولى, 2 = الفرقة الثانية, 3 = الفرقة الثالثة
    `name_ar` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. System Permissions Catalog
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `permissions` (
    `id` VARCHAR(64) NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. User Profiles (الملفات الشخصية للمستخدمين)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `profiles` (
    `id` CHAR(36) NOT NULL,
    `username` VARCHAR(64) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `avatar_url` TEXT NULL,
    `birth_date` DATE NOT NULL,
    `phone` VARCHAR(32) NULL,
    `address` TEXT NULL,
    `church` VARCHAR(150) NULL,
    `confession_father` VARCHAR(150) NULL,
    `role_id` VARCHAR(32) NOT NULL,
    `group_id` SMALLINT UNSIGNED NULL, -- NULL for System Administrators
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_profiles_username` (`username`),
    INDEX `idx_profiles_role` (`role_id`),
    INDEX `idx_profiles_group` (`group_id`),
    INDEX `idx_profiles_deleted` (`deleted_at`),
    INDEX `idx_profiles_active` (`is_active`),
    CONSTRAINT `fk_profiles_user` FOREIGN KEY (`id`) REFERENCES `auth_users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_profiles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_profiles_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_profiles_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `auth_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Group Secretariat Assignments (سكرتارية الفرق)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `group_secretariat` (
    `id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NOT NULL,
    `group_id` SMALLINT UNSIGNED NOT NULL,
    `appointed_by` CHAR(36) NULL,
    `appointed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_secretariat_profile` (`profile_id`),
    UNIQUE KEY `uq_secretariat_profile_group` (`profile_id`, `group_id`),
    INDEX `idx_secretariat_group` (`group_id`),
    CONSTRAINT `fk_sec_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sec_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sec_appointed_by` FOREIGN KEY (`appointed_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Servant Delegated Permissions (صلاحيات الخدام المفوضة)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `servant_permissions` (
    `id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NOT NULL,
    `permission_id` VARCHAR(64) NOT NULL,
    `granted_by` CHAR(36) NULL,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_servant_permission` (`profile_id`, `permission_id`),
    INDEX `idx_servant_perm_permission` (`permission_id`),
    CONSTRAINT `fk_sp_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sp_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. General Secretariat Members & Permissions (السكرتارية العامة)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `general_secretariat_members` (
    `profile_id` CHAR(36) NOT NULL,
    `appointed_by` CHAR(36) NULL,
    `appointed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`profile_id`),
    CONSTRAINT `fk_gsm_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_gsm_appointed_by` FOREIGN KEY (`appointed_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `general_secretariat_permissions` (
    `profile_id` CHAR(36) NOT NULL,
    `permission_id` VARCHAR(64) NOT NULL,
    `granted_by` CHAR(36) NULL,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`profile_id`, `permission_id`),
    CONSTRAINT `fk_gsp_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_gsp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_gsp_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. System Admin Role Change Permits (تصاريح ترقية/تعديل رتبة المدير)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_admin_role_change_permits` (
    `transaction_id` CHAR(36) NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NOT NULL,
    `old_role_id` VARCHAR(32) NOT NULL,
    `new_role_id` VARCHAR(32) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`transaction_id`),
    INDEX `idx_admin_permits_actor` (`actor_id`),
    INDEX `idx_admin_permits_target` (`profile_id`),
    CONSTRAINT `fk_sarcp_actor` FOREIGN KEY (`actor_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sarcp_target` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
