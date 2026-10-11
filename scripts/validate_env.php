<?php
/**
 * Validates a generated .env against config/supabase.php's rules WITHOUT
 * revealing any value: only key names, lengths and boolean verdicts.
 */

declare(strict_types=1);

$envFile = $argv[1] ?? 'E:/drive progect/ELKAROOZ SCHOOL/backend-api/.env.production.generated';
$repo = 'E:/drive progect/ELKAROOZ SCHOOL/backend-api';

if (!is_file($envFile)) {
    fwrite(STDERR, "missing: {$envFile}\n");
    exit(1);
}

$size = filesize($envFile);
echo "=== SIZE ===\n";
printf("  %d bytes (Environment::load caps at 65536)\n", $size);
echo $size <= 65536 ? "  PASS\n\n" : "  FAIL — exceeds cap\n\n";

// Same parser the app uses.
$values = [];
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#')) {
        continue;
    }
    if (str_starts_with($line, 'export ')) {
        $line = ltrim(substr($line, 7));
    }
    if (!preg_match('/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/', $line, $m)) {
        continue;
    }
    $v = trim($m[2]);
    $q = $v === '' ? '' : $v[0];
    if (($q === '"' || $q === "'") && strlen($v) >= 2 && $v[strlen($v) - 1] === $q) {
        $v = substr($v, 1, -1);
    }
    $values[$m[1]] = $v;
}

echo "=== config/supabase.php REQUIRED-VALUE RULES ===\n";
$fail = 0;
foreach (['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET'] as $k) {
    $v = $values[$k] ?? '';
    $problems = [];
    if ($v === '') {
        $problems[] = 'empty';
    }
    if (str_contains($v, '<') || str_contains($v, '>')) {
        $problems[] = 'contains <>';
    }
    if (str_contains($v, 'CHANGE_ME')) {
        $problems[] = 'still a placeholder';
    }
    // Shape checks: a service-role JWT is long and has three dot segments.
    if (str_ends_with($k, '_KEY') && strlen($v) > 20 && substr_count($v, '.') !== 2) {
        $problems[] = 'not a 3-segment JWT';
    }
    $ok = $problems === [];
    printf("  %-28s len=%-4d %s\n", $k, strlen($v), $ok ? 'PASS' : 'FAIL: ' . implode(', ', $problems));
    if (!$ok) {
        $fail++;
    }
}

echo "\n=== OTHER KEYS ===\n";
foreach ($values as $k => $v) {
    if (str_starts_with($k, 'SUPABASE_')) {
        continue;
    }
    $flag = str_contains($v, 'CHANGE_ME') ? '  <-- STILL A PLACEHOLDER' : '';
    printf("  %-34s len=%-4d%s\n", $k, strlen($v), $flag);
    if (str_contains($v, 'CHANGE_ME')) {
        $fail++;
    }
}

echo "\n=== BOOT TEST (real config/supabase.php, real loaders) ===\n";
// A CHANGE_ME value passes config/supabase.php's presence check and boots
// happily, then fails every authenticated request at runtime. So detect
// placeholders here, where the message can still be actionable.
$placeholders = [];
foreach (['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET', 'GOOGLE_APPS_SCRIPT_TOKEN'] as $k) {
    $v = $values[$k] ?? '';
    if ($v !== '' && str_contains($v, 'CHANGE_ME')) {
        $placeholders[] = $k;
    }
}

if ($placeholders !== []) {
    echo "  NOT READY — still placeholder: " . implode(', ', $placeholders) . "\n";
    echo "  (config/supabase.php would ACCEPT these and boot, then fail auth.)\n";
    $fail++;
} else {
    // Simulate the host: put every value into the process env, then load config.
    foreach ($values as $k => $v) {
        putenv($k . '=' . $v);
    }
    $_ENV['APP_ENV'] = $values['APP_ENV'] ?? 'production';

    $out = [];
    $code = 0;
    exec(
        escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/env_boot_probe.php') . ' 2>&1',
        $out,
        $code
    );
    $boot = implode("\n", $out);
    if (str_contains($boot, 'CONFIG_OK')) {
        echo "  {$boot}\n";
        // Never let localhost become a trusted production origin.
        if (str_contains($boot, 'localhost')) {
            echo "  FAIL — localhost trusted in production\n";
            $fail++;
        } else {
            echo "  PASS — config loads, no localhost origin\n";
        }
    } else {
        echo "  boot output: {$boot}\n";
        echo "  FAIL — config/supabase.php refused to load\n";
        $fail++;
    }
}

echo "\n=== RESULT: " . ($fail === 0 ? 'PASS' : "FAIL ({$fail})") . " ===\n";
exit($fail === 0 ? 0 : 1);