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
- [ ] Upload to `public_html/` (layout in [PRODUCTION_DEPLOYMENT.md §3](PRODUCTION_DEPLOYMENT.md#3-deploying-the-php-api-to-hostinger))
- [ ] `vendor/` present (contains `firebase/php-jwt`)
- [ ] `.htaccess` present
- [ ] All 8 PHP env vars set
- [ ] `chmod 755 storage/`
- [ ] `https://elkaroozschool.is-best.net/health` → `"status": "ONLINE"`

### B3. End-to-end login never tested
No successful `username + password` login has been executed against production at
any point in this project.

- [ ] Log in as **admin** → lands on the dashboard
- [ ] Log in as **trainee** → sees only their own group
- [ ] Log in as **servant** → sees only their own group
- [ ] Log in as **secretariat** → sees only their own group

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

**Totals: 21/21 + 16/16 security checks passed.**

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
