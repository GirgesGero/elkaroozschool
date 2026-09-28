<?php
namespace App\Controllers;

use App\Middleware\JwtAuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Services\SupabaseClient;
use App\Services\AuditLogService;
use App\Utils\Response;

class ExportController {
    public function exportData(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireRoles($user, ['admin', 'super_user', 'servant', 'secretariat']);

        $entity = $_GET['entity'] ?? 'trainees';
        $format = $_GET['format'] ?? 'csv';
        $groupId = isset($_GET['group_id']) ? (int)$_GET['group_id'] : (int)($user['group_id'] ?? 1);

        $client = new SupabaseClient();
        $query = "profiles?role_id=eq.trainee&group_id=eq.{$groupId}&deleted_at=is.null";
        $res = $client->query($query);
        $data = $res['data'] ?? [];

        AuditLogService::log(
            $user['user_id'],
            $user['claims']['user_metadata']['full_name'] ?? 'مستخدم',
            $user['role'],
            'DATA_EXPORT',
            $entity,
            (string)$groupId,
            null,
            ['entity' => $entity, 'format' => $format, 'count' => count($data)]
        );

        if ($format === 'csv') {
            header('Content-Type: text/csv; charset=utf-8');
            header("Content-Disposition: attachment; filename=elkarooz_{$entity}_group_{$groupId}.csv");
            $output = fopen('php://output', 'w');
            fputs($output, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel

            if (!empty($data)) {
                fputcsv($output, array_keys($data[0]));
                foreach ($data as $row) {
                    fputcsv($output, array_map(fn($v) => is_array($v) ? json_encode($v) : $v, $row));
                }
            }
            fclose($output);
            exit;
        }

        Response::success($data, 'بيانات التصدير');
    }
}
