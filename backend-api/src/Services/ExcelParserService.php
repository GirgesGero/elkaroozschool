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
}
