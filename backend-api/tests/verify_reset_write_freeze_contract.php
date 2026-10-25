<?php

declare(strict_types=1);

$root = dirname(__DIR__, 2);
$migrationFiles = glob($root . '/supabase/migrations/*_safe_system_reset.sql') ?: [];
$checks = [];
$check = static function (bool $condition, string $message) use (&$checks): void {
    $checks[] = [$condition, $message];
};

$check(count($migrationFiles) === 1, 'one safe-reset migration is present');
$migration = count($migrationFiles) === 1 ? (file_get_contents($migrationFiles[0]) ?: '') : '';
$read = static function (string $relative) use ($root): string {
    return file_get_contents($root . '/' . $relative) ?: '';
};
$function = static function (string $name) use (&$migration): string {
    $quoted = preg_quote($name, '/');
    return preg_match('/CREATE OR REPLACE FUNCTION public\\.' . $quoted . '\\b(.*?)\\$\\$;/s', $migration, $matches)
        ? $matches[1]
        : '';
};

$gate = $function('system_reset_acquire_write_lock');
$policy = $function('system_reset_writes_allowed');
$trigger = $function('system_reset_write_barrier');
$begin = $function('system_reset_begin');
$finalize = $function('system_reset_finalize_data');
$markUser = $function('system_reset_mark_user_result');
$completeEmpty = $function('system_reset_complete_if_no_users');
$restoreWrapper = $function('system_reset_guarded_restore_database');
$authBarrier = $function('system_reset_auth_user_write_barrier');
$authDeletePermit = $function('system_reset_authorize_auth_delete');

$check(str_contains($migration, 'CREATE TABLE IF NOT EXISTS public.system_reset_auth_delete_permits')
    && str_contains($migration, "ON auth.users")
    && str_contains($migration, 'ENABLE ALWAYS TRIGGER system_reset_auth_user_write_barrier')
    && str_contains($migration, 'ENABLE ALWAYS TRIGGER system_reset_auth_truncate_barrier')
    && str_contains($migration, 'ENABLE ALWAYS TRIGGER system_reset_auth_delete_cleanup'),
    'Auth API writes are covered by an ALWAYS trigger on auth.users');
$check(str_contains($authBarrier, 'system_reset_auth_delete_permits')
    && str_contains($authBarrier, 'OLD.id')
    && str_contains($authBarrier, "TG_OP = 'DELETE'"),
    'active reset permits only the exact staged Auth-user deletion');
$check(str_contains($authDeletePermit, 'system_reset_run_users')
    && str_contains($authDeletePermit, 'active_run_id')
    && str_contains($authDeletePermit, 'expires_at'),
    'short-lived Auth deletion permits require an active staged user');
$check(str_contains($migration, 'REVOKE ALL ON public.system_reset_auth_delete_permits FROM PUBLIC, anon, authenticated, service_role'),
    'service_role cannot directly forge Auth deletion permits');
$check(str_contains($migration, 'CREATE TABLE IF NOT EXISTS public.system_reset_write_permits'), 'reset-only permit ledger exists');
$check(str_contains($gate, 'FOR SHARE') && str_contains($gate, 'active_run_id'), 'writers acquire a shared gate-row lock and inspect reset state');
$check(str_contains($gate, 'system_reset_write_permits') && str_contains($gate, 'txid_current()')
    && str_contains($gate, "scope = 'AUTH_CASCADE' AND pg_trigger_depth() > 1"),
    'only finalization or nested Auth-cascade transactions receive a transaction-scoped permit');
$check(str_contains($trigger, 'system_reset_acquire_write_lock'), 'statement trigger invokes the database write barrier');
$check(str_contains($migration, 'BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE'), 'barrier covers DML and TRUNCATE');
$check(str_contains($migration, 'ENABLE ALWAYS TRIGGER'), 'barrier still fires when restore sets session_replication_role=replica');

$expectedGuardedTables = [
    'profiles', 'backup_records', 'bible_content_versions', 'notification_templates',
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
$guardStart = strpos($migration, 'FOREACH v_table IN ARRAY ARRAY[');
$guardEnd = $guardStart === false ? false : strpos($migration, "]\n    LOOP", $guardStart);
$guardBlock = $guardStart !== false && $guardEnd !== false ? substr($migration, $guardStart, $guardEnd - $guardStart) : '';
preg_match_all("/'([a-z0-9_]+)'/", $guardBlock, $guardMatches);
$guardedTables = $guardMatches[1] ?? [];
$check($guardedTables === $expectedGuardedTables, 'independent expected table list exactly matches statement-trigger coverage');

$beginLock = strpos($begin, 'FOR UPDATE');
$beginInsert = strpos($begin, 'INSERT INTO public.system_reset_runs');
$beginGateSet = strpos($begin, 'UPDATE public.system_reset_gate');
$check($beginLock !== false && $beginInsert !== false && $beginLock < $beginInsert && $beginGateSet !== false && $beginInsert < $beginGateSet,
    'reset start drains existing writers before recording the active run');
$permitGrant = strpos($finalize, 'INSERT INTO public.system_reset_write_permits');
$firstTargetDelete = strpos($finalize, 'DELETE FROM public.post_images');
$permitRevoke = strpos($finalize, 'DELETE FROM public.system_reset_write_permits');
$check($permitGrant !== false && $firstTargetDelete !== false && $permitRevoke !== false
    && $permitGrant < $firstTargetDelete && $firstTargetDelete < $permitRevoke,
    'finalization uses a transaction-local permit that is removed before commit');
$check(str_contains($policy, 'active_run_id') && str_contains($policy, 'auth_cutoff_iat'), 'RLS helper denies open resets and stale authenticated JWTs');
$check(str_contains($gate, 'last_completed_at') && str_contains($gate, 'transaction_timestamp()'), 'transactions begun before reset completion remain fenced after completion');
$releaseGate = $function('system_reset_release_gate');
$check(str_contains($markUser, 'system_reset_release_gate') && str_contains($completeEmpty, 'system_reset_release_gate')
    && str_contains($releaseGate, 'active_run_id = NULL') && str_contains($releaseGate, 'auth_cutoff_iat'),
    'user-stage and zero-user completion release the gate through one idempotent cutoff helper');

$check($restoreWrapper !== '' && str_contains($restoreWrapper, 'system_reset_acquire_write_lock')
    && str_contains($restoreWrapper, 'restore_database'), 'restore is serialized before its SECURITY DEFINER body changes replication mode');
$check(str_contains($migration, 'REVOKE ALL ON FUNCTION public.restore_database(jsonb, boolean) FROM service_role')
    && str_contains($migration, 'REVOKE ALL ON FUNCTION public.restore_table(text, jsonb) FROM service_role')
    && str_contains($migration, 'REVOKE ALL ON FUNCTION public.restore_accounts(jsonb) FROM service_role'),
    'service_role cannot invoke raw restore RPCs outside the guarded wrapper');
$check(str_contains($read('backend-api/src/Services/DatabaseRestoreService.php'), "rpc('system_reset_guarded_restore_database'"),
    'PHP restore caller uses the guarded RPC');

$accessGate = $read('backend-api/src/Services/ResetAccessGate.php');
$router = $read('backend-api/public/index.php');
$controller = $read('backend-api/src/Controllers/SystemResetController.php');
$check(str_contains($accessGate, 'acquireMutationLease') && str_contains($accessGate, 'acquireExclusiveResetLease')
    && str_contains($accessGate, 'acquireResetExecutionLease'),
    'PHP request gate exposes mutation, reset-drain, and reset-execution leases');
$check(str_contains($router, 'acquireMutationLease') && str_contains($router, 'register_shutdown_function'),
    'router holds a shared lease for the full lifetime of non-reset mutation requests');
$check(str_contains($controller, 'acquireExclusiveResetLease') && str_contains($controller, 'system_reset_begin'),
    'reset start drains in-flight PHP mutations before database reset begins');
$check(str_contains($controller, 'acquireResetExecutionLease')
    && str_contains($controller, 'register_shutdown_function(static function () use ($executionGate, $executionLease)'),
    'one reset execute request remains serialized until its response exits');
$authDeleteBatch = '';
if (preg_match('/private function deleteAuthUsersBatch\\b(.*?)private function loadRun\\(/s', $controller, $authBatchMatch)) {
    $authDeleteBatch = $authBatchMatch[1];
}
$authPermitCall = strpos($authDeleteBatch, 'system_reset_authorize_auth_delete');
$authDeleteCall = strpos($authDeleteBatch, 'deleteUser($targetId)');
$check($authPermitCall !== false && $authDeleteCall !== false && $authPermitCall < $authDeleteCall,
    'PHP obtains a per-user database permit before calling the Supabase Auth Admin API');
$cutoffSetter = '';
if (preg_match('/private function setResetGate\\b(.*?)private function gate\\(/s', $controller, $cutoffMatch)) {
    $cutoffSetter = $cutoffMatch[1];
}
$check(str_contains($controller, "'auth_cutoff_iat' => is_numeric(\$statusResult['auth_cutoff_iat'] ?? null)")
    && str_contains($cutoffSetter, '$cutoffOverride ?? time() + 1'),
    'completion uses the database cutoff so tokens minted during reset stay invalidated');

$failed = 0;
foreach ($checks as [$passed, $message]) {
    printf("%s %s\n", $passed ? 'PASS' : 'FAIL', $message);
    $failed += $passed ? 0 : 1;
}
printf("\n%d/%d checks passed\n", count($checks) - $failed, count($checks));
exit($failed === 0 ? 0 : 1);
