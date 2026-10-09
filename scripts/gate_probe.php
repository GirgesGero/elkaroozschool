<?php
/**
 * Runs one authorization gate in an isolated process so that Response::error()'s
 * `exit` is observable to the parent. Without this, a denied gate looks identical
 * to an allowed one: the script dies before it can print anything.
 *
 * Usage: php scripts/gate_probe.php <rbac|group> <base64-json-args>
 * Prints exactly one line: ALLOWED or DENIED.
 */

$root = dirname(__DIR__) . '/backend-api';

ob_start();
register_shutdown_function(static function (): void {
    $body = (string) ob_get_clean();
    // The gate either fell through to a success marker, or Response::error()
    // wrote its JSON body and exited. Each mode has its own marker:
    // EK_ALLOWED for the RBAC/group gates, EK_AUTHENTICATED for a token that
    // decoded to the expected role. Checking only EK_ALLOWED here would report
    // DENIED for every successful token check.
    $passed = str_contains($body, 'EK_ALLOWED')
           || str_contains($body, 'EK_AUTHENTICATED');
    echo "\n" . ($passed ? 'ALLOWED' : 'DENIED');
});

require $root . '/vendor/autoload.php';
require $root . '/src/Utils/Response.php';
require $root . '/src/Utils/AppRoot.php';
require $root . '/src/Middleware/JwtAuthMiddleware.php';
require $root . '/src/Middleware/RbacMiddleware.php';
require $root . '/src/Middleware/GroupScopeMiddleware.php';

use App\Middleware\RbacMiddleware;
use App\Middleware\GroupScopeMiddleware;

$mode = $argv[1] ?? 'rbac';
$args = json_decode((string) base64_decode($argv[2] ?? ''), true);
if (!is_array($args)) {
    $args = [];
}

if ($mode === 'group') {
    GroupScopeMiddleware::enforceGroupScope($args['user'], (int) $args['target']);
    echo 'EK_ALLOWED';
} elseif ($mode === 'token') {
    // authenticate() ends in exit() on failure, so reaching the echo at all is
    // the proof that the token was accepted.
    $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . ($args['token'] ?? '');
    $actor = \App\Middleware\JwtAuthMiddleware::authenticate();
    if (($actor['role'] ?? null) === ($args['expectRole'] ?? null)) {
        echo 'EK_AUTHENTICATED';
    } else {
        echo 'EK_ROLE_MISMATCH:' . json_encode($actor);
    }
} elseif ($mode === 'rbac') {
    RbacMiddleware::requireRoles($args['user'], $args['roles']);
    echo 'EK_ALLOWED';
}
