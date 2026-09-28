<?php
namespace App\Services;

class SupabaseClient {
    private string $url;
    private string $serviceRoleKey;

    public function __construct() {
        $config = require dirname(__DIR__, 2) . '/config/supabase.php';
        $this->url = rtrim($config['url'], '/');
        $this->serviceRoleKey = $config['service_role_key'] ?: $config['anon_key'];
    }

    public function query(string $endpoint, string $method = 'GET', ?array $body = null, array $extraHeaders = []): array {
        $ch = curl_init();
        $headers = array_merge([
            'apikey: ' . $this->serviceRoleKey,
            'Authorization: Bearer ' . $this->serviceRoleKey,
            'Content-Type: application/json',
            'Prefer: return=representation'
        ], $extraHeaders);

        curl_setopt($ch, CURLOPT_URL, $this->url . '/rest/v1/' . ltrim($endpoint, '/'));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

        if ($body !== null && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response, true);
        return [
            'status' => $httpCode,
            'data' => $decoded
        ];
    }
}
