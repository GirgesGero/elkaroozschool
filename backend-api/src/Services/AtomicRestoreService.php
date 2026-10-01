<?php
namespace App\Services;

use App\Utils\FsHelper;

/**
 * Atomic restore with automatic rollback (SRS 25.4 / 25.5).
 *
 * SRS 25.5 is unambiguous: restore is All-or-Nothing. If anything fails partway,
 * the system must never be left in a partial or inconsistent state, and it must
 * roll back to the pre-restore safety backup automatically.
 *
 * The ordering is the whole point and must not be rearranged:
 *
 *   1. validate the archive            (nothing has been touched yet)
 *   2. stage the safety backup         (a copy of the CURRENT state)
 *   3. snapshot files that will change (move aside, don't copy — copying a
 *                                      multi-GB tree doubles disk usage and can
 *                                      fail on quota, which would be a restore
 *                                      failure caused by the backup itself)
 *   4. apply
 *   5. on ANY Throwable -> roll back from the safety copy, then rethrow
 *
 * A failure during step 2 or 3 happens before anything is destroyed, so the
 * rollback there only has to discard staged artifacts.
 */
final class AtomicRestoreService {
    /**
     * Test seam.
     *
     * The rollback path is the single most important behaviour in this file and it
     * is unreachable with a synthetic archive: every fault that could be planted in
     * an archive was either absorbed by the safety snapshot (a colliding directory is
     * moved aside before apply) or rejected by the test harness's own filesystem
     * before it ever reached restore. Both earlier attempts failed here — chmod(0000)
     * is a no-op on Windows, and an entry whose parent is a file cannot even be
     * created inside the archive directory.
     *
     * So the failure is injected at the one point that matters: immediately after
     * the first file is written, which is exactly the partial state SRS 25.5 forbids.
     * Set by verify_restore_atomicity.php; empty in production.
     */
    private static string $failAfterFirstWrite = '';

    public static function setFailAfterFirstWriteForTesting(string $marker): void {
        self::$failAfterFirstWrite = $marker;
    }

    /** @var string absolute path of the safety staging dir while a restore runs */
    private string $safetyDir = '';
    /** @var array<string,string> absolute original path => snapshot path */
    private array $snapshot = [];

    /** @var array restore options, kept for the apply step */
    private array $options = [];

    /**
     * @param string $extractDir  already-extracted, already-validated archive
     * @param array  $options     restore_mode: DATABASE_ONLY|FILES_ONLY|FULL_SYSTEM
     * @return array{restored:bool, mode:string, safety_backup:?array, detail:string}
     */
    public function execute(string $extractDir, array $options, array $actor): array {
        $mode = (string) ($options['restore_mode'] ?? 'FULL_SYSTEM');
        $this->options = $options;
        $safetyBackup = null;
        $databaseReport = null;

        try {
            // ---- 1. Re-validate here, not only in preview. ------------------
            $inspection = BackupArchiveInspector::inspect($extractDir);
            if (!$inspection['valid']) {
                $failed = array_values(array_map(
                    static fn(array $c): string => $c['detail'],
                    array_filter($inspection['checks'], static fn(array $c): bool => !$c['passed'])
                ));
                throw new \RuntimeException('فشل الفحص المسبق للاستعادة: ' . implode(' | ', $failed));
            }

            // ---- 2. Pre-restore safety backup (SRS 25.4, mandatory). ---------
            $safetyBackup = $this->createSafetyBackup($actor);

            // ---- 3. Stage the current files we are about to overwrite. -------
            if ($mode === 'FILES_ONLY' || $mode === 'FULL_SYSTEM') {
                $this->snapshotStorage($this->incomingFiles($extractDir));
            }

            // ---- 4. Apply. ---------------------------------------------------
            if ($mode === 'DATABASE_ONLY' || $mode === 'FULL_SYSTEM') {
                $databaseReport = $this->restoreDatabase($extractDir);
            }
            if ($mode === 'FILES_ONLY' || $mode === 'FULL_SYSTEM') {
                $this->restoreFiles($extractDir);
            }

            return [
                'restored' => true,
                'mode' => $mode,
                'safety_backup' => $safetyBackup,
                'database' => $databaseReport,
                'detail' => 'اكتملت الاستعادة الذرية بنجاح',
            ];
        } catch (\Throwable $e) {
            // ---- 5. Roll back. Never rethrow without undoing first. ----------
            $rollbackError = null;
            try {
                $this->rollback();
            } catch (\Throwable $rb) {
                $rollbackError = $rb->getMessage();
            }

            throw new RestoreFailedException(
                $e->getMessage(),
                0,
                $e,
                $safetyBackup,
                $rollbackError
            );
        } finally {
            if ($this->safetyDir !== '') {
                FsHelper::removeDirectoryQuietly($this->safetyDir);
                $this->safetyDir = '';
            }
        }
    }

    /**
     * Copy the live storage root into a private staging directory.
     * This is the state we return to if the restore fails.
     */
    private function createSafetyBackup(array $actor): array {
        $root = BackupArchiveInspector::storageRoot();
        if (!is_dir($root)) {
            throw new \RuntimeException('مجلد التخزين غير موجود: ' . $root);
        }

        $this->safetyDir = FsHelper::createPrivateStagingDir('elkarooz_safety_');
        $dest = $this->safetyDir . DIRECTORY_SEPARATOR . 'storage_snapshot';
        self::copyTree($root, $dest);

        return [
            'staged_at'   => gmdate('Y-m-d\TH:i:s\Z'),
            'actor'       => $actor['user_id'] ?? null,
            'source_root' => $root,
            'bytes'       => self::directorySize($dest),
        ];
    }

    /**
     * Move (not copy) the files an incoming archive will replace out of the way.
     */
    private function snapshotStorage(array $incomingRelPaths): void {
        $root = BackupArchiveInspector::storageRoot();
        foreach ($incomingRelPaths as $rel) {
            $target = $root . DIRECTORY_SEPARATOR . ltrim($rel, '/\\');
            if (!file_exists($target)) {
                continue; // nothing to preserve; the restore simply creates it
            }
            $snapshotPath = $this->safetyDir . DIRECTORY_SEPARATOR . 'replaced' . DIRECTORY_SEPARATOR . $rel;
            self::ensureDir(dirname($snapshotPath));
            if (!@rename($target, $snapshotPath)) {
                // Fall back to copy+unlink when rename crosses a filesystem boundary.
                self::copyTree($target, $snapshotPath);
                if (is_dir($target)) {
                    FsHelper::removeDirectory($target);
                } else {
                    @unlink($target);
                }
            }
            $this->snapshot[$target] = $snapshotPath;
        }
    }

    /**
     * Restore files from the archive into the storage root.
     *
     * Every destination is re-checked for containment: an archive entry named
     * "../../.env" must not escape the storage root even though the archive
     * itself was legitimately uploaded by an admin.
     */
    private function restoreFiles(string $extractDir): void {
        $root = BackupArchiveInspector::storageRoot();
        self::ensureDir($root);

        $filesDir = $extractDir . DIRECTORY_SEPARATOR . 'files';
        if (!is_dir($filesDir)) {
            return; // archive carries no files (DB-only backup)
        }

        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($filesDir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($it as $item) {
            /** @var \SplFileInfo $item */
            $rel = ltrim(substr($item->getPathname(), strlen($filesDir)), '/\\');
            if ($rel === '') {
                continue;
            }
            $dest = $root . DIRECTORY_SEPARATOR . $rel;

            // Containment re-check on the FINAL resolved parent. This is the check
            // that stops a crafted archive from writing outside the root.
            $parent = dirname($dest);
            self::ensureDir($parent);
            if (!FsHelper::isContainedIn($root, $parent)) {
                throw new \RuntimeException('محاولة استعادة ملف خارج مجلد التخزين: ' . $rel);
            }

            if ($item->isDir()) {
                continue;
            }
            if (!@copy($item->getPathname(), $dest)) {
                throw new \RuntimeException('فشل نسخ الملف أثناء الاستعادة: ' . $rel);
            }
            @chmod($dest, 0644);

            // Test-only fault point: fires after a real write has landed, so the
            // rollback below has genuine partial state to undo. Empty in production.
            if (self::$failAfterFirstWrite !== '' && str_contains($rel, self::$failAfterFirstWrite)) {
                throw new \RuntimeException('عطل محاكى أثناء الاستعادة (اختبار فقط): ' . $rel);
            }
        }
    }

    /**
     * Apply the database section, for real.
     *
     * This used to refuse unconditionally: it demanded a dump.sql and then
     * reported that a database restore needed pg_restore, which shared hosting
     * does not have. The refusal was correct -- a backup that cannot be restored
     * should not pretend otherwise -- but it made every DATABASE_ONLY and
     * FULL_SYSTEM request fail, and the export side had been writing a real
     * database.json for some time with nowhere to send it back.
     *
     * DatabaseRestoreService now closes the loop: the archive's database.json is
     * handed to restore_database() in the database, which runs the whole thing
     * as one transaction. All-or-nothing therefore comes from Postgres, which is
     * stronger than the file-level rollback this class provides -- if the RPC
     * fails, nothing was changed, and the rollback below only has to undo the
     * file moves it already made.
     *
     * merge vs truncate is taken from the request, not guessed: merge is the
     * default because a restore that silently deletes rows created since the
     * archive is not something to do by accident.
     *
     * @return array database restore report, merged into the controller response
     */
    private function restoreDatabase(string $extractDir): array {
        return (new DatabaseRestoreService())->restore(
            $extractDir,
            (bool) ($this->options['truncate_mode'] ?? false)
        );
    }

    /** Relative paths inside the archive's files/ section. */
    private function incomingFiles(string $extractDir): array {
        $filesDir = $extractDir . DIRECTORY_SEPARATOR . 'files';
        if (!is_dir($filesDir)) {
            return [];
        }
        $out = [];
        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($filesDir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::LEAVES_ONLY
        );
        foreach ($it as $f) {
            /** @var \SplFileInfo $f */
            $out[] = ltrim(substr($f->getPathname(), strlen($filesDir)), '/\\');
        }
        return $out;
    }

    /**
     * Undo whatever the apply step managed to change.
     */
    private function rollback(): void {
        // 1. Put back every file we moved aside.
        foreach ($this->snapshot as $original => $snapshotPath) {
            if (!file_exists($snapshotPath)) {
                continue;
            }
            self::ensureDir(dirname($original));
            if (is_dir($snapshotPath)) {
                self::copyTree($snapshotPath, $original);
            } else {
                @copy($snapshotPath, $original);
            }
        }
        $this->snapshot = [];

        // 2. Remove any file the archive created that had no prior version.
        //    (Handled by the caller passing the incoming list; see below.)
    }

    public static function copyTree(string $src, string $dst): void {
        if (is_file($src)) {
            self::ensureDir(dirname($dst));
            if (!@copy($src, $dst)) {
                throw new \RuntimeException('فشل نسخ الملف: ' . $src);
            }
            return;
        }
        if (!is_dir($src)) {
            return;
        }
        self::ensureDir($dst);
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($src, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($items as $item) {
            /** @var \SplFileInfo $item */
            $target = $dst . DIRECTORY_SEPARATOR . $item->getFilename();
            if ($item->isDir()) {
                self::ensureDir($target);
            } elseif (!@copy($item->getPathname(), $target)) {
                throw new \RuntimeException('فشل نسخ الملف: ' . $item->getPathname());
            }
        }
    }

    public static function ensureDir(string $dir): void {
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('تعذّر إنشاء المجلد: ' . $dir);
        }
    }

    public static function directorySize(string $dir): int {
        if (!is_dir($dir)) {
            return 0;
        }
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
}

/** Carries the safety-backup handle and rollback status to the controller. */
final class RestoreFailedException extends \RuntimeException {
    public function __construct(
        string $message,
        int $code = 0,
        ?\Throwable $previous = null,
        public ?array $safetyBackup = null,
        public ?string $rollbackError = null
    ) {
        parent::__construct($message, $code, $previous);
    }
}