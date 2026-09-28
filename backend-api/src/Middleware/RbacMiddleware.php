<?php
namespace App\Middleware;

use App\Utils\Response;

class RbacMiddleware {
    public static function requireRoles(array $user, array $allowedRoles): void {
        $role = $user['role'] ?? 'trainee';
        
        // Admin and Super User always have global access
        if ($role === 'admin' || $role === 'super_user') {
            return;
        }

        if (!in_array($role, $allowedRoles)) {
            Response::error('ليس لديك الصلاحية لتنفيذ هذا الإجراء', 'FORBIDDEN', 403);
        }
    }

    public static function requireAdminOrSuperUser(array $user): void {
        self::requireRoles($user, ['admin', 'super_user']);
    }
}
