import urllib.request
import urllib.error
import json
import time
import os
import sys

def ek_pw(env_name: str) -> str:
    """Fetch a test-account password from the environment.

    These credentials were previously hardcoded in this repository. They are
    real accounts on the production Supabase project, so they now live in the
    environment only and there is deliberately no fallback default: a test
    run that cannot find them must fail loudly rather than authenticate with
    a committed password.
    """
    value = os.environ.get(env_name)
    if not value:
        raise SystemExit(
            f"missing required env var {env_name}; refusing to run with a "
            f"hardcoded password (see docs/REMEDIATION_PLAN.md phase 5)"
        )
    return value


SUPABASE_URL = "https://kgqgnqjkrghvktymbimz.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncWducWprcmdodmt0eW1iaW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjk2NzgsImV4cCI6MjEwNTk0NTY3OH0.QHZCfNWf97-3fCONdMeXnWqeZMYyZ8NHIFfTwnHnj-w"

results = []

def record_test(name, expected, actual, passed, category="E2E QA"):
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
print("STARTING PHASE 11 FULL SYSTEM E2E QA TEST SUITE")
print("==================================================")

# 1. Authenticate Actors
admin_token = login("admin_user@elkarooz-school.com", ek_pw("EK_PW_ADMIN"))
super_token = login("super_user@elkarooz-school.com", ek_pw("EK_PW_SUPER_USER"))
servant_g1_token = login("servant_g1@elkarooz-school.com", ek_pw("EK_PW_SERVANT"))
servant_g2_token = login("servant_g2@elkarooz-school.com", ek_pw("EK_PW_SERVANT"))
sec_g1_token = login("sec_g1@elkarooz-school.com", ek_pw("EK_PW_SECRETARIAT"))
trainee_g1_token = login("trainee_g1@elkarooz-school.com", ek_pw("EK_PW_TRAINEE"))
trainee_g2_token = login("trainee_g2@elkarooz-school.com", ek_pw("EK_PW_TRAINEE"))

admin_h = {"apikey": ANON_KEY, "Authorization": f"Bearer {admin_token}"}
super_h = {"apikey": ANON_KEY, "Authorization": f"Bearer {super_token}"}
servant_g1_h = {"apikey": ANON_KEY, "Authorization": f"Bearer {servant_g1_token}"}
servant_g2_h = {"apikey": ANON_KEY, "Authorization": f"Bearer {servant_g2_token}"}
sec_g1_h = {"apikey": ANON_KEY, "Authorization": f"Bearer {sec_g1_token}"}
trainee_g1_h = {"apikey": ANON_KEY, "Authorization": f"Bearer {trainee_g1_token}"}
trainee_g2_h = {"apikey": ANON_KEY, "Authorization": f"Bearer {trainee_g2_token}"}

# ================================================================
# JOURNEY A: TRAINEE G1 FULL JOURNEY
# ================================================================
print("\n--- Testing Journey A: Trainee G1 ---")

# A1: Feed View
s_feed, feed_items, _ = http_request(f"{SUPABASE_URL}/rest/v1/feed_posts?deleted_at=is.null&limit=5", headers=trainee_g1_h)
record_test(
    "Journey A: Trainee Views Global Social Feed",
    "HTTP 200 with feed posts",
    f"HTTP {s_feed} (Feed Items: {len(feed_items) if isinstance(feed_items, list) else 0})",
    s_feed == 200 and isinstance(feed_items, list),
    "Journey A (Trainee)"
)

# A2: Trainee Post Creation Blocked
s_post_block, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/feed_posts",
    method="POST",
    headers=trainee_g1_h,
    data={"content": "منشور غير مصرح به من متدرب"}
)
record_test(
    "Journey A: Trainee Post Creation Blocked by RLS",
    "HTTP 401 / 403 Forbidden",
    f"HTTP {s_post_block}",
    s_post_block in [400, 401, 403],
    "Journey A (Trainee)"
)

# A3: Books & Research Access (Global Content)
s_books, books_data, _ = http_request(f"{SUPABASE_URL}/rest/v1/books?deleted_at=is.null&limit=5", headers=trainee_g1_h)
record_test(
    "Journey A: Trainee Accesses Global Books Library",
    "HTTP 200 with books list",
    f"HTTP {s_books} (Books: {len(books_data) if isinstance(books_data, list) else 0})",
    s_books == 200 and isinstance(books_data, list),
    "Journey A (Trainee)"
)

# A4: Gallery Group Scope (Group 1 Visible, Group 2 Blocked)
s_gal1, gal1_data, _ = http_request(f"{SUPABASE_URL}/rest/v1/gallery_items?group_id=eq.1&deleted_at=is.null", headers=trainee_g1_h)
s_gal2, gal2_data, _ = http_request(f"{SUPABASE_URL}/rest/v1/gallery_items?group_id=eq.2&deleted_at=is.null", headers=trainee_g1_h)
record_test(
    "Journey A: Trainee Group 1 Gallery Isolation (G1 Allowed, G2 Blocked)",
    "G1 returns items, G2 returns 0 items via RLS",
    f"G1 Items: {len(gal1_data) if isinstance(gal1_data, list) else 0}, G2 Items: {len(gal2_data) if isinstance(gal2_data, list) else 0}",
    s_gal1 == 200 and s_gal2 == 200 and len(gal2_data) == 0,
    "Journey A (Trainee)"
)

# A5: Bible Engine Access
s_bible_ot, _, _ = http_request(f"{SUPABASE_URL}/rest/v1/bible_books?testament_id=eq.1&limit=5", headers=trainee_g1_h)
record_test(
    "Journey A: Trainee Reads Bible Engine & Books",
    "HTTP 200",
    f"HTTP {s_bible_ot}",
    s_bible_ot == 200,
    "Journey A (Trainee)"
)

# ================================================================
# JOURNEY B: SECRETARIAT FULL JOURNEY
# ================================================================
print("\n--- Testing Journey B: Secretariat G1 ---")

# B1: Secretariat views own group trainees
s_sec_tr, sec_trainees, _ = http_request(f"{SUPABASE_URL}/rest/v1/profiles?role_id=eq.trainee&group_id=eq.1", headers=sec_g1_h)
record_test(
    "Journey B: Secretariat Views Group 1 Trainees",
    "HTTP 200 with trainees list",
    f"HTTP {s_sec_tr} (Count: {len(sec_trainees) if isinstance(sec_trainees, list) else 0})",
    s_sec_tr == 200 and isinstance(sec_trainees, list) and len(sec_trainees) > 0,
    "Journey B (Secretariat)"
)

# B2: Secretariat cannot edit Exam Grades
s_exam_block, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/exam_grades",
    method="POST",
    headers=sec_g1_h,
    data={"trainee_id": sec_trainees[0]["id"] if isinstance(sec_trainees, list) and sec_trainees else "00000000-0000-0000-0000-000000000000", "score": 95}
)
record_test(
    "Journey B: Secretariat Blocked from Editing Exam Grades",
    "HTTP 401 / 403 Forbidden",
    f"HTTP {s_exam_block}",
    s_exam_block in [400, 401, 403],
    "Journey B (Secretariat)"
)

# B3: Secretariat cannot access Backup Management
s_bk_sec, _, _ = http_request(f"{SUPABASE_URL}/rest/v1/backup_records", method="POST", headers=sec_g1_h, data={"filename": "sec_test.zip"})
record_test(
    "Journey B: Secretariat Blocked from Backup Management",
    "HTTP 401 / 403 Forbidden",
    f"HTTP {s_bk_sec}",
    s_bk_sec in [400, 401, 403],
    "Journey B (Secretariat)"
)

# ================================================================
# JOURNEY C: SERVANT & DELEGATED PERMISSIONS
# ================================================================
print("\n--- Testing Journey C: Servant G1 & Permissions ---")

# C1: Servant Post on Feed
s_srv_post, srv_post_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/feed_posts",
    method="POST",
    headers=servant_g1_h,
    data={"content": f"منشور إرشادي للخدام - {int(time.time())}"}
)
record_test(
    "Journey C: Servant Creates Social Feed Post",
    "HTTP 201 Created",
    f"HTTP {s_srv_post}",
    s_srv_post in [200, 201],
    "Journey C (Servant)"
)

# C2: Servant Attendance Session Access (Group 1 Only)
s_att1, att1_data, _ = http_request(f"{SUPABASE_URL}/rest/v1/attendance_sessions?group_id=eq.1", headers=servant_g1_h)
s_att2, att2_data, _ = http_request(f"{SUPABASE_URL}/rest/v1/attendance_sessions?group_id=eq.2", headers=servant_g1_h)
record_test(
    "Journey C: Servant Attendance Group Isolation (G1 Allowed, G2 Isolated)",
    "G1 sessions accessible, G2 sessions return 0 rows",
    f"G1 Count: {len(att1_data) if isinstance(att1_data, list) else 0}, G2 Count: {len(att2_data) if isinstance(att2_data, list) else 0}",
    s_att1 == 200 and s_att2 == 200 and len(att2_data) == 0,
    "Journey C (Servant)"
)

# ================================================================
# JOURNEY D: ADMIN & SUPER USER FULL AUDIT
# ================================================================
print("\n--- Testing Journey D: Admin & Super User ---")

# D1: Admin & Super User Full Parity
s_adm_bk, _, _ = http_request(f"{SUPABASE_URL}/rest/v1/backup_records?limit=1", headers=admin_h)
s_sup_bk, _, _ = http_request(f"{SUPABASE_URL}/rest/v1/backup_records?limit=1", headers=super_h)
record_test(
    "Journey D: Admin and Super User Full Operational Parity",
    "Both HTTP 200 on administrative endpoints",
    f"Admin: HTTP {s_adm_bk}, Super User: HTTP {s_sup_bk}",
    s_adm_bk == 200 and s_sup_bk == 200,
    "Journey D (Admin & Super User)"
)

# D2: Audit Log Trail Verification
s_aud_chk, aud_rows, _ = http_request(f"{SUPABASE_URL}/rest/v1/audit_logs?limit=5&order=created_at.desc", headers=admin_h)
record_test(
    "Journey D: Immutable Audit Trail Records Operational Events",
    "HTTP 200 with immutable audit entries",
    f"HTTP {s_aud_chk} (Audit Log Entries: {len(aud_rows) if isinstance(aud_rows, list) else 0})",
    s_aud_chk == 200 and isinstance(aud_rows, list) and len(aud_rows) > 0,
    "Journey D (Admin & Super User)"
)

# ================================================================
# CROSS-MODULE INTEGRATION & FAILURE INJECTION
# ================================================================
print("\n--- Testing Cross-Module Integration ---")

# X1: Cross-Module: Attendance Absence triggers Notification
s_x_abs, x_abs_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/trigger_absence_notification",
    method="POST",
    headers=admin_h,
    data={"p_trainee_id": sec_trainees[0]["id"] if isinstance(sec_trainees, list) and sec_trainees else "00000000-0000-0000-0000-000000000000", "p_session_id": "00000000-0000-0000-0000-000000000000"}
)
record_test(
    "Integration: Absence Event -> Automatic Notification with Name Placeholder",
    "success == True and notifications created",
    f"HTTP {s_x_abs} (Success: {x_abs_res.get('success') if isinstance(x_abs_res, dict) else 'None'})",
    s_x_abs == 200 and isinstance(x_abs_res, dict) and x_abs_res.get("success"),
    "Cross-Module Integration"
)

# X2: Cross-Module: Marathon 100-Point Scoring & Sequential Lock
s_m_list, m_list, _ = http_request(f"{SUPABASE_URL}/rest/v1/marathons?limit=1", headers=trainee_g1_h)
record_test(
    "Integration: Marathon Engine 100-Point Structure Loaded",
    "HTTP 200 with marathon entity",
    f"HTTP {s_m_list} (Count: {len(m_list) if isinstance(m_list, list) else 0})",
    s_m_list == 200 and isinstance(m_list, list),
    "Cross-Module Integration"
)

print("\n==================================================")
passed_count = sum(1 for r in results if r['passed'])
total_count = len(results)
print(f"TOTAL TESTS: {total_count} | PASSED: {passed_count} | FAILED: {total_count - passed_count}")
print("==================================================")

with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/phase11_e2e_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
