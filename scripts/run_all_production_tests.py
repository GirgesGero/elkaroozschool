import subprocess
import sys
import os

scripts = [
    "verify_auth_roles_security.py",
    "verify_phase4_academic_attendance.py",
    "verify_phase5_marathon.py",
    "verify_phase6_feed.py",
    "verify_phase7_library_media.py",
    "verify_phase8_bible.py",
    "verify_phase9_full.py",
    "verify_phase10_notifications.py",
    "verify_phase11_e2e.py",
    "verify_lecture_announcement_engine.py",
    "verify_admin_ux_redesign.py",
    "verify_final_visual_permission_ux.py"
]

python_exe = "C:/Users/Girge/AppData/Local/Programs/Python/Python311/python.exe"
scripts_dir = "E:/drive progect/ELKAROOZ SCHOOL/scripts"

print("=" * 80)
print("RUNNING COMPLETE REPOSITORY TEST SUITE FOR PRODUCTION READINESS")
print("=" * 80)

total_passed_scripts = 0
total_failed_scripts = 0

for s in scripts:
    path = os.path.join(scripts_dir, s)
    if not os.path.exists(path):
        print(f"[SKIP] {s} not found")
        continue
    
    print(f"\n--- Running: {s} ---")
    proc = subprocess.run([python_exe, path], capture_output=True, text=True, encoding="utf-8", errors="ignore")
    print(proc.stdout[-500:] if len(proc.stdout) > 500 else proc.stdout)
    if proc.returncode == 0:
        print(f"[SUCCESS] {s} passed.")
        total_passed_scripts += 1
    else:
        print(f"[ERROR] {s} failed with exit code {proc.returncode}.")
        if proc.stderr:
            print("STDERR:", proc.stderr[-300:])
        total_failed_scripts += 1

print("=" * 80)
print(f"FINAL PRODUCTION TEST SUITE RESULT: {total_passed_scripts}/{len(scripts)} SCRIPTS PASSED (Failures: {total_failed_scripts})")
print("=" * 80)
sys.exit(0 if total_failed_scripts == 0 else 1)
