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
     * Parses cell coordinates (attribute 'r') to map columns to their correct indices
     * and pads omitted blank cells.
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
                if (isset($si->t)) {
                    $sharedStrings[] = (string) $si->t;
                } elseif (isset($si->r)) {
                    $text = '';
                    foreach ($si->r as $r) {
                        $text .= (string) $r->t;
                    }
                    $sharedStrings[] = $text;
                } else {
                    $sharedStrings[] = '';
                }
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
            $rowCells = [];
            $maxCol = -1;
            $fallbackIndex = 0;

            foreach ($row->c as $cell) {
                $ref = (string) $cell['r'];
                $colIndex = $fallbackIndex;
                if ($ref !== '' && preg_match('/^([A-Z]+)(\d+)$/i', $ref, $matches)) {
                    $colIndex = self::columnLetterToIndex($matches[1]);
                    $fallbackIndex = $colIndex + 1;
                } else {
                    $fallbackIndex++;
                }

                $val = (string) $cell->v;
                $cellType = (string) $cell['t'];
                if ($cellType === 's' && isset($sharedStrings[(int) $val])) {
                    $val = $sharedStrings[(int) $val];
                } elseif ($cellType === 'inlineStr' && isset($cell->is->t)) {
                    $val = (string) $cell->is->t;
                }

                $rowCells[$colIndex] = $val;
                if ($colIndex > $maxCol) {
                    $maxCol = $colIndex;
                }
            }

            if ($maxCol >= 0) {
                $cells = [];
                for ($i = 0; $i <= $maxCol; $i++) {
                    $cells[$i] = $rowCells[$i] ?? '';
                }
                $allRows[] = $cells;
            }
        }

        if (empty($allRows)) {
            return [];
        }

        $header = array_shift($allRows);
        $headerCount = count($header);
        $rows = [];
        foreach ($allRows as $data) {
            if (count($data) < $headerCount) {
                $data = array_pad($data, $headerCount, '');
            } elseif (count($data) > $headerCount) {
                $data = array_slice($data, 0, $headerCount);
            }
            $rows[] = array_combine($header, $data);
        }

        return $rows;
    }

    /**
     * Convert Excel column letters (e.g. 'A', 'B', 'Z', 'AA', 'BC') to 0-based column index.
     */
    private static function columnLetterToIndex(string $col): int {
        $col = strtoupper($col);
        $len = strlen($col);
        $index = 0;
        for ($i = 0; $i < $len; $i++) {
            $index = $index * 26 + (ord($col[$i]) - ord('A') + 1);
        }
        return $index - 1;
    }
}
