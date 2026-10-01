<?php
// backend-api/public/index.php
// Front Controller & Router for Hostinger PHP Backend

// Resolve the application root.
//
// This file is uploaded FLATTENED into public_html/ on shared hosting, so
// __DIR__ IS public_html and dirname(__DIR__) would point at the account root
// *above* the app. The previous code therefore looked for vendor/ and src/ one
// level too high and every request died with VENDOR_MISSING / a fatal require
// failure. Probe the flattened layout first, then the repo layout used in dev
// (backend-api/public/index.php), so both work.
$appRoot = __DIR__;
if (!is_file($appRoot . '/vendor/autoload.php') && is_file(dirname(__DIR__) . '/vendor/autoload.php')) {
    $appRoot = dirname(__DIR__);
}

// Composer autoloader MUST come first: JwtAuthMiddleware needs Firebase\JWT\*.
// The manual require_once list below only covers first-party App\ classes, so
// without this line every authenticated route fatal-errors with
// "Class Firebase\JWT\JWT not found".
$autoload = $appRoot . '/vendor/autoload.php';
if (!file_exists($autoload)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => [
            'code' => 'VENDOR_MISSING',
            'message' => 'مكتبات Composer غير مثبتة على السيرفر. شغّل: composer install --no-dev',
        ],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
require_once $autoload;

define('ELKAROOZ_APP_ROOT', $appRoot);

// AppRoot resolves config/ and storage/ correctly under BOTH the repo layout
// (backend-api/public/index.php) and the flattened public_html layout, so every
// class must use it instead of dirname(__DIR__, 2).
require_once $appRoot . '/src/Utils/AppRoot.php';
require_once $appRoot . '/src/Utils/Response.php';
require_once $appRoot . '/src/Utils/Security.php';
require_once $appRoot . '/src/Middleware/CorsMiddleware.php';
require_once $appRoot . '/src/Middleware/JwtAuthMiddleware.php';
require_once $appRoot . '/src/Middleware/RbacMiddleware.php';
require_once $appRoot . '/src/Middleware/GroupScopeMiddleware.php';
require_once $appRoot . '/src/Middleware/FileSecurityMiddleware.php';
require_once $appRoot . '/src/Services/SupabaseClient.php';
require_once $appRoot . '/src/Services/AuditLogService.php';
require_once $appRoot . '/src/Services/StorageBridgeService.php';
require_once $appRoot . '/src/Services/ZipEncryptionService.php';
require_once $appRoot . '/src/Services/ExcelParserService.php';
require_once $appRoot . '/src/Controllers/AuthController.php';
require_once $appRoot . '/src/Controllers/StorageController.php';
require_once $appRoot . '/src/Controllers/BackupController.php';
require_once $appRoot . '/src/Controllers/RestoreController.php';
require_once $appRoot . '/src/Controllers/ImportController.php';
require_once $appRoot . '/src/Controllers/ExportController.php';

use App\Middleware\CorsMiddleware;
use App\Utils\Response;

// Handle CORS Pre-flight and headers
CorsMiddleware::handle();

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Strip base prefix if hosted under subdirectory /api/
$path = preg_replace('#^/api#', '', $requestUri);
$path = rtrim($path, '/');
if (empty($path)) $path = '/';

// Router Dispatcher
try {
    if ($path === '/' || $path === '/health') {
        Response::success([
            'service' => 'EL KAROOZ School Hostinger PHP API',
            'status' => 'ONLINE',
            'version' => '2.0.0',
            'php_version' => PHP_VERSION,
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z')
        ], 'خادم الواجهة البرمجية يعمل بكفاءة');
    }

    // Auth verification
    elseif ($path === '/auth/verify' && $requestMethod === 'GET') {
        (new \App\Controllers\AuthController())->verifySession();
    }

    // Storage File Management
    elseif ($path === '/storage/upload' && $requestMethod === 'POST') {
        (new \App\Controllers\StorageController())->upload();
    }
    elseif ($path === '/storage/delete' && $requestMethod === 'POST') {
        (new \App\Controllers\StorageController())->delete();
    }

    // Backup & Restore Management
    elseif ($path === '/backup/create' && $requestMethod === 'POST') {
        (new \App\Controllers\BackupController())->create();
    }
    elseif ($path === '/backup/list' && $requestMethod === 'GET') {
        (new \App\Controllers\BackupController())->list();
    }
    // SRS 26: an archive must be validated BEFORE it is ever uploaded to storage,
    // otherwise a corrupt file consumes space and a later restore attempt finds it.
    elseif ($path === '/backup/validate-zip' && $requestMethod === 'POST') {
        (new \App\Controllers\BackupController())->validateZip();
    }
    elseif ($path === '/backup/delete' && $requestMethod === 'POST') {
        (new \App\Controllers\BackupController())->delete();
    }
    elseif ($path === '/restore/preview' && $requestMethod === 'POST') {
        (new \App\Controllers\RestoreController())->preview();
    }
    // SRS 25.4/25.5: the missing execute path. Atomic (safety backup + auto rollback).
    elseif ($path === '/restore/execute' && $requestMethod === 'POST') {
        (new \App\Controllers\RestoreController())->execute();
    }

    // Bulk Import & Export
    elseif ($path === '/import/trainees' && $requestMethod === 'POST') {
        (new \App\Controllers\ImportController())->importTrainees();
    }
    elseif ($path === '/import/history' && $requestMethod === 'GET') {
        (new \App\Controllers\ImportController())->history();
    }
    elseif ($path === '/export/data' && $requestMethod === 'GET') {
        (new \App\Controllers\ExportController())->exportData();
    }

    else {
        Response::error("المسار غير موجود ({$requestMethod} {$path})", 'ROUTE_NOT_FOUND', 404);
    }
} catch (\Throwable $e) {
    Response::error($e->getMessage(), 'INTERNAL_SERVER_ERROR', 500);
}
