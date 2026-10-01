<?php
namespace App\Services;

use App\Utils\AppRoot;

class SupabaseClient {
    private string $url;
    private string $serviceRoleKey;

    /**
     * Actor token to present instead of the service-role key.
     *
     * Several SECURITY DEFINER functions gate on auth.uid(), e.g.
     * import_trainees_bulk_atomic raises unless is_admin_or_super_user() is true.
     * A service_role request carries no user sub, so auth.uid() is NULL and the
     * gate always fails. When the controller already authenticated a real user
     * via JwtAuthMiddleware, passing that token through makes auth.uid() resolve
     * to the human actor and keeps the DB-side check meaningful instead of
     * bypassed or dead.
     */
    private ?string $actorToken = null;

    public function __construct() {
        $config = require AppRoot::path('config/supabase.php');
        $this->url = rtrim($config['url'], '/');
        $this->serviceRoleKey = $config['service_role_key'] ?: $config['anon_key'];
    }

    public function withActorToken(?string $token): self {
        $this->actorToken = $token;
        return $this;
    }

    public function query(string $endpoint, string $method = 'GET', ?array $body = null, array $extraHeaders = []): array {
        $ch = curl_init();
        $credential = $this->actorToken ?? $this->serviceRoleKey;
        $headers = array_merge([
            'apikey: ' . $credential,
            'Authorization: Bearer ' . $credential,
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

        $decoded = json_decode((string) $response, true);
        return [
            'status' => $httpCode,
            'data' => $decoded
        ];
    }

    /**
     * Call a Postgres function over PostgREST.
     *
     * Separate from query() because RPCs live under /rest/v1/rpc/<name> and take
     * named arguments. Without this, the only way to reach an atomic DB operation
     * from PHP is to issue several independent REST calls, which is exactly the
     * sequence ImportController must not do.
     */
    public function rpc(string $function, array $args = []): array {
        return $this->query('rpc/' . rawurlencode($function), 'POST', $args);
    }
}
