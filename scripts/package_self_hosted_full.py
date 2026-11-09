import os
import re
import shutil
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BE_ROOT = os.path.join(ROOT, 'backend-api')
INTERNAL_DIRS = ['config', 'src', 'vendor']
OPTIONAL_GUARDED_DIRS = ['storage']

DENY_ALL_HTACCESS = """<IfModule mod_authz_core.c>
    Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
</IfModule>
"""

passed = 0
failed = 0


def check(label: str, ok: bool, detail: str = '') -> None:
    global passed, failed
    if ok:
        passed += 1
        print(f"  [PASS] {label}")
    else:
        failed += 1
        suffix = f"  <-- {detail}" if detail else ""
        print(f"  [FAIL] {label}{suffix}")


def main() -> int:
    print("=== 1. Preconditions ===")
    check("backend-api/public/index.php exists", os.path.isfile(os.path.join(BE_ROOT, "public/index.php")))
    check("backend-api/public/.htaccess exists", os.path.isfile(os.path.join(BE_ROOT, "public/.htaccess")))
    check("backend-api/public/.user.ini exists", os.path.isfile(os.path.join(BE_ROOT, "public/.user.ini")))
    check("backend-api/src/Services/ArchiveExtractor.php is present", os.path.isfile(os.path.join(BE_ROOT, "src/Services/ArchiveExtractor.php")))
    root_template = os.path.join(BE_ROOT, "public/htaccess_root.template")
    check("root guard template exists", os.path.isfile(root_template))
    for d in INTERNAL_DIRS:
        check(f"{d}/ is present in the source tree", os.path.isdir(os.path.join(BE_ROOT, d)))

    print("\n=== 2. Secret scan ===")
    forbidden = []
    for dirpath, _, filenames in os.walk(BE_ROOT):
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, BE_ROOT).replace("\\", "/")
            if rel.startswith(("vendor/", "storage/", "tests/")):
                continue
            if re.search(r"(^|/)\.env(\.|$)", rel) and not rel.endswith((".example", ".template")):
                forbidden.append(f"{rel} (env file)")
                continue
            if re.search(r"\.(php|json|env|ini|conf)$", rel, re.I):
                with open(full, "r", encoding="utf-8", errors="ignore") as f:
                    body = f.read()
                if re.search(r"""(sb_secret_|service_role_key\s*=\s*['"][A-Za-z0-9_-]{20,})""", body, re.I):
                    forbidden.append(f"{rel} (looks like a real key)")

    check("no .env, dev-only paths, or embedded keys in the source tree", len(forbidden) == 0, "; ".join(forbidden[:5]))

    print("\n=== 3. Build ===")
    deploy_dir = os.path.join(ROOT, "deploy-packages")
    os.makedirs(deploy_dir, exist_ok=True)
    out_file = os.path.join(ROOT, "ElKarooz-API-public_html.zip")
    deploy_v3 = os.path.join(deploy_dir, "HOSTINGER_PUBLIC_HTML_READY_v3.zip")

    with zipfile.ZipFile(out_file, "w", zipfile.ZIP_DEFLATED) as zf:
        def add_tree(src_dir: str, prefix: str) -> int:
            count = 0
            for dp, _, fns in os.walk(src_dir):
                for fn in fns:
                    full = os.path.join(dp, fn)
                    rel = os.path.relpath(full, src_dir).replace("\\", "/")
                    if rel in (".htaccess", "htaccess_root.template"):
                        continue
                    if rel.startswith(".env") or rel.endswith((".bak", ".sqlite", ".sqlite3", ".db")):
                        continue
                    arcname = rel if prefix == "" else f"{prefix}/{rel}"
                    zf.write(full, arcname)
                    count += 1
            return count

        n_pub = add_tree(os.path.join(BE_ROOT, "public"), "")
        print(f"  added {n_pub} files from public/")
        n_int = sum(add_tree(os.path.join(BE_ROOT, d), d) for d in INTERNAL_DIRS)
        print(f"  added {n_int} files from {', '.join(INTERNAL_DIRS)}")

        with open(root_template, "r", encoding="utf-8") as f:
            zf.writestr(".htaccess", f.read())
        print("  added .htaccess (root web-root guard)")

        with open(os.path.join(BE_ROOT, "public/.htaccess"), "r", encoding="utf-8") as f:
            zf.writestr("public/.htaccess", f.read())
        print("  added public/.htaccess")

        for d in INTERNAL_DIRS + OPTIONAL_GUARDED_DIRS:
            zf.writestr(f"{d}/.htaccess", DENY_ALL_HTACCESS)
        print(f"  added deny-all guards: {', '.join(INTERNAL_DIRS + OPTIONAL_GUARDED_DIRS)}")

    shutil.copy2(out_file, deploy_v3)

    # Remove the old insecure archive that bundled elkarooz.sqlite if present
    old_insecure_zip = os.path.join(deploy_dir, "HOSTINGER_SELF_HOSTED_FULL_PACKAGE.zip")
    if os.path.exists(old_insecure_zip):
        os.remove(old_insecure_zip)
        print("  removed legacy insecure HOSTINGER_SELF_HOSTED_FULL_PACKAGE.zip")

    print("\n=== 4. Verify archive contents ===")
    with zipfile.ZipFile(out_file, "r") as zf:
        names = zf.namelist()
        index_body = zf.read("index.php").decode("utf-8")

    check("archive is non-empty", len(names) > 0, str(len(names)))
    check("root .htaccess is present", ".htaccess" in names)
    check("index.php is at the archive root", "index.php" in names)
    check("public/.htaccess is present", "public/.htaccess" in names)
    check(".user.ini is packaged at the archive root", ".user.ini" in names)

    for d in INTERNAL_DIRS:
        check(f"{d}/.htaccess deny-all guard is present", f"{d}/.htaccess" in names)
        check(f"{d}/ actually has PHP in it", any(n.startswith(f"{d}/") and n.endswith(".php") for n in names))
    check("storage/.htaccess deny-all guard is present", "storage/.htaccess" in names)
    check("no .env in the archive", not any(re.search(r"(^|/)\.env", n) for n in names))
    check("no .sqlite in the archive", not any(n.endswith((".sqlite", ".sqlite3", ".db")) for n in names))
    check("private Hostinger env template is NOT packaged", "hostinger.env.example" not in names)
    check("environment loader is packaged", "src/Utils/Environment.php" in names)
    check("the guard template is NOT shipped at the web root", "htaccess_root.template" not in names)
    check("no .git in the archive", not any("/.git/" in n for n in names))

    req_matches = re.findall(r"require_once\s+\$appRoot\s*\.\s*'([^']+)'", index_body)
    missing_reqs = [r.lstrip("/") for r in req_matches if r.lstrip("/") not in names]
    check("every class index.php requires is present in the archive", len(missing_reqs) == 0, ", ".join(missing_reqs))
    check(
        "the private environment loader is wired into the front controller",
        "\\App\\Utils\\Environment::load($appRoot)" in index_body
        and index_body.find("\\App\\Utils\\Environment::load($appRoot)") < index_body.find("CorsMiddleware::handle()"),
    )
    check("SafeFailure.php is packaged", "src/Controllers/SafeFailure.php" in names)
    check("ArchiveExtractor.php is packaged", "src/Services/ArchiveExtractor.php" in names)
    check("DatabaseExportService is packaged", "src/Services/DatabaseExportService.php" in names)
    check("DatabaseRestoreService is packaged", "src/Services/DatabaseRestoreService.php" in names)

    with open(root_template, "r", encoding="utf-8") as f:
        guard_body = f.read()
    deny_pos = guard_body.find('<FilesMatch "\\.php$">')
    grant_pos = guard_body.find('<Files "index.php">')
    check("root guard denies all PHP", deny_pos != -1)
    check("root guard re-grants index.php", grant_pos != -1)
    check("the deny comes BEFORE the grant (ordering is load-bearing)", deny_pos != -1 and grant_pos != -1 and deny_pos < grant_pos)

    print(f"\n  archive 1: {out_file} ({os.path.getsize(out_file)} bytes, {len(names)} entries)")
    print(f"  archive 2: {deploy_v3} ({os.path.getsize(deploy_v3)} bytes)")
    print(f"\n=== SUMMARY ===\n{passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
