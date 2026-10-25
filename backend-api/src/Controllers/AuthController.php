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

        // Merge the user's existing group-scoped permissions with the separate
        // general-secretariat appointment. The latter never changes role_id.
        $permissions = [];
        if (in_array($profile['role_id'], ['servant', 'supervisor', 'secretariat'], true)) {
            $permRes = $client->query('servant_permissions?profile_id=eq.' . rawurlencode($user['user_id']) . '&select=permission_id');
            if (!empty($permRes['data']) && is_array($permRes['data'])) {
                $permissions = array_column($permRes['data'], 'permission_id');
            }
        } elseif ($profile['role_id'] === 'admin') {
            $permissions = ['MANAGE_LECTURES', 'MANAGE_CURRICULUM', 'MANAGE_MARATHON', 'GRADE_EXAMS', 'MANAGE_BOOKS'];
        }

        $secretariatRes = $client->query(
            'general_secretariat_members?profile_id=eq.' . rawurlencode($user['user_id']) . '&is_active=eq.true&select=profile_id'
        );
        $isGeneralSecretariat = !empty($secretariatRes['data']);
        if ($isGeneralSecretariat) {
            $generalPermRes = $client->query(
                'general_secretariat_permissions?profile_id=eq.' . rawurlencode($user['user_id']) . '&select=permission_id'
            );
            if (!empty($generalPermRes['data']) && is_array($generalPermRes['data'])) {
                $permissions = array_merge($permissions, array_column($generalPermRes['data'], 'permission_id'));
            }
        }
        $permissions = array_values(array_unique($permissions));

        Response::success([
            'user_id' => $profile['id'],
            'username' => $profile['username'],
            'full_name' => $profile['full_name'],
            'role' => $profile['role_id'],
            'group_id' => $profile['group_id'],
            'general_secretariat' => $isGeneralSecretariat,
            'permissions' => $permissions
        ], 'تم التحقق من الجلسة بنجاح');
    }
}
