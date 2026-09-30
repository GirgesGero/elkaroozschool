<?php
// backend-api/config/supabase.php
//
// PRODUCTION HARDENING (2026-09-30):
// Previously every value had an inline fallback, including a real anon key and
// the literal placeholder 'your-supabase-jwt-secret'. A misconfigured host then
// silently booted with a *guessable* JWT secret, which turns the auth layer into
// a no-op. Config now fails closed: a missing secret aborts the request instead
// of falling back. Set the variables in the Hostinger panel (or an env loader);
// they are never read from a committed file.

$required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET',
];

$missing = [];
foreach ($required as $name) {
    $value = getenv($name);
    if ($value === false || trim((string) $value) === '') {
        $missing[] = $name;
    }
}

if ($missing !== []) {
    // Never echo the values, only the names, so logs can't leak them.
    error_log('[EL KAROOZ] FATAL: missing required env: ' . implode(', ', $missing));
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => [
            'code' => 'CONFIG_MISSING',
            'message' => 'إعدادات السيرفر غير مكتملة. راجع مدير الملفات على الاستضافة.',
        ],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

return [
    'url' => (string) getenv('SUPABASE_URL'),
    'jwt_secret' => (string) getenv('SUPABASE_JWT_SECRET'),
    'service_role_key' => (string) getenv('SUPABASE_SERVICE_ROLE_KEY'),
    'anon_key' => (string) getenv('SUPABASE_ANON_KEY'),
];
