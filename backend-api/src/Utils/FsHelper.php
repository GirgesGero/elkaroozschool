<?php
namespace App\Utils;

/**
 * Filesystem helpers used by backup/restore.
 *
 * Extracted because both the preview path and the atomic restore path need the
 * same guarantees, and the bug that motivated this class was a cleanup routine
 * that only handled a single empty file: preview extracted a whole archive, then
 * called unlink() on one entry and rmdir() on a directory that still held every
 * other entry. It failed silently (PHP warnings, no exception) and left
 * decrypted backup contents behind in the system temp directory.
 */
final class FsHelper {
    /**
     * Recursively delete a directory and everything inside it.
     *
     * @return bool true when the path no longer exists afterwards
     */
    public static function removeDirectory(string $dir): bool {
        if (!is_dir($dir)) {
            return !file_exists($dir);
        }

        // Symlinked children must be unlinked, never recursed into, or a link to
        // / would turn cleanup into a recursive delete of the filesystem root.
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($items as $item) {
            /** @var \SplFileInfo $item */
            if ($item->isLink() || $item->isFile()) {
                @unlink($item->getPathname());
            } elseif ($item->isDir()) {
                @rmdir($item->getPathname());
            }
        }

        return @rmdir($dir);
    }

    /**
     * Remove a directory tree without letting a failure abort the caller.
     * Use in cleanup paths where a leftover temp dir must not mask the real result.
     */
    public static function removeDirectoryQuietly(string $dir): void {
        try {
            self::removeDirectory($dir);
        } catch (\Throwable $e) {
            // Deliberately swallowed: cleanup is best-effort by definition.
        }
    }

    /**
     * Build a unique, private staging directory for decrypted archive contents.
     *
     * 0700 because the contents are the plaintext of an encrypted backup: another
     * account on shared hosting must not be able to read them through a race on
     * the directory while it exists.
     */
    public static function createPrivateStagingDir(string $prefix): string {
        $base = sys_get_temp_dir();
        $dir = rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $prefix . bin2hex(random_bytes(8));
        if (!mkdir($dir, 0700, true) && !is_dir($dir)) {
            throw new \RuntimeException('تعذّر إنشاء مجلد مؤقت للاستعادة');
        }
        return $dir;
    }

    /**
     * Verify a candidate path resolves inside $root.
     *
     * realpath() is used rather than string prefix comparison so that
     * "root-evil/" cannot pass a check written as str_starts_with($path, $root).
     * Returns null when the path does not exist yet, which callers must treat as
     * a failure rather than as "inside the root" — see StorageBridgeService for
     * the canonical form.
     */
    public static function isContainedIn(string $root, string $candidate): bool {
        $realRoot = realpath($root);
        if ($realRoot === false) {
            return false;
        }
        $realCandidate = realpath($candidate);
        if ($realCandidate === false) {
            return false;
        }
        $realRoot   = rtrim($realRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        $realCand   = rtrim($realCandidate, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        return str_starts_with($realCand, $realRoot);
    }
}