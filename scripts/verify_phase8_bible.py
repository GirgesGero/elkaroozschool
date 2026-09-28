import urllib.request
import urllib.error
import json
import sys

SUPABASE_URL = "https://kgqgnqjkrghvktymbimz.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncWducWprcmdodmt0eW1iaW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjk2NzgsImV4cCI6MjEwNTk0NTY3OH0.QHZCfNWf97-3fCONdMeXnWqeZMYyZ8NHIFfTwnHnj-w"

results = []

def record_test(name, expected, actual, passed, category="Bible Engine"):
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

print("==================================================")
print("STARTING PHASE 8 BIBLE ENGINE TEST SUITE")
print("==================================================")

# 1. Testaments Discovery
s_t, testaments, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/bible_testaments",
    headers={"apikey": ANON_KEY}
)
record_test(
    "Bible Structure: Testaments Available Publicly",
    "HTTP 200 with 2 Testaments (OT, NT)",
    f"HTTP {s_t} (Count: {len(testaments) if isinstance(testaments, list) else 0})",
    s_t == 200 and isinstance(testaments, list) and len(testaments) == 2
)

# 2. Canonical Books Discovery
s_b, books, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/bible_books",
    headers={"apikey": ANON_KEY}
)
record_test(
    "Bible Structure: Canonical Books Available Publicly",
    "HTTP 200 with Books list",
    f"HTTP {s_b} (Count: {len(books) if isinstance(books, list) else 0})",
    s_b == 200 and isinstance(books, list) and len(books) >= 18
)

# 3. Chapter Verses with Word Breakdown (Genesis 1)
s_chap, chap_verses, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/get_chapter_verses_with_words",
    method="POST",
    headers={"apikey": ANON_KEY},
    data={"p_book_id": 1, "p_chapter_number": 1}
)
has_words = isinstance(chap_verses, list) and len(chap_verses) > 0 and len(chap_verses[0].get("words", [])) == 6
record_test(
    "Bible Text: Chapter 1 Verses & Word Breakdown loaded",
    "HTTP 200 with 6 words in Gen 1:1",
    f"HTTP {s_chap} (Verse 1 Words: {len(chap_verses[0].get('words', [])) if isinstance(chap_verses, list) and chap_verses else 0})",
    s_chap == 200 and has_words
)

# 4. Verse Commentaries Verification (Fr. Tadros Malaty & Fr. Antonios Fekry)
if has_words:
    v1_id = chap_verses[0]["id"]
    s_com, coms, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/bible_commentaries?verse_id=eq.{v1_id}&select=*,source:bible_sources(author_name,source_name)",
        headers={"apikey": ANON_KEY}
    )
    has_two_coms = isinstance(coms, list) and len(coms) >= 2
    record_test(
        "Commentaries: Separate Commentaries for Fr. Tadros Malaty & Fr. Antonios Fekry",
        "HTTP 200 with >= 2 distinct commentaries verbatim",
        f"HTTP {s_com} (Count: {len(coms) if isinstance(coms, list) else 0})",
        s_com == 200 and has_two_coms
    )

# 5. Interactive Word Detail (Click on 'الْبَدْءِ')
if has_words:
    w1_id = chap_verses[0]["words"][1]["id"] # word 2 'الْبَدْءِ'
    s_wdetail, wdetail, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/get_word_details",
        method="POST",
        headers={"apikey": ANON_KEY},
        data={"p_word_id": w1_id}
    )
    has_word_meaning = isinstance(wdetail, dict) and len(wdetail.get("word_commentaries", [])) > 0
    has_dict_entry = isinstance(wdetail, dict) and len(wdetail.get("dictionary_entries", [])) > 0
    record_test(
        "Interactive Word Commentary: Contextual Meaning & St. Takla Dictionary linked",
        "Word details return contextual explanation + dictionary entry",
        f"HTTP {s_wdetail} (Word Coms: {len(wdetail.get('word_commentaries', [])) if isinstance(wdetail, dict) else 0}, Dict: {len(wdetail.get('dictionary_entries', [])) if isinstance(wdetail, dict) else 0})",
        s_wdetail == 200 and has_word_meaning and has_dict_entry
    )

# 6. Global Bible Search
s_search, search_res, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/rpc/search_bible_content",
    method="POST",
    headers={"apikey": ANON_KEY},
    data={"p_query": "السماوات والارض", "p_limit": 10}
)
search_ok = isinstance(search_res, list) and len(search_res) > 0 and search_res[0]["book_name"] == "التكوين"
record_test(
    "Bible Search: Fast Normalized Search finds Verse in Genesis",
    "HTTP 200 returning Genesis 1:1",
    f"HTTP {s_search} (Found: {len(search_res) if isinstance(search_res, list) else 0} results)",
    s_search == 200 and search_ok
)

# 7. Security: Public Read Allowed, Public Modification Denied
s_unauth_ins, _, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/bible_verses",
    method="POST",
    headers={"apikey": ANON_KEY},
    data={"chapter_id": 1, "book_id": 1, "verse_number": 99, "text_ar": "آية غير مصرح بها", "text_clean": "اية", "source_url": "test"}
)
record_test(
    "Security: Unauthorized verse creation blocked by RLS",
    "HTTP 401 / 403 Forbidden",
    f"HTTP {s_unauth_ins}",
    s_unauth_ins in [400, 401, 403]
)

print("==================================================")
passed_count = sum(1 for r in results if r['passed'])
total_count = len(results)
print(f"TOTAL TESTS: {total_count} | PASSED: {passed_count} | FAILED: {total_count - passed_count}")
print("==================================================")

with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/phase8_bible_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
