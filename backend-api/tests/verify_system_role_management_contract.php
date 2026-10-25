<?php
/**
 * Static safety contract for system-admin transfer and general-secretariat RBAC.
 * This complements, but does not replace, disposable PostgreSQL behavior tests.
 */
$root = dirname(__DIR__, 2);
$migrationPath = $root . '/supabase/migrations/20261023180000_system_admin_and_general_secretariat.sql';
$rbacPath = $root . '/backend-api/src/Middleware/RbacMiddleware.php';
$authPath = $root . '/backend-api/src/Controllers/AuthController.php';
$uiPath = $root . '/frontend/src/components/SystemRoleManagementPanel.tsx';
$settingsPath = $root . '/frontend/src/app/settings/page.tsx';

$pass = 0;
$fail = 0;
function checkContract(string $name, bool $ok): void {
    global $pass, $fail;
    if ($ok) { $pass++; echo "[PASS] $name\n"; }
    else { $fail++; echo "[FAIL] $name\n"; }
}

$migration = is_file($migrationPath) ? file_get_contents($migrationPath) : '';
$rbac = is_file($rbacPath) ? file_get_contents($rbacPath) : '';
$auth = is_file($authPath) ? file_get_contents($authPath) : '';
$ui = is_file($uiPath) ? file_get_contents($uiPath) : '';
$settings = is_file($settingsPath) ? file_get_contents($settingsPath) : '';

checkContract('migration exists and is transactional', str_contains($migration, 'BEGIN;') && str_contains($migration, 'COMMIT;'));
checkContract('legacy super_user role is migrated to supervisor', str_contains($migration, "'super_user'") && str_contains($migration, "'supervisor'"));
checkContract('one active system admin is constrained', str_contains($migration, 'uq_single_admin') && str_contains($migration, "role_id = 'admin'"));
$adminIndexDrop = strpos($migration, 'DROP INDEX IF EXISTS public.uq_single_admin;');
$adminIndexCreate = strpos($migration, 'CREATE UNIQUE INDEX uq_single_admin');
checkContract('active-admin index replaces the legacy same-name definition',
    $adminIndexDrop !== false && $adminIndexCreate !== false && $adminIndexDrop < $adminIndexCreate
    && str_contains($migration, "WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL;"));
checkContract('transfer RPC locks and authenticates current admin', str_contains($migration, 'transfer_system_admin') && str_contains($migration, 'FOR UPDATE') && str_contains($migration, 'auth.uid()'));
checkContract('transfer RPC requires fresh authentication', str_contains($migration, 'auth_time'));
checkContract('transfer operation writes audit log', str_contains($migration, 'SYSTEM_ADMIN_TRANSFER') && str_contains($migration, 'audit_logs'));
checkContract('general-secretariat membership and permission tables exist', str_contains($migration, 'general_secretariat_members') && str_contains($migration, 'general_secretariat_permissions'));
checkContract('permission grant is restricted to operational allowlist', str_contains($migration, 'MANAGE_LECTURES') && str_contains($migration, 'MANAGE_CURRICULUM') && str_contains($migration, 'MANAGE_MARATHON') && str_contains($migration, 'GRADE_EXAMS') && str_contains($migration, 'MANAGE_BOOKS'));
checkContract('general-secretariat grant is audited and admin-only', str_contains($migration, 'GENERAL_SECRETARIAT_UPDATE') && str_contains($migration, 'system_admin_assert_current'));
checkContract('legacy global RBAC bypass no longer includes supervisor', str_contains($rbac, "if (\$role === 'admin')") && !str_contains($rbac, "if (\$role === 'admin' || \$role === 'super_user')"));
checkContract('database compatibility helper resolves only the current admin profile', str_contains($migration, "CREATE OR REPLACE FUNCTION public.is_admin_or_super_user()") && str_contains($migration, "AS \$\$ SELECT public.is_system_admin(); \$\$;"));
checkContract('system-admin transfer is not exposed to service-role or anonymous callers', str_contains($migration, 'REVOKE ALL ON FUNCTION public.transfer_system_admin(uuid, text) FROM PUBLIC, anon, service_role') && str_contains($migration, 'GRANT EXECUTE ON FUNCTION public.transfer_system_admin(uuid, text) TO authenticated'));
checkContract('supervisor retains same-group attendance-record reads', str_contains($migration, 'Supervisor read attendance records in own group') && str_contains($migration, "USING (group_id = public.get_current_user_group() AND public.get_current_user_role() = 'supervisor');"));
checkContract('legacy curriculum catalog write requires MANAGE_CURRICULUM specifically', str_contains($migration, "CREATE POLICY \"Manage curriculums with permission\" ON public.curriculums\nFOR ALL TO authenticated\nUSING (public.can_manage_group_permission('MANAGE_CURRICULUM', group_id))\nWITH CHECK (public.can_manage_group_permission('MANAGE_CURRICULUM', group_id));"));
checkContract('general-secretariat permissions are enforced in curriculum and exam RLS', str_contains($migration, 'Read curriculum days in authorized scope') && str_contains($migration, 'Manage curriculum days in authorized scope') && str_contains($migration, 'can_manage_group_permission(\'GRADE_EXAMS\', group_id)'));
checkContract('restore preserves the active admin and demotes archived legacy admins', str_contains($migration, 'restore requires exactly one current system administrator') && str_contains($migration, "jsonb_set(row_data, '{role_id}', '\"supervisor\"'::jsonb, true)"));
checkContract('admin recovery is restricted to trusted database operators and audited', str_contains($migration, 'system_admin_break_glass_recovery') && str_contains($migration, "session_user <> 'postgres'") && str_contains($migration, 'SYSTEM_ADMIN_BREAK_GLASS_RECOVERY'));
checkContract('appointment writes are included in reset freeze barrier', str_contains($migration, "ARRAY['general_secretariat_members','general_secretariat_permissions']") && str_contains($migration, 'system_reset_write_barrier'));
checkContract('PHP session response reads effective operational permissions', str_contains($auth, 'general_secretariat_permissions') && str_contains($auth, 'supervisor'));
checkContract('settings wires the role panel for the current admin only', str_contains($settings, 'SystemRoleManagementPanel') && str_contains($settings, 'isSystemAdmin && profile'));
checkContract('role panel exposes transfer and general-secretariat operations', str_contains($ui, 'transfer_system_admin') && str_contains($ui, 'admin_set_general_secretariat') && str_contains($ui, 'السكرتارية العامة') && str_contains($ui, 'permissions'));

printf("System role contract: %d passed, %d failed\n", $pass, $fail);
exit($fail === 0 ? 0 : 1);
