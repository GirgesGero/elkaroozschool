<?php
// backend-api/config/storage.php

return [
    'root_path' => dirname(__DIR__) . '/storage',
    'public_url' => getenv('STORAGE_PUBLIC_URL') ?: 'https://storage.elkarooz-school.com',
    'max_sizes' => [
        'avatar' => 10 * 1024 * 1024,      // 10 MB
        'feed' => 15 * 1024 * 1024,        // 15 MB
        'pdf' => 50 * 1024 * 1024,         // 50 MB
        'mp3' => 150 * 1024 * 1024,        // 150 MB
        'backup' => 2048 * 1024 * 1024,    // 2 GB
    ],
    'allowed_mime_types' => [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf',
        'audio/mpeg', 'audio/mp3', 'audio/wav',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv', 'application/zip'
    ]
];
