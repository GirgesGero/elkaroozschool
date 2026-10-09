<?php
// Child half of verify_failure_disclosure.php. Its STDOUT is the response body under
// test, so nothing here may print anything else.
require_once dirname(__DIR__) . '/backend-api/src/Utils/AppRoot.php';
require_once dirname(__DIR__) . '/backend-api/src/Utils/Response.php';
require_once dirname(__DIR__) . '/backend-api/src/Controllers/SafeFailure.php';

class Probe
{
    use App\Controllers\SafeFailure;

    public function viaRefuse(): void
    {
        // Exactly the shape AtomicRestoreService throws on a copy failure.
        $this->refuse(
            new RuntimeException(
                'فشل نسخ الملف: /home/u/public_html/storage/elkarooz_restore_9f2/database.json'
            ),
            'RESTORE_FAILED',
            400
        );
    }

    public function viaFailVisibly(): void
    {
        // What SpreadsheetWriter throws. Controller-authored, names no path.
        $msg = 'تصدير Excel غير متاح: مكتبة phpoffice/phpspreadsheet غير مثبتة على الخادم.';
        $this->failVisibly(new RuntimeException($msg), $msg, 'EXPORT_FORMAT_UNAVAILABLE', 501);
    }
}

$probe = new Probe();
if (($argv[2] ?? '') === 'visibly') {
    $probe->viaFailVisibly();
} else {
    $probe->viaRefuse();
}
