<?php
namespace App\Controllers;

use App\Middleware\JwtAuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Services\ZipEncryptionService;
use App\Services\AuditLogService;
use App\Utils\Response;

class RestoreController {
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

        $tmpFile = $_FILES['backup_zip']['tmp_name'];
        $extractDir = sys_get_temp_dir() . '/elkarooz_restore_preview_' . uniqid();

        try {
            ZipEncryptionService::extractEncryptedZip($tmpFile, $extractDir, $password);

            $manifestPath = $extractDir . '/manifest.json';
            if (!file_exists($manifestPath)) {
                throw new \Exception('ملف النسخة الاحتياطية غير صالح (manifest.json مفقود)');
            }

            $manifest = json_decode(file_get_contents($manifestPath), true);

            // Clean up preview dir
            unlink($manifestPath);
            rmdir($extractDir);

            Response::success([
                'valid' => true,
                'manifest' => $manifest,
                'message' => 'تم فك تشفير النسخة الاحتياطية والتحقق منها بنجاح. يمكنك الآن تأكيد الاستعادة.'
            ], 'معاينة النسخة الاحتياطية');
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 'RESTORE_PREVIEW_FAILED', 400);
        }
    }
}
