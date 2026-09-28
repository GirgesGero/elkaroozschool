<?php
// backend-api/config/app.php

return [
    'name' => 'EL KAROOZ School API',
    'env' => getenv('APP_ENV') ?: 'production',
    'debug' => getenv('APP_DEBUG') === 'true',
    'url' => getenv('APP_URL') ?: 'https://api.elkarooz-school.com',
    'cors' => [
        'allowed_origins' => [
            'http://localhost:3000',
            'https://elkarooz-school.com',
            'https://www.elkarooz-school.com'
        ],
        'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Group-Scope']
    ]
];
