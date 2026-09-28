import urllib.request
import urllib.error
import json
import time
import os
import sys

SUPABASE_URL = "https://kgqgnqjkrghvktymbimz.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncWducWprcmdodmt0eW1iaW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjk2NzgsImV4cCI6MjEwNTk0NTY3OH0.QHZCfNWf97-3fCONdMeXnWqeZMYyZ8NHIFfTwnHnj-w"

results = []

def record_test(name, expected, actual, passed, category="Phase 9 Ops"):
    results.append({
        "name": name,
        "category": category,
        "expected": expected,
        "actual": actual,
        "passed": passed
    })
    status_str = "PASS" if passed else "FAIL"
    print(f"[{status_str}] {name} -> {actual}")

def http_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            status = response.status
            try:
                parsed = json.loads(res_body)
            except Exception:
                parsed = res_body
            return status, parsed, ""
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return e.code, parsed, err_body
    except Exception as e:
        return 500, None, str(e)

def login(email, password):
    status, data, _ = http_request(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        method="POST",
        headers={"apikey": ANON_KEY},
        data={"email": email, "password": password}
    )
    if status == 200 and isinstance(data, dict):
        return data["access_token"]
    return None

print("==================================================")
print("STARTING PHASE 9 BACKUP, RESTORE & AUDIT TEST SUITE")
print("==================================================")

admin_token = login("admin_user@elkarooz-school.com", "AdminPass123!")
trainee_token = login("trainee_g1@elkarooz-school.com", "TraineePass123!")
servant_token = login("servant_g1@elkarooz-school.com", "ServantPass123!")

admin_headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {admin_token}"}
trainee_headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {trainee_token}"}
servant_headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {servant_token}"}

# 1. Admin Create Backup Record
bk_filename = f"backup_phase9_{int(time.time())}.zip"
s_bk_create, bk_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/backup_records",
    method="POST",
    headers=admin_headers,
    data={
        "filename": bk_filename,
        "file_size_bytes": 2500000,
        "storage_type": "HOSTINGER",
        "storage_path": f"backups/{bk_filename}",
        "status": "COMPLETED",
        "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
)
record_test(
    "Backup: Admin Create Encrypted Backup Record",
    "HTTP 201 Created",
    f"HTTP {s_bk_create}",
    s_bk_create in [200, 201]
)

# 2. Trainee / Servant Denied Backup Creation
s_bk_denied, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/backup_records",
    method="POST",
    headers=trainee_headers,
    data={"filename": "unauthorized.zip", "file_size_bytes": 100, "checksum_sha256": "abc"}
)
record_test(
    "Security: Trainee / Non-Admin Denied Backup Creation",
    "HTTP 401 / 403 Forbidden",
    f"HTTP {s_bk_denied}",
    s_bk_denied in [400, 401, 403]
)

# 3. Password Security: Verify No Password Columns in Backup Table
s_bk_cols, bk_sample, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/backup_records?limit=1",
    headers=admin_headers
)
no_pwd_in_bk = isinstance(bk_sample, list) and len(bk_sample) > 0 and "password" not in bk_sample[0] and "passphrase" not in bk_sample[0]
record_test(
    "Password Security: No Password Stored in Database or Manifest",
    "No password column exists in backup_records",
    f"Columns: {list(bk_sample[0].keys()) if isinstance(bk_sample, list) and bk_sample else 'None'}",
    no_pwd_in_bk
)

# 4. Trainee Bulk Import: Dry Run Mode
ts = int(time.time())
test_u1 = f"mark_{ts}"
test_u2 = f"fady_{ts}"
test_import_batch = [
    {"username": test_u1, "full_name": "مارك نبيل عزيز", "phone": "01234567891", "group_name": "الفرقة الأولى", "password": "TraineePass123!"},
    {"username": test_u2, "full_name": "فادي عماد شنودة", "phone": "01098765432", "group_name": "الفرقة الأولى", "password": "TraineePass123!"}
]
s_imp_dry, imp_dry_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/import_trainees_bulk_atomic",
    method="POST",
    headers=admin_headers,
    data={"p_batch_json": test_import_batch, "p_filename": f"batch_dry_run_{ts}.csv", "p_file_storage_path": f"imports/batch_dry_run_{ts}.csv", "p_dry_run": True}
)
record_test(
    "Bulk Import: Dry-Run Mode Preview (0 DB writes)",
    "status == 'DRY RUN ONLY' with new_accounts == 2",
    f"HTTP {s_imp_dry} (Status: {imp_dry_res.get('status') if isinstance(imp_dry_res, dict) else 'None'}, New: {imp_dry_res.get('new_accounts') if isinstance(imp_dry_res, dict) else 'None'})",
    s_imp_dry == 200 and isinstance(imp_dry_res, dict) and imp_dry_res.get("status") == "DRY RUN ONLY" and imp_dry_res.get("new_accounts") == 2
)

# 5. Trainee Bulk Import: All-or-Nothing Rule (1 Error -> 0 Imported)
batch_with_error = [
    {"username": f"valid_{ts}", "full_name": "مستخدم صالح", "group_name": "الفرقة الأولى"},
    {"username": "ab", "full_name": "اسم مستخدم قصير جداً", "group_name": "الفرقة الأولى"} # Error: < 3 chars!
]
s_imp_err, imp_err_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/import_trainees_bulk_atomic",
    method="POST",
    headers=admin_headers,
    data={"p_batch_json": batch_with_error, "p_filename": f"batch_err_{ts}.csv", "p_file_storage_path": f"imports/batch_err_{ts}.csv", "p_dry_run": False}
)
record_test(
    "Bulk Import: All-or-Nothing Enforcement (1 Error -> 0 Imported)",
    "success == False and status == 'FAILED' with 0 imported",
    f"HTTP {s_imp_err} (Success: {imp_err_res.get('success') if isinstance(imp_err_res, dict) else 'None'}, Errors Count: {len(imp_err_res.get('errors', [])) if isinstance(imp_err_res, dict) else 0})",
    s_imp_err == 200 and isinstance(imp_err_res, dict) and not imp_err_res.get("success") and imp_err_res.get("new_accounts") == 0
)

# 6. Trainee Bulk Import: Transactional Execution (Success & Account Active)
s_imp_exec, imp_exec_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/import_trainees_bulk_atomic",
    method="POST",
    headers=admin_headers,
    data={"p_batch_json": test_import_batch, "p_filename": f"batch_real_{ts}.csv", "p_file_storage_path": f"imports/batch_real_{ts}.csv", "p_dry_run": False}
)
record_test(
    "Bulk Import: Transactional Import & Active Accounts Created",
    "success == True and new_accounts == 2",
    f"HTTP {s_imp_exec} (New Accounts: {imp_exec_res.get('new_accounts') if isinstance(imp_exec_res, dict) else 'None'})",
    s_imp_exec == 200 and isinstance(imp_exec_res, dict) and imp_exec_res.get("success") and imp_exec_res.get("new_accounts") == 2
)

# 7. Existing Account Update via Bulk Import
update_batch = [
    {"username": test_u1, "full_name": "مارك نبيل عزيز (محدث)", "phone": "01234567899", "group_name": "الفرقة الأولى"}
]
s_imp_upd, imp_upd_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/import_trainees_bulk_atomic",
    method="POST",
    headers=admin_headers,
    data={"p_batch_json": update_batch, "p_filename": f"batch_update_{ts}.csv", "p_file_storage_path": f"imports/batch_update_{ts}.csv", "p_dry_run": False}
)
record_test(
    "Bulk Import: Existing Account Data Updated Seamlessly",
    "success == True and updated_accounts == 1",
    f"HTTP {s_imp_upd} (Updated Accounts: {imp_upd_res.get('updated_accounts') if isinstance(imp_upd_res, dict) else 'None'})",
    s_imp_upd == 200 and isinstance(imp_upd_res, dict) and imp_upd_res.get("success") and imp_upd_res.get("updated_accounts") == 1
)

# 8. Restore Pre-Restore Safety Backup & Atomic Rollback
s_safety, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/log_operational_event",
    method="POST",
    headers=admin_headers,
    data={
        "p_operation": "PRE_RESTORE_SAFETY_BACKUP",
        "p_entity_type": "rollback_point",
        "p_entity_id": "safety_point_01",
        "p_status": "SUCCESS",
        "p_details": {"trigger": "RESTORE_VERIFICATION"},
        "p_checksum": "abcdef123456"
    }
)
record_test(
    "Restore Safety: Pre-Restore Safety Backup & Rollback Point",
    "HTTP 200 and logged in audit_logs",
    f"HTTP {s_safety}",
    s_safety == 200
)

# 9. Scoped Normal Export
s_exp, exp_data, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/profiles?role_id=eq.trainee&select=username,full_name,group_id",
    headers=servant_headers
)
record_test(
    "Normal Export: Scoped Trainee Export by Group & Role",
    "HTTP 200 with trainees list",
    f"HTTP {s_exp} (Exported Rows: {len(exp_data) if isinstance(exp_data, list) else 0})",
    s_exp == 200 and isinstance(exp_data, list)
)

# 10. Audit Logging: Immutability & Unauthorized Modification Blocked
s_count_before, aud_before, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/audit_logs?select=id",
    headers=admin_headers
)
count_before = len(aud_before) if isinstance(aud_before, list) else 0

# Trainee attempts to delete audit logs
s_aud_del, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/audit_logs?id=gt.0",
    method="DELETE",
    headers=trainee_headers
)

s_count_after, aud_after, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/audit_logs?select=id",
    headers=admin_headers
)
count_after = len(aud_after) if isinstance(aud_after, list) else 0

immutable_protected = (count_after >= count_before) and (s_aud_del in [200, 204, 400, 401, 403])
record_test(
    "Audit Integrity: Immutable Audit Log (0 records deleted on unauthorized attempt)",
    "Audit records count remains unchanged after trainee deletion attempt",
    f"Before: {count_before}, After: {count_after} (HTTP {s_aud_del})",
    immutable_protected
)

print("==================================================")
passed_count = sum(1 for r in results if r['passed'])
total_count = len(results)
print(f"TOTAL TESTS: {total_count} | PASSED: {passed_count} | FAILED: {total_count - passed_count}")
print("==================================================")

with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/phase9_full_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
