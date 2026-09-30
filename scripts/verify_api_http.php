<?php
// Boots the real front controller under the PHP built-in web server and exercises
// the endpoints the deployment checklist depends on. Run with real PHP 8.3.

$root = dirname(__DIR__);
$be   = $root . '/backend-api';

$putenv = '';
foreach ([
    'SUPABASE_URL'            => 'https://kgqgnqjkrghvktymbimz.supabase.co',
    'SUPABASE_ANON_KEY'       => 'sb_publishable_test',
    'SUPABASE_SERVICE_ROLE_KEY' => 'sb_secret_test',
    'SUPABASE_JWT_SECRET'     => 'test-jwt-secret-not-real',
    'APP_ENV'                 => 'production',
    'APP_DEBUG'               => 'false',
    'APP_URL'                 => 'https://elkaroozschool.is-best.net',
] as $k => $v) {
    putenv("$k=$v");
}

$port = (int)($argv[1] ?? 8391);
$docroot = $be . '/public';

$logFile = $root . '/.php_server.log';
@unlink($logFile);
// Detach fully: the built-in server must not inherit this process's stdio, otherwise the
// caller blocks waiting for the pipe to close. Redirect every stream to a file.
$cmd = escapeshellarg(PHP_BINARY)
    . ' -S 127.0.0.1:' . $port
    . ' -t ' . escapeshellarg($docroot)
    . ' < NUL > ' . escapeshellarg($logFile) . ' 2>&1';
pclose(popen('start /B "" ' . $cmd, 'r'));

// Poll until the port answers instead of sleeping a fixed amount.
$ready = false;
for ($i = 0; $i < 60; $i++) {
    $sock = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.25);
    if ($sock) { fclose($sock); $ready = true; break; }
    usleep(250_000);
}
if (!$ready) {
    fwrite(STDERR, "FATAL: built-in server never bound to port $port\n");
    fwrite(STDERR, (string) @file_get_contents($logFile));
    exit(1);
}

$base = "http://127.0.0.1:$port";
$results = [];
function req(string $label, string $path, array $opts = []): void {
    global $base, $results;
    $ch = curl_init($base . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $opts['method'] ?? 'GET',
        CURLOPT_HEADER         => true,
        CURLOPT_TIMEOUT        => 15,
    ]);
    if (isset($opts['origin']))  { curl_setopt($ch, CURLOPT_HTTPHEADER, ['Origin: ' . $opts['origin']]); }
    if (isset($opts['json']))    { curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($opts['json']));
                                   curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge(
                                       $opts['headers'] ?? [], ['Content-Type: application/json'])); }
    if (isset($opts['headers'])) { curl_setopt($ch, CURLOPT_HTTPHEADER, $opts['headers']); }
    $raw = (string) curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $hsize  = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);
    $headers = substr($raw, 0, $hsize);
    $body    = substr($raw, $hsize);
    $results[$label] = ['status' => $status, 'headers' => $headers, 'body' => $body];
    printf("[%s] %s -> HTTP %d\n", 'INFO', $label, $status);
}

function expect(string $label, int $wantStatus, ?string $bodyMustContain = null, ?string $headerMustContain = null): void {
    global $results;
    $r = $results[$label] ?? null;
    if (!$r) { printf("[FAIL] %s (no result)\n", $label); return; }
    $ok = $r['status'] === $wantStatus;
    $why = [];
    if (!$ok) $why[] = "status {$r['status']} != $wantStatus";
    if ($bodyMustContain !== null && !str_contains($r['body'], $bodyMustContain)) {
        $ok = false; $why[] = 'body missing "' . $bodyMustContain . '"';
    }
    if ($headerMustContain !== null && !str_contains($r['headers'], $headerMustContain)) {
        $ok = false; $why[] = 'header missing "' . $headerMustContain . '"';
    }
    printf("[%s] %s%s\n", $ok ? 'PASS' : 'FAIL', $label, $ok ? '' : '  <-- ' . implode('; ', $why));
}

// ---- 1. health -------------------------------------------------------------
req('health', '/health');
expect('health', 200, 'ONLINE');

// The health payload must never echo configuration or secrets.
$healthBody = $results['health']['body'];
$leaks = preg_grep(
    '/jwt_secret|service_role|sb_secret_|eyJhbG|SUPABASE_/i',
    [$healthBody]
);
printf("[%s] health payload leaks no secrets\n", empty($leaks) ? 'PASS' : 'FAIL');

// ---- 2. CORS: production origin allowed, foreign origin refused --------------
req('cors_allowed', '/health', ['origin' => 'https://elkaroozschool-seven.vercel.app']);
expect('cors_allowed', 200, null, 'Access-Control-Allow-Origin: https://elkaroozschool-seven.vercel.app');

req('cors_foreign', '/health', ['origin' => 'https://evil.example.com']);
$foreignLeak = str_contains($results['cors_foreign']['headers'], 'https://evil.example.com');
printf("[%s] cors_foreign does not echo an untrusted origin\n", $foreignLeak ? 'FAIL' : 'PASS');

// localhost must NOT be trusted in production
req('cors_localhost_prod', '/health', ['origin' => 'http://localhost:3000']);
$leakLocal = str_contains($results['cors_localhost_prod']['headers'], 'http://localhost:3000');
printf("[%s] localhost NOT trusted when APP_ENV=production\n", $leakLocal ? 'FAIL' : 'PASS');

// ---- 3. unauthenticated access to a protected route -------------------------
req('backup_noauth', '/backup/list');
expect('backup_noauth', 401, 'UNAUTHORIZED');

req('export_noauth', '/export/data');
expect('export_noauth', 401, 'UNAUTHORIZED');

req('storage_noauth', '/storage/upload', ['method' => 'POST', 'json' => []]);
expect('storage_noauth', 401, 'UNAUTHORIZED');

// ---- 4. FORGED token must not be accepted -----------------------------------
$b64 = fn(array $a) => rtrim(strtr(base64_encode(json_encode($a)), '+/', '-_'), '=');
$forged = $b64(['typ'=>'JWT','alg'=>'HS256'])
    . '.' . $b64(['sub'=>'attacker','role'=>'admin','group_id'=>1,'exp'=>PHP_INT_MAX])
    . '.' . rtrim(strtr(base64_encode('forged'), '+/', '-_'), '=');

req('forged_superuser', '/backup/list', ['headers' => ['Authorization: Bearer ' . $forged]]);
expect('forged_superuser', 401, 'INVALID_TOKEN');

// A token signed with the WRONG secret must also be refused.
require_once $root . '/backend-api/vendor/autoload.php';
$wrongSecret = \Firebase\JWT\JWT::encode(
    ['sub'=>'attacker2','role'=>'super_user','group_id'=>1,'exp'=>PHP_INT_MAX,'iat'=>time()],
    'totally-the-wrong-secret', 'HS256'
);
req('wrong_secret_token', '/backup/list', ['headers' => ['Authorization: Bearer ' . $wrongSecret]]);
expect('wrong_secret_token', 401, 'INVALID_TOKEN');

// A token signed with the CONFIGURED secret is accepted (proves the check is real,
// not just "everything is denied").
$valid = \Firebase\JWT\JWT::encode(
    ['sub'=>'11111111-2222-3333-4444-555555555555','role'=>'super_user','group_id'=>1,
     'email'=>'t@example.com','exp'=>time()+3600,'iat'=>time()],
    'test-jwt-secret-not-real', 'HS256'
);
req('valid_token', '/backup/list', ['headers' => ['Authorization: Bearer ' . $valid]]);
$body = $results['valid_token']['body'];
$notAuthErr = !str_contains($body, 'UNAUTHORIZED') && !str_contains($body, 'INVALID_TOKEN');
printf("[%s] valid signed token passes auth (reaches the handler, HTTP %d)\n",
    $notAuthErr ? 'PASS' : 'FAIL', $results['valid_token']['status']);

// ---- 5. unknown route -------------------------------------------------------
req('unknown', '/nope');
expect('unknown', 404, 'ROUTE_NOT_FOUND');

// ---- 6. path traversal attempt through the delete API ----------------------
req('traversal', '/storage/delete', [
    'method' => 'POST',
    'headers' => ['Authorization: Bearer ' . $valid],
    'json' => ['file_path' => '../../config/supabase.php'],
]);
// A real target that must survive the attack: a file inside config/, one level above
// the storage root, reachable only by escaping via "../".
$canary = $root . '/backend-api/config/.traversal_canary.txt';
file_put_contents($canary, 'x');
$inRoot = $root . '/backend-api/storage/.deletable_canary.txt';
file_put_contents($inRoot, 'x');

foreach ([
    'traversal_dotdot'   => '../config/.traversal_canary.txt',
    'traversal_absolute' => (string) $canary,
    'traversal_nullbyte' => "../config/.traversal_canary.txt\0.png",
] as $label => $path) {
    req($label, '/storage/delete', [
        'method' => 'POST',
        'headers' => ['Authorization: Bearer ' . $valid],
        'json' => ['file_path' => $path],
    ]);
    $r = $results[$label];
    $rejected = $r['status'] === 404
        && str_contains($r['body'], 'DELETE_FAILED')
        && !str_contains($r['body'], '"status": "success"');
    printf("[%s] %s rejected (HTTP %d, DELETE_FAILED) and target intact=%s\n",
        $rejected && is_file($canary) ? 'PASS' : 'FAIL',
        $label, $r['status'], is_file($canary) ? 'yes' : 'NO - DELETED');
}

// Guard against over-blocking: a legitimate in-root file is still removable.
req('delete_in_root', '/storage/delete', [
    'method' => 'POST',
    'headers' => ['Authorization: Bearer ' . $valid],
    'json' => ['file_path' => '.deletable_canary.txt'],
]);
$inRootGone = !is_file($inRoot);
printf("[%s] legitimate in-root delete still works (HTTP %d)\n",
    $inRootGone ? 'PASS' : 'FAIL', $results['delete_in_root']['status']);

@unlink($canary);
@unlink($inRoot);

// Stop the detached built-in server by looking up whatever PID owns the port.
$netstat = (string) shell_exec('netstat -ano | findstr "' . $port . '"');
if (preg_match('/LISTENING\s+(\d+)/', $netstat, $m)) {
    shell_exec('taskkill /F /PID ' . (int) $m[1] . ' >NUL 2>&1');
}
usleep(300_000);

print("\n--- server log tail ---\n");
print implode("\n", array_slice(explode("\n", (string) @file_get_contents($root . '/.php_server.log')), -6));
@unlink($root . '/.php_server.log');
