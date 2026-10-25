<?php

declare(strict_types=1);

$root = dirname(__DIR__, 2);
$migrations = glob($root . '/supabase/migrations/*_safe_system_reset.sql') ?: [];
$checks = [];
$check = static function (bool $condition, string $message) use (&$checks): void {
    $checks[] = [$condition, $message];
};

$check(count($migrations) === 1, 'exactly one additive safe-reset migration exists');
$migration = count($migrations) === 1 ? file_get_contents($migrations[0]) : '';
$router = file_get_contents(dirname(__DIR__) . '/public/index.php') ?: '';
$controllerPath = dirname(__DIR__) . '/src/Controllers/SystemResetController.php';
$controller = is_file($controllerPath) ? (file_get_contents($controllerPath) ?: '') : '';

foreach ([
    'system_reset_runs',
    'system_reset_run_assets',
    'system_reset_run_users',
    'system_reset_preview',
    'system_reset_begin',
    'system_reset_finalize_data',
    'system_reset_mark_asset_results',
    'system_reset_mark_user_result',
] as $required) {
    $check(str_contains($migration, $required), "migration defines {$required}");
}

foreach ([
    'attendance_records', 'attendance_sessions', 'exam_grades', 'exams',
    'marathon_trainee_answers', 'marathon_trainee_submissions', 'marathon_answers',
    'marathon_questions', 'marathon_sections', 'marathon_question_revisions', 'marathons',
    'post_images', 'post_comments', 'reactions', 'feed_posts',
    'curriculum_revisions', 'curriculum_entries', 'curriculum_days', 'curriculums',
    'lectures', 'terms', 'lecturers', 'books', 'researches', 'gallery_items',
    'gallery_albums', 'mp3_tracks', 'user_favorites', 'notifications',
    'push_subscriptions', 'daily_verse_dispatch_state', 'daily_verses',
    'servant_permissions', 'group_secretariat', 'import_history',
] as $table) {
    $check(str_contains($migration, "DELETE FROM public.{$table}"), "reset clears operational table {$table}");
}

foreach ([
    'bible_testaments', 'bible_books', 'bible_chapters', 'bible_verses',
    'bible_verse_words', 'bible_sources', 'bible_commentaries',
    'bible_word_commentaries', 'bible_dictionary_entries', 'word_dictionary_mappings',
    'groups', 'roles', 'permissions', 'categories', 'notification_templates',
    'audit_logs', 'backup_records', 'bible_content_versions',
] as $protected) {
    $check(!preg_match('/DELETE\\s+FROM\\s+public\\.' . preg_quote($protected, '/') . '\\b/i', $migration), "reset preserves {$protected}");
}

$sqlWithoutComments = preg_replace('/--[^\\r\\n]*|\\/\\*.*?\\*\\//s', '', $migration) ?? $migration;
$check(!preg_match('/\\bTRUNCATE\\s+TABLE\\b/i', $sqlWithoutComments), 'reset uses explicit row deletes rather than truncating tables');
$check(str_contains($migration, 'ON DELETE CASCADE') && str_contains($migration, 'system_reset_run_assets'), 'cascade is limited to child bookkeeping for an explicitly deleted run');
$check(str_contains($migration, "role_id = 'admin'"), 'only admin profiles are retained');
$check(str_contains($migration, 'auth.users'), 'reset inventories Auth users for server-side removal');
$check(str_contains($migration, "resource_type <> 'BACKUP_ARCHIVE'"), 'backup assets are excluded from media cleanup');
$check(str_contains($migration, 'SECURITY DEFINER'), 'reset RPCs are security-definer functions');
$check(str_contains($migration, 'REVOKE ALL'), 'reset RPC/table access is explicitly revoked');
$check(str_contains($migration, 'GRANT EXECUTE'), 'reset RPC execution is explicitly granted');
$check(!preg_match('/GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+public\\.system_reset_(?:assert_admin|preview|begin|mark_asset_results|mark_user_result|mark_local_media_deleted|finalize_data|mark_partial|complete_if_no_users)\\b[^;]*\\bTO\\s+(?:PUBLIC|anon|authenticated)\\b/i', $migration), 'reset RPCs are not callable by public client roles');

$check(str_contains($router, "'/system-reset/preview'") && str_contains($router, "'/system-reset/execute'"), 'reset endpoints are registered in the live router');
$check(str_contains($controller, "role_id") && str_contains($controller, "'admin'"), 'backend enforces the admin role from the database');
$check(str_contains($controller, 'auth_time'), 'backend requires recent Supabase authentication');
$check(str_contains($controller, 'backup_records'), 'backend validates a completed backup before execution');
$check(str_contains($controller, 'system_reset_mark_asset_results'), 'asset deletion outcomes are persisted for retries');
$check(str_contains($controller, 'system_reset_mark_user_result'), 'Auth deletion outcomes are persisted for retries');

$completionFunction = '';
if (preg_match('/CREATE OR REPLACE FUNCTION public\\.system_reset_complete_if_no_users\\b(.*?)CREATE OR REPLACE FUNCTION public\\.system_reset_mark_partial/s', $migration, $completionMatch)) {
    $completionFunction = $completionMatch[1];
}
$check($completionFunction !== '' && !str_contains($completionFunction, "status <> 'COMPLETE'\n    )"), 'completion RPC can read an already-completed run idempotently');
$check(str_contains($migration, "'SYSTEM_RESET_COMPLETE'"), 'successful Auth cleanup writes a completion audit event');

$beginFunction = '';
if (preg_match('/CREATE OR REPLACE FUNCTION public\\.system_reset_begin\\b(.*?)CREATE OR REPLACE FUNCTION public\\.system_reset_mark_asset_results/s', $migration, $beginMatch)) {
    $beginFunction = $beginMatch[1];
}
$existingRunLookup = strpos($beginFunction, 'v_active_actor_id = p_actor_id AND v_active_backup_id = p_backup_id');
$existingRunReturn = strpos($beginFunction, 'RETURN v_active_run_id');
$beginLock = strpos($beginFunction, 'FOR UPDATE');
$openRunGuard = strpos($beginFunction, 'SYSTEM_RESET_OPEN_RUN_EXISTS');
$check($beginLock !== false && $existingRunLookup !== false && $existingRunReturn !== false && $openRunGuard !== false
    && $beginLock < $existingRunLookup && $existingRunLookup < $existingRunReturn && $existingRunReturn < $openRunGuard,
    'begin RPC locks the gate, resumes the same actor backup run, then rejects other open runs');
$check(str_contains($controller, "'active_run'"), 'preview exposes a resumable run after a lost response');

$confirmationGuard = strpos($controller, "confirmation'] ?? null) !== self::CONFIRMATION");
$beginCall = strpos($controller, "'system_reset_begin'");
$backupGuard = strpos($controller, '$this->verifyFreshBackup($db, $backupId, $actorId)');
$check($confirmationGuard !== false && $beginCall !== false && $confirmationGuard < $beginCall, 'wrong confirmation is refused before a reset run can begin');
$check($backupGuard !== false && $beginCall !== false && $backupGuard < $beginCall, 'backup file verification precedes the destructive run start');

$mp3Delete = strpos($migration, 'DELETE FROM public.mp3_tracks');
$lecturerDelete = strpos($migration, 'DELETE FROM public.lecturers');
$check($mp3Delete !== false && $lecturerDelete !== false && $mp3Delete < $lecturerDelete, 'MP3 rows are deleted before their referenced lecturer rows');
$check(!str_contains($migration, 'DELETE FROM public.profiles'), 'profile rows are retained for admin accounts and removed through Auth deletion cascades');

$writeGuardStart = strpos($migration, '-- The PHP gate cannot stop clients that write to Supabase directly.');
$writeGuardSection = $writeGuardStart === false ? '' : substr($migration, $writeGuardStart);
$writeGuardBlock = '';
$guardArrayStart = strpos($writeGuardSection, 'FOREACH v_table IN ARRAY ARRAY[');
$guardArrayEnd = $guardArrayStart === false ? false : strpos($writeGuardSection, "]\n    LOOP", $guardArrayStart);
if ($guardArrayStart !== false && $guardArrayEnd !== false) {
    $writeGuardBlock = substr($writeGuardSection, $guardArrayStart, $guardArrayEnd - $guardArrayStart);
}
$guardedTables = [];
preg_match_all("/'([a-z0-9_]+)'/", $writeGuardBlock, $guardedMatches);
$guardedTables = $guardedMatches[1] ?? [];
$expectedGuardedTables = [
    'attendance_records', 'attendance_sessions', 'exam_grades', 'exams',
    'marathon_trainee_answers', 'marathon_trainee_submissions', 'marathon_question_revisions',
    'marathon_answers', 'marathon_questions', 'marathon_sections', 'marathons',
    'post_images', 'post_comments', 'reactions', 'feed_posts',
    'curriculum_revisions', 'curriculum_entries', 'curriculum_days', 'curriculums',
    'lectures', 'terms', 'mp3_tracks', 'lecturers', 'gallery_items', 'gallery_albums',
    'books', 'researches', 'user_favorites', 'notifications', 'push_subscriptions',
    'daily_verse_dispatch_state', 'daily_verses', 'servant_permissions', 'group_secretariat',
    'import_history', 'media_assets',
];
$check(array_diff($expectedGuardedTables, $guardedTables) === [], 'every operational and media table is protected by the reset write lock');
$check(str_contains($migration, 'system_reset_writes_allowed')
    && str_contains($migration, 'AS RESTRICTIVE FOR INSERT')
    && str_contains($migration, 'AS RESTRICTIVE FOR UPDATE')
    && str_contains($migration, 'AS RESTRICTIVE FOR DELETE'), 'database-level restrictive RLS policies block writes during an open reset');

$failed = 0;
foreach ($checks as [$passed, $message]) {
    printf("%s %s\n", $passed ? 'PASS' : 'FAIL', $message);
    $failed += $passed ? 0 : 1;
}
printf("\n%d/%d checks passed\n", count($checks) - $failed, count($checks));
exit($failed === 0 ? 0 : 1);
