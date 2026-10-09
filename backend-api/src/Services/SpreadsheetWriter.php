<?php
namespace App\Services;

use App\Utils\Response;

/**
 * Raised when a requested export format cannot be produced in this deployment.
 *
 * Deliberately distinct from a generic exception: the caller must return an
 * explicit, honest error rather than a file that is not what it claims to be.
 */
class SpreadsheetUnavailableException extends \RuntimeException {}

/**
 * Writes tabular exports in the formats this deployment can actually produce.
 *
 * Honest about capabilities rather than aspirational:
 *
 *  - CSV is always available (no dependency beyond core).
 *  - XLSX requires phpoffice/phpspreadsheet. composer.json declares it, but the
 *    shipped vendor/ tree contains only firebase/php-jwt, so availability is
 *    CHECKED at runtime. If it is missing the request fails loudly instead of
 *    handing the user a .xlsx that is really something else.
 *  - PDF is NOT offered. A PDF with Arabic text needs an embedded Unicode font plus
 *    bidirectional shaping; none is available on shared hosting, and emitting a PDF
 *    with disconnected, reversed Arabic glyphs would be worse than refusing.
 *    PDF stays out of the allowlist until a real font/shaping library is installed.
 */
class SpreadsheetWriter {
    /**
     * Formats this deployment can serve.
     *
     * @return array<string,string> format => file extension
     */
    public static function formats(): array {
        $formats = ['csv' => 'csv', 'json' => 'json'];

        if (self::xlsxAvailable()) {
            $formats['excel'] = 'xlsx';
        }

        return $formats;
    }

    public static function extensionFor(string $format): string {
        return self::formats()[$format] ?? $format;
    }

    public static function xlsxAvailable(): bool {
        return class_exists(\PhpOffice\PhpSpreadsheet\Spreadsheet::class);
    }

    /**
     * Emit the export to the browser and terminate.
     *
     * @param array<string,string> $labels column key => Arabic header
     * @param array<int,array<int,mixed>> $rows
     */
    public static function stream(string $format, array $labels, array $rows, string $filename): void {
        switch ($format) {
            case 'csv':
                self::streamCsv($labels, $rows, $filename);
                return;

            case 'excel':
                if (!self::xlsxAvailable()) {
                    throw new SpreadsheetUnavailableException(
                        'تصدير Excel غير متاح: مكتبة phpoffice/phpspreadsheet غير مثبتة على الخادم.'
                    );
                }
                self::streamXlsx($labels, $rows, $filename);
                return;

            case 'json':
                // Handled by the controller as an API envelope, not a download.
                Response::success($rows, 'بيانات التصدير');
                return;

            default:
                throw new SpreadsheetUnavailableException('صيغة تصدير غير مدعومة: ' . $format);
        }
    }

    /**
     * @param array<string,string> $labels
     * @param array<int,array<int,mixed>> $rows
     */
    public static function streamCsv(array $labels, array $rows, string $filename): void {
        self::sendHeaders('text/csv; charset=utf-8', $filename);

        $output = fopen('php://output', 'w');
        if ($output === false) {
            throw new \RuntimeException('تعذر تجهيز ملف التصدير');
        }

        // Excel only detects UTF-8 in a CSV when the BOM is present.
        fputs($output, "\xEF\xBB\xBF");
        fputcsv($output, array_values($labels));

        foreach ($rows as $row) {
            fputcsv($output, self::neutralise($row));
        }
        fclose($output);
        exit;
    }

    /**
     * @param array<string,string> $labels
     * @param array<int,array<int,mixed>> $rows
     */
    public static function streamXlsx(array $labels, array $rows, string $filename): void {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray(array_values($labels), null, 'A1');

        // Written one row at a time so cell values are coerced to string and a
        // leading '=' cannot become a live formula in the workbook.
        $r = 2;
        foreach ($rows as $row) {
            $sheet->fromArray(self::neutralise($row), null, 'A' . $r);
            $r++;
        }

        $sheet->setAutoFilter('A1:' . self::columnName(count($labels)) . max(1, $r - 1));

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->setPreCalculateFormulas(false);
        self::sendHeaders(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $filename
        );
        $writer->save('php://output');

        // Free the temporary files PhpSpreadsheet creates for cell caching.
        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);
        exit;
    }

    /**
     * Neutralise spreadsheet formula injection.
     *
     * A cell beginning with =, +, - or @ is evaluated as a formula by Excel and
     * Sheets. A trainee's stored name or note must never become executable content
     * on an administrator's machine, so such values are prefixed with an apostrophe.
     *
     * @param array<int,mixed> $row
     * @return array<int,string>
     */
    private static function neutralise(array $row): array {
        $out = [];
        foreach ($row as $value) {
            $s = is_array($value)
                ? (string) json_encode($value, JSON_UNESCAPED_UNICODE)
                : (string) $value;

            if ($s !== '' && preg_match('/^[=+\-@\t\r]/', $s) === 1) {
                $s = "'" . $s;
            }
            $out[] = $s;
        }
        return $out;
    }

    private static function sendHeaders(string $contentType, string $filename): void {
        header('Content-Type: ' . $contentType);
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
    }

    /** 1 => A, 26 => Z, 27 => AA */
    private static function columnName(int $index): string {
        $name = '';
        while ($index > 0) {
            $index--;
            $name = chr(65 + ($index % 26)) . $name;
            $index = intdiv($index, 26);
        }
        return $name;
    }
}