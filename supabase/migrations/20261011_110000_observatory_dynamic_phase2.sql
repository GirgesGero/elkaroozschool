-- 20261011_110000_observatory_dynamic_phase2.sql
-- Dynamic observatory/marathon bank with safe replacement and historical attempts.
-- Existing question rows become PUBLISHED; no attempt/submission row is deleted.
BEGIN;

ALTER TABLE public.marathon_questions
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE public.marathon_questions
  ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now();
ALTER TABLE public.marathon_questions
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.marathon_questions
  ADD CONSTRAINT marathon_questions_status_check CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED'));

ALTER TABLE public.marathon_sections
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE public.marathon_sections
  ADD CONSTRAINT marathon_sections_status_check CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED'));

UPDATE public.marathon_questions SET status = 'PUBLISHED' WHERE status IS NULL;
UPDATE public.marathon_sections SET status = 'PUBLISHED' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_marathon_questions_published
  ON public.marathon_questions(marathon_id, order_index) WHERE status = 'PUBLISHED';

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

CREATE OR REPLACE FUNCTION public.can_manage_marathon(p_group_id smallint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.is_admin_or_super_user()
      OR (
        public.get_current_user_group() = p_group_id
        AND (
          public.has_servant_permission('MANAGE_MARATHON')
          OR public.is_secretariat_of_group(p_group_id)
        )
      );
$$;
REVOKE ALL ON FUNCTION public.can_manage_marathon(smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_marathon(smallint) TO authenticated;

CREATE OR REPLACE FUNCTION public.rebalance_marathon_question_weights()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  target_marathon_id uuid;
  total_q integer;
  weight_per_q numeric(6,3);
BEGIN
  target_marathon_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.marathon_id ELSE NEW.marathon_id END;
  SELECT count(*) INTO total_q FROM public.marathon_questions
   WHERE marathon_id = target_marathon_id AND status = 'PUBLISHED';
  IF total_q > 0 THEN
    weight_per_q := 100.000 / total_q;
    UPDATE public.marathon_questions SET score_weight = weight_per_q
     WHERE marathon_id = target_marathon_id AND status = 'PUBLISHED';
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_rebalance_marathon_weights ON public.marathon_questions;
CREATE TRIGGER trg_rebalance_marathon_weights
AFTER INSERT OR DELETE OR UPDATE OF status ON public.marathon_questions
FOR EACH ROW EXECUTE FUNCTION public.rebalance_marathon_question_weights();

-- Question/answer reads are no longer global. Students receive answer choices
-- through the RPC below, which intentionally omits is_correct.
DROP POLICY IF EXISTS "Read marathon questions" ON public.marathon_questions;
DROP POLICY IF EXISTS "Read published marathon questions in own group" ON public.marathon_questions;
CREATE POLICY "Read published marathon questions in own group" ON public.marathon_questions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marathons m
    WHERE m.id = marathon_questions.marathon_id
      AND (m.group_id = public.get_current_user_group() OR public.is_admin_or_super_user())
      AND m.deleted_at IS NULL
  )
  AND (status = 'PUBLISHED' OR public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_questions.marathon_id)))
);
DROP POLICY IF EXISTS "Manage marathon questions" ON public.marathon_questions;
CREATE POLICY "Manage marathon questions in own group" ON public.marathon_questions
FOR ALL TO authenticated
USING (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_questions.marathon_id)))
WITH CHECK (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_questions.marathon_id)));

DROP POLICY IF EXISTS "Public read marathon sections" ON public.marathon_sections;
DROP POLICY IF EXISTS "Manage marathon sections" ON public.marathon_sections;
DROP POLICY IF EXISTS "Read published marathon sections in own group" ON public.marathon_sections;
CREATE POLICY "Read published marathon sections in own group" ON public.marathon_sections
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.marathons m WHERE m.id = marathon_sections.marathon_id AND (m.group_id = public.get_current_user_group() OR public.is_admin_or_super_user()) AND m.deleted_at IS NULL)
  AND (status = 'PUBLISHED' OR public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_sections.marathon_id)))
);
CREATE POLICY "Manage marathon sections in own group" ON public.marathon_sections
FOR ALL TO authenticated
USING (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_sections.marathon_id)))
WITH CHECK (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_sections.marathon_id)));

DROP POLICY IF EXISTS "Staff read marathon answers" ON public.marathon_answers;
DROP POLICY IF EXISTS "Manage marathon answers" ON public.marathon_answers;
CREATE POLICY "Staff read marathon answers in own group" ON public.marathon_answers
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marathon_questions q JOIN public.marathons m ON m.id = q.marathon_id
    WHERE q.id = marathon_answers.question_id AND public.can_manage_marathon(m.group_id)
  )
);
CREATE POLICY "Manage marathon answers in own group" ON public.marathon_answers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marathon_questions q JOIN public.marathons m ON m.id = q.marathon_id
    WHERE q.id = marathon_answers.question_id AND public.can_manage_marathon(m.group_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.marathon_questions q JOIN public.marathons m ON m.id = q.marathon_id
    WHERE q.id = marathon_answers.question_id AND public.can_manage_marathon(m.group_id)
  )
);

DROP POLICY IF EXISTS "Manage marathons with permission" ON public.marathons;
CREATE POLICY "Manage marathons in own group" ON public.marathons
FOR ALL TO authenticated
USING (public.can_manage_marathon(group_id))
WITH CHECK (public.can_manage_marathon(group_id));

CREATE OR REPLACE FUNCTION public.get_marathon_questions_for_player(p_marathon_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_group smallint;
  v_result jsonb;
BEGIN
  SELECT group_id INTO v_group FROM public.profiles WHERE id = v_actor AND is_active AND deleted_at IS NULL;
  IF v_group IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.marathons m WHERE m.id = p_marathon_id AND m.group_id = v_group AND m.is_active AND m.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'غير مصرح بالوصول إلى هذا الماراثون' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'section_id', q.section_id,
    'question_text', q.question_text,
    'question_type', q.question_type,
    'order_index', q.order_index,
    'section_title', s.title,
    'options', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'answer_text', a.answer_text, 'order_index', a.order_index) ORDER BY a.order_index) FROM public.marathon_answers a WHERE a.question_id = q.id), '[]'::jsonb)
  ) ORDER BY q.order_index), '[]'::jsonb) INTO v_result
  FROM public.marathon_questions q
  LEFT JOIN public.marathon_sections s ON s.id = q.section_id
  WHERE q.marathon_id = p_marathon_id AND q.status = 'PUBLISHED';
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_marathon_questions_for_player(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marathon_questions_for_player(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_marathon_question(p_question_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_group smallint;
BEGIN
  SELECT m.group_id INTO v_group FROM public.marathon_questions q JOIN public.marathons m ON m.id=q.marathon_id WHERE q.id=p_question_id;
  IF v_group IS NULL OR NOT public.can_manage_marathon(v_group) THEN RAISE EXCEPTION 'غير مصرح' USING ERRCODE='42501'; END IF;
  UPDATE public.marathon_questions SET status='ARCHIVED' WHERE id=p_question_id AND status='PUBLISHED';
  RETURN jsonb_build_object('success', true, 'question_id', p_question_id);
END;
$$;
REVOKE ALL ON FUNCTION public.archive_marathon_question(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_marathon_question(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.replace_marathon_question(p_question_id uuid, p_question_text text, p_section_id uuid, p_options jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  old_q public.marathon_questions;
  v_group smallint;
  new_id uuid;
  option_row jsonb;
  option_count integer;
  correct_count integer;
  next_revision integer;
BEGIN
  SELECT q.* INTO old_q FROM public.marathon_questions q WHERE q.id=p_question_id FOR UPDATE;
  SELECT group_id INTO v_group FROM public.marathons WHERE id=old_q.marathon_id;
  IF old_q.id IS NULL OR v_group IS NULL OR NOT public.can_manage_marathon(v_group) THEN RAISE EXCEPTION 'غير مصرح' USING ERRCODE='42501'; END IF;
  IF length(trim(p_question_text)) = 0 OR jsonb_typeof(p_options) <> 'array' THEN RAISE EXCEPTION 'بيانات السؤال غير صالحة' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO option_count FROM jsonb_array_elements(p_options);
  SELECT count(*) INTO correct_count FROM jsonb_array_elements(p_options) x WHERE COALESCE((x->>'is_correct')::boolean, false);
  IF option_count < 2 OR correct_count <> 1 THEN RAISE EXCEPTION 'يجب إدخال خيارين على الأقل وإجابة صحيحة واحدة' USING ERRCODE='22023'; END IF;

  SELECT COALESCE(max(revision_number),0)+1 INTO next_revision FROM public.marathon_question_revisions WHERE question_id=p_question_id;
  INSERT INTO public.marathon_question_revisions(question_id,revision_number,question_text,question_type,section_id,order_index,options,changed_by)
  VALUES(old_q.id,next_revision,old_q.question_text,old_q.question_type,old_q.section_id,old_q.order_index,(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',a.id,'answer_text',a.answer_text,'is_correct',a.is_correct,'order_index',a.order_index) ORDER BY a.order_index),'[]'::jsonb) FROM public.marathon_answers a WHERE a.question_id=old_q.id),auth.uid());

  UPDATE public.marathon_questions SET status='ARCHIVED' WHERE id=old_q.id;
  INSERT INTO public.marathon_questions(marathon_id,section_id,question_text,question_type,score_weight,order_index,status,published_at,published_by)
  VALUES(old_q.marathon_id,p_section_id,trim(p_question_text),old_q.question_type,old_q.score_weight,old_q.order_index,'PUBLISHED',now(),auth.uid()) RETURNING id INTO new_id;
  FOR option_row IN SELECT * FROM jsonb_array_elements(p_options) LOOP
    INSERT INTO public.marathon_answers(question_id,answer_text,is_correct,order_index)
    VALUES(new_id,trim(option_row->>'answer_text'),COALESCE((option_row->>'is_correct')::boolean,false),COALESCE((option_row->>'order_index')::integer,1));
  END LOOP;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_marathon_question(uuid,text,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_marathon_question(uuid,text,uuid,jsonb) TO authenticated;

-- Preserve historical answers while preventing a trainee from answering an archived question.
CREATE OR REPLACE FUNCTION public.submit_marathon_answer(p_marathon_id uuid, p_question_id uuid, p_selected_answer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_trainee uuid := auth.uid(); v_group smallint; v_submission uuid; v_order int; v_weight numeric(6,3); v_correct boolean; v_answered int; v_total int; v_score numeric(5,2); v_grade varchar(32); v_existing record;
BEGIN
  IF v_trainee IS NULL THEN RAISE EXCEPTION 'المصادقة مطلوبة' USING ERRCODE='42501'; END IF;
  SELECT p.group_id INTO v_group FROM public.profiles p WHERE p.id=v_trainee AND p.role_id='trainee' AND p.is_active AND p.deleted_at IS NULL;
  IF v_group IS NULL THEN RAISE EXCEPTION 'الحساب غير مصرح له بحل الماراثون' USING ERRCODE='42501'; END IF;
  SELECT q.order_index,q.score_weight INTO v_order,v_weight FROM public.marathon_questions q JOIN public.marathons m ON m.id=q.marathon_id WHERE q.id=p_question_id AND q.marathon_id=p_marathon_id AND q.status='PUBLISHED' AND m.group_id=v_group AND m.is_active AND m.deleted_at IS NULL AND (m.start_date IS NULL OR now() >= m.start_date) AND (m.end_date IS NULL OR now() <= m.end_date);
  IF v_order IS NULL THEN RAISE EXCEPTION 'السؤال غير متاح حالياً'; END IF;
  SELECT id INTO v_submission FROM public.marathon_trainee_submissions WHERE marathon_id=p_marathon_id AND trainee_id=v_trainee;
  IF v_submission IS NULL THEN INSERT INTO public.marathon_trainee_submissions(marathon_id,trainee_id,group_id) VALUES(p_marathon_id,v_trainee,v_group) RETURNING id INTO v_submission; END IF;
  SELECT * INTO v_existing FROM public.marathon_trainee_answers WHERE submission_id=v_submission AND question_id=p_question_id;
  IF v_existing IS NULL THEN SELECT count(*) INTO v_answered FROM public.marathon_trainee_answers WHERE submission_id=v_submission; IF v_order <> v_answered+1 THEN RAISE EXCEPTION 'لا يمكنك تخطي الأسئلة'; END IF;
  ELSIF NOT COALESCE(v_existing.is_reopened,false) THEN RAISE EXCEPTION 'الإجابة مثبتة'; END IF;
  SELECT is_correct INTO v_correct FROM public.marathon_answers WHERE id=p_selected_answer_id AND question_id=p_question_id;
  IF v_existing IS NULL THEN INSERT INTO public.marathon_trainee_answers(submission_id,question_id,selected_answer_id,is_correct,score_awarded,is_reopened) VALUES(v_submission,p_question_id,p_selected_answer_id,COALESCE(v_correct,false),CASE WHEN v_correct THEN v_weight ELSE 0 END,false);
  ELSE UPDATE public.marathon_trainee_answers SET selected_answer_id=p_selected_answer_id,is_correct=COALESCE(v_correct,false),score_awarded=CASE WHEN v_correct THEN v_weight ELSE 0 END,is_reopened=false,answered_at=now() WHERE id=v_existing.id; END IF;
  SELECT COALESCE(sum(score_awarded),0),count(*) INTO v_score,v_answered FROM public.marathon_trainee_answers WHERE submission_id=v_submission;
  SELECT count(*) INTO v_total FROM public.marathon_questions WHERE marathon_id=p_marathon_id AND status='PUBLISHED';
  v_grade=CASE WHEN v_score<60 THEN 'ضعيف' WHEN v_score<70 THEN 'مقبول' WHEN v_score<80 THEN 'جيد' WHEN v_score<90 THEN 'جيد جدًا' ELSE 'ممتاز' END;
  UPDATE public.marathon_trainee_submissions SET total_score=v_score,appreciation_grade=v_grade,is_submitted=(v_answered>=v_total),submitted_at=CASE WHEN v_answered>=v_total THEN now() ELSE submitted_at END WHERE id=v_submission;
  RETURN jsonb_build_object('success',true,'answered_count',v_answered,'total_questions',v_total,'progress_percentage',CASE WHEN v_total>0 THEN round((v_answered::numeric/v_total)*100,2) ELSE 0 END,'is_completed',v_answered>=v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_marathon_answer(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_marathon_answer(uuid,uuid,uuid) TO authenticated;

DO $$ BEGIN
  IF NOT has_function_privilege('authenticated','public.get_marathon_questions_for_player(uuid)','EXECUTE') THEN RAISE EXCEPTION 'player question RPC grant missing'; END IF;
  IF has_function_privilege('anon','public.get_marathon_questions_for_player(uuid)','EXECUTE') THEN RAISE EXCEPTION 'anon player question RPC grant present'; END IF;
END $$;
COMMIT;
