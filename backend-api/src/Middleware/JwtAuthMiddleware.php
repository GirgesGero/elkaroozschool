<?php
namespace App\Middleware;

use App\Utils\AppRoot;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Utils\Response;

class JwtAuthMiddleware {
    public static function authenticate(): array {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        
        if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            Response::error('المصادقة مطلوبة: التوكن غير موجود', 'UNAUTHORIZED', 401);
        }

        $jwt = $matches[1];
        $config = require AppRoot::path('config/supabase.php');

        try {
            // Note: If using HS256 secret verification
            $decoded = JWT::decode($jwt, new Key($config['jwt_secret'], 'HS256'));
            
            return [
                'user_id' => $decoded->sub ?? null,
                'role' => $decoded->app_metadata->role ?? ($decoded->role ?? 'trainee'),
                'group_id' => $decoded->app_metadata->group_id ?? null,
                'email' => $decoded->email ?? null,
                'claims' => (array)$decoded
            ];
        } catch (\Exception $e) {
            // NEVER fall back to unverified decoding. Supabase signs access
            // tokens with RS256/ES256, not the HS256 secret used above, so
            // this branch used to accept ANY self-crafted token and hand the
            // caller an arbitrary role/group. Fail closed instead.
            Response::error('رمز المصادقة غير صالح أو منتهي الصلاحية', 'INVALID_TOKEN', 401);
            exit;
        }
    }
}
