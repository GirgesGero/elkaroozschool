<?php
namespace App\Middleware;

use App\Utils\AppRoot;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Utils\Response;
use App\Services\ResetAccessGate;

class JwtAuthMiddleware {
    public static function extractBearerToken(): ?string {
        $allHeaders = function_exists('getallheaders') ? getallheaders() : [];
        $authHeader = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_REDIRECT_HTTP_AUTHORIZATION']
            ?? $_SERVER['HTTP_X_AUTHORIZATION']
            ?? $allHeaders['Authorization']
            ?? $allHeaders['authorization']
            ?? $allHeaders['X-Authorization']
            ?? $allHeaders['x-authorization']
            ?? '';

        if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            return $matches[1];
        }
        return null;
    }

    public static function authenticate(?callable $profileResolver = null): array {
        // Shared hosts (Hostinger runs LiteSpeed) strip the Authorization header from
        // $_SERVER unless the vhost sets `CGIPassAuth On`. Every authenticated route then
        // answers UNAUTHORIZED no matter what token the client sent -- which is
        // indistinguishable, from the outside, from "the user is not logged in".
        //
        // Apache passes it through REDIRECT_HTTP_AUTHORIZATION when a rewrite has already
        // run, and some FastCGI setups expose it as HTTP_AUTHORIZATION only after a
        // rewrite. All fallbacks are checked in extractBearerToken().
        $jwt = self::extractBearerToken();
        if (!$jwt) {
            Response::error('المصادقة مطلوبة: التوكن غير موجود', 'UNAUTHORIZED', 401);
        }
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

                    // Resolve mutable authorization state from the database on
                    // every API request. A still-valid JWT may contain the old
                    // admin claim immediately after a transfer; never trust that
                    // stale claim for PHP endpoints backed by service-role calls.
                    $userId = (string) ($claims['sub'] ?? '');
                    if ($userId === '') {
                        Response::error('رمز المصادقة لا يحتوي على هوية مستخدم صالحة', 'INVALID_TOKEN', 401);
                    }
                    if ($profileResolver !== null) {
                        // Explicit seam for deterministic authorization tests.
                        $profile = $profileResolver($userId);
                    } else {
                        $profileRes = (new \App\Services\SupabaseClient())->query(
                            'profiles?id=eq.' . rawurlencode($userId) . '&select=id,role_id,group_id,is_active,deleted_at'
                        );
                        if (($profileRes['status'] ?? 0) !== 200) {
                            Response::error('تعذر التحقق من صلاحيات الحساب حاليًا', 'AUTHORIZATION_STATE_UNAVAILABLE', 503);
                        }
                        $profile = $profileRes['data'][0] ?? null;
                    }
                    if (!$profile || ($profile['deleted_at'] ?? null) !== null) {
                        Response::error('الحساب غير موجود أو لم يعد نشطًا', 'ACCOUNT_UNAVAILABLE', 401);
                    }
                    if (($profile['is_active'] ?? false) !== true) {
                        Response::error('الحساب موقوف. راجع إدارة المدرسة.', 'ACCOUNT_SUSPENDED', 403);
                    }
                    $claims['app_metadata'] = is_array($claims['app_metadata'] ?? null)
                        ? $claims['app_metadata'] : [];
                    $claims['app_metadata']['role'] = $profile['role_id'];
                    $claims['app_metadata']['group_id'] = $profile['group_id'];
                    $claims['app_metadata']['is_active'] = true;

                    $storageConfig = require AppRoot::path('config/storage.php');
                    $cutoffFile = rtrim((string) $storageConfig['root_path'], '/\\\\')
                        . DIRECTORY_SEPARATOR . 'system_reset' . DIRECTORY_SEPARATOR . 'auth-cutoff.json';
                    $requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH) ?: '';
                    $resetDecision = (new ResetAccessGate($cutoffFile))->decision($claims, $requestPath);
                    if ($resetDecision !== null) {
                        $status = $resetDecision === 'RESET_STATE_INVALID' ? 503
                            : ($resetDecision === 'RESET_IN_PROGRESS' ? 423 : 401);
                        Response::error(
                            $resetDecision === 'RESET_IN_PROGRESS'
                                ? 'إعادة ضبط النظام جارية؛ أعد المحاولة بعد انتهائها.'
                                : 'انتهت صلاحية الجلسة لهذا الإجراء. سجّل الدخول مجددًا.',
                            $resetDecision,
                            $status
                        );
                    }

                    // A suspended account keeps a cryptographically valid token
                    // until it expires. Supabase does not revoke access tokens on
                    // suspension, so without this check a disabled user stays
                    // operational for the remainder of the token lifetime.
                    // app_metadata.is_active is mirrored from profiles.is_active by
                    // migration 20261001130000_backfill_app_metadata_from_profiles.
                    $isActive = $claims['app_metadata']['is_active'] ?? true;
                    if ($isActive === false || $isActive === 'false' || $isActive === 0) {
                        Response::error(
                            'الحساب موقوف. راجع إدارة المدرسة.',
                            'ACCOUNT_SUSPENDED',
                            403
                        );
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
