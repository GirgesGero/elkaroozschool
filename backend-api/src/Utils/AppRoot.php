<?php
// backend-api/src/Utils/AppRoot.php
//
// SINGLE SOURCE OF TRUTH for locating the application root.
//
// Why this exists: the API is uploaded FLATTENED into public_html/ on shared
// hosting (index.php, config/, src/, storage/, vendor/ all become siblings of
// public_html). That means a file at src/Utils/AppRoot.php sits TWO levels below
// the root when running from the repo, but the same relative depth still lands
// correctly... except for src/Utils/* itself, where dirname(__DIR__, 2) resolves
// to the app root only under the repo layout. Under the flattened layout every
// class was silently requiring config/ and storage/ from the wrong directory.
//
// Resolution order:
//   1. ELKAROOZ_APP_ROOT, defined by public/index.php (authoritative).
//   2. Walk up from this file until a marker (vendor/autoload.php + config/) is found.
//   3. Fail closed rather than guessing.

namespace App\Utils;

class AppRoot {
    private static ?string $root = null;

    public static function path(string $relative = ''): string {
        if (self::$root === null) {
            self::$root = self::resolve();
        }
        return $relative === '' ? self::$root : self::$root . DIRECTORY_SEPARATOR . ltrim($relative, '/\\');
    }

    private static function resolve(): string {
        // 1. Defined by the front controller.
        if (defined('ELKAROOZ_APP_ROOT')) {
            $candidate = (string) constant('ELKAROOZ_APP_ROOT');
            if (is_dir($candidate . '/config') && is_dir($candidate . '/src')) {
                return $candidate;
            }
        }

        // 2. Walk up from this file (__DIR__ = <root>/src/Utils).
        $dir = __DIR__;
        for ($i = 0; $i < 6; $i++) {
            if (is_dir($dir . '/config') && is_dir($dir . '/src')) {
                return $dir;
            }
            $parent = dirname($dir);
            if ($parent === $dir) {
                break;
            }
            $dir = $parent;
        }

        // 3. Never guess.
        throw new \RuntimeException(
            'EL KAROOZ: application root not found. Expected a directory containing '
            . 'config/ and src/. Checked upward from ' . __DIR__ . '.'
        );
    }
}
