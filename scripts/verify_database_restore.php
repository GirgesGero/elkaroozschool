<?php
/**
 * Unit tests for DatabaseRestoreService, against a fake SupabaseClient.
 *
 * The database side of a restore is verified against production in
 * supabase/migrations/20261001170000_logical_restore_rpcs.sql and the
 * round-trip suite. What this file covers is everything the PHP layer is
 * responsible for, which is the part that can be checked without a network:
 *
 *   - it refuses an archive with no database.json instead of "succeeding"
 *   - it refuses an unparseable or empty database.json with a message that
 *     names the file, rather than letting null reach Postgres
 *   - it refuses a table name that is not a bare identifier, and the
 *     bookkeeping tables, before the RPC is ever called
 *   - it sends the WHOLE payload in one call, because a per-table call would
 *     give a half-restored database
 *   - it treats a report with zero restored tables as a failure
 *   - a truncated archive whose DB section is missing is a hard error
 */

require __DIR__ . '/../backend-api/src/Services/SupabaseClient.php';
require __DIR__ . '/../backend-api/src/Services/DatabaseRestoreService.php';

use App\Services\DatabaseRestoreService;
use App\Services\SupabaseClient;

$pass = 0;
$fail = 0;

function check(string $name, bool $ok, string $detail = ''): void {
    global $pass, $fail;
    if ($ok) {
        $pass++;
        echo "  PASS  $name\n";
    } else {
        $fail++;
        echo "  FAIL  $name" . ($detail !== '' ? " -- $detail" : '') . "\n";
    }
}

/** Records the RPC calls a fake client received. */
final class FakeSupabaseClient extends SupabaseClient
{
    public array $calls = [];
    /** @var mixed */
    public $nextResponse;
    public ?\Throwable $nextException = null;

    public function __construct() {}

    public function rpc(string $function, array $args = []): array
    {
        $this->calls[] = ['fn' => $function, 'params' => $args];
        if ($this->nextException !== null) {
            throw $this->nextException;
        }
        if (!is_array($this->nextResponse)) {
            // SupabaseClient::rpc() is typed to return array; a fake that returned
            // null would fail on the return type rather than on the assertion the
            // test is actually about.
            return (array) $this->nextResponse;
        }
        return $this->nextResponse;
    }
}


/** Restore, capturing either the report or the exception, plus the fake client. */
function tryRestore(string $dir, bool $truncate): array {
    $client = new FakeSupabaseClient();
    $client->nextResponse = ['tables_restored' => 1, 'accounts_created' => 0, 'super_user_preserved' => 0];
    $svc = new DatabaseRestoreService($client);
    try {
        return [$svc->restore($dir, $truncate), $client];
    } catch (\Throwable $e) {
        return [$e, $client];
    }
}

function makeArchive(?string $dbJson, string $name = 'db'): string {
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ekr_restore_' . bin2hex(random_bytes(6));
    mkdir($dir . DIRECTORY_SEPARATOR . 'database', 0755, true);
    if ($dbJson !== null) {
        file_put_contents($dir . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'database.json', $dbJson);
    }
    return $dir;
}

$dirs = [];
function track(string $d): string { global $dirs; $dirs[] = $d; return $d; }
function cleanupAll(): void {
    global $dirs;
    foreach ($dirs as $d) {
        if (!is_dir($d)) continue;
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($d, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $f) { $f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname()); }
        @rmdir($d);
    }
    $dirs = [];
}

echo "== DatabaseRestoreService ==\n";

// ---------------------------------------------------------------- 1. happy path
$good = json_encode([
    'profiles' => [
        ['id' => '11111111-1111-1111-1111-111111111111', 'username' => 'a', 'role_id' => 'admin'],
        ['id' => '22222222-2222-2222-2222-222222222222', 'username' => 'b', 'role_id' => 'trainee'],
    ],
    'bible_books' => [['id' => 1, 'name' => 'سفر']],
]);
$dir = track(makeArchive($good));
$client = new FakeSupabaseClient();
$client->nextResponse = ['tables_restored' => 2, 'accounts_created' => 0, 'super_user_preserved' => 1, 'truncate_mode' => false];
$svc = new DatabaseRestoreService($client);
$out = $svc->restore($dir, false);
check('restore returns a report', is_array($out) && !($out instanceof \Throwable), $out instanceof \Throwable ? $out->getMessage() : '');
check('tables_restored surfaced', ($out['tables_restored'] ?? -1) === 2, json_encode($out));
check('accounts_created surfaced', ($out['accounts_created'] ?? -1) === 0);
check('super_user_preserved surfaced', ($out['super_user_preserved'] ?? -1) === 1);
check('one RPC call only', count($client->calls) === 1, (string) count($client->calls));
check('RPC name is restore_database', ($client->calls[0]['fn'] ?? '') === 'restore_database');
check('whole payload in one call', count($client->calls[0]['params']['p_tables'] ?? []) === 2,
    'archive had 2 tables, RPC got ' . count($client->calls[0]['params']['p_tables'] ?? []));
check('truncate flag forwarded', ($client->calls[0]['params']['p_truncate'] ?? null) === false);

// ------------------------------------------------------------- 2. missing file
$dir = track(makeArchive(null));
[$out, $client] = tryRestore($dir, false);
check('missing database.json is an error', $out instanceof \RuntimeException, get_class($out));
check('missing file message is specific',
    $out instanceof \RuntimeException && str_contains($out->getMessage(), 'database.json'));
check('missing file makes no RPC call', count($client->calls) === 0);

// -------------------------------------------------------------- 3. empty file
$dir = track(makeArchive(''));
[$out, $client] = tryRestore($dir, false);
check('empty database.json is an error', $out instanceof \RuntimeException);
check('empty file makes no RPC call', count($client->calls) === 0);

// ------------------------------------------------------------- 4. bad JSON
$dir = track(makeArchive('{not json'));
[$out, $client] = tryRestore($dir, false);
check('unparseable database.json is an error', $out instanceof \RuntimeException);
check('bad JSON message names the file',
    $out instanceof \RuntimeException && str_contains($out->getMessage(), 'database.json'));
check('bad JSON makes no RPC call', count($client->calls) === 0);

// ------------------------------------------------------------ 5. JSON array
$dir = track(makeArchive('[]'));
[$out, $client] = tryRestore($dir, false);
check('a JSON array is rejected, not sent', $out instanceof \RuntimeException);
check('JSON array makes no RPC call', count($client->calls) === 0);

// ------------------------------------------------------- 6. unsafe table name
$dir = track(makeArchive(json_encode(['profiles; DROP TABLE profiles--' => []])));
[$out, $client] = tryRestore($dir, false);
check('injection table name is rejected', $out instanceof \RuntimeException);
check('injection message is specific',
    $out instanceof \RuntimeException && str_contains($out->getMessage(), 'غير صالح'));
check('injection makes no RPC call', count($client->calls) === 0);

// ------------------------------------------------------------- 7. path escape
$dir = track(makeArchive(json_encode(['../../etc/passwd' => []])));
[$out, $client] = tryRestore($dir, false);
check('path traversal table name is rejected', $out instanceof \RuntimeException);
check('path traversal makes no RPC call', count($client->calls) === 0);

// --------------------------------------------------------- 8. bookkeeping
foreach (['backup_records', 'import_history'] as $t) {
    $dir = track(makeArchive(json_encode([$t => []])));
    [$out, $client] = tryRestore($dir, false);
    check("$t is refused", $out instanceof \RuntimeException);
    check("$t refusal names the table",
        $out instanceof \RuntimeException && str_contains($out->getMessage(), $t));
    check("$t makes no RPC call", count($client->calls) === 0);
}

// ------------------------------------------------- 9. rows not an array
$dir = track(makeArchive(json_encode(['profiles' => 'nope'])));
[$out, $client] = tryRestore($dir, false);
check('non-array rows rejected', $out instanceof \RuntimeException);
check('non-array rows message names the table',
    $out instanceof \RuntimeException && str_contains($out->getMessage(), 'profiles'));
check('non-array rows makes no RPC call', count($client->calls) === 0);

// --------------------------------------------- 10. zero tables in the report
$dir = track(makeArchive($good));
$client = new FakeSupabaseClient();
$client->nextResponse = ['tables_restored' => 0];
$svc = new DatabaseRestoreService($client);
try {
    $out = $svc->restore($dir, false);
    check('zero restored tables is a failure', false, 'returned success');
} catch (\Throwable $e) {
    check('zero restored tables is a failure', true);
    check('zero tables message is specific', str_contains($e->getMessage(), 'أي جدول'));
}

// ---------------------------------------------------- 11. RPC exception
$dir = track(makeArchive($good));
$client = new FakeSupabaseClient();
$client->nextException = new \RuntimeException('restoring violates row level security policy');
$svc = new DatabaseRestoreService($client);
try {
    $svc->restore($dir, false);
    check('RPC failure propagates', false, 'returned success');
} catch (\Throwable $e) {
    check('RPC failure propagates', true);
    check('RPC error text is preserved',
        str_contains($e->getMessage(), 'row level security'), $e->getMessage());
}

// --------------------------------------------------- 12. missing report key
$dir = track(makeArchive($good));
$client = new FakeSupabaseClient();
$client->nextResponse = [];      // no tables_restored at all
$svc = new DatabaseRestoreService($client);
try {
    $svc->restore($dir, false);
    check('a report without tables_restored is a failure', false, 'returned success');
} catch (\Throwable $e) {
    check('a report without tables_restored is a failure', true);
}

// ----------------------------------------------- 13. truncate flag is passed
$dir = track(makeArchive($good));
$client = new FakeSupabaseClient();
$client->nextResponse = ['tables_restored' => 1];
$svc = new DatabaseRestoreService($client);
$svc->restore($dir, true);
check('truncate=true is forwarded', ($client->calls[0]['params']['p_truncate'] ?? null) === true);

// ------------------------------------------- 14. oversized payload is refused
$dir = makeArchive(null);
file_put_contents($dir . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'database.json',
    json_encode(['profiles' => []]));
// push the file over the ceiling by appending whitespace, which json_decode
// tolerates -- so the size check, not the parser, is what must stop it.
$fh = fopen($dir . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'database.json', 'a');
fwrite($fh, str_repeat(' ', 65 * 1024 * 1024));
fclose($fh);
track($dir);
$client = new FakeSupabaseClient();
$client->nextResponse = ['tables_restored' => 1];
$svc = new DatabaseRestoreService($client);
try {
    $svc->restore($dir, false);
    check('oversized payload is refused', false, 'returned success');
} catch (\Throwable $e) {
    check('oversized payload is refused', true);
    check('oversized message mentions the limit', str_contains($e->getMessage(), 'الحد المسموح'));
}
check('oversized payload makes no RPC call', count($client->calls) === 0);

cleanupAll();

echo "\n$pass passed, $fail failed\n";
exit($fail === 0 ? 0 : 1);
