<?php
namespace App\Controllers;

use App\Utils\AppRoot;

use App\Middleware\JwtAuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Services\ZipEncryptionService;
use App\Services\AuditLogService;
use App\Services\SupabaseClient;
use App\Services\BackupArchiveInspector;
use App\Services\DatabaseExportService;
use App\Utils\FsHelper;
use App\Utils\Response;
use App\Utils\Security;

class BackupController {
    /**
     * Hard limits for any uploaded archive (SRS 26).
     *
     * A backup ZIP is attacker-controlled input: it arrives as a multipart upload
     * from the browser. Without these caps a small archive can declare a huge
     * uncompressed size and exhaust disk during extraction.
     */
    private const MAX_ARCHIVE_BYTES      = 2048 * 1024 * 1024;  // 2 GB compressed
    private const MAX_EXPANDED_BYTES     = 8 * 1024 * 1024 * 1024; // 8 GB uncompressed
    private const MAX_ENTRY_COUNT        = 500000;
    private const MAX_RATIO              = 200;   // uncompressed:compressed

    public function create(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireAdminOrSuperUser($user);

        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $password = $body['encryption_password'] ?? '';
        $storageOption = $body['storage_option'] ?? 'HOSTINGER'; // 'HOSTINGER' or 'DOWNLOAD_ONLY'

        if (empty($password) || strlen($password) < 6) {
            Response::error('يرجى إدخال كلمة مرور قوية لتشفير ملف النسخة الاحتياطية (6 خانات على الأقل)', 'PASSWORD_REQUIRED', 400);
        }

        $backupId = Security::generateUuidV4();
        $timestamp = date('Y-m-d_H-i-s');
        $filename = "elkarooz_backup_{$timestamp}.zip";

        $storageConfig = require AppRoot::path('config/storage.php');
        $fullBackupDir = $storageConfig['root_path'] . '/backups/full';
        if (!is_dir($fullBackupDir)) {
            mkdir($fullBackupDir, 0755, true);
        }

        $targetZipPath = $fullBackupDir . '/' . $filename;
        $tempStagingDir = FsHelper::createPrivateStagingDir('elkarooz_backup_');

        try {
            // 1. Copy the live storage tree into staging.
            //
            // The previous implementation staged a manifest.json and nothing else,
            // so every "backup" was an archive containing no user data at all while
            // backup_records reported status=COMPLETED with a real checksum. The
            // storage tree is what the PHP backend owns and can read, so it is
            // snapshotted here rather than assumed.
            $storageRoot = rtrim($storageConfig['root_path'], '/\\');
            $filesDir = $tempStagingDir . '/files';
            mkdir($filesDir, 0755, true);

            $copied = 0;
            $copiedBytes = 0;
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($storageRoot, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $item) {
                /** @var \SplFileInfo $item */
                $rel = ltrim(str_replace($storageRoot, '', $item->getPathname()), '/\\');

                // Never fold the backup archive directory into the backup it is
                // producing: that is self-referential and grows without bound.
                if (str_starts_with(str_replace('\\', '/', $rel), 'backups/')) {
                    continue;
                }

                if ($item->isDir()) {
                    if (!is_dir($filesDir . '/' . $rel)) {
                        mkdir($filesDir . '/' . $rel, 0755, true);
                    }
                    continue;
                }
                // FsHelper::removeDirectory does not follow links, and neither do we:
                // a symlink in storage would otherwise pull in an arbitrary file.
                if ($item->isLink()) {
                    continue;
                }

                $dest = $filesDir . '/' . $rel;
                $parent = dirname($dest);
                if (!is_dir($parent)) {
                    mkdir($parent, 0755, true);
                }
                if (copy($item->getPathname(), $dest)) {
                    $copied++;
                    $copiedBytes += $item->getSize();
                }
            }

            // 2. Export the database before writing the manifest.
            //
            // This used to be impossible: the manifest hardcoded
            // includes_database => false because pg_dump is unavailable on shared
            // hosting. That reasoning was wrong -- pg_dump is not required to make
            // a logical export. export_manifest() / export_table() serialise any
            // public table to jsonb from inside Postgres, over the same PostgREST
            // endpoint the rest of the backup already uses.
            //
            // It is exported BEFORE the manifest so the manifest can record real
            // counts. A database export failure aborts the whole backup: shipping
            // an archive that silently contains no database would be worse than
            // shipping nothing, because restore would treat it as a files-only
            // archive the operator never asked for.
            $dbExport = (new DatabaseExportService(new SupabaseClient()))
                ->exportToDirectory($tempStagingDir);
            printf(
                '[backup] database exported: %d tables, %d rows, %d bytes',
                $dbExport['tables'],
                $dbExport['rows'],
                $dbExport['bytes']
            );

            // 3. manifest.json — written LAST so it reports what was really staged.
            $manifest = [
                'system_name' => 'EL KAROOZ School',
                'system_version' => '2.0.0',
                'backup_id' => $backupId,
                'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
                'created_by' => $user['user_id'],
                'includes_files' => $copied > 0,
                'includes_database' => true,
                'files_count' => $copied,
                'files_bytes' => $copiedBytes,
                'database_tables' => $dbExport['tables'],
                'database_rows' => $dbExport['rows'],
                'database_bytes' => $dbExport['bytes'],
                'database_row_counts' => $dbExport['row_counts'],
                'database_dump_note' => 'Logical export of the public schema (table data only) produced by export_manifest() and export_table() over PostgREST. This is NOT a pg_dump: it contains no schema, no indexes, no constraints and nothing from auth.users. The schema is version-controlled in supabase/migrations, so a restore requires that schema to already be deployed.',
            ];
            file_put_contents(
                $tempStagingDir . '/manifest.json',
                json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            );

            // 4. Compress and encrypt to target ZIP
            ZipEncryptionService::createEncryptedZip($tempStagingDir, $targetZipPath, $password);

            $fileSize = filesize($targetZipPath);
            $sha256 = hash_file('sha256', $targetZipPath);

            // 5. Record in Supabase backup_records
            $client = new SupabaseClient();
            $client->query('backup_records', 'POST', [
                'id' => $backupId,
                'filename' => $filename,
                'file_size_bytes' => $fileSize,
                'storage_type' => $storageOption,
                'storage_path' => "/backups/full/{$filename}",
                'status' => 'COMPLETED',
                'checksum_sha256' => $sha256,
                'created_by' => $user['user_id']
            ]);

            // 6. Audit log
            AuditLogService::log(
                $user['user_id'],
                $user['claims']['user_metadata']['full_name'] ?? 'إدارة',
                $user['role'],
                'BACKUP_CREATE',
                'backup_records',
                $backupId,
                null,
                [
                    'filename' => $filename,
                    'size' => $fileSize,
                    'storage' => $storageOption,
                    'files' => $copied,
                    'db_tables' => $dbExport['tables'],
                    'db_rows' => $dbExport['rows'],
                ]
            );

            Response::success([
                'backup_id' => $backupId,
                'filename' => $filename,
                'file_size_bytes' => $fileSize,
                'checksum_sha256' => $sha256,
                'files_included' => $copied,
                'includes_database' => true,
                'database_tables' => $dbExport['tables'],
                'database_rows' => $dbExport['rows'],
                'storage_path' => "/backups/full/{$filename}"
            ], 'تم إنشاء النسخة الاحتياطية وتشفيرها بنجاح');
        } catch (\Exception $e) {
            // Never leave a half-written archive that a later restore might pick up.
            if (file_exists($targetZipPath)) {
                @unlink($targetZipPath);
            }
            $this->refuse($e, 'BACKUP_FAILED', 500);
        } finally {
            // The staging tree holds unencrypted copies of every user file.
            FsHelper::removeDirectoryQuietly($tempStagingDir);
        }
    }

    public function list(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireAdminOrSuperUser($user);

        $client = new SupabaseClient();
        $res = $client->query('backup_records?order=created_at.desc&deleted_at=is.null');

        Response::success($res['data'] ?? [], 'قائمة النسخ الاحتياطية');

    }

        /**
         * POST /backup/validate-zip — SRS 26.
         *
         * Validates an archive BEFORE it is stored, so a corrupt or hostile file never
         * consumes backup storage or becomes a candidate for a later restore. Checks
         * the container, the encryption password, the manifest, and the resource
         * limits that stop a ZIP bomb.
         */
        public function validateZip(): void {
            $user = JwtAuthMiddleware::authenticate();
            RbacMiddleware::requireAdminOrSuperUser($user);

            if (!isset($_FILES['backup_zip'])) {
                Response::error('يرجى اختيار ملف النسخة الاحتياطية', 'FILE_REQUIRED', 400);
            }

            $file = $_FILES['backup_zip'];
            if ($file['error'] !== UPLOAD_ERR_OK) {
                Response::error('فشل رفع الملف', 'UPLOAD_FAILED', 400, ['php_error' => $file['error']]);
            }
            if ($file['size'] > self::MAX_ARCHIVE_BYTES) {
                Response::error(
                    'حجم الملف يتجاوز الحد المسموح',
                    'ARCHIVE_TOO_LARGE',
                    413,
                    ['max_bytes' => self::MAX_ARCHIVE_BYTES, 'size' => $file['size']]
                );
            }

            $password = $_POST['encryption_password'] ?? '';
            if ($password === '') {
                Response::error('يرجى إدخال كلمة مرور فك التشفير', 'PASSWORD_REQUIRED', 400);
            }

            // Container-level checks on the compressed file, before any extraction.
            $containerError = $this->inspectContainer($file['tmp_name']);
            if ($containerError !== null) {
                Response::error('الملف غير صالح: ' . $containerError, 'INVALID_ARCHIVE', 422, ['detail' => $containerError]);
            }

            $extractDir = FsHelper::createPrivateStagingDir('elkarooz_validate_');
            try {
                ZipEncryptionService::extractEncryptedZip($file['tmp_name'], $extractDir, $password);
                $inspection = BackupArchiveInspector::inspect($extractDir);

                if (!$inspection['valid']) {
                    Response::error(
                        'الملف لا يطابق مواصفات النسخ الاحتياطية المعتمدة.',
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
                ], 'الملف نسخة احتياطية صالحة');
            } catch (\Exception $e) {
                // A wrong password surfaces here as a decryption failure.
                $this->refuse($e, 'DECRYPTION_FAILED', 400);
            } finally {
                FsHelper::removeDirectoryQuietly($extractDir);
            }
        }

        /**
         * Container-level archive checks that need no password.
         *
         * @return string|null human-readable reason, or null when the file passes
         */
        private function inspectContainer(string $zipPath): ?string {
            $size = filesize($zipPath);
            if ($size === 0) {
                return 'الملف فارغ';
            }

            $handle = fopen($zipPath, 'rb');
            if ($handle === false) {
                return 'تعذر قراءة الملف';
            }
            $signature = fread($handle, 4);
            fclose($handle);
            if ($signature !== "PK\x03\x04") {
                return 'الملف ليس أرشيف ZIP صالح (توقيع غير مطابق)';
            }

            $zip = new \ZipArchive();
            if ($zip->open($zipPath, \ZipArchive::CHECKCONS) !== true) {
                $zip->close();
                return 'البنية الداخلية للأرشيف تالفة';
            }

            $entryCount = $zip->numFiles;
            $expandedTotal = 0;
            for ($i = 0; $i < $entryCount; $i++) {
                $stat = $zip->statIndex($i);
                if ($stat === false) {
                    $zip->close();
                    return 'تعذر قراءة أحد مدخلات الأرشيف';
                }
                $expandedTotal += (int) $stat['size'];

                if ($expandedTotal > self::MAX_EXPANDED_BYTES) {
                    $zip->close();
                    return sprintf(
                        'الحجم بعد فك الضغط يتجاوز الحد المسموح (%d بايت)',
                        self::MAX_EXPANDED_BYTES
                    );
                }
                // Ratio check on the running total: a highly compressible payload is a
                // ZIP bomb, and legitimate backups of documents never approach 200:1.
                if ($expandedTotal > 1024 * 1024 && ($expandedTotal / max(1, $size)) > self::MAX_RATIO) {
                    $zip->close();
                    return 'نسبة الضغط إلى الحجمCompression-to-size ratio) غير طبيعية — يُشتبه في ZIP bomb';
                }
            }

            if ($entryCount > self::MAX_ENTRY_COUNT) {
                $zip->close();
                return sprintf('عدد مدخلات الأرشيف يتجاوز الحد المسموح (%d)', self::MAX_ENTRY_COUNT);
            }

            $zip->close();
            return null;
        }

        /**
         * POST /backup/delete — SRS 26 (retention).
         *
         * Soft-deletes the record AND removes the file from disk. Deleting the row
         * alone would leave the archive consuming storage forever while list() reports
         * it gone.
         */
        public function delete(): void {
            $user = JwtAuthMiddleware::authenticate();
            RbacMiddleware::requireAdminOrSuperUser($user);

            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            $backupId = $body['backup_id'] ?? ($_POST['backup_id'] ?? null);
            if (empty($backupId) || !preg_match('/^[0-9a-fA-F-]{36}$/', (string) $backupId)) {
                Response::error('معرّف النسخة الاحتياطية غير صالح', 'INVALID_BACKUP_ID', 400);
            }

            $client = new SupabaseClient();

            // Read the record first: storage_path must come from the database, never
            // from client input, or this becomes an arbitrary file deletion primitive.
            $existing = $client->query(
                'backup_records?select=id,filename,storage_path,deleted_at&id=eq.' . rawurlencode((string) $backupId),
                'GET',
                null,
                ['Accept' => 'application/json']
            );
            $record = $existing['data'][0] ?? null;

            if ($record === null) {
                Response::error('النسخة الاحتياطية غير موجودة', 'BACKUP_NOT_FOUND', 404);
            }
            if (!empty($record['deleted_at'])) {
                Response::error('تم حذف هذه النسخة الاحتياطية مسبقاً', 'BACKUP_ALREADY_DELETED', 409);
            }

            $storageConfig = require AppRoot::path('config/storage.php');
            $backupRoot = rtrim($storageConfig['root_path'], '/\\') . '/backups';
            $storagePath = (string) ($record['storage_path'] ?? '');
            $absolute = $storageRoot . '/' . ltrim(str_replace(['..', "\0"], '', $storagePath), '/\\');
            $fileDeleted = false;

            // Containment must hold after realpath resolution, and the path must be
            // inside backups/ — anything else means a tampered storage_path.
            $realBackupRoot = realpath($backupRoot);
            $realFile = realpath($absolute);
            if ($realBackupRoot !== false && $realFile !== false
                && str_starts_with($realFile, $realBackupRoot . DIRECTORY_SEPARATOR)
                && is_file($realFile)) {
                $fileDeleted = @unlink($realFile);
            }

            // Soft-delete the record so history and audit remain intact.
            $patch = $client->query('backup_records?id=eq.' . rawurlencode((string) $backupId), 'PATCH', [
                'deleted_at' => gmdate('Y-m-d\TH:i:s\Z'),
                'deleted_by' => $user['user_id'],
            ]);

            if (($patch['status'] ?? 0) < 200 || ($patch['status'] ?? 0) >= 300) {
                Response::error('تعذر تحديث سجل النسخة الاحتياطية', 'BACKUP_DELETE_FAILED', 500, $patch['data'] ?? null);
            }

            AuditLogService::log(
                $user['user_id'],
                $user['claims']['user_metadata']['full_name'] ?? 'إدارة',
                $user['role'],
                'BACKUP_DELETE',
                'backup_records',
                (string) $backupId,
                ['storage_path' => $storagePath],
                ['file_removed_from_disk' => $fileDeleted]
            );

            Response::success([
                'backup_id' => $backupId,
                'file_removed_from_disk' => $fileDeleted,
            ], $fileDeleted
                ? 'تم حذف النسخة الاحتياطية'
                : 'تم تحديث السجل؛ ملف النسخة لم يُعثر عليه على القرص');
        }
    

    /**
     * Refuse a failure without describing it.
     *
     * The upstream services throw messages that interpolate real server state --
     * AtomicRestoreService reports 'فشل نسخ الملف: ' . $src, AppRoot reports the
     * directory it walked up from, DatabaseRestoreService names archive members.
     * Returning those to the caller hands whoever holds the token a map of the
     * filesystem layout, the staging directory name, and whether a guessed path
     * exists. Being admin-only is not a defence: an admin token that leaks once
     * turns a restore error into reconnaissance for whoever holds it.
     *
     * The operator still needs to know WHAT failed, so the failure class is kept and
     * the detail goes to the log under a correlation id the caller can quote.
     *
     * @param string $opaqueCode the stable, caller-safe failure class
     */
    private function refuse(\Exception $e, string $opaqueCode, int $status): void
    {
        $errorId = substr(bin2hex(random_bytes(4)), 0, 8);
        error_log(sprintf(
            '[EL KAROOZ] %s [%s] %s in %s:%d',
            $opaqueCode,
            $errorId,
            $e->getMessage(),
            $e->getFile(),
            $e->getLine()
        ));
        Response::error(
            'فشلت العملية. لم يتم تعديل النظام. رقم الخطأ: ' . $errorId,
            $opaqueCode,
            $status,
            ['error_id' => $errorId]
        );
    }
}
