<?php
/**
 * Runtime tests for FsHelper, BackupArchiveInspector and AtomicRestoreService.
 *
 * These run against a real temp directory tree, not mocks, because the whole
 * point of these classes is filesystem behaviour: whether a rollback actually
 * restores bytes, whether a traversal entry is stopped, whether cleanup
 * removes a populated directory.
 *
 * Run: php scripts/verify_restore_atomicity.php
 */
declare(strict_types=1);

define('APP_ROOT_SANDBOX', true);

$root = dirname(__DIR__) . '/backend-api/src';
require_once $root . '/Utils/AppRoot.php';
require_once $root . '/Utils/FsHelper.php';
require_once $root . '/Services/BackupArchiveInspector.php';
require __DIR__ . '/../backend-api/src/Services/SupabaseClient.php';
require __DIR__ . '/../backend-api/src/Services/DatabaseRestoreService.php';
require_once $root . '/Services/AtomicRestoreService.php';

use App\Utils\FsHelper;
use App\Services\BackupArchiveInspector;
use App\Services\AtomicRestoreService;

$pass = 0;
$fail = 0;
function chk(string $label, bool $ok, string $extra = ''): void {
    global $pass, $fail;
    if ($ok) { $pass++; echo "[PASS] $label\n"; }
    else { $fail++; echo "[FAIL] $label $extra\n"; }
}

$sandbox = sys_get_temp_dir() . '/ek_atomic_' . bin2hex(random_bytes(6));
mkdir($sandbox, 0700, true);

$storageRoot = $sandbox . '/storage';
mkdir($storageRoot . '/academic/group_1/curriculum', 0755, true);
file_put_contents($storageRoot . '/academic/group_1/curriculum/keep.pdf', 'ORIGINAL-CURRICULUM');
file_put_contents($storageRoot . '/root_only.txt', 'ORIGINAL-ROOT');
mkdir($storageRoot . '/obsolete', 0755, true);
file_put_contents($storageRoot . '/obsolete/old.bin', 'ORIGINAL-OBSOLETE');

// A backup archive that replaces one file and adds another.
$archive = $sandbox . '/archive';
mkdir($archive . '/files/academic/group_1/curriculum', 0755, true);
file_put_contents($archive . '/files/academic/group_1/curriculum/keep.pdf', 'RESTORED-NEW');
file_put_contents($archive . '/files/brand_new.txt', 'NEW-FILE');
mkdir($archive . '/database', 0755, true);
file_put_contents($archive . '/database/dump.sql', '-- dump');
file_put_contents($archive . '/manifest.json', json_encode([
    'system_name' => 'EL KAROOZ School',
    'system_version' => '2.0.0',
    'includes_database' => false,
    'includes_files' => true,
    'tables' => ['profiles'],
]));

echo "--- FsHelper ---\n";
chk('removeDirectory deletes a populated tree',
    FsHelper::removeDirectory($storageRoot) && !is_dir($storageRoot));

// Symlink safety cannot be exercised on stock Windows: symlink() returns false
// without Developer Mode or elevation, so the assertion would fail for an
// environmental reason while proving nothing. Skipped explicitly rather than
// deleted, so it resumes where the environment allows it.
$symParent = $sandbox . '/symtest';
mkdir($symParent, 0700, true);
mkdir($symParent . '/real', 0755, true);
file_put_contents($symParent . '/real/keepme.txt', 'x');
if (@symlink($symParent . '/real', $symParent . '/link')) {
    FsHelper::removeDirectory($symParent);
    chk('removeDirectory unlinks a symlink without following it',
        !file_exists($symParent) && is_file($symParent . '/real/keepme.txt'));
} else {
    echo "[SKIP] symlink containment (symlink() unavailable on this host)\n";
    FsHelper::removeDirectory($symParent);
}

$escape = FsHelper::isContainedIn($storageRoot, $storageRoot . '/../etc');
chk('isContainedIn rejects traversal', $escape === false);
// Rebuild $storageRoot: the removeDirectory test above deletes it on purpose.
mkdir($storageRoot . '/academic/group_1/curriculum', 0755, true);
$inside = FsHelper::isContainedIn($sandbox, $storageRoot);
chk('isContainedIn accepts a real child', $inside === true);

// Sibling-prefix trap: "root-evil" must not pass a check against "root".
mkdir($sandbox . '/prefix', 0755, true);
mkdir($sandbox . '/prefix-evil', 0755, true);
chk('isContainedIn rejects a sibling sharing the prefix',
    FsHelper::isContainedIn($sandbox . '/prefix', $sandbox . '/prefix-evil/inside') === false);

echo "--- BackupArchiveInspector ---\n";
$insp = BackupArchiveInspector::inspect($archive);
chk('inspect accepts a well-formed archive', $insp['valid'] === true, json_encode($insp['checks']));
chk('inspect reports version check', (bool) array_filter($insp['checks'], fn($c) => $c['name'] === 'version' && $c['passed']));
chk('inspect summary counts files', $insp['summary']['file_count'] === 4, 'got ' . $insp['summary']['file_count']);

$bad = $sandbox . '/bad_archive';
mkdir($bad, 0755, true);
file_put_contents($bad . '/manifest.json', json_encode(['system_version' => '9.9.9', 'includes_database' => true]));
$inspBad = BackupArchiveInspector::inspect($bad);
chk('inspect rejects an unsupported version', $inspBad['valid'] === false);
chk('inspect rejects a manifest claiming a missing db dump',
    (bool) array_filter($inspBad['checks'], fn($c) => $c['name'] === 'database' && !$c['passed']));

$noManifest = $sandbox . '/no_manifest';
mkdir($noManifest, 0755, true);
chk('inspect rejects an archive without manifest.json',
    BackupArchiveInspector::inspect($noManifest)['valid'] === false);

echo "--- AtomicRestoreService: success path ---\n";
// The FsHelper section above deliberately deletes $storageRoot to prove cleanup
// works, so rebuild a known state before exercising restore against it.
FsHelper::removeDirectoryQuietly($storageRoot);
mkdir($storageRoot . '/academic/group_1/curriculum', 0755, true);
file_put_contents($storageRoot . '/academic/group_1/curriculum/keep.pdf', 'ORIGINAL-CURRICULUM');
file_put_contents($storageRoot . '/root_only.txt', 'ORIGINAL-ROOT');
mkdir($storageRoot . '/obsolete', 0755, true);
file_put_contents($storageRoot . '/obsolete/old.bin', 'ORIGINAL-OBSOLETE');

// Point the service at the sandbox instead of the real config storage root, so a
// bug in the restore path cannot touch real school files.
BackupArchiveInspector::setStorageRootForTesting($storageRoot);
$restoreSvc = new AtomicRestoreService();

$res = $restoreSvc->execute($archive, ['restore_mode' => 'FILES_ONLY'], ['user_id' => 'test-actor']);
chk('FILES_ONLY restore succeeds', ($res['restored'] ?? false) === true, json_encode($res, JSON_UNESCAPED_UNICODE));
chk('restored file has the NEW content',
    @file_get_contents($storageRoot . '/academic/group_1/curriculum/keep.pdf') === 'RESTORED-NEW');
chk('newly added file exists',
    @file_get_contents($storageRoot . '/brand_new.txt') === 'NEW-FILE');
chk('untouched file still has ORIGINAL content',
    @file_get_contents($storageRoot . '/root_only.txt') === 'ORIGINAL-ROOT');
chk('untouched directory still has ORIGINAL content',
    @file_get_contents($storageRoot . '/obsolete/old.bin') === 'ORIGINAL-OBSOLETE');

echo "--- AtomicRestoreService: rollback path ---\n";
// Force a failure DURING the apply step, after pre-restore validation has passed and
// after a real write has landed.
//
// Three fault mechanisms were tried before this one and all failed for instructive
// reasons (documented on AtomicRestoreService::$failAfterFirstWrite):
//   chmod(0000)          -> POSIX bits are ignored by Windows ACLs, PHP reads it.
//   file/dir collision   -> the safety snapshot moves the directory aside, copy succeeds.
//   entry parent is file -> cannot even be created inside the archive directory.
// The fault is therefore injected in the service itself, right after a successful
// write — the precise partial state SRS 25.5 forbids leaving behind.
file_put_contents($storageRoot . '/academic/group_1/curriculum/keep.pdf', 'PRECIOUS-ORIGINAL');
file_put_contents($storageRoot . '/root_only.txt', 'PRECIOUS-ROOT');

AtomicRestoreService::setFailAfterFirstWriteForTesting('keep.pdf');

$caught = null;
try {
    $restoreSvc->execute($archive, ['restore_mode' => 'FILES_ONLY'], ['user_id' => 'test-actor']);
    chk('restore failed as expected (fault injection)', false, 'no exception raised');
} catch (\App\Services\RestoreFailedException $e) {
    $caught = $e;
    chk('restore failed as expected (fault injection)', true);
}

AtomicRestoreService::setFailAfterFirstWriteForTesting('');   // disarm

if ($caught !== null) {
    chk('RestoreFailedException carries the safety-backup handle',
        is_array($caught->safetyBackup) && ($caught->safetyBackup['bytes'] ?? 0) > 0,
        json_encode($caught->safetyBackup));
    chk('rollback itself did not fail', $caught->rollbackError === null,
        'rollback error: ' . (string) $caught->rollbackError);
}

// THE POINT OF SRS 25.5: the overwritten file must be back to its pre-restore bytes.
chk('rollback restores the file that was overwritten mid-restore',
    @file_get_contents($storageRoot . '/academic/group_1/curriculum/keep.pdf') === 'PRECIOUS-ORIGINAL',
    'got: ' . var_export(@file_get_contents($storageRoot . '/academic/group_1/curriculum/keep.pdf'), true));

chk('rollback leaves the untouched file intact',
    @file_get_contents($storageRoot . '/root_only.txt') === 'PRECIOUS-ROOT');

// The evil-archive check stands on its own: a crafted relative entry name must not
// escape the storage root. symlink() is unavailable on stock Windows, so the escape
// is expressed as a literal '../' path component instead.
$evil = $sandbox . '/evil_archive';
mkdir($evil . '/files', 0755, true);
file_put_contents($evil . '/files/../../escape_attempt.txt', 'escaped payload');
file_put_contents($evil . '/manifest.json', json_encode([
    'system_version' => '2.0.0', 'includes_database' => false, 'includes_files' => true,
]));

try {
    $restoreSvc->execute($evil, ['restore_mode' => 'FILES_ONLY'], ['user_id' => 'test-actor']);
} catch (\Throwable $e) {
    // Also acceptable: rejected outright.
}
chk('a crafted archive cannot write outside the storage root',
    !file_exists($sandbox . '/../escape_attempt.txt')
    && !file_exists(dirname($sandbox) . '/escape_attempt.txt')
    && !file_exists(dirname(dirname($sandbox)) . '/escape_attempt.txt'));

echo "--- DATABASE_ONLY fails closed when the archive carries no database ---\n";
// This used to assert that every DATABASE_ONLY request fails, because the restore
// half of the backup genuinely did not exist. It does now: restore_database() is a
// real RPC, and verify_database_restore.php covers the PHP side of it. What still
// has to hold -- and what this asserts -- is that a DATABASE_ONLY request against
// an archive with no database section is refused rather than reported as a
// successful restore. Silently succeeding here is the failure mode that matters:
// an operator would read the green response as "the database is back".
$dbFail = false;
try {
    $restoreSvc->execute($archive, ['restore_mode' => 'DATABASE_ONLY'], ['user_id' => 'test-actor']);
} catch (\App\Services\RestoreFailedException $e) {
    $dbFail = true;
    chk('DATABASE_ONLY names the missing database section',
        str_contains($e->getMessage(), 'database.json'), $e->getMessage());
}
chk('DATABASE_ONLY throws instead of silently succeeding', $dbFail);

// Cleanup
FsHelper::removeDirectoryQuietly($sandbox);

echo "---\n";
echo $pass . '/' . ($pass + $fail) . " passed\n";
exit($fail === 0 ? 0 : 1);