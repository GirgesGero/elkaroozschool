-- Backfill auth.users.raw_app_meta_data from the authoritative profiles table.
--
-- FINDING (verified against production on 2026-10-01):
--   The PHP backend derives role and group from the JWT claim
--   app_metadata.role / app_metadata.group_id. That claim is only populated for
--   accounts whose app_metadata was written at creation time. Production has
--   10 trainee accounts (of 39) with NO app_metadata at all.
--
-- CONSEQUENCE:
--   For those users JwtAuthMiddleware falls back to $claims['role'], which is the
--   PostgREST role name 'authenticated' -- not an application role. They are not
--   'trainee'. Any gate written as in_array($role, [...]) therefore sees a value
--   that is in no allowlist. Today that fails closed (they are denied admin
--   routes), but the correct role is simply absent, so their group scope is also
--   null and GroupScopeMiddleware casts it to 0 -- a group id that does not exist.
--
-- FIX:
--   Make profiles the single source of truth and mirror role_id/group_id/is_active
--   into raw_app_meta_data. app_metadata (not user_metadata) is used because
--   user_metadata is writable by the user themselves.
--
-- SAFETY:
--   - profiles.role_id and profiles.group_id are both NOT NULL, so there is no
--     ambiguous fallback to write.
--   - is_active is mirrored too, so the PHP middleware can refuse a suspended
--     account without an extra database round trip.
--   - Already-correct rows are left untouched; only missing/mismatched rows change.
--
-- ROLLBACK: every changed value is recoverable from profiles, which this
-- migration does not modify.

-- 1. Report what will change. Run this separately if you want a preview.
--    (Kept commented so the migration stays a single atomic statement.)

-- 2. Backfill.
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
       'role',     p.role_id,
       'group_id', p.group_id,
       'is_active', p.is_active
     )
FROM public.profiles p
WHERE p.id = u.id
  AND (
        NOT (u.raw_app_meta_data ? 'role')
     OR u.raw_app_meta_data->>'role' IS DISTINCT FROM p.role_id
     OR NOT (u.raw_app_meta_data ? 'group_id')
     OR (u.raw_app_meta_data->>'group_id')::int IS DISTINCT FROM p.group_id::int
     OR (u.raw_app_meta_data->>'is_active')::boolean IS DISTINCT FROM p.is_active
      );
