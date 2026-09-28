<?php
namespace App\Middleware;

use App\Utils\Response;

class GroupScopeMiddleware {
    public static function enforceGroupScope(array $user, int $targetGroupId): void {
        $role = $user['role'] ?? 'trainee';

        // Admin & Super User bypass group isolation
        if ($role === 'admin' || $role === 'super_user') {
            return;
        }

        $userGroupId = (int)($user['group_id'] ?? 0);
        if ($userGroupId !== $targetGroupId) {
            Response::error('ممنوع: لا يمكنك الوصول أو تعديل بيانات فرقة دراسية أخرى', 'GROUP_SCOPE_VIOLATION', 403);
        }
    }
}
