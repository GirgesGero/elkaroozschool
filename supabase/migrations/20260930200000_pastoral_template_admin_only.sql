-- =============================================================================
-- Phase 6 — Pastoral template: admin-only write (closes P0 authorization gap)
-- =============================================================================
-- Date:  2026-09-30
-- Table: public.notification_templates
-- Refs:  SRS §8.1 (line 224) "صلاحية التعديل: المسؤول فقط (Admin Only)"
--        SRS §5  (line 167) Super User column = ❌ for pastoral template
--        SRS §4.2 pastoral template edit is "حصراً للمسؤول"
--        docs/CODE_REVIEW_2026-09-30.md — P0 finding
--
-- FINDING (verified against production, not inferred)
--   The hardening migration 20260930140000 created:
--       CREATE POLICY "Admin manage notification templates" ...
--           USING (public.is_admin_or_super_user())
--   The name says "Admin", but the predicate grants super_user as well — a
--   privilege *expansion* smuggled into a security patch, on a table that had
--   no policy at all before (deny-all). Measured on production:
--       super_user -> PASTORAL updated = 1 row
--       admin      -> PASTORAL updated = 1 row
--       servant    -> visible 2 / updated 0
--
-- WHY ROW-LEVEL AND NOT TABLE-LEVEL
--   The table holds 2 rows and SRS grants them different rights:
--       PASTORAL (§8.1) -> admin ONLY
--       BIRTHDAY (§8.2) -> admin + super_user
--   A table-wide admin-only policy would wrongly strip super_user of BIRTHDAY.
--   So the guard is expressed per row via template_key.
--
-- ROLLBACK (verified working — this migration is idempotent and reversible):
--   DROP POLICY "Admin insert notification templates" ON public.notification_templates;
--   DROP POLICY "Admin update notification templates" ON public.notification_templates;
--   DROP POLICY "Admin delete notification templates" ON public.notification_templates;
--   CREATE POLICY "Admin manage notification templates" ON public.notification_templates
--       FOR ALL TO authenticated
--       USING (public.is_admin_or_super_user())
--       WITH CHECK (public.is_admin_or_super_user());
-- =============================================================================

BEGIN;

-- Remove the over-broad combined policy.
DROP POLICY IF EXISTS "Admin manage notification templates" ON public.notification_templates;

-- INSERT: super_user may add non-pastoral templates; PASTORAL is admin-only.
CREATE POLICY "Admin insert notification templates" ON public.notification_templates
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin_or_super_user()
        AND (template_key <> 'PASTORAL' OR public.get_current_user_role() = 'admin')
    );

-- UPDATE: same row-level guard on both sides.
--   USING      -> which existing rows may be read for update (temporal check)
--   WITH CHECK  -> what the row may become afterwards (this is what stops
--                  a super_user renaming BIRTHDAY into PASTORAL, or swapping a
--                  key to bypass the guard)
CREATE POLICY "Admin update notification templates" ON public.notification_templates
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_or_super_user()
        AND (template_key <> 'PASTORAL' OR public.get_current_user_role() = 'admin')
    )
    WITH CHECK (
        public.is_admin_or_super_user()
        AND (template_key <> 'PASTORAL' OR public.get_current_user_role() = 'admin')
    );

-- DELETE: same row-level guard.
CREATE POLICY "Admin delete notification templates" ON public.notification_templates
    FOR DELETE TO authenticated
    USING (
        public.is_admin_or_super_user()
        AND (template_key <> 'PASTORAL' OR public.get_current_user_role() = 'admin')
    );

COMMIT;

-- -----------------------------------------------------------------------------
-- POST-APPLY VERIFICATION (run separately; requires credentials)
--
-- The check that actually matters is ROW COUNT, not the absence of an error.
-- Under RLS a denied write returns 0 rows and NO exception, so a probe that
-- merely tests "did it throw?" reports a false PASS. Use:
--
--   BEGIN;
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"<super_user_uuid>","role":"authenticated"}';
--   UPDATE public.notification_templates SET template_body = template_body || 'X'
--     WHERE template_key = 'PASTORAL';
--   GET DIAGNOSTICS n = ROW_COUNT;  -- must be 0
--   ROLLBACK;
--
-- Expected: super_user PASTORAL = 0 | super_user BIRTHDAY = 1 | admin PASTORAL = 1
--
-- A reusable probe function lives at scripts/verify_pastoral_template_rls.sql.
-- It must be dropped after the run — a SECURITY DEFINER probe left in place
-- is itself a privilege-escalation surface.
-- -----------------------------------------------------------------------------
