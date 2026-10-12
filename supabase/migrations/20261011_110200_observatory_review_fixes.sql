-- 20261011_110200_observatory_review_fixes.sql
-- Security/logic fixes identified by independent code review.
BEGIN;

-- Management writes must go through validated SECURITY DEFINER RPCs. Direct
-- table writes could bypass archive/replace semantics and delete history.
REVOKE INSERT, UPDATE, DELETE ON public.marathon_questions, public.marathon_sections, public.marathon_answers, public.marathons FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.marathon_question_revisions FROM authenticated;
GRANT SELECT ON public.marathon_questions, public.marathon_sections, public.marathon_answers, public.marathons TO authenticated;

CREATE OR REPLACE FUNCTION public.create_marathon_section(p_marathon_id uuid, p_title text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_group smallint; v_id uuid;
BEGIN
  SELECT group_id INTO v_group FROM public.marathons WHERE id=p_marathon_id AND is_active AND deleted_at IS NULL;
  IF v_group IS NULL OR NOT public.can_manage_marathon(v_group) THEN RAISE EXCEPTION 'غير مصرح بإنشاء قسم' USING ERRCODE='42501'; END IF;
  IF length(trim(COALESCE(p_title,'')))=0 THEN RAISE EXCEPTION 'عنوان القسم مطلوب' USING ERRCODE='22023'; END IF;
  INSERT INTO public.marathon_sections(marathon_id,title,order_index,status)
  VALUES(p_marathon_id,trim(p_title),COALESCE((SELECT max(order_index)+1 FROM public.marathon_sections WHERE marathon_id=p_marathon_id),1),'PUBLISHED') RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_marathon_section(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_marathon_section(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_marathon_question(p_marathon_id uuid,p_section_id uuid,p_question_text text,p_options jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_group smallint; v_id uuid; v_order integer; item jsonb; option_count integer; correct_count integer;
BEGIN
  SELECT group_id INTO v_group FROM public.marathons WHERE id=p_marathon_id AND is_active AND deleted_at IS NULL;
  IF v_group IS NULL OR NOT public.can_manage_marathon(v_group) THEN RAISE EXCEPTION 'غير مصرح بإنشاء سؤال' USING ERRCODE='42501'; END IF;
  IF p_section_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.marathon_sections WHERE id=p_section_id AND marathon_id=p_marathon_id) THEN RAISE EXCEPTION 'القسم لا ينتمي إلى هذا الماراثون' USING ERRCODE='22023'; END IF;
  IF length(trim(COALESCE(p_question_text,'')))=0 OR jsonb_typeof(p_options)<>'array' THEN RAISE EXCEPTION 'بيانات السؤال غير صالحة' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO option_count FROM jsonb_array_elements(p_options);
  SELECT count(*) INTO correct_count FROM jsonb_array_elements(p_options) x WHERE COALESCE((x->>'is_correct')::boolean,false);
  IF option_count<2 OR correct_count<>1 THEN RAISE EXCEPTION 'يجب إدخال خيارين على الأقل وإجابة صحيحة واحدة' USING ERRCODE='22023'; END IF;
  SELECT COALESCE(max(order_index)+1,1) INTO v_order FROM public.marathon_questions WHERE marathon_id=p_marathon_id AND status='PUBLISHED';
  INSERT INTO public.marathon_questions(marathon_id,section_id,question_text,question_type,order_index,status,published_at,published_by)
  VALUES(p_marathon_id,p_section_id,trim(p_question_text),'MCQ',v_order,'PUBLISHED',now(),auth.uid()) RETURNING id INTO v_id;
  FOR item IN SELECT * FROM jsonb_array_elements(p_options) LOOP
    INSERT INTO public.marathon_answers(question_id,answer_text,is_correct,order_index)
    VALUES(v_id,trim(item->>'answer_text'),COALESCE((item->>'is_correct')::boolean,false),COALESCE((item->>'order_index')::integer,1));
  END LOOP;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_marathon_question(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_marathon_question(uuid,uuid,text,jsonb) TO authenticated;

-- Revisions contain the answer key; only managers may read them.
DROP POLICY IF EXISTS "Read marathon question revisions" ON public.marathon_question_revisions;
CREATE POLICY "Managers read marathon question revisions" ON public.marathon_question_revisions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.marathon_questions q JOIN public.marathons m ON m.id=q.marathon_id WHERE q.id=question_id AND public.can_manage_marathon(m.group_id)));

-- Players may only receive active-window, published questions and option text.
CREATE OR REPLACE FUNCTION public.get_marathon_questions_for_player(p_marathon_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_actor uuid:=auth.uid(); v_group smallint; result jsonb;
BEGIN
  SELECT group_id INTO v_group FROM public.profiles WHERE id=v_actor AND role_id='trainee' AND is_active AND deleted_at IS NULL;
  IF v_group IS NULL OR NOT EXISTS (SELECT 1 FROM public.marathons m WHERE m.id=p_marathon_id AND m.group_id=v_group AND m.is_active AND m.deleted_at IS NULL AND (m.start_date IS NULL OR now()>=m.start_date) AND (m.end_date IS NULL OR now()<=m.end_date)) THEN RAISE EXCEPTION 'غير مصرح بالوصول إلى هذا الماراثون' USING ERRCODE='42501'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',q.id,'section_id',q.section_id,'question_text',q.question_text,'question_type',q.question_type,'order_index',q.order_index,'section_title',s.title,'options',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'answer_text',a.answer_text,'order_index',a.order_index) ORDER BY a.order_index) FROM public.marathon_answers a WHERE a.question_id=q.id),'[]'::jsonb)) ORDER BY q.order_index),'[]'::jsonb) INTO result
  FROM public.marathon_questions q LEFT JOIN public.marathon_sections s ON s.id=q.section_id
  WHERE q.marathon_id=p_marathon_id AND q.status='PUBLISHED' AND (q.section_id IS NULL OR s.status='PUBLISHED');
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_marathon_questions_for_player(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_marathon_questions_for_player(uuid) TO authenticated;

-- Trainee state never exposes correctness to the trainee, even after completion.
CREATE OR REPLACE FUNCTION public._unsafe_get_trainee_marathon_state(p_marathon_id uuid,p_trainee_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE viewer_id uuid:=auth.uid(); viewer_role varchar; total_q int:=0; answered_q int:=0; submission record; answers jsonb:='[]'::jsonb; self_view boolean:=(viewer_id=p_trainee_id);
BEGIN
 SELECT role_id INTO viewer_role FROM public.profiles WHERE id=viewer_id;
 SELECT count(*) INTO total_q FROM public.marathon_questions WHERE marathon_id=p_marathon_id AND status='PUBLISHED';
 SELECT * INTO submission FROM public.marathon_trainee_submissions WHERE marathon_id=p_marathon_id AND trainee_id=p_trainee_id;
 IF submission IS NOT NULL THEN
  SELECT count(*) INTO answered_q FROM public.marathon_trainee_answers a JOIN public.marathon_questions q ON q.id=a.question_id WHERE a.submission_id=submission.id AND q.marathon_id=p_marathon_id AND q.status='PUBLISHED';
  SELECT jsonb_agg(jsonb_build_object('question_id',a.question_id,'selected_answer_id',a.selected_answer_id,'is_reopened',a.is_reopened,'is_correct',CASE WHEN viewer_role IN ('admin','super_user','servant') AND NOT self_view THEN a.is_correct ELSE NULL END)) INTO answers FROM public.marathon_trainee_answers a JOIN public.marathon_questions q ON q.id=a.question_id WHERE a.submission_id=submission.id AND q.marathon_id=p_marathon_id;
 END IF;
 RETURN jsonb_build_object('total_questions',total_q,'answered_questions',answered_q,'progress_percentage',CASE WHEN total_q>0 THEN round((answered_q::numeric/total_q)*100,2) ELSE 0 END,'is_completed',COALESCE(submission.is_submitted,false),'answers',COALESCE(answers,'[]'::jsonb),'score',CASE WHEN viewer_role IN ('admin','super_user','servant') AND NOT self_view THEN submission.total_score ELSE NULL END,'appreciation_grade',CASE WHEN viewer_role IN ('admin','super_user','servant') AND NOT self_view THEN submission.appreciation_grade ELSE NULL END);
END;
$$;

-- Active published questions only count toward sequence and completion.
CREATE OR REPLACE FUNCTION public.submit_marathon_answer(p_marathon_id uuid,p_question_id uuid,p_selected_answer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE trainee uuid:=auth.uid(); group_id smallint; submission_id uuid; q_order int; q_weight numeric(6,3); correct boolean; answered int; total int; score numeric(5,2); grade varchar(32); existing record; has_previous boolean;
BEGIN
 IF trainee IS NULL THEN RAISE EXCEPTION 'المصادقة مطلوبة' USING ERRCODE='42501'; END IF;
 SELECT p.group_id INTO group_id FROM public.profiles p WHERE p.id=trainee AND p.role_id='trainee' AND p.is_active AND p.deleted_at IS NULL;
 IF group_id IS NULL THEN RAISE EXCEPTION 'الحساب غير مصرح له بحل الماراثون' USING ERRCODE='42501'; END IF;
 SELECT q.order_index,q.score_weight INTO q_order,q_weight FROM public.marathon_questions q JOIN public.marathons m ON m.id=q.marathon_id WHERE q.id=p_question_id AND q.marathon_id=p_marathon_id AND q.status='PUBLISHED' AND (q.section_id IS NULL OR EXISTS (SELECT 1 FROM public.marathon_sections s WHERE s.id=q.section_id AND s.status='PUBLISHED')) AND m.group_id=group_id AND m.is_active AND m.deleted_at IS NULL AND (m.start_date IS NULL OR now()>=m.start_date) AND (m.end_date IS NULL OR now()<=m.end_date);
 IF q_order IS NULL THEN RAISE EXCEPTION 'السؤال غير متاح حالياً'; END IF;
 SELECT id INTO submission_id FROM public.marathon_trainee_submissions WHERE marathon_id=p_marathon_id AND trainee_id=trainee;
 IF submission_id IS NULL THEN INSERT INTO public.marathon_trainee_submissions(marathon_id,trainee_id,group_id) VALUES(p_marathon_id,trainee,group_id) RETURNING id INTO submission_id; END IF;
 SELECT * INTO existing FROM public.marathon_trainee_answers WHERE submission_id=submit_marathon_answer.submission_id AND question_id=p_question_id;
 IF existing IS NULL THEN SELECT EXISTS (SELECT 1 FROM public.marathon_questions prior WHERE prior.marathon_id=p_marathon_id AND prior.status='PUBLISHED' AND prior.order_index<q_order AND NOT EXISTS (SELECT 1 FROM public.marathon_trainee_answers a WHERE a.submission_id=submit_marathon_answer.submission_id AND a.question_id=prior.id)) INTO has_previous; IF has_previous THEN RAISE EXCEPTION 'لا يمكنك تخطي الأسئلة'; END IF;
 ELSIF NOT COALESCE(existing.is_reopened,false) THEN RAISE EXCEPTION 'الإجابة مثبتة'; END IF;
 SELECT is_correct INTO correct FROM public.marathon_answers WHERE id=p_selected_answer_id AND question_id=p_question_id;
 IF correct IS NULL THEN RAISE EXCEPTION 'الاختيار غير تابع للسؤال'; END IF;
 IF existing IS NULL THEN INSERT INTO public.marathon_trainee_answers(submission_id,question_id,selected_answer_id,is_correct,score_awarded,is_reopened) VALUES(submission_id,p_question_id,p_selected_answer_id,correct,CASE WHEN correct THEN q_weight ELSE 0 END,false); ELSE UPDATE public.marathon_trainee_answers SET selected_answer_id=p_selected_answer_id,is_correct=correct,score_awarded=CASE WHEN correct THEN q_weight ELSE 0 END,is_reopened=false,answered_at=now() WHERE id=existing.id; END IF;
 SELECT COALESCE(sum(a.score_awarded),0),count(*) INTO score,answered FROM public.marathon_trainee_answers a JOIN public.marathon_questions q ON q.id=a.question_id WHERE a.submission_id=submission_id AND q.marathon_id=p_marathon_id AND q.status='PUBLISHED';
 SELECT count(*) INTO total FROM public.marathon_questions WHERE marathon_id=p_marathon_id AND status='PUBLISHED';
 grade=CASE WHEN score<60 THEN 'ضعيف' WHEN score<70 THEN 'مقبول' WHEN score<80 THEN 'جيد' WHEN score<90 THEN 'جيد جدًا' ELSE 'ممتاز' END;
 UPDATE public.marathon_trainee_submissions SET total_score=score,appreciation_grade=grade,is_submitted=(answered>=total),submitted_at=CASE WHEN answered>=total THEN now() ELSE submitted_at END WHERE id=submission_id;
 RETURN jsonb_build_object('success',true,'answered_count',answered,'total_questions',total,'progress_percentage',CASE WHEN total>0 THEN round((answered::numeric/total)*100,2) ELSE 0 END,'is_completed',answered>=total);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_marathon_answer(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_marathon_answer(uuid,uuid,uuid) TO authenticated;

DO $$ BEGIN IF has_table_privilege('anon','public.marathon_question_revisions','SELECT') THEN RAISE EXCEPTION 'anon revision read remains'; END IF; IF has_function_privilege('anon','public.get_marathon_questions_for_player(uuid)','EXECUTE') THEN RAISE EXCEPTION 'anon player RPC remains'; END IF; END $$;
COMMIT;