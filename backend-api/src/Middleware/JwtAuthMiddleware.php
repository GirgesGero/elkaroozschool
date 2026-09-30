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

                    // (array)$decoded is a SHALLOW cast: nested claims such as
                    // user_metadata stay stdClass objects, and reading
                    // $claims['user_metadata']['full_name'] then raises
                    // "Cannot use object of type stdClass as array" -- a fatal that
                    // `??` does NOT suppress. That killed every route which logs the
                    // actor name (backup/import/export/upload/delete).
                    // Round-tripping through JSON yields a deeply nested array,
                    // which is what all five call sites expect.
                    $claims = json_decode(json_encode($decoded), true);
                    if (!is_array($claims)) {
                        $claims = [];
                    }

                    return [
                        'user_id' => $claims['sub'] ?? null,
                        'role' => $claims['app_metadata']['role'] ?? ($claims['role'] ?? 'trainee'),
                        'group_id' => $claims['app_metadata']['group_id'] ?? null,
                        'email' => $claims['email'] ?? null,
                        'claims' => $claims
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
