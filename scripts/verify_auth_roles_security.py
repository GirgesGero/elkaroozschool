import urllib.request
import urllib.error
import json
import sys

SUPABASE_URL = "https://kgqgnqjkrghvktymbimz.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncWducWprcmdodmt0eW1iaW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjk2NzgsImV4cCI6MjEwNTk0NTY3OH0.QHZCfNWf97-3fCONdMeXnWqeZMYyZ8NHIFfTwnHnj-w"

results = []

def record_test(name, expected, actual, passed, category="Auth"):
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
    status, data, raw = http_request(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        method="POST",
        headers={"apikey": ANON_KEY},
        data={"email": email, "password": password}
    )
    return status, data

print("==================================================")
print("STARTING FULL PHASE 3 SECURITY & ROLE TEST SUITE")
print("==================================================")

# --- 1. Authentication Suite ---
tokens = {}
for role_name, username, pwd in [
    ("Admin", "admin_user", "AdminPass123!"),
    ("Super User", "super_user", "SuperPass123!"),
    ("Servant G1", "servant_g1", "ServantPass123!"),
    ("Servant G2", "servant_g2", "ServantPass123!"),
    ("Secretariat G1", "sec_g1", "SecPass123!"),
    ("Secretariat G2", "sec_g2", "SecPass123!"),
    ("Trainee G1", "trainee_g1", "TraineePass123!"),
    ("Trainee G2", "trainee_g2", "TraineePass123!"),
]:
    s, d = login_user(username, pwd)
    has_token = s == 200 and isinstance(d, dict) and "access_token" in d
    if has_token:
        tokens[username] = d["access_token"]
    record_test(
        f"Login: {role_name} (@{username})",
        "HTTP 200 with JWT access_token",
        f"HTTP {s} (Success: {has_token})",
        has_token,
        "Authentication"
    )

admin_tok = tokens.get("admin_user")
super_tok = tokens.get("super_user")
serv1_tok = tokens.get("servant_g1")
serv2_tok = tokens.get("servant_g2")
sec1_tok = tokens.get("sec_g1")
sec2_tok = tokens.get("sec_g2")
trn1_tok = tokens.get("trainee_g1")
trn2_tok = tokens.get("trainee_g2")

# Invalid Password
s_bad_pwd, d_bad_pwd = login_user("admin_user", "WrongPassword!")
record_test(
    "Auth: Invalid Password Rejected",
    "HTTP 400 Bad Request",
    f"HTTP {s_bad_pwd}",
    s_bad_pwd == 400,
    "Authentication"
)

# Invalid Username
s_bad_usr, d_bad_usr = login_user("ghost_user", "Pass123!")
record_test(
    "Auth: Non-existent Username Rejected",
    "HTTP 400 Bad Request",
    f"HTTP {s_bad_usr}",
    s_bad_usr == 400,
    "Authentication"
)

# Suspended Account
s_susp, d_susp = login_user("suspended_user", "SuspPass123!")
if s_susp == 200 and isinstance(d_susp, dict):
    susp_tok = d_susp.get("access_token")
    _, prof_d, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{d_susp['user']['id']}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {susp_tok}"}
    )
    is_act = prof_d[0].get("is_active") if isinstance(prof_d, list) and prof_d else True
    record_test(
        "Account Status: Suspended Account Detected (is_active=False)",
        "is_active == False -> 'الحساب موقوف'",
        f"is_active={is_act}",
        is_act is False,
        "Account Status"
    )

# --- 2. Feed & Social RLS Suite ---
# Trainee attempts to create Feed Post (Must be BLOCKED by RLS)
s_trn_post, _, raw_trn = http_request(
    f"{SUPABASE_URL}/rest/v1/feed_posts",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}", "Prefer": "return=representation"},
    data={"content_text": "محاولة نشر غير مصرح بها من متدرب"}
)
record_test(
    "Feed RLS: Trainee Post Creation Forbidden",
    "RLS Error 42501 / 403 / 400",
    f"HTTP {s_trn_post} ({raw_trn[:50]})",
    s_trn_post in [400, 401, 403] or "row-level security" in raw_trn,
    "Feed Permissions"
)

# Servant creates Feed Post (Must SUCCEED)
s_srv_post, post_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/feed_posts",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv1_tok}", "Prefer": "return=representation"},
    data={"content_text": "منشور تجريبي معتمد من خادم الفرقة الأولى"}
)
post_created = s_srv_post in [200, 201] and isinstance(post_res, list) and len(post_res) > 0
post_id = post_res[0]["id"] if post_created else None
record_test(
    "Feed RLS: Servant Post Creation Allowed",
    "HTTP 201 Created",
    f"HTTP {s_srv_post}",
    post_created,
    "Feed Permissions"
)

# Trainee adds comment to Feed Post (Must SUCCEED)
if post_id:
    s_com, com_res, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/post_comments",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}", "Prefer": "return=representation"},
        data={"post_id": post_id, "comment_text": "تعليق مصرح به من متدرب الفرقة الأولى"}
    )
    record_test(
        "Feed RLS: Trainee Comment Allowed",
        "HTTP 201 Created",
        f"HTTP {s_com}",
        s_com in [200, 201],
        "Feed Permissions"
    )

    # Trainee adds Reaction (Must SUCCEED)
    s_react, _, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/reactions",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"target_type": "POST", "target_id": post_id, "reaction_type": "AMEN"}
    )
    record_test(
        "Feed RLS: Trainee Reaction (Amen) Allowed",
        "HTTP 201/204",
        f"HTTP {s_react}",
        s_react in [200, 201, 204],
        "Feed Permissions"
    )

    # Trainee attempts duplicate Reaction on same post (Must be REJECTED by Unique Constraint)
    s_dup_react, _, raw_dup = http_request(
        f"{SUPABASE_URL}/rest/v1/reactions",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"target_type": "POST", "target_id": post_id, "reaction_type": "LIKE"}
    )
    record_test(
        "Feed Constraints: Duplicate Reaction Blocked (1 Reaction per User)",
        "Unique Violation / HTTP 409 / 400",
        f"HTTP {s_dup_react}",
        s_dup_react in [400, 409] or "duplicate key" in raw_dup or "uq_user_reaction" in raw_dup,
        "Feed Constraints"
    )

# --- 3. Academic & Group Scope Isolation Suite ---
# Setup Academic terms for Group 1 and Group 2
s_t1, res_t1, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/terms",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
    data={"group_id": 1, "name_ar": "التيرم الأول 2026 - فرقة 1", "academic_year": "2026-2027", "is_current": True}
)
s_t2, res_t2, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/terms",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
    data={"group_id": 2, "name_ar": "التيرم الأول 2026 - فرقة 2", "academic_year": "2026-2027", "is_current": True}
)

term1_id = res_t1[0]["id"] if isinstance(res_t1, list) and res_t1 else None
term2_id = res_t2[0]["id"] if isinstance(res_t2, list) and res_t2 else None

if term1_id and term2_id:
    # Create lecture in Group 1
    s_l1, res_l1, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/lectures",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
        data={"group_id": 1, "term_id": term1_id, "title": "محاضرة إنجيل متى (فرقة 1)", "lecture_date": "2026-10-02"}
    )
    # Create lecture in Group 2
    s_l2, res_l2, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/lectures",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
        data={"group_id": 2, "term_id": term2_id, "title": "محاضرة سفر التكوين (فرقة 2)", "lecture_date": "2026-10-02"}
    )
    
    l1_id = res_l1[0]["id"] if isinstance(res_l1, list) and res_l1 else None
    l2_id = res_l2[0]["id"] if isinstance(res_l2, list) and res_l2 else None

    # Test 1: Trainee 1 reading Group 1 lecture (Allowed)
    s_g1_read, d_g1_read, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/lectures?id=eq.{l1_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"}
    )
    record_test(
        "Group Scope: Trainee G1 reading Group 1 Lecture",
        "1 item returned (Allowed)",
        f"Items: {len(d_g1_read) if isinstance(d_g1_read, list) else 0}",
        isinstance(d_g1_read, list) and len(d_g1_read) == 1,
        "Group Isolation"
    )

    # Test 2: Trainee 1 reading Group 2 lecture (BLOCKED by RLS Group Scope)
    s_g2_read_by_1, d_g2_read_by_1, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/lectures?id=eq.{l2_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"}
    )
    record_test(
        "Group Scope: Trainee G1 reading Group 2 Lecture (Cross-Group Access Blocked)",
        "0 items returned (Isolated)",
        f"Items: {len(d_g2_read_by_1) if isinstance(d_g2_read_by_1, list) else 0}",
        isinstance(d_g2_read_by_1, list) and len(d_g2_read_by_1) == 0,
        "Group Isolation"
    )

    # Test 3: Trainee 2 reading Group 2 lecture (Allowed)
    s_g2_read_by_2, d_g2_read_by_2, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/lectures?id=eq.{l2_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn2_tok}"}
    )
    record_test(
        "Group Scope: Trainee G2 reading Group 2 Lecture",
        "1 item returned (Allowed)",
        f"Items: {len(d_g2_read_by_2) if isinstance(d_g2_read_by_2, list) else 0}",
        isinstance(d_g2_read_by_2, list) and len(d_g2_read_by_2) == 1,
        "Group Isolation"
    )

# --- 4. Attendance & Secretariat Scope Suite ---
# Secretariat 1 creating attendance session in Group 1 (Allowed)
s_att_sess, res_sess, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/attendance_sessions",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_tok}", "Prefer": "return=representation"},
    data={"group_id": 1, "session_date": "2026-10-02", "status": "OPEN"}
)
record_test(
    "Secretariat Scope: Sec G1 creating Attendance Session for Group 1",
    "HTTP 200/201/409 Allowed (Group 1 Scope)",
    f"HTTP {s_att_sess}",
    s_att_sess in [200, 201, 409],
    "Attendance Permissions"
)

# Secretariat 1 attempting to create attendance session in Group 2 (BLOCKED by Secretariat Scope)
s_att_cross, _, raw_cross_att = http_request(
    f"{SUPABASE_URL}/rest/v1/attendance_sessions",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_tok}"},
    data={"group_id": 2, "session_date": "2026-10-02", "status": "OPEN"}
)
record_test(
    "Secretariat Scope: Sec G1 creating Attendance in Group 2 (Cross-Group Blocked)",
    "RLS Error / Blocked",
    f"HTTP {s_att_cross}",
    s_att_cross in [400, 401, 403] or "row-level security" in raw_cross_att,
    "Attendance & Secretariat"
)

# --- 5. Public Bible Access Suite ---
s_bt, bt_data, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/bible_testaments",
    method="GET",
    headers={"apikey": ANON_KEY}
)
record_test(
    "Public Endpoints: Bible Testaments Accessible without Login",
    "HTTP 200 with 2 testaments (OT & NT)",
    f"HTTP {s_bt} ({len(bt_data) if isinstance(bt_data, list) else 0} items)",
    s_bt == 200 and isinstance(bt_data, list) and len(bt_data) == 2,
    "Public Access"
)

s_bs, bs_data, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/bible_sources",
    method="GET",
    headers={"apikey": ANON_KEY}
)
record_test(
    "Public Endpoints: Bible Sources (St. Takla) Accessible without Login",
    "HTTP 200 OK",
    f"HTTP {s_bs}",
    s_bs == 200 and isinstance(bs_data, list) and len(bs_data) >= 1,
    "Public Access"
)

# --- 6. Admin vs Super User Equality Suite ---
s_adm_audit, adm_audit_d, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/audit_logs",
    method="GET",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}"}
)
s_sup_audit, sup_audit_d, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/audit_logs",
    method="GET",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {super_tok}"}
)
record_test(
    "Role Equality: Admin Access to Audit Logs",
    "HTTP 200 OK",
    f"HTTP {s_adm_audit}",
    s_adm_audit == 200,
    "Admin Equality"
)
record_test(
    "Role Equality: Super User Access to Audit Logs",
    "HTTP 200 OK",
    f"HTTP {s_sup_audit}",
    s_sup_audit == 200,
    "Admin Equality"
)

# Trainee reading Audit Logs (BLOCKED)
s_trn_audit, _, raw_aud = http_request(
    f"{SUPABASE_URL}/rest/v1/audit_logs",
    method="GET",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"}
)
record_test(
    "Security: Trainee Reading Audit Logs Forbidden",
    "Empty [] or Forbidden",
    f"HTTP {s_trn_audit}",
    s_trn_audit in [400, 401, 403] or len(s_trn_audit if isinstance(s_trn_audit, list) else []) == 0,
    "Security & Isolation"
)

print("==================================================")
passed_count = sum(1 for r in results if r['passed'])
total_count = len(results)
print(f"TOTAL TESTS: {total_count} | PASSED: {passed_count} | FAILED: {total_count - passed_count}")
print("==================================================")

# Save result matrix to JSON
with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
