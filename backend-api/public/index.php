<?php
// backend-api/public/index.php
// Front Controller & Router for Hostinger PHP Backend

require_once dirname(__DIR__) . '/src/Utils/Response.php';
require_once dirname(__DIR__) . '/src/Utils/Security.php';
require_once dirname(__DIR__) . '/src/Middleware/CorsMiddleware.php';
require_once dirname(__DIR__) . '/src/Middleware/JwtAuthMiddleware.php';
require_once dirname(__DIR__) . '/src/Middleware/RbacMiddleware.php';
require_once dirname(__DIR__) . '/src/Middleware/GroupScopeMiddleware.php';
require_once dirname(__DIR__) . '/src/Middleware/FileSecurityMiddleware.php';
require_once dirname(__DIR__) . '/src/Services/SupabaseClient.php';
require_once dirname(__DIR__) . '/src/Services/AuditLogService.php';
require_once dirname(__DIR__) . '/src/Services/StorageBridgeService.php';
require_once dirname(__DIR__) . '/src/Services/ZipEncryptionService.php';
require_once dirname(__DIR__) . '/src/Services/ExcelParserService.php';
require_once dirname(__DIR__) . '/src/Controllers/AuthController.php';
require_once dirname(__DIR__) . '/src/Controllers/StorageController.php';
require_once dirname(__DIR__) . '/src/Controllers/BackupController.php';
require_once dirname(__DIR__) . '/src/Controllers/RestoreController.php';
require_once dirname(__DIR__) . '/src/Controllers/ImportController.php';
require_once dirname(__DIR__) . '/src/Controllers/ExportController.php';

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
    elseif ($path === '/restore/preview' && $requestMethod === 'POST') {
        (new \App\Controllers\RestoreController())->preview();
    }

    // Bulk Import & Export
    elseif ($path === '/import/trainees' && $requestMethod === 'POST') {
        (new \App\Controllers\ImportController())->importTrainees();
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
