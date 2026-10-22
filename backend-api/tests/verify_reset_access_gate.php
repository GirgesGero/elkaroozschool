<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/Services/ResetAccessGate.php';

$storage = dirname(__DIR__) . '/storage';
if (!is_dir($storage)) mkdir($storage, 0700, true);
$path = $storage . '/.reset-gate-test-' . bin2hex(random_bytes(6)) . '.json';
$gate = new App\Services\ResetAccessGate($path);
$now = time();
$checks = [];
$checks[] = [$gate->decision(['iat' => $now - 100, 'app_metadata' => ['role' => 'trainee']]) === null, 'no cutoff leaves normal sessions unchanged'];
$gate->writeState(['run_id' => 'run-test', 'status' => 'IN_PROGRESS', 'cutoff_iat' => $now]);
$checks[] = [($gate->readState()['run_id'] ?? null) === 'run-test', 'current reset state is readable for safe resume'];
$checks[] = [$gate->decision(['iat' => $now - 1, 'app_metadata' => ['role' => 'admin']], '/backup/create') === 'RESET_IN_PROGRESS', 'active reset blocks even admin access to unrelated API routes'];
$checks[] = [$gate->decision(['iat' => $now - 1, 'app_metadata' => ['role' => 'admin']], '/system-reset/execute') === null, 'admin may resume only through the reset endpoint'];
$checks[] = [$gate->decision(['iat' => $now + 1, 'app_metadata' => ['role' => 'servant']], '/system-reset/execute') === 'RESET_IN_PROGRESS', 'non-admin cannot use reset endpoints'];
$gate->writeState(['run_id' => 'run-test', 'status' => 'COMPLETE', 'cutoff_iat' => $now]);
$checks[] = [$gate->decision(['iat' => $now + 1, 'app_metadata' => ['role' => 'trainee']]) === null, 'completed reset allows only a still-valid token to reach other guards'];
file_put_contents($path, '{"invalid":true}');
$checks[] = [$gate->decision(['iat' => $now + 1, 'app_metadata' => ['role' => 'admin']]) === 'RESET_STATE_INVALID', 'corrupt cutoff state fails closed'];
@unlink($path);

$failed = 0;
foreach ($checks as [$passed, $message]) {
    printf("%s %s\n", $passed ? 'PASS' : 'FAIL', $message);
    $failed += $passed ? 0 : 1;
}
printf("\n%d/%d checks passed\n", count($checks) - $failed, count($checks));
exit($failed === 0 ? 0 : 1);
