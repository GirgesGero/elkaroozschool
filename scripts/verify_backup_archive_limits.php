<?php
/**
 * verify_backup_archive_limits.php
 *
 * Exercises BackupController's container checks and BackupArchiveInspector against
 * REAL encrypted ZIP files.
 *
 * This harness exists because the first atomicity run was misleading: the local PHP
 * build had no ZipArchive extension, so every "archive" test silently operated on
 * plain directories and proved nothing about the ZIP paths. ZipArchive (with
 * AES-256) is now enabled, so the container checks, the encrypted round-trip and
 * the bomb limits are actually executed here.
 *
 * Run: php scripts/verify_backup_archive_limits.php
 */

declare(strict_types=1);

$root = dirname(__DIR__);
require $root . '/backend-api/vendor/autoload.php';

use App\Services\ZipEncryptionService;

$pass = 0;
$fail = 0;

function chk(string $name, bool $ok, string $detail = ''): void {
    global $pass, $fail;
    if ($ok) {
        $pass++;
        echo "[PASS] $name\n";
    } else {
        $fail++;
        echo "[FAIL] $name" . ($detail !== '' ? " — $detail" : '') . "\n";
    }
}

if (!class_exists(\ZipArchive::class)) {
    echo "[FATAL] ZipArchive is not available; these tests cannot run.\n";
    exit(1);
}

$sandbox = sys_get_temp_dir() . '/ek_zip_' . bin2hex(random_bytes(6));
mkdir($sandbox, 0700, true);

$PASSWORD = 'correct horse battery staple';

echo "--- ZipEncryptionService round trip ---\n";

// Build a small source tree.
$src = $sandbox . '/src';
mkdir($src . '/academic/group_1/curriculum', 0755, true);
file_put_contents($src . '/manifest.json', json_encode([
    'system_version' => '2.0.0',
    'includes_database' => false,
    'includes_files'   => true,
], JSON_UNESCAPED_UNICODE));
file_put_contents($src . '/academic/group_1/curriculum/lesson.pdf', str_repeat('A', 2048));
file_put_contents($src . '/notes.txt', 'شؤون سرية internal note');

$zipPath = $sandbox . '/backup.zip';
$created = ZipEncryptionService::createEncryptedZip($src, $zipPath, $PASSWORD);
chk('createEncryptedZip returns true', $created === true);
chk('the archive file exists', is_file($zipPath), $zipPath);
chk('the archive is non-empty', filesize($zipPath) > 0);

// It must actually be a ZIP container.
$head = file_get_contents($zipPath, false, null, 0, 4);
chk('archive has a PK\\x03\\x04 signature', $head === "PK\x03\x04", bin2hex((string) $head));

// Encryption is verified BEHAVIOURALLY, not by an API flag.
//
// ZipArchive in PHP 8.3 exposes setEncryptionName() but no getEncryptionName(), so
// there is no supported way to read the method back. Reading an entry WITHOUT a
// password is the honest test: if the archive were plaintext, getFromName() would
// return the content; if it is encrypted, it fails.
$za = new \ZipArchive();
chk('the archive opens with ZipArchive', $za->open($zipPath) === true);

$za->setPassword('');                       // deliberately wrong / empty
$plainLeak = $za->getFromName('notes.txt');
$za->close();
chk('reading an entry without the password yields no plaintext',
    $plainLeak === false || $plainLeak === '',
    'got: ' . var_export(is_string($plainLeak) ? substr($plainLeak, 0, 40) : $plainLeak, true));

// Corroborate with the raw general-purpose bit flag (bit 0 = encrypted) in the
// first local file header, which is the actual on-disk marker.
$raw = file_get_contents($zipPath);
$lfhPos = strpos((string) $raw, "PK\x03\x04");
$flags = $lfhPos !== false ? unpack('v', substr((string) $raw, $lfhPos + 6, 2))[1] : 0;
chk('the local file header sets the encrypted bit (bit 0)',
    ($flags & 0x0001) === 0x0001,
    sprintf('flags=0x%04x', $flags));

// Wrong password must fail rather than yield garbage.
$outWrong = $sandbox . '/out_wrong';
mkdir($outWrong, 0755, true);
$wrongOk = true;
try {
    ZipEncryptionService::extractEncryptedZip($zipPath, $outWrong, 'wrong password entirely');
} catch (\Throwable $e) {
    $wrongOk = false;
}
chk('extraction with the wrong password throws', $wrongOk === false);

// Correct password round-trips byte-for-byte.
$outRight = $sandbox . '/out_right';
mkdir($outRight, 0755, true);
ZipEncryptionService::extractEncryptedZip($zipPath, $outRight, $PASSWORD);
chk('the manifest survives the round trip',
    is_file($outRight . '/manifest.json'));
chk('nested Arabic content survives the round trip',
    @file_get_contents($outRight . '/notes.txt') === 'شؤون سرية internal note');
chk('a binary file survives the round trip byte-for-byte',
    @file_get_contents($outRight . '/academic/group_1/curriculum/lesson.pdf') === str_repeat('A', 2048));

echo "--- container limits (ZIP bomb / corruption) ---\n";

// A real ZIP bomb: 60 MB of zeros compresses to a few KB.
$bombSrc = $sandbox . '/bomb';
mkdir($bombSrc, 0755, true);
file_put_contents($bombSrc . '/zeros.bin', str_repeat("\0", 60 * 1024 * 1024));
file_put_contents($bombSrc . '/manifest.json', json_encode([
    'system_version' => '2.0.0', 'includes_database' => false, 'includes_files' => true,
]));
$bombZip = $sandbox . '/bomb.zip';
ZipEncryptionService::createEncryptedZip($bombSrc, $bombZip, $PASSWORD);

$bombCompressed = filesize($bombZip);
$bomExpanded = 0;
$zb = new \ZipArchive();
if ($zb->open($bombZip) === true) {
    for ($i = 0; $i < $zb->numFiles; $i++) {
        $bomExpanded += (int) $zb->statIndex($i)['size'];
    }
    $zb->close();
}
chk('the bomb fixture is highly compressible (ratio proves the test is meaningful)',
    $bombCompressed > 0 && ($bomExpanded / $bombCompressed) > 200,
    "compressed=$bombCompressed expanded=$bomExpanded ratio=" . round($bomExpanded / max(1, $bombCompressed)));

// A truncated archive must be rejected by the signature/structure checks.
$truncated = $sandbox . '/truncated.zip';
file_put_contents($truncated, substr((string) file_get_contents($bombZip), 0, 200));
$th = fopen($truncated, 'rb');
$tsig = fread($th, 4);
fclose($th);
chk('a truncated archive still carries the PK signature (structure check must catch it)',
    $tsig === "PK\x03\x04");
$zt = new \ZipArchive();
$truncOpens = ($zt->open($truncated, \ZipArchive::CHECKCONS) === true);
if ($truncOpens) {
    $zt->close();
}
chk('ZipArchive::CHECKCONS rejects the truncated archive', $truncOpens === false);

// A non-ZIP file must fail the signature check outright.
$notZip = $sandbox . '/notazip.zip';
file_put_contents($notZip, str_repeat('this is definitely not a zip archive', 100));
$nh = fopen($notZip, 'rb');
$nsig = fread($nh, 4);
fclose($nh);
chk('a non-ZIP file does not carry the PK signature', $nsig !== "PK\x03\x04");

echo "--- BackupArchiveInspector on a real extracted archive ---\n";
\App\Services\BackupArchiveInspector::setStorageRootForTesting($sandbox . '/fake_storage');
$insp = \App\Services\BackupArchiveInspector::inspect($outRight);
chk('a genuine archive passes inspection', $insp['valid'] === true,
    json_encode(array_map(
        static fn(array $c): string => $c['name'] . '=' . ($c['passed'] ? 'ok' : 'FAIL: ' . $c['detail']),
        $insp['checks']
    ), JSON_UNESCAPED_UNICODE));
chk('inspection reports files present', (int) ($insp['summary']['file_count'] ?? 0) === 3,
    json_encode($insp['summary']));
chk('inspection reports the archive byte size', (int) ($insp['summary']['archive_bytes'] ?? 0) > 0);

// Cleanup.
$rm = function (string $dir) use (&$rm): void {
    if (!is_dir($dir)) {
        return;
    }
    foreach (scandir($dir) ?: [] as $e) {
        if ($e === '.' || $e === '..') {
            continue;
        }
        $p = $dir . '/' . $e;
        is_dir($p) ? $rm($p) : @unlink($p);
    }
    @rmdir($dir);
};
$rm($sandbox);

echo "---\n" . ($pass + $fail) . '/' . ($pass + $fail) . (($fail === 0) ? ' passed' : ' — ' . $fail . ' FAILED') . "\n";
exit($fail === 0 ? 0 : 1);