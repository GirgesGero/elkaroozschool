<?php
namespace App\Services;

use App\Utils\Security;

/**
 * Google Drive API Service using Google Cloud Service Account (OAuth 2.0 JWT Bearer Flow).
 *
 * Implements direct HTTP calls via cURL and RS256 token generation via OpenSSL,
 * eliminating heavy dependencies for high performance and compatibility with Hostinger.
 */
class GoogleDriveService {
    private ?string $serviceAccountCredential;
    private ?string $cachedAccessToken = null;
    private int $tokenExpiresAt = 0;
    private int $timeoutSeconds;

    public function __construct(?string $jsonOrPath = null, int $timeoutSeconds = 30) {
        $this->serviceAccountCredential = $jsonOrPath ?: (getenv('GOOGLE_SERVICE_ACCOUNT_JSON') ?: getenv('GOOGLE_SERVICE_ACCOUNT_JSON_PATH'));
        $this->timeoutSeconds = $timeoutSeconds;
    }

    /**
     * Generate or return a cached OAuth 2.0 Access Token for the Service Account.
     * Fully in-memory: parses raw JSON or reads key file directly without writing to /tmp.
     */
    public function getAccessToken(): string {
        if ($this->cachedAccessToken && time() < ($this->tokenExpiresAt - 60)) {
            return $this->cachedAccessToken;
        }

        if (!$this->serviceAccountCredential) {
            throw new \RuntimeException('Google Service Account credentials not configured (neither JSON nor file path)');
        }

        $trimmed = trim($this->serviceAccountCredential);
        if (str_starts_with($trimmed, '{')) {
            $keyContent = $trimmed;
        } elseif (is_file($this->serviceAccountCredential)) {
            $keyContent = file_get_contents($this->serviceAccountCredential);
        } else {
            throw new \RuntimeException('Google Service Account key file not found: ' . $this->serviceAccountCredential);
        }

        $keyData = json_decode((string)$keyContent, true);
        if (!is_array($keyData) || empty($keyData['client_email']) || empty($keyData['private_key'])) {
            throw new \RuntimeException('Invalid Google Service Account JSON key structure');
        }

        $now = time();
        $jwtHeader = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
        $jwtClaimSet = json_encode([
            'iss' => $keyData['client_email'],
            'scope' => 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now,
        ]);

        $base64UrlHeader = $this->base64UrlEncode($jwtHeader);
        $base64UrlClaimSet = $this->base64UrlEncode($jwtClaimSet);
        $signatureInput = $base64UrlHeader . '.' . $base64UrlClaimSet;

        $privateKey = openssl_pkey_get_private($keyData['private_key']);
        if (!$privateKey) {
            throw new \RuntimeException('Failed to load private key from Service Account credentials');
        }

        $signature = '';
        if (!openssl_sign($signatureInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new \RuntimeException('Failed to sign OAuth assertion token');
        }

        $assertion = $signatureInput . '.' . $this->base64UrlEncode($signature);

        // Exchange JWT assertion for OAuth access token
        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $assertion,
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError || $httpCode !== 200) {
            throw new \RuntimeException('Failed to obtain Google OAuth access token (HTTP ' . $httpCode . '): ' . ($curlError ?: (string)$response));
        }

        $tokenData = json_decode((string)$response, true);
        if (empty($tokenData['access_token'])) {
            throw new \RuntimeException('Access token not present in Google OAuth response');
        }

        $this->cachedAccessToken = (string)$tokenData['access_token'];
        $this->tokenExpiresAt = $now + (int)($tokenData['expires_in'] ?? 3600);

        return $this->cachedAccessToken;
    }

    /**
     * Find a file by exact name inside a specific parent folder in Google Drive.
     */
    public function findFileInFolder(string $fileName, string $folderId): ?array {
        $token = $this->getAccessToken();
        
        $safeName = str_replace("'", "\\'", $fileName);
        $safeFolder = str_replace("'", "\\'", $folderId);
        $q = "name = '{$safeName}' and '{$safeFolder}' in parents and trashed = false";

        $url = 'https://www.googleapis.com/drive/v3/files?' . http_build_query([
            'q' => $q,
            'supportsAllDrives' => 'true',
            'includeItemsFromAllDrives' => 'true',
            'fields' => 'files(id,name,size,mimeType,md5Checksum)',
            'pageSize' => 1
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
            ],
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError || $httpCode !== 200) {
            error_log("[GoogleDriveService] findFileInFolder failed (HTTP {$httpCode}): " . ($curlError ?: (string)$response));
            return null;
        }

        $data = json_decode((string)$response, true);
        $files = $data['files'] ?? [];
        return !empty($files[0]) ? $files[0] : null;
    }

    /**
     * Find a subfolder ID by name inside a parent folder.
     */
    public function findSubfolderId(string $folderName, string $parentFolderId): ?string {
        $token = $this->getAccessToken();
        
        $safeName = str_replace("'", "\\'", $folderName);
        $safeFolder = str_replace("'", "\\'", $parentFolderId);
        $q = "mimeType = 'application/vnd.google-apps.folder' and name = '{$safeName}' and '{$safeFolder}' in parents and trashed = false";

        $url = 'https://www.googleapis.com/drive/v3/files?' . http_build_query([
            'q' => $q,
            'supportsAllDrives' => 'true',
            'includeItemsFromAllDrives' => 'true',
            'fields' => 'files(id,name)',
            'pageSize' => 1
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
            ],
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            return null;
        }

        $data = json_decode((string)$response, true);
        $files = $data['files'] ?? [];
        return !empty($files[0]['id']) ? (string)$files[0]['id'] : null;
    }

    /**
     * Download a file from Google Drive to local filesystem with bounded size protection.
     *
     * @param string $driveFileId Valid Google Drive file ID
     * @param string $localPath Destination local file path
     * @param int $maxSizeBytes Max file size allowed (default 100 MB) to protect against DoS
     */
    public function downloadFile(string $driveFileId, string $localPath, int $maxSizeBytes = 104857600): bool {
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $driveFileId)) {
            throw new \InvalidArgumentException('Invalid Google Drive file ID');
        }

        $token = $this->getAccessToken();
        $url = 'https://www.googleapis.com/drive/v3/files/' . urlencode($driveFileId) . '?alt=media&supportsAllDrives=true';

        $dir = dirname($localPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $fp = fopen($localPath, 'wb');
        if (!$fp) {
            throw new \RuntimeException('Failed to open local file for writing: ' . $localPath);
        }

        $downloadedBytes = 0;
        $exceededLimit = false;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
            ],
            CURLOPT_TIMEOUT => $this->timeoutSeconds * 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_WRITEFUNCTION => function($curl, $chunk) use ($fp, &$downloadedBytes, $maxSizeBytes, &$exceededLimit) {
                $len = strlen($chunk);
                $downloadedBytes += $len;
                if ($downloadedBytes > $maxSizeBytes) {
                    $exceededLimit = true;
                    return 0; // Abort transfer immediately
                }
                return fwrite($fp, $chunk);
            }
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        fclose($fp);

        if ($exceededLimit) {
            @unlink($localPath);
            error_log("[GoogleDriveService] downloadFile aborted: file exceeded size limit ({$maxSizeBytes} bytes)");
            throw new \RuntimeException("حجم الملف يتجاوز الحد الأقصى المسموح به ({$maxSizeBytes} بايت)");
        }

        if (!$result || $httpCode < 200 || $httpCode >= 300) {
            @unlink($localPath);
            error_log("[GoogleDriveService] downloadFile failed (HTTP {$httpCode}): " . ($curlError ?: 'unknown'));
            return false;
        }

        return true;
    }

    /**
     * Upload a local file to a specific Google Drive folder.
     */
    public function uploadFile(string $localFilePath, string $fileName, string $mimeType, string $folderId): array {
        if (!is_file($localFilePath)) {
            throw new \InvalidArgumentException('Local file not found for upload');
        }

        $token = $this->getAccessToken();
        $fileSize = filesize($localFilePath);
        $boundary = '-------' . bin2hex(random_bytes(16));

        $metadata = json_encode([
            'name' => Security::sanitizeFilename($fileName),
            'parents' => [$folderId],
        ]);

        $multipartBody = "--" . $boundary . "\r\n"
            . "Content-Type: application/json; charset=UTF-8\r\n\r\n"
            . $metadata . "\r\n"
            . "--" . $boundary . "\r\n"
            . "Content-Type: " . $mimeType . "\r\n\r\n"
            . file_get_contents($localFilePath) . "\r\n"
            . "--" . $boundary . "--";

        $ch = curl_init('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,size,mimeType,md5Checksum,createdTime');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $multipartBody,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Content-Type: multipart/related; boundary=' . $boundary,
                'Content-Length: ' . strlen($multipartBody),
            ],
            CURLOPT_TIMEOUT => $this->timeoutSeconds * 2,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \RuntimeException('Google Drive upload failed with HTTP ' . $httpCode);
        }

        $result = json_decode((string)$response, true);
        if (empty($result['id'])) {
            throw new \RuntimeException('Google Drive did not return file ID');
        }

        return [
            'drive_file_id' => $result['id'],
            'name' => $result['name'] ?? $fileName,
            'size' => (int)($result['size'] ?? $fileSize),
            'mime_type' => $result['mimeType'] ?? $mimeType,
        ];
    }

    /**
     * Normalize Drive DELETE outcomes; 404 is idempotent success, not an ambiguous failure.
     * @return array{success:bool,deleted:bool,already_missing:bool,retryable:bool,error_code:?string}
     */
    public static function interpretDeleteResponse(int $httpCode, bool $networkError): array {
        if ($networkError || $httpCode === 0) {
            return ['success' => false, 'deleted' => false, 'already_missing' => false, 'retryable' => true, 'error_code' => 'NETWORK_ERROR'];
        }
        if ($httpCode === 200 || $httpCode === 204) {
            return ['success' => true, 'deleted' => true, 'already_missing' => false, 'retryable' => false, 'error_code' => null];
        }
        if ($httpCode === 404) {
            return ['success' => true, 'deleted' => false, 'already_missing' => true, 'retryable' => false, 'error_code' => null];
        }
        if ($httpCode === 408 || $httpCode === 429 || $httpCode >= 500) {
            return ['success' => false, 'deleted' => false, 'already_missing' => false, 'retryable' => true, 'error_code' => 'HTTP_' . $httpCode];
        }
        return ['success' => false, 'deleted' => false, 'already_missing' => false, 'retryable' => false, 'error_code' => 'HTTP_' . $httpCode];
    }

    /** Delete a Drive file and return a retry-safe status without leaking response bodies. */
    public function deleteFileDetailed(string $driveFileId): array {
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $driveFileId)) {
            throw new \InvalidArgumentException('Invalid Google Drive file ID');
        }
        $token = $this->getAccessToken();
        $ch = curl_init('https://www.googleapis.com/drive/v3/files/' . urlencode($driveFileId) . '?supportsAllDrives=true');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'DELETE',
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $networkError = $response === false || curl_errno($ch) !== 0;
        curl_close($ch);
        return self::interpretDeleteResponse($httpCode, $networkError);
    }

    /** Backward-compatible bool wrapper for existing delete callers. */
    public function deleteFile(string $driveFileId): bool {
        return $this->deleteFileDetailed($driveFileId)['deleted'];
    }

    /**
     * Enumerate all non-folder files under an app-owned Drive folder; any API error aborts
     * the inventory so callers cannot treat a partial list as a complete audit.
     * @return list<array{id:string,name:string,mimeType:string,parents:array}>
     */
    public function listFilesRecursively(string $rootFolderId, int $maxFiles = 10000, int $maxDepth = 20): array {
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $rootFolderId)) {
            throw new \InvalidArgumentException('Invalid Google Drive root folder ID');
        }
        if ($maxFiles < 1 || $maxFiles > 50000 || $maxDepth < 1 || $maxDepth > 50) {
            throw new \InvalidArgumentException('Invalid Drive inventory limits');
        }
        $token = $this->getAccessToken();
        $files = [];
        $visited = [];
        $queue = [[$rootFolderId, 0]];
        $folderMime = 'application/vnd.google-apps.folder';
        while ($queue !== []) {
            [$folderId, $depth] = array_shift($queue);
            if (isset($visited[$folderId])) continue;
            if ($depth > $maxDepth) throw new \RuntimeException('Drive inventory exceeded maximum folder depth');
            $visited[$folderId] = true;
            $pageToken = null;
            do {
                $query = "'" . $folderId . "' in parents and trashed = false";
                $url = 'https://www.googleapis.com/drive/v3/files?q=' . rawurlencode($query)
                    . '&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true'
                    . '&fields=' . rawurlencode('nextPageToken,files(id,name,mimeType,parents)');
                if ($pageToken !== null) $url .= '&pageToken=' . rawurlencode($pageToken);
                $ch = curl_init($url);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
                    CURLOPT_TIMEOUT => $this->timeoutSeconds,
                    CURLOPT_SSL_VERIFYPEER => true,
                ]);
                $body = curl_exec($ch);
                $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $networkError = $body === false || curl_errno($ch) !== 0;
                curl_close($ch);
                if ($networkError || $status < 200 || $status >= 300) {
                    throw new \RuntimeException('Drive inventory request failed (HTTP ' . $status . ')');
                }
                $page = json_decode((string) $body, true);
                if (!is_array($page) || !is_array($page['files'] ?? null)) {
                    throw new \RuntimeException('Drive inventory returned an invalid response');
                }
                foreach ($page['files'] as $item) {
                    if (!is_array($item) || empty($item['id']) || empty($item['mimeType'])) {
                        throw new \RuntimeException('Drive inventory returned an incomplete item');
                    }
                    if ($item['mimeType'] === $folderMime) {
                        $queue[] = [(string) $item['id'], $depth + 1];
                    } else {
                        $files[] = [
                            'id' => (string) $item['id'],
                            'name' => (string) ($item['name'] ?? ''),
                            'mimeType' => (string) $item['mimeType'],
                            'parents' => is_array($item['parents'] ?? null) ? $item['parents'] : [],
                        ];
                        if (count($files) > $maxFiles) throw new \RuntimeException('Drive inventory exceeded maximum file count');
                    }
                }
                $pageToken = isset($page['nextPageToken']) ? (string) $page['nextPageToken'] : null;
            } while ($pageToken !== null && $pageToken !== '');
        }
        return $files;
    }

    /**
     * Get file metadata from Google Drive.
     */
    public function getFileMetadata(string $driveFileId): array {
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $driveFileId)) {
            throw new \InvalidArgumentException('Invalid Google Drive file ID');
        }

        $token = $this->getAccessToken();
        $ch = curl_init('https://www.googleapis.com/drive/v3/files/' . urlencode($driveFileId) . '?supportsAllDrives=true&fields=id,name,size,mimeType,md5Checksum,createdTime,parents');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
            ],
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \RuntimeException('Failed to fetch Google Drive file metadata (HTTP ' . $httpCode . ')');
        }

        $data = json_decode((string)$response, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Create a directory/folder in Google Drive (supports Shared Drives).
     */
    public function createFolder(string $folderName, ?string $parentFolderId = null): array {
        $token = $this->getAccessToken();

        $body = [
            'name' => Security::sanitizeFilename($folderName),
            'mimeType' => 'application/vnd.google-apps.folder',
        ];
        if ($parentFolderId) {
            $body['parents'] = [$parentFolderId];
        }

        $ch = curl_init('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,mimeType');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($body),
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json; charset=UTF-8',
            ],
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \RuntimeException('Failed to create folder in Google Drive (HTTP ' . $httpCode . ')');
        }

        $data = json_decode((string)$response, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Stream a file from Google Drive directly to client with HTTP 206 Byte-Range support (RFC 7233).
     */
    public function streamFile(
        string $driveFileId,
        ?string $rangeHeader = null,
        string $mimeType = 'application/octet-stream',
        string $fileName = 'file',
        int $fileSize = 0
    ): void {
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $driveFileId)) {
            throw new \InvalidArgumentException('Invalid Google Drive file ID');
        }

        $token = $this->getAccessToken();

        if ($fileSize <= 0) {
            $meta = $this->getFileMetadata($driveFileId);
            $fileSize = (int)($meta['size'] ?? 0);
            if (!empty($meta['mimeType'])) {
                $mimeType = (string)$meta['mimeType'];
            }
        }

        $start = 0;
        $end = $fileSize > 0 ? $fileSize - 1 : 0;
        $isRange = false;

        if ($rangeHeader && preg_match('/bytes=(\d+)-(\d*)/', $rangeHeader, $matches)) {
            $isRange = true;
            $start = (int)$matches[1];
            if (!empty($matches[2])) {
                $end = (int)$matches[2];
            }
            if ($start > $end || ($fileSize > 0 && $start >= $fileSize)) {
                http_response_code(416);
                header("Content-Range: bytes */{$fileSize}");
                exit;
            }
        }

        $headers = [
            'Authorization: Bearer ' . $token,
        ];
        if ($isRange) {
            $headers[] = "Range: bytes={$start}-{$end}";
        }

        $url = 'https://www.googleapis.com/drive/v3/files/' . urlencode($driveFileId) . '?alt=media&supportsAllDrives=true';

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => $this->timeoutSeconds * 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HEADER => false,
            CURLOPT_WRITEFUNCTION => function($curl, $data) {
                echo $data;
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
                return strlen($data);
            }
        ]);

        if ($isRange) {
            http_response_code(206);
            $length = $end - $start + 1;
            header('Content-Type: ' . $mimeType);
            header("Content-Range: bytes {$start}-{$end}/{$fileSize}");
            header('Content-Length: ' . $length);
            header('Accept-Ranges: bytes');
        } else {
            http_response_code(200);
            header('Content-Type: ' . $mimeType);
            if ($fileSize > 0) {
                header('Content-Length: ' . $fileSize);
            }
            header('Accept-Ranges: bytes');
            header('Content-Disposition: inline; filename="' . rawurlencode($fileName) . '"');
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $success = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!$success || $httpCode >= 400) {
            throw new \RuntimeException("Google Drive stream failed with HTTP {$httpCode}");
        }
        exit;
    }

    private function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
