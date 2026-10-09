# EL KAROOZ SCHOOL — Production Deployment

**Audit date:** 2026-09-30
**Status:** CONDITIONAL GO — see [Blocking items](#blocking-items-must-be-done-before-launch)
**Live frontend:** `https://elkaroozschool-seven.vercel.app`
**Live API:** `https://elkaroozschool.is-best.net`
**Supabase:** `https://kgqgnqjkrghvktymbimz.supabase.co`

---

## 1. Architecture

```
┌─────────────────────────────────┐      ┌──────────────────────────┐
│  Vercel (Next.js 14.2.35)       │      │  Hostinger               │
│  elkaroozschool-seven.vercel.app│      │  elkaroozschool.is-best  │
│                                 │      │  .net (PHP 8.1+)         │
│  • 22 routes                    │      │                          │
│  • middleware.ts → auth guard   │      │  public_html/            │
│  • PWA (manifest + sw.js)       │      │    ├── index.php         │
└────────┬────────────────────────┘      │    ├── .htaccess         │
         │                               │    ├── config/            │
         │ Bearer access token           │    ├── src/               │
         │                               │    ├── storage/           │
         ▼                               │    └── vendor/            │
┌─────────────────────────────────┐      └───────────┬──────────────┘
│  Supabase                       │                  │
│  • GoTrue auth (username+pw)    │                  │ service_role
│  • Postgres + RLS on 50 tables │◄─────────────────┘
│  • Storage                      │
└─────────────────────────────────┘
```

### The two auth surfaces (do not confuse them)

| Surface | Mechanism | Purpose |
|---|---|---|
| Frontend → Supabase | `signInWithPassword` (GoTrue) | Real user login, session cookie |
| PHP → Supabase | `Authorization: Bearer <JWT>` | Server-side privileged reads/writes |

The PHP layer never accepts a username/password. It only accepts a **JWT signed with
the Supabase JWT secret**, and it fails closed when that secret is absent.

---

## 2. Environment variables

Full contract with per-platform scope is in [`.env.example`](../.env.example).

### Vercel (Settings → Environment Variables)

| Variable | Visibility | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Config** | All Environments |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Config** | All Environments |

> **Visibility must be `Config`, not `Secret`.** Vercel rejects `secret` for a
> `NEXT_PUBLIC_` prefix. If you set it as `Secret`, the build succeeds but the
> values are **not inlined** and login silently fails at runtime with
> `Your project's URL and API key are required`.

After changing these you must **Redeploy** — `NEXT_PUBLIC_*` is inlined at build
time, so an existing deployment keeps its old (empty) values.

### Hostinger (Advanced → Environment Variables)

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://kgqgnqjkrghvktymbimz.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_…` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` (server only — never `NEXT_PUBLIC_`) |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Settings → API → JWT Secret |
| `APP_URL` | `https://elkaroozschool.is-best.net` |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `STORAGE_PUBLIC_URL` | `https://elkaroozschool.is-best.net/storage` |

`config/supabase.php` **fails closed**: if any of the first four is missing it
returns HTTP 500 `CONFIG_MISSING` and logs only the variable *names*. There are
no inline fallbacks any more.

---

## 3. Deploying the PHP API to Hostinger

`public/index.php` uses `dirname(__DIR__)`, so the **contents of `backend-api/public/`
must land directly in `public_html/`** and its siblings alongside it.

### Final layout

```
public_html/
├── index.php          ← from backend-api/public/index.php
├── .htaccess          ← from backend-api/public/.htaccess   (DO NOT OMIT)
├── config/            ← from backend-api/config/
├── src/               ← from backend-api/src/
├── storage/           ← from backend-api/storage/  (must be writable, 755)
└── vendor/            ← from backend-api/vendor/   (firebase/php-jwt)
```

`.htaccess` is mandatory: it is what rewrites unknown paths to `index.php`. Without
it every route except `/index.php` returns 404.

### Steps

1. Upload the contents of `backend-api/public/` **plus** `config/`, `src/`,
   `storage/`, `vendor/` into `public_html/`.
2. Set the environment variables above in Hostinger.
3. `chmod 755 storage/` and make it writable by PHP.
4. Verify: `https://elkaroozschool.is-best.net/health` must return
   `"status": "ONLINE"`.

### The `vendor/` directory

`firebase/php-jwt` v6.11.1 is vendored (MIT) and a small PSR-4 autoloader is
provided, so no Composer run is required on shared hosting. `index.php` checks for
`vendor/autoload.php` and returns a clear `VENDOR_MISSING` error instead of
fatal-erroring if the folder did not upload.

If you *do* have SSH, `composer install --no-dev --optimize-autoloader` works and
overwrites `vendor/composer/` with Composer's own map.

---

## 4. Deploying the frontend to Vercel

`vercel.json` at the repo root pins the monorepo wiring:

```json
{
  "framework": "nextjs",
  "installCommand": "cd frontend && npm install --no-audit --no-fund",
  "buildCommand": "cd frontend && npm run build && cp -r .next ../.next && rm -rf ../.next/cache && mkdir -p ../public && cp -r public/. ../public/"
}
```

Two traps this configuration exists to avoid, both hit during this deployment:

- **No `outputDirectory`.** Setting it makes Vercel serve the folder as *static
  files*, so `@vercel/next` never handles routing and every route 404s with
  `X-Vercel-Error: NOT_FOUND` — even though the build reports `Ready`.
- **`public/` must be copied.** Copying only `.next` leaves `manifest.json`,
  `sw.js` and `logo.png` as 404, breaking the PWA.

Push to `main` and Vercel deploys automatically.

---

## 5. Verifying a deployment

```bash
BASE=https://elkaroozschool-seven.vercel.app

# public pages
curl -s -o /dev/null -w '%{http_code}\n' $BASE/login          # 200
curl -s -o /dev/null -w '%{http_code}\n' $BASE/about          # 200

# protected pages must redirect, not render
curl -s -o /dev/null -w '%{http_code}\n' $BASE/groups         # 307 -> /login

# PWA assets
for a in manifest.json sw.js logo.png; do
  printf '%-16s ' $a; curl -s -o /dev/null -w '%{http_code}\n' $BASE/$a
done

# API
curl -s https://elkaroozschool.is-best.net/health
```

### Confirming the env actually inlined

`NEXT_PUBLIC_*` values are baked into the client bundle. To prove they are present:

```bash
curl -s $BASE/login | grep -o '/_next/static/chunks/app/login/[^"]*\.js' | head -1
# then fetch that chunk and confirm the Supabase URL appears:
curl -s "$BASE<chunk>" | grep -c 'kgqgnqjkrghvktymbimz'
```

`0` means the build had no env values — fix the visibility, then redeploy.

---

## 6. Security model

### Group isolation

Enforced in four independent layers. Hiding a UI element is *not* one of them.

| Layer | Mechanism |
|---|---|
| Supabase RLS | `pg_policies` on every content table, scoping by `group_id` via `get_current_user_group()` |
| Postgres functions | `is_admin_or_super_user()`, `is_secretariat_of_group()`, `has_servant_permission()` |
| PHP API | `JwtAuthMiddleware` → `RbacMiddleware::requireRoles()` → `GroupScopeMiddleware::enforceGroupScope()` |
| Storage | Files written under `…/group_N/…`; `deleteFile()` refuses to resolve outside the storage root |

**Verified empirically (2026-09-30)** by impersonating each group via
`request.jwt.claims` inside a transaction:

| Table | Group-1 trainee | Group-2 trainee |
|---|---|---|
| `gallery_items` | 5 | **0** |
| `mp3_tracks` | 5 | **0** |
| `curriculums` | 8 | **0** |
| `exams` | 1 | **0** |

### Roles

- **admin** — all groups; **may** edit Absence Message.
- **super_user** — all groups; **may not** edit Absence Message. (Deliberate
  asymmetry — do not "fix" it.)
- **servant** — own group, permission-gated via `has_servant_permission()`.
- **secretariat** — own group only, via `is_secretariat_of_group()`.

Moving someone to another group immediately strips the old group's access: the
group id is read from their live claims on every request, never cached.

---

## 7. Verification scripts

Both require a real PHP binary. On Windows:

```bash
# portable PHP 8.3
curl -sSLo php.zip https://windows.php.net/downloads/releases/archives/php-8.3.14-nts-Win32-vs16-x64.zip
unzip -q php.zip -d phprun
```

```bash
# 21 checks: autoload, fail-closed config, JWT forgery, traversal, group scope, CORS
php scripts/verify_production_security.php

# 16 checks over real HTTP: health, CORS, unauth 401s, forged tokens, traversal
php scripts/verify_api_http.php 8391
```

`verify_api_http.php` starts a throwaway `php -S` on the given port and kills it
when finished.
