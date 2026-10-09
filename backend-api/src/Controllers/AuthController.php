<?php
namespace App\Controllers;

use App\Middleware\JwtAuthMiddleware;
use App\Services\SupabaseClient;
use App\Utils\Response;

class AuthController {
    public function verifySession(): void {
        $user = JwtAuthMiddleware::authenticate();
        $client = new SupabaseClient();

        // Query user profile and permissions from Supabase
        $profileRes = $client->query('profiles?id=eq.' . $user['user_id'] . '&select=*,groups(*),roles(*)');
        $profile = $profileRes['data'][0] ?? null;

        if (!$profile) {
            Response::error('الملف الشخصي للمستخدم غير موجود', 'PROFILE_NOT_FOUND', 404);
        }

        // Fetch delegated permissions if servant
        $permissions = [];
        if ($profile['role_id'] === 'servant') {
            $permRes = $client->query('servant_permissions?profile_id=eq.' . $user['user_id'] . '&select=permission_id');
            if (!empty($permRes['data'])) {
                $permissions = array_column($permRes['data'], 'permission_id');
            }
        } elseif (in_array($profile['role_id'], ['admin', 'super_user'])) {
            $permissions = ['MANAGE_LECTURES', 'MANAGE_CURRICULUM', 'MANAGE_MARATHON', 'GRADE_EXAMS', 'MANAGE_BOOKS'];
        }

        Response::success([
            'user_id' => $profile['id'],
            'username' => $profile['username'],
            'full_name' => $profile['full_name'],
            'role' => $profile['role_id'],
            'group_id' => $profile['group_id'],
            'permissions' => $permissions
        ], 'تم التحقق من الجلسة بنجاح');
    }
}
