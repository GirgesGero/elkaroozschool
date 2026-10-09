<?php
// backend-api/src/Services/GoogleAppsScriptBridgeService.php
// Secure Google Apps Script REST Bridge Client for Google Drive Access

declare(strict_types=1);

namespace App\Services;

use Throwable;

class GoogleAppsScriptBridgeService
{
    private ?string $scriptUrl;
    private ?string $accessToken;
    private int $timeoutSeconds;

    public function __construct(?string $url = null, ?string $token = null, int $timeoutSeconds = 25)
    {
        $this->scriptUrl = $url ?: getenv('GOOGLE_APPS_SCRIPT_URL');
        $this->accessToken = $token ?: getenv('GOOGLE_APPS_SCRIPT_TOKEN');
        $this->timeoutSeconds = $timeoutSeconds;
    }

    /**
     * Check if the Apps Script Bridge is configured with URL and Token
     */
    public function isConfigured(): bool
    {
        return !empty($this->scriptUrl) && !empty($this->accessToken);
    }

    /**
     * Call the Google Apps Script Web App Endpoint
     */
    public function call(string $action, array $params = []): ?array
    {
        if (!$this->isConfigured()) {
            return null;
        }

        $params['action'] = $action;
        $params['token'] = $this->accessToken;

        $postData = json_encode($params);

        $ch = curl_init($this->scriptUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Bearer ' . $this->accessToken,
            ],
            CURLOPT_FOLLOWLOCATION => true, // Essential for Google Apps Script 302 redirects
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'ELKAROOZ-School-Backend/2.0',
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError || $httpCode < 200 || $httpCode >= 400) {
            error_log(sprintf('[GoogleAppsScriptBridge] Request failed for action "%s" with HTTP %d: %s', $action, $httpCode, $curlError ?: ''));
            return null;
        }

        $result = json_decode((string)$response, true);
        if (!is_array($result) || empty($result['ok'])) {
            $errCode = $result['error']['code'] ?? 'UNKNOWN_ERROR';
            $errMsg = $result['error']['message'] ?? 'Unknown error';
            error_log(sprintf('[GoogleAppsScriptBridge] Remote error [%s]: %s', $errCode, $errMsg));
            return null;
        }

        return $result['data'] ?? [];
    }

    /**
     * Fetch a binary/text file payload and return decoded content
     */
    public function fetchFilePayload(string $action, array $params = []): ?string
    {
        $data = $this->call($action, $params);
        if (!$data || empty($data['base64'])) {
            return null;
        }

        $raw = base64_decode((string)$data['base64']);
        if ($raw === false) {
            return null;
        }

        if (!empty($data['is_gz'])) {
            $decompressed = @gzdecode($raw);
            if ($decompressed !== false) {
                return $decompressed;
            }
        }

        return $raw;
    }

    /**
     * Fetch file by relative path inside BIBLE/v1
     */
    public function fetchFileByPath(string $relPath): ?string
    {
        return $this->fetchFilePayload('file', ['path' => $relPath]);
    }
}
