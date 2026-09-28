<?php
namespace App\Utils;

class Response {
    public static function json(array $data, int $statusCode = 200): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    public static function success(mixed $data = null, string $message = 'Success', int $statusCode = 200): void {
        self::json([
            'status' => 'success',
            'message' => $message,
            'data' => $data,
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z')
        ], $statusCode);
    }

    public static function error(string $message, string $code = 'ERROR', int $statusCode = 400, mixed $details = null): void {
        self::json([
            'status' => 'error',
            'code' => $code,
            'message' => $message,
            'details' => $details,
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z')
        ], $statusCode);
    }
}
