<?php
namespace App\Utils;

/**
 * Resolves the caller's address from request headers.
 *
 * This exists because two subsystems need the same answer -- the rate limiter, which
 * buckets by address, and the audit log, which records who did what -- and because
 * getting it wrong once is enough to disable one or both.
 *
 * X-Forwarded-For is entirely attacker-controlled. Anyone can send
 * "X-Forwarded-For: 8.8.8.8" and be counted in someone else's bucket, which spreads
 * an attack across unlimited identities, or -- if the value is logged blindly -- forge
 * the address recorded against an action in the audit trail.
 *
 * The header is therefore trusted only when REMOTE_ADDR is a proxy this deployment
 * actually runs, and even then only the single address that proxy appended: in
 * "client, proxy1, proxy2" the leftmost entries are client-supplied and the rightmost
 * is the only one the client could not have written.
 */
class ClientIp {
    /**
     * Proxies whose X-Forwarded-For is believed.
     *
     * Loopback only, deliberately. Shared hosting runs PHP with no reverse proxy in
     * front of it, so REMOTE_ADDR is already the real client; widening this list to
     * anything routable would hand every caller the ability to forge their own address.
     * A deployment that does front the app with a proxy adds that proxy's address here
     * explicitly rather than trusting the header by default.
     */
    private const TRUSTED_PROXIES = ['127.0.0.1', '::1'];

    /**
     * The caller's IP address, or '127.0.0.1' when the runtime does not expose one.
     *
     * Always returns something filter_var() accepts as an IP, so callers can store or
     * hash it without further checks.
     */
    public static function resolve(): string {
        $remote = $_SERVER['REMOTE_ADDR'] ?? '';
        if ($remote === '' || !filter_var($remote, FILTER_VALIDATE_IP)) {
            // An unusable REMOTE_ADDR (a unix socket, a missing var under CLI) must not
            // fall through to the spoofable header, or the fallback becomes the hole.
            return '127.0.0.1';
        }

        $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if ($xff === '' || !in_array($remote, self::TRUSTED_PROXIES, true)) {
            return $remote;
        }

        $parts = array_filter(array_map('trim', explode(',', $xff)), fn($v) => $v !== '');
        if ($parts === []) {
            return $remote;
        }

        $candidate = (string) end($parts);
        return filter_var($candidate, FILTER_VALIDATE_IP) ? $candidate : $remote;
    }
}