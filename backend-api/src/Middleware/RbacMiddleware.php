<?php
namespace App\Middleware;

use App\Utils\Response;

class RbacMiddleware {
    public static function requireRoles(array $user, array $allowedRoles): void {
        $role = $user['role'] ?? 'trainee';
        
        // Only the relationally resolved current system administrator is global.
        // JwtAuthMiddleware refreshes role/group claims from profiles on every
        // request, so a transferred admin cannot keep privilege via an old JWT.
        if ($role === 'admin') {
            return;
        }

        if (!in_array($role, $allowedRoles, true)) {
            Response::error('ليس لديك الصلاحية لتنفيذ هذا الإجراء', 'FORBIDDEN', 403);
        }
    }

    public static function requireSystemAdmin(array $user): void {
        self::requireRoles($user, ['admin']);
    }
}
