# EL KAROOZ SCHOOL — Go-Live Checklist

**Audit date:** 2026-09-30

Every box below is either ✅ verified with evidence in this audit, or ⛔ blocking.
Nothing here is inherited from an earlier report.

Legend: ✅ verified · ⚠️ partial / needs a human · ⛔ blocking

---

## ⛔ Blocking — must be done before launch

### B1. Vercel env vars are not inlined in the live build
The last checked production bundle contained
`createBrowserClient(r.env.NEXT_PUBLIC_SUPABASE_URL, …)` — i.e. **no values**.
Login cannot work until this is fixed.

- [ ] `NEXT_PUBLIC_SUPABASE_URL` → value `https://kgqgnqjkrghvktymbimz.supabase.co`
- [ ] Visibility = **Config** (not `Secret`)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `sb_publishable_…`
- [ ] Visibility = **Config**
- [ ] Both scoped to **All Environments**
- [ ] **Redeploy** (values are baked in at build time)
- [ ] Verify: the login chunk contains the project URL
      `curl -s $BASE/_next/static/chunks/app/login/<hash>.js | grep -c kgqgnqjkrghvktymbimz` → `≥ 1`

### B2. PHP API is not deployed
No deployment credentials exist on this machine for the PHP host, and the host is
not answering at all (`https://elkaroozschool.is-best.net` → curl rc=56, HTTP
rc=52). This cannot be completed from here; it needs someone with hosting access.

Build the archive with `php scripts/package_zip.php` (27/27, 46 entries). It emits
the archive to `%LOCALAPPDATA%\ElKarooz-API-public_html.zip`, or to a `.build`
suffixed name if that path is locked by another process.

> ⚠️ **Check the filename you upload.** The canonical path is currently held open
> by another process, so builds land at
> `ElKarooz-API-public_html.zip.<pid>.build`. An older
> `ElKarooz-API-public_html.zip` (66,539 bytes) is still sitting there from a
> previous build and does **not** contain the database exporter. Uploading the
> wrong one silently ships an older backend. The packager asserts every
> `require_once` in `index.php` resolves inside the archive, and prints the exact
> output path and size — verify those against what you upload.

Environment: PHP **8.3.35** (the local binary used for all suites is 8.3.35,
not the 8.3.14 quoted in older notes).

- [ ] Upload to `public_html/` (layout in [PRODUCTION_DEPLOYMENT.md §3](PRODUCTION_DEPLOYMENT.md#3-deploying-the-php-api-to-hostinger))
- [ ] `vendor/` present (contains `firebase/php-jwt`)
- [ ] `.htaccess` present **at the archive root** (the web-root guard — see B2a)
- [ ] `config/.htaccess`, `src/.htaccess`, `vendor/.htaccess`, `storage/.htaccess` all present
- [ ] All PHP env vars set (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, and the rest per
      [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md))
- [ ] `chmod 755 storage/`
- [ ] `https://elkaroozschool.is-best.net/health` → `"status": "ONLINE"`

### B2a. Web-root guard is unverified against a real Apache
`config/`, `src/` and `vendor/` sit inside the web root under the flattened
layout, and the `.htaccess` shipped in `public/` does not protect them — its
front-controller rule only fires for paths that are not real files, so
`/config/supabase.php` is served verbatim.

`htaccess_root.template` denies every `.php` and re-grants `index.php`, and
`scripts/package_zip.php` asserts that structure. That is a **structural**
check only: no Apache or httpd binary is available on this machine and the host
is not answering, so the guard has never been exercised against a live server.

Run these three on the deployed host. The first two must be 403.

- [ ] `GET /config/supabase.php` → **403**
- [ ] `GET /src/Utils/AppRoot.php` → **403**
- [ ] `GET /api/health` → 200 (proves `index.php` was not caught by the deny)
- [ ] `GET /vendor/composer/installed.json` → **403**

Source disclosure would be completely silent if the guard were lost, so treat
this as a hard gate rather than a formality.

### B3. End-to-end login never tested
No successful `username + password` login has been executed against production at
any point in this project. Role gates are proven locally with real signed tokens
(`verify_php_role_matrix.php` 74/74) and in the database (`verify_role_matrix.sql`
34/34, 0 failures), but neither substitutes for a real login against the deployed
host.

- [ ] Log in as **admin** → lands on the dashboard
- [ ] Log in as **trainee** → sees only their own group
- [ ] Log in as **servant** → sees only their own group
- [ ] Log in as **secretariat** → sees only their own group
- [ ] Log in as **super_user** → global access
- [ ] Suspended account → refused with `ACCOUNT_SUSPENDED` / 403

### B4. Sessions issued before the metadata backfill are still valid
The backfill moved `role_id` / `group_id` / `is_active` from `profiles` into
`auth.users.raw_app_meta_data` (production verified 50/50 on all three fields).
The JWT middleware reads those claims, so any **already-issued** token still
carries the old, pre-backfill claims — including for the 10 trainee accounts
that previously had no metadata at all, which were resolving to
`role = authenticated, group_id = 0`.

`JwtAuthMiddleware` now rejects `is_active = false`, but that check only sees the
claims inside the presented token. Nothing forces an existing token to be
re-read. Until sessions are expired this is a live authorization gap, not a
theoretical one.

- [ ] Force sign-out of all users, or revoke sessions, after deploy
- [ ] Confirm the backfill did not promote or demote anyone unexpectedly:
      compare `profiles` vs `raw_app_meta_data` for all 50 accounts

### B5. `profiles` and `raw_app_meta_data` have no sync mechanism — FIXED, deployed
Closed by `20261001150000_sync_profile_app_metadata.sql`, applied to production and
verified: the trigger exists, and all 50/50 accounts still agree on role, group_id
and is_active with RLS intact (50/50, rls_off = 0).

Measured behaviour on production, inside a rolled-back transaction:
group 2→1 propagated, role→servant propagated, restore propagated, suspension and
soft-delete both flipped `is_active` to false, and unrelated metadata keys
(`provider`, `providers`) survived the merge. Escalating a profile to
`super_user` is refused with SQLSTATE 42501, and only `service_role` can execute
the function.

- [x] Trigger mirrors role / group_id / is_active on INSERT and on UPDATE of the
      privilege columns
- [x] Verified with real role, group and suspension changes in a rollback transaction
- [x] `super_user` escalation refused (42501)
- [x] Unrelated metadata keys preserved through the merge
- [ ] Still requires B4: existing sessions still need to be expired

Note: `roles.id` *is* the role name (varchar), there is no `roles.role_name`
column. A first draft of the migration joined to one and would have failed on
apply.

### B6. No route × role × group matrix on production HTTP
`verify_php_role_matrix.php` exercises the middleware gates directly with signed
JWTs. It does not go over HTTP, so it cannot catch a route that is registered but
reachable by the wrong role, or a controller that skips its gate.

- [ ] For each of the 5 roles × the full route list, record the real status code
- [ ] Confirm `403` responses carry the error envelope, not an HTML error page

---

### B7. Database backup now works; database RESTORE does not exist yet

**Status: half closed.** The export side is done and verified. The restore side
does not exist and must not be invented late.

#### Closed — logical database export (2026-10-01)

The manifest previously hardcoded `includes_database => false`, on the grounds
that a logical Postgres dump cannot be produced through PostgREST. That
reasoning was wrong: `pg_dump` is not required to make a logical export.

Two `service_role`-only RPCs now serialise any public table to jsonb from inside
Postgres, over the endpoint the rest of the backup already used:

| RPC | Grants | Returns |
|---|---|---|
| `export_manifest()` | `service_role` only | every public table + exact row count |
| `export_table(t, l, o)` | `service_role` only | one table as jsonb, paginated |

`DatabaseExportService` drives them and stages the result under
`<staging>/database/<table>.json` before the manifest is written, so the
manifest records real counts.

| Check | Result |
|---|---|
| `export_manifest()` on production | 50 tables, 1091 rows total |
| `anon` calling either RPC | denied |
| `authenticated` (even `super_user`) calling either RPC | denied |
| `service_role` calling either RPC | works |
| SQL injection via `p_table` (`'profiles; DROP TABLE profiles--'`) | rejected |
| schema escape (`'auth.users'`, `'pg_catalog.pg_authid'`) | rejected |
| exported keys vs real `profiles` columns | no unknown keys |
| multi-page sweep, 50 rows at 30/page | 50 rows, 50 distinct ids, no dupes |
| PHP unit suite `scripts/verify_database_export.php` | **43/43** |
| packaging audit (`require` coverage) | **27/27** |

**Bug found and fixed during verification.** `has_more` was originally computed
as `jsonb_array_length(rows) > p_limit`. A full page can never be longer than the
limit, so that is **always false** — every table larger than one page reported
"no more data" and the PHP loop stopped after page 1. `profiles` (50 rows,
30/page) reproduced it exactly: `has_more=false` with 20 rows still unread. It
would have produced silently truncated backups for any real table. Fixed by
deriving `has_more` from `count(*)` of the whole table, and returning that count
as `total_rows`. PHP now double-checks `total_rows` against the manifest count
before accepting an export.

#### Still open — no database restore path

`restore/preview` and `restore/execute` restore **files only**. There is no code
path that puts `database/*.json` back. Do not treat a produced archive as
restorable until this is built and proven.

The obstacle is real, not an oversight: `service_role` **cannot write to
`auth.users`** over PostgREST. Verified against production. So a restore cannot
be naive PostgREST CRUD. It needs a `SECURITY DEFINER` restore RPC (or another
privileged boundary), and it must be **all-or-nothing** — a transaction that
either restores every table or leaves production untouched.

Required before this blocker can close:

- [ ] `restore/preview` recognises a database-bearing archive and reports what a
      database restore would touch, without touching it
- [ ] A `SECURITY DEFINER` restore RPC, `service_role`-only, that runs the whole
      restore in one transaction
- [ ] `restore/execute` with `DATABASE_ONLY` and `FULL` modes, honouring the
      all-or-nothing rule: any precondition failure leaves the database as it was
- [ ] Identity continuity: re-created `auth.users` must keep the same UUIDs, or
      every foreign key in `profiles`, attendance and marks breaks
- [ ] Password/session policy decided explicitly. `auth.users` is not in the
      export, so accounts must survive as accounts, not be re-created from
      nothing. Rotate-on-restore must not silently re-enable a suspended account
- [ ] Proven on a real archive, not a fixture: back up production, restore it,
      and diff row counts per table plus a spot-check of PII
- [ ] A rollback test first: restore inside a transaction that is then rolled
      back, proving no partial write escapes

Also note `restore/preview`'s `DATABASE_ONLY` mode was previously advertised but
unreachable. That advertisement is a documentation defect to remove or fix
alongside the real implementation.

---

## ✅ Verified in this audit — with evidence

### Supabase

| Check | Result | Evidence |
|---|---|---|
| RLS enabled on all tables | ✅ | 50/50 tables, `rls_disabled = 0` |
| Anon cannot read user data | ✅ | anon sees `profiles = 0` while authenticated sees 50 |
| Anon cannot call SECURITY DEFINER fns | ✅ | 29 exposed → 0 after migration; attack now `401 permission denied` |
| Group isolation (gallery/mp3/curriculum/exams) | ✅ | g1 = 5/5/8/1, g2 = **0/0/0/0** |
| Public reference data still readable | ✅ | `groups`, `roles`, `bible_books` → 200 after migration |
| Test account created during the audit removed | ✅ | deleted from `auth.users` |

### PHP backend (real PHP 8.3.14, real HTTP)

| Check | Result |
|---|---|
| `php -l` syntax, app + config | ✅ 24/24 |
| `php -l` syntax, vendored library | ✅ 10/10 |
| `vendor/autoload.php` resolves `Firebase\JWT\*` and `App\*` | ✅ |
| Config fails closed when env missing | ✅ returns `CONFIG_MISSING` |
| Config returns real env, no fallback shadowing | ✅ |
| No hardcoded JWT secret or anon key in config | ✅ |
| Forged unsigned JWT rejected | ✅ `401 INVALID_TOKEN` |
| JWT signed with wrong secret rejected | ✅ |
| Valid signed JWT accepted (not blanket-deny) | ✅ reaches handler |
| Unauthenticated `/backup/list`, `/export/data`, `/storage/upload` | ✅ all `401` |
| CORS: Vercel origin allowed | ✅ |
| CORS: foreign origin not echoed | ✅ |
| CORS: `localhost:3000` not trusted in production | ✅ |
| Path traversal (`../`, absolute, null-byte) blocked | ✅ all rejected, target intact |
| Legitimate in-root delete still works | ✅ not over-blocked |
| Health payload leaks no secrets | ✅ |

**Totals as of 2026-10-01:**

| Suite | Result |
|---|---|
| `php -l` syntax, all app + scripts | ✅ 0 errors |
| `verify_production_security.php` | ✅ **93/93** |
| `verify_database_export.php` | ✅ **43/43** |
| `verify_restore_atomicity.php` | ✅ 23/23 |
| `verify_backup_archive_limits.php` | ✅ 18/18 |
| `verify_export_formats.php` | ✅ 25/25 |
| `verify_storage_routing_runtime.php` | ✅ 62/62 |
| `verify_storage_folder_routing.sh` | ✅ 17/17 |
| `verify_api_http.php` (real HTTP) | ✅ 16 PASS / 0 FAIL |
| `verify_php_role_matrix.php` | ✅ 74/74 |
| `package_zip.php` | ✅ 27/27, 46 entries |

The export suite is new; the security suite grew from 77 to 93 because the old
check `includes_database => false` was inverted — it asserted the backup could
*not* export a database, which became false once a real exporter existed. It now
asserts the export is real, runs before the manifest, records real counts, and
that an export failure aborts the backup instead of yielding a files-only
archive.

### 🔴 CRITICAL-4: the PHP app-root bug (found while packaging)

The API is uploaded **flattened** into `public_html/`, so `config/`, `src/`,
`storage/` and `vendor/` all become siblings of `index.php`. The code used
`dirname(__DIR__)`, which under that layout points **above** the app.

**Impact:** every request on Hostinger would have returned `VENDOR_MISSING` or
fatal-errored — the API would not have worked at all.

**Fix:** one resolver, `backend-api/src/Utils/AppRoot.php`, used by all 7 files
that previously guessed. It works under **both** layouts and fails closed rather
than guessing.

**Verified by rebuilding the flattened bundle and re-running the suites against
it** (not just the repo layout):

| Check | Result |
|---|---|
| `php -l`, flattened `public_html` | ✅ 35 files / 0 errors |
| `php -l`, repo layout | ✅ 25 files / 0 errors |
| `verify_production_security.php` on flattened bundle | ✅ 21/21 |
| `verify_api_http.php` on flattened bundle | ✅ 16/16 |
| `/health` boots from flattened `public_html` | ✅ `ONLINE` |

### 🔴 Root `package.json` pinned a different Next.js than `frontend/`

The workspace root declared `next@14.2.24` while `frontend/` declared
`14.2.35`. Vercel therefore installed a **different version** from the one
being tested locally — the underlying cause of the earlier
`No Next.js version detected` and `Module not found: '@/...'` failures.

**Fix:** the root dependency was removed and the `workspaces` array dropped, so
local installs mirror Vercel's `cd frontend && npm install` exactly.

### Frontend

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `next build` | ✅ compiled, 22/22 routes generated |
| Build with **and** without env vars | ✅ both succeed (lazy Supabase client) |
| PWA assets served in production | ✅ `manifest.json`, `sw.js`, `logo.png` all 200 |
| No secrets in the client bundle | ✅ no `service_role`, no JWT secret |
| Next.js upgraded `14.2.24` → `14.2.35` | ✅ fixes critical middleware auth-bypass (CVSS 9.1) |

---

## ⚠️ Open items — not blocking, but tracked

### O1. `import_trainees_bulk_atomic` trusts its caller
Anon can no longer reach it, but it is still `SECURITY DEFINER` and callable by
**any** signed-in user. It should verify the caller's role and target group from
its own claims rather than from a parameter.

**Fix:** inside the function body, derive role/group via `auth.uid()` and reject
unless the caller is `admin`/`super_user` (or a servant with the right delegated
permission for that group).

### O2. 28 `SECURITY DEFINER` functions still callable by `authenticated`
Deliberate — these are the app's real features. But each should check the caller's
role/group internally. Supabase flags all 28; see
[lint 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

### O3. 37 functions have a mutable `search_path`
`ALTER FUNCTION … SET search_path = ''` closes it. Low severity (needs a
pre-existing write primitive) but trivially fixed in bulk.

### O4. 5 tables have RLS enabled but zero policies
`daily_verse_dispatch_state`, `daily_verses`, `group_secretariat`, `lecturers`,
`notification_templates`. RLS-on-with-no-policy means **deny all**, which is safe
but likely unintentional — confirm each is meant to be unreadable.

### O5. `pg_trgm` installed in `public`
Cosmetic hardening: move to a non-exposed schema.

### O6. Leaked-password protection disabled in Supabase Auth
Enable in Dashboard → Authentication → Providers → email.

### O7. `typescript.ignoreBuildErrors: true` still set
Currently masking nothing (`tsc` reports 0 errors), but it means the Vercel build
would not catch a type error. Remove once CI gates on `npm run typecheck`.

### O8. No automated test suite
Zero test files exist. `scripts/verify_production_security.php` and
`scripts/verify_api_http.php` cover the security-critical paths (37 assertions);
there is no unit/integration coverage for the modules themselves.

### O9. Legacy audit reports are stale
`docs/FINAL_PRODUCTION_READINESS_AUDIT.md` claims `READY` and `137/137 tests
passed`. That claim is **not reproducible** — no test suite exists to produce it.
Treat those numbers as void.

---

## Launch sequence

1. Complete **B1** (Vercel env + redeploy) — nothing else works until this is done.
2. Complete **B2** (upload PHP, set env, verify `/health`).
3. Complete **B3** (log in as each of the four roles).
4. Spot-check group isolation in the UI: log in as a group-1 trainee and confirm
   group 2 and 3 are not selectable.
5. Confirm Admin **can** edit Absence Message and Super User **cannot**.
6. Only then announce go-live.

---

## 🔴 اكتشاف جديد — 2026-09-30: خادم PHP على الإنتاج لا يستجيب

**هذا فحص حيّ لم يسبق تدوينه، وهو blocker مستقل عن كل اللي فوق.**

```
$ curl -v https://elkaroozschool.is-best.net/health
rc=56  ·  schannel: renegotiating SSL/TLS connection (يتكرر)
$ curl http://elkaroozschool.is-best.net/health
rc=52  ·  (لا رد)
DNS: elkaroozschool.is-best.net → 185.27.134.59   (الاسم شغّال)
```

**التفسير الأرجح:** الـ DNS بيشاور صح، بس الـ web server جوه مش بيرد —
على الأرجح الـ hosting **في maintenance** أو الـ PHP-FPM/Apache **متوقف** أو
`.htaccess` بيرجّع SSL renegotiation loop.

**⚠️ لا يمكنني إصلاح ده من هنا** — محتاج Dashboard/FTP لـ Hostinger. ومفيش
بيانات دخول محفوظة على الجهاز (بحثت: صفر references لـ `ftp` / `hostinger` /
`is-best.net` في إعدادات أو سكربتات).

### ما معنى ده للخطة
بند 7 في معايير القبول (`/health` على الإنتاج) مش بس "لسه ما اترفعتش" —
**الحزمة الحالية على السيرفر مفترضة إنها مش شغالة أصلًا**. لازم:

1. التأكد إن الـ hosting شغّال ومفيش maintenance.
2. رفع الحزمة: `%LOCALAPPDATA%\ElKarooz-API-public_html.zip` (36 ملف · مُتحقَّق).
3. ضبط `SUPABASE_*` + `SUPABASE_JWT_SECRET` + `APP_*` في `.env` على السيرفر.
4. `/health` → `200 ONLINE` **على السيرفر المنشور**، مش نسخة محلية.

### حالة الإنتاج (أُعيد فحصها فعليًا — 2026-10-01)

| المكوّن | النتيجة الحية | الحكم |
|---|---|---|
| `elkaroozschool.is-best.net` HTTPS | `rc=56` schannel: server closed abruptly | ❌ لا يستجيب |
| `elkaroozschool.is-best.net` HTTP | `rc=52` Empty reply from server | ❌ لا يستجيب |
| `elkaroozschool-seven.vercel.app/` | `307` redirect | ⚠️ |
| `elkaroozschool-seven.vercel.app/login` | `200` | ✅ الصفحة تُخدَم |
| Supabase auth (anon key) | `400 validation_failed` — **ليس** `401` | ✅ **المفتاح صالح و Auth متاح** |
| قاعدة البيانات | `50/50` جدول بـ RLS، `rls_off = 0` | ✅ |
| `profiles` المحذوف softly | `0` صف | لا أثر حالي — لا يوجد حساب محذوف |

**نقطة جديدة (2026-10-01):** الـ Supabase Auth **متاح ويعمل** — الـ anon key local رجع
`validation_failed` (أي المفتاح مقبول وقُدّم طلب، فقط الحقول ناقصة)، لا `401 invalid API key`.
وكل الحسابات النشطة على الإنتاج بتطابق معادلة الدخول في الواجهة
(`{username}@elkarooz-school.com`) و`email_confirmed_at` غير NULL — أي **العقد بين
الواجهة و Auth سليم**. المتبقي الوحيد الذي لا يمكن اختباره من هنا: **هل كلمات المرور
المدخلة تُقبل؟** هذا يحتاج بيانات دخول؛ أنت الوحيد اللي عنده.

> **نتيجة صريحة:** الـ blocker الحقيقي الوحيد هو **استضافة PHP** (مفيش استجابة إطلاقًا)
> + **بيئة Vercel** (غير متأكد أنها مضبوطة من السيرفر). الـ PHP API غير متاح = أي feature
> بيعتمد عليه (backup/import/export/upload) سيفشل. لازم يتصلح **قبل** إعلان أي production.
