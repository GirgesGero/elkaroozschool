<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/Services/SupabaseAuthAdminClient.php';

$client = new App\Services\SupabaseAuthAdminClient([
    'url' => 'https://unit.test.supabase.co',
    'service_role_key' => 'test-service-key',
    'anon_key' => 'test-anon-key',
], static fn(string $method, string $url, array $headers): array => [
    'status' => 204,
    'network_error' => false,
]);
$result = $client->deleteUser('d8b0f1d1-48ef-4f24-9fd2-2628f8c0b412');
$invalidRejected = false;
try {
    $client->deleteUser('../not-a-uuid');
} catch (InvalidArgumentException) {
    $invalidRejected = true;
}
$cases = [
    [$result['success'] === true && $result['deleted'] === true, 'Auth 204 confirms account deletion'],
    [$invalidRejected, 'user identifiers are validated before building the Auth URL'],
    [App\Services\SupabaseAuthAdminClient::interpretDeleteResponse(404, false)['success'] === true, 'Auth 404 is idempotent on resume'],
    [App\Services\SupabaseAuthAdminClient::interpretDeleteResponse(403, false)['success'] === false, 'Auth 403 is never reported as success'],
    [App\Services\SupabaseAuthAdminClient::interpretDeleteResponse(0, true)['retryable'] === true, 'network errors remain retryable'],
];
$failed = 0;
foreach ($cases as [$passed, $message]) {
    printf("%s %s\n", $passed ? 'PASS' : 'FAIL', $message);
    $failed += $passed ? 0 : 1;
}
printf("\n%d/%d checks passed\n", count($cases) - $failed, count($cases));
exit($failed === 0 ? 0 : 1);
