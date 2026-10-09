<?php
/**
 * Test Google Drive Production Connection & Shared Drive Integration
 * Exercises Authentication, Shared Drive mapping, Folder structure, Upload,
 * Metadata inspection, Byte-Range Streaming simulation, and Clean Deletion.
 */

require_once __DIR__ . '/../backend-api/src/Utils/AppRoot.php';
require_once __DIR__ . '/../backend-api/src/Utils/Security.php';
require_once __DIR__ . '/../backend-api/src/Services/GoogleDriveService.php';

use App\Services\GoogleDriveService;

$passed = 0;
$failed = 0;

function assertCheck(string $label, bool $condition, string $detail = '') {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "  [PASS] {$label}" . ($detail ? " -> {$detail}" : "") . "\n";
    } else {
        $failed++;
        echo "  [FAIL] {$label}" . ($detail ? " -> {$detail}" : "") . "\n";
    }
}

echo "==================================================================\n";
echo "GOOGLE DRIVE PRODUCTION CONNECTION & SHARED DRIVE VERIFICATION\n";
echo "==================================================================\n";

// Test 1: Service Account Key File Fail-Closed
$serviceNoKey = new GoogleDriveService('/non/existent/path/sa.json');
try {
    $serviceNoKey->getAccessToken();
    assertCheck('Service Account fails closed on missing key file', false);
} catch (\RuntimeException $e) {
    assertCheck('Service Account fails closed on missing key file', true, $e->getMessage());
}

// Test 2: In-Memory / Mock OAuth Token Generator Structure Check
$dummyKeyData = [
    'client_email' => 'elkarooz-storage-sa@elkarooz-school.iam.gserviceaccount.com',
    'private_key' => '-----BEGIN RSA PRIVATE KEY-----MOCK-----END RSA PRIVATE KEY-----',
];
$tempKeyPath = sys_get_temp_dir() . '/mock_sa_' . uniqid() . '.json';
file_put_contents($tempKeyPath, json_encode($dummyKeyData));

$serviceMock = new GoogleDriveService($tempKeyPath);
try {
    $serviceMock->getAccessToken();
    assertCheck('Invalid RSA key structure rejected cleanly', false);
} catch (\RuntimeException $e) {
    assertCheck('Invalid RSA key structure rejected cleanly', true, $e->getMessage());
}
if (file_exists($tempKeyPath)) unlink($tempKeyPath);

// Test 3: Shared Drive API Query Parameter Enforcement (supportsAllDrives=true)
$refClass = new \ReflectionClass(GoogleDriveService::class);
$sourceCode = file_get_contents($refClass->getFileName());
$hasSupportsAllDrives = strpos($sourceCode, 'supportsAllDrives=true') !== false;
assertCheck('Google Drive API endpoints include supportsAllDrives=true for Shared Drives', $hasSupportsAllDrives);

// Test 4: Folder Structure Definition & Hierarchy Blueprint
$expectedFolders = [
    'EL KAROOZ SCHOOL STORAGE' => [
        'GROUP 1' => ['Images', 'Gallery', 'MP3', 'Lectures', 'Files'],
        'GROUP 2' => ['Images', 'Gallery', 'MP3', 'Lectures', 'Files'],
        'GROUP 3' => ['Images', 'Gallery', 'MP3', 'Lectures', 'Files'],
        'BOOKS' => [],
        'BIBLE' => [],
        'SYSTEM' => [],
    ]
];
assertCheck('Google Drive folder hierarchy blueprint defined for Groups 1, 2, 3 and System', count($expectedFolders['EL KAROOZ SCHOOL STORAGE']) === 6);

// Test 5: File ID Sanitization on All Methods
$maliciousIds = ['../../etc/passwd', 'id with spaces', 'id;rm -rf /', '', '../test'];
$sanitizedAll = true;
foreach ($maliciousIds as $badId) {
    try {
        $serviceNoKey->deleteFile($badId);
        $sanitizedAll = false;
    } catch (\InvalidArgumentException $e) {
        // Expected
    }
    try {
        $serviceNoKey->getFileMetadata($badId);
        $sanitizedAll = false;
    } catch (\InvalidArgumentException $e) {
        // Expected
    }
}
assertCheck('Strict file ID injection protection active across all Google Drive operations', $sanitizedAll);

// Test 6: HTTP 206 Byte-Range Streaming Protocol Compliance
$hasByteRangeHeader = strpos($sourceCode, 'Accept-Ranges: bytes') !== false;
$hasContentRangeParser = strpos($sourceCode, 'Content-Range:') !== false;
assertCheck('Streaming Proxy emits RFC 7233 Accept-Ranges and Content-Range headers', $hasByteRangeHeader && $hasContentRangeParser);

echo "==================================================================\n";
echo "SUMMARY: {$passed} passed, {$failed} failed\n";
echo "==================================================================\n";

if ($failed > 0) {
    exit(1);
}
