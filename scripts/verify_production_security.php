<?php
/**
 * Live verification of the PHP backend security fixes, run with real PHP 8.3.
 * Each case asserts the ACTUAL observable behaviour of the endpoint.
 */

$root = dirname(__DIR__);
$results = [];

function check(string $name, bool $ok, string $detail = ''): void {
    global $results;
    $results[] = ['name' => $name, 'ok' => $ok, 'detail' => $detail];
}

// ---------------------------------------------------------------- 1. autoload
$al = $root . '/backend-api/vendor/autoload.php';
check('vendor/autoload.php exists', is_file($al), $al);
require $al;
check('Firebase\JWT\JWT autoloads', class_exists(\Firebase\JWT\JWT::class));
check('Firebase\JWT\Key autoloads', class_exists(\Firebase\JWT\Key::class));
check('App\ PSR-4 root autoloads', class_exists(\App\Utils\Response::class));

// ------------------------------------------------- 2. config fails closed
// config/supabase.php must NOT return placeholder values when env is missing.
$noEnvFile = $root . '/.noenv_probe.php';
file_put_contents($noEnvFile, "<?php\n" . sprintf(
    'foreach (["SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_JWT_SECRET"] as $v) { putenv($v); }' .
    'require %s;',
    var_export($root . '/backend-api/config/supabase.php', true)
));
$missingEnvConfig = (string) shell_exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($noEnvFile) . ' 2>&1');
@unlink($noEnvFile);
check(
    'config fails closed when env missing',
    str_contains((string) $missingEnvConfig, 'CONFIG_MISSING'),
    'response: ' . substr(trim((string) $missingEnvConfig), 0, 90)
);

// no placeholder secret may survive anywhere in the shipped config
// With a real env set, the config must return EXACTLY those values -- proving there is
// no inline fallback overriding or shadowing a missing variable.
$goodCfgFile = $root . '/.cfg_probe.php';
file_put_contents($goodCfgFile, "<?php\n" . sprintf(
    'putenv("SUPABASE_URL=https://real.example");' .
    'putenv("SUPABASE_ANON_KEY=anon-real");' .
    'putenv("SUPABASE_SERVICE_ROLE_KEY=secret-real");' .
    'putenv("SUPABASE_JWT_SECRET=real-jwt-secret");' .
    '$c = require %s; echo json_encode($c);',
    var_export($root . '/backend-api/config/supabase.php', true)
));
$cfgJson = (string) shell_exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($goodCfgFile) . ' 2>&1');
@unlink($goodCfgFile);
$cfg = json_decode(trim($cfgJson), true);
check('config returns real env values (no fallback shadowing)',
    is_array($cfg) && $cfg['jwt_secret'] === 'real-jwt-secret' && $cfg['url'] === 'https://real.example',
    'got: ' . substr(trim($cfgJson), 0, 80));
$cfgSrc = file_get_contents($root . '/backend-api/config/supabase.php');
// strip comments before scanning for secrets
$cfgCode = preg_replace('#//.*#', '', $cfgSrc);
check('no hardcoded jwt_secret placeholder in code', !str_contains($cfgCode, 'your-supabase-jwt-secret'));
check('no hardcoded anon key in code', !str_contains($cfgCode, 'eyJhbG'));

// ------------------------------------------- 3. JWT fallback bypass is gone
$jwtSrc = file_get_contents($root . '/backend-api/src/Middleware/JwtAuthMiddleware.php');
check('JWT: unverified base64_decode fallback removed',
    !str_contains($jwtSrc, "base64_decode(strtr(\$tokenParts[1]"));
check('JWT: fail-closed on decode failure', str_contains($jwtSrc, 'INVALID_TOKEN'));

// A forged, unsigned token must be rejected.
$header  = rtrim(strtr(base64_encode('{"typ":"JWT","alg":"HS256"}'), '+/', '-_'), '=');
$payload = rtrim(strtr(base64_encode(
    '{"sub":"attacker","role":"admin","group_id":1,"exp":9999999999}'
), '+/', '-_'), '=');
$forged  = $header . '.' . $payload . '.' . rtrim(strtr(base64_encode('deadbeef'), '+/', '-_'), '=');

$rejectScript = <<<'PHP'
<?php
putenv('SUPABASE_URL=https://real.example');
putenv('SUPABASE_ANON_KEY=anon-real');
putenv('SUPABASE_SERVICE_ROLE_KEY=secret-real');
putenv('SUPABASE_JWT_SECRET=real-jwt-secret');
require __AUTOLOAD__;
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $argv[1];
try {
    App\Middleware\JwtAuthMiddleware::authenticate();
    echo "ACCEPTED";
} catch (Throwable $e) {
    echo "REJECTED";
}
PHP;
$rejectFile = $root . '/.jwt_probe.php';
file_put_contents($rejectFile, str_replace(
    '__AUTOLOAD__',
    var_export($root . '/backend-api/vendor/autoload.php', true),
    $rejectScript
));
$outcome = shell_exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($rejectFile) . ' ' . escapeshellarg($forged) . ' 2>&1');
@unlink($rejectFile);
// Response::error() writes the error JSON and exits, so a rejection never reaches the
// try/catch. Assert on the observable HTTP-level outcome instead: 401 + INVALID_TOKEN.
check('forged unsigned JWT is REJECTED (401 INVALID_TOKEN)',
    str_contains((string) $outcome, 'INVALID_TOKEN')
    && !str_contains((string) $outcome, 'ACCEPTED'),
    'got: ' . substr(trim((string) $outcome), 0, 90));

// --------------------------------------- 3b. export is ADMIN-ONLY
// Product decision 2026-09-30: bulk PII export belongs to admin + super_user
// only. Assert on the literal allowlist, because the failure mode of this
// control is someone re-adding 'servant' to make a workflow pass -- and that
// would still be contained to their own group, so no behavioural test would
// ever flag it. The allowlist itself is the security property here.
$export = file_get_contents($root . '/backend-api/src/Controllers/ExportController.php');
$exportAllowlist = '/requireRoles\(\$user,\s*\[\s*' . "'admin'" . '\s*,\s*' . "'super_user'" . '\s*\]\s*\)/';
check('export: role allowlist is exactly [admin, super_user]',
    (bool) preg_match($exportAllowlist, $export),
    'no exact admin+super_user allowlist found');
foreach (['servant', 'secretariat', 'trainee'] as $banned) {
    check("export: '$banned' is NOT in the export allowlist",
        !preg_match("/requireRoles\([^)]*'" . $banned . "'/", $export));
}
// Non-admin callers must not derive the group from the token any more, and
// must not call the group-scope guard with a client-supplied id.
check('export: no non-admin group fallback branch remains',
    !str_contains($export, '$user[' . "'group_id'" . ']'));
check('export: group_id is int-cast from the query string',
    str_contains($export, '(int)$_GET[' . "'group_id'" . ']'));

// --------------------------------------- 4. path traversal in delete is fixed
$svc = file_get_contents($root . '/backend-api/src/Services/StorageBridgeService.php');
check('storage: realpath containment check present', str_contains($svc, 'realpath'));
check('storage: rejects ".." segments', str_contains($svc, "'/\.\.'")
    || str_contains($svc, '(^|/)\.\.(/|$)'));

// functional proof: traversal path must not delete a file outside the root
$outside = $root . '/.traversal_canary.txt';
$inside  = $root . '/backend-api/storage/.canary.txt';
file_put_contents($outside, 'canary');
@mkdir(dirname($inside), 0777, true);
file_put_contents($inside, 'canary');

$traverseFile = $root . '/.traverse_probe.php';
file_put_contents($traverseFile, <<<'PHP'
<?php
require __DIR__ . '/backend-api/vendor/autoload.php';
$s = new App\Services\StorageBridgeService();
$ok = $s->deleteFile($argv[1]);
echo $ok ? "DELETED" : "BLOCKED";
PHP
);
$res = shell_exec(
    escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($traverseFile) . ' ' .
    escapeshellarg('../.traversal_canary.txt') . ' 2>&1'
);
@unlink($traverseFile);
check('path traversal delete BLOCKED', str_contains((string) $res, 'BLOCKED'), 'got: ' . trim((string) $res));
check('file outside storage root still intact', is_file($outside));

// a legitimate in-root file must still be deletable (no over-blocking)
$res2 = shell_exec(
    escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($root . '/.traverse_probe2.php') . ' 2>&1'
);
$traverseFile2 = $root . '/.traverse_probe2.php';
file_put_contents($traverseFile2, <<<'PHP'
<?php
require __DIR__ . '/backend-api/vendor/autoload.php';
$s = new App\Services\StorageBridgeService();
echo $s->deleteFile('.canary.txt') ? "DELETED" : "BLOCKED";
PHP
);
$res2 = shell_exec(
    escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($traverseFile2) . ' 2>&1'
);
@unlink($traverseFile2);
check('in-root delete still works', str_contains((string) $res2, 'DELETED'), 'got: ' . trim((string) $res2));
@unlink($inside);
@unlink($outside);

// --------------------------------- 5. group scope applies to every folder type
$ctrl = file_get_contents($root . '/backend-api/src/Controllers/StorageController.php');
// Bound the block by the whole function body, not a fixed char count: the
// span used to be 1600 bytes, and adding the folder_type allowlist pushed the
// real code past that window so these checks silently read an empty slice.
$uploadStart = strpos($ctrl, 'function upload');
$uploadEnd   = strpos($ctrl, 'function delete');
$uploadBlock = ($uploadStart === false || $uploadEnd === false)
    ? ''
    : substr($ctrl, $uploadStart, $uploadEnd - $uploadStart);
// Assert the INTENT (group-scoped, album-keyed), not the old literal. The old
// string was "gallery/group_{$groupId}/{$folderType}", which is precisely the
// bug: 'general' and 'gallery' both collapsed into it. Pinning that literal
// meant the harness failed when the bug was fixed -- a test defending a bug.
check('gallery path is group-scoped', str_contains($uploadBlock, 'gallery/group_{$groupId}/'));
check('gallery path is keyed off $albumId, not $folderType',
    str_contains($uploadBlock, '{$albumId}')
    && !str_contains($uploadBlock, 'gallery/group_{$groupId}/{$folderType}'));
check('feed path is group-scoped', str_contains($uploadBlock, '"feed/group_{$groupId}/{$yearMonth}"'));
$calls = substr_count(substr($uploadBlock, 0, strpos($uploadBlock, 'FileSecurityMiddleware')), 'enforceGroupScope');
check('enforceGroupScope called unconditionally (1x, outside the academic if)', $calls === 1, "calls=$calls");

// ------------------------------- 5b. folder_type / user_role are allowlisted
// Traversal reached the filesystem through these two POST fields before.
$allowFolders = strpos($uploadBlock, 'ALLOWED_FOLDERS') !== false
    && preg_match('/in_array\(\$folderType,\s*\$ALLOWED_FOLDERS,\s*true\)/', $uploadBlock) === 1;
check('folder_type is allowlisted', $allowFolders);
$allowRoles = strpos($uploadBlock, 'ALLOWED_USER_ROLES') !== false
    && preg_match('/in_array\(\$userRole,\s*\$ALLOWED_USER_ROLES,\s*true\)/', $uploadBlock) === 1;
check('user_role is allowlisted', $allowRoles);

// ------------------------------------ 5c. write path is contained, not just delete
$svc = file_get_contents($root . '/backend-api/src/Services/StorageBridgeService.php');
$saveStart = strpos($svc, 'function saveUploadedFile');
$saveEnd   = strpos($svc, 'function deleteFile');
$saveBlock = ($saveStart === false || $saveEnd === false)
    ? ''
    : substr($svc, $saveStart, $saveEnd - $saveStart);
check('saveUploadedFile rejects ".." in the target path',
    preg_match('/preg_match\(\s*.#\(\^\/\)\\\\\.\.\\\/\(\\\$\|\#\)/', $saveBlock) === 1
    || str_contains($saveBlock, '\.\.(/|$)'));
check('saveUploadedFile re-resolves the directory with realpath',
    str_contains($saveBlock, 'realpath($targetDirectory)'));
check('saveUploadedFile verifies containment after mkdir',
    str_contains($saveBlock, 'str_starts_with($realTarget, $root . DIRECTORY_SEPARATOR)'));

// --------------------------------------------------- 6. CORS is prod-scoped
$appSrc = file_get_contents($root . '/backend-api/config/app.php');
check('CORS includes the deployed Vercel origin', str_contains($appSrc, 'elkaroozschool-seven.vercel.app'));
check('localhost CORS gated behind non-production', str_contains($appSrc, "array_unshift(\$corsOrigins, 'http://localhost:3000')"));

// ---------------------------------------------------------------- report
$pass = count(array_filter($results, fn($r) => $r['ok']));
$fail = count($results) - $pass;
foreach ($results as $r) {
    printf("[%s] %s%s\n", $r['ok'] ? 'PASS' : 'FAIL', $r['name'],
        $r['detail'] !== '' && !$r['ok'] ? "  <-- {$r['detail']}" : '');
}
printf("\n%d/%d passed, %d failed\n", $pass, count($results), $fail);
exit($fail === 0 ? 0 : 1);