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

        // 4. Record Import History
        $client = new SupabaseClient();
        $importId = Security::generateUuidV4();
        $client->query('import_history', 'POST', [
            'id' => $importId,
            'filename' => $file['name'],
            'original_file_storage_path' => $savedFile['relative_path'],
            'total_rows' => count($validatedData),
            'new_accounts_count' => count($validatedData),
            'updated_accounts_count' => 0,
            'status' => 'SUCCESS',
            'created_by' => $user['user_id']
        ]);

        // 5. Audit Log
        AuditLogService::log(
            $user['user_id'],
            $user['claims']['user_metadata']['full_name'] ?? 'إدارة',
            $user['role'],
            'IMPORT_TRAINEES',
            'import_history',
            $importId,
            null,
            ['total_rows' => count($validatedData), 'filename' => $file['name']]
        );

        Response::success([
            'import_id' => $importId,
            'total_processed' => count($validatedData),
            'archive_path' => $savedFile['relative_path']
        ], 'تم التحقق من ملف الاستيراد وحفظه بنجاح');
    }
}
