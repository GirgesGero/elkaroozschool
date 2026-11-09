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
