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
    private ?string $serviceAccountJsonPath;
    private ?string $cachedAccessToken = null;
    private int $tokenExpiresAt = 0;
    private int $timeoutSeconds;

    public function __construct(?string $jsonPath = null, int $timeoutSeconds = 30) {
        $this->serviceAccountJsonPath = $jsonPath ?: getenv('GOOGLE_SERVICE_ACCOUNT_JSON_PATH');
        $this->timeoutSeconds = $timeoutSeconds;
    }

    /**
     * Generate or return a cached OAuth 2.0 Access Token for the Service Account.
     */
    public function getAccessToken(): string {
        if ($this->cachedAccessToken && time() < ($this->tokenExpiresAt - 60)) {
            return $this->cachedAccessToken;
        }

        if (!$this->serviceAccountJsonPath || !is_file($this->serviceAccountJsonPath)) {
            throw new \RuntimeException('Google Service Account key file not found: ' . ($this->serviceAccountJsonPath ?: 'NOT_SET'));
        }

        $keyContent = file_get_contents($this->serviceAccountJsonPath);
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
     * Download a file from Google Drive to local filesystem.
     */
    public function downloadFile(string $driveFileId, string $localPath): bool {
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

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
            ],
            CURLOPT_FILE => $fp,
            CURLOPT_TIMEOUT => $this->timeoutSeconds * 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_FOLLOWLOCATION => true,
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        fclose($fp);

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
     * Delete a file permanently from Google Drive.
     */
    public function deleteFile(string $driveFileId): bool {
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $driveFileId)) {
            throw new \InvalidArgumentException('Invalid Google Drive file ID');
        }

        $token = $this->getAccessToken();
        $ch = curl_init('https://www.googleapis.com/drive/v3/files/' . urlencode($driveFileId) . '?supportsAllDrives=true');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'DELETE',
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
            ],
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ($httpCode === 204 || $httpCode === 200);
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

    private function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
