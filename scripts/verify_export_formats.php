<?php
/**
 * verify_export_formats.php
 *
 * Verifies the export layer without needing a database: format capability
 * detection, CSV correctness with Arabic headers, and — most importantly — that
 * spreadsheet formula injection is neutralised.
 *
 * Run: php scripts/verify_export_formats.php
 */

declare(strict_types=1);

$root = dirname(__DIR__);
require $root . '/backend-api/vendor/autoload.php';

use App\Services\SpreadsheetWriter;

$pass = 0;
$fail = 0;

function chk(string $name, bool $ok, string $detail = ''): void {
    global $pass, $fail;
    if ($ok) {
        $pass++;
        echo "[PASS] $name\n";
    } else {
        $fail++;
        echo "[FAIL] $name" . ($detail !== '' ? " — $detail" : '') . "\n";
    }
}

echo "--- format capability detection ---\n";

$formats = SpreadsheetWriter::formats();
chk('csv is always offered', isset($formats['csv']));
chk('json is always offered', isset($formats['json']));

// The whole point: never advertise a format that cannot be produced. phpoffice is
// declared in composer.json but absent from vendor/, so excel must NOT appear.
$xlsxInstalled = class_exists(\PhpOffice\PhpSpreadsheet\Spreadsheet::class);
chk(
    $xlsxInstalled
        ? 'excel is offered and phpspreadsheet is genuinely installed'
        : 'excel is withheld because phpspreadsheet is not installed',
    $xlsxInstalled === isset($formats['excel']),
    'xlsxInstalled=' . var_export($xlsxInstalled, true)
        . ' offered=' . var_export(isset($formats['excel']), true)
);

// PDF needs an embedded Arabic font plus bidi shaping. Neither exists here, so it
// must not be advertised: a PDF of disconnected Arabic glyphs is worse than a 501.
chk('pdf is never advertised without a shaping-capable library', !isset($formats['pdf']));

chk('extensionFor maps csv to .csv', SpreadsheetWriter::extensionFor('csv') === 'csv');
if (isset($formats['excel'])) {
    chk('extensionFor maps excel to .xlsx', SpreadsheetWriter::extensionFor('excel') === 'xlsx');
}

// NOTE: streamCsv is not called in-process. It emits HTTP headers and terminates
// with exit(), so calling it here produced "headers already sent" warnings and
// killed the rest of the suite. It is verified end-to-end by
// verify_api_http.php against a live server instead. What IS asserted here is the
// security-relevant part — the neutraliser — which is private and therefore reached
// through reflection.
$labels = [
    'username'  => 'اسم المستخدم',
    'full_name' => 'الاسم بالكامل',
    'phone'     => 'الهاتف',
];

echo "--- formula-injection neutralisation ---\n";
$ref = new \ReflectionMethod(SpreadsheetWriter::class, 'neutralise');
$ref->setAccessible(true);

$neutralised = $ref->invoke(null, ['=1+1', '+1', '-1', '@SUM(A1)', "\there", 'plain', '', 'علي', '-2+3+cmd']);
chk('a leading = is neutralised', $neutralised[0] === "'=1+1", var_export($neutralised[0], true));
chk('a leading + is neutralised', $neutralised[1] === "'+1", var_export($neutralised[1], true));
chk('a leading - is neutralised', $neutralised[2] === "'-1", var_export($neutralised[2], true));
chk('a leading @ is neutralised', $neutralised[3] === "'@SUM(A1)", var_export($neutralised[3], true));
chk('a LEADING tab is neutralised', $neutralised[4] === "'\there", var_export($neutralised[4], true));
// A tab in the middle is not a formula trigger and must be left alone, otherwise
// legitimate multi-line notes would be mangled.
$midTab = $ref->invoke(null, ["first\tsecond"]);
chk('a tab in the middle is preserved', $midTab[0] === "first\tsecond", var_export($midTab[0], true));
chk('a leading CR is neutralised', $ref->invoke(null, ["\rfoo"])[0] === "'\rfoo");
chk('a benign value is untouched', $neutralised[5] === 'plain', var_export($neutralised[5], true));
chk('an empty value stays empty', $neutralised[6] === '');
chk('Arabic text is untouched', $neutralised[7] === 'علي', var_export($neutralised[7], true));
// "-2+3+cmd" starts with '-' so it IS neutralised; the risk is the leading char,
// not the arithmetic.
chk('a formula disguised as arithmetic is neutralised',
    $neutralised[8] === "'-2+3+cmd", var_export($neutralised[8], true));

// Nested arrays must serialise, not fatal.
$arr = $ref->invoke(null, [['a' => 1]]);
chk('an array cell is JSON-encoded, not fatal', $arr[0] === '{"a":1}', var_export($arr[0], true));

echo "--- columnName helper ---\n";
$cn = new \ReflectionMethod(SpreadsheetWriter::class, 'columnName');
$cn->setAccessible(true);
chk('column 1 is A', $cn->invoke(null, 1) === 'A');
chk('column 26 is Z', $cn->invoke(null, 26) === 'Z');
chk('column 27 is AA', $cn->invoke(null, 27) === 'AA');
chk('column 28 is AB', $cn->invoke(null, 28) === 'AB');
chk('column 52 is AZ', $cn->invoke(null, 52) === 'AZ');
chk('column 53 is BA', $cn->invoke(null, 53) === 'BA');

echo "--- unsupported format fails loudly ---\n";
$threw = false;
try {
    SpreadsheetWriter::stream('pdf', $labels, [], 'x.pdf');
} catch (\App\Services\SpreadsheetUnavailableException $e) {
    $threw = true;
}
chk('requesting pdf raises SpreadsheetUnavailableException', $threw);

$threw2 = false;
try {
    SpreadsheetWriter::stream('totally-made-up', $labels, [], 'x');
} catch (\App\Services\SpreadsheetUnavailableException $e) {
    $threw2 = true;
}
chk('an unknown format raises SpreadsheetUnavailableException', $threw2);

echo "---\n" . ($pass + $fail) . ' passed' . ($fail === 0 ? '' : ", $fail FAILED") . "\n";
exit($fail === 0 ? 0 : 1);