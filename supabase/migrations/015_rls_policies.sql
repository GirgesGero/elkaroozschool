-- 015_rls_policies.sql
-- Row Level Security (RLS) Helper Functions and Policies

-- 1. Helper Security Functions
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR AS $$
    SELECT role_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_group()
RETURNS SMALLINT AS $$
    SELECT group_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_user()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role_id IN ('admin', 'super_user') 
          AND deleted_at IS NULL
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_servant_permission(perm_id VARCHAR)
RETURNS BOOLEAN AS $$
    SELECT public.is_admin_or_super_user() OR EXISTS (
        SELECT 1 FROM public.servant_permissions
        WHERE profile_id = auth.uid() AND permission_id = perm_id
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_secretariat_of_group(target_group SMALLINT)
RETURNS BOOLEAN AS $$
    SELECT public.is_admin_or_super_user() OR EXISTS (
        SELECT 1 FROM public.group_secretariat
        WHERE profile_id = auth.uid() AND group_id = target_group AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Enable RLS on all tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servant_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_secretariat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marathon_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marathon_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marathon_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marathon_trainee_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marathon_trainee_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_verse_dispatch_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.researches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp3_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_testaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_verse_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_commentaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_word_commentaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- 3. Bible Policies (Public Read for Everyone)
CREATE POLICY "Public read for bible_testaments" ON public.bible_testaments FOR SELECT USING (true);
CREATE POLICY "Public read for bible_books" ON public.bible_books FOR SELECT USING (true);
CREATE POLICY "Public read for bible_chapters" ON public.bible_chapters FOR SELECT USING (true);
CREATE POLICY "Public read for bible_verses" ON public.bible_verses FOR SELECT USING (true);
CREATE POLICY "Public read for bible_verse_words" ON public.bible_verse_words FOR SELECT USING (true);
CREATE POLICY "Public read for bible_sources" ON public.bible_sources FOR SELECT USING (true);
CREATE POLICY "Public read for bible_commentaries" ON public.bible_commentaries FOR SELECT USING (true);
CREATE POLICY "Public read for bible_word_commentaries" ON public.bible_word_commentaries FOR SELECT USING (true);

-- 4. Static / Lookup Tables
CREATE POLICY "Public read for roles" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Public read for groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Public read for permissions" ON public.permissions FOR SELECT USING (true);

-- 5. Profiles Policies
CREATE POLICY "Authenticated users can read profiles" ON public.profiles FOR SELECT TO authenticated USING (deleted_at IS NULL OR public.is_admin_or_super_user());
CREATE POLICY "Users can update own basic profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin_or_super_user());
CREATE POLICY "Admin can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin_or_super_user());

-- 6. Academic (Terms, Lectures, Curriculums) with Group Scope
CREATE POLICY "Read terms in same group or admin" ON public.terms FOR SELECT TO authenticated USING (group_id = public.get_current_user_group() OR public.is_admin_or_super_user());
CREATE POLICY "Manage terms with permission" ON public.terms FOR ALL TO authenticated USING (public.has_servant_permission('MANAGE_CURRICULUM') AND (group_id = public.get_current_user_group() OR public.is_admin_or_super_user()));

CREATE POLICY "Read lectures in same group or admin" ON public.lectures FOR SELECT TO authenticated USING ((group_id = public.get_current_user_group() OR public.is_admin_or_super_user()) AND (deleted_at IS NULL OR public.is_admin_or_super_user()));
CREATE POLICY "Manage lectures with permission" ON public.lectures FOR ALL TO authenticated USING (public.has_servant_permission('MANAGE_LECTURES') AND (group_id = public.get_current_user_group() OR public.is_admin_or_super_user()));

CREATE POLICY "Read curriculums in same group or admin" ON public.curriculums FOR SELECT TO authenticated USING ((group_id = public.get_current_user_group() OR public.is_admin_or_super_user()) AND (deleted_at IS NULL OR public.is_admin_or_super_user()));
CREATE POLICY "Manage curriculums with permission" ON public.curriculums FOR ALL TO authenticated USING (public.has_servant_permission('MANAGE_CURRICULUM') AND (group_id = public.get_current_user_group() OR public.is_admin_or_super_user()));

-- 7. Attendance Policies (Secretariat Scope)
CREATE POLICY "Read attendance in same group" ON public.attendance_sessions FOR SELECT TO authenticated USING (group_id = public.get_current_user_group() OR public.is_admin_or_super_user());
CREATE POLICY "Secretariat manage attendance sessions" ON public.attendance_sessions FOR ALL TO authenticated USING (public.is_secretariat_of_group(group_id));

CREATE POLICY "Read attendance records in same group" ON public.attendance_records FOR SELECT TO authenticated USING ((trainee_id = auth.uid()) OR (group_id = public.get_current_user_group() AND public.get_current_user_role() IN ('servant', 'secretariat', 'admin', 'super_user')));
CREATE POLICY "Secretariat record attendance" ON public.attendance_records FOR ALL TO authenticated USING (public.is_secretariat_of_group(group_id));

-- 8. Exams & Grades Policies
CREATE POLICY "Read exams in same group" ON public.exams FOR SELECT TO authenticated USING (group_id = public.get_current_user_group() OR public.is_admin_or_super_user());
CREATE POLICY "Admin manage exams" ON public.exams FOR ALL TO authenticated USING (public.is_admin_or_super_user());

CREATE POLICY "Read exam grades" ON public.exam_grades FOR SELECT TO authenticated USING ((trainee_id = auth.uid()) OR (group_id = public.get_current_user_group() AND public.get_current_user_role() IN ('servant', 'secretariat', 'admin', 'super_user')));
CREATE POLICY "Servant with GRADE_EXAMS manage grades" ON public.exam_grades FOR ALL TO authenticated USING (public.has_servant_permission('GRADE_EXAMS') AND (group_id = public.get_current_user_group() OR public.is_admin_or_super_user()));

-- 9. Marathons Policies
CREATE POLICY "Read marathons in same group" ON public.marathons FOR SELECT TO authenticated USING (group_id = public.get_current_user_group() OR public.is_admin_or_super_user());
CREATE POLICY "Manage marathons with permission" ON public.marathons FOR ALL TO authenticated USING (public.has_servant_permission('MANAGE_MARATHON') AND (group_id = public.get_current_user_group() OR public.is_admin_or_super_user()));

CREATE POLICY "Read marathon questions" ON public.marathon_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage marathon questions" ON public.marathon_questions FOR ALL TO authenticated USING (public.has_servant_permission('MANAGE_MARATHON'));

CREATE POLICY "Read marathon answers" ON public.marathon_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage marathon answers" ON public.marathon_answers FOR ALL TO authenticated USING (public.has_servant_permission('MANAGE_MARATHON'));

CREATE POLICY "Trainee manage own marathon submission" ON public.marathon_trainee_submissions FOR ALL TO authenticated USING (trainee_id = auth.uid() OR public.is_admin_or_super_user() OR public.has_servant_permission('MANAGE_MARATHON'));
CREATE POLICY "Trainee manage own marathon answers" ON public.marathon_trainee_answers FOR ALL TO authenticated USING (true);

-- 10. Feed Policies
CREATE POLICY "Read feed posts" ON public.feed_posts FOR SELECT TO authenticated USING (deleted_at IS NULL OR public.is_admin_or_super_user());
CREATE POLICY "Create feed posts (Staff only, not Trainees)" ON public.feed_posts FOR INSERT TO authenticated WITH CHECK (public.get_current_user_role() IN ('admin', 'super_user', 'servant', 'secretariat'));
CREATE POLICY "Edit own feed post" ON public.feed_posts FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.is_admin_or_super_user());
CREATE POLICY "Delete own feed post" ON public.feed_posts FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_admin_or_super_user());

CREATE POLICY "Read post comments" ON public.post_comments FOR SELECT TO authenticated USING (deleted_at IS NULL OR public.is_admin_or_super_user());
CREATE POLICY "Insert post comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update own comment" ON public.post_comments FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.is_admin_or_super_user());
CREATE POLICY "Delete own comment" ON public.post_comments FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_admin_or_super_user());

CREATE POLICY "Manage reactions" ON public.reactions FOR ALL TO authenticated USING (user_id = auth.uid());

-- 11. Notifications Policies
CREATE POLICY "Read own notifications" ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Update own notifications (read status)" ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Manage own push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated USING (profile_id = auth.uid());

-- 12. Library, MP3, Gallery & Favorites Policies
CREATE POLICY "Read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read books in same group" ON public.books FOR SELECT TO authenticated USING ((group_id = public.get_current_user_group() OR public.is_admin_or_super_user()) AND (deleted_at IS NULL OR public.is_admin_or_super_user()));
CREATE POLICY "Manage books with permission" ON public.books FOR ALL TO authenticated USING (public.has_servant_permission('MANAGE_BOOKS') AND (group_id = public.get_current_user_group() OR public.is_admin_or_super_user()));

CREATE POLICY "Read researches in same group" ON public.researches FOR SELECT TO authenticated USING ((group_id = public.get_current_user_group() OR public.is_admin_or_super_user()) AND (deleted_at IS NULL OR public.is_admin_or_super_user()));
CREATE POLICY "Manage researches with permission" ON public.researches FOR ALL TO authenticated USING (public.has_servant_permission('MANAGE_BOOKS') AND (group_id = public.get_current_user_group() OR public.is_admin_or_super_user()));

CREATE POLICY "Read gallery albums" ON public.gallery_albums FOR SELECT TO authenticated USING (deleted_at IS NULL OR public.is_admin_or_super_user());
CREATE POLICY "Read gallery items" ON public.gallery_items FOR SELECT TO authenticated USING (deleted_at IS NULL OR public.is_admin_or_super_user());
CREATE POLICY "Read mp3 tracks in same group" ON public.mp3_tracks FOR SELECT TO authenticated USING ((group_id = public.get_current_user_group() OR public.is_admin_or_super_user()) AND (deleted_at IS NULL OR public.is_admin_or_super_user()));
CREATE POLICY "Manage user favorites" ON public.user_favorites FOR ALL TO authenticated USING (user_id = auth.uid());

-- 13. Audit & System Management (Admin & Super User Only)
CREATE POLICY "Admin read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin_or_super_user());
CREATE POLICY "Admin manage backup_records" ON public.backup_records FOR ALL TO authenticated USING (public.is_admin_or_super_user());
CREATE POLICY "Admin manage import_history" ON public.import_history FOR ALL TO authenticated USING (public.is_admin_or_super_user());
