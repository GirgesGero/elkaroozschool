-- Close a fail-open authorization hole in two SECURITY DEFINER RPCs.
--
-- ---------------------------------------------------------------------------
-- Root cause
-- ---------------------------------------------------------------------------
-- get_trainee_full_profile and get_trainee_attendance_summary gate on:
--
--     IF NOT ( p_trainee_id = auth.uid()
--              OR public.is_admin_or_super_user()
--              OR ( get_current_user_group() IS NOT DISTINCT FROM v_group AND ... ) )
--     THEN RAISE EXCEPTION ... END IF;
--
-- auth.uid() returns NULL for an unauthenticated caller. `p_trainee_id = NULL`
-- evaluates to NULL, NOT FALSE. NULL OR FALSE OR FALSE is NULL, and in
-- PL/pgSQL `IF NOT NULL THEN` is NOT taken -- so the RAISE that enforces
-- authorization is skipped and the function returns the record.
--
-- The three get_group_* functions look identical but are NOT affected: they
-- use `p_group_id IS DISTINCT FROM get_current_user_group()`, and
-- `1 IS DISTINCT FROM NULL` is TRUE, so the raise does fire. Verified live.
-- The five mutating RPCs (soft_delete_post, restore_deleted_post,
-- toggle_post_reaction, soft_delete_comment, reopen_marathon_question) all
-- open with an explicit `IF v_actor_id IS NULL THEN RAISE`, so they already
-- fail closed and are deliberately left untouched.
--
-- ---------------------------------------------------------------------------
-- Impact, confirmed live on production before this migration
-- ---------------------------------------------------------------------------
-- SET ROLE anon; SET request.jwt.claims = '{}';
-- get_trainee_full_profile('f4ba5de7-...') returned one row containing
-- username, full_name, birth_date, group_id, phone, address,
-- confession_father, exam scores with appreciation, every marathon score,
-- and the full attendance history including ABSENT records.
-- get_trainee_attendance_summary(same id) returned the attendance history.
--
-- Cross-group reads by authenticated roles were already blocked and this
-- migration does not change that behaviour.
--
-- Both functions are called only from the Next.js client after login
-- (src/components/TraineeProfileDrawer.tsx, src/app/attendance/page.tsx),
-- so `authenticated` is sufficient and anon has no legitimate need.


-- ---------------------------------------------------------------------------
-- Layer 1: deny the anonymous role outright.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_trainee_full_profile(uuid)      FROM anon;
REVOKE ALL ON FUNCTION public.get_trainee_attendance_summary(uuid) FROM anon;

-- ---------------------------------------------------------------------------
-- Layer 2: make the predicate fail closed even if anon is granted again.
-- An unauthenticated caller has no subject, so it can never be "self".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_trainee_full_profile(p_trainee_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_group   smallint;
    v_role    varchar;
    v_caller  uuid := auth.uid();
BEGIN
    SELECT group_id, role_id INTO v_group, v_role
      FROM public.profiles
     WHERE id = p_trainee_id AND deleted_at IS NULL;

    IF v_group IS NULL THEN
        RAISE EXCEPTION 'trainee not found' USING ERRCODE = 'P0002';
    END IF;

    -- No auth.uid() means anonymous. Deny before the comparison chain, because
    -- `p_trainee_id = NULL` is NULL and NULL propagates through the whole OR.
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'not authorized to view this trainee profile' USING ERRCODE = '42501';
    END IF;

    IF NOT COALESCE(
        p_trainee_id = v_caller
        OR COALESCE(public.is_admin_or_super_user(), false)
        OR ( public.get_current_user_group() IS NOT DISTINCT FROM v_group
             AND ( v_role = 'servant'
                   OR v_role = 'secretariat'
                   OR COALESCE(public.has_servant_permission('MANAGE_CURRICULUM'), false)
                   OR COALESCE(public.has_servant_permission('MANAGE_LECTURES'), false) ) )
    , false) THEN
        RAISE EXCEPTION 'not authorized to view this trainee profile' USING ERRCODE = '42501';
    END IF;

    RETURN public._unsafe_get_trainee_full_profile(p_trainee_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_trainee_attendance_summary(p_trainee_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_group   smallint;
    v_role    varchar;
    v_caller  uuid := auth.uid();
BEGIN
    SELECT group_id, role_id INTO v_group, v_role
      FROM public.profiles
     WHERE id = p_trainee_id AND deleted_at IS NULL;

    IF v_group IS NULL THEN
        RAISE EXCEPTION 'trainee not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'not authorized to view this attendance summary' USING ERRCODE = '42501';
    END IF;

    IF NOT COALESCE(
        p_trainee_id = v_caller
        OR COALESCE(public.is_admin_or_super_user(), false)
        OR ( public.get_current_user_group() IS NOT DISTINCT FROM v_group
             AND ( v_role = 'servant'
                   OR v_role = 'secretariat'
                   OR COALESCE(public.has_servant_permission('MANAGE_LECTURES'), false)
                   OR COALESCE(public.has_servant_permission('GRADE_EXAMS'), false) ) )
    , false) THEN
        RAISE EXCEPTION 'not authorized to view this attendance summary' USING ERRCODE = '42501';
    END IF;

    RETURN public._unsafe_get_trainee_attendance_summary(p_trainee_id);
END;
$function$;

-- ---------------------------------------------------------------------------
-- Layer 3: the authenticated role must keep working (the UI calls both).
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_trainee_full_profile(uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trainee_attendance_summary(uuid) TO authenticated;
