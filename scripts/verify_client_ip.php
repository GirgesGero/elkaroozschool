<?php
/**
 * Verifies that ClientIp::resolve() cannot be fooled by a caller-supplied header.
 *
 * The failure this prevents is not theoretical. Reading X-Forwarded-For directly means
 * anyone can put an arbitrary string in the audit trail's ip_address column, and can
 * pick a fresh rate-limit bucket on every request by varying it. Both are silent: the
 * requests still succeed, they are simply attributed to someone else.
 *
 * Run:  php scripts/verify_client_ip.php
 */

$root = dirname(__DIR__);
require_once $root . '/backend-api/src/Utils/ClientIp.php';

use App\Utils\ClientIp;

$REAL_CLIENT = '203.0.113.77';   // the address the web server actually saw
$LOOPBACK    = '127.0.0.1';      // the proxy this deployment is known to run

$cases = [
    [
        'name'    => 'no forwarded header at all',
        'server'  => ['REMOTE_ADDR' => $REAL_CLIENT],
        'expect'  => $REAL_CLIENT,
        'why'     => 'the ordinary case',
    ],
    [
        'name'    => 'spoofed header from a real remote client',
        'server'  => ['REMOTE_ADDR' => $REAL_CLIENT, 'HTTP_X_FORWARDED_FOR' => '8.8.8.8'],
        'expect'  => $REAL_CLIENT,
        'why'     => 'the client is not a trusted proxy, so the header is ignored outright',
    ],
    [
        'name'    => 'spoofed header with a non-IP payload',
        'server'  => ['REMOTE_ADDR' => $REAL_CLIENT, 'HTTP_X_FORWARDED_FOR' => 'DROP TABLE audit_logs'],
        'expect'  => $REAL_CLIENT,
        'why'     => 'arbitrary text must never reach ip_address',
    ],
    [
        'name'    => 'spoofed chain from a real remote client',
        'server'  => ['REMOTE_ADDR' => $REAL_CLIENT, 'HTTP_X_FORWARDED_FOR' => '8.8.8.8, 9.9.9.9, 10.10.10.10'],
        'expect'  => $REAL_CLIENT,
        'why'     => 'a long chain is still just a string the client wrote',
    ],
    [
        'name'    => 'genuine proxy: takes the rightmost appended entry',
        'server'  => ['REMOTE_ADDR' => $LOOPBACK, 'HTTP_X_FORWARDED_FOR' => '198.51.100.4, ' . $REAL_CLIENT],
        'expect'  => $REAL_CLIENT,
        'why'     => 'behind a trusted proxy the last hop is the one the client cannot forge',
    ],
    [
        'name'    => 'trusted proxy with a garbage entry falls back to REMOTE_ADDR',
        'server'  => ['REMOTE_ADDR' => $LOOPBACK, 'HTTP_X_FORWARDED_FOR' => 'not-an-ip'],
        'expect'  => $LOOPBACK,
        'why'     => 'an unparseable hop must not become the recorded address',
    ],
    [
        'name'    => 'unusable REMOTE_ADDR does not fall through to the header',
        'server'  => ['HTTP_X_FORWARDED_FOR' => '8.8.8.8'],
        'expect'  => '127.0.0.1',
        'why'     => 'no real address means no header fallback -- that would be the hole',
    ],
];

$pass = 0; $fail = 0;
echo "=== ClientIp::resolve() spoof resistance ===\n";

foreach ($cases as $case) {
    $_SERVER = $case['server'] + ['REMOTE_ADDR' => ''];
    // ensure the test's own env vars don't leak in
    foreach (['HTTP_X_FORWARDED_FOR'] as $k) {
        if (!array_key_exists($k, $case['server'])) unset($_SERVER[$k]);
    }

    $got = ClientIp::resolve();
    $ok  = $got === $case['expect'];

    // Independently: whatever we return must be a real IP, never free text.
    $isIp = filter_var($got, FILTER_VALIDATE_IP) !== false;
    $ok   = $ok && $isIp;

    printf("  [%s] %s\n", $ok ? 'PASS' : 'FAIL', $case['name']);
    printf("         expected=%-14s got=%-14s valid_ip=%s\n", $case['expect'], $got, $isIp ? 'yes' : 'NO');
    printf("         %s\n", $case['why']);
    $ok ? $pass++ : $fail++;
}

printf("\n%d passed, %d failed\n", $pass, $fail);
exit($fail === 0 ? 0 : 1);