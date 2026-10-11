<?php
// Boot probe: loads the real config files the way the front controller does.
// Prints no secret — only the derived, non-sensitive settings.
declare(strict_types=1);

$repo = 'E:/drive progect/ELKAROOZ SCHOOL/backend-api';

require_once $repo . '/src/Utils/Environment.php';
require_once $repo . '/config/supabase.php';
$app = require $repo . '/config/app.php';

echo "CONFIG_OK\n";
echo "  url=" . $app['url'] . "\n";
echo "  env=" . $app['env'] . "\n";
echo "  debug=" . ($app['debug'] ? '1' : '0') . "\n";
echo "  origins=" . implode(',', $app['cors']['allowed_origins']) . "\n";