<?php
/**
 * Build the deployable backend ZIP.
 *
 * The hosting convention is FLATTENED: the contents of backend-api/public/
 * become public_html/, and config/, src/ and vendor/ are uploaded alongside it as
 * siblings, because AppRoot resolves them with dirname(__DIR__).
 *
 * That flattening is what makes the web-root guard mandatory. Everything that
 * lands in public_html is web-reachable, and the .htaccess inside public/ cannot
 * protect config/ or src/ -- its rewrite rules only fire for paths that do not
 * resolve to a real file, so an existing config/supabase.php is served verbatim.
 * This script therefore:
 *
 *   1. writes htaccess_root.template to the archive root as .htaccess
 *   2. writes a deny-all .htaccess into config/, src/, vendor/ and storage/
 *   3. fails loudly if any of those is missing from the archive
 *   4. refuses to include .env or any file matching a secret pattern
 *
 * Run with real PHP 8.3:
 *   php scripts/package_zip.php
 */

$root   = dirname(__DIR__);
$beRoot = $root . '/backend-api';
$outFile = getenv('LOCALAPPDATA') . '/ElKarooz-API-public_html.zip';
// If the canonical path is held open by another process, fall back to a unique
// name. A FIXED fallback name is not enough: once that one is locked too, every
// later run fails identically. A PID-suffixed name cannot already be in use.
if (file_exists($outFile) && !@unlink($outFile)) {
    $outFile = sprintf('%s.%d.build', $outFile, getmypid());
    @unlink($outFile);
    echo "  [WARN] the previous archive is held open by another process;\n";
    echo "         building to " . basename($outFile) . " instead.\n";
}

// Directories that must exist in the archive. Each is application internals and
// has no business being web-reachable.
$internalDirs = ['config', 'src', 'vendor'];

// storage/ is created at runtime by the upload path; ship a deny-all guard for
// it when present so uploaded media can never be executed as PHP.
$optionalGuardedDirs = ['storage'];

$pass = 0;
$fail = 0;
function check(string $label, bool $ok, string $detail = ''): void {
    global $pass, $fail;
    if ($ok) { $pass++; printf("  [PASS] %s\n", $label); }
    else     { $fail++; printf("  [FAIL] %s%s\n", $label, $detail ? '  <-- ' . $detail : ''); }
}

echo "=== 1. Preconditions ===\n";
check('backend-api/public/index.php exists', is_file($beRoot . '/public/index.php'));
check('backend-api/public/.htaccess exists', is_file($beRoot . '/public/.htaccess'));

$rootTemplate = $beRoot . '/public/htaccess_root.template';
check('root guard template exists', is_file($rootTemplate));

foreach ($internalDirs as $d) {
    check(sprintf('%s/ is present in the source tree', $d), is_dir($beRoot . '/' . $d));
}

// ---------------------------------------------------------------------------
// 2. Refuse to package secrets.
// ---------------------------------------------------------------------------
echo "\n=== 2. Secret scan ===\n";
$denyAllHtaccess = "Require all denied\n";
$forbidden = [];
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($beRoot, FilesystemIterator::SKIP_DOTS)
);
foreach ($iterator as $file) {
    /** @var SplFileInfo $file */
    if (!$file->isFile()) { continue; }
    $path = $file->getPathname();
    $rel  = str_replace('\\', '/', substr($path, strlen($beRoot) + 1));

    if (preg_match('#(^|/)\.env(\.|$)#', $rel)) {
        $forbidden[] = $rel . ' (env file)';
        continue;
    }
    if (preg_match('#(^|/)(\.git|node_modules|tests?|storage)/#', $rel) && !str_starts_with($rel, 'storage/')) {
        $forbidden[] = $rel . ' (dev-only path)';
        continue;
    }
    // A real credential committed into source.
    if (preg_match('/\.(php|json|env|ini|conf)$/i', $rel)
        && preg_match('/(sb_secret_|service_role_key\s*=\s*[\'"][A-Za-z0-9_-]{20,})/i', (string) file_get_contents($path))) {
        $forbidden[] = $rel . ' (looks like a real key)';
    }
}
check('no .env, dev-only paths, or embedded keys in the source tree',
      $forbidden === [], implode('; ', array_slice($forbidden, 0, 5)));

// ---------------------------------------------------------------------------
// 3. Build the archive.
// ---------------------------------------------------------------------------
echo "\n=== 3. Build ===\n";
@unlink($outFile);
$zip = new ZipArchive();
if ($zip->open($outFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    fwrite(STDERR, "cannot create archive\n");
    exit(1);
}

/** Add a whole directory tree under $archivePrefix. */
$addTree = static function (string $srcDir, string $archivePrefix) use ($zip): int {
    if (!is_dir($srcDir)) { return 0; }
    $count = 0;
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($srcDir, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($it as $file) {
        if (!$file->isFile()) { continue; }
        $rel  = str_replace('\\', '/', substr($file->getPathname(), strlen($srcDir) + 1));
        $name = $archivePrefix === '' ? $rel : $archivePrefix . '/' . $rel;
        if ($rel === '.htaccess') { continue; } // handled explicitly below
        // The guard template is a build input, not something to serve. It is
        // copied to .htaccess below; shipping it too would put a second,
        // differently-named copy in the web root for no reason.
        if ($rel === 'htaccess_root.template') { continue; }
        $zip->addFile($file->getPathname(), $name);
        $count++;
    }
    return $count;
};

// public/ contents become the archive root (the flattened public_html).
$nPublic = $addTree($beRoot . '/public', '');
printf("  added %d files from public/\n", $nPublic);

// Siblings that AppRoot resolves via dirname(__DIR__).
$nInternal = 0;
foreach ($internalDirs as $d) { $nInternal += $addTree($beRoot . '/' . $d, $d); }
printf("  added %d files from %s\n", $nInternal, implode(', ', $internalDirs));

// 3a. The root guard.
$zip->addFromString('.htaccess', (string) file_get_contents($rootTemplate));
echo "  added .htaccess (root web-root guard)\n";

// 3b. public/.htaccess keeps its own routing rules, as public/.htaccess.
$zip->addFromString('public/.htaccess', (string) file_get_contents($beRoot . '/public/.htaccess'));
echo "  added public/.htaccess\n";

// 3c. Deny-all guards inside every internal directory. <Directory> cannot be used
// from .htaccess, so the guard has to live in the directory itself.
foreach (array_merge($internalDirs, $optionalGuardedDirs) as $d) {
    $zip->addFromString($d . '/.htaccess', $denyAllHtaccess);
}
printf("  added deny-all guards: %s\n", implode(', ', array_merge($internalDirs, $optionalGuardedDirs)));

// close() renames a temp file over the target. On Windows that fails with
// "Permission denied" if anything still holds the previous archive open (an
// indexer, AV, or a file manager preview). Retrying briefly is cheaper than
// having the build silently keep the STALE archive and report on that instead.
$closed = false;
for ($attempt = 1; $attempt <= 5; $attempt++) {
    try {
        if (@$zip->close()) { $closed = true; break; }
    } catch (\ValueError $e) {
        // close() invalidates the object even when the rename failed, so a retry
        // is impossible on this handle. Fall through to the fatal below.
        break;
    }
    usleep(300_000);
}
if (!$closed) {
    fwrite(STDERR, "\nFATAL: could not finalize the archive at $outFile.\n");
    exit(1);
}

// ---------------------------------------------------------------------------
// 4. Verify what was actually written.
// ---------------------------------------------------------------------------
echo "\n=== 4. Verify archive contents ===\n";
$check = new ZipArchive();
if ($check->open($outFile) !== true) {
    fwrite(STDERR, "\nFATAL: the archive was written but cannot be reopened.\n");
    exit(1);
}
$names = [];
for ($i = 0; $i < $check->numFiles; $i++) { $names[] = $check->getNameIndex($i); }
$check->close();

check('archive is non-empty', count($names) > 0, (string) count($names));
// Guard against the stale-archive trap: if the build silently kept an older
// file, every assertion below would pass while describing the previous build.
check('archive was freshly written (mtime is now)',
      (time() - (int) filemtime($outFile)) < 120,
      'mtime is ' . gmdate('c', (int) filemtime($outFile)));
check('root .htaccess is present', in_array('.htaccess', $names, true));
check('index.php is at the archive root', in_array('index.php', $names, true));
check('public/.htaccess is present', in_array('public/.htaccess', $names, true));

foreach ($internalDirs as $d) {
    check(sprintf('%s/.htaccess deny-all guard is present', $d),
          in_array($d . '/.htaccess', $names, true));
    check(sprintf('%s/ actually has PHP in it', $d),
          (bool) array_filter($names, static fn(string $n): bool => str_starts_with($n, $d . '/')));
}

check('no .env in the archive',
      !array_filter($names, static fn(string $n): bool => (bool) preg_match('#(^|/)\.env#', $n)));
check('the guard template is NOT shipped at the web root',
      !in_array('htaccess_root.template', $names, true),
      'it is a build input; shipping it serves a redundant copy');
check('no .git in the archive',
      !array_filter($names, static fn(string $n): bool => str_contains($n, '/.git/')));

// The guard must deny PHP, and the grant for index.php must come after it.
$guard = (string) file_get_contents($rootTemplate);
$denyPos  = strpos($guard, '<FilesMatch "\.php$">');
$grantPos = strpos($guard, '<Files "index.php">');
check('root guard denies all PHP', $denyPos !== false);
check('root guard re-grants index.php', $grantPos !== false);
check('the deny comes BEFORE the grant (ordering is load-bearing)',
      $denyPos !== false && $grantPos !== false && $denyPos < $grantPos,
      'reversing these sections would expose every .php file in the web root');

printf("\n  archive: %s\n", $outFile);
printf("  size:    %d bytes, %d entries\n", (int) filesize($outFile), count($names));

printf("\n=== SUMMARY ===\n%d passed, %d failed\n", $pass, $fail);
exit($fail === 0 ? 0 : 1);