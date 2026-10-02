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

def record_test(name, expected, actual, passed, category="Library & Media"):
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
print("STARTING PHASE 7 DIGITAL LIBRARY & MEDIA TEST SUITE")
print("==================================================")

# 1. Login accounts
tokens = {}
users_info = {}
for u, p in [
    ("admin_user", ek_pw("EK_PW_ADMIN")),
    ("super_user", ek_pw("EK_PW_SUPER_USER")),
    ("servant_g1", ek_pw("EK_PW_SERVANT")),
    ("servant_g2", ek_pw("EK_PW_SERVANT")),
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
trn1_tok = tokens["trainee_g1"]
trn2_tok = tokens["trainee_g2"]
trn1_id = users_info["trainee_g1"]
trn2_id = users_info["trainee_g2"]

# 2. Category Management & Permissions
s_cat, res_cat, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/categories",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
    data={"name_ar": "تفاسير العهد الجديد والآباء", "type": "BOOK"}
)
cat_id = res_cat[0]["id"] if s_cat in [200, 201] and res_cat else None
record_test(
    "Categories: Admin creates new Category",
    "HTTP 201 Created",
    f"HTTP {s_cat} (ID: {cat_id})",
    s_cat in [200, 201] and cat_id is not None
)

s_cat_denied, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/categories",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
    data={"name_ar": "تصنيف غير مصرح به", "type": "BOOK"}
)
record_test(
    "Categories: Trainee category creation blocked by RLS",
    "HTTP 403 Forbidden",
    f"HTTP {s_cat_denied}",
    s_cat_denied in [400, 403]
)

# 3. Global Books Library
s_book, res_book, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/books",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
    data={
        "category_id": cat_id,
        "title": "مقدمة في العهد الجديد وتاريخ الكنيسة",
        "author": "نيافة الأنبا رافائيل",
        "file_url": "https://storage.elkarooz-school.internal/books/intro_nt.pdf",
        "cover_url": "https://images.unsplash.com/photo-1544717305-2782549b5136"
    }
)
book_id = res_book[0]["id"] if s_book in [200, 201] and res_book else None
record_test(
    "Books: Admin adds Book to Global Library",
    "HTTP 201 Created",
    f"HTTP {s_book} (ID: {book_id})",
    s_book in [200, 201] and book_id is not None
)

if book_id:
    # Trainee G1 reads book
    s_b1, b1_list, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/books?id=eq.{book_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"}
    )
    # Trainee G2 reads book (Global access)
    s_b2, b2_list, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/books?id=eq.{book_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn2_tok}"}
    )
    global_ok = len(b1_list) == 1 and len(b2_list) == 1
    record_test(
        "Books: Global Access (Visible to Trainee G1 and Trainee G2 alike)",
        "Both Trainee G1 and G2 can access the same Book",
        f"G1 Count: {len(b1_list)}, G2 Count: {len(b2_list)}",
        global_ok
    )

# 4. Global Research Library
s_res, res_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/researches",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
    data={
        "category_id": cat_id,
        "title": "دراسة لاهوتية مقارنة في رسائل بولس الرسول",
        "author": "د. مجدي لمعي",
        "file_url": "https://storage.elkarooz-school.internal/research/paul_theology.pdf"
    }
)
research_id = res_res[0]["id"] if s_res in [200, 201] and res_res else None
record_test(
    "Research: Admin adds Research to Global Library",
    "HTTP 201 Created",
    f"HTTP {s_res} (ID: {research_id})",
    s_res in [200, 201] and research_id is not None
)

# 5. Personal Favorites Engine
if book_id:
    # Trainee 1 adds to favorites
    s_fav, _, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/user_favorites",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"user_id": trn1_id, "item_type": "BOOK", "item_id": book_id}
    )
    record_test(
        "Favorites: Trainee 1 adds Book to Favorites",
        "HTTP 201 Created",
        f"HTTP {s_fav}",
        s_fav in [200, 201]
    )

    # Trainee 1 duplicate favorite insert (must be rejected)
    s_dup_fav, _, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/user_favorites",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"user_id": trn1_id, "item_type": "BOOK", "item_id": book_id}
    )
    record_test(
        "Favorites: Duplicate favorite blocked by uq_user_fav",
        "HTTP 409 Conflict",
        f"HTTP {s_dup_fav}",
        s_dup_fav in [400, 409]
    )

    # Trainee 2 reads favorites (must not see Trainee 1 favorites)
    _, t2_favs, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/user_favorites",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn2_tok}"}
    )
    fav_isolated = len(t2_favs) == 0
    record_test(
        "Favorites: Personal Isolation (Trainee 2 cannot see Trainee 1 favorites)",
        "0 items returned for Trainee 2",
        f"Trainee 2 Favorites Count: {len(t2_favs)}",
        fav_isolated
    )

# 6. Group Isolation on Gallery
# Admin creates Album for Group 1
s_alb, res_alb, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/gallery_albums",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
    data={"group_id": 1, "title": "رحلة الفرقة الأولى لدير الأنبا بيشوي 2026"}
)
alb_g1_id = res_alb[0]["id"] if s_alb in [200, 201] and res_alb else None

if alb_g1_id:
    # Add photo to Group 1 Album
    s_ph, _, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/gallery_items",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}"},
        data={"album_id": alb_g1_id, "group_id": 1, "image_url": "https://images.unsplash.com/photo-1544717305-2782549b5136", "title": "صورة تذكارية"}
    )

    # Trainee G1 reads Group 1 Album
    _, t1_albs, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/gallery_albums?id=eq.{alb_g1_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"}
    )
    # Trainee G2 reads Group 1 Album (MUST BE 0)
    _, t2_albs, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/gallery_albums?id=eq.{alb_g1_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn2_tok}"}
    )
    gallery_isolated = len(t1_albs) == 1 and len(t2_albs) == 0
    record_test(
        "Gallery: Group Scope Isolation (Trainee G1 sees G1 album, Trainee G2 blocked)",
        "G1 sees 1 album, G2 sees 0 albums",
        f"G1: {len(t1_albs)}, G2: {len(t2_albs)}",
        gallery_isolated
    )

# 7. Group Isolation on MP3 Tracks
s_mp3, res_mp3, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/mp3_tracks",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
    data={"group_id": 1, "title": "محاضرة طقس القداس الإلهي - الفرقة الأولى", "audio_url": "https://storage.elkarooz-school.internal/mp3/group1_liturgy.mp3", "duration_seconds": 2400}
)
mp3_id = res_mp3[0]["id"] if s_mp3 in [200, 201] and res_mp3 else None

if mp3_id:
    # Trainee G1 reads G1 MP3
    _, t1_mp3s, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/mp3_tracks?id=eq.{mp3_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"}
    )
    # Trainee G2 reads G1 MP3 (MUST BE 0)
    _, t2_mp3s, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/mp3_tracks?id=eq.{mp3_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn2_tok}"}
    )
    mp3_isolated = len(t1_mp3s) == 1 and len(t2_mp3s) == 0
    record_test(
        "MP3: Group Scope Isolation (Trainee G1 sees G1 MP3, Trainee G2 blocked)",
        "G1 sees 1 track, G2 sees 0 tracks",
        f"G1: {len(t1_mp3s)}, G2: {len(t2_mp3s)}",
        mp3_isolated
    )

# 8. Soft Delete & Restore on Books
if book_id:
    # Soft delete book
    s_sdel, _, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/books?id=eq.{book_id}",
        method="PATCH",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}"},
        data={"deleted_at": "2026-09-26T06:00:00Z"}
    )
    # Trainee G1 checks active books
    _, active_books, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/books?id=eq.{book_id}&deleted_at=is.null",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"}
    )
    book_hidden = len(active_books) == 0
    record_test(
        "Soft Delete: Deleted book is hidden from active library",
        "0 items returned",
        f"Active books count: {len(active_books)}",
        book_hidden
    )

    # Restore book
    http_request(
        f"{SUPABASE_URL}/rest/v1/books?id=eq.{book_id}",
        method="PATCH",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}"},
        data={"deleted_at": None}
    )
    _, restored_books, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/books?id=eq.{book_id}&deleted_at=is.null",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"}
    )
    book_restored = len(restored_books) == 1
    record_test(
        "Restore: Restored book reappears in active library",
        "1 item returned",
        f"Restored count: {len(restored_books)}",
        book_restored
    )

print("==================================================")
passed_count = sum(1 for r in results if r['passed'])
total_count = len(results)
print(f"TOTAL TESTS: {total_count} | PASSED: {passed_count} | FAILED: {total_count - passed_count}")
print("==================================================")

with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/phase7_library_media_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
