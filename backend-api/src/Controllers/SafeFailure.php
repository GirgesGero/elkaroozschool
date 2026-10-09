<?php
// backend-api/src/Controllers/SafeFailure.php
//
// Refuse a failure without describing it.
//
// WHY
//
// Four controllers had the same generic catch:
//
//     } catch (\Exception $e) {
//         Response::error($e->getMessage(), 'RESTORE_FAILED', 400);
//     }
//
// Which looks fine, because most of what these services throw is a fixed Arabic
// constant. The problem is what three of them interpolate:
//
//     AtomicRestoreService    'فشل نسخ الملف: ' . $src      absolute path
//     AppRoot                 '... Checked upward from ' . __DIR__
//     DatabaseRestoreService  'جدول ' . $table . ' جدول داخلي ولا يمكن استعادته'
//
// So the response body carried the staging directory name, the application root, and
// whether a guessed archive member exists. The routes are admin-only, which is not a
// defence: an admin token that leaks once turns a restore error message into a
// filesystem map for whoever holds it. RestoreController made it worse by also
// forwarding 'reason' and 'rollback_error' in the details array, so the paths arrived
// even when the top-level message was already generic.
//
// THE CONTRACT
//
// An exception message may reach the server log. It may never reach the response.
// The response carries a stable failure code plus an error_id that quotes the same
// entry in the log, so the operator can still find the detail -- that part matters,
// because "فشلت العملية" with nothing else sends an admin hunting through Hostinger's
// log viewer with no idea which operation failed.
//
// Re-throwing is fine and encouraged: hand the text to a layer that is obliged to
// sanitise it. error_log() is fine. AuditLogService::log() is fine, and the reason
// should go there too -- that is the whole point of an audit trail.
//
// NOT a blanket wrapper
//
// Use it for \Exception and its subclasses. Do NOT use it for a message the
// controller itself authored and fully controls: SpreadsheetUnavailableException
// carries "مكتبة phpoffice/phpspreadsheet غير مثبتة على الخادم", which is the only
// thing that tells the admin WHY their export cannot work, and it names no path,
// host, key or query. Sanitising it removes the single most actionable sentence in
// the response without removing any real secret. Those messages are returned as-is;
// see SpreadsheetUnavailableException's docblock for the rule.

namespace App\Controllers;

use App\Utils\Response;

trait SafeFailure
{
    /**
     * Log the detail, return an opaque failure with a correlation id.
     *
     * @param string $opaqueCode stable, caller-safe failure class, e.g. 'RESTORE_FAILED'
     */
    private function refuse(\Exception $e, string $opaqueCode, int $status): void
    {
        $errorId = $this->failWithId($opaqueCode, $e);
        Response::error(
            'فشلت العملية. لم يتم تعديل النظام. رقم الخطأ: ' . $errorId,
            $opaqueCode,
            $status,
            ['error_id' => $errorId]
        );
    }

    /**
     * For a failure whose reason is safe to show, but which still deserves a log line.
     *
     * @param string $safeMessage a controller-authored, caller-safe explanation
     * @return string the correlation id, so the caller can put it in an audit entry
     */
    private function failVisibly(
        \Exception $e,
        string $safeMessage,
        string $opaqueCode,
        int $status
    ): string {
        $errorId = $this->failWithId($opaqueCode, $e);
        Response::error($safeMessage, $opaqueCode, $status, ['error_id' => $errorId]);
        return $errorId;
    }

    /**
     * The one place an exception message is allowed to exist: the server log.
     *
     * @return string the correlation id
     */
    private function failWithId(string $opaqueCode, \Throwable $t): string
    {
        $errorId = substr(bin2hex(random_bytes(4)), 0, 8);
        error_log(sprintf(
            '[EL KAROOZ] %s [%s] %s in %s:%d',
            $opaqueCode,
            $errorId,
            $t->getMessage(),
            $t->getFile(),
            $t->getLine()
        ));
        return $errorId;
    }
}
