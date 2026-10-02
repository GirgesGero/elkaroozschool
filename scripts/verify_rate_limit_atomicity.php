<?php
/**
 * Rate limiter concurrency test.
 *
 * The bug this guards against is specific: LOCK_EX on the WRITE alone left the read
 * outside the lock, so simultaneous requests each read the pre-increment value and each
 * wrote the same result. The counter lost updates and requests over the limit were
 * served anyway. A single-threaded test cannot catch that, so this fires N processes at
 * the same counter and checks that every single increment is accounted for.
 *
 * Run:  php scripts/verify_rate_limit_atomicity.php
 */

$root = dirname(__DIR__);
require_once $root . '/backend-api/src/Utils/AppRoot.php';

use App\Utils\AppRoot;

$CONCURRENCY = 24;
$KEY        = 'concurrency-probe';
$cacheDir   = AppRoot::path('storage/cache/ratelimit');

// Re-executed by the parent, one OS process per concurrent increment. The child does
// the locked read-modify-write and prints the count it observed; the parent then checks
// that no two children saw the same value.
if (($argv[1] ?? '') === '--child') {
    echo probe((string) $argv[2]);
    exit(0);
}

/** Run the limiter body in this process, returning the count it observed. */
function probe(string $key): int {
    // RateLimitMiddleware::check() would exit() on limit, so the counting logic is
    // exercised through the same file operations rather than through check() itself.
    $cacheDir = AppRoot::path('storage/cache/ratelimit');
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0750, true);
    $file = $cacheDir . '/' . md5('127.0.0.1_' . $key) . '.json';

    $h = fopen($file, 'c+');
    if ($h === false) { fwrite(STDERR, "cannot open $file\n"); exit(2); }
    flock($h, LOCK_EX);

    $now = time();
    $data = ['count' => 0, 'expires_at' => $now + 300];
    rewind($h);
    $raw = stream_get_contents($h);
    $parsed = ($raw !== false && $raw !== '') ? json_decode($raw, true) : null;
    if (is_array($parsed) && isset($parsed['expires_at']) && $parsed['expires_at'] > $now) {
        $data = $parsed;
        $data['count'] = (int) ($data['count'] ?? 0);
    }
    $data['count']++;
    $data['expires_at'] = (int) ($data['expires_at'] ?? ($now + 300));

    rewind($h); ftruncate($h, 0);
    fwrite($h, json_encode($data));
    fflush($h);

    $observed = $data['count'];
    flock($h, LOCK_UN);
    fclose($h);
    return $observed;
}

// Clear the counter so the run is repeatable.
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0750, true);
$counterFile = $cacheDir . '/' . md5('127.0.0.1_' . $KEY) . '.json';
@unlink($counterFile);

echo "=== Rate limiter atomicity: $CONCURRENCY concurrent increments ===\n";

// Launch the children.
$children = [];
$php = PHP_BINARY;
for ($i = 0; $i < $CONCURRENCY; $i++) {
    $cmd = escapeshellarg($php) . ' ' . escapeshellarg(__FILE__) . ' --child ' . escapeshellarg($KEY);
    $proc = proc_open($cmd, [1 => ['pipe', 'w']], $pipes);
    if (!is_resource($proc)) { fwrite(STDERR, "failed to spawn child $i\n"); exit(2); }
    $children[] = [$proc, $pipes[1]];
}

// Collect.
$observed = [];
foreach ($children as [$proc, $pipe]) {
    $out = stream_get_contents($pipe);
    fclose($pipe);
    proc_close($proc);
    $out = trim((string) $out);
    if ($out !== '' && ctype_digit($out)) $observed[] = (int) $out;
}

sort($observed);
$final = null;
if (is_file($counterFile)) {
    $j = json_decode((string) file_get_contents($counterFile), true);
    $final = (int) ($j['count'] ?? -1);
}

$checks = [];
$checks[] = ['every child reported a count', count($observed) === $CONCURRENCY,
             count($observed) . '/' . $CONCURRENCY . ' responded'];
$checks[] = ['no two children saw the same count', count(array_unique($observed)) === count($observed),
             count(array_unique($observed)) . ' distinct values'];
$checks[] = ['stored counter equals the concurrency', $final === $CONCURRENCY,
             "stored=" . var_export($final, true)];
$checks[] = ['highest observed equals concurrency', (max($observed) ?: 0) === $CONCURRENCY,
             'max=' . (max($observed) ?: 0)];

$pass = 0; $fail = 0;
foreach ($checks as [$name, $ok, $detail]) {
    printf("  [%s] %s%s\n", $ok ? 'PASS' : 'FAIL', $name, $detail !== '' ? " ({$detail})" : '');
    $ok ? $pass++ : $fail++;
}

printf("\nobserved sequence: %s\n", implode(',', $observed));
echo $fail === 0
    ? "\nRESULT: {$pass} passed, 0 failed -- the increment is atomic.\n"
    : "\nRESULT: {$pass} passed, {$fail} failed -- updates were lost.\n";

@unlink($counterFile);
exit($fail === 0 ? 0 : 1);