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
        $targetDirectory = $this->rootDir . '/' . trim($targetSubDir, '/');
        if (!is_dir($targetDirectory)) {
            mkdir($targetDirectory, 0755, true);
        }

        $sanitizedFileName = Security::sanitizeFilename($file['name']);
        $destinationPath = $targetDirectory . '/' . $sanitizedFileName;

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
