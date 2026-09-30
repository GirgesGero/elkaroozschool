<?php
namespace App\Middleware;

use App\Utils\AppRoot;

use App\Utils\Response;

class RateLimitMiddleware {
    /**
     * Enforce rate limiting based on client IP and route category.
     *
     * @param string $endpointKey (e.g. 'auth', 'upload', 'general')
     * @param int $maxRequests Max requests allowed in window
     * @param int $windowSeconds Window in seconds (e.g. 60)
     */
    public static function check(string $endpointKey = 'general', int $maxRequests = 60, int $windowSeconds = 60): void {
        $clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $cacheDir = AppRoot::path('storage/cache/ratelimit');

        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0750, true);
        }

        $hashKey = md5($clientIp . '_' . $endpointKey);
        $rateFile = $cacheDir . '/' . $hashKey . '.json';

        $now = time();
        $rateData = ['count' => 0, 'expires_at' => $now + $windowSeconds];

        if (file_exists($rateFile)) {
            $content = @file_get_contents($rateFile);
            $parsed = $content ? json_decode($content, true) : null;
            if ($parsed && isset($parsed['expires_at']) && $parsed['expires_at'] > $now) {
                $rateData = $parsed;
            }
        }

        $rateData['count']++;
        @file_put_contents($rateFile, json_encode($rateData), LOCK_EX);

        if ($rateData['count'] > $maxRequests) {
            header('Retry-After: ' . ($rateData['expires_at'] - $now));
            Response::error('تم تجاوز الحد الأقصى المسموح به من الطلبات، يرجى المحاولة لاحقاً', 'RATE_LIMIT_EXCEEDED', 429);
        }
    }
}
