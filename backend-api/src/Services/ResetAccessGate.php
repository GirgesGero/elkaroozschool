<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

/** Local Hostinger session cutoff used to deny stateless JWTs issued before a reset. */
final class ResetAccessGate
{
    private string $path;

    public function __construct(string $stateFilePath)
    {
        $this->path = $stateFilePath;
    }

    /** @param array{run_id:mixed,status:mixed,cutoff_iat:mixed} $state */
    public function writeState(array $state): void
    {
        $runId = $state['run_id'] ?? null;
        $status = $state['status'] ?? null;
        $cutoff = $state['cutoff_iat'] ?? null;
        if (!is_string($runId) || $runId === '' || strlen($runId) > 64
            || !in_array($status, ['IN_PROGRESS', 'PARTIAL', 'COMPLETE'], true)
            || !is_int($cutoff) || $cutoff < 0) {
            throw new RuntimeException('Reset access state is invalid');
        }

        $directory = dirname($this->path);
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new RuntimeException('Reset access state directory is unavailable');
        }
        $handle = @fopen($this->path, 'c+');
        if ($handle === false) {
            throw new RuntimeException('Reset access state is unavailable');
        }
        try {
            if (!flock($handle, LOCK_EX)) {
                throw new RuntimeException('Reset access state is locked');
            }
            $encoded = json_encode([
                'run_id' => $runId,
                'status' => $status,
                'cutoff_iat' => $cutoff,
                'updated_at' => gmdate('c'),
            ], JSON_UNESCAPED_SLASHES);
            if (!is_string($encoded) || !ftruncate($handle, 0) || fseek($handle, 0) !== 0
                || fwrite($handle, $encoded) !== strlen($encoded) || !fflush($handle)) {
                throw new RuntimeException('Reset access state could not be written');
            }
            @chmod($this->path, 0600);
            flock($handle, LOCK_UN);
        } finally {
            fclose($handle);
        }
    }

    /** @return array{run_id:string,status:string,cutoff_iat:int,updated_at?:string}|null */
    public function readState(): ?array
    {
        if (!file_exists($this->path)) {
            return null;
        }
        $handle = @fopen($this->path, 'rb');
        if ($handle === false) {
            throw new RuntimeException('Reset access state is unavailable');
        }
        try {
            if (!flock($handle, LOCK_SH)) {
                throw new RuntimeException('Reset access state is locked');
            }
            $raw = stream_get_contents($handle);
            flock($handle, LOCK_UN);
        } finally {
            fclose($handle);
        }

        $state = json_decode((string) $raw, true);
        if (!is_array($state)
            || !is_string($state['run_id'] ?? null)
            || !in_array($state['status'] ?? null, ['IN_PROGRESS', 'PARTIAL', 'COMPLETE'], true)
            || !is_int($state['cutoff_iat'] ?? null)) {
            throw new RuntimeException('Reset access state is invalid');
        }
        return $state;
    }

    /**
     * Returns null when the token may proceed, or a stable denial code.
     * During a reset, only an admin may call the dedicated preview/execute endpoints.
     */
    public function decision(array $claims, ?string $requestPath = null): ?string
    {
        try {
            $state = $this->readState();
        } catch (RuntimeException) {
            return 'RESET_STATE_INVALID';
        }
        if ($state === null) {
            return null;
        }

        $role = $claims['app_metadata']['role'] ?? ($claims['role'] ?? null);
        $path = parse_url((string) $requestPath, PHP_URL_PATH) ?: '';
        $path = preg_replace('#^/api#', '', $path);
        $isResetEndpoint = preg_match('#^/system-reset/(preview|execute)/?$#', $path) === 1;
        if (in_array($state['status'], ['IN_PROGRESS', 'PARTIAL'], true)) {
            if ($role !== 'admin' || !$isResetEndpoint) {
                return 'RESET_IN_PROGRESS';
            }
            // The controller separately requires a recent auth_time on every resume.
            return null;
        }

        $issuedAt = $claims['iat'] ?? null;
        if (!is_numeric($issuedAt) || (int) $issuedAt < $state['cutoff_iat']) {
            return 'TOKEN_BEFORE_RESET';
        }
        return null;
    }
}
