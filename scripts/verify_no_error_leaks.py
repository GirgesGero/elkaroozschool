#!/usr/bin/env python3
"""No exception text may cross the wire.

Why this exists
---------------
The generic catch blocks in the controllers all used to forward ``$e->getMessage()``
straight into ``Response::error()``. That looks fine because most of the thrown
messages are nice Arabic constants, but three upstream services interpolate real
server state into the message:

    AtomicRestoreService    'فشل نسخ الملف: ' . $src
    AppRoot                 '... Checked upward from ' . __DIR__ .
    DatabaseRestoreService  'جدول ' . $table . ' جدول داخلي ولا يمكن استعادته'

So the response body handed the caller the absolute staging path, the application root
and whether a guessed archive member existed. Only reachable by an authenticated
admin, which is exactly why it survives review: the caller is "trusted". But an admin
token that leaks once turns a restore error message into a filesystem map for whoever
holds it.

The rule this enforces
----------------------
An exception message may reach the server log, never the response. The response
carries a stable failure code plus a correlation id that ties the two together, so the
operator can still find the detail without the client ever seeing a path.

What it does NOT flag
---------------------
- ``error_log(...)`` with a message -- that is the destination we want.
- ``AuditLogService::log(...)`` -- server-side, admin-scoped, by design.
- Re-throwing: ``throw new RestoreFailedException($e->getMessage(), ...)`` hands the
  text to a layer that is obliged to sanitise it before responding.
- A controller-authored constant such as
  ``Response::error('تعذر قراءة الملف', 'X', 400)`` -- no ``$e`` involved.

Run: python scripts/verify_no_error_leaks.py
"""

from __future__ import annotations

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend-api")

# Direct forwarding of exception text into a response body.
LEAK = re.compile(
    r"Response::(?:error|success)\s*\(\s*\$[a-zA-Z_]\w*->getMessage\s*\(\s*\)",
    re.IGNORECASE,
)

# The same text placed in a details/context array, which is equally visible.
LEAK_DETAIL = re.compile(
    r"['\"][a-z_]*['\"]\s*=>\s*\$[a-zA-Z_]\w*->getMessage\s*\(\s*\)",
    re.IGNORECASE,
)

# Passing it to another exception's constructor is the sanctioned way to move it.
RETHROW = re.compile(
    r"throw\s+new\s+[\w\\]+\s*\(\s*\$[a-zA-Z_]\w*->getMessage\s*\(\s*\)"
)

SKIP_DIRS = {"vendor", "node_modules", ".git", "storage", "__pycache__"}
SKIP_FILES = {".user.ini"}


def php_files():
    out = []
    for dirpath, dirnames, filenames in os.walk(BACKEND):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name.endswith(".php") and name not in SKIP_FILES:
                out.append(os.path.join(dirpath, name))
    return sorted(out)


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def main():
    files = php_files()
    findings = []

    for path in files:
        text = open(path, encoding="utf-8", errors="replace").read()
        rel = os.path.relpath(path, ROOT).replace("\\", "/")
        for pattern, kind in ((LEAK, "response"), (LEAK_DETAIL, "response detail")):
            for m in pattern.finditer(text):
                span = text[m.start():m.start() + 120]
                if kind == "response" and RETHROW.search(span):
                    continue
                findings.append((rel, line_of(text, m.start()), kind, m.group(0)[:70]))

    print("=" * 66)
    print("No exception text in an HTTP response")
    print("=" * 66)

    if findings:
        for rel, line, kind, snippet in findings:
            print("  [FAIL] %s:%d  %s: %s" % (rel, line, kind, snippet))
        print()
        print("=== %d leaked, 0 clean ===" % len(findings))
        print()
        print("Send the detail to error_log() instead, and return a stable code plus")
        print("an error_id. See RestoreController::refuse() for the pattern.")
        return 1

    print("  [PASS] %d PHP files scanned, no exception text reaches a response" % len(files))
    print()
    print("=== 0 leaked, 1 clean ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
