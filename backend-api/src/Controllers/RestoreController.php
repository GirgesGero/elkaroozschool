<?php
namespace App\Controllers;

use App\Middleware\JwtAuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Services\ZipEncryptionService;
use App\Services\BackupArchiveInspector;
use App\Services\AuditLogService;
use App\Utils\FsHelper;
use App\Utils\Response;

/**
 * Restore endpoints (SRS 25).
 *
 * SRS 24.1 reserves backup and restore to admin and super_user only, so every
 * method authenticates and authorises BEFORE touching the uploaded file — a denied
 * request must never make the server decrypt anything.
 */
class RestoreController {
    /**
     * POST /api/restore/preview — SRS 25.2 / 25.3.
     */
    public function preview(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireAdminOrSuperUser($user);

        if (!isset($_FILES['backup_zip'])) {
            Response::error('يرجى اختيار ملف النسخة الاحتياطية', 'FILE_REQUIRED', 400);
        }

        $password = $_POST['encryption_password'] ?? '';
        if (empty($password)) {
            Response::error('يرجى إدخال كلمة مرور فك التشفير', 'PASSWORD_REQUIRED', 400);
        }

        $extractDir = FsHelper::createPrivateStagingDir('elkarooz_preview_');

        try {
            ZipEncryptionService::extractEncryptedZip($_FILES['backup_zip']['tmp_name'], $extractDir, $password);

            $inspection = BackupArchiveInspector::inspect($extractDir);

            // SRS 25.2.5: never let a failed archive proceed. Report ALL failures,
            // not just the first, so the operator can fix the archive in one pass.
            if (!$inspection['valid']) {
                Response::error(
                    'فشل الفحص المسبق للاستعادة. لم يتم تعديل النظام.',
                    'PRE_RESTORE_VALIDATION_FAILED',
                    422,
                    ['checks' => $inspection['checks']]
                );
            }

            Response::success([
                'valid'    => true,
                'checks'   => $inspection['checks'],
                'manifest' => $inspection['manifest'],
                'summary'  => $inspection['summary'],
                'available_restore_modes' => [
                    'FILES_ONLY'    => (bool) $inspection['summary']['includes_files'],
                    'DATABASE_ONLY' => (bool) $inspection['summary']['includes_database'],
                    'FULL_SYSTEM'   => (bool) ($inspection['summary']['includes_files']
                                              || $inspection['summary']['includes_database']),
                ],
            ], 'معاينة النسخة الاحتياطية جاهزة للتأكيد');
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 'RESTORE_PREVIEW_FAILED', 400);
        } finally {
            // The decrypted plaintext must not outlive the request. The previous
            // implementation unlinked one file then rmdir'd a directory still full of
            // extracted content: the rmdir failed silently and left decrypted backup
            // contents in the system temp directory.
            FsHelper::removeDirectoryQuietly($extractDir);
        }
    }

    /**
     * POST /api/restore/execute — SRS 25.1 / 25.4 / 25.5.
     *
     * Runs through AtomicRestoreService, which stages a safety backup before
     * touching anything and rolls back automatically on any failure.
     */
    public function execute(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireAdminOrSuperUser($user);

        if (!isset($_FILES['backup_zip'])) {
            Response::error('يرجى اختيار ملف النسخة الاحتياطية', 'FILE_REQUIRED', 400);
        }

        $password = $_POST['encryption_password'] ?? '';
        if (empty($password)) {
            Response::error('يرجى إدخال كلمة مرور فك التشفير', 'PASSWORD_REQUIRED', 400);
        }

        $mode = $_POST['restore_mode'] ?? 'FULL_SYSTEM';
        $allowedModes = ['DATABASE_ONLY', 'FILES_ONLY', 'FULL_SYSTEM'];
        if (!in_array($mode, $allowedModes, true)) {
            Response::error('نمط الاستعادة غير مدعوم', 'INVALID_RESTORE_MODE', 400, ['allowed' => $allowedModes]);
        }

        // SRS 25.3 requires explicit confirmation before execution.
        if (($_POST['confirm_restore'] ?? '') !== 'YES') {
            Response::error(
                'يجب تأكيد الاستعادة صراحةً (confirm_restore=YES) قبل التنفيذ',
                'CONFIRMATION_REQUIRED',
                400
            );
        }

        $extractDir = FsHelper::createPrivateStagingDir('elkarooz_restore_');

        try {
            ZipEncryptionService::extractEncryptedZip($_FILES['backup_zip']['tmp_name'], $extractDir, $password);

            $result = (new \App\Services\AtomicRestoreService())
                ->execute($extractDir, ['restore_mode' => $mode], $user);

            AuditLogService::log(
                $user['user_id'],
                $user['claims']['user_metadata']['full_name'] ?? 'إدارة',
                $user['role'],
                'RESTORE_EXECUTE',
                'storage',
                null,
                null,
                ['mode' => $mode, 'safety_backup' => $result['safety_backup'] ?? null]
            );

            Response::success($result, 'تم تنفيذ الاستعادة الذرية بنجاح');
        } catch (\App\Services\RestoreFailedException $e) {
            AuditLogService::log(
                $user['user_id'],
                $user['claims']['user_metadata']['full_name'] ?? 'إدارة',
                $user['role'],
                'RESTORE_FAILED_ROLLED_BACK',
                'storage',
                null,
                null,
                ['mode' => $mode, 'error' => $e->getMessage(), 'rolled_back' => true]
            );

            Response::error(
                'فشلت الاستعادة وتم التراجع تلقائياً. النظام في حالته السابقة.',
                'RESTORE_FAILED_ROLLED_BACK',
                500,
                [
                    'reason'         => $e->getMessage(),
                    'rolled_back'    => true,
                    'rollback_error' => $e->rollbackError,
                    'safety_backup'  => $e->safetyBackup,
                ]
            );
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 'RESTORE_FAILED', 400);
        } finally {
            FsHelper::removeDirectoryQuietly($extractDir);
        }
    }
}
