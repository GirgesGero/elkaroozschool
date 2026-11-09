<?php
/**
 * EL KAROOZ SCHOOL — Supabase to MySQL Migration & Data Synchronization Engine
 * Extracts all tables and rows from Supabase (PostgreSQL) and transforms/imports them into MySQL.
 */

require_once dirname(__DIR__) . '/backend-api/vendor/autoload.php';
define('ELKAROOZ_APP_ROOT', dirname(__DIR__) . '/backend-api');

require_once ELKAROOZ_APP_ROOT . '/src/Database/MySQL.php';
require_once ELKAROOZ_APP_ROOT . '/src/Services/SupabaseClient.php';

use App\Database\MySQL;
use App\Services\SupabaseClient;

echo "=================================================================\n";
echo "EL KAROOZ SCHOOL — SUPABASE TO MYSQL DATA SYNC ENGINE\n";
echo "=================================================================\n\n";

$supabaseUrl = getenv('SUPABASE_URL') ?: getenv('NEXT_PUBLIC_SUPABASE_URL');
$serviceKey = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: getenv('SUPABASE_KEY');

if (!$supabaseUrl || !$serviceKey) {
    echo "[!] Supabase credentials not found in environment.\n";
    echo "    Please provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to perform live ETL sync.\n";
    echo "    Alternatively, use the static schema files in database-mysql/schema/\n";
    exit(0);
}

$supabase = new SupabaseClient($supabaseUrl, $serviceKey);

// Ordered table migration sequence honoring Foreign Key dependency graph
$migrationSequence = [
    // 1. Core & Roles
    'roles',
    'permissions',
    'groups',
    'categories',
    'lecturers',
    
    // 2. Auth & Profiles
    'profiles',
    'servant_permissions',
    'group_secretariat',
    'general_secretariat_members',
    'general_secretariat_permissions',
    
    // 3. Academic
    'terms',
    'curriculums',
    'curriculum_days',
    'lectures',
    'curriculum_entries',
    'curriculum_revisions',
    'attendance_sessions',
    'attendance_records',
    'exams',
    'exam_grades',
    
    // 4. Marathon
    'marathons',
    'marathon_sections',
    'marathon_questions',
    'marathon_answers',
    'marathon_question_revisions',
    'marathon_trainee_submissions',
    'marathon_trainee_answers',
    
    // 5. Community & Media
    'feed_posts',
    'post_images',
    'post_comments',
    'reactions',
    'gallery_albums',
    'gallery_items',
    'books',
    'researches',
    'mp3_tracks',
    'user_favorites',
    
    // 6. Bible Encyclopedia
    'bible_testaments',
    'bible_books',
    'bible_chapters',
    'bible_verses',
    'bible_verse_words',
    'bible_sources',
    'bible_commentaries',
    'bible_word_commentaries',
    'bible_dictionary_entries',
    'word_dictionary_mappings',
    'bible_content_versions',
    
    // 7. System
    'notifications',
    'notification_templates',
    'push_subscriptions',
    'daily_verses',
    'daily_verse_dispatch_state',
    'audit_logs',
    'backup_records',
    'import_history',
    'media_assets',
    'system_reset_gate'
];

echo sprintf("[+] Found %d tables in dependency sequence.\n", count($migrationSequence));

$db = MySQL::getInstance();
if (!$db->isConnected()) {
    echo "[!] MySQL database is not connected on current host.\n";
    echo "    Generated SQL sync dump will be exported to database-mysql/supabase_live_data_dump.sql\n\n";
}

$dumpFile = dirname(__DIR__) . '/database-mysql/supabase_live_data_dump.sql';
$dumpHandle = fopen($dumpFile, 'w');
fwrite($dumpHandle, "-- EL KAROOZ SCHOOL Live Data Dump from Supabase\n");
fwrite($dumpHandle, "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n");

$totalMigratedRows = 0;

foreach ($migrationSequence as $table) {
    echo sprintf("[-] Fetching '%s'... ", $table);
    $res = $supabase->query($table, ['select' => '*', 'limit' => 2000]);
    
    if (!isset($res['status']) || $res['status'] < 200 || $res['status'] >= 300) {
        echo "FAILED (HTTP {$res['status']})\n";
        continue;
    }

    $rows = $res['data'] ?? [];
    $count = count($rows);
    echo sprintf("%d rows found.\n", $count);

    if ($count === 0) continue;

    $totalMigratedRows += $count;

    // Generate INSERT statements
    $columns = array_keys($rows[0]);
    $escapedCols = array_map(fn($c) => "`{$c}`", $columns);
    $colsHeader = implode(', ', $escapedCols);

    fwrite($dumpHandle, "-- Table: {$table} ({$count} rows)\n");
    foreach ($rows as $row) {
        $values = [];
        foreach ($columns as $c) {
            $val = $row[$c] ?? null;
            if ($val === null) {
                $values[] = 'NULL';
            } elseif (is_bool($val)) {
                $values[] = $val ? '1' : '0';
            } elseif (is_array($val)) {
                $values[] = "'" . addslashes(json_encode($val, JSON_UNESCAPED_UNICODE)) . "'";
            } elseif (is_numeric($val)) {
                $values[] = $val;
            } else {
                $values[] = "'" . addslashes((string)$val) . "'";
            }
        }
        $valString = implode(', ', $values);
        fwrite($dumpHandle, "INSERT IGNORE INTO `{$table}` ({$colsHeader}) VALUES ({$valString});\n");
    }
    fwrite($dumpHandle, "\n");
}

fwrite($dumpHandle, "SET FOREIGN_KEY_CHECKS = 1;\n");
fclose($dumpHandle);

echo sprintf("\n[SUCCESS] Exported %d total rows into: %s\n", $totalMigratedRows, $dumpFile);
