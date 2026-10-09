import os
import re

def audit_security_and_logic():
    print("=" * 60)
    print("STARTING DEEP CODEBASE SECURITY & LOGIC AUDIT")
    print("=" * 60)

    issues = []

    # 1. PHP Codebase Security Audit
    backend_dir = "E:/drive progect/ELKAROOZ SCHOOL/backend-api"
    dangerous_php = ["eval(", "shell_exec(", "system(", "passthru(", "exec(", "unserialize("]
    for root, dirs, files in os.walk(backend_dir):
        for f in files:
            if f.endswith(".php"):
                fp = os.path.join(root, f)
                with open(fp, "r", encoding="utf-8", errors="ignore") as fh:
                    lines = fh.readlines()
                    for idx, line in enumerate(lines):
                        for term in dangerous_php:
                            if term in line and not line.strip().startswith("//") and not line.strip().startswith("*"):
                                issues.append(f"[PHP Security Risk] {fp}:{idx+1} contains {term}")

    # 2. Frontend Security & Secret Audit
    frontend_dir = "E:/drive progect/ELKAROOZ SCHOOL/frontend/src"
    secret_terms = ["service_role", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET", "ANTIGRAVITY_TOKEN"]
    for root, dirs, files in os.walk(frontend_dir):
        for f in files:
            if f.endswith((".ts", ".tsx", ".js")):
                fp = os.path.join(root, f)
                with open(fp, "r", encoding="utf-8", errors="ignore") as fh:
                    content = fh.read()
                    for term in secret_terms:
                        if term in content:
                            issues.append(f"[Frontend Secret Leak] {fp} contains {term}")

    # 3. Database Migration Logic & RLS Audit
    migrations_dir = "E:/drive progect/ELKAROOZ SCHOOL/supabase/migrations"
    sql_files = sorted([os.path.join(migrations_dir, f) for f in os.listdir(migrations_dir) if f.endswith(".sql")])
    
    rls_enabled_tables = set()
    total_created_tables = set()

    for sf in sql_files:
        with open(sf, "r", encoding="utf-8", errors="ignore") as fh:
            content = fh.read()
            # Match table creations
            for m in re.finditer(r"CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z0-9_\.]+)", content, re.IGNORECASE):
                tname = m.group(1).split(".")[-1]
                total_created_tables.add(tname)
            # Match RLS enable statements
            for m in re.finditer(r"ALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+([a-zA-Z0-9_\.]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY", content, re.IGNORECASE):
                tname = m.group(1).split(".")[-1]
                rls_enabled_tables.add(tname)

    print(f"Total Tables Created: {len(total_created_tables)}")
    print(f"Total Tables with RLS Enabled: {len(rls_enabled_tables)}")

    missing_rls = total_created_tables - rls_enabled_tables
    if missing_rls:
        # Filter out system or test tables if any
        for mt in missing_rls:
            issues.append(f"[Database Security Warning] Table without explicit ENABLE RLS: {mt}")

    # 4. Thursday Lock & Marathon Logic Check
    thursday_lock_found = False
    marathon_sequential_found = False
    admin_singleton_found = False
    for sf in sql_files:
        with open(sf, "r", encoding="utf-8", errors="ignore") as fh:
            content = fh.read()
            if "trg_attendance_thursday_freeze" in content or "check_attendance_thursday_lock" in content:
                thursday_lock_found = True
            if "trg_marathon_sequential_check" in content or "last_answered_order" in content:
                marathon_sequential_found = True
            if "idx_single_admin" in content or "idx_single_super_user" in content:
                admin_singleton_found = True

    print(f"Thursday Lock Trigger Present: {thursday_lock_found}")
    print(f"Marathon Sequential Trigger Present: {marathon_sequential_found}")
    print(f"Admin/Super User Singleton Indexes Present: {admin_singleton_found}")

    if not thursday_lock_found:
        issues.append("[Logic Error] Thursday lock trigger missing in migrations.")
    if not marathon_sequential_found:
        issues.append("[Logic Error] Marathon sequential enforcement trigger missing in migrations.")
    if not admin_singleton_found:
        issues.append("[Logic Error] Admin singleton constraint missing in migrations.")

    print("=" * 60)
    print(f"AUDIT COMPLETED: {len(issues)} ISSUES FOUND")
    for iss in issues:
        print(" - ", iss)
    print("=" * 60)
    return len(issues) == 0

if __name__ == "__main__":
    audit_security_and_logic()
