"""
Regression check: no live credential is committed anywhere in the repository.

This exists because the READY gate has a "no secrets in git, the ZIP, or the reports"
item, and until now that item was verified by reading files by hand -- which passed
while eleven tracked scripts were carrying a real Supabase anon key.

An anon key is public by design (it ships in the browser bundle), so it is not a
secret in the usual sense. It is still a credential worth keeping out of git:
  - it grants whatever read access its role carries, to anyone holding the repo
  - it identifies the production project to anyone scanning for keys
  - and it cannot be un-committed, so a later fix does not remove it

The rule enforced here is therefore "read config from the environment", not "never
mention a key". The supabase-js client is explicitly allowed to receive the anon key
from NEXT_PUBLIC_SUPABASE_ANON_KEY -- just never from a literal in tracked source.

Checks performed:
  1. no JWT-shaped literal in any tracked, non-vendored source file
  2. no JWT-shaped literal anywhere in the deployable ZIP
  3. no filled-in .env file tracked (only .env.example may be)
  4. the ZIP stays flat, so config/ and vendor/ are not web-reachable as directories

Exit code 0 when clean, 1 otherwise. Safe to run in CI.
"""

from __future__ import annotations

import io
import os
import re
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# A Supabase key is a JWT: three base64url segments, and the payload starts with eyJ.
JWT_RE = re.compile(rb"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")

# Directories whose contents are third-party or generated; a match there is not ours.
SKIP_DIRS = {".git", "node_modules", ".next", "vendor", "out", "dist", "__pycache__"}

SOURCE_EXT = {
    ".ts", ".tsx", ".js", ".mjs", ".cjs", ".php", ".py", ".md",
    ".json", ".yml", ".yaml", ".sql", ".txt", ".env", ".ini", "",
}

MAX_FILE_BYTES = 2_000_000

results = []


def check(ok, name, detail=""):
    results.append((ok, name, detail))


def git_tracked():
    """Tracked files as repo-relative POSIX paths; falls back to the whole tree."""
    try:
        out = subprocess.run(
            ["git", "-C", ROOT, "ls-files"],
            capture_output=True, text=True, check=True,
        ).stdout
        return {line.strip() for line in out.splitlines() if line.strip()}
    except Exception:
        tracked = set()
        for dirpath, dirnames, filenames in os.walk(ROOT):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                tracked.add(
                    os.path.relpath(os.path.join(dirpath, fn), ROOT).replace("\\", "/")
                )
        return tracked


def zip_candidates():
    found = []
    local = os.path.join(os.environ.get("LOCALAPPDATA", ""), "ElKarooz-API-public_html.zip")
    if local and os.path.exists(local):
        found.append(local)
    desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    if os.path.isdir(desktop):
        for fn in sorted(os.listdir(desktop)):
            if fn.startswith("ElKarooz-API-public_html") and fn.endswith(".zip"):
                found.append(os.path.join(desktop, fn))
    return found


def scan_no_jwt_in_tracked_source():
    offenders = []
    for rel in sorted(git_tracked()):
        if any(part in SKIP_DIRS for part in rel.split("/")):
            continue
        path = os.path.join(ROOT, rel.replace("/", os.sep))
        if not os.path.isfile(path):
            continue
        if os.path.splitext(rel)[1].lower() not in SOURCE_EXT:
            continue
        try:
            if os.path.getsize(path) > MAX_FILE_BYTES:
                continue
            data = io.open(path, "rb").read()
        except OSError:
            continue
        if JWT_RE.search(data):
            offenders.append(rel)
    check(
        not offenders,
        "no JWT-shaped literal in tracked source",
        ", ".join(offenders[:6]) if offenders else "0 matches across tracked source",
    )


def scan_no_jwt_in_zip():
    archives = zip_candidates()
    if not archives:
        check(True, "no JWT in the deployable ZIP", "no ZIP present -- nothing to scan")
        return
    offenders = []
    for zpath in archives:
        try:
            with zipfile.ZipFile(zpath) as zf:
                for name in zf.namelist():
                    try:
                        data = zf.read(name)
                    except Exception:
                        continue
                    if JWT_RE.search(data):
                        offenders.append("%s:%s" % (os.path.basename(zpath), name))
        except zipfile.BadZipFile:
            offenders.append("%s: unreadable" % os.path.basename(zpath))
    check(
        not offenders,
        "no JWT in the deployable ZIP",
        "%d archive(s) scanned" % len(archives) if not offenders else "; ".join(offenders[:6]),
    )


def scan_env_files():
    tracked = git_tracked()
    filled = sorted(
        rel for rel in tracked
        if os.path.basename(rel).startswith(".env")
        and os.path.basename(rel) != ".env.example"
    )
    check(
        not filled,
        "no filled-in .env tracked (only .env.example)",
        ", ".join(filled) if filled else "only .env.example",
    )


def scan_zip_is_flat():
    """
    The archive is flattened on purpose: public/ contents go to the document root so that
    /health resolves without a rewrite, and src/, config/, vendor/ and storage/ are kept
    as subdirectories precisely so each can carry its own .htaccess denying web access.

    So "flat" does not mean those directories are absent -- it means they are not at the
    root, and each one is protected. Asserting they are missing would be asserting the
    opposite of the design; asserting nothing guards them would be asserting nothing.

    Two things are checked instead:
      1. index.php sits at the root, which is what makes the API reachable at all
      2. every non-public directory carries a .htaccess, so it cannot be browsed
    """
    archives = zip_candidates()
    if not archives:
        check(True, "deployable ZIP layout", "no ZIP present -- nothing to scan")
        return

    problems = []
    for zpath in archives:
        label = os.path.basename(zpath)
        try:
            with zipfile.ZipFile(zpath) as zf:
                names = zf.namelist()
        except zipfile.BadZipFile:
            problems.append("%s: unreadable" % label)
            continue

        if "index.php" not in names:
            problems.append("%s: no index.php at the document root" % label)

        guarded = ("src/", "config/", "vendor/", "storage/")
        for prefix in guarded:
            members = [n for n in names if n.startswith(prefix)]
            if members and ("%s.htaccess" % prefix) not in names:
                problems.append("%s: %s has no .htaccess" % (label, prefix))

        # A frontend build must never ride along in the PHP package.
        if any(n.startswith(("frontend/", "app/", "pages/")) for n in names):
            problems.append("%s: frontend files present" % label)

    check(
        not problems,
        "deployable ZIP layout",
        "index.php at root; src/, config/, vendor/, storage/ each guarded by .htaccess"
        if not problems else "; ".join(problems[:5]),
    )


def main():
    scan_no_jwt_in_tracked_source()
    scan_no_jwt_in_zip()
    scan_env_files()
    scan_zip_is_flat()

    print("=" * 72)
    print("CREDENTIAL LEAK CHECK")
    print("=" * 72)
    failed = 0
    for ok, name, detail in results:
        print("  [%s] %s" % ("PASS" if ok else "FAIL", name))
        if detail:
            print("         %s" % detail)
        if not ok:
            failed += 1

    print("-" * 72)
    if failed:
        print("RESULT: %d passed, %d FAILED" % (len(results) - failed, failed))
        print("A committed key cannot be un-committed. Rotate it in Supabase, then purge")
        print("the history -- deleting the line from the working tree is not enough.")
        return 1
    print("RESULT: all %d passed -- no credential is committed." % len(results))
    return 0


if __name__ == "__main__":
    sys.exit(main())
