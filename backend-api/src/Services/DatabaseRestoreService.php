<?php

namespace App\Services;

/**
 * Logical database restore, used by AtomicRestoreService.
 *
 * WHY THIS EXISTS
 *
 * The backup half landed first (DatabaseExportService) and it was honest about
 * its own limit: it wrote a real database.json but there was no way to put it
 * back, so AtomicRestoreService::restoreDatabase() refused every DATABASE_ONLY
 * and FULL_SYSTEM request with "not configured on this server". That is the
 * correct fail-closed behaviour, but it also meant a restore archive was a
 * one-way trip -- you could back up and then never recover.
 *
 * Three RPCs close the loop, all service_role only and all SECURITY DEFINER:
 *
 *   restore_accounts(jsonb)        -> re-create missing auth.users rows
 *   restore_table(text, jsonb)     -> upsert one table
 *   restore_database(jsonb, bool)  -> the entry point, in dependency order
 *
 * SECURITY DEFINER, not INVOKER, and that is the whole safety argument. The
 * restore has to write auth.users, which service_role cannot touch over
 * PostgREST, and it has to suspend sync_profile_app_metadata() via
 * session_replication_role so that a legitimate super_user row in the archive
 * does not abort the restore. Both of those require privileges no PostgREST-
 * reachable role holds -- anon, authenticated and service_role were each
 * verified to be refused `SET LOCAL session_replication_role` with 42501. The
 * function is owned by postgres, so only its own body can do it. There is no
 * RPC that exposes that capability on its own.
 *
 * ALL OR NOTHING
 *
 * The restore is one statement inside one transaction. If table 30 of 50 fails,
 * Postgres rolls the whole thing back -- that is a property of the database,
 * not of this code, and it is why there is no compensating logic here. This
 * service therefore has no rollback of its own to get wrong.
 *
 * WHAT IT DOES NOT RESTORE
 *
 * Passwords and sessions. The export contains neither, so a re-created account
 * has no usable password and must go through the normal reset flow. That is
 * deliberate: a backup archive must never be able to install a credential.
 */
final class DatabaseRestoreService
{
    /**
     * Built on first use, not in the constructor.
     *
     * SupabaseClient's constructor reads config/storage.php and fails closed with
     * CONFIG_MISSING when the deployment has no Supabase credentials. Building it
     * eagerly meant a FILES_ONLY restore -- which never touches the database --
     * died on a database configuration error, and it did so by emitting an HTTP
     * response and exiting from inside a service constructor. Restoring files has
     * to work on a deployment whose database happens to be misconfigured, because
     * that is often exactly the deployment you need to restore files onto.
     *
     * @var SupabaseClient|null
     */
    private ?SupabaseClient $client = null;

    public function __construct(?SupabaseClient $client = null)
    {
        $this->client = $client;
    }

    /**
     * Test seam so the suite can assert the RPC's arguments and failure handling
     * without a network call. Same pattern as DatabaseExportService.
     */
    public function setClientForTesting(SupabaseClient $client): void
    {
        $this->client = $client;
    }

    private function client(): SupabaseClient
    {
        return $this->client ??= new SupabaseClient();
    }

    /**
     * Read database.json out of an extracted archive and hand it to Postgres.
     *
     * The whole file is read as one array and sent in a single RPC call: the
     * restore is atomic on the database side only if the payload arrives whole.
     * Streaming it per table would give an all-or-nothing restore per table and
     * a half-restored database across tables, which is the one outcome SRS 25.5
     * forbids.
     *
     * @param  string $extractDir already-extracted, already-validated archive
     * @param  bool   $truncate   true = the table ends up containing exactly the
     *                            archive; false = merge archived rows only
     * @return array{restored:bool, tables_restored:int, accounts_created:int, super_user_preserved:int, detail:string}
     */
    public function restore(string $extractDir, bool $truncate = false): array
    {
        $dbFile = $extractDir
            . DIRECTORY_SEPARATOR . 'database'
            . DIRECTORY_SEPARATOR . 'database.json';

        if (!is_file($dbFile)) {
            throw new \RuntimeException(
                'الاستعادة طلبت قاعدة البيانات لكن ملف database.json غير موجود في النسخة'
            );
        }

        $size = filesize($dbFile);
        if ($size === false || $size === 0) {
            throw new \RuntimeException('ملف قاعدة البيانات في النسخة فارغ');
        }

        // The archive is already bounded by BackupArchiveInspector (2 GB compressed,
        // 8 GB expanded, 500k entries, ratio 200), so this ceiling is about the
        // single jsonb payload rather than the archive: it stops one oversized
        // document from turning into an out-of-memory failure with no useful
        // message, which is exactly the failure an operator would not be able to
        // act on.
        if ($size > self::MAX_PAYLOAD_BYTES) {
            throw new \RuntimeException(sprintf(
                'ملف قاعدة البيانات (%s بايت) يتجاوز الحد المسموح (%s بايت). '
                . 'قسّم النسخ الاحتياطية على أجزاء.',
                number_format($size),
                number_format(self::MAX_PAYLOAD_BYTES)
            ));
        }

        $raw = file_get_contents($dbFile);
        if ($raw === false) {
            throw new \RuntimeException('تعذّرت قراءة ملف قاعدة البيانات من النسخة');
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded) || $decoded === []) {
            // A decode failure here would otherwise reach Postgres as null and
            // come back as a generic 22023. Saying which file is broken is the
            // difference between an operator fixing the archive and an operator
            // filing a bug.
            throw new \RuntimeException(
                'ملف database.json في النسخة غير صالح: يجب أن يكون كائن JSON يحتوي على الجداول'
            );
        }

        // Reject the bookkeeping tables here as well as in SQL. The RPC refuses
        // them with 42501 regardless; checking before the call means the operator
        // gets the reason in the response body instead of a raw PostgREST error.
        foreach (array_keys($decoded) as $table) {
            if (!is_string($table) || preg_match('/^[a-z_][a-z0-9_]*$/', $table) !== 1) {
                throw new \RuntimeException('النسخة تحتوي اسم جدول غير صالح: ' . (string) $table);
            }
            if (in_array($table, ['backup_records', 'import_history'], true)) {
                throw new \RuntimeException('جدول ' . $table . ' جدول داخلي ولا يمكن استعادته');
            }
            if (!is_array($decoded[$table])) {
                throw new \RuntimeException('بيانات الجدول ' . $table . ' يجب أن تكون مصفوفة صفوف');
            }
        }

        // If the caller asked for a database restore, the archive must actually
        // contain one. Without this check a truncated archive would restore
        // nothing and the operator would read the success response as "the
        // database was restored".
        $report = $this->client()->rpc('restore_database', [
            'p_tables'   => $decoded,
            'p_truncate' => $truncate,
        ]);

        if (!is_array($report)) {
            throw new \RuntimeException('استجابة غير متوقعة من استعادة قاعدة البيانات');
        }

        $tables = (int) ($report['tables_restored'] ?? 0);
        if ($tables < 1) {
            throw new \RuntimeException('لم تتم استعادة أي جدول. تحقّق من محتوى النسخة.');
        }

        return [
            'restored'            => true,
            'tables_restored'     => $tables,
            'accounts_created'    => (int) ($report['accounts_created'] ?? 0),
            'super_user_preserved' => (int) ($report['super_user_preserved'] ?? 0),
            'truncate_mode'       => (bool) ($report['truncate_mode'] ?? $truncate),
            'detail'              => 'تمت استعادة قاعدة البيانات فعلياً من النسخة',
        ];
    }

    /**
     * PostgREST serialises a jsonb parameter to the request body, and a large
     * archive becomes a large body. This is below the default 8 MB statement
     * budget but far above any realistic single-archive size for this system,
     * so hitting it means something is wrong with the archive rather than with
     * the deployment.
     */
    private const MAX_PAYLOAD_BYTES = 64 * 1024 * 1024;
}
