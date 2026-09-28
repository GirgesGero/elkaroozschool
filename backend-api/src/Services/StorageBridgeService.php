<?php
namespace App\Services;

use App\Utils\Security;

class StorageBridgeService {
    private string $rootDir;
    private string $publicUrl;

    public function __construct() {
        $config = require dirname(__DIR__, 2) . '/config/storage.php';
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
        $fullPath = $this->rootDir . '/' . ltrim($relativePath, '/');
        if (file_exists($fullPath) && is_file($fullPath)) {
            return unlink($fullPath);
        }
        return false;
    }
}
