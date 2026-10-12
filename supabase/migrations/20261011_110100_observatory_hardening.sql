-- 20261011_110100_observatory_hardening.sql
-- Completes phase 2 after the dynamic observatory schema/policies.
-- This migration is additive and preserves all historical submissions/answers.
BEGIN;

CREATE TABLE IF NOT EXISTS public.marathon_question_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.marathon_questions(id) ON DELETE RESTRICT,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  question_text text NOT NULL,
  question_type varchar(32) NOT NULL,
  section_id uuid REFERENCES public.marathon_sections(id) ON DELETE SET NULL,
  order_index integer NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_marathon_question_revision UNIQUE (question_id, revision_number)
);

ALTER TABLE public.marathon_question_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read marathon question revisions" ON public.marathon_question_revisions;
CREATE POLICY "Read marathon question revisions"
ON public.marathon_question_revisions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.marathon_questions q
    JOIN public.marathons m ON m.id = q.marathon_id
    WHERE q.id = marathon_question_revisions.question_id
      AND (m.group_id = public.get_current_user_group() OR public.is_admin_or_super_user())
  )
);
DROP POLICY IF EXISTS "Insert marathon question revisions" ON public.marathon_question_revisions;
CREATE POLICY "Insert marathon question revisions"
ON public.marathon_question_revisions FOR INSERT TO authenticated
WITH CHECK (
  changed_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.marathon_questions q
    JOIN public.marathons m ON m.id = q.marathon_id
    WHERE q.id = marathon_question_revisions.question_id
      AND public.can_manage_marathon(m.group_id)
  )
);
REVOKE ALL ON public.marathon_question_revisions FROM PUBLIC, anon;
REVOKE UPDATE, DELETE ON public.marathon_question_revisions FROM authenticated;
GRANT SELECT, INSERT ON public.marathon_question_revisions TO authenticated;

-- Replacing a question archives the old row and creates a new published row.
-- Existing answers keep the old question_id and remain readable as history.
CREATE OR REPLACE FUNCTION public.replace_marathon_question(
  p_question_id uuid,
  p_question_text text,
  p_section_id uuid,
  p_options jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  old_q public.marathon_questions;
  v_group smallint;
  new_id uuid;
  option_row jsonb;
  option_count integer;
  correct_count integer;
  next_revision integer;
BEGIN
  SELECT q.* INTO old_q
  FROM public.marathon_questions q
  WHERE q.id = p_question_id
  FOR UPDATE;

  SELECT m.group_id INTO v_group
  FROM public.marathons m
  WHERE m.id = old_q.marathon_id;

  IF old_q.id IS NULL OR v_group IS NULL OR NOT public.can_manage_marathon(v_group) THEN
    RAISE EXCEPTION 'غير مصرح باستبدال السؤال' USING ERRCODE = '42501';
  END IF;
  IF length(trim(COALESCE(p_question_text, ''))) = 0 OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'بيانات السؤال غير صالحة' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO option_count FROM jsonb_array_elements(p_options);
  SELECT count(*) INTO correct_count
  FROM jsonb_array_elements(p_options) item
  WHERE COALESCE((item->>'is_correct')::boolean, false);
  IF option_count < 2 OR correct_count <> 1 THEN
    RAISE EXCEPTION 'يجب إدخال خيارين على الأقل وإجابة صحيحة واحدة' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(max(r.revision_number), 0) + 1 INTO next_revision
  FROM public.marathon_question_revisions r
  WHERE r.question_id = old_q.id;

  INSERT INTO public.marathon_question_revisions (
    question_id, revision_number, question_text, question_type,
    section_id, order_index, options, changed_by
  )
  VALUES (
    old_q.id, next_revision, old_q.question_text, old_q.question_type,
    old_q.section_id, old_q.order_index,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', a.id, 'answer_text', a.answer_text,
      'is_correct', a.is_correct, 'order_index', a.order_index
    ) ORDER BY a.order_index)
    FROM public.marathon_answers a WHERE a.question_id = old_q.id), '[]'::jsonb),
    auth.uid()
  );

  UPDATE public.marathon_questions SET status = 'ARCHIVED' WHERE id = old_q.id;
  INSERT INTO public.marathon_questions (
    marathon_id, section_id, question_text, question_type,
    score_weight, order_index, status, published_at, published_by
  )
  VALUES (
    old_q.marathon_id, p_section_id, trim(p_question_text), old_q.question_type,
    old_q.score_weight, old_q.order_index, 'PUBLISHED', now(), auth.uid()
  )
  RETURNING id INTO new_id;

  FOR option_row IN SELECT * FROM jsonb_array_elements(p_options) LOOP
    INSERT INTO public.marathon_answers (question_id, answer_text, is_correct, order_index)
    VALUES (
      new_id,
      trim(option_row->>'answer_text'),
      COALESCE((option_row->>'is_correct')::boolean, false),
      COALESCE((option_row->>'order_index')::integer, 1)
    );
  END LOOP;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_marathon_question(uuid, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_marathon_question(uuid, text, uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_marathon_question(p_question_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_group smallint;
BEGIN
  SELECT m.group_id INTO v_group
  FROM public.marathon_questions q
  JOIN public.marathons m ON m.id = q.marathon_id
  WHERE q.id = p_question_id;
  IF v_group IS NULL OR NOT public.can_manage_marathon(v_group) THEN
    RAISE EXCEPTION 'غير مصرح بأرشفة السؤال' USING ERRCODE = '42501';
  END IF;
  UPDATE public.marathon_questions SET status = 'ARCHIVED'
  WHERE id = p_question_id AND status = 'PUBLISHED';
  RETURN jsonb_build_object('success', true, 'question_id', p_question_id);
END;
$$;
REVOKE ALL ON FUNCTION public.archive_marathon_question(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_marathon_question(uuid) TO authenticated;

-- Reopen only the question that belongs to the submission's marathon and group.
CREATE OR REPLACE FUNCTION public.reopen_marathon_question(p_submission_id uuid, p_question_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_group smallint;
  v_marathon uuid;
  v_trainee uuid;
BEGIN
  SELECT s.marathon_id, s.trainee_id, m.group_id
  INTO v_marathon, v_trainee, v_group
  FROM public.marathon_trainee_submissions s
  JOIN public.marathons m ON m.id = s.marathon_id
  WHERE s.id = p_submission_id;
  IF v_marathon IS NULL OR NOT public.can_manage_marathon(v_group) THEN
    RAISE EXCEPTION 'غير مصرح بإعادة فتح السؤال' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.marathon_questions q
    WHERE q.id = p_question_id AND q.marathon_id = v_marathon
  ) THEN
    RAISE EXCEPTION 'السؤال لا ينتمي إلى هذا الماراثون' USING ERRCODE = '22023';
  END IF;
  UPDATE public.marathon_trainee_answers
  SET is_reopened = true
  WHERE submission_id = p_submission_id AND question_id = p_question_id;
  UPDATE public.marathon_trainee_submissions
  SET is_submitted = false, is_reopened = true,
      reopened_by = v_actor, reopened_at = now()
  WHERE id = p_submission_id;
  RETURN jsonb_build_object('success', true, 'trainee_id', v_trainee, 'question_id', p_question_id);
END;
$$;
REVOKE ALL ON FUNCTION public.reopen_marathon_question(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_marathon_question(uuid, uuid) TO authenticated;

DO $$
BEGIN
  IF NOT has_function_privilege('authenticated', 'public.replace_marathon_question(uuid,text,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'replace RPC grant missing';
  END IF;
  IF has_function_privilege('anon', 'public.replace_marathon_question(uuid,text,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute replace RPC';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.reopen_marathon_question(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'reopen RPC grant missing';
  END IF;
END;
$$;
COMMIT;
