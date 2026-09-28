<?php
namespace App\Services;

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
        
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
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
