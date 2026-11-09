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
