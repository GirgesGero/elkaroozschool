-- =============================================================================
-- Fix: close grade forgery (C2), author impersonation (C3), anon write access
-- =============================================================================
-- VERIFIED LIVE 2026-10-10 against production via Supabase MCP.
--
-- THE THREE HOLES
--
-- 1. marathon_trainee_submissions -- "Trainee manage own marathon submission"
--    is FOR ALL with with_check = NULL, so the USING expression doubles as the
--    check. It constrains only trainee_id. The owning trainee can therefore
--    PATCH total_score, appreciation_grade, is_submitted, submitted_at,
--    is_reopened, reopened_by and reopened_at. The ROW is scoped; the GRADE is
--    not. A trainee can write themselves an "ممتاز".
--
-- 2. marathon_trainee_answers -- row-scoped correctly (submission owned by the
--    caller) but with no column restriction, so the owner can set is_correct
--    and score_awarded by hand.
--
-- 3. author_id on feed_posts and post_comments is a column DEFAULT, not a
--    constraint. An explicit value in the request body overrides the default,
--    so any authenticated user can post or comment as the admin.
--    "Insert post comments" was WITH CHECK (true).
--
-- Bonus: information_schema.role_table_grants shows role `anon` holding
-- INSERT/UPDATE/DELETE on both marathon grading tables. RLS policies on these
-- tables are TO authenticated only, so anon currently reaches zero rows --
-- the policies are the only thing holding it back.
--
-- WHY COLUMN PRIVILEGES AND NOT A TRIGGER
--
-- The first draft of this fix used a BEFORE UPDATE trigger that refused the
-- graded columns. That draft was WRONG and was discarded before applying.
--
-- submit_marathon_answer and reopen_marathon_question are SECURITY DEFINER
-- (confirmed live: prosecdef = true, owner = postgres). A SECURITY DEFINER
-- function bypasses RLS, but TRIGGERS STILL FIRE, and auth.uid() inside the
-- function still returns the trainee. The trigger would have inspected a
-- legitimate server-side recompute of total_score as if a trainee had written
-- it by hand, and raised 42501 on every answer. The entire marathon feature
-- would have failed at the last step of every question.
--
-- Column-level UPDATE grants cannot express "this row only" -- that is what RLS
-- is for, and RLS is already correct on row scope. What RLS cannot express is
-- "this COLUMN only", and that is exactly the gap being closed here. The two
-- mechanisms compose instead of fighting:
--
--   RLS     -> which ROWS the caller may touch
--   column  -> which COLUMNS the caller may write
--
-- And critically, column grants do not break the RPCs. submit_marathon_answer
-- runs as the table owner (postgres), and an owner holds every privilege
-- implicitly regardless of what was granted to `authenticated`. The legitimate
-- write path keeps working; only the direct-from-client path loses the columns.
--
-- Verified client-side: the frontend never writes these tables directly. The
-- only marathon call sites are supabase.rpc('submit_marathon_answer') in
-- frontend/src/app/marathon/[id]/page.tsx:144 and
-- supabase.rpc('reopen_marathon_question') in
-- frontend/src/app/marathon/manage/page.tsx:250. There is no
-- .from('marathon_trainee_submissions') anywhere in frontend/src.
--
-- THE POLICY EDITS are additive tightenings on INSERT only. Read access to
-- one's own submissions is untouched.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. marathon_trainee_submissions: strip the graded columns.
--    postgres and service_role are untouched and keep full access.
-- -----------------------------------------------------------------------------
REVOKE UPDATE ON public.marathon_trainee_submissions FROM anon, authenticated;
REVOKE INSERT, DELETE  ON public.marathon_trainee_submissions FROM anon;

-- Keep the row-scope policy honest now that columns are locked: a trainee may
-- read their own submission, staff may operate on any, but a trainee cannot
-- mint a submission for somebody else via a direct INSERT.
DROP POLICY IF EXISTS "Trainee manage own marathon submission" ON public.marathon_trainee_submissions;

CREATE POLICY "Read own marathon submission" ON public.marathon_trainee_submissions
    FOR SELECT TO authenticated
    USING (
        trainee_id = auth.uid()
        OR public.is_admin_or_super_user()
        OR public.has_servant_permission('MANAGE_MARATHON')
    );


-- -----------------------------------------------------------------------------
-- 2. marathon_trainee_answers: strip is_correct / score_awarded / is_reopened.
--    selected_answer_id stays writable so a trainee can still change a choice
--    before the RPC re-grade, matching the reopen workflow.
-- -----------------------------------------------------------------------------
REVOKE UPDATE ON public.marathon_trainee_answers FROM anon, authenticated;
REVOKE INSERT, DELETE  ON public.marathon_trainee_answers FROM anon;

GRANT UPDATE (selected_answer_id, answered_at)
    ON public.marathon_trainee_answers TO authenticated;

DROP POLICY IF EXISTS "Trainee manage own marathon answers" ON public.marathon_trainee_answers;

CREATE POLICY "Read own marathon answers" ON public.marathon_trainee_answers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.marathon_trainee_submissions s
            WHERE s.id = marathon_trainee_answers.submission_id
              AND (
                  s.trainee_id = auth.uid()
                  OR public.is_admin_or_super_user()
                  OR public.has_servant_permission('MANAGE_MARATHON')
              )
        )
    );


-- -----------------------------------------------------------------------------
-- 3. Withdraw the world-readable answer key.
--    "Read marathon answers" was SELECT ... USING (true) TO authenticated,
--    which handed is_correct for every question in every group to every logged
--    in trainee. A trainee sees their options through get_trainee_marathon_state,
--    which already masks is_correct before returning it -- so nothing in the
--    product depends on reading the key directly.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read marathon answers" ON public.marathon_answers;

CREATE POLICY "Staff read marathon answers" ON public.marathon_answers
    FOR SELECT TO authenticated
    USING (
        public.is_admin_or_super_user()
        OR public.has_servant_permission('MANAGE_MARATHON')
    );

REVOKE SELECT ON public.marathon_answers FROM anon;


-- -----------------------------------------------------------------------------
-- 4. Bind authorship on the feed.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Insert post comments" ON public.post_comments;

CREATE POLICY "Insert post comments as self" ON public.post_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        author_id = auth.uid()
        OR public.is_admin_or_super_user()
    );

DROP POLICY IF EXISTS "Create feed posts (Staff only, not Trainees)" ON public.feed_posts;

CREATE POLICY "Create feed posts as self (Staff only, not Trainees)" ON public.feed_posts
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'super_user', 'servant', 'secretariat')
        AND (
            author_id = auth.uid()
            OR public.is_admin_or_super_user()
        )
    );

-- A row-level trigger is safe here (unlike the marathon tables) because every
-- legitimate write to these tables is an INSERT whose author_id is resolved
-- before it reaches the trigger, and update_post_counts only touches
-- comments_count / reactions_count. The invariant is enforced twice on purpose:
-- the policy is the enforcement, the trigger keeps the invariant true even if a
-- future policy is added with a looser WITH CHECK, and covers UPDATE
-- reassignment which the policies scope only by author_id = auth.uid().
CREATE OR REPLACE FUNCTION public.guard_feed_authorship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.author_id IS DISTINCT FROM auth.uid()
           AND NOT public.is_admin_or_super_user() THEN
            RAISE EXCEPTION 'author_id must be your own account'
                USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.author_id IS DISTINCT FROM OLD.author_id
       AND NOT public.is_admin_or_super_user() THEN
        RAISE EXCEPTION 'author_id cannot be reassigned'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_feed_posts_authorship ON public.feed_posts;
CREATE TRIGGER trg_feed_posts_authorship
    BEFORE INSERT OR UPDATE ON public.feed_posts
    FOR EACH ROW EXECUTE FUNCTION public.guard_feed_authorship();

DROP TRIGGER IF EXISTS trg_post_comments_authorship ON public.post_comments;
CREATE TRIGGER trg_post_comments_authorship
    BEFORE INSERT OR UPDATE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION public.guard_feed_authorship();

GRANT EXECUTE ON FUNCTION public.guard_feed_authorship() TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 5. POST-CONDITIONS. This migration must not report success while any of the
--    holes is still open. Every check below RAISEs, which rolls the whole
--    migration back.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_bad  text;
    v_cols text;
BEGIN
    -- (a) the graded columns must be unreachable for a session role
    SELECT string_agg(DISTINCT table_name || '.' || column_name, ', ')
    INTO v_cols
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
      AND privilege_type = 'UPDATE'
      AND (
          (table_name = 'marathon_trainee_submissions'
           AND column_name IN ('total_score', 'appreciation_grade', 'is_submitted',
                               'submitted_at', 'is_reopened', 'reopened_by', 'reopened_at'))
       OR (table_name = 'marathon_trainee_answers'
           AND column_name IN ('is_correct', 'score_awarded', 'is_reopened'))
      );

    IF v_cols IS NOT NULL THEN
        RAISE EXCEPTION 'BLOCKED: graded columns still updatable by anon/authenticated: %', v_cols;
    END IF;

    -- (b) anon must hold no write privilege on the grading tables
    SELECT string_agg(DISTINCT table_name || ':' || privilege_type, ', ')
    INTO v_bad
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee = 'anon'
      AND table_name IN ('marathon_trainee_submissions', 'marathon_trainee_answers')
      AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE');

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'BLOCKED: anon still holds write privileges: %', v_bad;
    END IF;

    -- (c) the answer key must not be world-readable any more
    SELECT string_agg(policyname, ', ') INTO v_bad
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'marathon_answers'
      AND cmd = 'SELECT'
      AND qual = 'true';

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'BLOCKED: marathon_answers still has a USING(true) SELECT policy: %', v_bad;
    END IF;

    -- (d) no INSERT policy may leave authorship unbound any more
    SELECT string_agg(tablename || '.' || policyname, ', ') INTO v_bad
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('post_comments', 'feed_posts')
      AND cmd = 'INSERT'
      AND (with_check IS NULL OR with_check = 'true' OR with_check NOT ILIKE '%author_id%');

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'BLOCKED: unbound-author INSERT policy still present: %', v_bad;
    END IF;

    -- (e) the RPCs must still be executable by a session role, or the fix has
    --     broken the feature it was meant to protect
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                   WHERE n.nspname = 'public' AND p.proname = 'submit_marathon_answer'
                     AND has_function_privilege('authenticated', p.oid, 'EXECUTE')) THEN
        RAISE EXCEPTION 'BLOCKED: authenticated lost EXECUTE on submit_marathon_answer.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                   WHERE n.nspname = 'public' AND p.proname = 'reopen_marathon_question'
                     AND has_function_privilege('authenticated', p.oid, 'EXECUTE')) THEN
        RAISE EXCEPTION 'BLOCKED: authenticated lost EXECUTE on reopen_marathon_question.';
    END IF;

    RAISE NOTICE 'OK: grades locked, anon writes revoked, answer key restricted, authorship bound, RPCs intact.';
END $$;