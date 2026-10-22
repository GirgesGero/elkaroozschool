<?php

declare(strict_types=1);

namespace App\Services;

use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;

/**
 * Removes only the upload/export roots confirmed in StorageController,
 * ImportController and ExportController. Bible data and backups are never swept.
 */
final class SystemResetStorageService
{
    private const OPERATIONAL_ROOTS = [
        'academic',
        'users',
        'feed',
        'gallery',
        'imports',
        'system/exports',
    ];

    private const PRESERVED_ROOTS = [
        'backups',
        'bible',
        'bible-dataset',
        'cache',
        'system_reset',
    ];

    private string $root;

    public function __construct(string $rootPath)
    {
        $resolved = realpath($rootPath);
        if ($resolved === false || !is_dir($resolved)) {
            throw new RuntimeException('Storage root is not available');
        }
        $this->root = rtrim($resolved, DIRECTORY_SEPARATOR);
    }

    /** @return array{known_files:int,by_root:array<string,int>,blocked_paths:list<string>} */
    public function inventoryOperationalRoots(): array
    {
        $blocked = $this->findUnclassifiedRoots();
        $byRoot = [];
        $total = 0;

        foreach (self::OPERATIONAL_ROOTS as $relativeRoot) {
            $absolute = $this->absolutePath($relativeRoot);
            $count = 0;
            if (is_link($absolute)) {
                $blocked[] = $relativeRoot;
            } elseif (is_dir($absolute)) {
                $iterator = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($absolute, FilesystemIterator::SKIP_DOTS),
                    RecursiveIteratorIterator::LEAVES_ONLY
                );
                foreach ($iterator as $entry) {
                    if ($entry->isLink() || $entry->isFile()) {
                        $count++;
                    }
                }
            } elseif (file_exists($absolute)) {
                $blocked[] = $relativeRoot;
            }
            $byRoot[$relativeRoot] = $count;
            $total += $count;
        }

        sort($blocked);
        return [
            'known_files' => $total,
            'by_root' => $byRoot,
            'blocked_paths' => array_values(array_unique($blocked)),
        ];
    }

    /** @return array{success:bool,deleted_files:int,blocked_paths:list<string>,failed_paths:list<string>} */
    public function purgeOperationalRoots(): array
    {
        $blocked = $this->findUnclassifiedRoots();
        if ($blocked !== []) {
            return ['success' => false, 'deleted_files' => 0, 'blocked_paths' => $blocked, 'failed_paths' => []];
        }

        $deleted = 0;
        $failed = [];
        foreach (self::OPERATIONAL_ROOTS as $relativeRoot) {
            $absolute = $this->absolutePath($relativeRoot);
            if (!file_exists($absolute) && !is_link($absolute)) {
                continue;
            }
            if (is_link($absolute) || !is_dir($absolute)) {
                $failed[] = $relativeRoot;
                continue;
            }
            $this->removeContents($absolute, $relativeRoot, $deleted, $failed);
        }

        return [
            'success' => $failed === [],
            'deleted_files' => $deleted,
            'blocked_paths' => [],
            'failed_paths' => array_values(array_unique($failed)),
        ];
    }

    /** @return list<string> */
    private function findUnclassifiedRoots(): array
    {
        $known = array_fill_keys(array_merge(self::PRESERVED_ROOTS, [
            'academic', 'users', 'feed', 'gallery', 'imports', 'system',
        ]), true);
        $blocked = [];

        foreach (new FilesystemIterator($this->root, FilesystemIterator::SKIP_DOTS) as $entry) {
            $name = $entry->getFilename();
            if (!isset($known[$name])) {
                $blocked[] = $name;
                continue;
            }
            if ($name === 'system') {
                $systemPath = $entry->getPathname();
                if ($entry->isLink() || !$entry->isDir()) {
                    $blocked[] = 'system';
                    continue;
                }
                foreach (new FilesystemIterator($systemPath, FilesystemIterator::SKIP_DOTS) as $systemEntry) {
                    if ($systemEntry->getFilename() !== 'exports') {
                        $blocked[] = 'system/' . $systemEntry->getFilename();
                    }
                }
            }
        }

        sort($blocked);
        return array_values(array_unique($blocked));
    }

    private function absolutePath(string $relative): string
    {
        $normalized = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relative);
        $candidate = $this->root . DIRECTORY_SEPARATOR . $normalized;
        $parent = realpath(dirname($candidate));
        if ($parent !== false && !$this->isWithinRoot($parent)) {
            throw new RuntimeException('Operational storage path escaped the root');
        }
        return $candidate;
    }

    private function isWithinRoot(string $path): bool
    {
        $prefix = $this->root . DIRECTORY_SEPARATOR;
        return $path === $this->root || str_starts_with($path . DIRECTORY_SEPARATOR, $prefix);
    }

    private function removeContents(string $directory, string $relative, int &$deleted, array &$failed): void
    {
        foreach (new FilesystemIterator($directory, FilesystemIterator::SKIP_DOTS) as $entry) {
            $path = $entry->getPathname();
            $childRelative = $relative . '/' . $entry->getFilename();

            // Test links before isDir(): a directory symlink must never be traversed.
            if ($entry->isLink()) {
                if (@unlink($path)) {
                    $deleted++;
                } else {
                    $failed[] = $childRelative;
                }
                continue;
            }

            if ($entry->isDir()) {
                $this->removeContents($path, $childRelative, $deleted, $failed);
                if (!@rmdir($path)) {
                    $failed[] = $childRelative;
                }
                continue;
            }

            if (@unlink($path)) {
                $deleted++;
            } else {
                $failed[] = $childRelative;
            }
        }
    }
}
