<?php
/**
 * Live end-to-end check of DatabaseExportService against the real database.
 *
 * The unit suite (verify_database_export.php) proves control flow against a fake
 * client. This proves the OTHER half: that the deployed RPCs exist, that the
 * service_role grant is actually in place, and that a real 50-table database
 * round-trips through pagination into a manifest you could restore from.
 *
 * It writes to a scratch directory and deletes it afterwards. It does not touch
 * production data, and it needs the four SUPABASE_* env vars to be set, exactly
 * like production does. Credentials are never printed.
 */

require __DIR__ . '/../backend-api/src/Services/SupabaseClient.php';
require __DIR__ . '/../backend-api/src/Services/DatabaseExportService.php';

use App\Services\DatabaseExportService;
use App\Services\SupabaseClient;

$pass = 0;
$fail = 0;
function check(string $label, bool $ok, string $detail = ''): void
{
    global $pass, $fail;
    if ($ok) {
        $pass++;
        echo "  [PASS] $label\n";
    } else {
        $fail++;
        echo "  [FAIL] $label" . ($detail ? "  <-- $detail" : '') . "\n";
    }
}

$required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET'];
$missing = [];
foreach ($required as $n) {
    $v = getenv($n);
    if ($v === false || trim((string) $v) === '') {
        $missing[] = $n;
    }
}
if ($missing !== []) {
    fwrite(STDERR, "missing env: " . implode(', ', $missing) . "\n");
    fwrite(STDERR, "set them, then re-run. Credentials are never printed.\n");
    exit(2);
}

$dir = sys_get_temp_dir() . '/db_export_live_' . getmypid();
@mkdir($dir, 0700, true);

echo "=== DatabaseExportService, live against production ===\n";

$client = new SupabaseClient();

echo "\n-- the manifest lists the real schema --\n";
$manifest = $client->rpc('export_manifest');
$tables = $manifest['tables'] ?? [];
check('export_manifest returns a table list', is_array($tables) && $tables !== [], count($tables) . ' tables');
check('every entry has a name', count(array_filter($tables, fn($t) => !empty($t['table']))) === count($tables));
check('every entry has a numeric row_count',
    count(array_filter($tables, fn($t) => isset($t['row_count']) && is_numeric($t['row_count']))) === count($tables));
$declaredProfiles = 0;
foreach ($tables as $t) {
    if ($t['table'] === 'profiles') {
        $declaredProfiles = (int) $t['row_count'];
    }
}
check('profiles is present with a plausible count', $declaredProfiles > 0, (string) $declaredProfiles);

echo "\n-- a single table paginates and matches the manifest --\n";
$page = $client->rpc('export_table', ['p_table' => 'profiles', 'p_limit' => 10, 'p_offset' => 0]);
check('export_table returns rows', is_array($page['rows'] ?? null));
check('page row_count matches the array length',
    (int) ($page['row_count'] ?? -1) === count($page['rows'] ?? []));
check('has_more is a boolean', is_bool($page['has_more'] ?? null));
check('limit and offset are echoed back',
    (int) ($page['limit'] ?? 0) === 10 && (int) ($page['offset'] ?? 0) === 0);

echo "\n-- the whole database exports into files --\n";
$res = (new DatabaseExportService($client))->exportToDirectory($dir);
check('tables exported', $res['tables'] > 0, (string) $res['tables']);
check('rows exported', $res['rows'] > 0, (string) $res['rows']);
check('bytes written', $res['bytes'] > 0, (string) $res['bytes']);
check('the per-table counts sum to the total',
    array_sum($res['row_counts']) === $res['rows']);
check('the profiles count matches the manifest',
    ($res['row_counts']['profiles'] ?? -1) === $declaredProfiles,
    ($res['row_counts']['profiles'] ?? 'absent') . ' vs ' . $declaredProfiles);

$files = glob("$dir/database/*.json") ?: [];
check('one file per exported table', count($files) === $res['tables'], count($files) . ' vs ' . $res['tables']);
check('no file for backup_records', !in_array("$dir/database/backup_records.json", $files, true));
check('no file for import_history', !in_array("$dir/database/import_history.json", $files, true));

echo "\n-- every file is valid json with its own declared count --\n";
$badJson = 0;
$mismatched = 0;
foreach ($files as $f) {
    $decoded = json_decode((string) file_get_contents($f), true);
    if (!is_array($decoded) || !isset($decoded['rows'])) {
        $badJson++;
        continue;
    }
    if ((int) ($decoded['row_count'] ?? -1) !== count($decoded['rows'])) {
        $mismatched++;
    }
}
check('all files parse as json', $badJson === 0, "$badJson bad");
check('every file declares the count it holds', $mismatched === 0, "$mismatched mismatched");

echo "\n-- the archive does not leak credentials --\n";
$leaked = [];
foreach (['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_JWT_SECRET'] as $secretName) {
    $secret = (string) getenv($secretName);
    if ($secret === '') {
        continue;
    }
    foreach ($files as $f) {
        $body = (string) file_get_contents($f);
        if (str_contains($body, $secret)) {
            $leaked[] = basename($f) . ':' . $secretName;
        }
    }
}
check('no key value appears in any exported file', $leaked === [], implode(', ', $leaked));

// cleanup
$it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::CHILD_FIRST
);
foreach ($it as $f) {
    $f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname());
}
@rmdir($dir);

printf("\n=== SUMMARY ===\n%d passed, %d failed\n", $pass, $fail);
exit($fail === 0 ? 0 : 1);