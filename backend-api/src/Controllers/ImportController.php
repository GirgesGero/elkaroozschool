<?php
namespace App\Controllers;

use App\Middleware\JwtAuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Services\ExcelParserService;
use App\Services\StorageBridgeService;
use App\Services\SupabaseClient;
use App\Services\AuditLogService;
use App\Utils\Response;
use App\Utils\Security;

class ImportController {
    public function importTrainees(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireAdminOrSuperUser($user);

        if (!isset($_FILES['file'])) {
            Response::error('يرجى رفع ملف Excel أو CSV للمتدربين', 'FILE_REQUIRED', 400);
        }

        $file = $_FILES['file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['csv', 'xlsx'])) {
            Response::error('الصيغة غير مدعومة. يرجى رفع ملف CSV أو Excel', 'INVALID_FORMAT', 400);
        }

        // 1. Parse rows
        $rows = ExcelParserService::parseCsv($file['tmp_name']);
        if (empty($rows)) {
            Response::error('الملف فارغ أو تعذر قراءة الأعمدة', 'EMPTY_FILE', 400);
        }

        // 2. All-or-Nothing strict validation
        $errors = [];
        $validatedData = [];
        $requiredColumns = ['Username', 'Password', 'FullName', 'GroupID', 'BirthDate'];

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2; // +2 for 1-based index and header row
            foreach ($requiredColumns as $col) {
                if (empty($row[$col])) {
                    $errors[] = "السطر {$rowNum}: الحقل الإلزامي '{$col}' مفقود أو فارغ";
                }
            }

            if (!empty($row['GroupID']) && !in_array((int)$row['GroupID'], [1, 2, 3])) {
                $errors[] = "السطر {$rowNum}: رقم الفرقة الدراسية يجب أن يكون 1 أو 2 أو 3";
            }

            if (!empty($row['BirthDate']) && !strtotime($row['BirthDate'])) {
                $errors[] = "السطر {$rowNum}: صيغة تاريخ الميلاد غير صحيحة (YYYY-MM-DD)";
            }

            $validatedData[] = $row;
        }

        // If ANY error exists, ABORT ENTIRE BATCH
        if (!empty($errors)) {
            Response::error('فشل الاستيراد لوجود أخطاء في البيانات. تم إلغاء العملية بالكامل.', 'VALIDATION_FAILED', 422, [
                'total_errors' => count($errors),
                'errors' => $errors
            ]);
        }

        // 3. Save original file to storage archive
        $storage = new StorageBridgeService();
        $savedFile = $storage->saveUploadedFile($file, 'imports/trainees/history');

        // 4. Run the import through the atomic Postgres function.
        //
        // The previous implementation recorded status=SUCCESS and set
        // new_accounts_count to the row count before creating a single account — it
        // never called the database at all. import_trainees_bulk_atomic is the real
        // all-or-nothing path and is now the only thing that decides the outcome.
        $dryRun = filter_var($_POST['dry_run'] ?? 'false', FILTER_VALIDATE_BOOLEAN);

        // The RPC resolves the group by its Arabic name (groups.name_ar), NOT by a
        // numeric id, and reads father_name. Field names below are the function's own
        // contract, verified against production pg_get_functiondef, not a guess
        // derived from the sheet headers.
        $groupNames = ['1' => 'الفرقة الأولى', '2' => 'الفرقة الثانية', '3' => 'الفرقة الثالثة'];
        $batch = array_map(static function (array $row) use ($groupNames): array {
            return [
                'username'     => $row['Username'],
                'password'     => $row['Password'],
                'full_name'    => $row['FullName'],
                'group_name'   => $groupNames[(string) $row['GroupID']] ?? null,
                'birth_date'   => $row['BirthDate'],
                'phone'        => $row['Phone'] ?? '',
                'father_name'  => $row['FatherName'] ?? '',
                'address'      => $row['Address'] ?? '',
            ];
        }, $validatedData);

        $startedAt = microtime(true);

        // The user's own token, not the service-role key: the function gates on
        // auth.uid() through is_admin_or_super_user(), and a service_role request
        // carries no sub, so auth.uid() is NULL and the gate always rejects.
        $client = (new SupabaseClient())->withActorToken($this->bearerToken());

        $rpc = $client->rpc('import_trainees_bulk_atomic', [
            'p_batch_json'        => json_encode($batch, JSON_UNESCAPED_UNICODE),
            'p_filename'          => $file['name'],
            'p_file_storage_path' => $savedFile['relative_path'],
            'p_dry_run'           => $dryRun,
        ]);
        $executionTimeMs = (int) round((microtime(true) - $startedAt) * 1000);

        $result = $rpc['data'] ?? null;
        $transportFailed = ($rpc['status'] ?? 0) < 200 || ($rpc['status'] ?? 0) >= 300;

        if ($transportFailed || !is_array($result)) {
            Response::error(
                'تعذر تنفيذ الاستيراد على قاعدة البيانات. لم يتم إنشاء أي حساب.',
                'IMPORT_RPC_FAILED',
                502,
                ['http_status' => $rpc['status'] ?? null, 'details' => $result]
            );
        }

        $status       = (bool) ($result['success'] ?? false) ? 'SUCCESS' : 'FAILED';
        $newCount     = (int) ($result['new_accounts'] ?? 0);
        $updatedCount = (int) ($result['updated_accounts'] ?? 0);
        $errors       = $result['errors'] ?? [];

        // The RPC already wrote its own import_history and audit_logs rows inside the
        // same transaction. Writing a second pair here would double-count every
        // import, so this controller records nothing further — it only reports.

        if ($status === 'FAILED') {
            Response::error(
                'فشل الاستيراد لوجود أخطاء في البيانات. تم إلغاء العملية بالكامل.',
                'IMPORT_FAILED',
                422,
                ['total_rows' => count($validatedData), 'errors' => $errors]
            );
        }

        Response::success([
            'status'      => $result['status'] ?? $status,
            'dry_run'     => (bool) ($result['dry_run'] ?? $dryRun),
            'total_rows'  => (int) ($result['total_rows'] ?? count($validatedData)),
            'new_accounts_count' => $newCount,
            'updated_accounts_count' => $updatedCount,
            'execution_time_ms' => $executionTimeMs,
            'archive_path' => $savedFile['relative_path']
        ], $dryRun ? 'اكتمل التحقق التجريبي دون كتابة أي حساب' : 'تم استيراد المتدربين بنجاح');
    }

    /**
     * The raw Bearer token from the request, or null when absent.
     */
    private function bearerToken(): ?string {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        return preg_match('/Bearer\s(\S+)/', $header, $m) ? $m[1] : null;
    }

    /**
     * GET /import/history — SRS 35.
     *
     * Admin/super_user only. Filenames and status are management data; the archived
     * source file itself is reachable through the storage path already recorded.
     */
    public function history(): void {
        $user = JwtAuthMiddleware::authenticate();
        RbacMiddleware::requireAdminOrSuperUser($user);

        $limit = (int) ($_GET['limit'] ?? 50);
        $limit = max(1, min(200, $limit));   // bounded: never build an unbounded response

        $client = new SupabaseClient();
        $res = $client->query(
            'import_history?select=id,filename,total_rows,new_accounts_count,updated_accounts_count,status,'
            . 'import_mode,import_type,checksum_sha256,execution_time_ms,created_at,created_by'
            . "&order=created_at.desc&limit={$limit}"
        );

        if (($res['status'] ?? 0) < 200 || ($res['status'] ?? 0) >= 300) {
            Response::error('تعذر تحميل سجل الاستيراد', 'IMPORT_HISTORY_FAILED', 500, $res['data'] ?? null);
        }

        Response::success($res['data'] ?? [], 'سجل عمليات الاستيراد');
    }
}
