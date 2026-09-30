<?php
namespace App\Middleware;

use App\Utils\AppRoot;

class CorsMiddleware {
    public static function handle(): void {
        $config = require AppRoot::path('config/app.php');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigins = $config['cors']['allowed_origins'] ?? ['http://localhost:3000'];

        if (in_array($origin, $allowedOrigins, true)) {
            header("Access-Control-Allow-Origin: " . $origin);
            header("Access-Control-Allow-Credentials: true");
        } elseif ($config['env'] === 'development' && empty($origin)) {
            header("Access-Control-Allow-Origin: http://localhost:3000");
            header("Access-Control-Allow-Credentials: true");
        }

        header("Access-Control-Allow-Methods: " . implode(', ', $config['cors']['allowed_methods'] ?? ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']));
        header("Access-Control-Allow-Headers: " . implode(', ', $config['cors']['allowed_headers'] ?? ['Content-Type', 'Authorization', 'X-Requested-With']));
        header("Access-Control-Max-Age: 86400"); // 24 hours preflight cache

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
