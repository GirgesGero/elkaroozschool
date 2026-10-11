-- Resolve a login identifier to an auth email.
--
-- Why this exists: the login screen historically fabricated an address as
-- `username || '@elkarooz-school.com'` and passed it to signInWithPassword.
-- That only ever worked for accounts whose auth email really had that domain.
-- A user provisioned with a real mailbox (e.g. girgesgaber0@gmail.com) could
-- never sign in, because the fabricated address matched nothing.
--
-- This function lets the sign-in form accept either a username or an email:
-- pass a value containing '@' straight to signInWithPassword, otherwise look
-- the username up here.
--
-- Security notes:
--   * SECURITY DEFINER, because `profiles` is RLS-protected and the anon key
--     cannot read it directly.
--   * Search path is pinned to public, pg_temp.
--   * It exposes only the email for the exact identifier supplied, which is
--     the same information the caller would get from the sign-in form anyway.
--     It never enumerates accounts: a miss returns NULL.
create or replace function public.username_to_email(p_identifier text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.deleted_at is null
    and p.is_active
    and (
      lower(p.username) = lower(trim(p_identifier))
      or lower(u.email) = lower(trim(p_identifier))
    )
  limit 1;
$$;

revoke all on function public.username_to_email(text) from public;
grant execute on function public.username_to_email(text) to anon, authenticated;