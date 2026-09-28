<?php
namespace App\Middleware;

use App\Utils\Response;
use App\Utils\Security;

class FileSecurityMiddleware {
    public static function validateUpload(array $file, string $category): void {
        $storageConfig = require dirname(__DIR__, 2) . '/config/storage.php';

        if ($file['error'] !== UPLOAD_ERR_OK) {
            Response::error('فشل رفع الملف: خطأ في نقل البيانات من العميل', 'UPLOAD_ERROR', 400);
        }

        // 1. Check max size
        $maxSize = $storageConfig['max_sizes'][$category] ?? (20 * 1024 * 1024);
        if ($file['size'] > $maxSize) {
            $mbLimit = round($maxSize / (1024 * 1024));
            Response::error("حجم الملف يتجاوز الحد الأقصى المسموح به ({$mbLimit} ميجابايت)", 'FILE_TOO_LARGE', 400);
        }

        // 2. Validate Extension & Disallow executable files
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $blockedExtensions = ['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'cgi', 'pl', 'py', 'sh', 'exe', 'bat', 'cmd', 'js', 'vbs'];
        if (in_array($ext, $blockedExtensions)) {
            Response::error('نوع الملف غير مسموح به لأسباب أمنية', 'BLOCKED_EXTENSION', 400);
        }

        // 3. Validate MIME via Magic Bytes
        $detectedMime = Security::detectMimeType($file['tmp_name']);
        if (!in_array($detectedMime, $storageConfig['allowed_mime_types'])) {
            Response::error("صيغة الملف غير مدعومة ({$detectedMime})", 'UNSUPPORTED_MIME_TYPE', 400);
        }
    }
}
