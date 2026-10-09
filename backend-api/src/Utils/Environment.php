<?php
namespace App\Utils;

/** Loads a minimal .env file without executing PHP or overriding host variables. */
final class Environment {
    private const MAX_FILE_BYTES = 65536;

    public static function load(string $appRoot): bool {
        $configuredPath = getenv('ELKAROOZ_ENV_FILE');
        $path = is_string($configuredPath) && trim($configuredPath) !== ''
            ? trim($configuredPath)
            : dirname(rtrim($appRoot, '/\\')) . DIRECTORY_SEPARATOR . '.env';

        $realPath = realpath($path);
        if ($realPath === false || !is_file($realPath) || !is_readable($realPath)) {
            return false;
        }

        $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        $realDocumentRoot = is_string($documentRoot) && $documentRoot !== ''
            ? realpath($documentRoot)
            : false;
        if ($realDocumentRoot !== false && self::isWithin($realPath, $realDocumentRoot)) {
            error_log('[EL KAROOZ] Refusing to load environment file from the web document root.');
            return false;
        }

        $size = filesize($realPath);
        if ($size === false || $size > self::MAX_FILE_BYTES) {
            error_log('[EL KAROOZ] Refusing environment file larger than 64 KiB.');
            return false;
        }

        $lines = file($realPath, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            error_log('[EL KAROOZ] Environment file could not be read.');
            return false;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (str_starts_with($line, 'export ')) {
                $line = ltrim(substr($line, 7));
            }
            if (!preg_match('/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/', $line, $matches)) {
                continue;
            }

            $key = $matches[1];
            $rawValue = trim($matches[2]);
            $value = self::parseValue($rawValue);
            if ($value === null || getenv($key) !== false) {
                continue;
            }

            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }

        return true;
    }

    private static function parseValue(string $raw): ?string {
        if ($raw === '') {
            return '';
        }

        $quote = $raw[0];
        if ($quote !== '"' && $quote !== "'") {
            return $raw;
        }
        if (strlen($raw) < 2 || $raw[strlen($raw) - 1] !== $quote) {
            return null;
        }

        $value = substr($raw, 1, -1);
        if ($quote === '"') {
            $value = preg_replace_callback(
                '/\\\\(["\\\\])/',
                static fn(array $match): string => $match[1],
                $value
            ) ?? $value;
        }
        return $value;
    }

    private static function isWithin(string $path, string $directory): bool {
        $path = rtrim($path, '/\\');
        $directory = rtrim($directory, '/\\');
        if ($path === $directory) {
            return true;
        }
        $prefix = $directory . DIRECTORY_SEPARATOR;
        return DIRECTORY_SEPARATOR === '\\'
            ? str_starts_with(strtolower($path), strtolower($prefix))
            : str_starts_with($path, $prefix);
    }
}
