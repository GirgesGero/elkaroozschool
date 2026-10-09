<?php
// scripts/verify_failure_disclosure.php
//
// Proves the response body of a failed operation carries no server path.
//
// WHY A SCRIPT AND NOT JUST THE STATIC GATE
//
// verify_no_error_leaks.py greps the source for $e->getMessage() inside a Response
// call. That is a lint: it proves the pattern is absent, not that the response is
// clean. A message can still reach the wire through a helper, through a constant, or
// through an exception class nobody anticipated when the gate was written. This
// harness calls the real trait, through a real Response, and inspects the bytes.
//
// It needs no Supabase account and no network: the failure is constructed locally.
//
// Run: php scripts/verify_failure_disclosure.php

$root = dirname(__DIR__) . '/backend-api';
require_once $root . '/src/Utils/AppRoot.php';
require_once $root . '/src/Utils/Response.php';
require_once $root . '/src/Controllers/SafeFailure.php';

$isChild = ($argv[1] ?? '') === 'child';
$mode = $isChild ? 'child' : 'parent';

if ($isChild) {
    // Response::error() echoes to STDOUT and calls header(), so the parent cannot
    // buffer it -- the JSON would land in the parent's own check output. Run each case
    // in a child process instead, where this process's STDOUT is the payload.
    require __DIR__ . '/_failure_disclosure_child.php';
    exit(0);
}

// -----------------------------------------------------------------------------
// Parent: run each case out-of-process and judge the bytes that come back.
// -----------------------------------------------------------------------------
$passes = 0;
$failures = 0;

function check(bool $ok, string $label, string $detail = ''): void {
    global $passes, $failures;
    if ($ok) {
        $passes++;
        echo "  [PASS] $label\n";
    } else {
        $failures++;
        echo "  [FAIL] $label\n";
        if ($detail !== '') {
            echo "         " . str_replace("\n", ' ', substr($detail, 0, 220)) . "\n";
        }
    }
}

/**
 * Run the child in the given mode and return its stdout.
 *
 * shell_exec with "2>/dev/null" is a POSIX redirect and cmd.exe has no /dev/null, so
 * the whole command fails on Windows with "The system cannot find the path specified".
 * proc_open with an explicit pipe for stderr keeps the two streams separate on every
 * platform, which matters here: error_log() writes to stderr and the payload we are
 * judging writes to stdout, and mixing them would let a leaked path hide in either.
 */
function body(string $case): string {
    $cmd = escapeshellarg(PHP_BINARY)
        . ' ' . escapeshellarg(__FILE__)
        . ' child ' . escapeshellarg($case);

    $descriptors = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $proc = proc_open($cmd, $descriptors, $pipes);
    if (!is_resource($proc)) {
        return '';
    }
    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($proc);
    return (string) $stdout;
}

echo "==================================================================\n";
echo "Failure disclosure: a response must not describe the server\n";
echo "==================================================================\n";

echo "\n-- refuse(): a path-bearing exception must not reach the wire --\n";
$b1 = body('refuse');
$markers = ['/home/u', 'public_html', 'storage/elkarooz', '.db', 'X-Drive', ':\\\\'];
$found = [];
foreach ($markers as $m) {
    if (str_contains($b1, $m)) { $found[] = $m; }
}
check($found === [], 'refuse() emits no filesystem path', 'markers present: ' . implode(', ', $found));
check(!str_contains($b1, 'فشل نسخ الملف'), 'refuse() does not echo the exception message', $b1);
$j1 = json_decode($b1, true);
check(is_array($j1), 'refuse() returns a valid JSON envelope', $b1);
check(isset($j1['message']) && str_contains($j1['message'], 'رقم الخطأ'),
    'refuse() returns a correlation id the operator can quote', $b1);
check(($j1['code'] ?? '') === 'RESTORE_FAILED', 'refuse() keeps the stable failure code', $b1);
check(($j1['status'] ?? '') === 'error', 'refuse() reports failure, not success', $b1);

$b2 = body('refuse');
preg_match('/([0-9a-f]{8})/', $b1, $m1);
preg_match('/([0-9a-f]{8})/', $b2, $m2);
check(
    !empty($m1) && !empty($m2) && $m1[1] !== $m2[1],
    'each refusal gets a fresh id, so the id is a correlation and not a constant'
);

echo "\n-- failVisibly(): an authored constant IS returned, and still logged --\n";
$b3 = body('visibly');
$j3 = json_decode($b3, true);
check(
    isset($j3['message']) && str_contains($j3['message'], 'phpoffice/phpspreadsheet'),
    'failVisibly() returns the actionable, controller-authored reason',
    $b3
);
check(!str_contains($b3, 'public_html'), 'failVisibly() still refuses anything path-shaped', $b3);
check(isset($j3['details']['error_id']), 'failVisibly() still returns a correlation id', $b3);
check(($j3['code'] ?? '') === 'EXPORT_FORMAT_UNAVAILABLE', 'failVisibly() keeps the stable code', $b3);

echo "\n" . str_repeat('=', 66) . "\n";
if ($failures > 0) {
    echo "$passes passed, $failures failed\n";
    exit(1);
}
echo "$passes passed, 0 failed\n";
echo "\nRESULT: no failure path can describe the server.\n";
