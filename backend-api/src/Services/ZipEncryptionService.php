<?php
namespace App\Services;

class ZipEncryptionService {
    public static function createEncryptedZip(string $sourceDir, string $destinationZipPath, string $password): bool {
        $zip = new \ZipArchive();
        if ($zip->open($destinationZipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            throw new \Exception('فشل في إنشاء ملف الـ ZIP');
        }

        $zip->setPassword($password);

        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($sourceDir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $name => $file) {
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($sourceDir) + 1);

                $zip->addFile($filePath, $relativePath);
                $zip->setEncryptionName($relativePath, \ZipArchive::EM_AES_256, $password);
            }
        }

        return $zip->close();
    }

    public static function extractEncryptedZip(string $zipPath, string $extractToDir, string $password): bool {
        $zip = new \ZipArchive();
        if ($zip->open($zipPath) !== true) {
            throw new \Exception('فشل في فتح ملف النسخة الاحتياطية المضغوط');
        }

        $zip->setPassword($password);

        if (!is_dir($extractToDir)) {
            mkdir($extractToDir, 0755, true);
        }

        $result = $zip->extractTo($extractToDir);
        $zip->close();

        if (!$result) {
            throw new \Exception('فشل فك التشفير: كلمة المرور غير صحيحة أو الملف تالف');
        }

        return true;
    }
}
