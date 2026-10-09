<?php
namespace App\Middleware;

use App\Utils\AppRoot;
use App\Utils\ClientIp;
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
        $clientIp = ClientIp::resolve();
        $cacheDir = AppRoot::path('storage/cache/ratelimit');

        if (!is_dir($cacheDir) && !@mkdir($cacheDir, 0750, true) && !is_dir($cacheDir)) {
        // Cannot persist counters. Refusing here would take the API down, and
        // silently allowing unlimited traffic would make the limiter a no-op that
        // reads as protection. Fail the request and say why.
        error_log('[EL KAROOZ] rate limit: cannot create ' . $cacheDir);
        Response::error('الخدمة غير متاحة مؤقتاً', 'RATE_LIMIT_UNAVAILABLE', 503);
        }

        $rateFile = $cacheDir . '/' . md5($clientIp . '_' . $endpointKey) . '.json';

        $handle = @fopen($rateFile, 'c+');
        if ($handle === false) {
        error_log('[EL KAROOZ] rate limit: cannot open counter ' . $rateFile);
        Response::error('الخدمة غير متاحة مؤقتاً', 'RATE_LIMIT_UNAVAILABLE', 503);
        }

        // The whole read-modify-write has to be inside one exclusive lock.
        //
        // LOCK_EX passed to fwrite() only guards the write itself. The read happened
        // before that lock was taken, so two requests arriving together both read
        // count=59, both write 60, and the burst the limit exists to stop sails
        // straight through. Under load the counter also loses updates, so the limit
        // drifts upwards and stops being a limit at all.
        //
        // flock() on the open handle covers the read and the write together, making
        // the increment atomic. LOCK_NB is not used: this is a couple of file
        // operations, and blocking briefly beats serving an uncounted request.
        if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        error_log('[EL KAROOZ] rate limit: cannot lock counter ' . $rateFile);
        Response::error('الخدمة غير متاحة مؤقتاً', 'RATE_LIMIT_UNAVAILABLE', 503);
        }

        $now = time();
        $rateData = ['count' => 0, 'expires_at' => $now + $windowSeconds];

        rewind($handle);
        $content = stream_get_contents($handle);
        $parsed = ($content !== false && $content !== '') ? json_decode($content, true) : null;

        if (is_array($parsed) && isset($parsed['expires_at']) && $parsed['expires_at'] > $now) {
        $rateData = $parsed;
        $rateData['count'] = (int) ($rateData['count'] ?? 0);
        }

        $rateData['count']++;
        $rateData['expires_at'] = (int) ($rateData['expires_at'] ?? ($now + $windowSeconds));

        $encoded = json_encode($rateData);
        if ($encoded !== false) {
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, $encoded);
        fflush($handle);
        }

        flock($handle, LOCK_UN);
        fclose($handle);

        if ($rateData['count'] > $maxRequests) {
        $retryAfter = max(1, (int) $rateData['expires_at'] - $now);
        header('Retry-After: ' . $retryAfter);
        Response::error('تم تجاوز الحد الأقصى المسموح به من الطلبات، يرجى المحاولة لاحقاً', 'RATE_LIMIT_EXCEEDED', 429);
        }
    }
}
