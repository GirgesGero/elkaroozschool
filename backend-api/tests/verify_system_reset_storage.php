<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/Services/SystemResetStorageService.php';

$base = dirname(__DIR__) . '/storage';
if (!is_dir($base) && !mkdir($base, 0700, true) && !is_dir($base)) {
    fwrite(STDERR, "FAIL cannot create test storage root\n");
    exit(1);
}
$root = $base . '/.system-reset-test-' . bin2hex(random_bytes(6));
$makeFile = static function (string $relative, string $contents) use ($root): void {
    $path = $root . '/' . $relative;
    if (!is_dir(dirname($path))) {
        mkdir(dirname($path), 0700, true);
    }
    file_put_contents($path, $contents);
};
$removeTree = static function (string $path) use (&$removeTree): void {
    if (is_link($path) || is_file($path)) {
        @unlink($path);
        return;
    }
    if (!is_dir($path)) {
        return;
    }
    foreach (new FilesystemIterator($path) as $entry) {
        $removeTree($entry->getPathname());
    }
    @rmdir($path);
};

$makeFile('academic/group_1/book.pdf', 'operational');
$makeFile('system/exports/report.csv', 'operational');
$makeFile('bible-dataset/v1/articles/keep.json', 'bible');
$makeFile('backups/full/keep.zip', 'backup');
$makeFile('cache/ratelimit/keep.json', 'cache');
$makeFile('system_reset/auth-cutoff.json', 'security');

$service = new App\Services\SystemResetStorageService($root);
$inventory = $service->inventoryOperationalRoots();
$result = $service->purgeOperationalRoots();
$checks = [
    [($inventory['known_files'] ?? 0) === 2, 'preview counts files in allowlisted operational roots'],
    [($inventory['blocked_paths'] ?? null) === [], 'preview reports no unknown roots in a classified tree'],
    [($result['success'] ?? false) === true, 'known operational roots are cleaned'],
    [!file_exists($root . '/academic/group_1/book.pdf'), 'academic files are deleted'],
    [!file_exists($root . '/system/exports/report.csv'), 'generated export files are deleted'],
    [file_get_contents($root . '/bible-dataset/v1/articles/keep.json') === 'bible', 'Bible dataset is preserved byte-for-byte'],
    [file_get_contents($root . '/backups/full/keep.zip') === 'backup', 'backup files are preserved byte-for-byte'],
    [file_get_contents($root . '/cache/ratelimit/keep.json') === 'cache', 'rate-limit cache is outside reset scope'],
    [file_get_contents($root . '/system_reset/auth-cutoff.json') === 'security', 'reset security state is preserved'],
];

$removeTree($root);
$unknownRoot = $base . '/.system-reset-test-' . bin2hex(random_bytes(6));
mkdir($unknownRoot, 0700, true);
$unknownPath = $unknownRoot . '/unclassified/keep.bin';
mkdir(dirname($unknownPath), 0700, true);
file_put_contents($unknownPath, 'must not be swept');
$unknownResult = (new App\Services\SystemResetStorageService($unknownRoot))->purgeOperationalRoots();
$checks[] = [($unknownResult['success'] ?? true) === false, 'unknown storage roots block cleanup'];
$checks[] = [file_get_contents($unknownPath) === 'must not be swept', 'unknown storage files remain untouched'];
$removeTree($unknownRoot);

$failed = 0;
foreach ($checks as [$passed, $message]) {
    printf("%s %s\n", $passed ? 'PASS' : 'FAIL', $message);
    $failed += $passed ? 0 : 1;
}
printf("\n%d/%d checks passed\n", count($checks) - $failed, count($checks));
exit($failed === 0 ? 0 : 1);
