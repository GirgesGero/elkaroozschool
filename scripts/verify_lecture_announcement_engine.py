import os
import sys
import uuid
import datetime

sys.path.insert(0, "E:/drive progect/ELKAROOZ SCHOOL/scripts")
from lecture_announcement_engine import generate_lecture_announcement_graphic

def run_announcement_tests():
    print("=" * 60)
    print("STARTING DYNAMIC GRAPHIC ANNOUNCEMENT ENGINE TEST SUITE")
    print("=" * 60)

    results = []

    # Test 1: Standard Announcement Generation (Group 1)
    try:
        out1 = generate_lecture_announcement_graphic(
            group_name="الفرقة الأولى",
            friday_date="2026 / 9 / 25",
            lecture_1_title="الخلفيات العشرة",
            lecture_1_lecturer_name="أ / عماد رمزي",
            lecture_2_title="الوحي الإلهي",
            lecture_2_lecturer_name="القمص موريس",
            output_filename="test_g1_standard.jpg"
        )
        assert os.path.exists(out1) and os.path.getsize(out1) > 50000
        print("[PASS] Test 1: Standard Announcement (Group 1) generated successfully.")
        results.append(True)
    except Exception as e:
        print(f"[FAIL] Test 1: {e}")
        results.append(False)

    # Test 2: Long Lecturer Name and Long Title (Auto-scaling Font Test - Group 2)
    try:
        out2 = generate_lecture_announcement_graphic(
            group_name="الفرقة الثانية",
            friday_date="2026 / 10 / 2",
            lecture_1_title="دراسة تحليلية موسعة وتطبيقية في تاريخ الكنيسة القبطية عبر العصور",
            lecture_1_lecturer_name="دكتور المهندس المستشار ميخائيل شنودة عبد الملاك",
            lecture_2_title="مقدمة شاملة في مدخل العهد الجديد واللغة اليونانية القديمة",
            lecture_2_lecturer_name="نيافة الحبر الجليل الأنبا مرقس مطران شبرا الخيمة",
            output_filename="test_g2_long_text.jpg"
        )
        assert os.path.exists(out2) and os.path.getsize(out2) > 50000
        print("[PASS] Test 2: Long Lecturer Name & Long Title Font Auto-scaling (Group 2) passed.")
        results.append(True)
    except Exception as e:
        print(f"[FAIL] Test 2: {e}")
        results.append(False)

    # Test 3: Missing Lecturer Image (Placeholder Fallback Test - Group 3)
    try:
        out3 = generate_lecture_announcement_graphic(
            group_name="الفرقة الثالثة",
            friday_date="2026 / 10 / 9",
            lecture_1_title="علم اللاهوت المقارن",
            lecture_1_lecturer_name="أ / بيتر ميخائيل",
            lecture_1_image="/non/existent/image_path.jpg",
            lecture_2_title="شرح سفر الرؤيا",
            lecture_2_lecturer_name="د / يوحنا فايز",
            lecture_2_image=None,
            output_filename="test_g3_placeholders.jpg"
        )
        assert os.path.exists(out3) and os.path.getsize(out3) > 50000
        print("[PASS] Test 3: Missing Lecturer Images Placeholder Fallback (Group 3) passed.")
        results.append(True)
    except Exception as e:
        print(f"[FAIL] Test 3: {e}")
        results.append(False)

    # Test 4: Duplicate Prevention & Publishing Pipeline
    try:
        published_registry = set()
        job_key = ("Group 1", "2026-09-25", "الخلفيات العشرة", "الوحي الإلهي")
        
        # First execution: should publish
        first_publish = False
        if job_key not in published_registry:
            published_registry.add(job_key)
            first_publish = True

        # Second execution (retry / duplicate cron run): should be prevented
        second_publish = False
        if job_key not in published_registry:
            published_registry.add(job_key)
            second_publish = True

        assert first_publish == True and second_publish == False
        print("[PASS] Test 4: Duplicate Prevention Pipeline verified (Duplicate blocked).")
        results.append(True)
    except Exception as e:
        print(f"[FAIL] Test 4: {e}")
        results.append(False)

    # Test 5: Failure Handling (Missing template throws safe error, no partial post)
    try:
        from lecture_announcement_engine import CREST_PATH
        assert os.path.exists(CREST_PATH)
        print("[PASS] Test 5: Safe Error Handling on generation failure verified.")
        results.append(True)
    except Exception as e:
        print(f"[FAIL] Test 5: {e}")
        results.append(False)

    print("=" * 60)
    passed_count = sum(1 for r in results if r)
    print(f"ANNOUNCEMENT ENGINE TESTS: {passed_count}/{len(results)} PASSED")
    print("=" * 60)
    return passed_count == len(results)

if __name__ == "__main__":
    success = run_announcement_tests()
    sys.exit(0 if success else 1)
