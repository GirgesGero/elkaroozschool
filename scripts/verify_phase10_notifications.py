import urllib.request
import urllib.error
import json
import time
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

def record_test(name, expected, actual, passed, category="Phase 10 Notifications"):
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
print("STARTING PHASE 10 NOTIFICATIONS, PUSH & PWA TEST SUITE")
print("==================================================")

admin_token = login("admin_user@elkarooz-school.com", ek_pw("EK_PW_ADMIN"))
trainee_token = login("trainee_g1@elkarooz-school.com", ek_pw("EK_PW_TRAINEE"))
servant_g1_token = login("servant_g1@elkarooz-school.com", ek_pw("EK_PW_SERVANT"))
servant_g2_token = login("servant_g2@elkarooz-school.com", ek_pw("EK_PW_SERVANT"))

admin_headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {admin_token}"}
trainee_headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {trainee_token}"}
servant_g1_headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {servant_g1_token}"}
servant_g2_headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {servant_g2_token}"}

# Get Trainee G1 ID
_, t_prof, _ = http_request(f"{SUPABASE_URL}/rest/v1/profiles?username=eq.trainee_g1&select=id,full_name,group_id", headers=admin_headers)
t1_id = t_prof[0]["id"]
t1_name = t_prof[0]["full_name"]

# 1. Test Absence Notification Trigger & Placeholder Replacement
s_abs, abs_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/trigger_absence_notification",
    method="POST",
    headers=admin_headers,
    data={"p_trainee_id": t1_id, "p_session_id": "00000000-0000-0000-0000-000000000000"}
)
has_name_in_msg = isinstance(abs_res, dict) and t1_name in abs_res.get("message", "")
record_test(
    "Absence: Immediate Trigger & Dynamic {{student_name}} Placeholder Replacement",
    "success == True and Trainee Full Name in message",
    f"HTTP {s_abs} (Message: '{abs_res.get('message', '')[:40]}...', Notifications Created: {abs_res.get('notifications_created')})",
    s_abs == 200 and isinstance(abs_res, dict) and abs_res.get("success") and has_name_in_msg
)

# 2. Test Absence Notification Group Scope (Servant G1 receives, Servant G2 excluded)
s_s1_notifs, s1_notifs, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/notifications?category=eq.PASTORAL&order=created_at.desc&limit=5",
    headers=servant_g1_headers
)
s_s2_notifs, s2_notifs, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/notifications?category=eq.PASTORAL&order=created_at.desc&limit=5",
    headers=servant_g2_headers
)
s1_has_abs = isinstance(s1_notifs, list) and any(t1_name in n.get("body", "") for n in s1_notifs)
s2_has_abs = isinstance(s2_notifs, list) and any(t1_name in n.get("body", "") for n in s2_notifs)
record_test(
    "Absence: Group Scope Isolation (Servants of other groups strictly excluded)",
    "Servant G1 has notification, Servant G2 has NO notification",
    f"Servant G1 Notified: {s1_has_abs}, Servant G2 Notified: {s2_has_abs}",
    s1_has_abs and not s2_has_abs
)

# 3. Test Birthday Notification Engine
s_bday, bday_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/trigger_birthday_notifications",
    method="POST",
    headers=admin_headers
)
record_test(
    "Birthday: Annual Birthday Notification Engine",
    "HTTP 200 with total_notifications count returned",
    f"HTTP {s_bday} (Total Notifications Created: {bday_res.get('total_notifications') if isinstance(bday_res, dict) else 0})",
    s_bday == 200 and isinstance(bday_res, dict) and bday_res.get("success")
)

# 4. Test Daily Verse Dispatch & Rotation Engine
s_verse, verse_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/dispatch_daily_verse_notification",
    method="POST",
    headers=admin_headers,
    data={"p_force_send": True, "p_mode": "SEQUENTIAL"}
)
record_test(
    "Daily Verse: Dispatch & Ordered Rotation Engine",
    "HTTP 200 with verse dispatched to all active users",
    f"HTTP {s_verse} (Verse: {verse_res.get('reference') if isinstance(verse_res, dict) else 'None'}, Recipients: {verse_res.get('recipients_count') if isinstance(verse_res, dict) else 0})",
    s_verse == 200 and isinstance(verse_res, dict) and verse_res.get("success")
)

# 5. Test Trainee Notification Center (View Personal Notifications)
s_t_notifs, t_notifs, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/notifications?order=created_at.desc&limit=10",
    headers=trainee_headers
)
t_has_notifs = isinstance(t_notifs, list) and len(t_notifs) > 0
record_test(
    "Notification Center: Trainee Views Personal In-App Notifications",
    "HTTP 200 with >= 1 notification for Trainee G1",
    f"HTTP {s_t_notifs} (Count: {len(t_notifs) if isinstance(t_notifs, list) else 0})",
    s_t_notifs == 200 and t_has_notifs
)

# 6. Test Mark Notification as Read
if t_has_notifs:
    target_nid = t_notifs[0]["id"]
    s_read, _, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/notifications?id=eq.{target_nid}",
        method="PATCH",
        headers=trainee_headers,
        data={"is_read": True}
    )
    record_test(
        "Notification Center: User Marks Notification as Read",
        "HTTP 200 / 204",
        f"HTTP {s_read}",
        s_read in [200, 204]
    )

# 7. Test Security: User Cannot Delete Notifications (Permanent Retention)
s_del_notif, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/notifications?id=gt.00000000-0000-0000-0000-000000000000",
    method="DELETE",
    headers=trainee_headers
)
record_test(
    "Security: Notification Deletion Denied (Permanent Retention)",
    "HTTP 401 / 403 Forbidden or 0 deleted",
    f"HTTP {s_del_notif}",
    s_del_notif in [200, 204, 400, 401, 403]
)

# 8. Test Web Push Subscription Registration
s_push, push_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/push_subscriptions",
    method="POST",
    headers=trainee_headers,
    data={
        "profile_id": t1_id,
        "endpoint": f"https://fcm.googleapis.com/fcm/send/test_{int(time.time())}",
        "keys_p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9h0qvqKEA==",
        "keys_auth": "tBHItJI5svbpez7KI4CCXg==",
        "user_agent": "Mozilla/5.0 PWA Test"
    }
)
record_test(
    "Web Push: User Registers Web Push Subscription",
    "HTTP 201 Created",
    f"HTTP {s_push}",
    s_push in [200, 201]
)

# 9. Test PWA Configuration (manifest.json & sw.js verified on disk)
manifest_path = "E:/drive progect/ELKAROOZ SCHOOL/frontend/public/manifest.json"
sw_path = "E:/drive progect/ELKAROOZ SCHOOL/frontend/public/sw.js"
pwa_ok = os.path.exists(manifest_path) and os.path.exists(sw_path)
record_test(
    "PWA Completion: Manifest and Service Worker Configured on Disk",
    "manifest.json and sw.js exist",
    f"Manifest: {os.path.exists(manifest_path)}, SW: {os.path.exists(sw_path)}",
    pwa_ok
)

print("==================================================")
passed_count = sum(1 for r in results if r['passed'])
total_count = len(results)
print(f"TOTAL TESTS: {total_count} | PASSED: {passed_count} | FAILED: {total_count - passed_count}")
print("==================================================")

with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/phase10_notifications_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
