<?php

namespace App\Services;

/**
 * Logical database export, used by BackupController.
 *
 * WHY THIS EXISTS
 *
 * Every backup manifest used to record includes_database => false, on the
 * grounds that a logical Postgres dump was impossible from here. That was half
 * true: pg_dump is genuinely unavailable on shared hosting, but pg_dump is not
 * required to produce a restorable logical export. Postgres can serialise any
 * table to jsonb by itself, and the database can do that in one call.
 *
 * Two RPCs provide it, both service_role only because they return the entire
 * user base (names, birth dates, phones, addresses, church, confession father):
 *
 *   export_manifest()          -> every public table with its exact row count
 *   export_table(t, l, o)      -> one table as jsonb, paginated
 *
 * They are SECURITY INVOKER, not DEFINER: reading public tables needs no
 * privilege elevation, and staying invoker means a future role change fails
 * closed through RLS rather than silently bypassing it.
 *
 * WHAT THIS IS NOT
 *
 * This is not a pg_dump. It captures table DATA only -- no schema, no indexes,
 * no constraints, no functions, and nothing from auth.users (password hashes and
 * sessions are not readable by service_role over PostgREST, and that is
 * deliberate). Restoring data without schema is only coherent because the schema
 * is version-controlled in supabase/migrations and deployed separately. A
 * restore therefore means "put this data back into a schema that already exists",
 * which is the correct model for a hosted database you do not control.
 *
 * Failure is loud by design. If the RPC is missing, or the caller lacks the
 * grant, this throws rather than silently writing an empty database.json that
 * would later be restored over real data.
 */
final class DatabaseExportService
{
    /** PostgREST caps a response well below this; one jsonb blob cannot grow forever. */
    private const PAGE_LIMIT = 500;

    /** Hard ceiling on total rows for a single table in one archive. */
    private const MAX_ROWS_PER_TABLE = 500_000;

    /**
     * Deterministic test seam for the row ceiling.
     *
     * Mirrors AtomicRestoreService::setFailAfterFirstWriteForTesting. Exercising
     * the real 500k ceiling would need half a million synthetic rows per run,
     * which makes the suite slow enough that people stop running it.
     */
    private int $maxRowsPerTable = self::MAX_ROWS_PER_TABLE;

    public function setMaxRowsPerTableForTesting(int $rows): void
    {
        $this->maxRowsPerTable = max(1, $rows);
    }

    /**
     * Reject anything that is not a bare lowercase identifier.
     *
     * export_table() applies the same regex in SQL, so this is not the control
     * that stops a traversal -- that one lives in the database and is verified
     * against production. This is defence in depth: if the RPC is ever replaced
     * or a different backend is swapped in, the service still cannot be talked
     * into writing a file outside the staging directory. A table name is joined
     * into a filesystem path below, so an unchecked value here would be a real
     * arbitrary-write primitive.
     */
    private function assertSafeTableName(string $table): void
    {
        if (preg_match('/^[a-z_][a-z0-9_]*$/', $table) !== 1) {
            throw new \RuntimeException(sprintf(
                'refusing to export table with an unsafe name: %s',
                $table === '' ? '(empty)' : $table
            ));
        }
        if (strlen($table) > 63) {
            throw new \RuntimeException('refusing to export a table name longer than 63 bytes');
        }
    }

    /** Tables that must never be exported, whatever the catalogue says. */
    private const EXCLUDED = [
        // Records of previous backup/restore attempts. Restoring them would
        // resurrect a rolled-back archive row and make backup_records lie about
        // what currently exists.
        'backup_records',
        'import_history',
    ];

    public function __construct(
        private readonly SupabaseClient $client
    ) {
    }

    /**
     * Export every public table to a staging directory.
     *
     * @return array{
     *     tables: int,
     *     rows: int,
     *     bytes: int,
     *     path: string,
     *     row_counts: array<string,int>
     * }
     */
    public function exportToDirectory(string $stagingDir): array
    {
        $dbDir = $stagingDir . '/database';
        if (!is_dir($dbDir) && !mkdir($dbDir, 0700, true) && !is_dir($dbDir)) {
            throw new \RuntimeException('cannot create the database staging directory');
        }

        $tables = $this->listTables();
        if ($tables === []) {
            throw new \RuntimeException(
                'export_manifest() returned no tables. The RPC is missing, or the '
                . 'database credentials lack the service_role grant. Refusing to '
                . 'write an empty database export that a restore would treat as real.'
            );
        }

        $rowCounts = [];
        $totalRows = 0;
        $totalBytes = 0;
        $written = 0;

        foreach ($tables as $entry) {
            $table = (string) ($entry['table'] ?? '');
            if ($table === '') {
                continue;
            }
            if (in_array($table, self::EXCLUDED, true)) {
                continue;
            }
            $this->assertSafeTableName($table);

            $declared = (int) ($entry['row_count'] ?? 0);
            if ($declared > $this->maxRowsPerTable) {
                // Silently truncating a table would produce a backup that looks
                // complete but is not. Refuse and say which table.
                throw new \RuntimeException(sprintf(
                    'table %s has %d rows, above the %d row export ceiling. '
                    . 'Refusing to truncate it into a partial backup.',
                    $table,
                    $declared,
                    $this->maxRowsPerTable
                ));
            }

            $rows = [];
            $offset = 0;
            // Independent of has_more. The RPC also reports total_rows, and the
            // sweep is driven off that instead, so a wrong has_more can only cost
            // an extra harmless request rather than a truncated backup.
            $exportedTotal = null;
            while (true) {
                $page = $this->client->rpc('export_table', [
                    'p_table' => $table,
                    'p_limit' => self::PAGE_LIMIT,
                    'p_offset' => $offset,
                ]);

                if ($exportedTotal === null && isset($page['total_rows'])) {
                    $exportedTotal = (int) $page['total_rows'];
                }

                $batch = $page['rows'] ?? [];
                if (!is_array($batch) || $batch === []) {
                    break;
                }
                foreach ($batch as $row) {
                    $rows[] = $row;
                }
                $offset += count($batch);

                // Stop only when BOTH signals agree we are done.
                //
                // Checking has_more alone truncates any table larger than one page
                // whenever the server under-reports has_more. Checking total_rows
                // alone is not enough either, because a server that reports the
                // wrong total would spin until the ceiling. Requiring both to say
                // "done" means a lie in either one still terminates, and a lie in
                // one cannot silently cut the export short.
                $hasMore = ($page['has_more'] ?? false) === true;
                // total_rows is authoritative when present. When the RPC predates
                // it, fall back to the manifest's declared count, and finally to
                // has_more alone -- so an older server still terminates.
                $target = $exportedTotal ?? $declared;
                $done = $target > 0 ? ($offset >= $target && !$hasMore) : !$hasMore;
                if ($done) {
                    break;
                }
                // Guard against a server that always reports has_more; without
                // this a bug upstream becomes an infinite loop that fills the disk.
                if (count($rows) > $this->maxRowsPerTable) {
                    throw new \RuntimeException(sprintf(
                        'table %s exceeded the export ceiling mid-pagination; aborting',
                        $table
                    ));
                }
            }

            // Cross-check against the manifest so a silently dropped page cannot
            // be recorded as a complete export of that table.
            if ($declared > 0 && count($rows) !== $declared) {
                throw new \RuntimeException(sprintf(
                    'table %s: manifest declared %d rows but export produced %d. '
                    . 'The backup would be incomplete, so it is being refused.',
                    $table,
                    $declared,
                    count($rows)
                ));
            }

            $path = $dbDir . '/' . $table . '.json';
            $json = json_encode(
                ['table' => $table, 'row_count' => count($rows), 'rows' => $rows],
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
            );
            if ($json === false) {
                throw new \RuntimeException(sprintf(
                    'cannot encode table %s as json: %s',
                    $table,
                    json_last_error_msg()
                ));
            }
            if (file_put_contents($path, $json) === false) {
                throw new \RuntimeException(sprintf('cannot write the export of %s', $table));
            }

            $rowCounts[$table] = count($rows);
            $totalRows += count($rows);
            $totalBytes += strlen($json);
            $written++;
        }

        if ($written === 0) {
            throw new \RuntimeException('no tables were exported; refusing to claim a database backup');
        }

        return [
            'tables'     => $written,
            'rows'       => $totalRows,
            'bytes'      => $totalBytes,
            'path'       => $dbDir,
            'row_counts' => $rowCounts,
        ];
    }

    /**
     * @return list<array{table:string,row_count:int}>
     */
    private function listTables(): array
    {
        $result = $this->client->rpc('export_manifest');
        $tables = $result['tables'] ?? [];
        if (!is_array($tables)) {
            return [];
        }
        $out = [];
        foreach ($tables as $t) {
            if (is_array($t) && isset($t['table'])) {
                $out[] = [
                    'table'     => (string) $t['table'],
                    'row_count' => (int) ($t['row_count'] ?? 0),
                ];
            }
        }
        return $out;
    }
}