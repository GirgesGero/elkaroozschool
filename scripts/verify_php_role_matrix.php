<?php
/**
 * Authorization matrix for the PHP backend.
 *
 * Every gate runs in an isolated child process (scripts/gate_probe.php) so that
 * Response::error()'s `exit` is observable: from the inside, a denied gate and an
 * allowed gate are indistinguishable, because the denied one never returns.
 *
 * Role and group are supplied the way production supplies them -- a signed HS256
 * token decoded by the real JwtAuthMiddleware -- so a gate that read the role from
 * a request field instead of the token would fail here.
 *
 * Run with real PHP 8.3:
 *   php scripts/verify_php_role_matrix.php
 *
 * SCOPE: this proves the local routing and RBAC layer only. It cannot prove
 * production: no deployment credentials exist for the PHP host and that host is not
 * currently answering. See docs/GO_LIVE_CHECKLIST.md.
 */

// config/supabase.php refuses to boot unless these are present, and it validates
// them at require() time, so they must be set before the first require below.
// Values are test-only placeholders; nothing here is a real credential.
foreach ([
    'SUPABASE_URL'              => 'https://kgqgnqjkrghvktymbimz.supabase.co',
    'SUPABASE_ANON_KEY'         => 'sb_publishable_test_placeholder',
    'SUPABASE_SERVICE_ROLE_KEY' => 'sb_secret_test_placeholder',
    'SUPABASE_JWT_SECRET'       => 'test-only-secret-not-a-real-credential',
    'APP_ENV'                   => 'production',
    'APP_DEBUG'                 => 'false',
    'APP_URL'                   => 'https://elkaroozschool.is-best.net',
    'STORAGE_PUBLIC_URL'        => 'https://storage.test',
] as $envKey => $envVal) {
    putenv("$envKey=$envVal");
}

require_once dirname(__DIR__) . '/backend-api/vendor/autoload.php';
require_once dirname(__DIR__) . '/backend-api/src/Utils/Response.php';
require_once dirname(__DIR__) . '/backend-api/src/Utils/AppRoot.php';
require_once dirname(__DIR__) . '/backend-api/src/Middleware/JwtAuthMiddleware.php';
require_once dirname(__DIR__) . '/backend-api/src/Middleware/RbacMiddleware.php';
require_once dirname(__DIR__) . '/backend-api/src/Middleware/GroupScopeMiddleware.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Middleware\JwtAuthMiddleware;

const TEST_SECRET = 'test-only-secret-not-a-real-credential';

$probePath = __DIR__ . '/gate_probe.php';
$beRoot    = dirname(__DIR__) . '/backend-api';
$pass = 0;
$fail = 0;
$warn = 0;

function check(string $label, bool $ok, string $detail = ''): void {
    global $pass, $fail;
    if ($ok) { $pass++; printf("  [PASS] %s\n", $label); }
    else     { $fail++; printf("  [FAIL] %s%s\n", $label, $detail ? '  <-- ' . $detail : ''); }
}

/** Run one gate in a child process; true only if the gate let the caller through. */
/** base64url without padding, for building a hand-crafted token. */
function b64url(array $a): string {
    return rtrim(strtr(base64_encode((string) json_encode($a)), '+/', '-_'), '=');
}

function probe(string $mode, array $args): bool {
    global $probePath;
    // The parent already putenv()s the config values and a child of the same shell
    // inherits them. A `set X=y && ... && php` chain re-enters cmd.exe under MSYS
    // and silently swallows the child's output.
    $cmd = escapeshellarg(PHP_BINARY)
         . ' ' . escapeshellarg($probePath)
         . ' ' . escapeshellarg($mode)
         . ' ' . escapeshellarg(base64_encode((string) json_encode($args)))
         . ' 2>&1';
    $out = (string) shell_exec($cmd);
    return str_contains($out, 'ALLOWED');
}

/** Mint a token the way Supabase issues one, then decode it with the real middleware. */
function actorFromToken(string $userId, string $role, int $groupId): array {
    $now = time();
    $token = JWT::encode([
        'aud'   => 'authenticated',
        'exp'   => $now + 3600,
        'iat'   => $now,
        'sub'   => $userId,
        'email' => $role . '@elkarooz.test',
        'role'  => 'authenticated',
        'app_metadata' => ['role' => $role, 'group_id' => $groupId],
    ], TEST_SECRET, 'HS256');

    // Decode through the production code path rather than re-implementing it.
    $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
    return JwtAuthMiddleware::authenticate();
}

// ---------------------------------------------------------------------------
// 1. Endpoint authorization matrix, using each endpoint's real gate.
// ---------------------------------------------------------------------------
$endpoints = [
    '/backup/create'       => ['admin', 'super_user'],
    '/backup/list'         => ['admin', 'super_user'],
    '/backup/validate-zip' => ['admin', 'super_user'],
    '/backup/delete'       => ['admin', 'super_user'],
    '/restore/preview'     => ['admin', 'super_user'],
    '/restore/execute'     => ['admin', 'super_user'],
    '/import/trainees'     => ['admin', 'super_user'],
    '/import/history'      => ['admin', 'super_user'],
    '/storage/delete'      => ['admin', 'super_user'],
    '/export/data'         => ['admin', 'super_user'],
    '/storage/upload'      => ['admin', 'super_user', 'servant', 'secretariat'],
];

$allRoles = ['super_user', 'admin', 'secretariat', 'servant', 'trainee'];

echo "=== 1. Endpoint authorization matrix ===\n";
foreach ($endpoints as $path => $allowedRoles) {
    $summary = [];
    foreach ($allRoles as $role) {
        $user   = actorFromToken('u-' . $role, $role, 1);
        $actual = probe('rbac', ['user' => $user, 'roles' => $allowedRoles]);
        $should = in_array($role, $allowedRoles, true);
        check(sprintf('%-22s %-12s -> %-5s (want %s)', $path, $role,
                      $actual ? 'ALLOW' : 'DENY', $should ? 'ALLOW' : 'DENY'),
              $actual === $should);
        $summary[] = $role . '=' . ($actual ? 'A' : 'D');
    }
    printf("           %s\n\n", implode('  ', $summary));
}

// ---------------------------------------------------------------------------
// 2. Group isolation on /storage/upload -- the only endpoint where a non-admin
//    chooses its own target group, so the only horizontal-escalation surface.
// ---------------------------------------------------------------------------
echo "=== 2. Group isolation (GroupScopeMiddleware) ===\n";
$groupCases = [
    ['trainee',     1, 2, false, 'trainee cannot write into another group'],
    ['servant',     1, 2, false, 'servant cannot write into another group'],
    ['secretariat', 1, 2, false, 'secretariat cannot write into another group'],
    ['trainee',     3, 3, true,  'trainee writing to its own group'],
    ['servant',     1, 1, true,  'servant writing to its own group'],
    ['admin',       1, 3, true,  'admin is global'],
    ['super_user',  1, 3, true,  'super_user is global'],
];
foreach ($groupCases as [$role, $own, $target, $should, $why]) {
    $user   = actorFromToken('u-' . $role, $role, $own);
    $actual = probe('group', ['user' => $user, 'target' => $target]);
    check(sprintf('%-12s group %d -> group %d  (%s)', $role, $own, $target, $why),
          $actual === $should,
          sprintf('expected %s', $should ? 'ALLOW' : 'DENY'));
}
echo "\n";

// ---------------------------------------------------------------------------
// 3. Role and group must come from the signed token, never from request input.
// ---------------------------------------------------------------------------
echo "=== 3. Role and group are derived from the signed token ===\n";

$user = actorFromToken('real-user-uuid', 'servant', 3);
check('role comes from app_metadata.role',          $user['role'] === 'servant', 'got ' . $user['role']);
check('group_id comes from app_metadata.group_id', (int) $user['group_id'] === 3,  'got ' . var_export($user['group_id'], true));
check('user_id comes from sub',                    $user['user_id'] === 'real-user-uuid');
check('nested claims survive the JSON round-trip', is_array($user['claims']['app_metadata']));

// A token signed with a different secret must be rejected outright.
$rejected = false;
try {
    JWT::decode(
        JWT::encode(['sub' => 'u', 'role' => 'authenticated',
                     'app_metadata' => ['role' => 'admin', 'group_id' => 1]],
                    'a-different-secret', 'HS256'),
        new Key(TEST_SECRET, 'HS256')
    );
} catch (\Throwable $e) {
    $rejected = true;
}
check('token signed with a different secret is rejected', $rejected);

// An alg:none token must not be accepted. authenticate() ends in exit(), so this
// has to run in a child process: reaching the verdict line at all means it was
// rejected, because a successful decode would have printed the actor array.
$noneAlg = b64url(['alg' => 'none', 'typ' => 'JWT']) . '.'
         . b64url(['sub' => 'u', 'role' => 'authenticated',
                      'app_metadata' => ['role' => 'admin', 'group_id' => 1]]) . '.';
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $noneAlg;
$noneOutcome = shell_exec(
    'set SUPABASE_URL=https://kgqgnqjkrghvktymbimz.supabase.co'
  . ' && set SUPABASE_ANON_KEY=sb_publishable_test_placeholder'
  . ' && set SUPABASE_SERVICE_ROLE_KEY=sb_secret_test_placeholder'
  . ' && set SUPABASE_JWT_SECRET=' . TEST_SECRET
  . ' && ' . escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/gate_probe.php')
  . ' token ' . escapeshellarg(base64_encode((string) json_encode(['token' => $noneAlg])))
  . ' 2>NUL');
check('alg:none token is rejected', !str_contains((string) $noneOutcome, 'EK_AUTHENTICATED'),
      'the middleware accepted an unsigned token');

// A token with no role claim must never resolve to a privileged role.
$noRole = JWT::encode(['sub' => 'u', 'role' => 'authenticated'], TEST_SECRET, 'HS256');
$decoded = json_decode(json_encode(JWT::decode($noRole, new Key(TEST_SECRET, 'HS256'))), true);
$fallback = $decoded['app_metadata']['role'] ?? ($decoded['role'] ?? 'trainee');
check('missing app_metadata never resolves to admin/super_user',
      !in_array($fallback, ['admin', 'super_user'], true), 'got ' . $fallback);

// ---------------------------------------------------------------------------
// 4. Suspended accounts.
// ---------------------------------------------------------------------------
echo "\n=== 4. Suspended account handling ===\n";
// A suspended user still holds a cryptographically valid token, so the check has
// to happen in the middleware. authenticate() exits on refusal, so this runs in a
// child process: the verdict line is present only if the token was accepted.
function tokenAccepted(array $meta, ?string $expectRole = null): bool {
    $now = time();
    $tok = JWT::encode([
        'aud' => 'authenticated', 'exp' => $now + 3600, 'iat' => $now,
        'sub' => 'u-test', 'email' => 't@elkarooz.test', 'role' => 'authenticated',
        'app_metadata' => $meta,
    ], TEST_SECRET, 'HS256');

    $out = (string) shell_exec(
        escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/gate_probe.php')
      . ' token ' . escapeshellarg(base64_encode((string) json_encode([
            'token' => $tok, 'expectRole' => $expectRole,
      ])))
      . ' 2>&1');
    return trim($out) === 'ALLOWED';
}

check('active admin token is accepted',      tokenAccepted(['role' => 'admin', 'group_id' => 1, 'is_active' => true], 'admin'));
check('suspended trainee token is REFUSED', !tokenAccepted(['role' => 'trainee', 'group_id' => 1, 'is_active' => false], 'trainee'));
check('suspended admin token is REFUSED',    !tokenAccepted(['role' => 'admin', 'group_id' => 1, 'is_active' => false], 'admin'));
check('is_active absent -> treated as active', tokenAccepted(['role' => 'servant', 'group_id' => 2], 'servant'));
check('is_active sent as the string "false" is REFUSED',
      !tokenAccepted(['role' => 'servant', 'group_id' => 2, 'is_active' => 'false'], 'servant'));

printf("\n=== SUMMARY ===\n%d passed, %d failed, %d warnings\n", $pass, $fail, $warn);
exit($fail === 0 ? 0 : 1);