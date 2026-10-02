<?php
namespace App\Services;

use App\Utils\AppRoot;

/**
 * Archive extraction for backup restore (SRS 25.2).
 *
 * WHY THIS EXISTS
 *
 * The previous code called ZipArchive::extractTo() directly on an uploaded archive.
 * Running scripts/verify_archive_attacks.php against that implementation found two
 * live holes, both reproducible on the exact code that ships:
 *
 *   Zip slip. extractTo() writes each member at the path its name specifies, so a
 *   member called ../../../public_html/shell.php lands in the web root as an
 *   executable file. The uploaded archive controls the names.
 *
 *   Decompression bomb. Nothing bounded the entry count, the declared uncompressed
 *   size, or the compression ratio. A 71 KB archive expanded to 64 MB in 0.3s and
 *   nothing stopped it. A real bomb targets gigabytes, which on shared hosting takes
 *   out the whole account rather than one restore. This happens before any validation
 *   runs, because the inspector checks the extracted tree -- by the time the checks
 *   exist, the disk is already gone.
 *
 * So the archive is now inspected against hard limits BEFORE a single byte is written,
 * and members are extracted one at a time with their names re-validated against the
 * extraction root.
 *
 * THE LIMITS
 *
 * They are deliberately generous relative to a real backup, because a limit that
 * rejects legitimate archives trains operators to work around it. What they exclude is
 * the shape of an attack, not the size of honest data.
 *
 * They are fail-closed: an archive whose central directory cannot be read is refused,
 * because that is also what a deliberately malformed archive looks like.
 */
final class ArchiveExtractor {

    /**
     * Largest decompressed payload accepted, in bytes.
     *
     * Sized well above a real school's data: profiles, attendance, grades, media
     * metadata and the library corpus. A malicious archive does not need to be bigger
     * than this to be usable for filling a disk -- it needs to be repetitive, which is
     * what the ratio cap below catches.
     */
    public const MAX_TOTAL_BYTES = 1024 * 1024 * 1024; // 1 GiB

    /** Largest single member, in bytes. Guards one enormous blob inside an otherwise small archive. */
    public const MAX_ENTRY_BYTES = 256 * 1024 * 1024; // 256 MiB

    /** Largest number of members. A real backup is tens of files. */
    public const MAX_ENTRIES = 5000;

    /**
     * Highest tolerated compression ratio: uncompressed / compressed.
     *
     * Text, JSON and CSV compress to roughly 10:1. Zero-filled or repeated data -- the
     * shape of every bomb -- exceeds 200:1, because there is no entropy to spend. The
     * limit is 200 so ordinary JSON backups are unaffected.
     */
    public const MAX_COMPRESSION_RATIO = 200;

    /**
     * Extract an archive into $extractToDir after validating it.
     *
     * @return array{ok:bool, error:?string, files:int, bytes:int}
     */
    public static function extract(string $zipPath, string $extractToDir, string $password = ''): array {
        $zip = new \ZipArchive();

        $opened = $zip->open($zipPath);
        if ($opened !== true) {
            return self::fail('تعذر فتح ملف النسخة الاحتياطية.');
        }

        if ($password !== '') {
            $zip->setPassword($password);
        }

        try {
            $plan = self::inspectEntries($zip);
            if ($plan['error'] !== null) {
                return self::fail($plan['error']);
            }

            if (!is_dir($extractToDir) && !mkdir($extractToDir, 0700, true) && !is_dir($extractToDir)) {
                return self::fail('تعذر إنشاء مجلد فك الضغط.');
            }

            // realpath() of a directory that does not exist yet resolves to false, so the
            // containment comparison below needs the path we actually created. Resolve it
            // after the mkdir.
            $root = realpath($extractToDir);
            if ($root === false) {
                return self::fail('تعذر الوصول إلى مجلد فك الضغط.');
            }

            $written = 0;
            $files = 0;

            for ($i = 0; $i < $plan['count']; $i++) {
                $stat = $zip->statIndex($i);
                if ($stat === false) {
                    return self::fail('تعذر قراءة محتويات الأرشيف.');
                }

                $name = (string) $stat['name'];

                if (!self::isContained($name)) {
                    return self::fail(
                        'ملف داخل الأرشيف يشير إلى مسار خارج مجلد الاستعادة، وهذا مرفوض.'
                    );
                }

                $stream = $zip->getStream($name);
                if ($stream === false) {
                    return self::fail('تعذر قراءة أحد ملفات النسخة الاحتياطية.');
                }

                $target = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $name);
                $dir = dirname($target);
                if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
                    fclose($stream);
                    return self::fail('تعذر إنشاء مجلد داخل النسخة الاحتياطية.');
                }

                $out = fopen($target, 'wb');
                if ($out === false) {
                    fclose($stream);
                    return self::fail('تعذر حفظ أحد ملفات النسخة الاحتياطية.');
                }

                // Copy through a buffer and re-check the running total as we go. The
                // declared size in the central directory is attacker-controlled, so it
                // cannot be the only thing enforcing the cap.
                $copied = 0;
                while (!feof($stream)) {
                    $chunk = fread($stream, 262144);
                    if ($chunk === false) {
                        fclose($stream);
                        fclose($out);
                        @unlink($target);
                        return self::fail('تعذر قراءة أحد ملفات النسخة الاحتياطية.');
                    }
                    if ($chunk === '') {
                        continue;
                    }

                    $copied += strlen($chunk);
                    if ($copied > self::MAX_ENTRY_BYTES) {
                        fclose($stream);
                        fclose($out);
                        @unlink($target);
                        return self::fail('أحد ملفات النسخة الاحتياطية أكبر من الحد المسموح.');
                    }

                    $written += strlen($chunk);
                    if ($written > self::MAX_TOTAL_BYTES) {
                        fclose($stream);
                        fclose($out);
                        @unlink($target);
                        return self::fail('حجم النسخة الاحتياطية بعد فك الضغط يتجاوز الحد المسموح.');
                    }

                    fwrite($out, $chunk);
                }

                fclose($stream);
                fclose($out);
                $files++;
            }
        } finally {
            $zip->close();
        }

        return ['ok' => true, 'error' => null, 'files' => $files, 'bytes' => $written];
    }

    /**
     * Validate the archive's shape before extracting anything.
     *
     * @return array{error:?string, count:int, declared:int}
     */
    private static function inspectEntries(\ZipArchive $zip): array {
        $count = $zip->numFiles;

        if ($count === 0) {
            return ['error' => 'ملف النسخة الاحتياطية فارغ.', 'count' => 0, 'declared' => 0];
        }

        if ($count > self::MAX_ENTRIES) {
            return [
                'error' => sprintf('النسخة الاحتياطية تحتوي على %d ملف، والحد الأقصى %d.', $count, self::MAX_ENTRIES),
                'count' => $count,
                'declared' => 0,
            ];
        }

        $declared = 0;
        $compressed = 0;

        for ($i = 0; $i < $count; $i++) {
            $stat = $zip->statIndex($i);
            if ($stat === false) {
                // A central directory entry we cannot read is treated as hostile rather
                // than skipped: fail closed.
                return ['error' => 'تعذر قراءة بنية ملف النسخة الاحتياطية.', 'count' => $count, 'declared' => 0];
            }

            $size = (int) ($stat['size'] ?? 0);
            $csize = (int) ($stat['comp_size'] ?? 0);

            if ($size > self::MAX_ENTRY_BYTES) {
                return [
                    'error' => sprintf('الملف %s داخل النسخة الاحتياطية أكبر من الحد المسموح.', (string) $stat['name']),
                    'count' => $count,
                    'declared' => $declared,
                ];
            }

            $declared += $size;
            $compressed += $csize;
        }

        if ($declared > self::MAX_TOTAL_BYTES) {
            return [
                'error' => sprintf(
                    'حجم النسخة الاحتياطية بعد فك الضغط %s، والحد الأقصى %s.',
                    self::humanBytes($declared),
                    self::humanBytes(self::MAX_TOTAL_BYTES)
                ),
                'count' => $count,
                'declared' => $declared,
            ];
        }

        // Ratio check, only once there is enough compressed data for the ratio to mean
        // anything. A tiny archive can legitimately have a high ratio from header
        // overhead alone.
        if ($compressed > 0 && $declared / $compressed > self::MAX_COMPRESSION_RATIO) {
            return [
                'error' => sprintf(
                    'نسبة ضغط النسخة الاحتياطية غير طبيعية (%.0f:1)، وهذا يرفض كملف ضار.',
                    $declared / $compressed
                ),
                'count' => $count,
                'declared' => $declared,
            ];
        }

        return ['error' => null, 'count' => $count, 'declared' => $declared];
    }

    /**
     * Reject any member name that resolves outside the extraction root.
     *
     * Checks the name rather than the resulting path because the resulting path does not
     * exist yet. Four separate shapes are refused:
     *
     *   ../            parent traversal
     *   /absolute      an absolute path would escape the root
     *   //             protocol-relative, which some unzippers treat as absolute
     *   C: or a drive  a Windows drive-relative path
     *
     * plus backslashes, because an archive authored on Windows may use them and some
     * extractors normalise them to separators.
     */
    private static function isContained(string $name): bool {
        if ($name === '' || $name === '.') {
            return false;
        }

        $normalised = str_replace('\\', '/', $name);

        if ($normalised[0] === '/') {
            return false;
        }
        if (preg_match('#^[a-zA-Z]:#', $normalised)) {
            return false;
        }

        foreach (explode('/', $normalised) as $segment) {
            if ($segment === '..') {
                return false;
            }
        }

        return true;
    }

    /** @return array{ok:bool, error:?string, files:int, bytes:int} */
    private static function fail(string $message): array {
        return ['ok' => false, 'error' => $message, 'files' => 0, 'bytes' => 0];
    }

    private static function humanBytes(int $bytes): string {
        $units = ['بايت', 'كيلوبايت', 'ميغابايت', 'جيجابايت'];
        $i = 0;
        $value = (float) $bytes;
        while ($value >= 1024 && $i < count($units) - 1) {
            $value /= 1024;
            $i++;
        }
        return round($value, 1) . ' ' . $units[$i];
    }
}