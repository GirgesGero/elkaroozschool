<?php
namespace App\Services;

use App\Utils\AppRoot;

use App\Utils\Security;

class StorageBridgeService {
    private string $rootDir;
    private string $publicUrl;

    public function __construct() {
        $config = require AppRoot::path('config/storage.php');
        $this->rootDir = rtrim($config['root_path'], '/');
        $this->publicUrl = rtrim($config['public_url'], '/');
    }

    public function saveUploadedFile(array $file, string $targetSubDir): array {
        // Containment on the WRITE path, mirroring deleteFile() below.
        // $targetSubDir reaches here built from user input (POST folder_type /
        // user_role), and the old code only did mkdir(..., true) then wrote --
        // so "gallery/group_1/../../../ESCAPED" landed OUTSIDE the storage
        // root. It then threw later in the controller, which reads like a
        // failure while the file is already on disk.
        $targetSubDir = str_replace('\\', '/', $targetSubDir);
        if (
        $targetSubDir === ''
        || str_contains($targetSubDir, "\0")
        || str_starts_with($targetSubDir, '/')
        || preg_match('#(^|/)\.\.(/|$)#', $targetSubDir)
        ) {
        throw new \Exception('مسار التخزين خارج النطاق المسموح');
        }

        $root = realpath($this->rootDir);
        if ($root === false) {
        throw new \Exception('تعذر الوصول إلى مساحة التخزين');
        }

        $targetDirectory = $root . '/' . trim($targetSubDir, '/');
        if (!is_dir($targetDirectory)) {
        mkdir($targetDirectory, 0755, true);
        }

        // mkdir() can be defeated by a symlink or a race, so re-resolve the
        // directory AFTER creating it and confirm it still lives under root.
        $realTarget = realpath($targetDirectory);
        if (
        $realTarget === false
        || ($realTarget !== $root && !str_starts_with($realTarget, $root . DIRECTORY_SEPARATOR))
        ) {
        throw new \Exception('مسار التخزين خارج النطاق المسموح');
        }

        $sanitizedFileName = Security::sanitizeFilename($file['name']);
        if ($sanitizedFileName === '' || str_contains($sanitizedFileName, '/')) {
        throw new \Exception('اسم الملف غير صالح');
        }
        $destinationPath = $realTarget . '/' . $sanitizedFileName;

        if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
        throw new \Exception('فشل في حفظ الملف على مساحة التخزين');
        }

        $relativePath = '/' . trim($targetSubDir, '/') . '/' . $sanitizedFileName;
        $absoluteUrl = $this->publicUrl . $relativePath;
        $fileSize = filesize($destinationPath);
        $mimeType = Security::detectMimeType($destinationPath);
        $sha256 = hash_file('sha256', $destinationPath);

        return [
            'filename' => $sanitizedFileName,
            'relative_path' => $relativePath,
            'file_url' => $absoluteUrl,
            'file_size' => $fileSize,
            'mime_type' => $mimeType,
            'sha256' => $sha256
        ];
    }

    public function deleteFile(string $relativePath): bool {
        // Reject traversal / absolute paths before touching the filesystem.
        // Without this, a crafted path like "../../config/supabase.php" escapes
        // the storage root and deletes (or probes) files outside it.
        if ($relativePath === '' || str_contains($relativePath, "\0")) {
            return false;
        }
        $relativePath = str_replace('\\', '/', $relativePath);
        if (str_starts_with($relativePath, '/') || preg_match('#(^|/)\.\.(/|$)#', $relativePath)) {
            return false;
        }

        $root = realpath($this->rootDir);
        if ($root === false) {
            return false;
        }
        $fullPath = realpath($this->rootDir . '/' . ltrim($relativePath, '/'));
        // Must resolve to a path that really lives inside the storage root.
        if ($fullPath === false || !is_file($fullPath)) {
            return false;
        }
        if ($fullPath !== $root && !str_starts_with($fullPath, $root . DIRECTORY_SEPARATOR)) {
            return false;
        }

        return unlink($fullPath);
    }
}
