<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Middleware\JwtAuthMiddleware;
use App\Services\GoogleAppsScriptBridgeService;
use App\Services\GoogleDriveService;
use App\Services\ResetAccessGate;
use App\Services\SupabaseAuthAdminClient;
use App\Services\SupabaseClient;
use App\Services\SystemResetStorageService;
use App\Utils\AppRoot;
use App\Utils\Response;
use Throwable;

final class SystemResetController
{
    private const CONFIRMATION = 'أوافق على حذف كل بيانات التشغيل';
    private const AUTH_FRESH_SECONDS = 300;
    private const DRIVE_BATCH_SIZE = 10;
    private const AUTH_BATCH_SIZE = 10;

    public function preview(): void
    {
        $user = $this->requireFreshAdmin();
        $db = new SupabaseClient();
        $preview = $this->rpc($db, 'system_reset_preview', ['p_actor_id' => $user['user_id']]);
        $activeResponse = $db->query('system_reset_runs?actor_id=eq.' . rawurlencode((string) $user['user_id'])
            . '&status=in.(PREPARED,MEDIA_CLEANUP,DATA_CLEARED,PARTIAL)&select=id,backup_id,status,data_cleared_at,created_at&order=created_at.desc&limit=1');
        if (($activeResponse['status'] ?? 0) !== 200 || !is_array($activeResponse['data'] ?? null)) {
            Response::error('تعذر قراءة حالة عمليات إعادة الضبط المفتوحة.', 'SYSTEM_RESET_STATE_UNAVAILABLE', 503);
        }
        $activeRun = $activeResponse['data'][0] ?? null;
        $local = $this->storageService()->inventoryOperationalRoots();
        $drive = $this->auditDrive($db);
        $blockers = [];
        if ($local['blocked_paths'] !== []) {
            $blockers[] = ['code' => 'UNCLASSIFIED_LOCAL_STORAGE', 'paths' => $local['blocked_paths']];
        }
        foreach ($drive['blockers'] as $blocker) {
            $blockers[] = $blocker;
        }

        Response::success([
            'counts' => $preview['counts'] ?? [],
            'preserved' => $preview['preserved'] ?? [],
            'active_run' => $activeRun,
            'storage' => [
                'local' => $local,
                'google_drive' => [
                    'audited' => $drive['audited'],
                    'registered_files' => $drive['registered_files'],
                    'unregistered_files' => $drive['unregistered_files'],
                    'unregistered_names' => $drive['unregistered_names'],
                ],
            ],
            'blockers' => $blockers,
            'confirmation_phrase' => self::CONFIRMATION,
            'warning' => 'المعاينة للقراءة فقط. التنفيذ يتطلب نسخة حديثة وكلمة تأكيد وإعادة مصادقة.',
        ], 'معاينة نطاق إعادة الضبط');
    }

    public function execute(): void
    {
        $user = $this->requireFreshAdmin();
        $body = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($body) || ($body['confirmation'] ?? null) !== self::CONFIRMATION) {
            Response::error('عبارة التأكيد غير مطابقة. لم يبدأ الحذف.', 'SYSTEM_RESET_CONFIRMATION_REQUIRED', 400);
        }

        $actorId = (string) $user['user_id'];
        $db = new SupabaseClient();
        $runId = (string) ($body['run_id'] ?? '');
        if ($runId === '') {
            $backupId = (string) ($body['backup_id'] ?? '');
            if (!$this->isUuid($backupId) || !$this->verifyFreshBackup($db, $backupId, $actorId)) {
                Response::error('يلزم إنشاء نسخة مشفرة حديثة والتحقق من الملف قبل إعادة الضبط.', 'SYSTEM_RESET_BACKUP_REQUIRED', 409);
            }

            $local = $this->storageService()->inventoryOperationalRoots();
            $drive = $this->auditDrive($db);
            $blockers = $this->getStorageBlockers($local, $drive);
            if ($blockers !== []) {
                Response::error(
                    'توجد ملفات أو مصادر تخزين غير مصنفة؛ لم يبدأ الحذف. راجع تفاصيل المعاينة أولًا.',
                    'SYSTEM_RESET_STORAGE_RECONCILIATION_REQUIRED',
                    409,
                    ['blockers' => $blockers]
                );
            }

            $runId = (string) $this->rpc($db, 'system_reset_begin', [
                'p_actor_id' => $actorId,
                'p_backup_id' => $backupId,
            ]);
            if (!$this->isUuid($runId)) {
                Response::error('تعذر إنشاء سجل عملية إعادة الضبط.', 'SYSTEM_RESET_RUN_CREATE_FAILED', 502);
            }
            $this->setResetGate($runId, 'IN_PROGRESS', $user['claims']);
        }

        if (!$this->isUuid($runId)) {
            Response::error('معرّف عملية إعادة الضبط غير صالح.', 'SYSTEM_RESET_RUN_INVALID', 400);
        }
        $run = $this->loadRun($db, $runId, $actorId);
        if ($run === null) {
            Response::error('عملية إعادة الضبط غير موجودة أو لا تخص حسابك.', 'SYSTEM_RESET_RUN_NOT_FOUND', 404);
        }
        if (($run['status'] ?? '') === 'COMPLETE') {
            $this->setResetGate($runId, 'COMPLETE', $user['claims']);
            Response::success(['run_id' => $runId, 'status' => 'COMPLETE'], 'عملية إعادة الضبط مكتملة بالفعل');
        }

        $gate = $this->gate();
        $state = $gate->readState();
        if ($state === null) {
            $this->setResetGate($runId, 'IN_PROGRESS', $user['claims']);
        } elseif (($state['run_id'] ?? null) !== $runId) {
            // The DB run is authoritative; replace only a stale local cutoff after
            // this request has already revalidated the admin and recent auth_time.
            $this->setResetGate($runId, 'IN_PROGRESS', $user['claims'], false);
        }

        try {
            $dataClearedAt = $run['data_cleared_at'] ?? null;
            if ($dataClearedAt === null) {
                $local = $this->storageService()->inventoryOperationalRoots();
                $drive = $this->auditDrive($db);
                $blockers = $this->getStorageBlockers($local, $drive);
                if ($blockers !== []) {
                    $this->markPartial($db, $actorId, $runId, 'storage reconciliation required');
                    $this->setResetGate($runId, 'PARTIAL', $user['claims'], false);
                    Response::error('توقفت العملية دون مسح قاعدة البيانات؛ يلزم حل تعارضات التخزين أولًا.', 'SYSTEM_RESET_STORAGE_RECONCILIATION_REQUIRED', 409, ['run_id' => $runId, 'blockers' => $blockers]);
                }

                $localResult = $this->storageService()->purgeOperationalRoots();
                if (!$localResult['success']) {
                    $this->markPartial($db, $actorId, $runId, 'local storage cleanup incomplete');
                    $this->setResetGate($runId, 'PARTIAL', $user['claims'], false);
                    Response::error('تعذر تنظيف بعض الملفات المحلية؛ قاعدة البيانات لم تُمسح. أعد المحاولة بعد معالجة الملفات.', 'SYSTEM_RESET_LOCAL_MEDIA_FAILED', 409, [
                        'run_id' => $runId,
                        'failed_paths' => $localResult['failed_paths'],
                        'blocked_paths' => $localResult['blocked_paths'],
                    ]);
                }
                $localMarked = $this->rpc($db, 'system_reset_mark_local_media_deleted', [
                    'p_actor_id' => $actorId,
                    'p_run_id' => $runId,
                ]);
                if (!is_numeric($localMarked)) {
                    throw new \RuntimeException('SYSTEM_RESET_LOCAL_MEDIA_MARK_FAILED');
                }

                $assetResult = $this->cleanDriveBatch($db, $actorId, $runId);
                if (($assetResult['failed'] ?? 0) > 0) {
                    $this->markPartial($db, $actorId, $runId, 'external media deletion failed');
                    $this->setResetGate($runId, 'PARTIAL', $user['claims'], false);
                    Response::error('فشل حذف بعض الملفات الخارجية؛ لم تُمسح صفوف قاعدة البيانات. أعد المحاولة بعد مراجعة الموفر.', 'SYSTEM_RESET_DRIVE_MEDIA_FAILED', 409, [
                        'run_id' => $runId,
                        'pending' => $assetResult['pending'] ?? 0,
                        'failed' => $assetResult['failed'],
                    ]);
                }

                if ($this->hasUndeletedAssets($db, $runId)) {
                    Response::success([
                        'run_id' => $runId,
                        'status' => 'MEDIA_CLEANUP',
                        'remaining_drive_files' => $assetResult['pending'] ?? 0,
                        'continue' => true,
                    ], 'تم تنظيف دفعة ملفات؛ اضغط متابعة لإكمال العملية');
                }

                $this->rpc($db, 'system_reset_finalize_data', [
                    'p_actor_id' => $actorId,
                    'p_run_id' => $runId,
                ]);
                $run = $this->loadRun($db, $runId, $actorId) ?? $run;
            }

            $userResult = $this->deleteAuthUsersBatch($db, $actorId, $runId);
            if (($userResult['failed'] ?? 0) > 0) {
                $this->markPartial($db, $actorId, $runId, 'Auth user deletion requires reconciliation');
                $this->setResetGate($runId, 'PARTIAL', $user['claims'], false);
                Response::error('حُذفت بيانات التشغيل، لكن تعذر حذف بعض حسابات الدخول. الحالة جزئية وقابلة للاستئناف.', 'SYSTEM_RESET_AUTH_DELETE_PARTIAL', 409, [
                    'run_id' => $runId,
                    'pending' => $userResult['pending'] ?? 0,
                    'failed' => $userResult['failed'],
                    'error_codes' => $userResult['error_codes'] ?? [],
                ]);
            }

            if (($userResult['status'] ?? '') !== 'COMPLETE') {
                $this->setResetGate($runId, 'IN_PROGRESS', $user['claims'], false);
                Response::success([
                    'run_id' => $runId,
                    'status' => $userResult['status'] ?? 'DATA_CLEARED',
                    'pending_accounts' => $userResult['pending'] ?? 0,
                    'continue' => true,
                ], 'تم حذف دفعة حسابات؛ اضغط متابعة لإكمال العملية');
            }

            $this->setResetGate($runId, 'COMPLETE', $user['claims'], false);
            Response::success([
                'run_id' => $runId,
                'status' => 'COMPLETE',
                'message' => 'اكتملت إعادة الضبط. سجّل الدخول مجددًا لتفعيل جلسة جديدة.',
            ], 'اكتملت إعادة الضبط');
        } catch (Throwable $error) {
            $this->markPartial($db, $actorId, $runId, 'internal reset step failed');
            $this->setResetGate($runId, 'PARTIAL', $user['claims'], false);
            error_log('[SystemReset] run=' . $runId . ' failed; internal details redacted');
            Response::error('توقفت عملية إعادة الضبط بسبب خطأ داخلي. لم تُعلن مكتملة؛ أعد المحاولة أو راجع السجل.', 'SYSTEM_RESET_PARTIAL', 500, ['run_id' => $runId]);
        }
    }

    private function requireFreshAdmin(): array
    {
        $user = JwtAuthMiddleware::authenticate();
        $claims = $user['claims'] ?? [];
        $authTime = $claims['auth_time'] ?? null;
        if (!is_numeric($authTime) || time() - (int) $authTime > self::AUTH_FRESH_SECONDS || (int) $authTime > time() + 30) {
            Response::error('أعد إدخال كلمة المرور عبر تسجيل الدخول قبل معاينة أو تنفيذ إعادة الضبط.', 'SYSTEM_RESET_REAUTH_REQUIRED', 401);
        }
        $userId = (string) ($user['user_id'] ?? '');
        if (!$this->isUuid($userId)) {
            Response::error('جلسة المستخدم غير صالحة.', 'UNAUTHORIZED', 401);
        }
        $db = new SupabaseClient();
        $profiles = $db->query('profiles?id=eq.' . rawurlencode($userId) . '&select=id,role_id,is_active,deleted_at&limit=1');
        $profile = is_array($profiles['data'] ?? null) ? ($profiles['data'][0] ?? null) : null;
        if (($profiles['status'] ?? 0) !== 200 || !is_array($profile)
            || ($profile['role_id'] ?? null) !== 'admin'
            || ($profile['is_active'] ?? false) !== true
            || !empty($profile['deleted_at'])) {
            Response::error('إعادة ضبط النظام متاحة لحساب مدير نشط فقط.', 'SYSTEM_RESET_ADMIN_REQUIRED', 403);
        }
        return $user;
    }

    private function verifyFreshBackup(SupabaseClient $db, string $backupId, string $actorId): bool
    {
        $response = $db->query('backup_records?id=eq.' . rawurlencode($backupId)
            . '&select=id,filename,file_size_bytes,storage_type,storage_path,status,checksum_sha256,created_by,created_at,deleted_at&limit=1');
        $record = is_array($response['data'] ?? null) ? ($response['data'][0] ?? null) : null;
        if (($response['status'] ?? 0) !== 200 || !is_array($record)
            || ($record['created_by'] ?? null) !== $actorId
            || ($record['storage_type'] ?? null) !== 'HOSTINGER'
            || ($record['status'] ?? null) !== 'COMPLETED'
            || !empty($record['deleted_at'])
            || !preg_match('/^[a-f0-9]{64}$/i', (string) ($record['checksum_sha256'] ?? ''))
            || !preg_match('/^[a-zA-Z0-9._-]+\.zip$/', (string) ($record['filename'] ?? ''))) {
            return false;
        }

        $createdAt = strtotime((string) ($record['created_at'] ?? ''));
        if ($createdAt === false || $createdAt < time() - 900 || $createdAt > time() + 30) {
            return false;
        }
        $expected = '/backups/full/' . $record['filename'];
        if (($record['storage_path'] ?? null) !== $expected) {
            return false;
        }
        $storageConfig = require AppRoot::path('config/storage.php');
        $backupRoot = realpath(rtrim((string) $storageConfig['root_path'], '/\\') . '/backups/full');
        $filePath = $backupRoot === false ? false : realpath($backupRoot . DIRECTORY_SEPARATOR . $record['filename']);
        if ($backupRoot === false || $filePath === false
            || !str_starts_with(strtolower($filePath), strtolower($backupRoot . DIRECTORY_SEPARATOR))
            || !is_file($filePath)
            || filesize($filePath) !== (int) ($record['file_size_bytes'] ?? -1)
            || !hash_equals(strtolower((string) $record['checksum_sha256']), strtolower((string) hash_file('sha256', $filePath)))) {
            return false;
        }

        if (!class_exists(\ZipArchive::class)) {
            return false;
        }
        $zip = new \ZipArchive();
        if ($zip->open($filePath, \ZipArchive::RDONLY) !== true) {
            return false;
        }
        $hasManifest = $zip->statName('manifest.json') !== false;
        $hasDatabase = $zip->statName('database/database.json') !== false;
        $zip->close();
        return $hasManifest && $hasDatabase;
    }

    private function auditDrive(SupabaseClient $db): array
    {
        $assets = [];
        $offset = 0;
        $pageSize = 500;
        do {
            $response = $db->query('media_assets?select=id,resource_type,storage_provider,drive_file_id'
                . '&storage_provider=eq.GOOGLE_DRIVE&limit=' . $pageSize . '&offset=' . $offset);
            if (($response['status'] ?? 0) !== 200 || !is_array($response['data'] ?? null)) {
                return ['audited' => false, 'registered_files' => 0, 'unregistered_files' => 0, 'unregistered_names' => [],
                    'blockers' => [['code' => 'DRIVE_REGISTRY_UNAVAILABLE']]];
            }
            foreach ($response['data'] as $asset) {
                if (!is_array($asset) || !is_string($asset['drive_file_id'] ?? null)) {
                    return ['audited' => false, 'registered_files' => count($assets), 'unregistered_files' => 0, 'unregistered_names' => [],
                        'blockers' => [['code' => 'DRIVE_REGISTRY_INVALID']]];
                }
                $assets[] = $asset;
            }
            $count = count($response['data']);
            $offset += $count;
            if ($offset >= 10000 && $count === $pageSize) {
                return ['audited' => false, 'registered_files' => $offset, 'unregistered_files' => 0, 'unregistered_names' => [],
                    'blockers' => [['code' => 'DRIVE_REGISTRY_LIMIT_REACHED']]];
            }
        } while ($count === $pageSize);

        $gasConfigured = (new GoogleAppsScriptBridgeService())->isConfigured();
        $serviceAccount = getenv('GOOGLE_SERVICE_ACCOUNT_JSON') ?: getenv('GOOGLE_SERVICE_ACCOUNT_JSON_PATH');
        $serviceAccountReady = is_string($serviceAccount) && $serviceAccount !== ''
            && (str_starts_with(trim($serviceAccount), '{') || is_file($serviceAccount));
        $rootId = (string) (getenv('GOOGLE_DRIVE_ROOT_ID') ?: '');
        $hasDriveState = $assets !== [] || $rootId !== '' || $gasConfigured;
        if (!$hasDriveState) {
            return ['audited' => true, 'registered_files' => 0, 'unregistered_files' => 0, 'unregistered_names' => [], 'blockers' => []];
        }
        if ($gasConfigured || !$serviceAccountReady || $rootId === '') {
            return ['audited' => false, 'registered_files' => count($assets), 'unregistered_files' => 0, 'unregistered_names' => [],
                'blockers' => [['code' => 'DRIVE_PROVIDER_NOT_AUDITABLE']]];
        }

        try {
            $driveService = new GoogleDriveService((string) $serviceAccount, 20);
            $remoteFiles = $driveService->listFilesRecursively($rootId);
        } catch (Throwable) {
            return ['audited' => false, 'registered_files' => count($assets), 'unregistered_files' => 0, 'unregistered_names' => [],
                'blockers' => [['code' => 'DRIVE_INVENTORY_FAILED']]];
        }

        $registeredIds = [];
        foreach ($assets as $asset) {
            $registeredIds[(string) $asset['drive_file_id']] = true;
        }
        $unregistered = [];
        foreach ($remoteFiles as $remote) {
            if (!isset($registeredIds[$remote['id']])) {
                $unregistered[] = (string) ($remote['name'] ?: '(بدون اسم)');
            }
        }
        $names = array_slice($unregistered, 0, 50);
        $blockers = $unregistered === [] ? [] : [['code' => 'UNREGISTERED_DRIVE_FILES', 'count' => count($unregistered), 'names' => $names]];
        return [
            'audited' => true,
            'registered_files' => count($assets),
            'unregistered_files' => count($unregistered),
            'unregistered_names' => $names,
            'blockers' => $blockers,
        ];
    }

    private function getStorageBlockers(array $local, array $drive): array
    {
        $blockers = [];
        if (($local['blocked_paths'] ?? []) !== []) {
            $blockers[] = ['code' => 'UNCLASSIFIED_LOCAL_STORAGE', 'paths' => $local['blocked_paths']];
        }
        return array_merge($blockers, $drive['blockers'] ?? []);
    }

    private function cleanDriveBatch(SupabaseClient $db, string $actorId, string $runId): array
    {
        $response = $db->query('system_reset_run_assets?select=asset_id,drive_file_id&run_id=eq.' . rawurlencode($runId)
            . '&storage_provider=eq.GOOGLE_DRIVE&status=in.(PENDING,FAILED)&limit=' . self::DRIVE_BATCH_SIZE);
        if (($response['status'] ?? 0) !== 200 || !is_array($response['data'] ?? null)) {
            throw new \RuntimeException('SYSTEM_RESET_ASSET_BATCH_READ_FAILED');
        }
        $rows = $response['data'];
        if ($rows === []) {
            return ['pending' => 0, 'failed' => 0];
        }

        $drive = new GoogleDriveService();
        $results = [];
        foreach ($rows as $row) {
            $assetId = (string) ($row['asset_id'] ?? '');
            $fileId = (string) ($row['drive_file_id'] ?? '');
            $deleted = false;
            $error = null;
            try {
                $outcome = $drive->deleteFileDetailed($fileId);
                $deleted = (bool) $outcome['success'];
                $error = $outcome['error_code'];
            } catch (Throwable) {
                $error = 'DRIVE_DELETE_EXCEPTION';
            }
            $results[] = ['asset_id' => $assetId, 'deleted' => $deleted, 'error' => $error];
        }

        $marked = $this->rpc($db, 'system_reset_mark_asset_results', [
            'p_actor_id' => $actorId,
            'p_run_id' => $runId,
            'p_results' => $results,
        ]);
        if (!is_array($marked)) {
            throw new \RuntimeException('SYSTEM_RESET_ASSET_PROGRESS_FAILED');
        }
        return [
            'pending' => (int) ($marked['pending'] ?? 0),
            'failed' => (int) ($marked['failed'] ?? 0),
        ];
    }

    private function hasUndeletedAssets(SupabaseClient $db, string $runId): bool
    {
        $response = $db->query('system_reset_run_assets?select=asset_id&run_id=eq.' . rawurlencode($runId)
            . '&status=neq.DELETED&limit=1');
        if (($response['status'] ?? 0) !== 200 || !is_array($response['data'] ?? null)) {
            throw new \RuntimeException('SYSTEM_RESET_ASSET_VERIFY_FAILED');
        }
        return $response['data'] !== [];
    }

    private function deleteAuthUsersBatch(SupabaseClient $db, string $actorId, string $runId): array
    {
        $response = $db->query('system_reset_run_users?select=user_id,status&run_id=eq.' . rawurlencode($runId)
            . '&status=in.(PENDING,FAILED)&limit=' . self::AUTH_BATCH_SIZE);
        if (($response['status'] ?? 0) !== 200 || !is_array($response['data'] ?? null)) {
            throw new \RuntimeException('SYSTEM_RESET_USER_BATCH_READ_FAILED');
        }
        $rows = $response['data'];
        if ($rows !== []) {
            $auth = new SupabaseAuthAdminClient();
            $failedCodes = [];
            foreach ($rows as $row) {
                $targetId = (string) ($row['user_id'] ?? '');
                $deleted = false;
                $errorCode = null;
                try {
                    $outcome = $auth->deleteUser($targetId);
                    $deleted = (bool) $outcome['success'];
                    $errorCode = $outcome['error_code'];
                } catch (Throwable) {
                    $errorCode = 'AUTH_ADMIN_DELETE_EXCEPTION';
                }
                $result = $this->rpc($db, 'system_reset_mark_user_result', [
                    'p_actor_id' => $actorId,
                    'p_run_id' => $runId,
                    'p_user_id' => $targetId,
                    'p_deleted' => $deleted,
                    'p_error' => $errorCode,
                ]);
                if (!is_array($result)) {
                    throw new \RuntimeException('SYSTEM_RESET_USER_PROGRESS_FAILED');
                }
                if (!$deleted && $errorCode !== null) {
                    $failedCodes[] = $errorCode;
                }
            }
            if ($failedCodes !== []) {
                $this->markPartial($db, $actorId, $runId, 'Auth deletion requires reconciliation');
                return ['pending' => count($rows) - count($failedCodes), 'failed' => count($failedCodes), 'error_codes' => array_values(array_unique($failedCodes)), 'status' => 'PARTIAL'];
            }
        }

        $statusResult = $this->rpc($db, 'system_reset_complete_if_no_users', [
            'p_actor_id' => $actorId,
            'p_run_id' => $runId,
        ]);
        if (!is_array($statusResult)) {
            throw new \RuntimeException('SYSTEM_RESET_COMPLETION_CHECK_FAILED');
        }
        return [
            'pending' => (int) ($statusResult['pending'] ?? 0),
            'failed' => (int) ($statusResult['failed'] ?? 0),
            'status' => (string) ($statusResult['status'] ?? ''),
        ];
    }

    private function loadRun(SupabaseClient $db, string $runId, string $actorId): ?array
    {
        $response = $db->query('system_reset_runs?id=eq.' . rawurlencode($runId)
            . '&select=id,actor_id,backup_id,status,data_cleared_at,created_at&limit=1');
        $run = is_array($response['data'] ?? null) ? ($response['data'][0] ?? null) : null;
        return ($response['status'] ?? 0) === 200 && is_array($run) && ($run['actor_id'] ?? null) === $actorId ? $run : null;
    }

    private function rpc(SupabaseClient $db, string $function, array $args): mixed
    {
        $response = $db->rpc($function, $args);
        if (($response['status'] ?? 0) < 200 || ($response['status'] ?? 0) >= 300) {
            throw new \RuntimeException('SYSTEM_RESET_RPC_FAILED_' . $function);
        }
        return $response['data'] ?? null;
    }

    private function markPartial(SupabaseClient $db, string $actorId, string $runId, string $message): void
    {
        $this->rpc($db, 'system_reset_mark_partial', [
            'p_actor_id' => $actorId,
            'p_run_id' => $runId,
            'p_error' => $message,
        ]);
    }

    private function setResetGate(string $runId, string $status, array $claims, bool $onlyIfMissing = true): void
    {
        $gate = $this->gate();
        $state = $gate->readState();
        if ($onlyIfMissing && $state !== null && ($state['run_id'] ?? null) === $runId) {
            return;
        }
        $cutoff = is_numeric($claims['iat'] ?? null) ? (int) $claims['iat'] + 1 : time() + 1;
        if ($state !== null && ($state['run_id'] ?? null) === $runId) {
            $cutoff = (int) $state['cutoff_iat'];
        }
        $gate->writeState(['run_id' => $runId, 'status' => $status, 'cutoff_iat' => $cutoff]);
    }

    private function gate(): ResetAccessGate
    {
        $storageConfig = require AppRoot::path('config/storage.php');
        return new ResetAccessGate(
            rtrim((string) $storageConfig['root_path'], '/\\') . '/system_reset/auth-cutoff.json'
        );
    }

    private function storageService(): SystemResetStorageService
    {
        $storageConfig = require AppRoot::path('config/storage.php');
        return new SystemResetStorageService((string) $storageConfig['root_path']);
    }

    private function isUuid(string $value): bool
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value) === 1;
    }
}
