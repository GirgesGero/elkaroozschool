<?php
/**
 * Phase 7: Media Migration & Rehearsal Manifest Generator
 *
 * Implements dry-run rehearsal, asset classification, and manifest generation
 * for transferring existing media references to Google Drive and media_assets.
 */

require_once dirname(__DIR__) . '/backend-api/vendor/autoload.php';
define('ELKAROOZ_APP_ROOT', dirname(__DIR__) . '/backend-api');

require_once ELKAROOZ_APP_ROOT . '/src/Utils/AppRoot.php';
require_once ELKAROOZ_APP_ROOT . '/src/Utils/Security.php';
require_once ELKAROOZ_APP_ROOT . '/src/Utils/Environment.php';

// If running locally in CLI rehearsal, load frontend .env.local if present
$devEnv = dirname(__DIR__) . '/frontend/.env.local';
if (is_file($devEnv) && !getenv('SUPABASE_URL')) {
    $lines = file($devEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $l) {
        $l = trim($l);
        if (str_starts_with($l, 'NEXT_PUBLIC_SUPABASE_URL=')) {
            $v = trim(substr($l, strlen('NEXT_PUBLIC_SUPABASE_URL=')));
            putenv("SUPABASE_URL=$v");
        } elseif (str_starts_with($l, 'NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
            $v = trim(substr($l, strlen('NEXT_PUBLIC_SUPABASE_ANON_KEY=')));
            putenv("SUPABASE_ANON_KEY=$v");
            putenv("SUPABASE_SERVICE_ROLE_KEY=$v");
            putenv("SUPABASE_JWT_SECRET=dev-secret-placeholder-for-rehearsal-only");
        }
    }
}

require_once ELKAROOZ_APP_ROOT . '/src/Services/SupabaseClient.php';

echo "==================================================================\n";
echo "PHASE 7: GOOGLE DRIVE MEDIA MIGRATION REHEARSAL MANIFEST\n";
echo "==================================================================\n";

$supabase = new \App\Services\SupabaseClient();

$tablesToScan = [
    'books' => [
        'type' => 'BOOK_FILE',
        'url_col' => 'file_url',
        'cover_col' => 'cover_url',
        'group_col' => 'group_id',
        'uploader_col' => 'created_by'
    ],
    'researches' => [
        'type' => 'RESEARCH_FILE',
        'url_col' => 'file_url',
        'cover_col' => null,
        'group_col' => 'group_id',
        'uploader_col' => 'created_by'
    ],
    'curriculums' => [
        'type' => 'CURRICULUM',
        'url_col' => 'file_url',
        'cover_col' => null,
        'group_col' => 'group_id',
        'uploader_col' => 'created_by'
    ],
    'mp3_tracks' => [
        'type' => 'MP3_TRACK',
        'url_col' => 'audio_url',
        'cover_col' => null,
        'group_col' => 'group_id',
        'uploader_col' => 'created_by'
    ],
    'gallery_items' => [
        'type' => 'GALLERY_ITEM',
        'url_col' => 'image_url',
        'cover_col' => null,
        'group_col' => 'group_id',
        'uploader_col' => 'uploaded_by'
    ],
    'post_images' => [
        'type' => 'POST_IMAGE',
        'url_col' => 'image_url',
        'cover_col' => null,
        'group_col' => null,
        'uploader_col' => null
    ],
    'backup_records' => [
        'type' => 'BACKUP_ARCHIVE',
        'url_col' => 'storage_path',
        'cover_col' => null,
        'group_col' => null,
        'uploader_col' => 'created_by'
    ],
    'import_history' => [
        'type' => 'IMPORT_FILE',
        'url_col' => 'original_file_storage_path',
        'cover_col' => null,
        'group_col' => 'group_id',
        'uploader_col' => 'performed_by'
    ],
];

$manifest = [
    'generated_at' => gmdate('Y-m-d\TH:i:s\Z'),
    'mode' => 'DRY_RUN_REHEARSAL',
    'total_discovered_references' => 0,
    'by_resource_type' => [],
    'migration_plan' => []
];

foreach ($tablesToScan as $tbl => $cfg) {
    $res = $supabase->query($tbl . '?select=*');
    if ($res['status'] !== 200 || !is_array($res['data'])) {
        echo "[WARN] Could not read table $tbl (HTTP {$res['status']})\n";
        continue;
    }

    $rows = $res['data'];
    $count = count($rows);
    $manifest['by_resource_type'][$cfg['type']] = $count;
    $manifest['total_discovered_references'] += $count;

    echo sprintf("Scanning %-20s -> %2d rows found\n", $tbl, $count);

    foreach ($rows as $row) {
        $url = $row[$cfg['url_col']] ?? null;
        if (!empty($url)) {
            $manifest['migration_plan'][] = [
                'table' => $tbl,
                'resource_id' => $row['id'] ?? null,
                'resource_type' => $cfg['type'],
                'source_url_or_path' => $url,
                'group_id' => $cfg['group_col'] ? ($row[$cfg['group_col']] ?? null) : null,
                'target_drive_folder' => $cfg['group_col'] ? "groups/group_" . ($row[$cfg['group_col']] ?? 1) . "/" . strtolower($cfg['type']) : "global/" . strtolower($cfg['type']),
                'target_status' => 'PENDING_PROVISIONING',
                'idempotency_hash' => hash('sha256', $tbl . ':' . ($row['id'] ?? '') . ':' . $url)
            ];
        }
        if ($cfg['cover_col'] && !empty($row[$cfg['cover_col']])) {
            $coverUrl = $row[$cfg['cover_col']];
            $manifest['migration_plan'][] = [
                'table' => $tbl,
                'resource_id' => $row['id'] ?? null,
                'resource_type' => $cfg['type'] . '_COVER',
                'source_url_or_path' => $coverUrl,
                'group_id' => $cfg['group_col'] ? ($row[$cfg['group_col']] ?? null) : null,
                'target_drive_folder' => $cfg['group_col'] ? "groups/group_" . ($row[$cfg['group_col']] ?? 1) . "/covers" : "global/covers",
                'target_status' => 'PENDING_PROVISIONING',
                'idempotency_hash' => hash('sha256', $tbl . ':cover:' . ($row['id'] ?? '') . ':' . $coverUrl)
            ];
        }
    }
}

$manifestFile = ELKAROOZ_APP_ROOT . '/../docs/MEDIA_MIGRATION_REHEARSAL_MANIFEST.json';
file_put_contents($manifestFile, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

echo "==================================================================\n";
echo "REHEARSAL COMPLETED SUCCESSFULLY:\n";
echo "  Total Discovered Media References: " . count($manifest['migration_plan']) . "\n";
echo "  Manifest written to: docs/MEDIA_MIGRATION_REHEARSAL_MANIFEST.json\n";
echo "==================================================================\n";
