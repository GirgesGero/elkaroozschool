<?php
namespace App\Middleware;

use App\Utils\Response;

class GroupScopeMiddleware {
    public static function enforceGroupScope(array $user, int $targetGroupId): void {
        $role = $user['role'] ?? 'trainee';

        // Only the current system administrator has cross-group access.
        if ($role === 'admin') {
            return;
        }

        $userGroupId = (int)($user['group_id'] ?? 0);
        if ($userGroupId !== $targetGroupId) {
            Response::error('ممنوع: لا يمكنك الوصول أو تعديل بيانات فرقة دراسية أخرى', 'GROUP_SCOPE_VIOLATION', 403);
        }
    }
}
