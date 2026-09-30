<?php
// backend-api/config/app.php

// Production origin is the deployed Vercel app. Keep localhost for local dev
// only when APP_ENV is not production, otherwise a developer's machine becomes
// a trusted CORS origin in a live system.
$corsOrigins = [
    'https://elkaroozschool-seven.vercel.app',
    'https://elkarooz-school.com',
    'https://www.elkarooz-school.com',
];

if ((getenv('APP_ENV') ?: 'production') !== 'production') {
    array_unshift($corsOrigins, 'http://localhost:3000');
}

return [
    'name' => 'EL KAROOZ School API',
    'env' => getenv('APP_ENV') ?: 'production',
    'debug' => getenv('APP_DEBUG') === 'true',
    'url' => getenv('APP_URL') ?: 'https://elkaroozschool.is-best.net',
    'cors' => [
        'allowed_origins' => $corsOrigins,
        'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Group-Scope']
    ]
];
