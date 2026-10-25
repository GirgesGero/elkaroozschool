<?php

declare(strict_types=1);

/**
 * Two-session PostgreSQL regression: a protected mutation that already holds
 * FOR SHARE must drain before reset publishes its gate; the next writer must be
 * rejected. Run only against a disposable local database after migrations:
 * RESET_DB_TEST_ACK=LOCAL_DISPOSABLE_ONLY DATABASE_URL=postgresql://... php verify_reset_database_concurrency.php
 */

$checks = [];
$check = static function (bool $condition, string $message) use (&$checks): void {
    $checks[] = [$condition, $message];
};
$databaseUrl = getenv('DATABASE_URL') ?: '';
$ack = getenv('RESET_DB_TEST_ACK') ?: '';
$parts = parse_url($databaseUrl);
$host = is_array($parts) ? strtolower(trim((string) ($parts['host'] ?? ''), '[]')) : '';
if ($ack !== 'LOCAL_DISPOSABLE_ONLY' || !in_array($host, ['localhost', '127.0.0.1', '::1'], true)) {
    fwrite(STDERR, "REFUSED: set RESET_DB_TEST_ACK=LOCAL_DISPOSABLE_ONLY and use a loopback DATABASE_URL.\n");
    exit(2);
}
if (!is_array($parts) || !in_array(strtolower((string) ($parts['scheme'] ?? '')), ['postgres', 'postgresql'], true)) {
    fwrite(STDERR, "REFUSED: DATABASE_URL must use postgres:// or postgresql://.\n");
    exit(2);
}

$database = is_array($parts) ? rawurldecode(ltrim((string) ($parts['path'] ?? ''), '/')) : '';
if ($database === '') {
    fwrite(STDERR, "REFUSED: DATABASE_URL must include a database name.\n");
    exit(2);
}
$query = [];
parse_str((string) ($parts['query'] ?? ''), $query);
$connectionEnv = array_merge(getenv(), [
    'PGHOST' => $host,
    'PGPORT' => (string) ($parts['port'] ?? 5432),
    'PGDATABASE' => $database,
    'PGSSLMODE' => (string) ($query['sslmode'] ?? 'prefer'),
]);
foreach ([
    'user' => 'PGUSER', 'pass' => 'PGPASSWORD',
    'sslrootcert' => 'PGSSLROOTCERT', 'sslcert' => 'PGSSLCERT', 'sslkey' => 'PGSSLKEY',
    'application_name' => 'PGAPPNAME', 'connect_timeout' => 'PGCONNECT_TIMEOUT', 'options' => 'PGOPTIONS',
] as $urlKey => $envKey) {
    if (isset($parts[$urlKey])) {
        $connectionEnv[$envKey] = rawurldecode((string) $parts[$urlKey]);
    } elseif (isset($query[$urlKey])) {
        $connectionEnv[$envKey] = (string) $query[$urlKey];
    }
}
$psql = getenv('PSQL_BIN') ?: 'psql';
$runPsql = static function (string $sql) use ($psql, $database, $connectionEnv): array {
    $pipes = [];
    $process = proc_open([$psql, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '--dbname', $database, '--command', $sql],
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null, $connectionEnv);
    if (!is_resource($process)) {
        return [127, '', 'could not start psql'];
    }
    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    return [proc_close($process), (string) $stdout, (string) $stderr];
};
$startPsql = static function (string $sql) use ($psql, $database, $connectionEnv): array|false {
    $pipes = [];
    $process = proc_open([$psql, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '--dbname', $database, '--command', $sql],
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null, $connectionEnv);
    if (!is_resource($process)) {
        return false;
    }
    fclose($pipes[0]);
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);
    return [$process, $pipes[1], $pipes[2], '', ''];
};
$readUntil = static function (array &$child, string $marker, int $timeoutMs): bool {
    [$process, $stdout, $stderr] = $child;
    $deadline = microtime(true) + $timeoutMs / 1000;
    do {
        $read = [$stdout, $stderr];
        $write = null;
        $except = null;
        @stream_select($read, $write, $except, 0, 50000);
        foreach ($read as $stream) {
            $chunk = stream_get_contents($stream);
            if ($stream === $stdout) {
                $child[3] .= (string) $chunk;
            } else {
                $child[4] .= (string) $chunk;
            }
        }
        if (str_contains($child[3], $marker)) {
            return true;
        }
        $status = proc_get_status($process);
        if (!$status['running']) {
            foreach ([1 => $stdout, 2 => $stderr] as $index => $stream) {
                $chunk = stream_get_contents($stream);
                $child[$index === 1 ? 3 : 4] .= (string) $chunk;
            }
            return str_contains($child[3], $marker);
        }
    } while (microtime(true) < $deadline);
    return str_contains($child[3], $marker);
};
$finishChild = static function (array &$child, bool $terminate = false): int {
    [$process, $stdout, $stderr] = $child;
    if ($terminate && proc_get_status($process)['running']) {
        proc_terminate($process);
    }
    stream_set_blocking($stdout, true);
    stream_set_blocking($stderr, true);
    $child[3] .= (string) stream_get_contents($stdout);
    $child[4] .= (string) stream_get_contents($stderr);
    fclose($stdout);
    fclose($stderr);
    return proc_close($process);
};
$uuid = static function (): string {
    $hex = bin2hex(random_bytes(16));
    $hex[12] = '4';
    $hex[16] = dechex((hexdec($hex[16]) & 0x3) | 0x8);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-'
        . substr($hex, 16, 4) . '-' . substr($hex, 20, 12);
};

[$preflightCode, $preflightOut, $preflightErr] = $runPsql(
    "SELECT CASE WHEN (SELECT active_run_id FROM public.system_reset_gate WHERE singleton = true) IS NULL "
    . "AND NOT EXISTS (SELECT 1 FROM public.system_reset_runs WHERE status IN ('PREPARED','MEDIA_CLEANUP','DATA_CLEARED','PARTIAL')) "
    . "THEN 'READY' ELSE 'BUSY' END"
);
if ($preflightCode !== 0 || trim($preflightOut) !== 'READY') {
    fwrite(STDERR, "REFUSED: migration/schema unavailable or the disposable database already has an open reset. "
        . trim($preflightErr) . "\n");
    exit(2);
}

$runId = $uuid();
$backupId = $uuid();
$writer = null;
$resetter = null;
$cleanupOk = true;
try {
    $writerSql = "BEGIN; DELETE FROM public.media_assets WHERE false; SELECT 'MUTATION_LOCK_HELD'; "
        . "SELECT pg_sleep(3); COMMIT;";
    $writer = $startPsql($writerSql);
    $writerReady = is_array($writer) && $readUntil($writer, 'MUTATION_LOCK_HELD', 2000);
    $check($writerReady, 'protected mutation acquired the database shared gate lock');
    if (!$writerReady) {
        throw new RuntimeException('writer session did not reach its lock-held marker: ' . ($writer[4] ?? ''));
    }

    $resetSql = "BEGIN; SELECT active_run_id FROM public.system_reset_gate WHERE singleton = true FOR UPDATE; "
        . "INSERT INTO public.backup_records (id, filename, file_size_bytes, storage_type, storage_path, status, checksum_sha256) "
        . "VALUES ('{$backupId}', 'reset-freeze-race-{$runId}.zip', 0, 'HOSTINGER', '/reset-freeze-race.zip', 'COMPLETED', repeat('b',64)); "
        . "INSERT INTO public.system_reset_runs (id, actor_id, backup_id, status) "
        . "VALUES ('{$runId}', NULL, '{$backupId}', 'MEDIA_CLEANUP'); "
        . "UPDATE public.system_reset_gate SET active_run_id = '{$runId}', updated_at = clock_timestamp() WHERE singleton = true; "
        . "SELECT 'RESET_GATE_PUBLISHED'; COMMIT;";
    $resetter = $startPsql($resetSql);
    $check(is_array($resetter), 'second PostgreSQL session started the reset-side lock transaction');
    if (!is_array($resetter)) {
        throw new RuntimeException('could not start reset-side psql session');
    }
    $publishedTooEarly = $readUntil($resetter, 'RESET_GATE_PUBLISHED', 350);
    $check(!$publishedTooEarly, 'reset-side FOR UPDATE waits for the in-flight mutation transaction');

    $writerExit = $finishChild($writer);
    $writer = null;
    $check($writerExit === 0, 'in-flight mutation transaction committed successfully');
    $published = $readUntil($resetter, 'RESET_GATE_PUBLISHED', 4000);
    $resetExit = $finishChild($resetter);
    $resetter = null;
    $check($published && $resetExit === 0, 'reset publishes its active gate only after the prior writer drains');

    [$writeCode, $writeOut, $writeErr] = $runPsql('DELETE FROM public.media_assets WHERE false');
    $check($writeCode !== 0 && str_contains($writeErr, 'SYSTEM_RESET_WRITE_FROZEN'),
        'a new database writer is rejected after the active reset gate is committed');
} catch (Throwable $error) {
    $checks[] = [false, 'race harness completed: ' . $error->getMessage()];
} finally {
    if (is_array($writer)) {
        $finishChild($writer, true);
    }
    if (is_array($resetter)) {
        $finishChild($resetter, true);
    }
    [$cleanupCode, , $cleanupErr] = $runPsql(
        "BEGIN; UPDATE public.system_reset_gate SET active_run_id = NULL, last_completed_at = NULL, "
        . "auth_cutoff_iat = NULL, updated_at = clock_timestamp() WHERE active_run_id = '{$runId}'; "
        . "DELETE FROM public.system_reset_runs WHERE id = '{$runId}'; "
        . "DELETE FROM public.backup_records WHERE id = '{$backupId}'; COMMIT;"
    );
    $cleanupOk = $cleanupCode === 0;
    $check($cleanupOk, 'synthetic reset and backup fixtures were cleaned up' . ($cleanupOk ? '' : ': ' . trim($cleanupErr)));
}

$failed = 0;
foreach ($checks as [$passed, $message]) {
    printf("%s %s\n", $passed ? 'PASS' : 'FAIL', $message);
    $failed += $passed ? 0 : 1;
}
printf("\n%d/%d checks passed\n", count($checks) - $failed, count($checks));
exit($failed === 0 ? 0 : 1);
