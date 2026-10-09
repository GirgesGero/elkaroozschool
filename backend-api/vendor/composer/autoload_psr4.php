<?php
// vendor/composer/autoload_psr4.php — generated for the EL KAROOZ backend.
//
// Only two PSR-4 roots are mapped, which is all this project needs:
//   Firebase\JWT\ ->  firebase/php-jwt (vendored, no network install required)
//   App\          ->  the project's own src/ tree
//
// This file exists so `require vendor/autoload.php` succeeds on shared hosting
// where running `composer install` is not always possible. If you DO run
// `composer install --no-dev` on the server, Composer overwrites this directory
// with its own generated map and the project keeps working.

return array(
    'Firebase\\JWT\\' => array($vendorDir . '/firebase/php-jwt/src'),
    'App\\'          => array($baseDir . '/src'),
);
