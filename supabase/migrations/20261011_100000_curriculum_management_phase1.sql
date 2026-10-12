-- 20261011_100000_curriculum_management_phase1.sql
-- Phase 1: dynamic curriculum model, versioned content, and real staff access.
--
-- This migration is deliberately additive. It does not delete or rewrite the
-- existing duplicated terms/lectures/curriculums. Existing grades, attendance,
-- submissions, and answers remain untouched. Old rows can be mapped/reviewed
-- before any archival decision is made.
--
-- Apply only after review in the target Supabase project.

BEGIN;

CREATE TABLE IF NOT EXISTS public.curriculum_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  group_id smallint NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
  day_number integer NOT NULL CHECK (day_number > 0),
  title varchar(200),
  study_date date,
  status varchar(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  sort_order integer NOT NULL DEFAULT 1 CHECK (sort_order > 0),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.curriculum_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES public.curriculum_days(id) ON DELETE RESTRICT,
  lecture_id uuid REFERENCES public.lectures(id) ON DELETE SET NULL,
  group_id smallint NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
  title varchar(200) NOT NULL,
  description text,
  lecturer_id uuid REFERENCES public.lecturers(id) ON DELETE SET NULL,
  audio_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  content_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 1 CHECK (sort_order > 0),
  status varchar(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.curriculum_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.curriculum_entries(id) ON DELETE RESTRICT,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  snapshot jsonb NOT NULL,
  changed_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_curriculum_revision UNIQUE (entry_id, revision_number)
);

CREATE OR REPLACE FUNCTION public.enforce_curriculum_group_consistency()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group_id smallint;
BEGIN
  IF TG_TABLE_NAME = 'curriculum_days' THEN
    SELECT group_id INTO v_group_id FROM public.terms WHERE id = NEW.term_id AND deleted_at IS NULL;
  ELSE
    SELECT group_id INTO v_group_id FROM public.curriculum_days WHERE id = NEW.day_id AND deleted_at IS NULL;
  END IF;
  IF v_group_id IS NULL OR NEW.group_id <> v_group_id THEN
    RAISE EXCEPTION 'الفرقة لا تطابق المنهج المرتبط' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_curriculum_days_group_consistency ON public.curriculum_days;
CREATE TRIGGER trg_curriculum_days_group_consistency
BEFORE INSERT OR UPDATE ON public.curriculum_days
FOR EACH ROW EXECUTE FUNCTION public.enforce_curriculum_group_consistency();

DROP TRIGGER IF EXISTS trg_curriculum_entries_group_consistency ON public.curriculum_entries;
CREATE TRIGGER trg_curriculum_entries_group_consistency
BEFORE INSERT OR UPDATE ON public.curriculum_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_curriculum_group_consistency();

CREATE UNIQUE INDEX IF NOT EXISTS uq_curriculum_day_number_active
  ON public.curriculum_days(term_id, day_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_curriculum_days_term_order
  ON public.curriculum_days(term_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_curriculum_entries_day_order
  ON public.curriculum_entries(day_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_curriculum_entries_group
  ON public.curriculum_entries(group_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_curriculum_revisions_entry
  ON public.curriculum_revisions(entry_id, revision_number DESC);

DROP TRIGGER IF EXISTS trg_curriculum_days_updated_at ON public.curriculum_days;
CREATE TRIGGER trg_curriculum_days_updated_at
BEFORE UPDATE ON public.curriculum_days
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_curriculum_entries_updated_at ON public.curriculum_entries;
CREATE TRIGGER trg_curriculum_entries_updated_at
BEFORE UPDATE ON public.curriculum_entries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.can_manage_curriculum(p_group_id smallint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin_or_super_user()
      OR (
        public.get_current_user_group() = p_group_id
        AND (
          public.has_servant_permission('MANAGE_CURRICULUM')
          OR public.has_servant_permission('MANAGE_LECTURES')
          OR public.is_secretariat_of_group(p_group_id)
        )
      );
$$;

REVOKE ALL ON FUNCTION public.can_manage_curriculum(smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_curriculum(smallint) TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_curriculum_day(p_day_id uuid)
RETURNS public.curriculum_days
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_day public.curriculum_days;
BEGIN
  SELECT * INTO v_day FROM public.curriculum_days WHERE id = p_day_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.can_manage_curriculum(v_day.group_id) THEN
    RAISE EXCEPTION 'غير مصرح بنشر هذا اليوم' USING ERRCODE = '42501';
  END IF;

  UPDATE public.curriculum_days
     SET status = 'PUBLISHED', published_at = now(), published_by = auth.uid(), updated_at = now()
   WHERE id = p_day_id
   RETURNING * INTO v_day;

  UPDATE public.curriculum_entries
     SET status = 'PUBLISHED', published_at = now(), published_by = auth.uid(), updated_at = now()
   WHERE day_id = p_day_id AND deleted_at IS NULL;

  RETURN v_day;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_curriculum_day(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_curriculum_day(uuid) TO authenticated;

ALTER TABLE public.curriculum_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read curriculum days in own group" ON public.curriculum_days;
CREATE POLICY "Read curriculum days in own group"
ON public.curriculum_days FOR SELECT TO authenticated
USING (
  (group_id = public.get_current_user_group() OR public.is_admin_or_super_user())
  AND (status = 'PUBLISHED' OR public.can_manage_curriculum(group_id))
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "Manage curriculum days in own group" ON public.curriculum_days;
CREATE POLICY "Manage curriculum days in own group"
ON public.curriculum_days FOR ALL TO authenticated
USING (public.can_manage_curriculum(group_id))
WITH CHECK (public.can_manage_curriculum(group_id));

DROP POLICY IF EXISTS "Read curriculum entries in own group" ON public.curriculum_entries;
CREATE POLICY "Read curriculum entries in own group"
ON public.curriculum_entries FOR SELECT TO authenticated
USING (
  (group_id = public.get_current_user_group() OR public.is_admin_or_super_user())
  AND (status = 'PUBLISHED' OR public.can_manage_curriculum(group_id))
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "Manage curriculum entries in own group" ON public.curriculum_entries;
CREATE POLICY "Manage curriculum entries in own group"
ON public.curriculum_entries FOR ALL TO authenticated
USING (public.can_manage_curriculum(group_id))
WITH CHECK (public.can_manage_curriculum(group_id));

DROP POLICY IF EXISTS "Read curriculum revisions in own group" ON public.curriculum_revisions;
CREATE POLICY "Read curriculum revisions in own group"
ON public.curriculum_revisions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.curriculum_entries e
    WHERE e.id = entry_id
      AND (e.group_id = public.get_current_user_group() OR public.is_admin_or_super_user())
  )
);

DROP POLICY IF EXISTS "Create curriculum revisions in own group" ON public.curriculum_revisions;
CREATE POLICY "Create curriculum revisions in own group"
ON public.curriculum_revisions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.curriculum_entries e
    WHERE e.id = entry_id AND public.can_manage_curriculum(e.group_id)
  )
  AND changed_by = auth.uid()
);

-- Remove direct anonymous table privileges for the new administrative surface.
REVOKE ALL ON public.curriculum_days, public.curriculum_entries, public.curriculum_revisions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_days, public.curriculum_entries TO authenticated;
GRANT SELECT, INSERT ON public.curriculum_revisions TO authenticated;

-- Migrate every existing legacy row into the normalized model without deleting,
-- deduplicating, or changing the source rows. One legacy term becomes one day
-- container and each legacy lecture becomes one entry. Duplicate source rows are
-- intentionally preserved for later operator review.
DO $$
DECLARE
  v_fallback uuid;
BEGIN
  SELECT id INTO v_fallback
    FROM public.profiles
   WHERE role_id IN ('admin', 'super_user')
     AND deleted_at IS NULL
   ORDER BY role_id, created_at
   LIMIT 1;

  IF v_fallback IS NULL THEN
    RAISE EXCEPTION 'cannot backfill curriculum without an active admin profile';
  END IF;

  INSERT INTO public.curriculum_days (
    term_id, group_id, day_number, title, status, sort_order,
    created_by, published_at, published_by
  )
  SELECT
    t.id, t.group_id, 1, t.name_ar, 'PUBLISHED', 1,
    COALESCE(t.deleted_by, v_fallback), now(), v_fallback
  FROM public.terms t
  WHERE t.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.curriculum_days d
       WHERE d.term_id = t.id AND d.day_number = 1
    );

  INSERT INTO public.curriculum_entries (
    day_id, lecture_id, group_id, title, description, lecturer_id,
    content_metadata, sort_order, status, created_by, published_at, published_by
  )
  SELECT
    d.id, l.id, l.group_id, l.title, l.description, l.lecturer_id,
    jsonb_build_object(
      'legacy_lecture_date', l.lecture_date,
      'legacy_audio_url', l.audio_url,
      'legacy_attachments_metadata', COALESCE(l.attachments_metadata, '[]'::jsonb)
    ),
    row_number() OVER (PARTITION BY l.term_id ORDER BY l.lecture_date, l.created_at, l.id)::integer,
    'PUBLISHED', COALESCE(l.created_by, v_fallback), now(), v_fallback
  FROM public.lectures l
  JOIN public.curriculum_days d ON d.term_id = l.term_id AND d.day_number = 1
  WHERE l.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.curriculum_entries e WHERE e.lecture_id = l.id
    );
END;
$$;

-- Deployment-time validation. This block fails the migration if the key
-- authorization surface was not created as intended.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'curriculum_entries'
      AND policyname = 'Manage curriculum entries in own group'
  ) THEN
    RAISE EXCEPTION 'curriculum management policy was not created';
  END IF;
  IF has_table_privilege('anon', 'public.curriculum_entries', 'SELECT') THEN
    RAISE EXCEPTION 'anon still has SELECT on curriculum_entries';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.publish_curriculum_day(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute publish_curriculum_day';
  END IF;
END;
$$;

COMMIT;
