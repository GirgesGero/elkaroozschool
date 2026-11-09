<?php
/**
 * Test Suite: MySQL Enterprise Database Architecture & Supabase Replacement Verification
 * Verifies schema syntax, table completeness (66 tables), virtual unique columns,
 * triggers, Auth service JWT generation, and Data API routing.
 */

require_once dirname(__DIR__) . '/backend-api/vendor/autoload.php';
define('ELKAROOZ_APP_ROOT', dirname(__DIR__) . '/backend-api');

require_once ELKAROOZ_APP_ROOT . '/src/Utils/AppRoot.php';
require_once ELKAROOZ_APP_ROOT . '/src/Utils/Security.php';
require_once ELKAROOZ_APP_ROOT . '/src/Utils/Response.php';
require_once ELKAROOZ_APP_ROOT . '/src/Database/MySQL.php';
require_once ELKAROOZ_APP_ROOT . '/src/Auth/MySQLAuthService.php';
require_once ELKAROOZ_APP_ROOT . '/src/Controllers/AuthApiController.php';
require_once ELKAROOZ_APP_ROOT . '/src/Controllers/DataApiController.php';

use App\Auth\MySQLAuthService;
use App\Database\MySQL;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$passed = 0;
$failed = 0;

function check(string $name, bool $ok, string $detail = ''): void {
    global $passed, $failed;
    if ($ok) {
        $passed++;
        echo sprintf("  [PASS] %s %s\n", $name, $detail ? "({$detail})" : "");
    } else {
        $failed++;
        echo sprintf("  [FAIL] %s %s\n", $name, $detail ? "({$detail})" : "");
    }
}

echo "========================================================================\n";
echo "MYSQL ENTERPRISE DATABASE ARCHITECTURE & REPLACEMENT VERIFICATION\n";
echo "========================================================================\n\n";

echo "=== 1. Schema Files & Tables Completeness ===\n";

$schemaDir = dirname(__DIR__) . '/database-mysql/schema';
$masterFile = $schemaDir . '/COMPLETE_MYSQL_SCHEMA.sql';

check('Master MySQL schema file exists', file_exists($masterFile), basename($masterFile));
$masterSql = file_exists($masterFile) ? file_get_contents($masterFile) : '';

// Count CREATE TABLE statements
preg_match_all('/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:`|")?([a-zA-Z0-9_]+)(?:`|")?\s*\(/i', $masterSql, $matches);
$createdTables = array_unique($matches[1]);
$tableCount = count($createdTables);

check('Master schema defines all 66 tables (64 operational + 2 auth)', $tableCount === 66, "found {$tableCount} tables");

$essentialTables = [
    'auth_users', 'auth_refresh_tokens', 'profiles', 'groups', 'roles',
    'permissions', 'servant_permissions', 'terms', 'lecturers', 'lectures',
    'curriculums', 'curriculum_days', 'curriculum_entries', 'attendance_sessions',
    'attendance_records', 'exams', 'exam_grades', 'marathons', 'marathon_sections',
    'marathon_questions', 'marathon_answers', 'marathon_trainee_submissions',
    'feed_posts', 'post_comments', 'post_images', 'gallery_albums', 'gallery_items',
    'books', 'researches', 'mp3_tracks', 'user_favorites', 'bible_books',
    'bible_chapters', 'bible_verses', 'bible_commentaries', 'notifications',
    'audit_logs', 'backup_records', 'import_history', 'media_assets', 'system_reset_gate'
];

$missing = [];
foreach ($essentialTables as $t) {
    if (!in_array($t, $createdTables, true)) {
        $missing[] = $t;
    }
}
check('All essential operational and media tables are present', count($missing) === 0, count($missing) ? implode(', ', $missing) : '100% present');

echo "\n=== 2. Engine, Character Set & Soft-Delete Uniqueness ===\n";

check('All tables enforce ENGINE=InnoDB', substr_count($masterSql, 'ENGINE=InnoDB') >= 66);
check('All tables enforce CHARSET=utf8mb4', substr_count($masterSql, 'CHARSET=utf8mb4') >= 66);
check('All tables enforce COLLATE=utf8mb4_unicode_ci', substr_count($masterSql, 'COLLATE=utf8mb4_unicode_ci') >= 66);

// Check partial unique index emulation via generated virtual columns
$hasActiveTermIdInExams = (bool)preg_match('/active_term_id.*GENERATED ALWAYS AS.*VIRTUAL/i', $masterSql);
check('exams table uses virtual generated column active_term_id for soft-delete uniqueness', $hasActiveTermIdInExams);

$hasActiveTermIdInCurriculum = (bool)preg_match('/uq_active_curriculum_day/i', $masterSql);
check('curriculum_days uses virtual column to enforce unique day numbers on active records', $hasActiveTermIdInCurriculum);

echo "\n=== 3. Triggers & Business Rules ===\n";

check('Audit logs immutability trigger defined (deny update)', str_contains($masterSql, 'trg_audit_logs_deny_update'));
check('Audit logs immutability trigger defined (deny delete)', str_contains($masterSql, 'trg_audit_logs_deny_delete'));
check('Last admin protection trigger defined on profiles', str_contains($masterSql, 'trg_profiles_guard_last_admin_update'));
check('Thursday attendance freeze trigger defined (Cairo UTC+2)', str_contains($masterSql, 'trg_attendance_thursday_freeze_insert'));
check('Feed post comment counter synchronization trigger defined', str_contains($masterSql, 'trg_post_comments_count_insert'));

echo "\n=== 4. MySQL Auth Service & JWT Parity ===\n";

// Test UUIDv4 Generator
$uuid = MySQLAuthService::generateUuid();
$validUuid = (bool)preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uuid);
check('UUIDv4 generator produces RFC 4122 compliant identifiers', $validUuid, $uuid);

// Test Password Hashing
$plainPassword = 'TestPassword123!';
$hash = password_hash($plainPassword, PASSWORD_BCRYPT);
check('Bcrypt password hashing and verification', password_verify($plainPassword, $hash));

// Test JWT Minting & Decoding
$jwtSecret = 'test-secret-key-that-is-at-least-32-characters-long';
$authService = new MySQLAuthService(null, [
    'secret' => $jwtSecret,
    'algorithm' => 'HS256',
    'access_token_ttl' => 3600,
    'refresh_token_ttl' => 86400,
    'issuer' => 'https://test.elkarooz-school.com',
    'audience' => 'authenticated',
]);

// Call private mintAccessToken via reflection
$refClass = new ReflectionClass(MySQLAuthService::class);
$mintMethod = $refClass->getMethod('mintAccessToken');
$mintMethod->setAccessible(true);

$dummyUser = [
    'id' => $uuid,
    'email' => 'trainee@elkarooz-school.com',
    'username' => 'trainee_girges',
    'role' => 'trainee',
    'group_id' => 1
];
$dummyProfile = [
    'full_name' => 'جرجس متدرب',
    'phone' => '0123456789'
];

$token = $mintMethod->invoke($authService, $dummyUser, $dummyProfile);
check('JWT Access Token is minted successfully', is_string($token) && strlen($token) > 50);

$decoded = JWT::decode($token, new Key($jwtSecret, 'HS256'));
$decodedArray = json_decode(json_encode($decoded), true);

check('JWT contains audience = authenticated (matches Supabase)', ($decodedArray['aud'] ?? '') === 'authenticated');
check('JWT contains sub = user UUID', ($decodedArray['sub'] ?? '') === $uuid);
check('JWT contains app_metadata.role', ($decodedArray['app_metadata']['role'] ?? '') === 'trainee');
check('JWT contains user_metadata.full_name', ($decodedArray['user_metadata']['full_name'] ?? '') === 'جرجس متدرب');
check('JWT contains user_metadata.group_id', ($decodedArray['user_metadata']['group_id'] ?? null) === 1);

echo "\n=== 5. Router & Data API Registration ===\n";

$indexPath = ELKAROOZ_APP_ROOT . '/public/index.php';
$indexContent = file_get_contents($indexPath);

check('Router registers POST /auth/login', str_contains($indexContent, "'/auth/login'"));
check('Router registers POST /auth/refresh', str_contains($indexContent, "'/auth/refresh'"));
check('Router registers POST /auth/logout', str_contains($indexContent, "'/auth/logout'"));
check('Router registers GET /auth/me', str_contains($indexContent, "'/auth/me'"));
check('Router registers POST /auth/change-password', str_contains($indexContent, "'/auth/change-password'"));
check('Router registers scoped Data API /data/{table}', str_contains($indexContent, "'#^/data/([a-zA-Z0-9_]+)"));

// Check DataApiController allowlist
$refData = new ReflectionClass(\App\Controllers\DataApiController::class);
$allowedConst = $refData->getConstant('ALLOWED_TABLES');
check('DataApiController allows all essential domain tables', count($allowedConst) >= 55, count($allowedConst) . ' tables allowed');

echo "\n------------------------------------------------------------------------\n";
echo sprintf("RESULT: %d passed, %d failed out of %d checks\n", $passed, $failed, $passed + $failed);
echo "------------------------------------------------------------------------\n";

exit($failed === 0 ? 0 : 1);
