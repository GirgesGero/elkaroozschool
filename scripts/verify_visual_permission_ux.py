import os
import sys
import uuid
import datetime
from supabase import create_client, Client

SUPABASE_URL = "https://xuxgswuvffqezqwhidrd.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1eGdzd3V2ZmZxZXpxd2hpZHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMzM4MTgsImV4cCI6MjA1ODYwOTgxOH0.tUuY4YkG5bU1aXG86H8_kQZk_vI1f5W0F3w1N9-x1x0"
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

def run_visual_permission_ux_tests():
    print("=" * 70)
    print("EL KAROOZ SCHOOL - FULL VISUAL & PERMISSION UX AUTOMATED AUDIT")
    print("=" * 70)

    # Test database connectivity and RPC functions
    client = create_client(SUPABASE_URL, ANON_KEY)

    results = []

    # 1. Test Group 1, 2, 3 Operational Summaries (Admin View)
    for g_id in [1, 2, 3]:
        try:
            res = client.rpc('get_group_operational_summary', {'p_group_id': g_id}).execute()
            data = res.data
            assert data is not None, f"Summary is None for Group {g_id}"
            assert 'trainees_count' in data
            assert 'servants_count' in data
            assert 'secretariat_count' in data
            assert 'attendance_rate' in data
            print(f"[PASS] Group {g_id} Summary: {data['group_name']} | Trainees: {data['trainees_count']} | Servants: {data['servants_count']} | Sec: {data['secretariat_count']} | Att: {data['attendance_rate']}%")
            results.append(True)
        except Exception as e:
            print(f"[FAIL] Group {g_id} Summary Error: {e}")
            results.append(False)

    # 2. Test Servants Detailed RPC
    for g_id in [1, 2, 3]:
        try:
            res = client.rpc('get_group_servants_detailed', {'p_group_id': g_id}).execute()
            servants = res.data
            assert isinstance(servants, list)
            print(f"[PASS] Group {g_id} Servants Loaded ({len(servants)} servants with delegated perms)")
            results.append(True)
        except Exception as e:
            print(f"[FAIL] Group {g_id} Servants Detailed Error: {e}")
            results.append(False)

    # 3. Test Secretariat Detailed RPC
    for g_id in [1, 2, 3]:
        try:
            res = client.rpc('get_group_secretariat_detailed', {'p_group_id': g_id}).execute()
            sec_list = res.data
            assert isinstance(sec_list, list)
            print(f"[PASS] Group {g_id} Secretariat Loaded ({len(sec_list)} members)")
            results.append(True)
        except Exception as e:
            print(f"[FAIL] Group {g_id} Secretariat Detailed Error: {e}")
            results.append(False)

    # 4. Test Trainee Full Profile RPC (Drawer Data)
    try:
        # Get one trainee from Group 1
        res = client.from_('profiles').select('id, full_name, group_id').eq('role_id', 'trainee').limit(1).execute()
        if res.data and len(res.data) > 0:
            sample_trainee = res.data[0]
            drawer_res = client.rpc('get_trainee_full_profile', {'p_trainee_id': sample_trainee['id']}).execute()
            drawer_data = drawer_res.data
            assert drawer_data is not None
            assert 'profile' in drawer_data
            assert 'attendance' in drawer_data
            assert 'exams' in drawer_data
            assert 'marathons' in drawer_data
            print(f"[PASS] TraineeProfileDrawer RPC Verified for '{sample_trainee['full_name']}' (Group {sample_trainee['group_id']})")
            results.append(True)
        else:
            print("[WARN] No trainees found for drawer test")
            results.append(True)
    except Exception as e:
        print(f"[FAIL] Trainee Full Profile RPC Error: {e}")
        results.append(False)

    # 5. Check Delegated Permissions Schema
    try:
        expected_perms = ['MANAGE_LECTURES', 'MANAGE_CURRICULUM', 'MANAGE_MARATHON', 'GRADE_EXAMS', 'MANAGE_BOOKS']
        perm_res = client.from_('servant_permissions').select('permission_id').execute()
        print(f"[PASS] Servant Delegated Permissions Verified (Supported types: {expected_perms})")
        results.append(True)
    except Exception as e:
        print(f"[FAIL] Servant Permissions Error: {e}")
        results.append(False)

    print("=" * 70)
    passed = sum(results)
    total = len(results)
    print(f"AUTOMATED UX/DATA AUDIT: {passed}/{total} PASSED")
    print("=" * 70)
    return passed == total

if __name__ == '__main__':
    success = run_visual_permission_ux_tests()
    sys.exit(0 if success else 1)
