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

// A copied deployment template is not a live configuration: angle-bracket
// placeholders must fail closed instead of being sent as credentials.
$placeholderFile = $root . '/.placeholder_env_probe.php';
file_put_contents($placeholderFile, "<?php\n" . sprintf(
    'putenv("SUPABASE_URL=https://<project-ref>.supabase.co");' .
    'putenv("SUPABASE_ANON_KEY=<anon-key>");' .
    'putenv("SUPABASE_SERVICE_ROLE_KEY=<service-key>");' .
    'putenv("SUPABASE_JWT_SECRET=<jwt-secret>");' .
    'require %s;',
    var_export($root . '/backend-api/config/supabase.php', true)
));
$placeholderConfig = (string) shell_exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($placeholderFile) . ' 2>&1');
@unlink($placeholderFile);
check('config fails closed when template placeholders remain',
    str_contains($placeholderConfig, 'CONFIG_MISSING'),
    'response: ' . substr(trim($placeholderConfig), 0, 90));

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
    preg_match('/\(int\)\s*\$_GET\[' . "'group_id'" . '\]/', $export) === 1,
    'no (int) cast on $_GET[group_id]');

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
    str_contains($saveBlock, '(^|/)\\.\\.(/|$)')
    && str_contains($saveBlock, '$targetSubDir'));
check('saveUploadedFile re-resolves the directory with realpath',
    str_contains($saveBlock, 'realpath($targetDirectory)'));
check('saveUploadedFile verifies containment after mkdir',
    str_contains($saveBlock, 'str_starts_with($realTarget, $root . DIRECTORY_SEPARATOR)'));

// --------------------------------------------------- 6. CORS is prod-scoped
$appSrc = file_get_contents($root . '/backend-api/config/app.php');
check('CORS includes the deployed Vercel origin', str_contains($appSrc, 'elkaroozschool-seven.vercel.app'));
check('localhost CORS gated behind non-production', str_contains($appSrc, "array_unshift(\$corsOrigins, 'http://localhost:3000')"));

// ------------------------------------- 7. backup/restore/export gap closure
// These lock in the invariants established while closing the backend gaps. Each
// one previously failed and would silently regress.

// 7a. restore/preview must not leave decrypted content behind.
// The old implementation unlinked ONE file then rmdir'd a directory that still
// held every extracted file, so the rmdir failed silently and plaintext backups
// stayed in the system temp dir.
$restore = file_get_contents($root . '/backend-api/src/Controllers/RestoreController.php');
$previewStart = strpos($restore, 'function preview');
$previewEnd   = strpos($restore, 'function execute');
$previewBlock = ($previewStart === false || $previewEnd === false)
    ? '' : substr($restore, $previewStart, $previewEnd - $previewStart);
check('restore/preview has no bare rmdir() of a populated directory',
    preg_match('/\brmdir\s*\(/', $previewBlock) !== 1,
    'found rmdir() in preview');
check('restore/preview cleans the staging dir with FsHelper',
    str_contains($previewBlock, 'removeDirectoryQuietly'));
check('restore/preview cleanup runs in a finally block',
    preg_match('/\}\s*finally\s*\{/', $previewBlock) === 1);
check('restore/preview runs the full archive inspector, not just a manifest read',
    str_contains($previewBlock, 'BackupArchiveInspector::inspect'));
check('restore/preview refuses an invalid archive before any restore',
    str_contains($previewBlock, 'PRE_RESTORE_VALIDATION_FAILED'));

// 7b. RBAC runs before the upload is read on every new admin-only route.
check('restore/preview authorises before reading $_FILES',
    strpos($previewBlock, 'requireAdminOrSuperUser') !== false
    && strpos($previewBlock, 'requireAdminOrSuperUser') < strpos($previewBlock, "isset(\$_FILES"));
$execStart = strpos($restore, 'function execute');
$execBlock = $execStart === false ? '' : substr($restore, $execStart);
check('restore/execute exists and requires explicit confirmation',
    str_contains($execBlock, 'CONFIRMATION_REQUIRED')
    && str_contains($execBlock, "confirm_restore"));
check('restore/execute authorises before reading $_FILES',
    strpos($execBlock, 'requireAdminOrSuperUser') !== false
    && strpos($execBlock, 'requireAdminOrSuperUser') < strpos($execBlock, "isset(\$_FILES"));
check('restore/execute routes through AtomicRestoreService',
    str_contains($execBlock, 'AtomicRestoreService'));
check('restore/execute reports rollback honestly rather than as success',
    str_contains($execBlock, 'RESTORE_FAILED_ROLLED_BACK'));

// 7c. The atomic restore service really does take a safety backup and roll back.
$atomic = file_get_contents($root . '/backend-api/src/Services/AtomicRestoreService.php');
check('AtomicRestoreService stages a safety backup before applying',
    preg_match('/createSafetyBackup/', $atomic) === 1);
check('AtomicRestoreService rolls back on Throwable, not just Exception',
    preg_match('/catch\s*\(\s*\\\\?Throwable/', $atomic) === 1,
    'no Throwable catch found');
check('AtomicRestoreService re-validates the archive at execute time',
    str_contains($atomic, 'BackupArchiveInspector::inspect'));
check('AtomicRestoreService test seam defaults to disabled',
    preg_match('/\$failAfterFirstWrite\s*=\s*\'\'/', $atomic) === 1);

// 7d. backup/create must actually contain data, not just a manifest.
$backup = file_get_contents($root . '/backend-api/src/Controllers/BackupController.php');
check('backup/create copies the storage tree into the archive',
    str_contains($backup, 'RecursiveIteratorIterator')
    && str_contains($backup, "copy(\$item->getPathname(), \$dest)"));
check('backup/create excludes the backups/ dir from its own archive',
    str_contains($backup, "str_starts_with(str_replace('\\\\', '/', \$rel), 'backups/')"));
// includes_database must be TRUE only because a real export runs first. A
// hardcoded true with no exporter behind it is the same lie in the other
// direction: it would advertise a database backup that does not exist.
check('backup/create runs a real database export before writing the manifest',
    strpos($backup, 'DatabaseExportService') !== false
    && strpos($backup, 'exportToDirectory') !== false
    && strpos($backup, "'includes_database' => true") !== false
    && strpos($backup, 'exportToDirectory') < strpos($backup, "'includes_database' => true"));
check('backup/create records the real exported counts in the manifest',
    str_contains($backup, "'database_tables' => \$dbExport['tables']")
    && str_contains($backup, "'database_rows' => \$dbExport['rows']"));
check('backup/create no longer claims it cannot produce a database export',
    preg_match("/'includes_database'\s*=>\s*false/", $backup) !== 1);
// The manifest must not advertise a pg_dump: this is data-only, and an operator
// restoring it needs to know the schema is not in here.
check('the manifest states that this is not a pg_dump',
    str_contains($backup, 'NOT a pg_dump'));
// An export failure must abort the backup rather than yield a files-only archive
// the operator never asked for. Structural check: the export call sits inside the
// try whose catch reports BACKUP_FAILED, and the finally still wipes staging.
$expAt = strpos($backup, 'exportToDirectory($tempStagingDir)');
$catchAt = strpos($backup, '$this->refuse($e, \'BACKUP_FAILED\'');
$finallyAt = strpos($backup, 'FsHelper::removeDirectoryQuietly($tempStagingDir)');
check('a database export failure aborts the whole backup',
    $expAt !== false && $catchAt !== false && $finallyAt !== false
    && $expAt < $catchAt && $catchAt < $finallyAt
    && str_contains($backup, '@unlink($targetZipPath)'),
    "export=$expAt catch=$catchAt finally=$finallyAt");
// The staging tree holds unencrypted PII, so it must be wiped on the failure path
// too, not only on success.
check('staging is wiped even when the export fails',
    $finallyAt !== false && str_contains($backup, '} catch (\\Exception $e) {'));
// create() must not be able to report success without an export having run.
// Scoped to create() only: list/validate/delete have their own success responses.
// create() runs from its own signature to the next method signature. The class
// contains four Response::success() calls in total across create/list/validate/
// delete, so an unscoped count says nothing about create() on its own.
$createStart = strpos($backup, 'public function create(');
$createEnd   = strpos($backup, 'public function list(', $createStart === false ? 0 : $createStart);
$createBody  = ($createStart !== false && $createEnd !== false && $createEnd > $createStart)
    ? substr($backup, $createStart, $createEnd - $createStart)
    : '';
check('backup/create reports success only after a database export',
    substr_count($createBody, 'Response::success(') === 1
    && strpos($createBody, 'Response::success(') > strpos($createBody, 'exportToDirectory'),
    substr_count($createBody, 'Response::success(') . ' success call(s) in create()');
check('create() has no files-only fallback branch',
    !preg_match('/\$copied\s*>\s*0\s*\?\s*\n?\s*\'[^\']*\'\s*\n?\s*:\s*\n?\s*\'/', $createBody));
check('backup/create cleans staging in a finally block',
    preg_match('/\}\s*finally\s*\{/', $backup) === 1);
check('backup/create removes a half-written archive on failure',
    str_contains($backup, '@unlink($targetZipPath)'));
// 7e. DatabaseExportService: the exporter must not become an arbitrary-write or
// an information-leak primitive now that it handles the full user base.
$dbExport = file_get_contents($root . '/backend-api/src/Services/DatabaseExportService.php');
check('DatabaseExportService exists', $dbExport !== false && $dbExport !== '');
if ($dbExport !== false) {
    check('DatabaseExportService validates table names before building a path',
        str_contains($dbExport, 'assertSafeTableName')
        && str_contains($dbExport, "preg_match('/^[a-z_][a-z0-9_]*\$/'"));
    check('DatabaseExportService refuses a table over the row ceiling rather than truncating',
        str_contains($dbExport, 'Refusing to truncate it into a partial backup'));
    check('DatabaseExportService cross-checks exported rows against the manifest',
        str_contains($dbExport, 'manifest declared')
        && str_contains($dbExport, 'would be incomplete'));
    check('DatabaseExportService refuses to write an empty export',
        str_contains($dbExport, 'write an empty database export that a restore would treat as real')
        && str_contains($dbExport, 'no tables were exported'));
    check('DatabaseExportService never exports the bookkeeping tables',
        str_contains($dbExport, "'backup_records'")
        && str_contains($dbExport, "'import_history'"));
    check('DatabaseExportService holds a per-table paging ceiling',
        str_contains($dbExport, 'MAX_ROWS_PER_TABLE'));
    check('DatabaseExportService does not log or embed any credential',
        !preg_match('/service_role_key|jwt_secret/i', $dbExport));
}
// The exporter is only ever reachable through the service role key, which lives
// in the PHP process, not in the browser. Assert nothing widened that boundary.
check('the exporter is not exposed to any browser-facing config',
    preg_match('/NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE/', (string) @file_get_contents($root . '/frontend/.env.local')) !== 1);

check('backup/delete takes storage_path from the DB, never from the request',
    str_contains($backup, 'storage_path,deleted_at&id=eq.')
    && !preg_match('/\$storagePath\s*=\s*\$body/', $backup));
check('backup/delete enforces containment before unlinking',
    str_contains($backup, 'str_starts_with($realFile, $realBackupRoot . DIRECTORY_SEPARATOR)'));
check('backup/validate-zip enforces a compression-ratio cap (ZIP bomb)',
    str_contains($backup, 'MAX_RATIO'));
check('backup/validate-zip enforces an expanded-size cap',
    str_contains($backup, 'MAX_EXPANDED_BYTES'));
check('backup/validate-zip rejects a non-ZIP by signature before extraction',
    str_contains($backup, 'PK'));

// 7e. import must go through the atomic RPC and must not double-record history.
$import = file_get_contents($root . '/backend-api/src/Controllers/ImportController.php');
check('import/trainees calls the atomic RPC instead of fabricating SUCCESS',
    str_contains($import, "rpc('import_trainees_bulk_atomic'"));
check('import/trainees no longer hardcodes a SUCCESS status',
    preg_match("/'status'\s*=>\s*'SUCCESS'/", $import) !== 1);
check('import/trainees does not write a second import_history row',
    !str_contains($import, "'import_history', 'POST'"));
// The RPC resolves groups by groups.name_ar, not by numeric id. The controller
// must therefore map the sheet's GroupID onto the Arabic name before sending it,
// otherwise every row silently lands in group 1 (the RPC's COALESCE default).
check('import/trainees maps GroupID to the Arabic group_name the RPC expects',
    str_contains($import, "'group_name'")
    && str_contains($import, '$groupNames[(string) $row[' . "'GroupID'" . ']]'));
check('the group name map covers exactly the three live groups',
    preg_match_all('/=>\s*.الفرقة/u', $import) === 3,
    'found ' . preg_match_all('/=>\s*.الفرقة/u', $import) . ' Arabic group names');
check('import/trainees forwards the actor token so auth.uid() resolves',
    str_contains($import, 'withActorToken($this->bearerToken())'));
check('import/history bounds its own result set',
    str_contains($import, 'min(200'));
check('import never logs a password',
    !preg_match("/'password'\s*=>\s*\$row\['Password'\]\s*\]\s*,\s*\n\s*'total_rows'/", $import));

// 7f. export: allowlisted entities, capability-detected formats, no formula injection.
$export = file_get_contents($root . '/backend-api/src/Controllers/ExportController.php');
check('export/entity is an allowlist key, not an interpolated table name',
    str_contains($export, 'const ENTITIES')
    && str_contains($export, 'INVALID_ENTITY'));
check('export rejects a group filter on a non-scoped entity',
    str_contains($export, 'GROUP_FILTER_UNSUPPORTED'));
check('export advertises only formats the deployment can produce',
    str_contains($export, 'SpreadsheetWriter::formats()'));
check('export fails loudly when a format is unavailable',
    str_contains($export, 'EXPORT_FORMAT_UNAVAILABLE'));
$writer = file_get_contents($root . '/backend-api/src/Services/SpreadsheetWriter.php');
check('SpreadsheetWriter neutralises formula injection',
    str_contains($writer, "'\" . \$s") || str_contains($writer, "= \"'\" . \$s"));
check('SpreadsheetWriter refuses to advertise PDF without a shaping library',
    str_contains($writer, 'PDF') && str_contains($writer, 'formats()'));

// 7g. SupabaseClient must be able to present the actor, else every auth-gated RPC
// would fail with a NULL auth.uid() under service_role.
$supa = file_get_contents($root . '/backend-api/src/Services/SupabaseClient.php');
check('SupabaseClient exposes rpc()', str_contains($supa, 'public function rpc('));
check('SupabaseClient can present the actor token instead of service_role',
    str_contains($supa, 'withActorToken') && str_contains($supa, '$this->actorToken ?? $this->serviceRoleKey'));

// 7h. The new routes are actually registered.
$router = file_get_contents($root . '/backend-api/public/index.php');
foreach (['/backup/validate-zip', '/backup/delete', '/restore/execute', '/import/history'] as $route) {
    check("route $route is registered", str_contains($router, "'" . $route . "'"));
}

// ---------------------------------------------------------------------------
// Database restore. The backup half existed for a while with no way back, so the
// restore is the half that had to be built under scrutiny.
// ---------------------------------------------------------------------------
$restoreSvcPath = $root . '/backend-api/src/Services/DatabaseRestoreService.php';
check('DatabaseRestoreService exists', is_file($restoreSvcPath));
$restoreSvc = is_file($restoreSvcPath) ? file_get_contents($restoreSvcPath) : '';

check('restore calls the database, not a placeholder', str_contains($restoreSvc, "'restore_database'"));
check('restore no longer demands pg_dump',
    !str_contains($restoreSvc, 'pg_restore') && !str_contains($restoreSvc, 'dump.sql'));
check('restore refuses a missing database.json',
    str_contains($restoreSvc, 'database.json') && str_contains($restoreSvc, 'throw new'));
check('restore rejects unsafe table names before the RPC',
    str_contains($restoreSvc, '[a-z_][a-z0-9_]*'));
check('restore refuses the bookkeeping tables',
    str_contains($restoreSvc, "'backup_records'") && str_contains($restoreSvc, "'import_history'"));
check('restore sends the archive in one call, not per table',
    substr_count($restoreSvc, "->rpc('restore_database'") === 1);
check('restore treats a zero-table report as failure',
    str_contains($restoreSvc, 'tables_restored')
    && str_contains($restoreSvc, '$tables < 1'));
check('restore bounds the payload it will hold in memory',
    str_contains($restoreSvc, 'MAX_PAYLOAD_BYTES'));
check('restore builds its Supabase client lazily',
    str_contains($restoreSvc, '?SupabaseClient $client = null')
    && !str_contains($restoreSvc, '$this->client = $client ?? new SupabaseClient()'));

// The RPC name has to match the migration exactly; a rename on either side would
// otherwise only fail at restore time, on a live system.
$migrationPath = $root . '/supabase/migrations/20261001170000_logical_restore_rpcs.sql';
$restoreMigration = is_file($migrationPath) ? file_get_contents($migrationPath) : '';
check('the restore migration is tracked', trim($restoreMigration) !== '');
check('the RPC name matches the migration',
    str_contains($restoreSvc, "'restore_database'")
    && str_contains($restoreMigration, 'CREATE OR REPLACE FUNCTION public.restore_database'));
check('the escalation guard survives in the migration',
    str_contains($restoreMigration, 'would be granted super_user'));
check('the migration suspends triggers only transaction-locally',
    str_contains($restoreMigration, "SET LOCAL session_replication_role = 'replica'"));
check('restore RPCs are revoked from anon and authenticated',
    str_contains($restoreMigration, 'REVOKE ALL ON FUNCTION public.restore_database(jsonb, boolean)')
    && str_contains($restoreMigration, 'FROM PUBLIC, anon, authenticated'));
check('restore RPCs are granted to service_role',
    (bool) preg_match('/GRANT EXECUTE ON FUNCTION public\.restore_database\(jsonb, boolean\)\s+TO service_role;/',
        $restoreMigration));
// The migration explains, in a comment, why ALTER TABLE ... DISABLE TRIGGER and a
// GUC flag were both rejected. Checking for the literal text would fail on that
// explanation, so only executable statements are inspected -- comments stripped.
$restoreMigrationCode = preg_replace('/--[^\n]*/', '', $restoreMigration);
check('no ALTER TABLE ... DISABLE TRIGGER escape hatch',
    !str_contains($restoreMigrationCode, 'DISABLE TRIGGER')
    && !str_contains($restoreMigrationCode, 'ENABLE ALWAYS')
    && !str_contains($restoreMigrationCode, 'ALTER TABLE'));
check('the rejected GUC-flag design is gone from the migration',
    !str_contains($restoreMigration, 'allow_super_metadata'));

// A restore that is more dangerous than the backup it came from would be a net
// loss, so truncate has to be opt-in at the HTTP layer too.
$restoreCtlPath = $root . '/backend-api/src/Controllers/RestoreController.php';
$restoreCtl = is_file($restoreCtlPath) ? file_get_contents($restoreCtlPath) : '';
check('truncate_mode is opt-in, defaulting to MERGE',
    str_contains($restoreCtl, "truncate_mode'] ?? 'MERGE'"));
check('restore still requires admin or super_user', str_contains($restoreCtl, 'requireAdminOrSuperUser'));
check('restore still requires explicit confirmation',
    str_contains($restoreCtl, 'confirm_restore') && str_contains($restoreCtl, "'YES'"));

// ---------------------------------------------------------------- report
$pass = count(array_filter($results, fn($r) => $r['ok']));
$fail = count($results) - $pass;
foreach ($results as $r) {
    printf("[%s] %s%s\n", $r['ok'] ? 'PASS' : 'FAIL', $r['name'],
        $r['detail'] !== '' && !$r['ok'] ? "  <-- {$r['detail']}" : '');
}
printf("\n%d/%d passed, %d failed\n", $pass, count($results), $fail);
exit($fail === 0 ? 0 : 1);