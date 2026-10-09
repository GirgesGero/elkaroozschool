<?php
namespace App\Services;

use App\Utils\AppRoot;
use App\Utils\FsHelper;

/**
 * Archive inspection for backup restore (SRS 25.2 / 25.3).
 *
 * Separated from RestoreController so the validation rules can be unit-tested
 * without an HTTP request, a JWT, or a live Supabase.
 *
 * SRS 25.2 is explicit: if ANY pre-restore check fails, restore must not start.
 * So every check returns a structured failure rather than throwing on the first
 * problem — the operator needs the full list to fix the archive, not one error
 * per upload attempt.
 */
final class BackupArchiveInspector {
    /** Bumped when the on-disk backup layout changes incompatibly. */
    public const SUPPORTED_VERSIONS = ['2.0.0'];

    public const REQUIRED_ENTRIES = ['manifest.json'];

    /**
     * Storage root override.
     *
     * Production reads config/storage.php. Tests point this at a sandbox tree
     * so a bug in the restore path cannot touch real school files — the same
     * reason the service takes its root as a parameter rather than reading it
     * inline at every call site.
     */
    private static string $rootOverride = '';

    public static function setStorageRootForTesting(string $root): void {
        self::$rootOverride = $root;
    }

    public static function storageRoot(): string {
        if (self::$rootOverride !== '') {
            return rtrim(self::$rootOverride, DIRECTORY_SEPARATOR);
        }
        $config = require AppRoot::path('config/storage.php');
        return rtrim((string) $config['root_path'], DIRECTORY_SEPARATOR);
    }

    /**
     * @return array{valid:bool, checks:array<int,array{name:string,passed:bool,detail:string}>, manifest:?array, summary:array}
     */
    public static function inspect(string $extractDir): array {
        $checks = [];

        // 1. Integrity: the archive extracted at all.
        $checks[] = self::check(
            'integrity',
            is_dir($extractDir),
            is_dir($extractDir) ? 'تم فك ضغط الملف' : 'تعذر فك ضغط الملف'
        );

        // 2. manifest.json present — the archive is identifiable.
        $manifestPath = $extractDir . DIRECTORY_SEPARATOR . 'manifest.json';
        $hasManifest = is_file($manifestPath);
        $manifest = null;
        if ($hasManifest) {
            $decoded = json_decode((string) file_get_contents($manifestPath), true);
            $hasManifest = is_array($decoded);
            $manifest = $hasManifest ? $decoded : null;
        }
        $checks[] = self::check(
            'manifest',
            $hasManifest,
            $hasManifest ? 'manifest.json صالح' : 'manifest.json مفقود أو تالف'
        );

        // 3. Version compatibility (SRS 25.2.2).
        $version = is_array($manifest) ? (string) ($manifest['system_version'] ?? '') : '';
        $versionOk = in_array($version, self::SUPPORTED_VERSIONS, true);
        $checks[] = self::check(
            'version',
            $versionOk,
            $versionOk
                ? "الإصدار متوافق ({$version})"
                : "إصدار غير مدعوم: " . ($version !== '' ? $version : 'غير محدد')
        );

        // 4. Required payload sections (SRS 25.2.3).
        $missing = [];
        foreach (self::REQUIRED_ENTRIES as $entry) {
            if (!file_exists($extractDir . DIRECTORY_SEPARATOR . $entry)) {
                $missing[] = $entry;
            }
        }
        $checks[] = self::check(
            'contents',
            $missing === [],
            $missing === [] ? 'المحتويات كاملة' : 'مفقود: ' . implode(', ', $missing)
        );

        // 5. Database dump present when the manifest claims a DB restore.
        $claimsDb = is_array($manifest) && !empty($manifest['includes_database']);
        $dbDump = $extractDir . DIRECTORY_SEPARATOR . 'database';
        $dbOk = !$claimsDb || is_dir($dbDump);
        $checks[] = self::check(
            'database',
            $dbOk,
            $dbOk
                ? ($claimsDb ? 'نسخة قاعدة البيانات موجودة' : 'النسخة لا تشمل قاعدة البيانات')
                : 'المانيفست يدّعي وجود قاعدة بيانات لكن مجلد database مفقود'
        );

        $valid = true;
        foreach ($checks as $c) {
            if (!$c['passed']) {
                $valid = false;
                break;
            }
        }

        return [
            'valid' => $valid,
            'checks' => $checks,
            'manifest' => $manifest,
            'summary' => self::summarize($extractDir, $manifest),
        ];
    }

    /**
     * Preview payload for SRS 25.3 — the operator must see what they are about
     * to restore before confirming.
     */
    private static function summarize(string $extractDir, ?array $manifest): array {
        $files = [];
        $bytes = 0;
        if (is_dir($extractDir)) {
            $it = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($extractDir, \FilesystemIterator::SKIP_DOTS)
            );
            foreach ($it as $f) {
                if ($f->isFile()) {
                    $files[] = $f->getPathname();
                    $bytes += $f->getSize();
                }
            }
        }

        $storageRoot = self::storageRoot();
        $storageBytes = is_dir($storageRoot) ? self::directorySize($storageRoot) : 0;

        return [
            'backup_created_at' => is_array($manifest) ? ($manifest['created_at'] ?? null) : null,
            'system_version'    => is_array($manifest) ? ($manifest['system_version'] ?? null) : null,
            'file_count'        => count($files),
            'archive_bytes'     => $bytes,
            'storage_root'      => $storageRoot,
            'current_storage_bytes' => $storageBytes,
            'tables'            => is_array($manifest) ? ($manifest['tables'] ?? []) : [],
            'includes_database' => is_array($manifest) ? (bool) ($manifest['includes_database'] ?? false) : false,
            'includes_files'    => is_array($manifest) ? (bool) ($manifest['includes_files'] ?? false) : false,
        ];
    }

    private static function directorySize(string $dir): int {
        $total = 0;
        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS)
        );
        foreach ($it as $f) {
            if ($f->isFile()) {
                $total += $f->getSize();
            }
        }
        return $total;
    }

    private static function check(string $name, bool $passed, string $detail): array {
        return ['name' => $name, 'passed' => $passed, 'detail' => $detail];
    }
}