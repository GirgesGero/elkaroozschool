<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/Services/GoogleDriveService.php';

$cases = [
    [204, false, true, true, false, false, 'Drive 204 means deleted'],
    [200, false, true, true, false, false, 'Drive 200 means deleted'],
    [404, false, true, false, true, false, 'Drive 404 is idempotent already-missing'],
    [403, false, false, false, false, false, 'Drive 403 is a hard failure'],
    [429, false, false, false, false, true, 'Drive 429 is retryable'],
    [503, false, false, false, false, true, 'Drive 5xx is retryable'],
    [0, true, false, false, false, true, 'network failure is retryable'],
];

$failed = 0;
foreach ($cases as [$status, $networkError, $success, $deleted, $alreadyMissing, $retryable, $label]) {
    $actual = App\Services\GoogleDriveService::interpretDeleteResponse($status, $networkError);
    $passed = ($actual['success'] ?? null) === $success
        && ($actual['deleted'] ?? null) === $deleted
        && ($actual['already_missing'] ?? null) === $alreadyMissing
        && ($actual['retryable'] ?? null) === $retryable;
    printf("%s %s\n", $passed ? 'PASS' : 'FAIL', $label);
    $failed += $passed ? 0 : 1;
}
printf("\n%d/%d checks passed\n", count($cases) - $failed, count($cases));
exit($failed === 0 ? 0 : 1);
