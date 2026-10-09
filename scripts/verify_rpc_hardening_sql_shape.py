from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase" / "migrations"
CANDIDATE_GLOB = "*_harden_marathon_and_audit_rpcs.sql"


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


def require(sql: str, pattern: str, message: str) -> None:
    if re.search(pattern, sql, flags=re.IGNORECASE | re.DOTALL) is None:
        fail(message)


def main() -> None:
    files = sorted(MIGRATIONS.glob(CANDIDATE_GLOB))
    if len(files) != 1:
        fail(f"expected exactly one {CANDIDATE_GLOB}; found {len(files)}")

    sql = files[0].read_text(encoding="utf-8")
    marathon_start = sql.lower().find("create or replace function public.get_trainee_marathon_state")
    audit_start = sql.lower().find("create or replace function public.log_operational_event")
    if marathon_start < 0 or audit_start < 0 or audit_start <= marathon_start:
        fail("migration must define the guarded marathon RPC before the audit RPC")

    marathon = sql[marathon_start:audit_start]
    audit = sql[audit_start:]

    require(
        sql,
        r"alter\s+function\s+public\.get_trainee_marathon_state\s*\(\s*uuid\s*,\s*uuid\s*\)\s*rename\s+to\s+_unsafe_get_trainee_marathon_state",
        "unguarded marathon implementation must be renamed before the wrapper is created",
    )
    require(
        sql,
        r"revoke\s+all\s+on\s+function\s+public\._unsafe_get_trainee_marathon_state\s*\(\s*uuid\s*,\s*uuid\s*\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated",
        "unsafe marathon implementation must not be executable by public, anon, or authenticated",
    )
    require(marathon, r"auth\.role\(\)\s*=\s*'service_role'", "trusted service-role compatibility branch is missing")
    require(marathon, r"v_actor_id\s*=\s*p_trainee_id", "self-access branch is missing")
    require(marathon, r"v_actor_role\s*=\s*'servant'", "servant role check is missing")
    require(marathon, r"has_servant_permission\s*\(\s*'MANAGE_MARATHON'\s*\)", "MANAGE_MARATHON permission check is missing")
    require(marathon, r"p_trainee_id[\s\S]*?group_id[\s\S]*?p_marathon_id", "target trainee and marathon group scope is missing")
    require(marathon, r"deleted_at\s+is\s+null", "deleted record guard is missing")
    require(marathon, r"is_active\s+(?:=\s*true|is\s+true)", "inactive actor guard is missing")
    require(marathon, r"errcode\s*=\s*'42501'", "authorization denial must use SQLSTATE 42501")
    require(
        sql,
        r"grant\s+execute\s+on\s+function\s+public\._unsafe_get_trainee_marathon_state\s*\(\s*uuid\s*,\s*uuid\s*\)\s+to\s+service_role",
        "unsafe marathon implementation should remain available only to service_role",
    )

    require(
        audit,
        r"if\s+v_request_role\s+is\s+distinct\s+from\s+'service_role'\s+and\s+not\s+public\.is_admin_or_super_user\(\)\s+then",
        "audit RPC must deny authenticated non-admin callers while preserving service_role",
    )
    require(audit, r"errcode\s*=\s*'42501'", "audit authorization denial must use SQLSTATE 42501")
    require(audit, r"v_actor_role\s*:=\s*'system'", "actorless service-role events must be attributed to system, not admin")
    if re.search(r"coalesce\s*\(\s*v_actor_role\s*,\s*'admin'\s*\)", audit, flags=re.IGNORECASE):
        fail("audit RPC must not label an actorless event as admin")
    require(audit, r"revoke\s+all\s+on\s+function\s+public\.log_operational_event", "audit RPC explicit revoke is missing")
    require(audit, r"grant\s+execute\s+on\s+function\s+public\.log_operational_event[\s\S]*?to\s+authenticated\s*,\s*service_role", "audit RPC intended caller grants are missing")

    print(f"PASS: SQL shape checks passed for {files[0].name}")


if __name__ == "__main__":
    main()
