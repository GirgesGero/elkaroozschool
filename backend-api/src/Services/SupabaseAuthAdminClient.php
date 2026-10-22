<?php

declare(strict_types=1);

namespace App\Services;

use App\Utils\AppRoot;
use Closure;
use InvalidArgumentException;
use RuntimeException;

final class SupabaseAuthAdminClient
{
    private string $url;
    private string $serviceRoleKey;
    private string $anonKey;
    private ?Closure $transport;

    /** @param null|callable(string,string,array):array $transport */
    public function __construct(?array $config = null, ?callable $transport = null)
    {
        $config ??= require AppRoot::path('config/supabase.php');
        $this->url = rtrim((string) ($config['url'] ?? ''), '/');
        $this->serviceRoleKey = (string) ($config['service_role_key'] ?? '');
        $this->anonKey = (string) ($config['anon_key'] ?? '');
        $this->transport = $transport === null ? null : Closure::fromCallable($transport);
    }

    /** @return array{success:bool,deleted:bool,already_missing:bool,retryable:bool,error_code:?string} */
    public static function interpretDeleteResponse(int $httpCode, bool $networkError): array
    {
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

    /** @return array{success:bool,deleted:bool,already_missing:bool,retryable:bool,error_code:?string} */
    public function deleteUser(string $userId): array
    {
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $userId)) {
            throw new InvalidArgumentException('Invalid Auth user ID');
        }
        if ($this->url === '' || $this->serviceRoleKey === ''
            || $this->anonKey === $this->serviceRoleKey) {
            throw new RuntimeException('Supabase Auth Admin is not configured');
        }

        $url = $this->url . '/auth/v1/admin/users/' . rawurlencode($userId);
        $headers = [
            'apikey: ' . $this->serviceRoleKey,
            'Authorization: Bearer ' . $this->serviceRoleKey,
            'Accept: application/json',
        ];
        if ($this->transport !== null) {
            $response = ($this->transport)('DELETE', $url, $headers);
            return self::interpretDeleteResponse(
                (int) ($response['status'] ?? 0),
                (bool) ($response['network_error'] ?? false)
            );
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'DELETE',
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $networkError = $body === false || curl_errno($ch) !== 0;
        curl_close($ch);
        return self::interpretDeleteResponse($status, $networkError);
    }
}
