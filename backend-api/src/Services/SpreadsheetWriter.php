<?php
namespace App\Services;

use App\Utils\Response;

/**
 * Raised when a requested export format cannot be produced in this deployment.
 */
class SpreadsheetUnavailableException extends \RuntimeException {}

/**
 * Writes tabular exports in the formats this deployment can actually produce.
 * Supports CSV and native OpenXML XLSX (via ZipArchive) without heavy dependencies.
 */
class SpreadsheetWriter {
    /**
     * Formats this deployment can serve.
     * Note: PDF is deliberately omitted from formats() because rendering Arabic text
     * without a dedicated bidirectional complex-text shaping library results in
     * disconnected reversed glyphs.
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
        return class_exists(\PhpOffice\PhpSpreadsheet\Spreadsheet::class) || class_exists(\ZipArchive::class);
    }

    /**
     * Generate CSV content in-memory with UTF-8 BOM
     */
    public static function generateCsv(array $labels, array $rows): string {
        $fp = fopen('php://temp', 'r+');
        fputs($fp, "\xEF\xBB\xBF");
        fputcsv($fp, array_values($labels));
        foreach ($rows as $row) {
            fputcsv($fp, self::neutralise($row));
        }
        rewind($fp);
        $data = stream_get_contents($fp);
        fclose($fp);
        return (string)$data;
    }

    /**
     * Generate native OpenXML XLSX content in-memory using ZipArchive
     */
    public static function generateXlsx(array $labels, array $rows): string {
        if (!class_exists(\ZipArchive::class)) {
            throw new SpreadsheetUnavailableException('تصدير Excel غير متاح: مكتبة ZipArchive غير مفعلة.');
        }

        $tempFile = sys_get_temp_dir() . '/elkarooz_export_' . bin2hex(random_bytes(8)) . '.xlsx';
        $zip = new \ZipArchive();
        if ($zip->open($tempFile, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('تعذر إنشاء ملف Excel مؤقت');
        }

        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '</Types>');

        $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>');

        $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            . '</Relationships>');

        $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="EL KAROOZ Report" sheetId="1" r:id="rId1"/></sheets>'
            . '</workbook>');

        $zip->addFromString('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>'
            . '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
            . '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
            . '</styleSheet>');

        // Generate sheetData
        $sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<sheetData>';

        // Header row
        $sheetXml .= '<row r="1">';
        $colIdx = 1;
        foreach (array_values($labels) as $headerText) {
            $colLetter = self::columnName($colIdx++);
            $safe = htmlspecialchars((string)$headerText, ENT_XML1, 'UTF-8');
            $sheetXml .= '<c r="' . $colLetter . '1" t="inlineStr"><is><t>' . $safe . '</t></is></c>';
        }
        $sheetXml .= '</row>';

        // Data rows
        $rowNum = 2;
        foreach ($rows as $row) {
            $sheetXml .= '<row r="' . $rowNum . '">';
            $neutralRow = self::neutralise($row);
            $colIdx = 1;
            foreach ($neutralRow as $val) {
                $colLetter = self::columnName($colIdx++);
                $safe = htmlspecialchars((string)$val, ENT_XML1, 'UTF-8');
                $sheetXml .= '<c r="' . $colLetter . $rowNum . '" t="inlineStr"><is><t>' . $safe . '</t></is></c>';
            }
            $sheetXml .= '</row>';
            $rowNum++;
        }

        $sheetXml .= '</sheetData></worksheet>';
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);
        $zip->close();

        $content = file_get_contents($tempFile);
        @unlink($tempFile);
        return (string)$content;
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
                        'تصدير Excel غير متاح: مكتبة إنشاء ملفات Excel غير متوفرة على الخادم.'
                    );
                }
                self::streamXlsx($labels, $rows, $filename);
                return;

            case 'json':
                Response::success($rows, 'بيانات التصدير');
                return;

            default:
                throw new SpreadsheetUnavailableException('صيغة تصدير غير مدعومة: ' . $format);
        }
    }

    public static function streamCsv(array $labels, array $rows, string $filename): void {
        self::sendHeaders('text/csv; charset=utf-8', $filename);
        echo self::generateCsv($labels, $rows);
        exit;
    }

    public static function streamXlsx(array $labels, array $rows, string $filename): void {
        self::sendHeaders(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $filename
        );

        if (class_exists(\PhpOffice\PhpSpreadsheet\Spreadsheet::class)) {
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->fromArray(array_values($labels), null, 'A1');
            $r = 2;
            foreach ($rows as $row) {
                $sheet->fromArray(self::neutralise($row), null, 'A' . $r);
                $r++;
            }
            $sheet->setAutoFilter('A1:' . self::columnName(count($labels)) . max(1, $r - 1));
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->setPreCalculateFormulas(false);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
            exit;
        }

        echo self::generateXlsx($labels, $rows);
        exit;
    }

    /**
     * Neutralise spreadsheet formula injection.
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
