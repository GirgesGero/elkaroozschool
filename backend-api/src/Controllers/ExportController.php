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

        // Export is an admin-only capability by product decision: bulk
        // exfiltration of trainee PII (name, phone, birth date) must not be
        // reachable by any group-scoped role. Only admin and super_user keep
        // it; super_user stays global because that is its role everywhere else.
        //
        // This tightens the previous rule, which allowed servant and
        // secretariat to export their own group. That was already contained
        // to the caller's own group, but "contained" is not the requirement —
        // the requirement is admin-only.
        RbacMiddleware::requireRoles($user, ['admin', 'super_user']);

        $entity = $_GET['entity'] ?? 'trainees';
        $format = $_GET['format'] ?? 'csv';

        // Global roles select the group explicitly. group_id=0 means all
        // groups. The value is cast to int, so it cannot be used to inject
        // anything into the PostgREST query string.
        $groupId = isset($_GET['group_id']) ? (int)$_GET['group_id'] : 0;
        if ($groupId < 0) {
            $groupId = 0;
        }

        $client = new SupabaseClient();
        $query = "profiles?role_id=eq.trainee&deleted_at=is.null";
        if ($groupId > 0) {
            $query .= "&group_id=eq.{$groupId}";
        }
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
