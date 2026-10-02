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
require_once $appRoot . '/src/Services/DatabaseExportService.php';
require_once $appRoot . '/src/Services/DatabaseRestoreService.php';
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
require_once $appRoot . '/src/Middleware/RateLimitMiddleware.php';

use App\Middleware\CorsMiddleware;
use App\Middleware\RateLimitMiddleware;
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
        // Cheap but auth-adjacent: keep credential stuffing slow without punishing a
        // user who mistypes a few times. 30/min per IP.
        RateLimitMiddleware::check('auth', 30, 60);
        (new \App\Controllers\AuthController())->verifySession();
    }

    // Storage File Management
    elseif ($path === '/storage/upload' && $requestMethod === 'POST') {
        // Uploads consume disk and bandwidth. 20/min leaves room for a real bulk job
        // while stopping a single client from filling the quota.
        RateLimitMiddleware::check('upload', 20, 60);
        (new \App\Controllers\StorageController())->upload();
    }
    elseif ($path === '/storage/delete' && $requestMethod === 'POST') {
        // Grouped with upload: the two are used together and should share a budget.
        RateLimitMiddleware::check('upload', 20, 60);
        (new \App\Controllers\StorageController())->delete();
    }

    // Backup & Restore Management
    elseif ($path === '/backup/create' && $requestMethod === 'POST') {
        // A backup is a full database export. 5 per 5 minutes: enough to take a few
        // before an operation and one after, not enough to loop it.
        RateLimitMiddleware::check('backup', 5, 300);
        (new \App\Controllers\BackupController())->create();
    }
    elseif ($path === '/backup/list' && $requestMethod === 'GET') {
        // Listing is a cheap metadata read, and the UI polls it.
        RateLimitMiddleware::check('backup', 60, 60);
        (new \App\Controllers\BackupController())->list();
    }
    // SRS 26: an archive must be validated BEFORE it is ever uploaded to storage,
    // otherwise a corrupt file consumes space and a later restore attempt finds it.
    elseif ($path === '/backup/validate-zip' && $requestMethod === 'POST') {
        // Unzips the uploaded archive, so it costs real CPU and memory.
        RateLimitMiddleware::check('backup', 10, 60);
        (new \App\Controllers\BackupController())->validateZip();
    }
    elseif ($path === '/backup/delete' && $requestMethod === 'POST') {
        RateLimitMiddleware::check('backup', 30, 60);
        (new \App\Controllers\BackupController())->delete();
    }
    elseif ($path === '/restore/preview' && $requestMethod === 'POST') {
        // Preview reads a whole archive. Tight, because it is a preview and not an
        // operation, and because it is the cheapest way to learn the file format.
        RateLimitMiddleware::check('restore', 10, 300);
        (new \App\Controllers\RestoreController())->preview();
    }
    // SRS 25.4/25.5: the missing execute path. Atomic (safety backup + auto rollback).
    elseif ($path === '/restore/execute' && $requestMethod === 'POST') {
        // The most destructive route here: it rewrites the database. Two per ten
        // minutes is deliberately tight -- an operator retries once, not in a loop.
        RateLimitMiddleware::check('restore', 2, 600);
        (new \App\Controllers\RestoreController())->execute();
    }

    // Bulk Import & Export
    elseif ($path === '/import/trainees' && $requestMethod === 'POST') {
        // Parses a spreadsheet and writes many rows per run.
        RateLimitMiddleware::check('import', 10, 300);
        (new \App\Controllers\ImportController())->importTrainees();
    }
    elseif ($path === '/import/history' && $requestMethod === 'GET') {
        RateLimitMiddleware::check('import', 60, 60);
        (new \App\Controllers\ImportController())->history();
    }
    elseif ($path === '/export/data' && $requestMethod === 'GET') {
        // Dumps the whole database in one response. Expensive and highly compressible
        // by an attacker, so it gets one of the smallest budgets.
        RateLimitMiddleware::check('export', 5, 300);
        (new \App\Controllers\ExportController())->exportData();
    }

    else {
        Response::error("المسار غير موجود ({$requestMethod} {$path})", 'ROUTE_NOT_FOUND', 404);
    }
} catch (\Throwable $e) {
    // The message goes to the server log, not to the caller.
    //
    // getMessage() is written for a developer looking at a stack trace. Returned to an
    // HTTP client it discloses whatever the failure happened to contain: a Supabase
    // URL and key from a config typo, a filesystem path from a failed include, a SQL
    // fragment, or -- if the throw came from a wrapped third-party call -- the remote
    // service's own error text. It also turns every failure into a stable fingerprint
    // an attacker can use to map the application's internals.
    //
    // The client gets a generic message plus a correlation id. The id is what makes
    // support possible: it appears in the response and in the log line, so a report of
    // "it failed, here is the id" can be matched to the real cause without exposing it.
    $errorId = substr(bin2hex(random_bytes(8)), 0, 16);

    error_log(sprintf(
        '[EL KAROOZ] %s unhandled in %s %s [ref=%s] %s in %s:%d',
        $errorId,
        $_SERVER['REQUEST_METHOD'] ?? '-',
        $path ?? '-',
        $errorId,
        $e->getMessage(),
        $e->getFile(),
        $e->getLine()
    ));

    Response::error(
        'حدث خطأ غير متوقع في الخادم. يرجى المحاولة لاحقاً أو التواصل مع الدعم مع ذكر رمز الخطأ: ' . $errorId,
        'INTERNAL_SERVER_ERROR',
        500
    );
}
