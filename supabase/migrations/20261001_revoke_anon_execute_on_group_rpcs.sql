-- Drop the anon EXECUTE grant on the group-detail RPCs.
--
-- The wrapper functions already refuse an unauthenticated caller at runtime
-- (`group scope violation: not authorized for group %`, SQLSTATE 42501), verified
-- against production. So the grant is not exploitable today.
--
-- It is removed anyway on two grounds:
--   1. Defence in depth. A future edit to the wrapper's guard could otherwise
--      turn an anon grant into a data leak with no other control in the way.
--   2. The functions are `SECURITY DEFINER`, so they run as the owner and bypass
--      RLS. Anything reachable by `anon` is reachable past RLS.
--
-- `authenticated` keeps its grant: the frontend calls these with a real session.
-- Verified with SET LOCAL ROLE anon — all three now fail with 42501.

REVOKE EXECUTE ON FUNCTION public.get_group_operational_summary(smallint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_group_secretariat_detailed(smallint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_group_servants_detailed(smallint) FROM anon;

-- Same reasoning for the plain (SECURITY INVOKER) helpers that were also granted to
-- anon. They read auth.uid(), so they return nothing useful to a stranger, but the
-- grant is still meaningless surface.
REVOKE EXECUTE ON FUNCTION public.check_attendance_session_open() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_secretariat_group_limit() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rebalance_marathon_question_weights() FROM anon;

-- pg_trgm operators and support functions come from the extension and are not
-- application code; leave their grants alone. The grants above are the app's own.
