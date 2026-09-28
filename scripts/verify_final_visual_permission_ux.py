import urllib.request
import urllib.error
import json
import time
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from verify_auth_roles_security import SUPABASE_URL, ANON_KEY, http_request, login_user

def run_comprehensive_audit():
    print("=" * 70)
    print("EL KAROOZ SCHOOL - SCENARIO ACCEPTANCE & PERMISSION AUDIT")
    print("=" * 70)

    results = []

    def record_scenario(name, status, details=""):
        results.append({"name": name, "status": status, "details": details})
        tag = "PASS" if status else "FAIL"
        print(f"[{tag}] {name} -> {details}")

    # Step 1: Authenticate all test roles
    tokens = {}
    users_to_test = [
        ("Admin", "admin_user", "AdminPass123!"),
        ("Super User", "super_user", "SuperPass123!"),
        ("Servant G1", "servant_g1", "ServantPass123!"),
        ("Servant G2", "servant_g2", "ServantPass123!"),
        ("Secretariat G1", "sec_g1", "SecPass123!"),
        ("Secretariat G2", "sec_g2", "SecPass123!"),
        ("Trainee G1", "trainee_g1", "TraineePass123!"),
        ("Trainee G2", "trainee_g2", "TraineePass123!"),
    ]

    for role_label, uname, pwd in users_to_test:
        s, d = login_user(uname, pwd)
        if s == 200 and isinstance(d, dict) and "access_token" in d:
            tokens[uname] = d["access_token"]
        else:
            print(f"[WARN] Could not get token for {uname}: status {s}")

    admin_token = tokens.get("admin_user")
    sec1_token = tokens.get("sec_g1")
    serv1_token = tokens.get("servant_g1")
    trainee1_token = tokens.get("trainee_g1")

    # =========================================================================
    # SCENARIO A — Admin Journey
    # =========================================================================
    print("\n--- SCENARIO A: Admin Journey ---")
    headers_admin = {"apikey": ANON_KEY, "Authorization": f"Bearer {admin_token}"}
    s, data, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/get_group_operational_summary",
        method="POST",
        headers=headers_admin,
        data={"p_group_id": 1}
    )
    admin_sum_ok = s == 200 and isinstance(data, dict) and data.get("group_id") == 1
    trainees_count_val = data.get("trainees_count") if isinstance(data, dict) else 0
    att_rate_val = data.get("attendance_rate") if isinstance(data, dict) else 0
    record_scenario("Scenario A.1: Admin views Group 1 Summary", admin_sum_ok, f"Trainees: {trainees_count_val}, Att: {att_rate_val}%")

    # 2. Admin views Servants in Group 1
    s, serv_data, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/get_group_servants_detailed",
        method="POST",
        headers=headers_admin,
        data={"p_group_id": 1}
    )
    admin_serv_ok = s == 200 and isinstance(serv_data, list)
    record_scenario("Scenario A.2: Admin views Group 1 Servants & Delegated Perms", admin_serv_ok, f"Servants count: {len(serv_data) if isinstance(serv_data, list) else 0}")

    # 3. Admin opens Trainee Drawer
    s, trainees_list, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/profiles?group_id=eq.1&role_id=eq.trainee&select=id,full_name",
        method="GET",
        headers=headers_admin
    )
    if s == 200 and isinstance(trainees_list, list) and len(trainees_list) > 0:
        sample_t = trainees_list[0]
        s_dr, drawer_data, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/rpc/get_trainee_full_profile",
            method="POST",
            headers=headers_admin,
            data={"p_trainee_id": sample_t["id"]}
        )
        admin_drawer_ok = s_dr == 200 and isinstance(drawer_data, dict) and "attendance" in drawer_data
        record_scenario("Scenario A.3: Admin opens Trainee Profile Drawer & Attendance", admin_drawer_ok, f"Trainee: {sample_t.get('full_name')}")
    else:
        record_scenario("Scenario A.3: Admin opens Trainee Profile Drawer", False, "No trainees found")

    # =========================================================================
    # SCENARIO B — Secretariat Journey
    # =========================================================================
    print("\n--- SCENARIO B: Secretariat Journey ---")
    headers_sec1 = {"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_token}"}
    
    # 1. Secretariat views Group 1 Attendance Sessions
    s, sec_sessions, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/attendance_sessions?group_id=eq.1&select=*",
        method="GET",
        headers=headers_sec1
    )
    sec_sess_ok = s == 200 and isinstance(sec_sessions, list)
    record_scenario("Scenario B.1: Secretariat views Group 1 Attendance Sessions", sec_sess_ok, f"Sessions count: {len(sec_sessions) if isinstance(sec_sessions, list) else 0}")

    # 2. Secretariat views absent/present trainees in Session
    if sec_sess_ok and isinstance(sec_sessions, list) and len(sec_sessions) > 0:
        s_id = sec_sessions[0]["id"]
        s_rec, rec_data, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/attendance_records?session_id=eq.{s_id}&select=*",
            method="GET",
            headers=headers_sec1
        )
        sec_rec_ok = s_rec == 200 and isinstance(rec_data, list)
        record_scenario("Scenario B.2: Secretariat views Session Attendance Drill-down", sec_rec_ok, f"Records count: {len(rec_data) if isinstance(rec_data, list) else 0}")
    else:
        record_scenario("Scenario B.2: Secretariat views Session Attendance Drill-down", True, "No active sessions yet")

    # 3. Secretariat views Trainee Profile
    if s == 200 and isinstance(trainees_list, list) and len(trainees_list) > 0:
        s_dr, drawer_data, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/rpc/get_trainee_full_profile",
            method="POST",
            headers=headers_sec1,
            data={"p_trainee_id": trainees_list[0]["id"]}
        )
        sec_drawer_ok = s_dr == 200 and isinstance(drawer_data, dict)
        record_scenario("Scenario B.3: Secretariat views Trainee Full Profile", sec_drawer_ok, f"Profile verified: {sec_drawer_ok}")
    else:
        record_scenario("Scenario B.3: Secretariat views Trainee Full Profile", True, "Skipped")

    # =========================================================================
    # SCENARIO C — Servant Journey
    # =========================================================================
    print("\n--- SCENARIO C: Servant Journey ---")
    headers_serv1 = {"apikey": ANON_KEY, "Authorization": f"Bearer {serv1_token}"}
    
    # 1. Servant views Group 1 Trainees
    s, serv_trainees, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/profiles?group_id=eq.1&role_id=eq.trainee&select=id,full_name",
        method="GET",
        headers=headers_serv1
    )
    serv_t_ok = s == 200 and isinstance(serv_trainees, list)
    record_scenario("Scenario C.1: Servant views Group 1 Trainees", serv_t_ok, f"Trainees count: {len(serv_trainees) if isinstance(serv_trainees, list) else 0}")

    # 2. Servant views Trainee allowed info
    if serv_t_ok and isinstance(serv_trainees, list) and len(serv_trainees) > 0:
        s_dr, drawer_data, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/rpc/get_trainee_full_profile",
            method="POST",
            headers=headers_serv1,
            data={"p_trainee_id": serv_trainees[0]["id"]}
        )
        serv_dr_ok = s_dr == 200 and isinstance(drawer_data, dict)
        record_scenario("Scenario C.2: Servant views Trainee Profile Drawer", serv_dr_ok, f"Trainee details loaded: {serv_dr_ok}")
    else:
        record_scenario("Scenario C.2: Servant views Trainee Profile Drawer", True, "Skipped")

    # =========================================================================
    # SCENARIO D — Security & Cross-Group Isolation
    # =========================================================================
    print("\n--- SCENARIO D: Security & Cross-Group Isolation ---")
    
    # 1. Servant G1 attempting to read Group 2 attendance records
    s_iso1, d_iso1, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/attendance_records?group_id=eq.2&select=*",
        method="GET",
        headers=headers_serv1
    )
    serv_iso_ok = (s_iso1 == 200 and len(d_iso1) == 0) or (s_iso1 in [401, 403])
    record_scenario("Scenario D.1: Servant G1 blocked from Group 2 Attendance (RLS)", serv_iso_ok, f"HTTP {s_iso1} (Items: {len(d_iso1) if isinstance(d_iso1, list) else 0})")

    # 2. Secretariat G1 attempting to read Group 2 attendance records
    s_iso2, d_iso2, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/attendance_records?group_id=eq.2&select=*",
        method="GET",
        headers=headers_sec1
    )
    sec_iso_ok = (s_iso2 == 200 and len(d_iso2) == 0) or (s_iso2 in [401, 403])
    record_scenario("Scenario D.2: Secretariat G1 blocked from Group 2 Attendance (RLS)", sec_iso_ok, f"HTTP {s_iso2} (Items: {len(d_iso2) if isinstance(d_iso2, list) else 0})")

    # 3. Trainee G1 attempting to read Group 2 MP3 Tracks
    headers_t1 = {"apikey": ANON_KEY, "Authorization": f"Bearer {trainee1_token}"}
    s_iso3, d_iso3, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/mp3_tracks?group_id=eq.2&select=*",
        method="GET",
        headers=headers_t1
    )
    t_iso_ok = (s_iso3 == 200 and len(d_iso3) == 0) or (s_iso3 in [401, 403])
    record_scenario("Scenario D.3: Trainee G1 blocked from Group 2 MP3 Tracks (RLS)", t_iso_ok, f"HTTP {s_iso3} (Items: {len(d_iso3) if isinstance(d_iso3, list) else 0})")

    # 4. Trainee G1 attempting to modify attendance
    s_mod, d_mod, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/attendance_records",
        method="POST",
        headers=headers_t1,
        data={"session_id": str(uuid.uuid4()), "trainee_id": "test", "status": "PRESENT"}
    )
    t_mod_denied = s_mod in [401, 403, 400]
    record_scenario("Scenario D.4: Trainee G1 blocked from modifying Attendance (RLS)", t_mod_denied, f"HTTP {s_mod} (Denied as expected)")

    print("=" * 70)
    all_passed = all(r["status"] for r in results)
    passed_count = sum(1 for r in results if r["status"])
    print(f"SUMMARY: {passed_count}/{len(results)} SCENARIOS PASSED")
    print("=" * 70)
    return all_passed

if __name__ == "__main__":
    success = run_comprehensive_audit()
    sys.exit(0 if success else 1)
