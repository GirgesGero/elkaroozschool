BEGIN;

-- One administrator owns system-wide authority. The legacy super_user becomes
-- an ordinary, group-scoped supervisor; existing servant permissions remain.
INSERT INTO public.roles (id, name_ar, description)
VALUES ('supervisor', 'مشرف', 'مشرف محدود بنطاق فرقته وبالصلاحيات التشغيلية الممنوحة له فقط')
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description;

UPDATE public.profiles
SET role_id = 'supervisor', updated_at = now()
WHERE role_id = 'super_user';

UPDATE public.roles
SET name_ar = 'دور قديم غير مستخدم',
    description = 'دور متوافق مؤقتًا مع الأرشيف القديم؛ لا يمنح صلاحيات إدارية.'
WHERE id = 'super_user';

DROP INDEX IF EXISTS public.uq_single_super_user;
-- The original migration created uq_single_admin on (role_id) WHERE role_id='admin'
-- AND deleted_at IS NULL. IF NOT EXISTS would silently retain that definition and
-- inactive undeleted admins could still block an atomic promotion. Replace it.
DROP INDEX IF EXISTS public.uq_single_admin;
CREATE UNIQUE INDEX uq_single_admin
  ON public.profiles(role_id)
  WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL;

-- A role swap can only happen inside transfer_system_admin(). A caller-set GUC
-- is intentionally not used as an authorization signal.
CREATE TABLE IF NOT EXISTS public.system_admin_role_change_permits (
  transaction_id bigint NOT NULL,
  actor_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  old_role_id text NOT NULL,
  new_role_id text NOT NULL,
  PRIMARY KEY (transaction_id, profile_id)
);
ALTER TABLE public.system_admin_role_change_permits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.system_admin_role_change_permits FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_system_role_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role_id = 'admin' THEN
      RAISE EXCEPTION 'Transfer system administrator before deleting the current administrator'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role_id IN ('admin','supervisor','super_user') THEN
    RAISE EXCEPTION 'Sensitive roles may only be assigned by the approved system workflow'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.system_admin_role_change_permits p
      WHERE p.transaction_id = txid_current() AND p.profile_id = OLD.id
        AND (p.actor_id = auth.uid() OR (auth.uid() IS NULL AND session_user = 'postgres'))
        AND p.old_role_id = OLD.role_id
        AND p.new_role_id = NEW.role_id
    ) THEN
      RAISE EXCEPTION 'Sensitive role changes require the system-admin transfer workflow'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role_id = 'admin'
     AND (NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at)
     AND NOT EXISTS (
       SELECT 1 FROM public.system_admin_role_change_permits p
       WHERE p.transaction_id = txid_current() AND p.profile_id = OLD.id AND p.actor_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'Transfer system administrator before suspending the current administrator'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_system_role_changes ON public.profiles;
CREATE TRIGGER trg_guard_system_role_changes
BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_system_role_changes();
REVOKE ALL ON FUNCTION public.guard_system_role_changes() FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.general_secretariat_members (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  appointed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.general_secretariat_permissions (
  profile_id uuid NOT NULL REFERENCES public.general_secretariat_members(profile_id) ON DELETE CASCADE,
  permission_id varchar(64) NOT NULL REFERENCES public.permissions(id) ON DELETE RESTRICT,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, permission_id)
);

ALTER TABLE public.general_secretariat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_secretariat_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own or manage general secretariat members" ON public.general_secretariat_members;
CREATE POLICY "Read own or manage general secretariat members"
ON public.general_secretariat_members FOR SELECT TO authenticated
USING (profile_id = auth.uid() OR public.is_admin_or_super_user());

DROP POLICY IF EXISTS "Read own or manage general secretariat permissions" ON public.general_secretariat_permissions;
CREATE POLICY "Read own or manage general secretariat permissions"
ON public.general_secretariat_permissions FOR SELECT TO authenticated
USING (profile_id = auth.uid() OR public.is_admin_or_super_user());

-- Compatibility name retained because existing policies/RPCs call it. Its
-- meaning is deliberately narrowed: only the active singleton admin is global.
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role_id = 'admin'
      AND p.is_active = true AND p.deleted_at IS NULL
  );
$$;
REVOKE ALL ON FUNCTION public.is_system_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT public.is_system_admin(); $$;
REVOKE ALL ON FUNCTION public.is_admin_or_super_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_user() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.system_admin_assert_current()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only the current system administrator may perform this action'
      USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.system_admin_assert_current() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transfer_permitted boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    SELECT EXISTS (
      SELECT 1 FROM public.system_admin_role_change_permits p
      WHERE p.transaction_id = txid_current()
        AND (p.actor_id = auth.uid() OR (auth.uid() IS NULL AND session_user = 'postgres'))
        AND p.profile_id = OLD.id AND p.old_role_id = OLD.role_id
        AND p.new_role_id = NEW.role_id
    ) INTO v_transfer_permitted;
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_system_admin() AND NOT v_transfer_permitted
     AND (
       NEW.role_id IS DISTINCT FROM OLD.role_id
       OR NEW.group_id IS DISTINCT FROM OLD.group_id
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     ) THEN
    RAISE EXCEPTION 'Sensitive profile fields may only be changed by the system administrator'
      USING ERRCODE = '42501';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_general_secretariat_permission(p_permission_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_permission_id IN ('MANAGE_LECTURES','MANAGE_CURRICULUM','MANAGE_MARATHON','GRADE_EXAMS','MANAGE_BOOKS')
    AND EXISTS (
      SELECT 1
      FROM public.general_secretariat_members gm
      JOIN public.general_secretariat_permissions gp ON gp.profile_id = gm.profile_id
      JOIN public.profiles p ON p.id = gm.profile_id
      WHERE gm.profile_id = auth.uid() AND gm.is_active = true
        AND gp.permission_id = p_permission_id
        AND p.is_active = true AND p.deleted_at IS NULL
    );
$$;
REVOKE ALL ON FUNCTION public.has_general_secretariat_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_general_secretariat_permission(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_servant_permission(perm_id varchar)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_system_admin()
    OR public.has_general_secretariat_permission(perm_id)
    OR EXISTS (
      SELECT 1 FROM public.servant_permissions sp
      JOIN public.profiles p ON p.id = sp.profile_id
      WHERE sp.profile_id = auth.uid() AND sp.permission_id = perm_id
        AND p.is_active = true AND p.deleted_at IS NULL
    );
$$;
REVOKE ALL ON FUNCTION public.has_servant_permission(varchar) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_servant_permission(varchar) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_manage_group_permission(p_permission_id text, p_group_id smallint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_system_admin()
    OR public.has_general_secretariat_permission(p_permission_id)
    OR (
      public.get_current_user_group() = p_group_id
      AND public.has_servant_permission(p_permission_id)
    );
$$;
REVOKE ALL ON FUNCTION public.can_manage_group_permission(text, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_group_permission(text, smallint) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_manage_curriculum(p_group_id smallint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_system_admin()
    OR public.has_general_secretariat_permission('MANAGE_CURRICULUM')
    OR public.has_general_secretariat_permission('MANAGE_LECTURES')
    OR (
      public.get_current_user_group() = p_group_id
      AND (
        public.has_servant_permission('MANAGE_CURRICULUM')
        OR public.has_servant_permission('MANAGE_LECTURES')
        OR public.is_secretariat_of_group(p_group_id)
      )
    );
$$;
REVOKE ALL ON FUNCTION public.can_manage_curriculum(smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_curriculum(smallint) TO authenticated, service_role;

-- Carry delegate permissions across all curriculum child tables; permissive RLS
-- policies are OR-combined, so replace the old group-only names explicitly.
DROP POLICY IF EXISTS "Read curriculum days in own group" ON public.curriculum_days;
CREATE POLICY "Read curriculum days in authorized scope" ON public.curriculum_days
FOR SELECT TO authenticated
USING (
  (group_id = public.get_current_user_group() OR public.can_manage_curriculum(group_id))
  AND (status = 'PUBLISHED' OR public.can_manage_curriculum(group_id))
  AND deleted_at IS NULL
);
DROP POLICY IF EXISTS "Manage curriculum days in own group" ON public.curriculum_days;
CREATE POLICY "Manage curriculum days in authorized scope" ON public.curriculum_days
FOR ALL TO authenticated USING (public.can_manage_curriculum(group_id))
WITH CHECK (public.can_manage_curriculum(group_id));

DROP POLICY IF EXISTS "Read curriculum entries in own group" ON public.curriculum_entries;
CREATE POLICY "Read curriculum entries in authorized scope" ON public.curriculum_entries
FOR SELECT TO authenticated
USING (
  (group_id = public.get_current_user_group() OR public.can_manage_curriculum(group_id))
  AND (status = 'PUBLISHED' OR public.can_manage_curriculum(group_id))
  AND deleted_at IS NULL
);
DROP POLICY IF EXISTS "Manage curriculum entries in own group" ON public.curriculum_entries;
CREATE POLICY "Manage curriculum entries in authorized scope" ON public.curriculum_entries
FOR ALL TO authenticated USING (public.can_manage_curriculum(group_id))
WITH CHECK (public.can_manage_curriculum(group_id));

DROP POLICY IF EXISTS "Read curriculum revisions in own group" ON public.curriculum_revisions;
CREATE POLICY "Read curriculum revisions in authorized scope" ON public.curriculum_revisions
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.curriculum_entries e
  WHERE e.id = entry_id AND public.can_manage_curriculum(e.group_id)));

CREATE OR REPLACE FUNCTION public.can_manage_marathon(p_group_id smallint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_system_admin()
    OR public.has_general_secretariat_permission('MANAGE_MARATHON')
    OR (
      public.get_current_user_group() = p_group_id
      AND (
        public.has_servant_permission('MANAGE_MARATHON')
        OR public.is_secretariat_of_group(p_group_id)
      )
    );
$$;
REVOKE ALL ON FUNCTION public.can_manage_marathon(smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_marathon(smallint) TO authenticated, service_role;

-- Profile reads stay scoped for supervisors; the system admin alone is global.
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read profiles" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR group_id = public.get_current_user_group() OR public.is_system_admin());

-- Give operational delegates only the rows covered by their selected permission.
DROP POLICY IF EXISTS "Read terms in same group or admin" ON public.terms;
CREATE POLICY "Read terms in same group or authorized delegate" ON public.terms
FOR SELECT TO authenticated
USING (group_id = public.get_current_user_group() OR public.can_manage_group_permission('MANAGE_CURRICULUM', group_id) OR public.can_manage_group_permission('MANAGE_LECTURES', group_id));
DROP POLICY IF EXISTS "Manage terms with permission" ON public.terms;
CREATE POLICY "Manage terms with permission" ON public.terms
FOR ALL TO authenticated
USING (public.can_manage_group_permission('MANAGE_CURRICULUM', group_id))
WITH CHECK (public.can_manage_group_permission('MANAGE_CURRICULUM', group_id));

DROP POLICY IF EXISTS "Read lectures in same group or admin" ON public.lectures;
CREATE POLICY "Read lectures in same group or authorized delegate" ON public.lectures
FOR SELECT TO authenticated
USING ((group_id = public.get_current_user_group() OR public.can_manage_group_permission('MANAGE_LECTURES', group_id)) AND (deleted_at IS NULL OR public.is_system_admin()));
DROP POLICY IF EXISTS "Manage lectures with permission" ON public.lectures;
CREATE POLICY "Manage lectures with permission" ON public.lectures
FOR ALL TO authenticated
USING (public.can_manage_group_permission('MANAGE_LECTURES', group_id))
WITH CHECK (public.can_manage_group_permission('MANAGE_LECTURES', group_id));

DROP POLICY IF EXISTS "Read curriculums in same group or admin" ON public.curriculums;
CREATE POLICY "Read curriculums in same group or authorized delegate" ON public.curriculums
FOR SELECT TO authenticated
USING ((group_id = public.get_current_user_group() OR public.can_manage_group_permission('MANAGE_CURRICULUM', group_id)) AND (deleted_at IS NULL OR public.is_system_admin()));
DROP POLICY IF EXISTS "Manage curriculums with permission" ON public.curriculums;
CREATE POLICY "Manage curriculums with permission" ON public.curriculums
FOR ALL TO authenticated
USING (public.can_manage_group_permission('MANAGE_CURRICULUM', group_id))
WITH CHECK (public.can_manage_group_permission('MANAGE_CURRICULUM', group_id));

CREATE POLICY "Supervisor read attendance records in own group" ON public.attendance_records
FOR SELECT TO authenticated
USING (group_id = public.get_current_user_group() AND public.get_current_user_role() = 'supervisor');

DROP POLICY IF EXISTS "Read exams in same group" ON public.exams;
CREATE POLICY "Read exams in authorized scope" ON public.exams
FOR SELECT TO authenticated
USING (group_id = public.get_current_user_group()
  OR public.can_manage_group_permission('GRADE_EXAMS', group_id));
DROP POLICY IF EXISTS "Admin manage exams" ON public.exams;
CREATE POLICY "System admin manage exams" ON public.exams
FOR ALL TO authenticated
USING (public.is_system_admin()) WITH CHECK (public.is_system_admin());
DROP POLICY IF EXISTS "Read exam grades" ON public.exam_grades;
CREATE POLICY "Read exam grades" ON public.exam_grades
FOR SELECT TO authenticated
USING (trainee_id = auth.uid()
  OR (group_id = public.get_current_user_group() AND public.get_current_user_role() IN ('servant','secretariat','supervisor','admin'))
  OR public.can_manage_group_permission('GRADE_EXAMS', group_id));
DROP POLICY IF EXISTS "Servant with GRADE_EXAMS manage grades" ON public.exam_grades;
CREATE POLICY "Authorized staff manage exam grades" ON public.exam_grades
FOR ALL TO authenticated
USING (public.can_manage_group_permission('GRADE_EXAMS', group_id))
WITH CHECK (public.can_manage_group_permission('GRADE_EXAMS', group_id));

DROP POLICY IF EXISTS "Read marathons in same group" ON public.marathons;
CREATE POLICY "Read marathons in authorized scope" ON public.marathons
FOR SELECT TO authenticated
USING (group_id = public.get_current_user_group() OR public.can_manage_marathon(group_id));
DROP POLICY IF EXISTS "Manage marathons with permission" ON public.marathons;
CREATE POLICY "Manage marathons with permission" ON public.marathons
FOR ALL TO authenticated
USING (public.can_manage_marathon(group_id))
WITH CHECK (public.can_manage_marathon(group_id));

DROP POLICY IF EXISTS "Read published marathon questions in own group" ON public.marathon_questions;
CREATE POLICY "Read published marathon questions in own group" ON public.marathon_questions
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.marathons m WHERE m.id = marathon_questions.marathon_id
    AND (m.group_id = public.get_current_user_group() OR public.can_manage_marathon(m.group_id))
    AND m.deleted_at IS NULL)
  AND (status = 'PUBLISHED' OR public.can_manage_marathon(
    (SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_questions.marathon_id)))
);
DROP POLICY IF EXISTS "Manage marathon questions in own group" ON public.marathon_questions;
DROP POLICY IF EXISTS "Manage marathon questions" ON public.marathon_questions;
CREATE POLICY "Manage marathon questions in authorized scope" ON public.marathon_questions
FOR ALL TO authenticated
USING (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_questions.marathon_id)))
WITH CHECK (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_questions.marathon_id)));

DROP POLICY IF EXISTS "Read published marathon sections in own group" ON public.marathon_sections;
CREATE POLICY "Read published marathon sections in own group" ON public.marathon_sections
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.marathons m WHERE m.id = marathon_sections.marathon_id
    AND (m.group_id = public.get_current_user_group() OR public.can_manage_marathon(m.group_id)) AND m.deleted_at IS NULL)
  AND (status = 'PUBLISHED' OR public.can_manage_marathon(
    (SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_sections.marathon_id)))
);
DROP POLICY IF EXISTS "Manage marathon sections in own group" ON public.marathon_sections;
DROP POLICY IF EXISTS "Manage marathon sections" ON public.marathon_sections;
CREATE POLICY "Manage marathon sections in authorized scope" ON public.marathon_sections
FOR ALL TO authenticated
USING (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_sections.marathon_id)))
WITH CHECK (public.can_manage_marathon((SELECT m.group_id FROM public.marathons m WHERE m.id = marathon_sections.marathon_id)));

DROP POLICY IF EXISTS "Staff read marathon answers in own group" ON public.marathon_answers;
DROP POLICY IF EXISTS "Manage marathon answers in own group" ON public.marathon_answers;
DROP POLICY IF EXISTS "Manage marathon answers" ON public.marathon_answers;
CREATE POLICY "Authorized staff read marathon answers" ON public.marathon_answers
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.marathon_questions q JOIN public.marathons m ON m.id = q.marathon_id
  WHERE q.id = marathon_answers.question_id AND public.can_manage_marathon(m.group_id)));
CREATE POLICY "Authorized staff manage marathon answers" ON public.marathon_answers
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.marathon_questions q JOIN public.marathons m ON m.id = q.marathon_id
  WHERE q.id = marathon_answers.question_id AND public.can_manage_marathon(m.group_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.marathon_questions q JOIN public.marathons m ON m.id = q.marathon_id
  WHERE q.id = marathon_answers.question_id AND public.can_manage_marathon(m.group_id)));

DROP POLICY IF EXISTS "Manage books with permission" ON public.books;
CREATE POLICY "Manage books with permission" ON public.books
FOR ALL TO authenticated
USING (public.can_manage_group_permission('MANAGE_BOOKS', group_id))
WITH CHECK (public.can_manage_group_permission('MANAGE_BOOKS', group_id));
DROP POLICY IF EXISTS "Manage researches with permission" ON public.researches;
CREATE POLICY "Manage researches with permission" ON public.researches
FOR ALL TO authenticated
USING (public.can_manage_group_permission('MANAGE_BOOKS', group_id))
WITH CHECK (public.can_manage_group_permission('MANAGE_BOOKS', group_id));

CREATE OR REPLACE FUNCTION public.transfer_system_admin(p_target_profile_id uuid, p_confirmation text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target_role text;
  v_auth_time numeric;
  v_target_name text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('elkarooz-system-admin-transfer', 0));
  PERFORM public.system_admin_assert_current();

  v_auth_time := NULLIF(auth.jwt()->>'auth_time', '')::numeric;
  IF v_auth_time IS NULL OR to_timestamp(v_auth_time) < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'Recent reauthentication is required' USING ERRCODE = '42501';
  END IF;
  IF p_confirmation IS DISTINCT FROM 'نقل مسؤول النظام' THEN
    RAISE EXCEPTION 'Confirmation phrase does not match' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.profiles
  WHERE id = v_actor AND role_id = 'admin' AND is_active AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current system administrator not found' USING ERRCODE = '42501'; END IF;

  SELECT role_id, full_name INTO v_target_role, v_target_name
  FROM public.profiles
  WHERE id = p_target_profile_id AND is_active = true AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR p_target_profile_id = v_actor
     OR v_target_role NOT IN ('supervisor','servant','secretariat') THEN
    RAISE EXCEPTION 'Target must be an active eligible staff member' USING ERRCODE = '22023';
  END IF;

  -- Private transaction-scoped permits authorize only this exact two-row swap.
  INSERT INTO public.system_admin_role_change_permits(transaction_id, actor_id, profile_id, old_role_id, new_role_id)
  VALUES
    (txid_current(), v_actor, v_actor, 'admin', 'supervisor'),
    (txid_current(), v_actor, p_target_profile_id, v_target_role, 'admin');

  -- Demote before promotion inside this transaction; the partial unique index
  -- is never violated, and any error rolls both changes back.
  UPDATE public.profiles SET role_id = 'supervisor', updated_at = now() WHERE id = v_actor;
  UPDATE public.profiles SET role_id = 'admin', updated_at = now() WHERE id = p_target_profile_id;
  DELETE FROM public.system_admin_role_change_permits WHERE transaction_id = txid_current();

  INSERT INTO public.audit_logs(actor_id, actor_name, actor_role, action, entity_type, entity_id, old_values, new_values)
  VALUES (v_actor, (SELECT full_name FROM public.profiles WHERE id = v_actor), 'admin',
    'SYSTEM_ADMIN_TRANSFER', 'profiles', p_target_profile_id::text,
    jsonb_build_object('previous_admin_id', v_actor, 'new_admin_role', v_target_role),
    jsonb_build_object('new_admin_id', p_target_profile_id, 'new_admin_name', v_target_name));

  RETURN jsonb_build_object('previous_admin_id', v_actor, 'new_admin_id', p_target_profile_id, 'new_admin_name', v_target_name);
END;
$$;
REVOKE ALL ON FUNCTION public.transfer_system_admin(uuid, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_system_admin(uuid, text) TO authenticated;

-- Break-glass is intentionally unavailable to PostgREST roles. Run only from a
-- verified provider-owner SQL session after two-person identity/approval checks.
CREATE OR REPLACE FUNCTION public.system_admin_break_glass_recovery(
  p_target_profile_id uuid,
  p_confirmation text,
  p_operator_reference text,
  p_approval_reference text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_admin_id uuid;
  v_target_role text;
  v_target_name text;
BEGIN
  IF session_user <> 'postgres' THEN
    RAISE EXCEPTION 'Break-glass recovery is restricted to the database owner session'
      USING ERRCODE = '42501';
  END IF;
  IF p_confirmation IS DISTINCT FROM 'RECOVER SYSTEM ADMIN' OR
     length(trim(COALESCE(p_operator_reference, ''))) < 8 OR
     length(trim(COALESCE(p_approval_reference, ''))) < 8 THEN
    RAISE EXCEPTION 'Recovery confirmation and documented references are required'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('elkarooz-system-admin-transfer', 0));
  SELECT id INTO v_current_admin_id FROM public.profiles
  WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL FOR UPDATE;
  IF v_current_admin_id IS NULL OR
     (SELECT count(*) FROM public.profiles WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Recovery requires exactly one existing system administrator; use the documented provider incident process if absent'
      USING ERRCODE = '42501';
  END IF;
  SELECT role_id, full_name INTO v_target_role, v_target_name FROM public.profiles
  WHERE id = p_target_profile_id AND is_active = true AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR p_target_profile_id = v_current_admin_id OR
     v_target_role NOT IN ('supervisor','servant','secretariat') THEN
    RAISE EXCEPTION 'Recovery target must be a different active eligible staff member'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.system_admin_role_change_permits(transaction_id, actor_id, profile_id, old_role_id, new_role_id)
  VALUES
    (txid_current(), v_current_admin_id, v_current_admin_id, 'admin', 'supervisor'),
    (txid_current(), v_current_admin_id, p_target_profile_id, v_target_role, 'admin');
  UPDATE public.profiles SET role_id = 'supervisor', updated_at = now() WHERE id = v_current_admin_id;
  UPDATE public.profiles SET role_id = 'admin', updated_at = now() WHERE id = p_target_profile_id;
  DELETE FROM public.system_admin_role_change_permits WHERE transaction_id = txid_current();

  INSERT INTO public.audit_logs(actor_id, actor_name, actor_role, action, entity_type, entity_id, old_values, new_values)
  VALUES (v_current_admin_id, 'database-owner:' || trim(p_operator_reference), 'break_glass_operator',
    'SYSTEM_ADMIN_BREAK_GLASS_RECOVERY', 'profiles', p_target_profile_id::text,
    jsonb_build_object('previous_admin_id', v_current_admin_id, 'approval_reference', trim(p_approval_reference)),
    jsonb_build_object('new_admin_id', p_target_profile_id, 'new_admin_name', v_target_name));
  RETURN jsonb_build_object('previous_admin_id', v_current_admin_id, 'new_admin_id', p_target_profile_id,
    'approval_reference', trim(p_approval_reference));
END;
$$;
REVOKE ALL ON FUNCTION public.system_admin_break_glass_recovery(uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_general_secretariat(
  p_profile_id uuid,
  p_permission_ids text[],
  p_enabled boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
  v_name text;
  v_was_enabled boolean := false;
  v_old text[];
  v_new text[];
  v_allowed constant text[] := ARRAY['MANAGE_LECTURES','MANAGE_CURRICULUM','MANAGE_MARATHON','GRADE_EXAMS','MANAGE_BOOKS'];
BEGIN
  PERFORM public.system_admin_assert_current();
  PERFORM 1 FROM public.profiles WHERE id = p_profile_id FOR UPDATE;
  SELECT role_id, full_name INTO v_role, v_name FROM public.profiles
  WHERE id = p_profile_id AND is_active = true AND deleted_at IS NULL;
  IF NOT FOUND OR v_role NOT IN ('admin','supervisor','servant','secretariat') THEN
    RAISE EXCEPTION 'Target must be an active staff profile' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(bool_or(is_active), false) INTO v_was_enabled
  FROM public.general_secretariat_members WHERE profile_id = p_profile_id;
  SELECT COALESCE(array_agg(permission_id ORDER BY permission_id), ARRAY[]::text[])
  INTO v_old FROM public.general_secretariat_permissions WHERE profile_id = p_profile_id;
  v_new := ARRAY(SELECT DISTINCT x FROM unnest(COALESCE(p_permission_ids, ARRAY[]::text[])) x ORDER BY x);
  IF EXISTS (SELECT 1 FROM unnest(v_new) x WHERE NOT (x = ANY(v_allowed))) THEN
    RAISE EXCEPTION 'Permission is outside the operational allowlist' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_new) x WHERE NOT EXISTS (SELECT 1 FROM public.permissions p WHERE p.id = x)) THEN
    RAISE EXCEPTION 'Requested permission is not present in the permission catalog' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.general_secretariat_members(profile_id, appointed_by, is_active)
  VALUES (p_profile_id, auth.uid(), p_enabled)
  ON CONFLICT (profile_id) DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = now();

  DELETE FROM public.general_secretariat_permissions WHERE profile_id = p_profile_id;
  IF p_enabled THEN
    INSERT INTO public.general_secretariat_permissions(profile_id, permission_id, granted_by)
    SELECT p_profile_id, x, auth.uid() FROM unnest(v_new) x;
  END IF;

  INSERT INTO public.audit_logs(actor_id, actor_name, actor_role, action, entity_type, entity_id, old_values, new_values)
  VALUES (auth.uid(), (SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'admin',
    'GENERAL_SECRETARIAT_UPDATE', 'profiles', p_profile_id::text,
    jsonb_build_object('enabled', v_was_enabled, 'permissions', v_old),
    jsonb_build_object('enabled', p_enabled, 'permissions', CASE WHEN p_enabled THEN v_new ELSE ARRAY[]::text[] END));

  RETURN jsonb_build_object('profile_id', p_profile_id, 'full_name', v_name, 'enabled', p_enabled,
    'permissions', CASE WHEN p_enabled THEN to_jsonb(v_new) ELSE '[]'::jsonb END);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_general_secretariat(uuid, text[], boolean) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_general_secretariat(uuid, text[], boolean) TO authenticated;

-- Restore is a privileged, trigger-suspending operation. Sanitize role data in
-- this wrapper so an archive can neither remove nor transfer the live admin.
CREATE OR REPLACE FUNCTION public.system_reset_guarded_restore_database(
  p_tables jsonb,
  p_truncate boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_current_admin_id uuid;
  v_current_admin jsonb;
  v_tables jsonb := p_tables;
  v_profile_rows jsonb;
BEGIN
  PERFORM public.system_reset_acquire_write_lock();
  SELECT p.id, to_jsonb(p) INTO v_current_admin_id, v_current_admin
  FROM public.profiles p
  WHERE p.role_id = 'admin' AND p.is_active = true AND p.deleted_at IS NULL
  FOR UPDATE;
  IF v_current_admin_id IS NULL OR
     (SELECT count(*) FROM public.profiles WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL) <> 1 THEN
    RAISE EXCEPTION 'restore requires exactly one current system administrator'
      USING ERRCODE = '42501';
  END IF;

  IF v_tables ? 'profiles' THEN
    IF jsonb_typeof(v_tables->'profiles') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'profiles restore data must be a JSON array' USING ERRCODE = '22023';
    END IF;
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN row_data->>'id' = v_current_admin_id::text THEN v_current_admin
        WHEN lower(COALESCE(row_data->>'role_id','')) IN ('admin','super_user')
          THEN jsonb_set(row_data, '{role_id}', '"supervisor"'::jsonb, true)
        ELSE row_data
      END
    ), '[]'::jsonb)
    INTO v_profile_rows
    FROM jsonb_array_elements(v_tables->'profiles') AS item(row_data);
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_profile_rows) AS item(row_data)
                   WHERE row_data->>'id' = v_current_admin_id::text) THEN
      v_profile_rows := v_profile_rows || jsonb_build_array(v_current_admin);
    END IF;
    v_tables := jsonb_set(v_tables, '{profiles}', v_profile_rows, true);
  ELSIF p_truncate THEN
    RAISE EXCEPTION 'truncate restore must include profiles to preserve the system administrator'
      USING ERRCODE = '22023';
  END IF;

  RETURN public.restore_database(v_tables, p_truncate);
END;
$$;
REVOKE ALL ON FUNCTION public.system_reset_guarded_restore_database(jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_reset_guarded_restore_database(jsonb, boolean) TO service_role;

-- Only the system admin may use raw role-management/profile-management paths.
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;
CREATE POLICY "System admin can manage profiles" ON public.profiles
FOR ALL TO authenticated USING (public.is_system_admin()) WITH CHECK (public.is_system_admin());
DROP POLICY IF EXISTS "Manage servant permissions" ON public.servant_permissions;
DROP POLICY IF EXISTS "System admin manage servant permissions" ON public.servant_permissions;
CREATE POLICY "System admin manage servant permissions" ON public.servant_permissions
FOR ALL TO authenticated USING (public.is_system_admin()) WITH CHECK (public.is_system_admin());

-- The reset barrier is table-specific; protect the new appointment tables too.
DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['general_secretariat_members','general_secretariat_permissions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS system_reset_write_barrier ON public.%I', v_table);
    EXECUTE format('CREATE TRIGGER system_reset_write_barrier BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.system_reset_write_barrier()', v_table);
    EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER system_reset_write_barrier', v_table);
    EXECUTE format('DROP POLICY IF EXISTS system_reset_write_guard_insert ON public.%I', v_table);
    EXECUTE format('DROP POLICY IF EXISTS system_reset_write_guard_update ON public.%I', v_table);
    EXECUTE format('DROP POLICY IF EXISTS system_reset_write_guard_delete ON public.%I', v_table);
    EXECUTE format('CREATE POLICY system_reset_write_guard_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.system_reset_writes_allowed())', v_table);
    EXECUTE format('CREATE POLICY system_reset_write_guard_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.system_reset_writes_allowed()) WITH CHECK (public.system_reset_writes_allowed())', v_table);
    EXECUTE format('CREATE POLICY system_reset_write_guard_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.system_reset_writes_allowed())', v_table);
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE role_id = 'admin' AND is_active = true AND deleted_at IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Migration requires exactly one active system administrator';
  END IF;
  IF EXISTS (SELECT 1 FROM public.general_secretariat_permissions gp
    WHERE gp.permission_id NOT IN ('MANAGE_LECTURES','MANAGE_CURRICULUM','MANAGE_MARATHON','GRADE_EXAMS','MANAGE_BOOKS')) THEN
    RAISE EXCEPTION 'Unexpected non-operational general-secretariat permission exists';
  END IF;
END;
$$;

COMMIT;
