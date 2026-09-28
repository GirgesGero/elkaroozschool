-- 014_indexes_functions_triggers.sql
-- Performance Indexes, updated_at automation, and cleanup triggers

-- 1. Optimized Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role_group ON public.profiles(role_id, group_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_attendance_records_lookup ON public.attendance_records(group_id, session_id, trainee_id);
CREATE INDEX IF NOT EXISTS idx_exam_grades_lookup ON public.exam_grades(group_id, exam_id, trainee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_timeline ON public.feed_posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at ASC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bible_verses_search ON public.bible_verses(book_id, chapter_id, verse_number);
CREATE INDEX IF NOT EXISTS idx_bible_words_verse ON public.bible_verse_words(verse_id);
CREATE INDEX IF NOT EXISTS idx_bible_commentaries_verse ON public.bible_commentaries(verse_id);
CREATE INDEX IF NOT EXISTS idx_bible_word_commentaries_word ON public.bible_word_commentaries(word_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_timeline ON public.audit_logs(actor_id, created_at DESC);

-- Trigram Index for Fast Bible Full-Text / Substring Search
CREATE INDEX IF NOT EXISTS idx_bible_verses_text_trgm ON public.bible_verses USING gin (text_ar gin_trgm_ops);

-- 2. Generic updated_at Trigger Function
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_lectures_updated_at ON public.lectures;
CREATE TRIGGER trg_lectures_updated_at BEFORE UPDATE ON public.lectures FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_curriculums_updated_at ON public.curriculums;
CREATE TRIGGER trg_curriculums_updated_at BEFORE UPDATE ON public.curriculums FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_exams_updated_at ON public.exams;
CREATE TRIGGER trg_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_exam_grades_updated_at ON public.exam_grades;
CREATE TRIGGER trg_exam_grades_updated_at BEFORE UPDATE ON public.exam_grades FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_marathons_updated_at ON public.marathons;
CREATE TRIGGER trg_marathons_updated_at BEFORE UPDATE ON public.marathons FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_feed_posts_updated_at ON public.feed_posts;
CREATE TRIGGER trg_feed_posts_updated_at BEFORE UPDATE ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_post_comments_updated_at ON public.post_comments;
CREATE TRIGGER trg_post_comments_updated_at BEFORE UPDATE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_daily_verses_updated_at ON public.daily_verses;
CREATE TRIGGER trg_daily_verses_updated_at BEFORE UPDATE ON public.daily_verses FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_books_updated_at ON public.books;
CREATE TRIGGER trg_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_researches_updated_at ON public.researches;
CREATE TRIGGER trg_researches_updated_at BEFORE UPDATE ON public.researches FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_gallery_albums_updated_at ON public.gallery_albums;
CREATE TRIGGER trg_gallery_albums_updated_at BEFORE UPDATE ON public.gallery_albums FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_mp3_tracks_updated_at ON public.mp3_tracks;
CREATE TRIGGER trg_mp3_tracks_updated_at BEFORE UPDATE ON public.mp3_tracks FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
