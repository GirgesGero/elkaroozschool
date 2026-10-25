<?php
namespace App\Services;

use App\Utils\AppRoot;
use App\Utils\Security;

class StorageBridgeService {
    private string $rootDir;
    private string $publicUrl;
    private ?GoogleDriveService $driveService = null;
    private ?GoogleAppsScriptBridgeService $gasBridge = null;
    private ?SupabaseClient $supabase = null;
    private string $rootFolderId;

    public function __construct() {
        $config = require AppRoot::path('config/storage.php');
        $this->rootDir = rtrim($config['root_path'], '/');
        $this->publicUrl = rtrim($config['public_url'], '/');
        $this->rootFolderId = (string)(getenv('GOOGLE_DRIVE_ROOT_ID') ?: '');
    }

    private function getSupabase(): SupabaseClient {
        if ($this->supabase === null) {
            $this->supabase = new SupabaseClient();
        }
        return $this->supabase;
    }

    private function getDriveService(): ?GoogleDriveService {
        if ($this->driveService !== null) {
            return $this->driveService;
        }

        $saJson = getenv('GOOGLE_SERVICE_ACCOUNT_JSON');
        if ($saJson && str_starts_with(trim($saJson), '{')) {
            // Pass raw JSON string directly to memory without writing key to /tmp
            $this->driveService = new GoogleDriveService($saJson);
            return $this->driveService;
        }

        $saPath = getenv('GOOGLE_SERVICE_ACCOUNT_JSON_PATH');
        if ($saPath && is_file($saPath)) {
            $this->driveService = new GoogleDriveService($saPath);
            return $this->driveService;
        }

        return null;
    }

    private function getGasBridge(): ?GoogleAppsScriptBridgeService {
        if ($this->gasBridge !== null) {
            return $this->gasBridge;
        }

        $bridge = new GoogleAppsScriptBridgeService();
        if ($bridge->isConfigured()) {
            $this->gasBridge = $bridge;
            return $this->gasBridge;
        }

        return null;
    }

    /**
     * Map folder_type or relative path to media_assets resource_type
     */
    public static function mapResourceType(string $targetSubDir, string $mimeType, ?string $explicitType = null): string {
        if ($explicitType && in_array($explicitType, [
            'CURRICULUM', 'LECTURE_AUDIO', 'LECTURE_ATTACHMENT', 'BOOK_FILE', 'BOOK_COVER',
            'RESEARCH_FILE', 'MP3_TRACK', 'GALLERY_ITEM', 'GALLERY_COVER', 'POST_IMAGE',
            'AVATAR', 'BACKUP_ARCHIVE', 'IMPORT_FILE', 'GENERAL'
        ], true)) {
            return $explicitType;
        }

        $sub = strtolower($targetSubDir);
        $isAudio = str_starts_with($mimeType, 'audio/');
        $isImage = str_starts_with($mimeType, 'image/');

        if (str_contains($sub, 'curriculum')) return 'CURRICULUM';
        if (str_contains($sub, 'lectures')) return $isAudio ? 'LECTURE_AUDIO' : 'LECTURE_ATTACHMENT';
        if (str_contains($sub, 'books')) return $isImage ? 'BOOK_COVER' : 'BOOK_FILE';
        if (str_contains($sub, 'research')) return 'RESEARCH_FILE';
        if (str_contains($sub, 'mp3')) return 'MP3_TRACK';
        if (str_contains($sub, 'users') || str_contains($sub, 'avatar')) return 'AVATAR';
        if (str_contains($sub, 'feed')) return 'POST_IMAGE';
        if (str_contains($sub, 'gallery')) return $isImage ? 'GALLERY_ITEM' : 'GENERAL';
        if (str_contains($sub, 'backup')) return 'BACKUP_ARCHIVE';
        if (str_contains($sub, 'import')) return 'IMPORT_FILE';

        return 'GENERAL';
    }

    /**
     * Save an uploaded file, verify security, upload to Google Drive, and register in media_assets.
     */
    public function saveUploadedFile(array $file, string $targetSubDir, array $context = []): array {
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

        return $this->processAndRegisterFile($destinationPath, $sanitizedFileName, $targetSubDir, $context);
    }

    /**
     * Save raw file content directly (used for system-generated exports and reports).
     */
    public function saveFileContent(string $content, string $fileName, string $targetSubDir, array $context = []): array {
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

        $realTarget = realpath($targetDirectory);
        if (
            $realTarget === false
            || ($realTarget !== $root && !str_starts_with($realTarget, $root . DIRECTORY_SEPARATOR))
        ) {
            throw new \Exception('مسار التخزين خارج النطاق المسموح');
        }

        $sanitizedFileName = Security::sanitizeFilename($fileName);
        if ($sanitizedFileName === '' || str_contains($sanitizedFileName, '/')) {
            throw new \Exception('اسم الملف غير صالح');
        }

        $destinationPath = $realTarget . '/' . $sanitizedFileName;
        if (file_put_contents($destinationPath, $content) === false) {
            throw new \Exception('فشل في حفظ محتوى الملف على مساحة التخزين');
        }

        return $this->processAndRegisterFile($destinationPath, $sanitizedFileName, $targetSubDir, $context);
    }

    /**
     * Internal processor: computes sha256, prevents duplicate retries, uploads to Google Drive,
     * and records media_assets in Supabase.
     */
    private function processAndRegisterFile(string $localPath, string $fileName, string $targetSubDir, array $context): array {
        $fileSize = filesize($localPath);
        $mimeType = Security::detectMimeType($localPath);
        $sha256 = hash_file('sha256', $localPath);
        $relativePath = '/' . trim($targetSubDir, '/') . '/' . $fileName;

        $user = $context['user'] ?? null;
        $groupId = isset($context['group_id']) ? ($context['group_id'] > 0 ? (int)$context['group_id'] : null) : null;
        if ($groupId === null && preg_match('#group_(\d+)#', $targetSubDir, $gm)) {
            $groupId = (int)$gm[1];
        }

        $resourceType = self::mapResourceType($targetSubDir, $mimeType, $context['resource_type'] ?? null);
        $resourceId = $context['resource_id'] ?? null;
        $uploadedBy = $user['user_id'] ?? ($context['uploaded_by'] ?? null);

        $supabase = $this->getSupabase();

        // 1. DEDUPLICATION CHECK: Check if this file checksum already exists in media_assets
        $dupQuery = 'media_assets?checksum_sha256=eq.' . urlencode($sha256) . '&status=eq.ACTIVE&deleted_at=is.null';
        if ($groupId !== null) {
            $dupQuery .= '&group_id=eq.' . $groupId;
        } else {
            $dupQuery .= '&group_id=is.null';
        }
        $dupRes = $supabase->query($dupQuery . '&limit=1');

        if (!empty($dupRes['data']) && is_array($dupRes['data']) && count($dupRes['data']) > 0) {
            $existing = $dupRes['data'][0];
            return [
                'asset_id' => $existing['id'],
                'filename' => $existing['file_name'],
                'file_url' => $this->publicUrl . '/api/storage/file/' . $existing['id'],
                'relative_path' => $relativePath,
                'file_size' => (int)$existing['file_size_bytes'],
                'mime_type' => $existing['mime_type'],
                'sha256' => $existing['checksum_sha256'],
                'drive_file_id' => $existing['drive_file_id'],
                'storage_provider' => $existing['storage_provider'],
                'resource_type' => $existing['resource_type'],
                'group_id' => $existing['group_id'],
                'is_duplicate' => true
            ];
        }

        // 2. UPLOAD TO GOOGLE DRIVE (or stage locally if drive is unconfigured in current environment)
        $storageProvider = 'HOSTINGER_LOCAL';
        $driveFileId = 'local_' . bin2hex(random_bytes(16));
        $driveFolderId = $this->rootFolderId;

        $driveService = $this->getDriveService();
        $gasBridge = $this->getGasBridge();

        if ($driveService !== null) {
            try {
                $uploadRes = $driveService->uploadFile($localPath, $fileName, $mimeType, $this->rootFolderId);
                $driveFileId = (string)$uploadRes['drive_file_id'];
                $storageProvider = 'GOOGLE_DRIVE';
            } catch (\Throwable $driveErr) {
                error_log('[StorageBridgeService] GoogleDriveService upload error: ' . $driveErr->getMessage());
                if (getenv('REQUIRE_GOOGLE_DRIVE') === 'true') {
                    throw new \RuntimeException('فشل في رفع الملف إلى Google Drive: ' . $driveErr->getMessage());
                }
            }
        } elseif ($gasBridge !== null) {
            try {
                $content = file_get_contents($localPath);
                $gasRes = $gasBridge->uploadFile($targetSubDir . '/' . $fileName, $content, $mimeType);
                if (!empty($gasRes['file_id'])) {
                    $driveFileId = (string)$gasRes['file_id'];
                    $storageProvider = 'GOOGLE_DRIVE';
                }
            } catch (\Throwable $gasErr) {
                error_log('[StorageBridgeService] GoogleAppsScriptBridge upload error: ' . $gasErr->getMessage());
                if (getenv('REQUIRE_GOOGLE_DRIVE') === 'true') {
                    throw new \RuntimeException('فشل في رفع الملف إلى Google Drive عبر السكربت: ' . $gasErr->getMessage());
                }
            }
        }

        // 3. FALLBACK UPLOADER: Resolve an active admin if uploaded_by is missing
        if (!$uploadedBy) {
            $adminRes = $supabase->query('profiles?role_id=eq.admin&is_active=eq.true&deleted_at=is.null&limit=1');
            $uploadedBy = $adminRes['data'][0]['id'] ?? null;
            if (!$uploadedBy) {
                throw new \RuntimeException('لا يمكن تسجيل الملف بدون مُحدّد المستخدم (uploaded_by). لم يتم العثور على حساب إداري نشط.');
            }
        }

        // 4. REGISTER ASSET IN Supabase media_assets TABLE
        $assetPayload = [
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'storage_provider' => $storageProvider,
            'drive_file_id' => $driveFileId,
            'drive_folder_id' => $driveFolderId,
            'file_name' => $fileName,
            'mime_type' => $mimeType,
            'file_size_bytes' => $fileSize,
            'checksum_sha256' => $sha256,
            'group_id' => $groupId,
            'uploaded_by' => $uploadedBy,
            'status' => 'ACTIVE'
        ];

        $insertRes = $supabase->query('media_assets', 'POST', $assetPayload);
        $assetId = $insertRes['data'][0]['id'] ?? null;

        if (!$assetId) {
            error_log('[StorageBridgeService] Failed to record media_asset in DB: status ' . ($insertRes['status'] ?? 'unknown'));
            if ($storageProvider === 'GOOGLE_DRIVE' && $driveService !== null) {
                @$driveService->deleteFile($driveFileId);
            }
            throw new \RuntimeException('تعذر تسجيل بيانات الملف في قاعدة البيانات');
        }

        $fileUrl = $this->publicUrl . '/api/storage/file/' . $assetId;

        return [
            'asset_id' => $assetId,
            'filename' => $fileName,
            'file_url' => $fileUrl,
            'relative_path' => $relativePath,
            'file_size' => $fileSize,
            'mime_type' => $mimeType,
            'sha256' => $sha256,
            'drive_file_id' => $driveFileId,
            'storage_provider' => $storageProvider,
            'resource_type' => $resourceType,
            'group_id' => $groupId,
            'is_duplicate' => false
        ];
    }

    /**
     * Stream a local file from storage root with full RFC 7233 Byte-Range support
     */
    public function streamLocalFile(
        string $driveFileId,
        ?string $rangeHeader = null,
        string $mimeType = 'application/octet-stream',
        string $fileName = 'file',
        int $fileSize = 0,
        ?string $checksum = null
    ): void {
        $root = realpath($this->rootDir);
        if ($root === false) {
            http_response_code(500);
            exit;
        }

        $foundPath = null;

        // Direct path resolution from driveFileId (relative path stored in DB)
        // instead of recursive directory scan for performance and cross-group isolation
        $directPath = $root . '/' . ltrim(str_replace(['..', "\0"], '', $driveFileId), '/\\');
        $directReal = realpath($directPath);
        if ($directReal !== false && is_file($directReal) && str_starts_with($directReal, $root)) {
            if ($checksum === null || $checksum === '' || hash_file('sha256', $directReal) === $checksum) {
                $foundPath = $directReal;
            }
        }

        // Fallback: search by filename with checksum verification (for legacy records)
        if (!$foundPath) {
            $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root));
            foreach ($iterator as $item) {
                if ($item->isFile() && $item->getFilename() === $fileName) {
                    if ($checksum === null || $checksum === '' || hash_file('sha256', $item->getPathname()) === $checksum) {
                        $foundPath = $item->getPathname();
                        break;
                    }
                }
            }
        }

        if (!$foundPath || !is_file($foundPath)) {
            http_response_code(404);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'الملف غير موجود على السيرفر المحلي']);
            exit;
        }

        $realSize = filesize($foundPath);
        $start = 0;
        $end = $realSize > 0 ? $realSize - 1 : 0;
        $isRange = false;

        if ($rangeHeader && preg_match('/bytes=(\d+)-(\d*)/', $rangeHeader, $matches)) {
            $isRange = true;
            $start = (int)$matches[1];
            if (!empty($matches[2])) {
                $end = (int)$matches[2];
            }
            if ($start > $end || ($realSize > 0 && $start >= $realSize)) {
                http_response_code(416);
                header("Content-Range: bytes */{$realSize}");
                exit;
            }
        }

        $fp = fopen($foundPath, 'rb');
        if (!$fp) {
            http_response_code(500);
            exit;
        }

        if ($isRange) {
            http_response_code(206);
            $length = $end - $start + 1;
            header('Content-Type: ' . $mimeType);
            header("Content-Range: bytes {$start}-{$end}/{$realSize}");
            header('Content-Length: ' . $length);
            header('Accept-Ranges: bytes');
            fseek($fp, $start);
        } else {
            http_response_code(200);
            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . $realSize);
            header('Accept-Ranges: bytes');
            header('Content-Disposition: inline; filename="' . rawurlencode($fileName) . '"');
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $bytesLeft = $isRange ? ($end - $start + 1) : $realSize;
        while ($bytesLeft > 0 && !feof($fp)) {
            $chunkSize = min(8192, $bytesLeft);
            $data = fread($fp, $chunkSize);
            if ($data === false) break;
            echo $data;
            flush();
            $bytesLeft -= strlen($data);
        }
        fclose($fp);
        exit;
    }

    public function deleteFile(string $relativePath): bool {
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
        if ($fullPath === false || !is_file($fullPath)) {
            return false;
        }
        if ($fullPath !== $root && !str_starts_with($fullPath, $root . DIRECTORY_SEPARATOR)) {
            return false;
        }

        return unlink($fullPath);
    }
}
