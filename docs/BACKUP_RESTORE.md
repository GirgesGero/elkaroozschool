# Backup & Disaster Recovery Architecture
===========================================

## 1. Scope of Full System Backup

A valid system backup archive (`.zip`) includes:
1. `database.json`: Complete serialized export of all public database tables.
2. `manifest.json`: Cryptographic integrity manifest, row counts, export timestamps, and schema version.
3. `media/`: Export of local scratch and Google Drive media inventory referenced by `media_assets`.

## 2. Backup Execution Flow (`POST /backup/create`)

- Gated strictly to `admin` and `super_user`.
- Dumps database tables through `DatabaseExportService` in memory-bounded pagination slices.
- Packages files into a secure ZIP archive inside `/home/[USER]/storage/backups/`.
- Registers entry in `public.backup_history`.

## 3. Atomic Restore Flow (`POST /restore/execute`)

- Requires explicit two-step preview and confirmation.
- Extracts `database.json` and runs within a single atomic PostgreSQL transaction.
- If any table insertion fails, the transaction rolls back completely and restores the pre-restore safety snapshot.
- Zero data loss or partial overwrite states.
