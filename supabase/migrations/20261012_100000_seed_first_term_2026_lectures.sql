-- =============================================================================
-- Migration: 20261012_100000_seed_first_term_2026_lectures.sql
-- Description: Seed First Semester 2026 Lectures for Groups 1, 2, and 3
-- Target Tables: lecturers, terms, lectures, curriculum_days, curriculum_entries, attendance_sessions
-- =============================================================================

BEGIN;

-- 1. Insert or ensure all Lecturers exist
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'أبانوب إبراهيم', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'أبانوب إبراهيم' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'إدارة المدرسة', 'الخادم المسؤول', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'إدارة المدرسة' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'بطرس جميل', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'بطرس جميل' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'بيتر محب', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'بيتر محب' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'بيشوي أنور', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'بيشوي أنور' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'جون إبراهيم', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'جون إبراهيم' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'حسام كمال', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'حسام كمال' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'عماد رمزي', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'عماد رمزي' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'عماد يوسف', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'عماد يوسف' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'ف. أنيانوس', 'القمص / القس', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'ف. أنيانوس' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'ف. بشارة القس', 'القمص / القس', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'ف. بشارة القس' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'ف. بفنوتيوس', 'القمص / القس', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'ف. بفنوتيوس' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'ف. جبرائيل', 'القمص / القس', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'ف. جبرائيل' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'ف. زكريا', 'القمص / القس', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'ف. زكريا' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'ف. سليمان ألكسان', 'القمص / القس', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'ف. سليمان ألكسان' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'ف. فيلبس', 'القمص / القس', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'ف. فيلبس' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'ف. منسى', 'القمص / القس', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'ف. منسى' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'ف. موريس', 'القمص / القس', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'ف. موريس' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'ف. نوفير', 'القمص / القس', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'ف. نوفير' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'ف. يحنس', 'القمص / القس', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'ف. يحنس' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'م. كارين ميشيل', 'المهندسة', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'م. كارين ميشيل' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'م. ميرا', 'المهندسة', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'م. ميرا' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'مارتينا', 'الأستاذة', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'مارتينا' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'مايكل منير', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'مايكل منير' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'مريم عطالله', 'المهندسة', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'مريم عطالله' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'مينا رمزي', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'مينا رمزي' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'هيثم سمير', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'هيثم سمير' AND deleted_at IS NULL);
INSERT INTO public.lecturers (id, full_name, title, created_at)
SELECT gen_random_uuid(), 'وجدي وديع', 'الأستاذ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.lecturers WHERE full_name = 'وجدي وديع' AND deleted_at IS NULL);

-- 2. Ensure Academic Terms exist for First Semester 2026-2027 (Groups 1, 2, 3)
INSERT INTO public.terms (id, group_id, name_ar, academic_year, is_current, created_at)
SELECT gen_random_uuid(), 1, 'الترم الأول', '2026-2027', true, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.terms WHERE group_id = 1 AND academic_year = '2026-2027' AND name_ar = 'الترم الأول' AND deleted_at IS NULL
);
INSERT INTO public.terms (id, group_id, name_ar, academic_year, is_current, created_at)
SELECT gen_random_uuid(), 2, 'الترم الأول', '2026-2027', true, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.terms WHERE group_id = 2 AND academic_year = '2026-2027' AND name_ar = 'الترم الأول' AND deleted_at IS NULL
);
INSERT INTO public.terms (id, group_id, name_ar, academic_year, is_current, created_at)
SELECT gen_random_uuid(), 3, 'الترم الأول', '2026-2027', true, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.terms WHERE group_id = 3 AND academic_year = '2026-2027' AND name_ar = 'الترم الأول' AND deleted_at IS NULL
);

-- 3. Insert Lectures, Curriculum Days & Entries, and Attendance Sessions
DO $$
DECLARE
    v_admin_id UUID;
    v_term_id_1 UUID;
    v_term_id_2 UUID;
    v_term_id_3 UUID;
    v_lecturer_id UUID;
    v_day_id UUID;
    v_lecture_id UUID;
BEGIN
    -- Resolve an admin/system profile ID for created_by constraints
    SELECT id INTO v_admin_id FROM public.profiles WHERE role_id IN ('admin', 'super_user') AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id FROM public.profiles WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1;
    END IF;

    -- Retrieve Term IDs
    SELECT id INTO v_term_id_1 FROM public.terms WHERE group_id = 1 AND academic_year = '2026-2027' AND name_ar = 'الترم الأول' AND deleted_at IS NULL LIMIT 1;
    SELECT id INTO v_term_id_2 FROM public.terms WHERE group_id = 2 AND academic_year = '2026-2027' AND name_ar = 'الترم الأول' AND deleted_at IS NULL LIMIT 1;
    SELECT id INTO v_term_id_3 FROM public.terms WHERE group_id = 3 AND academic_year = '2026-2027' AND name_ar = 'الترم الأول' AND deleted_at IS NULL LIMIT 1;

    -- =================== الجمعة 18 سبتمبر 2026 (2026-09-18) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-09-18', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-09-18', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-09-18', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 1
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-09-18' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 1, 'الجمعة 18 سبتمبر 2026', '2026-09-18', 'PUBLISHED', 1, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. موريس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'مقدمة الكتاب', 'المحاضر: القمص / القس ف. موريس', '2026-09-18', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'مقدمة الكتاب', 'المحاضر: القمص / القس ف. موريس', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. موريس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. زكريا' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'المهارات العشرة', 'المحاضر: القمص / القس ف. زكريا', '2026-09-18', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'المهارات العشرة', 'المحاضر: القمص / القس ف. زكريا', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. زكريا', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 1
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-09-18' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 1, 'الجمعة 18 سبتمبر 2026', '2026-09-18', 'PUBLISHED', 1, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'عماد يوسف' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'مقدمة الأسفار التاريخية', 'المحاضر: الأستاذ عماد يوسف', '2026-09-18', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'مقدمة الأسفار التاريخية', 'المحاضر: الأستاذ عماد يوسف', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'عماد يوسف', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'حسام كمال' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'يشوع', 'المحاضر: الأستاذ حسام كمال', '2026-09-18', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'يشوع', 'المحاضر: الأستاذ حسام كمال', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'حسام كمال', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 1
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-09-18' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 1, 'الجمعة 18 سبتمبر 2026', '2026-09-18', 'PUBLISHED', 1, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'مريم عطالله' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'الانبياء والنبوة', 'المحاضر: المهندسة مريم عطالله', '2026-09-18', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'الانبياء والنبوة', 'المحاضر: المهندسة مريم عطالله', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'مريم عطالله', 'lecturer_title', 'المهندسة'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. موريس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'اشعياء', 'المحاضر: القمص / القس ف. موريس', '2026-09-18', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'اشعياء', 'المحاضر: القمص / القس ف. موريس', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. موريس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    -- =================== الجمعة 25 سبتمبر 2026 (2026-09-25) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-09-25', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-09-25', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-09-25', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 2
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-09-25' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 2, 'الجمعة 25 سبتمبر 2026', '2026-09-25', 'PUBLISHED', 2, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'عماد رمزي' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'الخلفيات العشرة', 'المحاضر: الأستاذ عماد رمزي', '2026-09-25', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'الخلفيات العشرة', 'المحاضر: الأستاذ عماد رمزي', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'عماد رمزي', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. موريس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'الوحي الإلهي', 'المحاضر: القمص / القس ف. موريس', '2026-09-25', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'الوحي الإلهي', 'المحاضر: القمص / القس ف. موريس', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. موريس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 2
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-09-25' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 2, 'الجمعة 25 سبتمبر 2026', '2026-09-25', 'PUBLISHED', 2, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'عماد يوسف' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'القضاة', 'المحاضر: الأستاذ عماد يوسف', '2026-09-25', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'القضاة', 'المحاضر: الأستاذ عماد يوسف', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'عماد يوسف', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'هيثم سمير' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'راعوث', 'المحاضر: الأستاذ هيثم سمير', '2026-09-25', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'راعوث', 'المحاضر: الأستاذ هيثم سمير', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'هيثم سمير', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 2
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-09-25' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 2, 'الجمعة 25 سبتمبر 2026', '2026-09-25', 'PUBLISHED', 2, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'حسام كمال' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'ارميا ومراثي', 'المحاضر: الأستاذ حسام كمال', '2026-09-25', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'ارميا ومراثي', 'المحاضر: الأستاذ حسام كمال', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'حسام كمال', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. جبرائيل' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'حزقيال', 'المحاضر: القمص / القس ف. جبرائيل', '2026-09-25', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'حزقيال', 'المحاضر: القمص / القس ف. جبرائيل', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. جبرائيل', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    -- =================== الجمعة 2 أكتوبر 2026 (2026-10-02) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-10-02', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-10-02', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-10-02', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 3
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-10-02' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 3, 'الجمعة 2 أكتوبر 2026', '2026-10-02', 'PUBLISHED', 3, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'بطرس جميل' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'استحالة التحريف', 'المحاضر: الأستاذ بطرس جميل', '2026-10-02', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'استحالة التحريف', 'المحاضر: الأستاذ بطرس جميل', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'بطرس جميل', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'عماد يوسف' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'نظرة عامة العهد القديم', 'المحاضر: الأستاذ عماد يوسف', '2026-10-02', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'نظرة عامة العهد القديم', 'المحاضر: الأستاذ عماد يوسف', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'عماد يوسف', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 3
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-10-02' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 3, 'الجمعة 2 أكتوبر 2026', '2026-10-02', 'PUBLISHED', 3, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'عماد رمزي' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'صموئيل النبي', 'المحاضر: الأستاذ عماد رمزي', '2026-10-02', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'صموئيل النبي', 'المحاضر: الأستاذ عماد رمزي', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'عماد رمزي', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'بطرس جميل' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'داود النبي', 'المحاضر: الأستاذ بطرس جميل', '2026-10-02', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'داود النبي', 'المحاضر: الأستاذ بطرس جميل', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'بطرس جميل', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 3
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-10-02' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 3, 'الجمعة 2 أكتوبر 2026', '2026-10-02', 'PUBLISHED', 3, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'عماد يوسف' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'دانيال', 'المحاضر: الأستاذ عماد يوسف', '2026-10-02', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'دانيال', 'المحاضر: الأستاذ عماد يوسف', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'عماد يوسف', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'وجدي وديع' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'هوشع', 'المحاضر: الأستاذ وجدي وديع', '2026-10-02', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'هوشع', 'المحاضر: الأستاذ وجدي وديع', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'وجدي وديع', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- =================== الجمعة 9 أكتوبر 2026 (2026-10-09) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-10-09', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-10-09', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-10-09', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 4
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-10-09' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 4, 'الجمعة 9 أكتوبر 2026', '2026-10-09', 'PUBLISHED', 4, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'عماد يوسف' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'مقدمة أسفار موسى', 'المحاضر: الأستاذ عماد يوسف', '2026-10-09', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'مقدمة أسفار موسى', 'المحاضر: الأستاذ عماد يوسف', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'عماد يوسف', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. يحنس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'الذبائح', 'المحاضر: القمص / القس ف. يحنس', '2026-10-09', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'الذبائح', 'المحاضر: القمص / القس ف. يحنس', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. يحنس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 4
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-10-09' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 4, 'الجمعة 9 أكتوبر 2026', '2026-10-09', 'PUBLISHED', 4, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. منسى' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'سليمان والهيكل', 'المحاضر: القمص / القس ف. منسى', '2026-10-09', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'سليمان والهيكل', 'المحاضر: القمص / القس ف. منسى', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. منسى', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'جون إبراهيم' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'انقسام المملكة', 'المحاضر: الأستاذ جون إبراهيم', '2026-10-09', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'انقسام المملكة', 'المحاضر: الأستاذ جون إبراهيم', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'جون إبراهيم', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 4
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-10-09' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 4, 'الجمعة 9 أكتوبر 2026', '2026-10-09', 'PUBLISHED', 4, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'أبانوب إبراهيم' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'يوئيل', 'المحاضر: الأستاذ أبانوب إبراهيم', '2026-10-09', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'يوئيل', 'المحاضر: الأستاذ أبانوب إبراهيم', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'أبانوب إبراهيم', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. يحنس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'عاموس وعوبديا', 'المحاضر: القمص / القس ف. يحنس', '2026-10-09', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'عاموس وعوبديا', 'المحاضر: القمص / القس ف. يحنس', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. يحنس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    -- =================== الجمعة 16 أكتوبر 2026 (2026-10-16) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-10-16', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-10-16', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-10-16', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 5
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-10-16' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 5, 'الجمعة 16 أكتوبر 2026', '2026-10-16', 'PUBLISHED', 5, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'عماد يوسف' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'الخليقة والسقوط', 'المحاضر: الأستاذ عماد يوسف', '2026-10-16', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'الخليقة والسقوط', 'المحاضر: الأستاذ عماد يوسف', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'عماد يوسف', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'عماد يوسف' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'إبراهيم وإسحاق', 'المحاضر: الأستاذ عماد يوسف', '2026-10-16', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'إبراهيم وإسحاق', 'المحاضر: الأستاذ عماد يوسف', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'عماد يوسف', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 5
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-10-16' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 5, 'الجمعة 16 أكتوبر 2026', '2026-10-16', 'PUBLISHED', 5, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. بفنوتيوس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'عزرا', 'المحاضر: القمص / القس ف. بفنوتيوس', '2026-10-16', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'عزرا', 'المحاضر: القمص / القس ف. بفنوتيوس', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. بفنوتيوس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'وجدي وديع' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'نحميا', 'المحاضر: الأستاذ وجدي وديع', '2026-10-16', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'نحميا', 'المحاضر: الأستاذ وجدي وديع', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'وجدي وديع', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 5
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-10-16' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 5, 'الجمعة 16 أكتوبر 2026', '2026-10-16', 'PUBLISHED', 5, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'وجدي وديع' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'يونان', 'المحاضر: الأستاذ وجدي وديع', '2026-10-16', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'يونان', 'المحاضر: الأستاذ وجدي وديع', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'وجدي وديع', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. بفنوتيوس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'ميخا', 'المحاضر: القمص / القس ف. بفنوتيوس', '2026-10-16', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'ميخا', 'المحاضر: القمص / القس ف. بفنوتيوس', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. بفنوتيوس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    -- =================== الجمعة 23 أكتوبر 2026 (2026-10-23) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-10-23', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-10-23', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-10-23', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 6
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-10-23' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 6, 'الجمعة 23 أكتوبر 2026', '2026-10-23', 'PUBLISHED', 6, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'بيشوي أنور' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'يعقوب ويوسف', 'المحاضر: الأستاذ بيشوي أنور', '2026-10-23', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'يعقوب ويوسف', 'المحاضر: الأستاذ بيشوي أنور', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'بيشوي أنور', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'م. ميرا' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'يوناني', 'المحاضر: المهندسة م. ميرا', '2026-10-23', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'يوناني', 'المحاضر: المهندسة م. ميرا', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'م. ميرا', 'lecturer_title', 'المهندسة'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 6
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-10-23' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 6, 'الجمعة 23 أكتوبر 2026', '2026-10-23', 'PUBLISHED', 6, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. زكريا' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'أستير', 'المحاضر: القمص / القس ف. زكريا', '2026-10-23', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'أستير', 'المحاضر: القمص / القس ف. زكريا', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. زكريا', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'م. كارين ميشيل' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'أيوب', 'المحاضر: المهندسة م. كارين ميشيل', '2026-10-23', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'أيوب', 'المحاضر: المهندسة م. كارين ميشيل', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'م. كارين ميشيل', 'lecturer_title', 'المهندسة'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 6
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-10-23' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 6, 'الجمعة 23 أكتوبر 2026', '2026-10-23', 'PUBLISHED', 6, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'مينا رمزي' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'ناحوم', 'المحاضر: الأستاذ مينا رمزي', '2026-10-23', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'ناحوم', 'المحاضر: الأستاذ مينا رمزي', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'مينا رمزي', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. فيلبس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'سرياني', 'المحاضر: القمص / القس ف. فيلبس', '2026-10-23', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'سرياني', 'المحاضر: القمص / القس ف. فيلبس', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. فيلبس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    -- =================== الجمعة 30 أكتوبر 2026 (2026-10-30) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-10-30', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-10-30', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-10-30', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 7
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-10-30' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 7, 'الجمعة 30 أكتوبر 2026', '2026-10-30', 'PUBLISHED', 7, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'جون إبراهيم' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'موسى', 'المحاضر: الأستاذ جون إبراهيم', '2026-10-30', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'موسى', 'المحاضر: الأستاذ جون إبراهيم', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'جون إبراهيم', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'عماد يوسف' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'خيمة الاجتماع', 'المحاضر: الأستاذ عماد يوسف', '2026-10-30', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'خيمة الاجتماع', 'المحاضر: الأستاذ عماد يوسف', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'عماد يوسف', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 7
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-10-30' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 7, 'الجمعة 30 أكتوبر 2026', '2026-10-30', 'PUBLISHED', 7, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'حسام كمال' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'المزامير', 'المحاضر: الأستاذ حسام كمال', '2026-10-30', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'المزامير', 'المحاضر: الأستاذ حسام كمال', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'حسام كمال', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'هيثم سمير' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'الأمثال', 'المحاضر: الأستاذ هيثم سمير', '2026-10-30', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'الأمثال', 'المحاضر: الأستاذ هيثم سمير', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'هيثم سمير', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 7
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-10-30' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 7, 'الجمعة 30 أكتوبر 2026', '2026-10-30', 'PUBLISHED', 7, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'مينا رمزي' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'حبقوق', 'المحاضر: الأستاذ مينا رمزي', '2026-10-30', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'حبقوق', 'المحاضر: الأستاذ مينا رمزي', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'مينا رمزي', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'بيتر محب' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'صفنيا', 'المحاضر: الأستاذ بيتر محب', '2026-10-30', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'صفنيا', 'المحاضر: الأستاذ بيتر محب', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'بيتر محب', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- =================== الجمعة 13 نوفمبر 2026 (2026-11-13) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-11-13', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-11-13', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-11-13', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 8
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-11-13' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 8, 'الجمعة 13 نوفمبر 2026', '2026-11-13', 'PUBLISHED', 8, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. موريس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'يوناني', 'المحاضر: القمص / القس ف. موريس', '2026-11-13', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'يوناني', 'المحاضر: القمص / القس ف. موريس', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. موريس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. نوفير' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'جغرافيا كنعان', 'المحاضر: القمص / القس ف. نوفير', '2026-11-13', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'جغرافيا كنعان', 'المحاضر: القمص / القس ف. نوفير', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. نوفير', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 8
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-11-13' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 8, 'الجمعة 13 نوفمبر 2026', '2026-11-13', 'PUBLISHED', 8, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. نوفير' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'الجامعة', 'المحاضر: القمص / القس ف. نوفير', '2026-11-13', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'الجامعة', 'المحاضر: القمص / القس ف. نوفير', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. نوفير', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'مارتينا' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'عبري', 'المحاضر: الأستاذة مارتينا', '2026-11-13', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'عبري', 'المحاضر: الأستاذة مارتينا', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'مارتينا', 'lecturer_title', 'الأستاذة'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 8
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-11-13' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 8, 'الجمعة 13 نوفمبر 2026', '2026-11-13', 'PUBLISHED', 8, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. فيلبس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'سرياني (المحاضرة الأولى)', 'المحاضر: القمص / القس ف. فيلبس', '2026-11-13', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'سرياني (المحاضرة الأولى)', 'المحاضر: القمص / القس ف. فيلبس', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. فيلبس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. فيلبس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'سرياني (المحاضرة الثانية)', 'المحاضر: القمص / القس ف. فيلبس', '2026-11-13', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'سرياني (المحاضرة الثانية)', 'المحاضر: القمص / القس ف. فيلبس', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. فيلبس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    -- =================== الجمعة 20 نوفمبر 2026 (2026-11-20) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-11-20', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-11-20', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-11-20', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 9
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-11-20' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 9, 'الجمعة 20 نوفمبر 2026', '2026-11-20', 'PUBLISHED', 9, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. بشارة القس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'الأعياد', 'المحاضر: القمص / القس ف. بشارة القس', '2026-11-20', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'الأعياد', 'المحاضر: القمص / القس ف. بشارة القس', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. بشارة القس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'م. ميرا' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'الكهنوت', 'المحاضر: المهندسة م. ميرا', '2026-11-20', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'الكهنوت', 'المحاضر: المهندسة م. ميرا', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'م. ميرا', 'lecturer_title', 'المهندسة'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 9
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-11-20' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 9, 'الجمعة 20 نوفمبر 2026', '2026-11-20', 'PUBLISHED', 9, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. أنيانوس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'نشيد الإنشاد', 'المحاضر: القمص / القس ف. أنيانوس', '2026-11-20', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'نشيد الإنشاد', 'المحاضر: القمص / القس ف. أنيانوس', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. أنيانوس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'مارتينا' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'عبري', 'المحاضر: الأستاذة مارتينا', '2026-11-20', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'عبري', 'المحاضر: الأستاذة مارتينا', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'مارتينا', 'lecturer_title', 'الأستاذة'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 9
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-11-20' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 9, 'الجمعة 20 نوفمبر 2026', '2026-11-20', 'PUBLISHED', 9, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'إدارة المدرسة' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'حجي', 'المحاضر: الخادم المسؤول إدارة المدرسة', '2026-11-20', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'حجي', 'المحاضر: الخادم المسؤول إدارة المدرسة', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'إدارة المدرسة', 'lecturer_title', 'الخادم المسؤول'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'هيثم سمير' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'زكريا', 'المحاضر: الأستاذ هيثم سمير', '2026-11-20', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'زكريا', 'المحاضر: الأستاذ هيثم سمير', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'هيثم سمير', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- =================== الجمعة 27 نوفمبر 2026 (2026-11-27) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-11-27', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-11-27', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-11-27', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 10
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-11-27' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 10, 'الجمعة 27 نوفمبر 2026', '2026-11-27', 'PUBLISHED', 10, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. سليمان ألكسان' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'الناموس', 'المحاضر: القمص / القس ف. سليمان ألكسان', '2026-11-27', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'الناموس', 'المحاضر: القمص / القس ف. سليمان ألكسان', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. سليمان ألكسان', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'حسام كمال' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'الفكر المسياني', 'المحاضر: الأستاذ حسام كمال', '2026-11-27', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'الفكر المسياني', 'المحاضر: الأستاذ حسام كمال', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'حسام كمال', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 10
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-11-27' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 10, 'الجمعة 27 نوفمبر 2026', '2026-11-27', 'PUBLISHED', 10, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. منسى' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'الفكر المسياني تاريخي وشعري', 'المحاضر: القمص / القس ف. منسى', '2026-11-27', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'الفكر المسياني تاريخي وشعري', 'المحاضر: القمص / القس ف. منسى', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. منسى', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'مايكل منير' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'شبهات وهمية', 'المحاضر: الأستاذ مايكل منير', '2026-11-27', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'شبهات وهمية', 'المحاضر: الأستاذ مايكل منير', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'مايكل منير', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 10
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-11-27' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 10, 'الجمعة 27 نوفمبر 2026', '2026-11-27', 'PUBLISHED', 10, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. بشارة القس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'ملاخي', 'المحاضر: القمص / القس ف. بشارة القس', '2026-11-27', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'ملاخي', 'المحاضر: القمص / القس ف. بشارة القس', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. بشارة القس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. سليمان ألكسان' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'الفكر المسياني أسفار الأنبياء', 'المحاضر: القمص / القس ف. سليمان ألكسان', '2026-11-27', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'الفكر المسياني أسفار الأنبياء', 'المحاضر: القمص / القس ف. سليمان ألكسان', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. سليمان ألكسان', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    -- =================== الجمعة 4 ديسمبر 2026 (2026-12-04) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-12-04', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-12-04', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-12-04', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 11
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-12-04' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 11, 'الجمعة 4 ديسمبر 2026', '2026-12-04', 'PUBLISHED', 11, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. موريس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'شبهات وهمية', 'المحاضر: القمص / القس ف. موريس', '2026-12-04', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'شبهات وهمية', 'المحاضر: القمص / القس ف. موريس', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. موريس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'إدارة المدرسة' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'مراجعة عامة', 'المحاضر: الخادم المسؤول إدارة المدرسة', '2026-12-04', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'مراجعة عامة', 'المحاضر: الخادم المسؤول إدارة المدرسة', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'إدارة المدرسة', 'lecturer_title', 'الخادم المسؤول'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 11
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-12-04' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 11, 'الجمعة 4 ديسمبر 2026', '2026-12-04', 'PUBLISHED', 11, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'ف. موريس' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'عبري', 'المحاضر: القمص / القس ف. موريس', '2026-12-04', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'عبري', 'المحاضر: القمص / القس ف. موريس', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'ف. موريس', 'lecturer_title', 'القمص / القس'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'إدارة المدرسة' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'مراجعة عامة', 'المحاضر: الخادم المسؤول إدارة المدرسة', '2026-12-04', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'مراجعة عامة', 'المحاضر: الخادم المسؤول إدارة المدرسة', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'إدارة المدرسة', 'lecturer_title', 'الخادم المسؤول'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 11
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-12-04' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 11, 'الجمعة 4 ديسمبر 2026', '2026-12-04', 'PUBLISHED', 11, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'مايكل منير' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'شبهات الأنبياء', 'المحاضر: الأستاذ مايكل منير', '2026-12-04', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'شبهات الأنبياء', 'المحاضر: الأستاذ مايكل منير', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'مايكل منير', 'lecturer_title', 'الأستاذ'), v_admin_id, NOW());

    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'إدارة المدرسة' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'مراجعة عامة', 'المحاضر: الخادم المسؤول إدارة المدرسة', '2026-12-04', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'مراجعة عامة', 'المحاضر: الخادم المسؤول إدارة المدرسة', v_lecturer_id, 2, 'PUBLISHED', jsonb_build_object('lecturer_name', 'إدارة المدرسة', 'lecturer_title', 'الخادم المسؤول'), v_admin_id, NOW());

    -- =================== الجمعة 11 ديسمبر 2026 (الامتحان النهائي) (2026-12-11) ===================
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 1, '2026-12-11', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 2, '2026-12-11', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    INSERT INTO public.attendance_sessions (id, group_id, session_date, status)
    VALUES (gen_random_uuid(), 3, '2026-12-11', 'OPEN')
    ON CONFLICT (group_id, session_date) DO NOTHING;
    -- Group 1: Curriculum Day 12
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 1 AND study_date = '2026-12-11' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_1, 1, 12, 'الجمعة 11 ديسمبر 2026 (الامتحان النهائي)', '2026-12-11', 'PUBLISHED', 12, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'إدارة المدرسة' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_1, 1, v_lecturer_id, 'امتحان نهاية الترم الأول', 'المحاضر: لجنة الامتحانات إدارة المدرسة', '2026-12-11', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 1, 'امتحان نهاية الترم الأول', 'المحاضر: لجنة الامتحانات إدارة المدرسة', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'إدارة المدرسة', 'lecturer_title', 'لجنة الامتحانات'), v_admin_id, NOW());

    -- Group 2: Curriculum Day 12
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 2 AND study_date = '2026-12-11' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_2, 2, 12, 'الجمعة 11 ديسمبر 2026 (الامتحان النهائي)', '2026-12-11', 'PUBLISHED', 12, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'إدارة المدرسة' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_2, 2, v_lecturer_id, 'امتحان نهاية الترم الأول', 'المحاضر: لجنة الامتحانات إدارة المدرسة', '2026-12-11', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 2, 'امتحان نهاية الترم الأول', 'المحاضر: لجنة الامتحانات إدارة المدرسة', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'إدارة المدرسة', 'lecturer_title', 'لجنة الامتحانات'), v_admin_id, NOW());

    -- Group 3: Curriculum Day 12
    SELECT id INTO v_day_id FROM public.curriculum_days WHERE group_id = 3 AND study_date = '2026-12-11' AND deleted_at IS NULL LIMIT 1;
    IF v_day_id IS NULL THEN
        v_day_id := gen_random_uuid();
        INSERT INTO public.curriculum_days (id, term_id, group_id, day_number, title, study_date, status, sort_order, created_by, published_at)
        VALUES (v_day_id, v_term_id_3, 3, 12, 'الجمعة 11 ديسمبر 2026 (الامتحان النهائي)', '2026-12-11', 'PUBLISHED', 12, v_admin_id, NOW());
    END IF;
    SELECT id INTO v_lecturer_id FROM public.lecturers WHERE full_name = 'إدارة المدرسة' AND deleted_at IS NULL LIMIT 1;
    v_lecture_id := gen_random_uuid();
    INSERT INTO public.lectures (id, term_id, group_id, lecturer_id, title, description, lecture_date, audio_url, attachments_metadata, created_by, created_at, updated_at)
    VALUES (v_lecture_id, v_term_id_3, 3, v_lecturer_id, 'امتحان نهاية الترم الأول', 'المحاضر: لجنة الامتحانات إدارة المدرسة', '2026-12-11', NULL, '[]'::jsonb, v_admin_id, NOW(), NOW());
    INSERT INTO public.curriculum_entries (id, day_id, lecture_id, group_id, title, description, lecturer_id, sort_order, status, content_metadata, created_by, published_at)
    VALUES (gen_random_uuid(), v_day_id, v_lecture_id, 3, 'امتحان نهاية الترم الأول', 'المحاضر: لجنة الامتحانات إدارة المدرسة', v_lecturer_id, 1, 'PUBLISHED', jsonb_build_object('lecturer_name', 'إدارة المدرسة', 'lecturer_title', 'لجنة الامتحانات'), v_admin_id, NOW());

    RAISE NOTICE 'Successfully seeded all First Semester 2026 lectures for Groups 1, 2, and 3.';
END;
$$;

COMMIT;
