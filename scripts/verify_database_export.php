<?php
/**
 * Tests for DatabaseExportService.
 *
 * The service talks to export_manifest() / export_table() over PostgREST. It is
 * tested against an injected fake rather than the live database for three
 * reasons:
 *   - the assertions are about paging, mismatch detection and refusal behaviour,
 *     none of which need real data;
 *   - a test must not depend on production row counts, which change daily;
 *   - the real grant check (anon must be denied) is a database concern and is
 *     verified against production in the rollback-transaction probe instead.
 *
 * SupabaseClient is not an interface, so the fake subclasses it. The parent
 * constructor is bypassed deliberately: it requires the four SUPABASE_* env vars,
 * and a unit test should not need credentials to exercise control flow. The
 * overridden rpc() never touches the network.
 */

require __DIR__ . '/../backend-api/src/Services/SupabaseClient.php';
require __DIR__ . '/../backend-api/src/Services/DatabaseExportService.php';

use App\Services\DatabaseExportService;
use App\Services\SupabaseClient;

final class FakeSupabase extends SupabaseClient
{
    /** @var array<string,list<array<string,mixed>>> table => rows */
    public array $tables = [];
    /** @var list<string> every export_table() call, in order */
    public array $calls = [];
    /** @var array<string,int|null> forced failures: table => message */
    public array $failFor = [];
    /** @var string|null forced manifest failure */
    public ?string $manifestFailure = null;
    /** Simulate a page that keeps claiming has_more forever. */
    public bool $alwaysHasMore = false;
    /** Serve the first page regardless of offset, simulating a server that never advances. */
    public bool $repeatFirstPage = false;
    /** Report has_more=false on the first page even though more rows exist. */
    public bool $lieHasMore = false;
    /** Emulate the pre-fix RPC, which returned no total_rows at all. */
    public bool $omitTotalRows = false;
    /** Declare a row count that does not match what is produced. */
    public array $declaredOverride = [];

    public function __construct()
    {
        // Intentionally does not call parent::__construct().
    }

    public function rpc(string $function, array $args = []): array
    {
        if ($function === 'export_manifest') {
            if ($this->manifestFailure !== null) {
                throw new \RuntimeException($this->manifestFailure);
            }
            $out = [];
            foreach ($this->tables as $name => $rows) {
                $out[] = [
                    'table'     => $name,
                    'row_count' => $this->declaredOverride[$name] ?? count($rows),
                ];
            }
            return ['tables' => $out];
        }

        if ($function !== 'export_table') {
            throw new \RuntimeException("unexpected RPC: $function");
        }

        $table = (string) ($args['p_table'] ?? '');
        $limit = (int) ($args['p_limit'] ?? 500);
        $offset = (int) ($args['p_offset'] ?? 0);
        $this->calls[] = "$table:$offset:$limit";

        if (isset($this->failFor[$table])) {
            throw new \RuntimeException($this->failFor[$table] ?? 'forced failure');
        }

        $all = $this->tables[$table] ?? [];
        if ($this->repeatFirstPage) {
            $slice = array_slice($all, 0, $limit);
        } else {
            $slice = array_slice($all, $offset, $limit);
        }
        $hasMore = $this->alwaysHasMore || ($offset + $limit) < count($all);
        // The exact production bug: has_more compared against the page size, so
        // it was ALWAYS false for a full page. total_rows still told the truth.
        if ($this->lieHasMore && $offset === 0 && count($all) > count($slice)) {
            $hasMore = false;
        }

        $page = [
            'table'      => $table,
            'rows'       => $slice,
            'has_more'   => $hasMore,
            'row_count'  => count($slice),
        ];
        if (!$this->omitTotalRows) {
            $page['total_rows'] = count($all);
        }
        return $page;
    }
}

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

function stagingDir(string $tag): string
{
    $dir = sys_get_temp_dir() . '/db_export_test_' . $tag . '_' . getmypid();
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    return $dir;
}

function cleanup(string $dir): void
{
    if (!is_dir($dir)) {
        return;
    }
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($it as $f) {
        $f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname());
    }
    @rmdir($dir);
}

echo "=== DatabaseExportService ===\n";

// ---------------------------------------------------------------------------
echo "\n-- exports every table and reports real counts --\n";
$dir = stagingDir('basic');
$fake = new FakeSupabase();
$fake->tables = [
    'profiles' => array_fill(0, 7, ['username' => 'x', 'role_id' => 'trainee']),
    'groups'   => [['id' => 1, 'name' => 'group one']],
    'bible_books' => [],
];
$res = (new DatabaseExportService($fake))->exportToDirectory($dir);
check('three tables written', $res['tables'] === 3, (string) $res['tables']);
check('row total is 8', $res['rows'] === 8, (string) $res['rows']);
check('profiles.json exists', is_file("$dir/database/profiles.json"));
check('groups.json exists', is_file("$dir/database/groups.json"));
$payload = json_decode((string) file_get_contents("$dir/database/profiles.json"), true);
check('profiles.json declares row_count 7', ($payload['row_count'] ?? null) === 7);
check('profiles.json carries the actual rows', count($payload['rows'] ?? []) === 7);
check('an empty table still produces a file', is_file("$dir/database/bible_books.json"));
check('row_counts map is returned', ($res['row_counts']['groups'] ?? null) === 1);
cleanup($dir);

// ---------------------------------------------------------------------------
echo "\n-- paginates and reassembles in order --\n";
$dir = stagingDir('paging');
$fake = new FakeSupabase();
$rows = [];
for ($i = 0; $i < 1200; $i++) {
    $rows[] = ['n' => $i];
}
$fake->tables = ['big' => $rows];
$res = (new DatabaseExportService($fake))->exportToDirectory($dir);
check('all 1200 rows exported', $res['rows'] === 1200, (string) $res['rows']);
$payload = json_decode((string) file_get_contents("$dir/database/big.json"), true);
$exported = array_column($payload['rows'], 'n');
check('page order is preserved', $exported === range(0, 1199));
check('pagination used multiple offsets', count($fake->calls) === 3, implode(',', $fake->calls));
cleanup($dir);

// ---------------------------------------------------------------------------
echo "\n-- refuses a row-count mismatch instead of shipping a partial export --\n";
$dir = stagingDir('mismatch');
$fake = new FakeSupabase();
$fake->tables = ['profiles' => [['id' => 1], ['id' => 2]]];
$fake->declaredOverride['profiles'] = 50; // manifest claims 50, only 2 exist
$threw = false;
try {
    (new DatabaseExportService($fake))->exportToDirectory($dir);
} catch (\RuntimeException $e) {
    $threw = true;
    check('mismatch message names the table', str_contains($e->getMessage(), 'profiles'));
    check('mismatch message states both counts',
        str_contains($e->getMessage(), '50') && str_contains($e->getMessage(), '2'));
}
check('a declared/actual mismatch throws', $threw);
cleanup($dir);

// ---------------------------------------------------------------------------
echo "\n-- refuses when the manifest is empty or the grant is missing --\n";
$dir = stagingDir('nogrant');
$fake = new FakeSupabase();
$fake->tables = [];                       // RPC present but returns nothing
$threw = false;
try {
    (new DatabaseExportService($fake))->exportToDirectory($dir);
} catch (\RuntimeException $e) {
    $threw = true;
    check('error names export_manifest so the cause is obvious',
        str_contains($e->getMessage(), 'export_manifest'));
    check('error refuses to write an empty export',
        str_contains($e->getMessage(), 'Refusing to write an empty database export'));
}
check('an empty manifest throws', $threw);
cleanup($dir);

$dir = stagingDir('rpcmissing');
$fake = new FakeSupabase();
$fake->manifestFailure = 'function public.export_manifest() does not exist';
$threw = false;
try {
    (new DatabaseExportService($fake))->exportToDirectory($dir);
} catch (\RuntimeException $e) {
    $threw = true;
}
check('a missing RPC throws rather than producing an empty backup', $threw);
cleanup($dir);

// ---------------------------------------------------------------------------
echo "\n-- an RPC error on one table aborts the whole export --\n";
$dir = stagingDir('rpcerror');
$fake = new FakeSupabase();
$fake->tables = ['profiles' => [['id' => 1]], 'groups' => [['id' => 1]]];
$fake->failFor['groups'] = 'permission denied for table groups';
$threw = false;
try {
    (new DatabaseExportService($fake))->exportToDirectory($dir);
} catch (\RuntimeException $e) {
    $threw = true;
}
check('a failed table aborts the export', $threw);
cleanup($dir);

// ---------------------------------------------------------------------------
echo "\n-- never loops forever on a server that always says has_more --\n";
$dir = stagingDir('loop');
$fake = new FakeSupabase();
// alwaysHasMore alone is NOT the runaway case: once the offset passes the end of
// the table the page comes back empty and empty legitimately ends pagination.
// The runaway case needs the server to keep returning rows forever, so the fake
// re-serves the first page no matter what offset it is asked for.
$fake->tables = ['endless' => array_fill(0, 3, ['id' => 1])];
$fake->repeatFirstPage = true;
$fake->alwaysHasMore = true;
$svc = new DatabaseExportService($fake);
$svc->setMaxRowsPerTableForTesting(50);
$threw = false;
try {
    $svc->exportToDirectory($dir);
} catch (\RuntimeException $e) {
    $threw = true;
    check('the runaway-paging error names the table', str_contains($e->getMessage(), 'endless'));
    check('the runaway error says it aborted mid-pagination',
        str_contains($e->getMessage(), 'mid-pagination'));
}
check('always-has_more terminates instead of hanging', $threw);
cleanup($dir);

echo "\n-- a table above the row ceiling is refused, not truncated --\n";
$dir = stagingDir('ceiling');
$fake = new FakeSupabase();
$fake->tables = ['wide' => array_fill(0, 10, ['id' => 1])];
// 500001, not 500000: the guard is a strict `>`, so a table sitting exactly on
// the ceiling is legal and must export normally (see the boundary test below).
$fake->declaredOverride['wide'] = 500_001;
$threw = false;
try {
    (new DatabaseExportService($fake))->exportToDirectory($dir);
} catch (\RuntimeException $e) {
    $threw = true;
    check('ceiling error refuses to truncate',
        str_contains($e->getMessage(), 'Refusing to truncate it into a partial backup'));
    check('ceiling error reports the declared row count',
        str_contains($e->getMessage(), '500001'));
    check('ceiling error names the table', str_contains($e->getMessage(), 'wide'));
}
check('an oversized table is refused', $threw);
cleanup($dir);

echo "\n-- a table exactly on the ceiling is allowed, not refused --\n";
$dir = stagingDir('boundary');
$fake = new FakeSupabase();
$fake->tables = ['edge' => array_fill(0, 10, ['id' => 1])];
// The same strict `>` guard, exercised on a lowered ceiling so a table sitting
// EXACTLY on it must be allowed. Using the real 500k would need 500k synthetic
// rows to be meaningful.
$svc = new DatabaseExportService($fake);
$svc->setMaxRowsPerTableForTesting(10);
$res = $svc->exportToDirectory($dir);
check('a table exactly at the ceiling exports', $res['tables'] === 1, (string) $res['tables']);
check('the boundary table produced its file', is_file("$dir/database/edge.json"));
check('the boundary table kept all its rows', $res['rows'] === 10);
cleanup($dir);

echo "\n-- breaching the ceiling mid-pagination aborts --\n";
$dir = stagingDir('ceiling2');
$fake = new FakeSupabase();
$fake->tables = ['wide' => array_fill(0, 5, ['id' => 1])];
// Declared must sit UNDER the ceiling so the pre-flight guard passes and the loop
// runs. The server then keeps serving rows and never stops claiming more, which
// is what drives the collected count past the ceiling.
$fake->declaredOverride['wide'] = 5;
$fake->alwaysHasMore = true;
$fake->repeatFirstPage = true;
$svc = new DatabaseExportService($fake);
$svc->setMaxRowsPerTableForTesting(40);
$threw = false;
try {
    $svc->exportToDirectory($dir);
} catch (\RuntimeException $e) {
    $threw = true;
    check('mid-pagination breach is reported as a ceiling breach, not a count mismatch',
        str_contains($e->getMessage(), 'mid-pagination'));
}
check('mid-pagination ceiling breach aborts', $threw);
cleanup($dir);

echo "\n-- an older RPC with no total_rows still exports completely --\n";
$dir = stagingDir('legacy');
$fake = new FakeSupabase();
$rows = [];
for ($i = 0; $i < 700; $i++) {
    $rows[] = ['n' => $i];
}
$fake->tables = ['profiles' => $rows];
$fake->omitTotalRows = true;   // pre-fix server: no total_rows, has_more correct
$res = (new DatabaseExportService($fake))->exportToDirectory($dir);
check('700 rows exported without total_rows', $res['rows'] === 700, (string) $res['rows']);
check('the legacy export file is complete',
    (int) (json_decode((string) file_get_contents("$dir/database/profiles.json"), true)['row_count'] ?? -1) === 700);
cleanup($dir);

// ---------------------------------------------------------------------------
echo "\n-- a lying has_more cannot truncate the export --\n";
$dir = stagingDir('lie');
$fake = new FakeSupabase();
$rows = [];
for ($i = 0; $i < 900; $i++) {
    $rows[] = ['n' => $i];
}
$fake->tables = ['profiles' => $rows];
$fake->lieHasMore = true;   // first page claims there is nothing more
$res = (new DatabaseExportService($fake))->exportToDirectory($dir);
check('all 900 rows exported despite has_more=false', $res['rows'] === 900, (string) $res['rows']);
$payload = json_decode((string) file_get_contents("$dir/database/profiles.json"), true);
check('the saved file holds every row', count($payload['rows'] ?? []) === 900);
check('the file declares the true count', (int) ($payload['row_count'] ?? -1) === 900);
check('a second page was requested', count($fake->calls) > 1, implode(',', $fake->calls));
cleanup($dir);

echo "\n-- never exports the bookkeeping tables --\n";
$dir = stagingDir('excluded');
$fake = new FakeSupabase();
$fake->tables = [
    'profiles'       => [['id' => 1]],
    'backup_records' => [['id' => 'old-backup']],
    'import_history' => [['id' => 'old-import']],
];
$res = (new DatabaseExportService($fake))->exportToDirectory($dir);
check('only profiles was exported', $res['tables'] === 1, (string) $res['tables']);
check('backup_records.json absent', !is_file("$dir/database/backup_records.json"));
check('import_history.json absent', !is_file("$dir/database/import_history.json"));
cleanup($dir);

// ---------------------------------------------------------------------------
echo "\n-- table names cannot escape the database directory --\n";
$dir = stagingDir('traversal');
$canary = dirname($dir) . '/evil.json';
@unlink($canary);
$fake = new FakeSupabase();
$fake->tables = [
    '../../evil'       => [['id' => 1]],
    '..\\..\\evil2'  => [['id' => 1]],
    'a/b'              => [['id' => 1]],
    'Bad-Name'         => [['id' => 1]],
    'has space'        => [['id' => 1]],
    "quote'name"       => [['id' => 1]],
    '.htaccess'        => [['id' => 1]],
];
$threw = false;
try {
    (new DatabaseExportService($fake))->exportToDirectory($dir);
} catch (\RuntimeException $e) {
    $threw = true;
    check('the unsafe name is named in the error',
        str_contains($e->getMessage(), 'unsafe name'));
}
check('an unsafe table name aborts the export', $threw);
check('nothing was written outside the staging directory', !is_file($canary));
cleanup($dir);

printf("\n=== SUMMARY ===\n%d passed, %d failed\n", $pass, $fail);
exit($fail === 0 ? 0 : 1);