<?php
namespace App\Controllers;

use App\Utils\AppRoot;

use App\Middleware\JwtAuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Services\ZipEncryptionService;
use App\Services\AuditLogService;
use App\Services\SupabaseClient;
use App\Utils\Response;
use App\Utils\Security;

class BackupController {
    public function create(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireAdminOrSuperUser($user);

        $body = json_decode(file_get_contents('php://input'), true);
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
        $tempStagingDir = sys_get_temp_dir() . '/elkarooz_backup_' . $backupId;
        mkdir($tempStagingDir, 0755, true);

        try {
            // 1. Create manifest.json
            $manifest = [
                'system_name' => 'EL KAROOZ School',
                'system_version' => '2.0.0',
                'backup_id' => $backupId,
                'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
                'created_by' => $user['user_id']
            ];
            file_put_contents($tempStagingDir . '/manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            // 2. Compress and encrypt to target ZIP
            ZipEncryptionService::createEncryptedZip($tempStagingDir, $targetZipPath, $password);
            
            // Clean temp staging
            unlink($tempStagingDir . '/manifest.json');
            rmdir($tempStagingDir);

            $fileSize = filesize($targetZipPath);
            $sha256 = hash_file('sha256', $targetZipPath);

            // Record in Supabase backup_records
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

            // Audit log
            AuditLogService::log(
                $user['user_id'],
                $user['claims']['user_metadata']['full_name'] ?? 'إدارة',
                $user['role'],
                'BACKUP_CREATE',
                'backup_records',
                $backupId,
                null,
                ['filename' => $filename, 'size' => $fileSize, 'storage' => $storageOption]
            );

            Response::success([
                'backup_id' => $backupId,
                'filename' => $filename,
                'file_size_bytes' => $fileSize,
                'checksum_sha256' => $sha256,
                'storage_path' => "/backups/full/{$filename}"
            ], 'تم إنشاء النسخة الاحتياطية وتشفيرها بنجاح');
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 'BACKUP_FAILED', 500);
        }
    }

    public function list(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireAdminOrSuperUser($user);

        $client = new SupabaseClient();
        $res = $client->query('backup_records?order=created_at.desc&deleted_at=is.null');

        Response::success($res['data'] ?? [], 'قائمة النسخ الاحتياطية');
    }
}
