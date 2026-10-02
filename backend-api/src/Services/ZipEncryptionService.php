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

    /**
     * Extract an uploaded backup archive.
     *
     * The extraction itself is delegated to ArchiveExtractor, which validates the archive
     * against hard limits and re-checks every member name before writing it. This method
     * used to call ZipArchive::extractTo() directly, which had two live holes -- verified by
     * scripts/verify_archive_attacks.php against the previous implementation:
     *
     *   - member names were trusted, so a "../" entry wrote into the web root (zip slip)
     *   - nothing bounded entry count, declared size or compression ratio, so a 71 KB
     *     archive expanded to 64 MB in 0.3s and nothing stopped it (decompression bomb)
     *
     * Routing through ArchiveExtractor fixes every caller at once -- BackupController,
     * RestoreController::preview and RestoreController::execute -- rather than leaving each
     * call site to remember a check.
     *
     * @throws \Exception when the archive is malformed, hostile, or the password is wrong
     */
    public static function extractEncryptedZip(string $zipPath, string $extractToDir, string $password): bool {
        $result = ArchiveExtractor::extract($zipPath, $extractToDir, $password);

        if (!$result['ok']) {
            throw new \Exception($result['error'] ?? 'فشل فك ضغط ملف النسخة الاحتياطية.');
        }

        return true;
    }
}
