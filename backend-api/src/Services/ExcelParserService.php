<?php
namespace App\Services;

class ExcelParserService {
    public static function parseCsv(string $filePath): array {
        $rows = [];
        if (($handle = fopen($filePath, 'r')) !== false) {
            $header = fgetcsv($handle, 1000, ',');
            if (!$header) {
                fclose($handle);
                return [];
            }

            while (($data = fgetcsv($handle, 1000, ',')) !== false) {
                if (count($data) === count($header)) {
                    $rows[] = array_combine($header, $data);
                }
            }
            fclose($handle);
        }
        return $rows;
    }

    /**
     * Parse an .xlsx file using PHP's ZipArchive + SimpleXML (no external dependencies).
     * Reads the first worksheet and returns rows as associative arrays keyed by header.
     */
    public static function parseXlsx(string $filePath): array {
        $zip = new \ZipArchive();
        if ($zip->open($filePath) !== true) {
            return [];
        }

        // Read shared strings (used for string cell values)
        $sharedStrings = [];
        $ssXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($ssXml !== false) {
            $ss = new \SimpleXMLElement($ssXml);
            foreach ($ss->si as $si) {
                $sharedStrings[] = (string) $si->t;
            }
        }

        // Read first sheet
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXml === false) {
            $zip->close();
            return [];
        }
        $sheet = new \SimpleXMLElement($sheetXml);
        $zip->close();

        $allRows = [];
        foreach ($sheet->sheetData->row as $row) {
            $cells = [];
            foreach ($row->c as $cell) {
                $val = (string) $cell->v;
                if ((string) $cell['t'] === 's' && isset($sharedStrings[(int) $val])) {
                    $val = $sharedStrings[(int) $val];
                }
                $cells[] = $val;
            }
            $allRows[] = $cells;
        }

        if (empty($allRows)) {
            return [];
        }

        $header = array_shift($allRows);
        $rows = [];
        foreach ($allRows as $data) {
            if (count($data) === count($header)) {
                $rows[] = array_combine($header, $data);
            }
        }

        return $rows;
    }
}
