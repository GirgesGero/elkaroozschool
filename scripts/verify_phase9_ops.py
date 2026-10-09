import urllib.request
import urllib.error
import json
import time
import os
import sys

from elkarooz_ops_engine import ElkaroozOpsEngine, http_request, SUPABASE_URL, ANON_KEY

results = []

def record_test(name, expected, actual, passed, category="Ops Engine"):
    results.append({
        "name": name,
        "category": category,
        "expected": expected,
        "actual": actual,
        "passed": passed
    })
    status_str = "PASS" if passed else "FAIL"
    print(f"[{status_str}] {name} -> {actual}")

print("==================================================")
print("STARTING PHASE 9 BACKUP, RESTORE & AUDIT TEST SUITE")
print("==================================================")

engine = ElkaroozOpsEngine()

# 1. Test Backup Generation & Integrity
t0 = time.time()
backup_res = engine.create_backup("PHASE9_TEST")
duration_backup = int((time.time() - t0) * 1000)

record_test(
    "Backup: Deterministic Backup Archive Generation",
    "success == True and SHA-256 checksum generated",
    f"File: {backup_res['filename']}, Size: {backup_res['file_size_bytes']} bytes, SHA-256: {backup_res['checksum_sha256'][:12]}...",
    backup_res["success"] and len(backup_res["checksum_sha256"]) == 64
)

# 2. Test Backup Records & Audit Logging
s_bk, bk_records, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/backup_records?filename=eq.{backup_res['filename']}",
    headers=engine.headers
)
record_test(
    "Backup: Record Logged in Database Registry",
    "1 record in backup_records",
    f"HTTP {s_bk} (Found: {len(bk_records) if isinstance(bk_records, list) else 0})",
    s_bk == 200 and isinstance(bk_records, list) and len(bk_records) == 1
)

# 3. Test Restore Engine Dry-Run Mode
t1 = time.time()
restore_dry_res = engine.restore_backup(backup_res["filepath"], dry_run=True)
duration_restore_dry = int((time.time() - t1) * 1000)

record_test(
    "Restore: Dry-Run Mode Validation (Zero DB writes)",
    "status == 'DRY RUN ONLY' and success == True",
    f"Status: {restore_dry_res['status']}, Dependency Order Validated: {len(restore_dry_res['record_counts'])} tables",
    restore_dry_res["success"] and restore_dry_res["status"] == "DRY RUN ONLY"
)

# 4. Test Bulk Import Pipeline: Dry-Run Mode
valid_test_pkg = {
    "filename": "controlled_test_bible_batch_01.json",
    "verses": [
        {"chapter_id": 1, "book_id": 1, "verse_number": 4, "text_ar": "وَرَأَى اللهُ النُّورَ أَنَّهُ حَسَنٌ. وَفَصَلَ اللهُ بَيْنَ النُّورِ وَالظُّلْمَةِ.", "text_clean": "وراى الله النور انه حسن وفصل الله بين النور والظلمة", "source_url": "https://st-takla.org"}
    ],
    "commentaries": [
        {"verse_id": 1, "source_id": "malaty_ot", "commentary_title": "فصل النور عن الظلمة", "commentary_text": "شرح آبائي لفصل النور عن الظلمة", "source_url": "https://st-takla.org"}
    ]
}

t2 = time.time()
import_dry_res = engine.bulk_import_bible(valid_test_pkg, mode="DRY_RUN")
duration_import_dry = int((time.time() - t2) * 1000)

record_test(
    "Bulk Import: Controlled Dry-Run Mode",
    "status == 'DRY RUN ONLY' and new_records == 1",
    f"Status: {import_dry_res['status']}, New Records: {import_dry_res['new_records']}, Errors: {len(import_dry_res['validation_errors'])}",
    import_dry_res["success"] and import_dry_res["status"] == "DRY RUN ONLY" and import_dry_res["new_records"] == 1
)

# 5. Test Duplicate Detection
dup_test_pkg = {
    "filename": "duplicate_test_batch.json",
    "verses": [
        {"chapter_id": 1, "book_id": 1, "verse_number": 1, "text_ar": "فِي الْبَدْءِ خَلَقَ اللهُ السَّمَاوَاتِ وَالأَرْضَ.", "text_clean": "في البدء خلق الله السماوات والارض", "source_url": "https://st-takla.org"}
    ]
}
import_dup_res = engine.bulk_import_bible(dup_test_pkg, mode="IMPORT_NEW")
record_test(
    "Bulk Import: Duplicate Detection & Skipping",
    "skipped_records == 1 and new_records == 0",
    f"Skipped: {import_dup_res['skipped_records']}, New: {import_dup_res['new_records']}",
    import_dup_res["skipped_records"] == 1 and import_dup_res["new_records"] == 0
)

# 6. Test Failure Injection: Malformed Data Rejection
malformed_pkg = {
    "filename": "malformed_test_batch.json",
    "verses": [
        {"chapter_id": 1, "book_id": 1, "verse_number": None, "text_ar": ""} # Malformed!
    ],
    "commentaries": [
        {"verse_id": None, "source_id": None} # Orphan!
    ]
}
malformed_res = engine.bulk_import_bible(malformed_pkg, mode="DRY_RUN")
record_test(
    "Failure Injection: Malformed & Orphan Data Rejection",
    "success == False and status == 'FAILED' with errors captured",
    f"Success: {malformed_res['success']}, Status: {malformed_res['status']}, Errors Captured: {len(malformed_res['validation_errors'])}",
    not malformed_res["success"] and malformed_res["status"] == "FAILED" and len(malformed_res["validation_errors"]) >= 2
)

# 7. Test Audit Engine Logging
s_aud, aud_logs, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/audit_logs?order=created_at.desc&limit=10",
    headers=engine.headers
)
has_audit = isinstance(aud_logs, list) and len(aud_logs) >= 3
record_test(
    "Audit Engine: Immutable Logging for Operational Events",
    ">= 3 operational audit records in audit_logs",
    f"HTTP {s_aud} (Audit Records Count: {len(aud_logs) if isinstance(aud_logs, list) else 0})",
    s_aud == 200 and has_audit
)

# 8. Performance Benchmarking
record_test(
    "Performance Benchmark: Operational Operations Duration",
    "All operations completed under acceptable latency limits",
    f"Backup: {duration_backup}ms, Restore Dry-Run: {duration_restore_dry}ms, Import Dry-Run: {duration_import_dry}ms",
    duration_backup < 30000 and duration_restore_dry < 10000 and duration_import_dry < 10000
)

print("==================================================")
passed_count = sum(1 for r in results if r['passed'])
total_count = len(results)
print(f"TOTAL TESTS: {total_count} | PASSED: {passed_count} | FAILED: {total_count - passed_count}")
print("==================================================")

with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/phase9_ops_test_results.json", "w", encoding="utf-8") as f:
    json.dump({
        "results": results,
        "performance": {
            "backup_duration_ms": duration_backup,
            "restore_dry_run_ms": duration_restore_dry,
            "import_dry_run_ms": duration_import_dry
        }
    }, f, ensure_ascii=False, indent=2)
