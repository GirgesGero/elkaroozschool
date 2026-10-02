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

        // Allowlist, not a denylist. Anything not listed falls through to the
        // gallery branch below, where an attacker-chosen folder_type is
        // interpolated into the destination path.
        $ALLOWED_FOLDERS = ['curriculum', 'lectures', 'books', 'research', 'mp3',
                            'users', 'feed', 'general', 'gallery'];
        $folderType = $_POST['folder_type'] ?? 'general';
        if (!in_array($folderType, $ALLOWED_FOLDERS, true)) {
            Response::error('نوع المجلد غير صالح', 'INVALID_FOLDER_TYPE', 400);
        }
        $groupId = isset($_POST['group_id']) ? (int)$_POST['group_id'] : (int)($user['group_id'] ?? 1);

        // Every folder type lives inside a group, so group scope is enforced
        // unconditionally. Previously only the "academic" list was checked,
        // which let a group-1 servant write into gallery/ and users/ for any
        // group — a real cross-group write, not just a hidden UI element.
        GroupScopeMiddleware::enforceGroupScope($user, $groupId);

        if (in_array($folderType, ['curriculum', 'lectures', 'books', 'research', 'mp3'], true)) {
            $targetSubDir = "academic/group_{$groupId}/{$folderType}";
        } elseif ($folderType === 'users') {
            // Same reason: user_role is interpolated into the path.
            $ALLOWED_USER_ROLES = ['trainees', 'servants', 'secretariat', 'admins'];
            $userRole = $_POST['user_role'] ?? 'trainees';
            if (!in_array($userRole, $ALLOWED_USER_ROLES, true)) {
                Response::error('نوع المستخدم غير صالح', 'INVALID_USER_ROLE', 400);
            }
            $targetSubDir = "users/{$userRole}/group_{$groupId}";
        } elseif ($folderType === 'feed') {
            $yearMonth = date('Y/m');
            $targetSubDir = "feed/group_{$groupId}/{$yearMonth}";
        } elseif ($folderType === 'gallery' || $folderType === 'general') {
            // TD 10.1 puts galleries under gallery/{album_id}, and gallery_items
            // carries a real album_id. Keying on folder_type alone collapsed both
            // 'general' and 'gallery' into the same directory via the old catch-all
            // else branch, so an album's images were never separated and
            // album_id was ignored on the write path.
            $ALLOWED_ALBUMS = ['general', 'gallery'];
            $albumId = $_POST['album_id'] ?? $folderType;
            if (!in_array($albumId, $ALLOWED_ALBUMS, true)) {
                Response::error('معرّف الألبوم غير صالح', 'INVALID_ALBUM_ID', 400);
            }
            $targetSubDir = "gallery/group_{$groupId}/{$albumId}";
        } else {
            // Unreachable while the allowlist and the branches above agree, but a
            // future folder_type must fail loudly rather than land in a shared
            // directory by accident.
            Response::error('نوع المجلد غير مدعوم', 'UNSUPPORTED_FOLDER_TYPE', 400);
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
            $this->refuse($e, 'UPLOAD_FAILED', 500);
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
