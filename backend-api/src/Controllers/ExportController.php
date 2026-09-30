<?php
namespace App\Controllers;

use App\Middleware\JwtAuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Middleware\GroupScopeMiddleware;
use App\Services\SupabaseClient;
use App\Services\AuditLogService;
use App\Utils\Response;

class ExportController {
    public function exportData(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireRoles($user, ['admin', 'super_user', 'servant', 'secretariat']);

        $entity = $_GET['entity'] ?? 'trainees';
        $format = $_GET['format'] ?? 'csv';

        // The group MUST come from the verified token, never from the query
        // string. This used to read $_GET['group_id'] for every role, so any
        // servant could export any other group's trainees by hand-editing the
        // URL. Only admin/super_user may select a group explicitly, and
        // group_id=0 means "all groups" for them.
        $role = $user['role'] ?? 'trainee';
        $isGlobal = in_array($role, ['admin', 'super_user'], true);

        if ($isGlobal) {
            $groupId = isset($_GET['group_id']) ? (int)$_GET['group_id'] : 0;
        } else {
            $groupId = (int)($user['group_id'] ?? 0);
            if ($groupId <= 0) {
                Response::error('تعذر تحديد الفرقة الدراسية من رمز المصادقة', 'NO_GROUP', 403);
            }
        }

        // Non-global callers are still checked explicitly: this is the actual
        // enforcement point, not the query string.
        if (!$isGlobal) {
            GroupScopeMiddleware::enforceGroupScope($user, $groupId);
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
