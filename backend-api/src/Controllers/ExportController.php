<?php
namespace App\Controllers;

use App\Middleware\JwtAuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Services\SupabaseClient;
use App\Services\AuditLogService;
use App\Services\SpreadsheetWriter;
use App\Services\SpreadsheetUnavailableException;
use App\Utils\Response;

/**
 * Bulk data export (SRS 35).
 *
 * Export is admin-only by product decision: bulk exfiltration of trainee PII
 * (name, phone, birth date) must not be reachable by any group-scoped role. Only
 * admin and super_user keep it; super_user stays global because that is its role
 * everywhere else. This tightens the previous rule that allowed servant and
 * secretariat to export their own group — "contained" is not the requirement.
 */
class ExportController {
    use SafeFailure;

    /**
     * Allowlist of exportable entities.
     *
     * $entity used to be accepted from the query string but never used to pick a
     * table: every request exported `profiles` filtered to trainees while logging
     * the requested entity name, so entity=attendance_records silently returned
     * trainee PII under the wrong label. It is an allowlist key now, so an unknown
     * entity is a 400 rather than a confidently mislabelled dataset.
     */
    private const ENTITIES = [
        'trainees' => [
            'query'  => 'profiles?role_id=eq.trainee&deleted_at=is.null&order=full_name',
            'scoped' => true,
            'label'  => [
                'username'   => 'اسم المستخدم',
                'full_name'  => 'الاسم بالكامل',
                'group_id'   => 'رقم الفرقة',
                'phone'      => 'الهاتف',
                'birth_date' => 'تاريخ الميلاد',
                'address'    => 'العنوان',
                'is_active'  => 'نشط',
            ],
        ],
        'servants' => [
            'query'  => 'profiles?role_id=eq.servant&deleted_at=is.null&order=full_name',
            'scoped' => true,
            'label'  => [
                'username'  => 'اسم المستخدم',
                'full_name' => 'الاسم بالكامل',
                'group_id'  => 'رقم الفرقة',
                'phone'     => 'الهاتف',
                'is_active' => 'نشط',
            ],
        ],
        'secretariat' => [
            'query'  => 'profiles?role_id=eq.secretariat&deleted_at=is.null&order=full_name',
            'scoped' => true,
            'label'  => [
                'username'  => 'اسم المستخدم',
                'full_name' => 'الاسم بالكامل',
                'group_id'  => 'رقم الفرقة',
                'phone'     => 'الهاتف',
            ],
        ],
        'attendance' => [
            'query'  => 'attendance_records?order=attendance_date.desc&limit=10000',
            'scoped' => false,
            'label'  => [
                'attendance_date' => 'التاريخ',
                'status'          => 'الحالة',
                'notes'           => 'ملاحظات',
            ],
        ],
        'groups' => [
            'query'  => 'groups?order=id',
            'scoped' => false,
            'label'  => [
                'name_ar' => 'اسم الفرقة',
            ],
        ],
    ];

    public function exportData(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireRoles($user, ['admin', 'super_user']);

        $entity = (string) ($_GET['entity'] ?? 'trainees');
        $format = strtolower((string) ($_GET['format'] ?? 'csv'));

        if (!array_key_exists($entity, self::ENTITIES)) {
            Response::error(
                'نوع البيانات المطلوبة غير مدعوم',
                'INVALID_ENTITY',
                400,
                ['supported' => array_keys(self::ENTITIES)]
            );
        }

        // Formats are capability-detected, so this list never advertises a format
        // the deployment cannot actually produce.
        $supported = SpreadsheetWriter::formats();
        if (!array_key_exists($format, $supported)) {
            Response::error(
                'صيغة التصدير غير مدعومة في هذا التثبيت',
                'INVALID_FORMAT',
                400,
                ['supported' => array_keys($supported)]
            );
        }

        $spec = self::ENTITIES[$entity];

        // Cast to int, so it cannot inject anything into the PostgREST query string.
        // 0 means all groups, which only the global roles reaching this point use.
        $groupId = isset($_GET['group_id']) ? (int) $_GET['group_id'] : 0;
        if ($groupId < 0) {
            $groupId = 0;
        }
        if ($groupId > 0 && !$spec['scoped']) {
            Response::error(
                'هذا النوع لا يدعم التصفية حسب الفرقة',
                'GROUP_FILTER_UNSUPPORTED',
                400,
                ['entity' => $entity]
            );
        }

        $query = $spec['query'];
        if ($groupId > 0) {
            $query .= "&group_id=eq.{$groupId}";
        }

        $client = new SupabaseClient();
        $res = $client->query($query);

        if (($res['status'] ?? 0) < 200 || ($res['status'] ?? 0) >= 300) {
            Response::error('تعذر جلب البيانات للتصدير', 'EXPORT_QUERY_FAILED', 502, $res['data'] ?? null);
        }

        $data = is_array($res['data'] ?? null) ? $res['data'] : [];

        // Column order comes from the allowlist, so headers are stable and readable
        // regardless of what PostgREST happened to return.
        $columns = array_keys($spec['label']);
        $rows = array_map(
            static fn(array $row): array => array_map(
                static fn(string $c) => $row[$c] ?? '',
                $columns
            ),
            $data
        );

        AuditLogService::log(
            $user['user_id'],
            $user['claims']['user_metadata']['full_name'] ?? 'مستخدم',
            $user['role'],
            'DATA_EXPORT',
            $entity,
            (string) $groupId,
            null,
            ['entity' => $entity, 'format' => $format, 'count' => count($rows)]
        );

        if ($format === 'json') {
            Response::success([
                'entity'   => $entity,
                'group_id' => $groupId,
                'columns'  => $spec['label'],
                'count'    => count($rows),
                'rows'     => $rows,
            ], 'بيانات التصدير');
        }

        $filename = 'elkarooz_' . $entity . '_group_' . $groupId . '.' . $supported[$format];

        try {
            // Throws SpreadsheetUnavailableException rather than silently emitting
            // something that is not the requested format.
            SpreadsheetWriter::stream($format, $spec['label'], $rows, $filename);
        } catch (SpreadsheetUnavailableException $e) {
            // The one deliberate exception to the refuse() rule.
            //
            // phpoffice/phpspreadsheet is NOT vendored (it cannot be, without
            // composer install and its own tree), so an xlsx export can never succeed
            // on this deployment. That makes this message the only thing that tells the
            // admin their export failed and why. It is a controller-authored constant:
            // it names no path, no host, no key and no query, so there is nothing in it
            // to sanitise. Hiding it would have cost the single most actionable sentence
            // in the response while removing no actual secret.
            //
            // failVisibly() keeps the audit/log line and the correlation id anyway, so
            // this stays consistent with every other failure path.
            $this->failVisibly(
                $e,
                $e->getMessage(),
                'EXPORT_FORMAT_UNAVAILABLE',
                501
            );
        }
    }

}
