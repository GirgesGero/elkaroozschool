<?php
// vendor/autoload.php — minimal PSR-4 autoloader for the EL KAROOZ backend.

$vendorDir = __DIR__;
$baseDir   = dirname(__DIR__);

if (!is_file($vendorDir . '/composer/autoload_psr4.php')) {
    throw new \RuntimeException('Composer autoload map is missing.');
}

$map = require $vendorDir . '/composer/autoload_psr4.php';

spl_autoload_register(static function (string $class) use ($map, $vendorDir, $baseDir): void {
    foreach ($map as $prefix => $dirs) {
        if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
            continue;
        }
        $relative = substr($class, strlen($prefix));
        // PSR-4: separators in the class name map to directory separators.
        $file = str_replace('\\', DIRECTORY_SEPARATOR, $relative) . '.php';
        foreach ($dirs as $dir) {
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            if (is_file($path)) {
                require $path;
                return;
            }
        }
    }
});
