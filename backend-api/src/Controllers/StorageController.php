<?php
namespace App\Controllers;

use App\Middleware\JwtAuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Middleware\GroupScopeMiddleware;
use App\Middleware\FileSecurityMiddleware;
use App\Services\StorageBridgeService;
use App\Services\AuditLogService;
use App\Utils\Response;

class StorageController {
    public function upload(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireRoles($user, ['admin', 'super_user', 'servant', 'secretariat']);

        if (!isset($_FILES['file'])) {
            Response::error('يرجى اختيار ملف لرفعه', 'NO_FILE_PROVIDED', 400);
        }

        $folderType = $_POST['folder_type'] ?? 'general';
        $groupId = isset($_POST['group_id']) ? (int)$_POST['group_id'] : (int)($user['group_id'] ?? 1);

        // Every folder type lives inside a group, so group scope is enforced
        // unconditionally. Previously only the "academic" list was checked,
        // which let a group-1 servant write into gallery/ and users/ for any
        // group — a real cross-group write, not just a hidden UI element.
        GroupScopeMiddleware::enforceGroupScope($user, $groupId);

        if (in_array($folderType, ['curriculum', 'lectures', 'books', 'research', 'mp3'])) {
            $targetSubDir = "academic/group_{$groupId}/{$folderType}";
        } elseif ($folderType === 'users') {
            $userRole = $_POST['user_role'] ?? 'trainees';
            $targetSubDir = "users/{$userRole}/group_{$groupId}";
        } elseif ($folderType === 'feed') {
            $yearMonth = date('Y/m');
            $targetSubDir = "feed/group_{$groupId}/{$yearMonth}";
        } else {
            $targetSubDir = "gallery/group_{$groupId}/{$folderType}";
        }

        FileSecurityMiddleware::validateUpload($_FILES['file'], $folderType);

        try {
            $storage = new StorageBridgeService();
            $uploaded = $storage->saveUploadedFile($_FILES['file'], $targetSubDir);

            // Audit log the file upload
            AuditLogService::log(
                $user['user_id'],
                $user['claims']['user_metadata']['full_name'] ?? 'مستخدم',
                $user['role'],
                'FILE_UPLOAD',
                'storage',
                $uploaded['filename'],
                null,
                $uploaded
            );

            Response::success($uploaded, 'تم رفع الملف بنجاح');
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 'UPLOAD_FAILED', 500);
        }
    }

    public function delete(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireAdminOrSuperUser($user);

        $body = json_decode(file_get_contents('php://input'), true);
        $filePath = $body['file_path'] ?? '';

        if (!$filePath) {
            Response::error('مسار الملف مطلوب', 'PATH_REQUIRED', 400);
        }

        $storage = new StorageBridgeService();
        $deleted = $storage->deleteFile($filePath);

        if ($deleted) {
            AuditLogService::log(
                $user['user_id'],
                $user['claims']['user_metadata']['full_name'] ?? 'إدارة',
                $user['role'],
                'FILE_DELETE',
                'storage',
                $filePath
            );
            Response::success(null, 'تم حذف الملف بنجاح');
        } else {
            Response::error('الملف غير موجود أو تعذر حذفه', 'DELETE_FAILED', 404);
        }
    }
}
