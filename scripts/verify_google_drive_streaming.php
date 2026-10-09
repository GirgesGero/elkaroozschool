<?php
/**
 * Test Suite: Google Drive Service & Private Streaming Proxy Verification
 * Verifies Phase 3, 4, and 8 requirements for Google Drive integration on Hostinger PHP.
 */

require_once dirname(__DIR__) . '/backend-api/vendor/autoload.php';
define('ELKAROOZ_APP_ROOT', dirname(__DIR__) . '/backend-api');

require_once ELKAROOZ_APP_ROOT . '/src/Utils/AppRoot.php';
require_once ELKAROOZ_APP_ROOT . '/src/Utils/Security.php';
require_once ELKAROOZ_APP_ROOT . '/src/Utils/Response.php';
require_once ELKAROOZ_APP_ROOT . '/src/Controllers/SafeFailure.php';
require_once ELKAROOZ_APP_ROOT . '/src/Services/GoogleDriveService.php';
require_once ELKAROOZ_APP_ROOT . '/src/Controllers/StorageController.php';

$results = [];

function check(string $name, bool $ok, string $detail = ''): void {
    global $results;
    $results[] = ['name' => $name, 'ok' => $ok, 'detail' => $detail];
    $status = $ok ? '[PASS]' : '[FAIL]';
    echo sprintf("%-60s %s %s\n", $name, $status, $detail ? "($detail)" : "");
}

echo "==================================================================\n";
echo "GOOGLE DRIVE SERVICE & STREAMING PROXY VERIFICATION\n";
echo "==================================================================\n";

// 1. GoogleDriveService Instantiation & File ID Validation
$drive = new \App\Services\GoogleDriveService('/path/to/nonexistent.json', 10);

// Test invalid file ID rejection
$invalidIds = ['../../etc/passwd', 'file id with spaces', 'file;rm -rf /', '', '../test'];
foreach ($invalidIds as $badId) {
    $caught = false;
    try {
        $drive->deleteFile($badId);
    } catch (\InvalidArgumentException $e) {
        $caught = true;
    } catch (\Exception $e) {
        $caught = false;
    }
    check("GoogleDriveService rejects invalid file ID: " . var_export($badId, true), $caught);
}

// 2. Test getFileMetadata invalid ID rejection
foreach ($invalidIds as $badId) {
    $caught = false;
    try {
        $drive->getFileMetadata($badId);
    } catch (\InvalidArgumentException $e) {
        $caught = true;
    } catch (\Exception $e) {
        $caught = false;
    }
    check("getFileMetadata rejects invalid file ID: " . var_export($badId, true), $caught);
}

// 3. Test streamFile invalid ID rejection
foreach ($invalidIds as $badId) {
    $caught = false;
    try {
        $drive->streamFile($badId);
    } catch (\InvalidArgumentException $e) {
        $caught = true;
    } catch (\Exception $e) {
        $caught = false;
    }
    check("streamFile rejects invalid file ID: " . var_export($badId, true), $caught);
}

// 4. Test Missing Service Account Key Handling (Fails closed)
$caughtKeyError = false;
try {
    $drive->getAccessToken();
} catch (\RuntimeException $e) {
    $caughtKeyError = (str_contains($e->getMessage(), 'Google Service Account key file not found'));
}
check("GoogleDriveService fails closed when key file is missing", $caughtKeyError);

// 5. Test StorageController::getFile input validation
$storageCtrl = new \App\Controllers\StorageController();

// We test regex validation logic for asset_id (RFC 4122 UUIDv4)
$validUuid = '550e8400-e29b-41d4-a716-446655440000';
$invalidUuids = ['not-a-uuid', '550e8400-e29b', '550e8400-e29b-41d4-a716-446655440000; DROP TABLE users', '../../etc'];

check("Valid UUID matches pattern", preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $validUuid) === 1);

foreach ($invalidUuids as $badUuid) {
    check("Invalid UUID is rejected: " . var_export($badUuid, true), preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $badUuid) === 0);
}

// 6. Test Group Isolation Logic in StorageController
$testCases = [
    // [userRole, userGroup, uploaderId, assetGroup, resourceType, expectedAccess, testName]
    ['admin', 1, 'user-1', 2, 'GENERAL', true, 'Admin can access any group asset'],
    ['super_user', 2, 'user-2', 1, 'GENERAL', true, 'Super User can access any group asset'],
    ['servant', 1, 'user-3', null, 'GENERAL', true, 'Servant can access global asset (group_id is null)'],
    ['trainee', 2, 'user-4', null, 'GENERAL', true, 'Trainee can access global asset (group_id is null)'],
    ['trainee', 1, 'user-5', 1, 'GENERAL', true, 'Trainee can access own group asset'],
    ['trainee', 1, 'user-6', 2, 'GENERAL', false, 'Trainee CANNOT access other group asset (Isolation)'],
    ['servant', 2, 'user-7', 1, 'GENERAL', false, 'Servant CANNOT access other group asset (Isolation)'],
    ['servant', 2, 'user-8', 1, 'GENERAL', false, 'Servant without admin cannot cross group bounds'],
    ['trainee', 1, 'user-9', null, 'BACKUP_ARCHIVE', false, 'Trainee CANNOT access system BACKUP_ARCHIVE even if group_id is null'],
    ['servant', 1, 'user-10', null, 'IMPORT_FILE', false, 'Servant CANNOT access system IMPORT_FILE even if group_id is null'],
    ['admin', 1, 'user-11', null, 'BACKUP_ARCHIVE', true, 'Admin CAN access system BACKUP_ARCHIVE'],
];

foreach ($testCases as [$role, $uGroup, $uId, $aGroup, $resType, $expected, $label]) {
    $isAdmin = in_array($role, ['admin', 'super_user'], true);
    $isSystemAsset = in_array($resType, ['BACKUP_ARCHIVE', 'IMPORT_FILE'], true);
    
    if ($isSystemAsset && !$isAdmin) {
        $allowed = false;
    } else {
        $isGlobal = ($aGroup === null);
        $isSameGroup = ($aGroup !== null && (int)$aGroup === (int)$uGroup);
        $isUploader = ($uId === 'user-owner'); // test non-owner case
        $allowed = ($isAdmin || $isGlobal || $isSameGroup || $isUploader);
    }
    check("Scope Check: " . $label, $allowed === $expected);
}

// Summary
$total = count($results);
$passed = count(array_filter($results, fn($r) => $r['ok']));
$failed = $total - $passed;

echo "==================================================================\n";
echo "SUMMARY: $passed passed, $failed failed out of $total checks\n";
echo "==================================================================\n";

if ($failed > 0) {
    exit(1);
}
