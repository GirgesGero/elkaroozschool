#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os
import json
import re
import urllib.request
import urllib.error

with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/verify_phase11_e2e.py", "r", encoding="utf-8") as f:
    e2e_code = f.read()

m = re.search(r'ANON_KEY\s*=\s*["\']([^"\']+)["\']', e2e_code)
ANON_KEY = m.group(1) if m else ""
SUPABASE_URL = "https://kgqgnqjkrghvktymbimz.supabase.co"

def login_user(username, password):
    email = f"{username.lower()}@elkarooz-school.com"
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    req = urllib.request.Request(
        url,
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def execute_rpc(rpc_name, payload, token=None):
    url = f"{SUPABASE_URL}/rest/v1/rpc/{rpc_name}"
    headers = {
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {token or ANON_KEY}",
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = raw
            return resp.status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return e.code, err_body

def execute_get(endpoint, token=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {token or ANON_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = raw
            return resp.status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return e.code, err_body

def run_tests():
    print("================================================================================")
    print("EL KAROOZ SCHOOL — ADMIN UX & INFORMATION ARCHITECTURE VERIFICATION")
    print("================================================================================")

    results = []

    # Login as Admin
    status, auth_data = login_user("admin_user", "AdminPass123!")
    admin_token = auth_data.get("access_token") if status == 200 else None
    print(f"[*] Admin Authentication Status: {status} {'(SUCCESS)' if admin_token else '(FAILED)'}")

    # Test 1: Group 1 Operational Summary
    status, data = execute_rpc("get_group_operational_summary", {"p_group_id": 1}, admin_token)
    t1_pass = (status == 200 and isinstance(data, dict) and data.get("group_id") == 1 and data.get("trainees_count", 0) > 0)
    details1 = f"Trainees: {data.get('trainees_count') if isinstance(data, dict) else 'N/A'}, Servants: {data.get('servants_count') if isinstance(data, dict) else 'N/A'}, Rate: {data.get('attendance_rate') if isinstance(data, dict) else 'N/A'}%"
    results.append(("REQ-UX-01", "Group 1 Operational Summary RPC", t1_pass, details1))
    print(f"[{'PASS' if t1_pass else 'FAIL'}] Test 1: Group 1 Summary -> {details1}")

    # Test 2: Group 2 Operational Summary
    status, data2 = execute_rpc("get_group_operational_summary", {"p_group_id": 2}, admin_token)
    t2_pass = (status == 200 and isinstance(data2, dict) and data2.get("group_id") == 2 and data2.get("trainees_count", 0) > 0)
    details2 = f"Trainees: {data2.get('trainees_count') if isinstance(data2, dict) else 'N/A'}, Servants: {data2.get('servants_count') if isinstance(data2, dict) else 'N/A'}, Rate: {data2.get('attendance_rate') if isinstance(data2, dict) else 'N/A'}%"
    results.append(("REQ-UX-02", "Group 2 Operational Summary RPC", t2_pass, details2))
    print(f"[{'PASS' if t2_pass else 'FAIL'}] Test 2: Group 2 Summary -> {details2}")

    # Test 3: Group 3 Operational Summary
    status, data3 = execute_rpc("get_group_operational_summary", {"p_group_id": 3}, admin_token)
    t3_pass = (status == 200 and isinstance(data3, dict) and data3.get("group_id") == 3 and data3.get("trainees_count", 0) > 0)
    details3 = f"Trainees: {data3.get('trainees_count') if isinstance(data3, dict) else 'N/A'}, Servants: {data3.get('servants_count') if isinstance(data3, dict) else 'N/A'}, Rate: {data3.get('attendance_rate') if isinstance(data3, dict) else 'N/A'}%"
    results.append(("REQ-UX-03", "Group 3 Operational Summary RPC", t3_pass, details3))
    print(f"[{'PASS' if t3_pass else 'FAIL'}] Test 3: Group 3 Summary -> {details3}")

    # Test 4: Top Absent Trainees in Group Summary
    top_absent = data.get("top_absent", []) if isinstance(data, dict) else []
    t4_pass = isinstance(top_absent, list) and len(top_absent) > 0
    results.append(("REQ-UX-04", "Top Absent Trainees Actionable Drilldown List", t4_pass, f"Found {len(top_absent)} top absent records with drilldown metadata"))
    print(f"[{'PASS' if t4_pass else 'FAIL'}] Test 4: Top Absent List -> {results[-1][3]}")

    # Test 5: Detailed Servants with Delegated Permissions for Group 1
    status, serv_data = execute_rpc("get_group_servants_detailed", {"p_group_id": 1}, admin_token)
    t5_pass = (status == 200 and isinstance(serv_data, list) and len(serv_data) > 0)
    results.append(("REQ-UX-05", "Group 1 Detailed Servants & Permissions Matrix", t5_pass, f"Found {len(serv_data) if isinstance(serv_data, list) else 0} servants with delegated permissions"))
    print(f"[{'PASS' if t5_pass else 'FAIL'}] Test 5: Servants Detailed G1 -> {results[-1][3]}")

    # Test 6: Detailed Secretariat for Group 2
    status, sec_data = execute_rpc("get_group_secretariat_detailed", {"p_group_id": 2}, admin_token)
    t6_pass = (status == 200 and isinstance(sec_data, list) and len(sec_data) > 0)
    results.append(("REQ-UX-06", "Group 2 Detailed Secretariat Roster", t6_pass, f"Found {len(sec_data) if isinstance(sec_data, list) else 0} secretariat members appointed"))
    print(f"[{'PASS' if t6_pass else 'FAIL'}] Test 6: Secretariat Detailed G2 -> {results[-1][3]}")

    # Test 7: Trainee Full Interactive Profile Drilldown
    status, trainees = execute_get("profiles?role_id=eq.trainee&select=*&limit=1", admin_token)
    t7_pass = False
    details_str = "No trainee found"
    if status == 200 and isinstance(trainees, list) and len(trainees) > 0:
        trainee_id = trainees[0]["id"]
        status_p, prof_data = execute_rpc("get_trainee_full_profile", {"p_trainee_id": trainee_id}, admin_token)
        if status_p == 200 and isinstance(prof_data, dict) and prof_data.get("profile"):
            att_hist = prof_data.get("attendance", {}).get("history", [])
            t7_pass = True
            details_str = f"Trainee: {prof_data['profile']['full_name']}, Attendance sessions: {len(att_hist)}, Rate: {prof_data.get('attendance', {}).get('attendance_rate')}%"

    results.append(("REQ-UX-07", "Full Trainee Profile Interactive Drilldown", t7_pass, details_str))
    print(f"[{'PASS' if t7_pass else 'FAIL'}] Test 7: Trainee Full Profile -> {results[-1][3]}")

    # Test 8: Attendance Session Date & Status Drilldown
    status, sessions = execute_get("attendance_sessions?order=session_date.desc&limit=3", admin_token)
    t8_pass = (status == 200 and isinstance(sessions, list) and len(sessions) > 0)
    results.append(("REQ-UX-08", "Attendance Friday Sessions Chronological Timeline", t8_pass, f"Found {len(sessions) if isinstance(sessions, list) else 0} Friday cycles"))
    print(f"[{'PASS' if t8_pass else 'FAIL'}] Test 8: Friday Sessions -> {results[-1][3]}")

    # Test 9: Independent Servant Permissions Count
    status, perms = execute_get("permissions", admin_token)
    t9_pass = (status == 200 and isinstance(perms, list) and len(perms) == 5)
    results.append(("REQ-UX-09", "5 Independent Delegated Permissions", t9_pass, f"Total independent permissions: {len(perms) if isinstance(perms, list) else 0}"))
    print(f"[{'PASS' if t9_pass else 'FAIL'}] Test 9: Delegated Permissions -> {results[-1][3]}")

    # Summary
    total_passed = sum(1 for r in results if r[2])
    print("================================================================================")
    print(f"SUMMARY: {total_passed}/{len(results)} TESTS PASSED ({round(total_passed/len(results)*100, 1)}%)")
    print("================================================================================")

    with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/ux_redesign_test_results.json", "w", encoding="utf-8") as f:
        json.dump([{"id": r[0], "name": r[1], "passed": r[2], "details": r[3]} for r in results], f, ensure_ascii=False, indent=2)

    return total_passed == len(results)

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
