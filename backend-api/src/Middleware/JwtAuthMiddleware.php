<?php
namespace App\Middleware;

use App\Utils\AppRoot;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\JWK;
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
            $claims = self::decodeAndVerifyClaims($jwt, $config);

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
        } catch (\Throwable $e) {
            // Fail closed on any invalid token, missing key, or signature mismatch.
            Response::error('رمز المصادقة غير صالح أو منتهي الصلاحية', 'INVALID_TOKEN', 401);
            exit;
        }
    }

    /**
     * Decodes and verifies JWT claims supporting both HS256 (symmetric secret) and
     * ES256 / RS256 (asymmetric keys via Supabase JWKS).
     */
    public static function decodeAndVerifyClaims(string $jwt, array $config): array {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            throw new \InvalidArgumentException('Malformed JWT structure');
        }

        $headerJson = base64_decode(strtr($parts[0], '-_', '+/'), true);
        if ($headerJson === false) {
            throw new \InvalidArgumentException('Invalid JWT header base64');
        }

        $header = json_decode($headerJson, true);
        if (!is_array($header) || empty($header['alg'])) {
            throw new \InvalidArgumentException('Missing JWT algorithm');
        }

        $alg = (string)$header['alg'];
        $decoded = null;

        if ($alg === 'HS256') {
            $secret = (string)($config['jwt_secret'] ?? '');
            if ($secret === '') {
                throw new \RuntimeException('JWT secret is not configured');
            }
            $decoded = JWT::decode($jwt, new Key($secret, 'HS256'));
        } elseif ($alg === 'ES256' || $alg === 'RS256') {
            $kid = (string)($header['kid'] ?? '');
            if ($kid === '') {
                throw new \InvalidArgumentException('Missing kid in asymmetric JWT header');
            }
            $supabaseUrl = (string)($config['url'] ?? '');
            $keys = self::resolveJwksKeys($supabaseUrl, $kid);
            if (!isset($keys[$kid])) {
                throw new \RuntimeException('Key ID not found in Supabase JWKS: ' . $kid);
            }
            $decoded = JWT::decode($jwt, $keys[$kid]);
        } else {
            throw new \InvalidArgumentException('Unsupported JWT algorithm: ' . $alg);
        }

        $claims = json_decode(json_encode($decoded), true);
        if (!is_array($claims)) {
            $claims = [];
        }
        return $claims;
    }

    /**
     * Fetches and caches Supabase JWKS public keys with disk caching.
     */
    private static function resolveJwksKeys(string $supabaseUrl, string $requiredKid): array {
        $cacheDir = AppRoot::path('storage/cache/jwks');
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0750, true);
        }
        $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'supabase_jwks.json';

        $cachedData = null;
        if (is_file($cacheFile)) {
            $content = @file_get_contents($cacheFile);
            if ($content !== false && $content !== '') {
                $cachedData = json_decode($content, true);
            }
        }

        $cacheValid = is_array($cachedData)
            && isset($cachedData['keys'])
            && (filemtime($cacheFile) > (time() - 86400));

        if ($cacheValid) {
            try {
                $keys = JWK::parseKeySet($cachedData);
                if (isset($keys[$requiredKid])) {
                    return $keys;
                }
            } catch (\Throwable $e) {
                // Cache invalid or parse failed; will refresh below
            }
        }

        // Fetch fresh JWKS from Supabase
        $jwksUrl = rtrim($supabaseUrl, '/') . '/auth/v1/.well-known/jwks.json';
        $freshData = null;

        if (function_exists('curl_init')) {
            $ch = curl_init($jwksUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 5,
                CURLOPT_CONNECTTIMEOUT => 3,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_HTTPHEADER => ['Accept: application/json'],
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($httpCode === 200 && is_string($response) && $response !== '') {
                $freshData = json_decode($response, true);
            }
        } else {
            $ctx = stream_context_create([
                'http' => [
                    'timeout' => 5,
                    'header' => "Accept: application/json\r\n",
                ],
            ]);
            $response = @file_get_contents($jwksUrl, false, $ctx);
            if (is_string($response) && $response !== '') {
                $freshData = json_decode($response, true);
            }
        }

        if (is_array($freshData) && !empty($freshData['keys'])) {
            @file_put_contents($cacheFile, json_encode($freshData));
            return JWK::parseKeySet($freshData);
        }

        if (is_array($cachedData) && !empty($cachedData['keys'])) {
            return JWK::parseKeySet($cachedData);
        }

        throw new \RuntimeException('Unable to fetch Supabase JWKS keys');
    }
}
