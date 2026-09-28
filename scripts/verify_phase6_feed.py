import urllib.request
import urllib.error
import json
import sys

SUPABASE_URL = "https://kgqgnqjkrghvktymbimz.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncWducWprcmdodmt0eW1iaW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjk2NzgsImV4cCI6MjEwNTk0NTY3OH0.QHZCfNWf97-3fCONdMeXnWqeZMYyZ8NHIFfTwnHnj-w"

results = []

def record_test(name, expected, actual, passed, category="Social Feed"):
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
print("STARTING PHASE 6 SOCIAL FEED & INTERACTIONS TEST SUITE")
print("==================================================")

# 1. Login accounts
tokens = {}
users_info = {}
for u, p in [
    ("admin_user", "AdminPass123!"),
    ("super_user", "SuperPass123!"),
    ("servant_g1", "ServantPass123!"),
    ("servant_g2", "ServantPass123!"),
    ("sec_g1", "SecPass123!"),
    ("trainee_g1", "TraineePass123!"),
    ("trainee_g2", "TraineePass123!"),
]:
    s, d = login_user(u, p)
    if s == 200 and isinstance(d, dict):
        tokens[u] = d["access_token"]
        users_info[u] = d["user"]["id"]

admin_tok = tokens["admin_user"]
super_tok = tokens["super_user"]
serv1_tok = tokens["servant_g1"]
serv2_tok = tokens["servant_g2"]
sec1_tok = tokens["sec_g1"]
trn1_tok = tokens["trainee_g1"]
trn2_tok = tokens["trainee_g2"]
trn1_id = users_info["trainee_g1"]
trn2_id = users_info["trainee_g2"]

# 2. Posting Permissions: Admin, Super User, Servant, Secretariat CAN post
s_adm_p, res_adm_p, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/feed_posts",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
    data={"content": "إعلان رسمي من إدارة مدرسة الكاروز لجميع المراحل"}
)
record_test(
    "Posting Permission: Admin can create Feed Post",
    "HTTP 201 Created",
    f"HTTP {s_adm_p}",
    s_adm_p in [200, 201]
)

s_srv_p, res_srv_p, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/feed_posts",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv1_tok}", "Prefer": "return=representation"},
    data={"content": "تأمل روحي للأسبوع الدراسي الحالي من الخادم"}
)
serv_post_id = res_srv_p[0]["id"] if s_srv_p in [200, 201] and res_srv_p else None
record_test(
    "Posting Permission: Servant can create Feed Post",
    "HTTP 201 Created",
    f"HTTP {s_srv_p} (ID: {serv_post_id})",
    s_srv_p in [200, 201] and serv_post_id is not None
)

s_sec_p, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/feed_posts",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {sec1_tok}"},
    data={"content": "تنبيه هام من السكرتارية بخصوص مواعيد الجمعة"}
)
record_test(
    "Posting Permission: Secretariat can create Feed Post",
    "HTTP 201 Created",
    f"HTTP {s_sec_p}",
    s_sec_p in [200, 201]
)

# 3. Posting Permissions: Trainee and Public MUST BE DENIED
s_trn_p, _, raw_trn_p = http_request(
    f"{SUPABASE_URL}/rest/v1/feed_posts",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
    data={"content": "محاولة نشر منشور من متدرب (يجب أن تفشل)"}
)
record_test(
    "Posting Permission: Trainee post creation blocked by RLS",
    "HTTP 403 Forbidden (RLS Violation)",
    f"HTTP {s_trn_p}",
    s_trn_p in [400, 401, 403]
)

s_pub_p, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/feed_posts",
    method="POST",
    headers={"apikey": ANON_KEY},
    data={"content": "محاولة نشر منشور من زائر عام (يجب أن تفشل)"}
)
record_test(
    "Posting Permission: Public visitor post creation blocked",
    "HTTP 401 / 403",
    f"HTTP {s_pub_p}",
    s_pub_p in [401, 403]
)

# 4. Multiple Images Association
if serv_post_id:
    s_img, res_img, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/post_images",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv1_tok}", "Prefer": "return=representation"},
        data=[
            {"post_id": serv_post_id, "storage_path": f"feed/{serv_post_id}_0.jpg", "image_url": "https://images.unsplash.com/photo-1544717305-2782549b5136"},
            {"post_id": serv_post_id, "storage_path": f"feed/{serv_post_id}_1.jpg", "image_url": "https://images.unsplash.com/photo-1512820790803-83ca734da794"}
        ]
    )
    record_test(
        "Media: Multiple Images attached to Post (0..N Images)",
        "HTTP 201 for 2 images",
        f"HTTP {s_img} (Count: {len(res_img) if isinstance(res_img, list) else 0})",
        s_img in [200, 201] and isinstance(res_img, list) and len(res_img) == 2
    )

    # 5. Reactions Engine
    # Trainee 1 adds reaction 'LIKE'
    s_r1, res_r1, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/toggle_post_reaction",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"p_post_id": serv_post_id, "p_reaction_type": "LIKE"}
    )
    record_test(
        "Reactions: Trainee 1 reacts 'LIKE'",
        "HTTP 200 with action = ADDED",
        f"HTTP {s_r1} ({res_r1})",
        s_r1 == 200 and isinstance(res_r1, dict) and res_r1.get("action") == "ADDED"
    )

    # Trainee 1 changes reaction to 'LOVE'
    s_r1_ch, res_r1_ch, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/toggle_post_reaction",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"p_post_id": serv_post_id, "p_reaction_type": "LOVE"}
    )
    record_test(
        "Reactions: Trainee 1 changes reaction to 'LOVE'",
        "HTTP 200 with action = CHANGED",
        f"HTTP {s_r1_ch} ({res_r1_ch})",
        s_r1_ch == 200 and isinstance(res_r1_ch, dict) and res_r1_ch.get("action") == "CHANGED"
    )

    # Trainee 2 reacts 'PRAY'
    http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/toggle_post_reaction",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn2_tok}"},
        data={"p_post_id": serv_post_id, "p_reaction_type": "PRAY"}
    )

    # View Reactors RPC
    s_reactors, reactors, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/get_post_reactors",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"p_post_id": serv_post_id}
    )
    record_test(
        "Reactions: View Reactors list returns names and reaction types",
        "HTTP 200 with 2 reactors",
        f"HTTP {s_reactors} (Count: {len(reactors) if isinstance(reactors, list) else 0})",
        s_reactors == 200 and isinstance(reactors, list) and len(reactors) >= 2
    )

    # 6. Comments Engine
    # Trainee 1 comments
    s_c1, res_c1, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/post_comments",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}", "Prefer": "return=representation"},
        data={"post_id": serv_post_id, "content": "آمين يا أبونا/يا خادم، ربنا يبارك خدمتكم"}
    )
    c1_id = res_c1[0]["id"] if s_c1 in [200, 201] and res_c1 else None
    record_test(
        "Comments: Trainee can create Comment on Post",
        "HTTP 201 Created",
        f"HTTP {s_c1} (Comment ID: {c1_id})",
        s_c1 in [200, 201] and c1_id is not None
    )

    # Trainee 1 soft-deletes own comment
    if c1_id:
        s_c_del, res_c_del, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/rpc/soft_delete_comment",
            method="POST",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
            data={"p_comment_id": c1_id}
        )
        record_test(
            "Comments: Author can soft-delete own Comment",
            "HTTP 200 with success = True",
            f"HTTP {s_c_del} ({res_c_del})",
            s_c_del == 200 and isinstance(res_c_del, dict) and res_c_del.get("success") is True
        )

    # 7. Post Ownership & Soft Delete
    # Servant 2 cannot edit Servant 1's post
    s_srv2_edit, _, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/feed_posts?id=eq.{serv_post_id}",
        method="PATCH",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv2_tok}"},
        data={"content": "تعديل غير مصرح به من خادم آخر"}
    )
    # Check if content changed
    _, check_post, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/feed_posts?id=eq.{serv_post_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}"}
    )
    serv2_blocked = check_post and check_post[0]["content"] != "تعديل غير مصرح به من خادم آخر"
    record_test(
        "Ownership: Other Servant cannot edit post",
        "Post content remains unchanged",
        f"Protected: {serv2_blocked}",
        serv2_blocked
    )

    # Servant 1 soft-deletes own post
    s_del_p, res_del_p, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/soft_delete_post",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv1_tok}"},
        data={"p_post_id": serv_post_id}
    )
    record_test(
        "Soft Delete: Post author soft-deletes own post",
        "HTTP 200 with success = True",
        f"HTTP {s_del_p} ({res_del_p})",
        s_del_p == 200 and isinstance(res_del_p, dict) and res_del_p.get("success") is True
    )

    # Verify post is hidden from active feed
    _, active_feed, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/feed_posts?id=eq.{serv_post_id}&deleted_at=is.null",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"}
    )
    post_hidden = len(active_feed) == 0
    record_test(
        "Feed Visibility: Soft-deleted post disappears from active Feed",
        "0 items returned",
        f"Active feed items: {len(active_feed)}",
        post_hidden
    )

    # 8. Restore Soft-Deleted Post
    # Admin restores post
    s_rst, res_rst, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/restore_deleted_post",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}"},
        data={"p_post_id": serv_post_id}
    )
    record_test(
        "Restore: Admin restores soft-deleted post",
        "HTTP 200 with success = True",
        f"HTTP {s_rst} ({res_rst})",
        s_rst == 200 and isinstance(res_rst, dict) and res_rst.get("success") is True
    )

    # Trainee cannot restore post
    s_trn_rst, _, raw_trn_rst = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/restore_deleted_post",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"p_post_id": serv_post_id}
    )
    record_test(
        "Restore Security: Trainee restore attempt blocked",
        "Error: صلاحية الاستعادة مقتصرة على المسؤول والسوبر يوزر",
        f"HTTP {s_trn_rst}",
        s_trn_rst in [400, 403, 500] and "المسؤول" in raw_trn_rst
    )

print("==================================================")
passed_count = sum(1 for r in results if r['passed'])
total_count = len(results)
print(f"TOTAL TESTS: {total_count} | PASSED: {passed_count} | FAILED: {total_count - passed_count}")
print("==================================================")

with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/phase6_feed_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
