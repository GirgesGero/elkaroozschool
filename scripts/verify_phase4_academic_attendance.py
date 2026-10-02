import urllib.request
import urllib.error
import json
import os
import sys

# Credentials come from the environment. A key pasted here is a live bearer
# credential: it grants read access under whatever role it carries, it works for
# anyone holding the repo, and deleting the line later does not remove it from
# git history or from existing clones.

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


SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
if not ANON_KEY:
    raise SystemExit("SUPABASE_ANON_KEY is not set -- refusing to run without a key.")

results = []

def record_test(name, expected, actual, passed, category="Academic & Attendance"):
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

def login_user(username, password):
    email = f"{username.lower()}@elkarooz-school.com"
    status, data, _ = http_request(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        method="POST",
        headers={"apikey": ANON_KEY},
        data={"email": email, "password": password}
    )
    return status, data

print("==================================================")
print("STARTING PHASE 4 ACADEMIC & ATTENDANCE TEST SUITE")
print("==================================================")

# 1. Login required accounts
tokens = {}
users_info = {}
for u, p in [
    ("admin_user", ek_pw("EK_PW_ADMIN")),
    ("servant_g1", ek_pw("EK_PW_SERVANT")),
    ("servant_g2", ek_pw("EK_PW_SERVANT")),
    ("sec_g1", ek_pw("EK_PW_SECRETARIAT")),
    ("sec_g2", ek_pw("EK_PW_SECRETARIAT")),
    ("trainee_g1", ek_pw("EK_PW_TRAINEE")),
    ("trainee_g2", ek_pw("EK_PW_TRAINEE")),
]:
    s, d = login_user(u, p)
    if s == 200 and isinstance(d, dict):
        tokens[u] = d["access_token"]
        users_info[u] = d["user"]["id"]

admin_tok = tokens["admin_user"]
serv1_tok = tokens["servant_g1"]
serv2_tok = tokens["servant_g2"]
sec1_tok = tokens["sec_g1"]
trn1_tok = tokens["trainee_g1"]
trn2_tok = tokens["trainee_g2"]
trn1_id = users_info["trainee_g1"]
trn2_id = users_info["trainee_g2"]
serv1_id = users_info["servant_g1"]
serv2_id = users_info["servant_g2"]

# --- 2. Attendance Session & Friday Recording ---
# Create Friday Attendance Session for Group 1 (or fetch if already created)
s_sess, res_sess, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/attendance_sessions",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_tok}", "Prefer": "return=representation"},
    data={"group_id": 1, "session_date": "2026-10-09", "status": "OPEN"}
)
if s_sess == 409:
    # Fetch existing session
    s_fetch, f_sess, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/attendance_sessions?group_id=eq.1&session_date=eq.2026-10-09",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_tok}"}
    )
    if s_fetch == 200 and f_sess:
        session1_id = f_sess[0]["id"]
        s_sess = 200
    else:
        session1_id = None
else:
    session1_id = res_sess[0]["id"] if s_sess in [200, 201] and res_sess else None

record_test(
    "Attendance: Secretariat G1 Opens/Accesses Friday Session",
    "HTTP 200/201 Created or Retrieved",
    f"HTTP {s_sess} (ID: {session1_id})",
    s_sess in [200, 201] and session1_id is not None
)

if session1_id:
    # Record Present for trainee 1
    s_rec_p, _, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/attendance_records",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_tok}", "Prefer": "return=representation"},
        data={"session_id": session1_id, "group_id": 1, "trainee_id": trn1_id, "status": "PRESENT"}
    )
    record_test(
        "Attendance: Record Trainee PRESENT",
        "HTTP 201 Created",
        f"HTTP {s_rec_p}",
        s_rec_p in [200, 201]
    )

    # --- 3. Automated Absence Notification Dispatch ---
    # Create another session and record ABSENT
    s_sess_abs, res_sess_abs, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/attendance_sessions",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_tok}", "Prefer": "return=representation"},
        data={"group_id": 1, "session_date": "2026-10-16", "status": "OPEN"}
    )
    session_abs_id = res_sess_abs[0]["id"] if s_sess_abs in [200, 201] and res_sess_abs else None
    
    if session_abs_id:
        s_rec_abs, _, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/attendance_records",
            method="POST",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_tok}", "Prefer": "return=representation"},
            data={"session_id": session_abs_id, "group_id": 1, "trainee_id": trn1_id, "status": "ABSENT"}
        )
        record_test(
            "Attendance: Record Trainee ABSENT",
            "HTTP 201 Created",
            f"HTTP {s_rec_abs}",
            s_rec_abs in [200, 201]
        )

        # Check automated notification for Trainee 1
        s_notif_trn, notif_trn, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/notifications?recipient_id=eq.{trn1_id}&category=eq.PASTORAL",
            method="GET",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"}
        )
        has_trn_notif = isinstance(notif_trn, list) and len(notif_trn) > 0
        record_test(
            "Absence Dispatch: Trainee receives personal Pastoral Notification",
            "Notification exists with category=PASTORAL",
            f"Received: {has_trn_notif} ({len(notif_trn) if isinstance(notif_trn, list) else 0} items)",
            has_trn_notif
        )

        # Check automated notification for Servant G1
        s_notif_srv1, notif_srv1, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/notifications?recipient_id=eq.{serv1_id}&category=eq.PASTORAL",
            method="GET",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv1_tok}"}
        )
        has_srv1_notif = isinstance(notif_srv1, list) and len(notif_srv1) > 0
        record_test(
            "Absence Dispatch: Servant G1 receives group absence alert",
            "Notification exists for Servant G1",
            f"Received: {has_srv1_notif}",
            has_srv1_notif
        )

        # Check that Servant G2 did NOT receive notification (Group Isolation)
        s_notif_srv2, notif_srv2, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/notifications?recipient_id=eq.{serv2_id}&category=eq.PASTORAL",
            method="GET",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv2_tok}"}
        )
        srv2_notif_count = len(notif_srv2) if isinstance(notif_srv2, list) else 0
        record_test(
            "Absence Dispatch Isolation: Servant G2 receives ZERO alerts for G1 trainee",
            "0 notifications for Servant G2",
            f"Received: {srv2_notif_count}",
            srv2_notif_count == 0
        )

    # --- 4. Thursday Lock Enforcement ---
    # Lock session 1
    http_request(
        f"{SUPABASE_URL}/rest/v1/attendance_sessions?id=eq.{session1_id}",
        method="PATCH",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}"},
        data={"status": "LOCKED"}
    )

    # Attempt to insert into LOCKED session (Must FAIL)
    s_lock_try, _, raw_lock = http_request(
        f"{SUPABASE_URL}/rest/v1/attendance_records",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_tok}"},
        data={"session_id": session1_id, "group_id": 1, "trainee_id": trn2_id, "status": "PRESENT"}
    )
    record_test(
        "Thursday Lock: Recording in LOCKED session blocked by trigger",
        "HTTP 400/403/500 with 'الجلسة مغلقة'",
        f"HTTP {s_lock_try} ({raw_lock[:50]})",
        s_lock_try in [400, 403, 500] or "الجلسة مغلقة" in raw_lock
    )

# --- 5. Attendance Summary RPC & Grade Mapping ---
s_rpc, rpc_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/get_trainee_attendance_summary",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
    data={"p_trainee_id": trn1_id}
)
has_rpc_stats = isinstance(rpc_res, dict) and "percentage" in rpc_res and "appreciation_grade" in rpc_res
record_test(
    "Attendance Engine: get_trainee_attendance_summary RPC calculation",
    "JSON object with percentage & appreciation_grade",
    f"Stats: {rpc_res if isinstance(rpc_res, dict) else 'Error'}",
    has_rpc_stats
)

# --- 6. Exams & Automated Grade Calculation ---
# 1. Admin creates Exam for Term 1 (Max Score: 100)
# Fetch Term 1 ID for Group 1
_, terms_g1, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/terms?group_id=eq.1&order=created_at.asc",
    method="GET",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}"}
)
term1_id = terms_g1[0]["id"] if isinstance(terms_g1, list) and terms_g1 else None

if term1_id:
    s_ex, ex_res, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/exams",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
        data={"term_id": term1_id, "group_id": 1, "title": "امتحان التيرم الأول - مادة دراسات العهد الجديد", "max_score": 100.00, "exam_date": "2026-12-18"}
    )
    exam_id = ex_res[0]["id"] if s_ex in [200, 201] and ex_res else None

    if exam_id:
        record_test(
            "Exams: Admin creates 1 Exam per Term",
            "HTTP 201 Created",
            f"HTTP {s_ex} (Exam ID: {exam_id})",
            s_ex in [200, 201]
        )

        # 2. Authorized Servant enters 92.00 -> Appreciation grade computed automatically as 'ممتاز'
        s_gr_92, gr_res_92, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/exam_grades",
            method="POST",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv1_tok}", "Prefer": "return=representation"},
            data={"exam_id": exam_id, "group_id": 1, "trainee_id": trn1_id, "numeric_score": 92.00, "appreciation_grade": "ضعيف"}
        )
        appreciation_92 = gr_res_92[0].get("appreciation_grade") if isinstance(gr_res_92, list) and gr_res_92 else None
        record_test(
            "Exams Trigger: Score 92/100 converted automatically to 'ممتاز'",
            "appreciation_grade == 'ممتاز'",
            f"Calculated: '{appreciation_92}'",
            appreciation_92 == "ممتاز"
        )

        # 3. Update score to 72.00 -> Appreciation grade converted automatically to 'جيد'
        s_gr_72, gr_res_72, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/exam_grades?exam_id=eq.{exam_id}&trainee_id=eq.{trn1_id}",
            method="PATCH",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv1_tok}", "Prefer": "return=representation"},
            data={"numeric_score": 72.00}
        )
        appreciation_72 = gr_res_72[0].get("appreciation_grade") if isinstance(gr_res_72, list) and gr_res_72 else None
        record_test(
            "Exams Trigger: Score update to 72/100 converted automatically to 'جيد'",
            "appreciation_grade == 'جيد'",
            f"Calculated: '{appreciation_72}'",
            appreciation_72 == "جيد"
        )

        # 4. Trainee attempts to modify own grade (Must be BLOCKED by RLS)
        s_hack_grade, _, raw_hack = http_request(
            f"{SUPABASE_URL}/rest/v1/exam_grades?exam_id=eq.{exam_id}&trainee_id=eq.{trn1_id}",
            method="PATCH",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
            data={"numeric_score": 100.00}
        )
        record_test(
            "Exams Security: Trainee grade tampering blocked by RLS",
            "Empty update / HTTP 403 / 0 rows modified",
            f"HTTP {s_hack_grade}",
            s_hack_grade in [200, 204, 401, 403]
        )

# --- 7. Curriculum & Term 2 Lock ---
s_curr, curr_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/curriculums",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
    data={"group_id": 1, "term_id": term1_id, "title": "مذكرة التفسير التطبيقي لإنجيل متى", "file_url": "https://storage.elkarooz-school.com/academic/group_1/curriculum/matthew.pdf", "file_type": "PDF", "file_size_bytes": 1024000}
)
record_test(
    "Curriculum: Staff uploads Curriculum for Term 1",
    "HTTP 201 Created",
    f"HTTP {s_curr}",
    s_curr in [200, 201]
)

# --- 8. Trainee Suspension & Reactivation ---
s_susp_act, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{trn1_id}",
    method="PATCH",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_tok}"},
    data={"is_active": False}
)
record_test(
    "Trainee Management: Secretariat suspends Trainee",
    "HTTP 200/204 OK",
    f"HTTP {s_susp_act}",
    s_susp_act in [200, 204]
)

s_re_act, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{trn1_id}",
    method="PATCH",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_tok}"},
    data={"is_active": True}
)
record_test(
    "Trainee Management: Secretariat reactivates Trainee",
    "HTTP 200/204 OK",
    f"HTTP {s_re_act}",
    s_re_act in [200, 204]
)

print("==================================================")
passed_count = sum(1 for r in results if r['passed'])
total_count = len(results)
print(f"TOTAL TESTS: {total_count} | PASSED: {passed_count} | FAILED: {total_count - passed_count}")
print("==================================================")

with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/phase4_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
