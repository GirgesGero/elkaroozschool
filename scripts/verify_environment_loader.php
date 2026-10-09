<?php
require_once __DIR__ . '/../backend-api/src/Utils/Environment.php';

use App\Utils\Environment;

$checks = 0;
$failures = [];
$testRoot = rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'elkarooz-env-' . bin2hex(random_bytes(6));
$webRoot = $testRoot . DIRECTORY_SEPARATOR . 'public_html';
$privateRoot = $testRoot . DIRECTORY_SEPARATOR . 'private';
mkdir($webRoot, 0700, true);
mkdir($privateRoot, 0700, true);

function verify(string $name, bool $condition): void {
    global $checks, $failures;
    $checks++;
    if (!$condition) {
        $failures[] = $name;
    }
}

function clearTestEnv(string ...$keys): void {
    foreach ($keys as $key) {
        putenv($key);
        unset($_ENV[$key], $_SERVER[$key]);
    }
}

try {
    $privateEnv = $testRoot . DIRECTORY_SEPARATOR . '.env';
    file_put_contents($privateEnv, implode("\n", [
        '# ignored comment',
        'ELKAROOZ_ENV_TEST_PLAIN=loaded',
        'export ELKAROOZ_ENV_TEST_QUOTED="value with spaces"',
        "ELKAROOZ_ENV_TEST_SINGLE='single value'",
        'ELKAROOZ_ENV_TEST_ESCAPED="quote: \\"ok\\""',
        'ELKAROOZ_ENV_TEST_EXTERNAL=file-value',
        'not a valid assignment',
        '',
    ]));
    $_SERVER['DOCUMENT_ROOT'] = $webRoot;
    putenv('ELKAROOZ_ENV_FILE');
    clearTestEnv(
        'ELKAROOZ_ENV_TEST_PLAIN',
        'ELKAROOZ_ENV_TEST_QUOTED',
        'ELKAROOZ_ENV_TEST_SINGLE',
        'ELKAROOZ_ENV_TEST_ESCAPED',
        'ELKAROOZ_ENV_TEST_EXTERNAL'
    );

    verify('loads .env from the parent of the app/web root', Environment::load($webRoot));
    verify('loads unquoted values', getenv('ELKAROOZ_ENV_TEST_PLAIN') === 'loaded');
    verify('loads double-quoted values with spaces', getenv('ELKAROOZ_ENV_TEST_QUOTED') === 'value with spaces');
    verify('loads single-quoted values', getenv('ELKAROOZ_ENV_TEST_SINGLE') === 'single value');
    verify('unescapes quoted delimiters', getenv('ELKAROOZ_ENV_TEST_ESCAPED') === 'quote: "ok"');

    putenv('ELKAROOZ_ENV_TEST_EXTERNAL=host-value');
    $_ENV['ELKAROOZ_ENV_TEST_EXTERNAL'] = 'host-value';
    verify('does not override a host-provided value', Environment::load($webRoot)
        && getenv('ELKAROOZ_ENV_TEST_EXTERNAL') === 'host-value');

    $insideWebRoot = $webRoot . DIRECTORY_SEPARATOR . '.env';
    file_put_contents($insideWebRoot, 'ELKAROOZ_ENV_TEST_WEBROOT=must-not-load');
    putenv('ELKAROOZ_ENV_FILE=' . $insideWebRoot);
    clearTestEnv('ELKAROOZ_ENV_TEST_WEBROOT');
    verify('rejects an env file inside document root', !Environment::load($webRoot));
    verify('does not import values from a web-root env file', getenv('ELKAROOZ_ENV_TEST_WEBROOT') === false);

    $oversized = $privateRoot . DIRECTORY_SEPARATOR . 'oversized.env';
    file_put_contents($oversized, str_repeat('X', 65537));
    putenv('ELKAROOZ_ENV_FILE=' . $oversized);
    verify('rejects an oversized env file', !Environment::load($webRoot));
} finally {
    @unlink($testRoot . DIRECTORY_SEPARATOR . '.env');
    clearTestEnv(
        'ELKAROOZ_ENV_TEST_PLAIN',
        'ELKAROOZ_ENV_TEST_QUOTED',
        'ELKAROOZ_ENV_TEST_SINGLE',
        'ELKAROOZ_ENV_TEST_ESCAPED',
        'ELKAROOZ_ENV_TEST_EXTERNAL',
        'ELKAROOZ_ENV_TEST_WEBROOT',
        'ELKAROOZ_ENV_FILE'
    );
    unset($_SERVER['DOCUMENT_ROOT']);
    foreach (glob($testRoot . DIRECTORY_SEPARATOR . '*', GLOB_ONLYDIR) ?: [] as $directory) {
        foreach (glob($directory . DIRECTORY_SEPARATOR . '*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($directory);
    }
    @rmdir($testRoot);
}

if ($failures !== []) {
    fwrite(STDERR, 'FAIL ' . count($failures) . '/' . $checks . ': ' . implode(', ', $failures) . PHP_EOL);
    exit(1);
}
printf("PASS %d/%d environment-loader checks\n", $checks, $checks);
