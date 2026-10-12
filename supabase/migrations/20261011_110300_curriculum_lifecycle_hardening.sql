-- 20261011_110300_curriculum_lifecycle_hardening.sql
-- Prevent direct draft/publication metadata bypasses on normalized curriculum.
BEGIN;

REVOKE UPDATE ON public.curriculum_days, public.curriculum_entries FROM authenticated;

CREATE OR REPLACE FUNCTION public.update_curriculum_day(
  p_day_id uuid,
  p_day_number integer DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_study_date date DEFAULT NULL,
  p_sort_order integer DEFAULT NULL
)
RETURNS public.curriculum_days
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_group smallint; v_day public.curriculum_days;
BEGIN
  SELECT group_id INTO v_group FROM public.curriculum_days WHERE id=p_day_id AND deleted_at IS NULL;
  IF v_group IS NULL OR NOT public.can_manage_curriculum(v_group) THEN RAISE EXCEPTION 'غير مصرح بتعديل اليوم' USING ERRCODE='42501'; END IF;
  UPDATE public.curriculum_days SET
    day_number=COALESCE(p_day_number,day_number), title=COALESCE(p_title,title),
    study_date=COALESCE(p_study_date,study_date), sort_order=COALESCE(p_sort_order,sort_order),
    status=CASE WHEN status='PUBLISHED' THEN 'DRAFT' ELSE status END,
    published_at=CASE WHEN status='PUBLISHED' THEN NULL ELSE published_at END,
    published_by=CASE WHEN status='PUBLISHED' THEN NULL ELSE published_by END,
    updated_at=now()
  WHERE id=p_day_id RETURNING * INTO v_day;
  RETURN v_day;
END;
$$;
REVOKE ALL ON FUNCTION public.update_curriculum_day(uuid,integer,text,date,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_curriculum_day(uuid,integer,text,date,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_curriculum_entry(
  p_entry_id uuid,
  p_day_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_lecturer_id uuid DEFAULT NULL,
  p_sort_order integer DEFAULT NULL,
  p_content_metadata jsonb DEFAULT NULL
)
RETURNS public.curriculum_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_group smallint; v_day_group smallint; v_entry public.curriculum_entries;
BEGIN
  SELECT group_id INTO v_group FROM public.curriculum_entries WHERE id=p_entry_id AND deleted_at IS NULL;
  IF v_group IS NULL OR NOT public.can_manage_curriculum(v_group) THEN RAISE EXCEPTION 'غير مصرح بتعديل المدخل' USING ERRCODE='42501'; END IF;
  IF p_day_id IS NOT NULL THEN
    SELECT group_id INTO v_day_group FROM public.curriculum_days WHERE id=p_day_id AND deleted_at IS NULL;
    IF v_day_group IS NULL OR v_day_group<>v_group THEN RAISE EXCEPTION 'اليوم لا ينتمي إلى نفس المجموعة' USING ERRCODE='22023'; END IF;
  END IF;
  UPDATE public.curriculum_entries SET
    day_id=COALESCE(p_day_id,day_id), title=COALESCE(p_title,title), description=COALESCE(p_description,description),
    lecturer_id=COALESCE(p_lecturer_id,lecturer_id), sort_order=COALESCE(p_sort_order,sort_order),
    content_metadata=COALESCE(p_content_metadata,content_metadata),
    status=CASE WHEN status='PUBLISHED' THEN 'DRAFT' ELSE status END,
    published_at=CASE WHEN status='PUBLISHED' THEN NULL ELSE published_at END,
    published_by=CASE WHEN status='PUBLISHED' THEN NULL ELSE published_by END,
    updated_at=now()
  WHERE id=p_entry_id RETURNING * INTO v_entry;
  RETURN v_entry;
END;
$$;
REVOKE ALL ON FUNCTION public.update_curriculum_entry(uuid,uuid,text,text,uuid,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_curriculum_entry(uuid,uuid,text,text,uuid,integer,jsonb) TO authenticated;

DO $$ BEGIN
  IF has_table_privilege('authenticated','public.curriculum_days','UPDATE') THEN RAISE EXCEPTION 'direct day update remains'; END IF;
  IF has_table_privilege('authenticated','public.curriculum_entries','UPDATE') THEN RAISE EXCEPTION 'direct entry update remains'; END IF;
END $$;
COMMIT;