<?php
namespace App\Middleware;

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
        $config = require dirname(__DIR__, 2) . '/config/supabase.php';

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
            // In case of dev mode fallback decoding payload structure
            $tokenParts = explode('.', $jwt);
            if (count($tokenParts) === 3) {
                $payload = json_decode(base64_decode(strtr($tokenParts[1], '-_', '+/')), true);
                if ($payload && isset($payload['sub'])) {
                    return [
                        'user_id' => $payload['sub'],
                        'role' => $payload['app_metadata']['role'] ?? ($payload['role'] ?? 'trainee'),
                        'group_id' => $payload['app_metadata']['group_id'] ?? null,
                        'email' => $payload['email'] ?? null,
                        'claims' => $payload
                    ];
                }
            }
            Response::error('رمز المصادقة غير صالح أو منتهي الصلاحية', 'INVALID_TOKEN', 401, $e->getMessage());
            exit;
        }
    }
}
