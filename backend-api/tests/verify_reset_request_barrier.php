<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Services/ResetAccessGate.php';

use App\Services\ResetAccessGate;

if (($argv[1] ?? '') === '--worker') {
    $mode = (string) ($argv[2] ?? '');
    $statePath = (string) ($argv[3] ?? '');
    $attemptPath = (string) ($argv[4] ?? '');
    $readyPath = (string) ($argv[5] ?? '');
    $holdMs = max(0, (int) ($argv[6] ?? 0));
    file_put_contents($attemptPath, 'attempting');
    $gate = new ResetAccessGate($statePath);
    $lease = match ($mode) {
        'exclusive' => $gate->acquireExclusiveResetLease(),
        'execution' => $gate->acquireResetExecutionLease(),
        default => $gate->acquireMutationLease(),
    };
    file_put_contents($readyPath, 'acquired');
    if ($holdMs > 0) {
        usleep($holdMs * 1000);
    }
    $gate->releaseLease($lease);
    exit(0);
}

$checks = [];
$check = static function (bool $condition, string $message) use (&$checks): void {
    $checks[] = [$condition, $message];
};
$base = rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'reset-lock-' . bin2hex(random_bytes(8));
if (!mkdir($base, 0700, true)) {
    fwrite(STDERR, "FAIL could not create isolated lock-test directory\n");
    exit(1);
}
$statePath = $base . DIRECTORY_SEPARATOR . 'auth-cutoff.json';
$holderAttempt = $base . DIRECTORY_SEPARATOR . 'holder.attempt';
$holderReady = $base . DIRECTORY_SEPARATOR . 'holder.ready';
$waiterAttempt = $base . DIRECTORY_SEPARATOR . 'waiter.attempt';
$waiterReady = $base . DIRECTORY_SEPARATOR . 'waiter.ready';
$processes = [];
$spawn = static function (string $mode, string $attempt, string $ready, int $holdMs) use (&$processes, $statePath): mixed {
    $command = [PHP_BINARY, __FILE__, '--worker', $mode, $statePath, $attempt, $ready, (string) $holdMs];
    $pipes = [];
    $process = proc_open($command, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, dirname(__DIR__, 2));
    if (!is_resource($process)) {
        return false;
    }
    foreach ($pipes as $pipe) {
        fclose($pipe);
    }
    $processes[] = $process;
    return $process;
};
$waitFor = static function (string $path, int $timeoutMs = 2500): bool {
    $deadline = microtime(true) + ($timeoutMs / 1000);
    do {
        if (file_exists($path)) {
            return true;
        }
        usleep(10000);
    } while (microtime(true) < $deadline);
    return file_exists($path);
};

try {
    $holder = $spawn('shared', $holderAttempt, $holderReady, 800);
    $check($holder !== false && $waitFor($holderReady), 'real child process acquired a shared mutation lease');

    $waiter = $spawn('exclusive', $waiterAttempt, $waiterReady, 0);
    $check($waiter !== false && $waitFor($waiterAttempt), 'real child process attempted the exclusive reset lease');
    usleep(150000);
    $check(!file_exists($waiterReady), 'exclusive reset lease waits while an in-flight mutation holds its lease');

    if (is_resource($holder)) {
        proc_close($holder);
    }
    $check($waiter !== false && $waitFor($waiterReady), 'exclusive reset lease acquires after the in-flight mutation exits');
    if (is_resource($waiter)) {
        proc_close($waiter);
    }

    $executionHolderAttempt = $base . DIRECTORY_SEPARATOR . 'execution-holder.attempt';
    $executionHolderReady = $base . DIRECTORY_SEPARATOR . 'execution-holder.ready';
    $executionWaiterAttempt = $base . DIRECTORY_SEPARATOR . 'execution-waiter.attempt';
    $executionWaiterReady = $base . DIRECTORY_SEPARATOR . 'execution-waiter.ready';
    $executionHolder = $spawn('execution', $executionHolderAttempt, $executionHolderReady, 700);
    $executionHolderAcquired = $executionHolder !== false && $waitFor($executionHolderReady);
    $check($executionHolderAcquired, 'one reset request acquired the execution mutex');
    $executionWaiter = $spawn('execution', $executionWaiterAttempt, $executionWaiterReady, 0);
    $check($executionWaiter !== false && $waitFor($executionWaiterAttempt), 'a concurrent reset request attempted the execution mutex');
    usleep(120000);
    $check($executionHolderAcquired && !file_exists($executionWaiterReady), 'concurrent reset executions cannot overlap');
    if (is_resource($executionHolder)) {
        proc_close($executionHolder);
    }
    $executionWaiterAcquired = $executionWaiter !== false && $waitFor($executionWaiterReady);
    $check($executionHolderAcquired && $executionWaiterAcquired, 'queued reset execution starts after the prior request exits');
    if (is_resource($executionWaiter)) {
        proc_close($executionWaiter);
    }

    $gate = new ResetAccessGate($statePath);
    $gate->writeState(['run_id' => '11111111-1111-4111-8111-111111111111', 'status' => 'IN_PROGRESS', 'cutoff_iat' => 100]);
    $check($gate->decision(['role' => 'admin', 'iat' => 99], '/storage/upload') === 'RESET_IN_PROGRESS',
        'a post-drain mutation is denied by the durable active-reset state');
    $check($gate->decision(['role' => 'admin', 'iat' => 99], '/system-reset/execute') === null,
        'the admin reset continuation remains reachable while the gate is active');

    $gate->writeState(['run_id' => '11111111-1111-4111-8111-111111111111', 'status' => 'COMPLETE', 'cutoff_iat' => 200]);
    $check($gate->decision(['role' => 'admin', 'iat' => 199], '/storage/upload') === 'TOKEN_BEFORE_RESET',
        'a token issued before reset completion is denied afterward');
    $check($gate->decision(['role' => 'admin', 'iat' => 200], '/storage/upload') === null,
        'a token at the persisted completion cutoff may proceed');
} finally {
    foreach ($processes as $process) {
        if (is_resource($process)) {
            proc_terminate($process);
            proc_close($process);
        }
    }
    foreach (glob($base . DIRECTORY_SEPARATOR . '*') ?: [] as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
    @rmdir($base);
}

$failed = 0;
foreach ($checks as [$passed, $message]) {
    printf("%s %s\n", $passed ? 'PASS' : 'FAIL', $message);
    $failed += $passed ? 0 : 1;
}
printf("\n%d/%d checks passed\n", count($checks) - $failed, count($checks));
exit($failed === 0 ? 0 : 1);
