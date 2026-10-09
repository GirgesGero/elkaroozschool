<?php
namespace App\Services;

use App\Utils\ClientIp;

class AuditLogService {
    public static function log(
        ?string $actorId,
        string $actorName,
        string $actorRole,
        string $action,
        string $entityType,
        string $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        $client = new SupabaseClient();

        // X-Forwarded-For used to be read directly here, which let any caller write an
        // arbitrary string into ip_address: a forged row in the audit trail is worth
        // more than a forged address, because the trail is what a later investigation
        // trusts. ClientIp only returns a validated address, and only from a trusted
        // proxy, so an absent or bogus header falls back to the real REMOTE_ADDR.
        $ip = ClientIp::resolve();
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

        $payload = [
            'actor_id' => $actorId,
            'actor_name' => $actorName,
            'actor_role' => $actorRole,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => (string)$entityId,
            'old_values' => $oldValues ? json_encode($oldValues, JSON_UNESCAPED_UNICODE) : null,
            'new_values' => $newValues ? json_encode($newValues, JSON_UNESCAPED_UNICODE) : null,
            'ip_address' => $ip,
            'user_agent' => $userAgent
        ];

        $client->query('audit_logs', 'POST', $payload);
    }
}
