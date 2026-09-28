<?php
namespace App\Utils;

class Security {
    public static function generateUuidV4(): string {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // variant RFC 4122
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public static function sanitizeFilename(string $filename): string {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        // Only allow safe alphanumeric extensions
        $cleanExt = preg_replace('/[^a-z0-9]/', '', $ext);
        return self::generateUuidV4() . '.' . $cleanExt;
    }

    public static function detectMimeType(string $filePath): string {
        if (!file_exists($filePath)) {
            return 'application/octet-stream';
        }
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $filePath);
        finfo_close($finfo);
        return $mime ?: 'application/octet-stream';
    }

    public static function sanitizeString(string $input): string {
        return htmlspecialchars(trim($input), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function validateUuid(string $uuid): bool {
        return (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uuid);
    }

    public static function preventPathTraversal(string $path): string {
        // Remove directory traversal characters
        $clean = str_replace(['../', '..\\', './', '.\\'], '', $path);
        return ltrim($clean, '/\\');
    }

    public static function constantTimeCompare(string $known, string $user): bool {
        return hash_equals($known, $user);
    }
}
