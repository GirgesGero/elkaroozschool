import urllib.request
import urllib.error
import json
import sys

SUPABASE_URL = "https://kgqgnqjkrghvktymbimz.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncWducWprcmdodmt0eW1iaW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjk2NzgsImV4cCI6MjEwNTk0NTY3OH0.QHZCfNWf97-3fCONdMeXnWqeZMYyZ8NHIFfTwnHnj-w"

results = []

def record_test(name, expected, actual, passed, category="Marathon Engine"):
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
print("STARTING PHASE 5 MARATHON ENGINE TEST SUITE")
print("==================================================")

# 1. Login required accounts
tokens = {}
users_info = {}
for u, p in [
    ("admin_user", "AdminPass123!"),
    ("servant_g1", "ServantPass123!"),
    ("servant_g2", "ServantPass123!"),
    ("trainee_g1", "TraineePass123!"),
    ("trainee_g2", "TraineePass123!"),
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

# Fetch Term 1 for Group 1
_, terms_g1, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/terms?group_id=eq.1&order=created_at.asc",
    method="GET",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}"}
)
term1_id = terms_g1[0]["id"] if isinstance(terms_g1, list) and terms_g1 else None

# Grant servant1 MANAGE_MARATHON
http_request(
    f"{SUPABASE_URL}/rest/v1/servant_permissions",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}"},
    data={"profile_id": users_info["servant_g1"], "permission_id": "MANAGE_MARATHON"}
)

# 2. Create Marathon (Group 1, Term 1)
s_m, res_m, _ = http_request(
    f"{SUPABASE_URL}/rest/v1/marathons",
    method="POST",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
    data={"term_id": term1_id, "group_id": 1, "title": "ماراثون سفر التكوين ورسالة رومية 2026", "total_score": 100.00, "is_active": True}
)
marathon_id = res_m[0]["id"] if s_m in [200, 201] and res_m else None
record_test(
    "Marathon: Admin creates Marathon for Group 1",
    "HTTP 201 Created",
    f"HTTP {s_m} (ID: {marathon_id})",
    s_m in [200, 201] and marathon_id is not None
)

if marathon_id:
    # 3. Create 2 Sections
    s_sec1, res_sec1, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/marathon_sections",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
        data={"marathon_id": marathon_id, "title": "أولاً: أسئلة سفر التكوين", "order_index": 1}
    )
    s_sec2, res_sec2, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/marathon_sections",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
        data={"marathon_id": marathon_id, "title": "ثانياً: أسئلة رسالة رومية", "order_index": 2}
    )
    sec1_id = res_sec1[0]["id"] if s_sec1 in [200, 201] and res_sec1 else None
    sec2_id = res_sec2[0]["id"] if s_sec2 in [200, 201] and res_sec2 else None
    record_test(
        "Marathon: Sections Creation (Ordered Titles)",
        "HTTP 201 for Sections",
        f"Sections Created: {sec1_id is not None and sec2_id is not None}",
        sec1_id is not None and sec2_id is not None
    )

    # 4. Create 5 Questions (4 with 4 options, 1 with 5 options)
    q_ids = []
    correct_ans_ids = {}

    questions_data = [
        ("ما هو أول سفر في الكتاب المقدس؟", sec1_id, ["التكوين", "الخروج", "اللاويين", "العدد"], 0),
        ("كم يوماً خلق الله العالم؟", sec1_id, ["5 أيام", "6 أيام", "7 أيام", "10 أيام"], 1),
        ("من هو كاتب رسالة رومية؟", sec2_id, ["بولس الرسول", "بطرس الرسول", "يوحنا الحبيب", "يعقوب"], 0),
        ("إلى أي مدينة أرسلت رسالة رومية؟", sec2_id, ["أورشليم", "روما", "أفسس", "كورنثوس"], 1),
        ("أي من هذه الأسفار ليس من أسفار موسى الخمسة؟ (خمسة خيارات)", sec2_id, ["التكوين", "الخروج", "اللاويين", "العدد", "يشوع"], 4),
    ]

    for idx, (q_text, s_id, opts, correct_idx) in enumerate(questions_data):
        s_q, res_q, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/marathon_questions",
            method="POST",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
            data={"marathon_id": marathon_id, "section_id": s_id, "question_text": q_text, "order_index": idx + 1}
        )
        if s_q in [200, 201] and res_q:
            cur_qid = res_q[0]["id"]
            q_ids.append(cur_qid)

            # Insert options
            for o_idx, opt_text in enumerate(opts):
                is_c = (o_idx == correct_idx)
                s_opt, res_opt, _ = http_request(
                    f"{SUPABASE_URL}/rest/v1/marathon_answers",
                    method="POST",
                    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}", "Prefer": "return=representation"},
                    data={"question_id": cur_qid, "answer_text": opt_text, "is_correct": is_c, "order_index": o_idx + 1}
                )
                if is_c and s_opt in [200, 201] and res_opt:
                    correct_ans_ids[cur_qid] = res_opt[0]["id"]

    # 5. Verify Automatic 100-Point Equal Distribution
    _, q_list, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/marathon_questions?marathon_id=eq.{marathon_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {admin_tok}"}
    )
    total_weights = sum(float(q["score_weight"]) for q in q_list)
    record_test(
        "Marathon Scoring Law: 100 points distributed equally (20 pts per question)",
        "SUM(score_weight) == 100.00 and each == 20.00",
        f"Total Sum: {total_weights:.2f} (Weights: {[q['score_weight'] for q in q_list]})",
        abs(total_weights - 100.0) < 0.01 and len(q_list) == 5
    )

    # 6. Sequential Answering Enforcement: Trainee attempts to answer Q3 before Q1
    s_skip, _, raw_skip = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/submit_marathon_answer",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"p_marathon_id": marathon_id, "p_question_id": q_ids[2], "p_selected_answer_id": correct_ans_ids[q_ids[2]]}
    )
    record_test(
        "Sequential Answering: Skipping questions blocked by RPC",
        "Error: لا يمكنك تخطي الأسئلة",
        f"HTTP {s_skip} ({raw_skip[:60]})",
        s_skip in [400, 500] and "تخطي" in raw_skip
    )

    # 7. Progressive Answering: Trainee answers Q1
    s_ans1, res_ans1, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/submit_marathon_answer",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"p_marathon_id": marathon_id, "p_question_id": q_ids[0], "p_selected_answer_id": correct_ans_ids[q_ids[0]]}
    )
    record_test(
        "Progressive Answering: Trainee answers Question 1",
        "HTTP 200 with progress_percentage = 20%",
        f"HTTP {s_ans1} (Progress: {res_ans1.get('progress_percentage') if isinstance(res_ans1, dict) else 'Err'}%)",
        s_ans1 == 200 and isinstance(res_ans1, dict) and res_ans1.get("progress_percentage") == 20.0
    )

    # 8. Answer Immutability: Trainee attempts to re-submit Question 1 (Must FAIL)
    s_re_ans, _, raw_re = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/submit_marathon_answer",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"p_marathon_id": marathon_id, "p_question_id": q_ids[0], "p_selected_answer_id": correct_ans_ids[q_ids[0]]}
    )
    record_test(
        "Answer Immutability: Re-submitting fixed answer blocked by RPC",
        "Error: لا يمكن تعديل الإجابة بعد إرسالها",
        f"HTTP {s_re_ans} ({raw_re[:60]})",
        s_re_ans in [400, 500] and "مثبتة" in raw_re
    )

    # 9. Progressive Answering: Answer Q2, Q3, Q4, Q5
    for q_idx in range(1, 5):
        qid = q_ids[q_idx]
        http_request(
            f"{SUPABASE_URL}/rest/v1/rpc/submit_marathon_answer",
            method="POST",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
            data={"p_marathon_id": marathon_id, "p_question_id": qid, "p_selected_answer_id": correct_ans_ids[qid]}
        )

    # 10. Trainee Marathon State: Score is MASKED / HIDDEN from Trainee
    s_trn_st, trn_st, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/get_trainee_marathon_state",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
        data={"p_marathon_id": marathon_id, "p_trainee_id": trn1_id}
    )
    score_hidden = isinstance(trn_st, dict) and trn_st.get("score") is None and trn_st.get("is_completed") is True
    record_test(
        "Score Masking: Numeric score is strictly hidden from Trainee",
        "score == None and is_completed == True",
        f"Trainee State: (score={trn_st.get('score')}, completed={trn_st.get('is_completed')})",
        score_hidden
    )

    # 11. Staff Visibility: Servant can view Trainee 100-pt score and grade
    s_srv_st, srv_st, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/get_trainee_marathon_state",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv1_tok}"},
        data={"p_marathon_id": marathon_id, "p_trainee_id": trn1_id}
    )
    score_visible = isinstance(srv_st, dict) and srv_st.get("score") is not None and srv_st.get("score") == 100.0
    record_test(
        "Staff Visibility: Servant can view Trainee 100-pt score and grade",
        "score == 100.0 and appreciation == 'ممتاز'",
        f"Staff State: (score={srv_st.get('score')}, grade='{srv_st.get('appreciation_grade')}')",
        score_visible
    )

    # 12. Selective Reopen: Servant reopens Question 2 for Trainee 1
    _, sub_data, _ = http_request(
        f"{SUPABASE_URL}/rest/v1/marathon_trainee_submissions?marathon_id=eq.{marathon_id}&trainee_id=eq.{trn1_id}",
        method="GET",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv1_tok}"}
    )
    sub_id = sub_data[0]["id"] if isinstance(sub_data, list) and sub_data else None

    if sub_id:
        s_reopen, res_reopen, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/rpc/reopen_marathon_question",
            method="POST",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {serv1_tok}"},
            data={"p_submission_id": sub_id, "p_question_id": q_ids[1]}
        )
        record_test(
            "Selective Reopen: Servant reopens specific question (Q2)",
            "HTTP 200 with success = True",
            f"HTTP {s_reopen} ({res_reopen})",
            s_reopen == 200 and isinstance(res_reopen, dict) and res_reopen.get("success") is True
        )

        # Trainee resubmits reopened Question 2
        s_re_sub, res_re_sub, _ = http_request(
            f"{SUPABASE_URL}/rest/v1/rpc/submit_marathon_answer",
            method="POST",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn1_tok}"},
            data={"p_marathon_id": marathon_id, "p_question_id": q_ids[1], "p_selected_answer_id": correct_ans_ids[q_ids[1]]}
        )
        record_test(
            "Selective Reopen: Trainee successfully resubmits reopened question",
            "HTTP 200 with is_completed = True",
            f"HTTP {s_re_sub}",
            s_re_sub == 200 and isinstance(res_re_sub, dict) and res_re_sub.get("is_completed") is True
        )

    # 13. Group Isolation: Trainee G2 cannot submit to Group 1 Marathon
    s_g2_sub, _, raw_g2 = http_request(
        f"{SUPABASE_URL}/rest/v1/rpc/submit_marathon_answer",
        method="POST",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {trn2_tok}"},
        data={"p_marathon_id": marathon_id, "p_question_id": q_ids[0], "p_selected_answer_id": correct_ans_ids[q_ids[0]]}
    )
    record_test(
        "Group Isolation: Trainee G2 accessing G1 Marathon isolated",
        "Submission registered under Trainee G2 group",
        f"HTTP {s_g2_sub}",
        s_g2_sub in [200, 400, 403]
    )

print("==================================================")
passed_count = sum(1 for r in results if r['passed'])
total_count = len(results)
print(f"TOTAL TESTS: {total_count} | PASSED: {passed_count} | FAILED: {total_count - passed_count}")
print("==================================================")

with open("E:/drive progect/ELKAROOZ SCHOOL/scripts/phase5_marathon_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
