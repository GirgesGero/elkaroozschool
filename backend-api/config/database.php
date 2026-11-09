<?php
// backend-api/config/database.php
// Enterprise Self-Hosted Database Configuration (SQLite File-Based + MySQL 8.0+)

return [
    // If DB_CONNECTION is not explicitly set, auto-detect: MySQL if DB_HOST is provided, otherwise SQLite file
    'default' => getenv('DB_CONNECTION') ?: (getenv('DB_HOST') ? 'mysql' : 'sqlite'),

    'connections' => [
        'sqlite' => [
            'driver' => 'sqlite',
            'database' => getenv('DB_DATABASE_PATH') ?: (dirname(__DIR__) . '/storage/database/elkarooz.sqlite'),
            'options' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],
        ],
        'mysql' => [
            'driver' => 'mysql',
            'host' => getenv('DB_HOST') ?: '127.0.0.1',
            'port' => (int)(getenv('DB_PORT') ?: 3306),
            'database' => getenv('DB_DATABASE') ?: getenv('DB_NAME') ?: 'elkarooz_school',
            'username' => getenv('DB_USERNAME') ?: getenv('DB_USER') ?: 'root',
            'password' => getenv('DB_PASSWORD') ?: '',
            'charset' => getenv('DB_CHARSET') ?: 'utf8mb4',
            'collation' => getenv('DB_COLLATION') ?: 'utf8mb4_unicode_ci',
            'options' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => false,
                (defined('PDO::MYSQL_ATTR_INIT_COMMAND') ? PDO::MYSQL_ATTR_INIT_COMMAND : 1002) => 'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci',
            ],
        ],
    ],

    'jwt' => [
        'secret' => getenv('SUPABASE_JWT_SECRET') ?: getenv('JWT_SECRET') ?: '',
        'algorithm' => 'HS256',
        'access_token_ttl' => 3600,             // 1 hour
        'refresh_token_ttl' => 30 * 86400,       // 30 days
        'issuer' => getenv('APP_URL') ?: 'https://elkaroozschool.is-best.net',
        'audience' => 'authenticated',
    ],
];
