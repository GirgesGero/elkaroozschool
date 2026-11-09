<?php

$base = dirname(__DIR__) . '/backend-api';
require_once $base . '/vendor/autoload.php';
require_once $base . '/src/Utils/AppRoot.php';
require_once $base . '/src/Database/MySQL.php';
require_once $base . '/src/Utils/Response.php';
require_once $base . '/src/Controllers/RpcApiController.php';

use App\Database\MySQL;
use App\Controllers\RpcApiController;

echo "========================================================================\n";
echo "TESTING LOCAL RPC STORED PROCEDURES API (SQLite Engine)\n";
echo "========================================================================\n";

$db = MySQL::getInstance();
$controller = new RpcApiController();

$testsPassed = 0;
$testsTotal = 0;

function runRpcTest(string $name, callable $fn) {
    global $testsPassed, $testsTotal;
    $testsTotal++;
    try {
        $fn();
        echo "  [PASS] {$name}\n";
        $testsPassed++;
    } catch (\Throwable $e) {
        echo "  [FAIL] {$name}: " . $e->getMessage() . "\n";
    }
}

// 1. Test has_servant_permission
runRpcTest("has_servant_permission returns true for admin", function() use ($controller) {
    // Admin claim
    $claims = ['sub' => 'a864e1f1-5f6c-4c6c-90e0-13a79e3cb558', 'role' => 'admin', 'group_id' => 1];
    ob_start();
    $controller->handle('has_servant_permission', $claims);
    $output = json_decode(ob_get_clean(), true);
    if (($output['data'] ?? null) !== true) {
        throw new Exception("Expected true, got " . json_encode($output));
    }
});

// 2. Test get_group_operational_summary
runRpcTest("get_group_operational_summary returns correct structure", function() use ($controller) {
    $claims = ['sub' => 'a864e1f1-5f6c-4c6c-90e0-13a79e3cb558', 'role' => 'admin', 'group_id' => 1];
    ob_start();
    $controller->handle('get_group_operational_summary', $claims);
    $output = json_decode(ob_get_clean(), true);
    $data = $output['data'] ?? [];
    if (!isset($data['trainees_count']) || !isset($data['attendance_rate'])) {
        throw new Exception("Invalid operational summary payload: " . json_encode($output));
    }
});

// 3. Test get_trainee_attendance_summary
runRpcTest("get_trainee_attendance_summary returns calculated percentage", function() use ($controller) {
    $claims = ['sub' => 'a864e1f1-5f6c-4c6c-90e0-13a79e3cb558', 'role' => 'admin', 'group_id' => 1];
    ob_start();
    $controller->handle('get_trainee_attendance_summary', $claims);
    $output = json_decode(ob_get_clean(), true);
    $data = $output['data'] ?? [];
    if (!isset($data['attendance_percentage'])) {
        throw new Exception("Missing attendance_percentage: " . json_encode($output));
    }
});

// 4. Test resolve_identifier_for_login
runRpcTest("resolve_identifier_for_login resolves user identifier", function() use ($controller) {
    $claims = [];
    ob_start();
    $controller->handle('resolve_identifier_for_login', $claims);
    $output = json_decode(ob_get_clean(), true);
    if (!isset($output['data'])) {
        throw new Exception("Expected data key: " . json_encode($output));
    }
});

echo "------------------------------------------------------------------------\n";
echo "RESULT: {$testsPassed} / {$testsTotal} RPC tests passed successfully.\n";
echo "========================================================================\n";

if ($testsPassed !== $testsTotal) {
    exit(1);
}
