-- ============================================================================
-- EL KAROOZ School — PARTIAL CATALOG SNAPSHOT (NOT REPLAYABLE)
-- Source: Supabase MCP table listing and read-only catalog queries.
-- Connected MCP target was described by the owner as staging, but on 2026-10-04 its
-- project host did not match frontend/.env.local; objects below are not verified as
-- the application's intended database. Reconfirm target identity before relying on them.
-- Counts (MCP target only): 50 tables; 90 policies; 79 public pg_proc rows (48 SQL/PLpgSQL);
-- 37 SECURITY DEFINER, 0 unpinned, 0 anon-executable; 24 triggers; 36 non-PK indexes.
-- WARNING: the 48 function bodies below are NULL stubs; policy expressions are
-- incomplete/omitted in places. This is NOT a complete DDL dump. DO NOT EXECUTE.
-- The connected MCP catalog belongs only to its returned project ref; that ref did not match
-- frontend/.env.local on 2026-10-04. Do not use this snapshot as the application's live schema.
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================================
-- 1. TABLES (50)
-- ============================================================================

-- Table: roles (rows=5, rls=True)
CREATE TABLE public.roles (
  id character varying NOT NULL,
  name_ar character varying NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Table: groups (rows=3, rls=True)
CREATE TABLE public.groups (
  id smallint NOT NULL CHECK (id = ANY (ARRAY[1, 2, 3])),
  name_ar character varying NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Table: profiles (rows=50, rls=True)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username character varying NOT NULL,
  full_name character varying NOT NULL,
  avatar_url text,
  birth_date date NOT NULL,
  phone character varying,
  address text,
  church character varying,
  confession_father character varying,
  role_id character varying NOT NULL,
  group_id smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  father_name character varying,
  google_maps_location text,
  PRIMARY KEY (id)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Table: permissions (rows=5, rls=True)
CREATE TABLE public.permissions (
  id character varying NOT NULL,
  name_ar character varying NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Table: servant_permissions (rows=11, rls=True)
CREATE TABLE public.servant_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  permission_id character varying NOT NULL,
  granted_by uuid,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.servant_permissions ENABLE ROW LEVEL SECURITY;

-- Table: group_secretariat (rows=4, rls=True)
CREATE TABLE public.group_secretariat (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  group_id smallint NOT NULL,
  appointed_by uuid,
  appointed_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id)
);
ALTER TABLE public.group_secretariat ENABLE ROW LEVEL SECURITY;

-- Table: terms (rows=21, rls=True)
CREATE TABLE public.terms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id smallint NOT NULL,
  name_ar character varying NOT NULL,
  academic_year character varying NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

-- Table: lecturers (rows=0, rls=True)
CREATE TABLE public.lecturers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name character varying NOT NULL,
  title character varying NOT NULL,
  avatar_url text,
  bio text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.lecturers ENABLE ROW LEVEL SECURITY;

-- Table: lectures (rows=21, rls=True)
CREATE TABLE public.lectures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL,
  group_id smallint NOT NULL,
  lecturer_id uuid,
  title character varying NOT NULL,
  description text,
  lecture_date date NOT NULL,
  audio_url text,
  attachments_metadata jsonb DEFAULT '[]'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

-- Table: curriculums (rows=8, rls=True)
CREATE TABLE public.curriculums (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id smallint NOT NULL,
  term_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type character varying NOT NULL DEFAULT 'PDF'::character varying,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.curriculums ENABLE ROW LEVEL SECURITY;

-- Table: attendance_sessions (rows=9, rls=True)
CREATE TABLE public.attendance_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id smallint NOT NULL,
  session_date date NOT NULL,
  status character varying NOT NULL DEFAULT 'OPEN'::character varying CHECK (status::text = ANY (ARRAY['OPEN'::character varying, 'LOCKED'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  PRIMARY KEY (id)
);
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Table: attendance_records (rows=80, rls=True)
CREATE TABLE public.attendance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  group_id smallint NOT NULL,
  trainee_id uuid NOT NULL,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['PRESENT'::character varying, 'ABSENT'::character varying, 'LATE'::character varying]::text[])),
  notes text,
  recorded_by uuid,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Table: exams (rows=1, rls=True)
CREATE TABLE public.exams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL,
  group_id smallint NOT NULL,
  title character varying NOT NULL,
  max_score numeric NOT NULL DEFAULT 100.00,
  exam_date date NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Table: exam_grades (rows=1, rls=True)
CREATE TABLE public.exam_grades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  group_id smallint NOT NULL,
  trainee_id uuid NOT NULL,
  numeric_score numeric NOT NULL,
  appreciation_grade character varying NOT NULL CHECK (appreciation_grade::text = ANY (ARRAY['ضعيف'::character varying, 'مقبول'::character varying, 'جيد'::character varying, 'جيد جدًا'::character varying, 'ممتاز'::character varying]::text[])),
  notes text,
  graded_by uuid,
  graded_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.exam_grades ENABLE ROW LEVEL SECURITY;

-- Table: marathons (rows=11, rls=True)
CREATE TABLE public.marathons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL,
  group_id smallint NOT NULL,
  title character varying NOT NULL,
  description text,
  total_score numeric NOT NULL DEFAULT 100.00,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.marathons ENABLE ROW LEVEL SECURITY;

-- Table: marathon_sections (rows=18, rls=True)
CREATE TABLE public.marathon_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  marathon_id uuid NOT NULL,
  title character varying NOT NULL,
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.marathon_sections ENABLE ROW LEVEL SECURITY;

-- Table: marathon_questions (rows=54, rls=True)
CREATE TABLE public.marathon_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  marathon_id uuid NOT NULL,
  section_id uuid,
  question_text text NOT NULL,
  question_type character varying NOT NULL DEFAULT 'MCQ'::character varying,
  score_weight numeric NOT NULL DEFAULT 0.000,
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.marathon_questions ENABLE ROW LEVEL SECURITY;

-- Table: marathon_answers (rows=221, rls=True)
CREATE TABLE public.marathon_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  answer_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
ALTER TABLE public.marathon_answers ENABLE ROW LEVEL SECURITY;

-- Table: marathon_trainee_submissions (rows=18, rls=True)
CREATE TABLE public.marathon_trainee_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  marathon_id uuid NOT NULL,
  trainee_id uuid NOT NULL DEFAULT auth.uid(),
  group_id smallint NOT NULL,
  total_score numeric NOT NULL DEFAULT 0.00,
  appreciation_grade character varying NOT NULL DEFAULT 'ضعيف'::character varying,
  is_submitted boolean NOT NULL DEFAULT false,
  submitted_at timestamp with time zone,
  is_reopened boolean NOT NULL DEFAULT false,
  reopened_by uuid,
  reopened_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.marathon_trainee_submissions ENABLE ROW LEVEL SECURITY;

-- Table: marathon_trainee_answers (rows=54, rls=True)
CREATE TABLE public.marathon_trainee_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  question_id uuid NOT NULL,
  selected_answer_id uuid,
  is_correct boolean NOT NULL DEFAULT false,
  score_awarded numeric NOT NULL DEFAULT 0.000,
  answered_at timestamp with time zone NOT NULL DEFAULT now(),
  is_reopened boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.marathon_trainee_answers ENABLE ROW LEVEL SECURITY;

-- Table: feed_posts (rows=45, rls=True)
CREATE TABLE public.feed_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid(),
  content_text text NOT NULL,
  images_metadata jsonb DEFAULT '[]'::jsonb,
  reactions_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  content text,
  PRIMARY KEY (id)
);
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Table: post_comments (rows=17, rls=True)
CREATE TABLE public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  comment_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  content text,
  PRIMARY KEY (id)
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Table: reactions (rows=22, rls=True)
CREATE TABLE public.reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_type character varying NOT NULL CHECK (target_type::text = ANY (ARRAY['POST'::character varying, 'COMMENT'::character varying]::text[])),
  target_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  reaction_type character varying NOT NULL DEFAULT 'LIKE'::character varying CHECK (reaction_type::text = ANY (ARRAY['LIKE'::character varying, 'LOVE'::character varying, 'PRAY'::character varying, 'AMEN'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Table: notification_templates (rows=2, rls=True)
CREATE TABLE public.notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_key character varying NOT NULL,
  template_body text NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Table: notifications (rows=226, rls=True)
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL DEFAULT auth.uid(),
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['PASTORAL'::character varying, 'BIRTHDAY'::character varying, 'DAILY_VERSE'::character varying, 'SYSTEM'::character varying]::text[])),
  title character varying NOT NULL,
  body text NOT NULL,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Table: push_subscriptions (rows=5, rls=True)
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  endpoint text NOT NULL,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Table: daily_verses (rows=5, rls=True)
CREATE TABLE public.daily_verses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  verse_text text NOT NULL,
  reference character varying NOT NULL,
  display_order integer NOT NULL DEFAULT 1,
  is_sent boolean NOT NULL DEFAULT false,
  last_sent_date date,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.daily_verses ENABLE ROW LEVEL SECURITY;

-- Table: daily_verse_dispatch_state (rows=1, rls=True)
CREATE TABLE public.daily_verse_dispatch_state (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  last_dispatch_date date,
  last_verse_id uuid,
  mode character varying NOT NULL DEFAULT 'SEQUENTIAL'::character varying,
  current_cycle integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
ALTER TABLE public.daily_verse_dispatch_state ENABLE ROW LEVEL SECURITY;

-- Table: categories (rows=5, rls=True)
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_ar character varying NOT NULL,
  type character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Table: books (rows=5, rls=True)
CREATE TABLE public.books (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id smallint,
  category_id uuid,
  title character varying NOT NULL,
  author character varying,
  file_url text NOT NULL,
  cover_url text,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Table: researches (rows=5, rls=True)
CREATE TABLE public.researches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id smallint,
  category_id uuid,
  title character varying NOT NULL,
  author character varying,
  file_url text NOT NULL,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.researches ENABLE ROW LEVEL SECURITY;

-- Table: gallery_albums (rows=5, rls=True)
CREATE TABLE public.gallery_albums (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  title character varying NOT NULL,
  description text,
  cover_url text,
  event_date date,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  group_id smallint,
  PRIMARY KEY (id)
);
ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;

-- Table: gallery_items (rows=5, rls=True)
CREATE TABLE public.gallery_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL,
  image_url text NOT NULL,
  title character varying,
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  group_id smallint,
  PRIMARY KEY (id)
);
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- Table: mp3_tracks (rows=5, rls=True)
CREATE TABLE public.mp3_tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id smallint NOT NULL,
  title character varying NOT NULL,
  lecturer_id uuid,
  audio_url text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.mp3_tracks ENABLE ROW LEVEL SECURITY;

-- Table: user_favorites (rows=5, rls=True)
CREATE TABLE public.user_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  item_type character varying NOT NULL CHECK (item_type::text = ANY (ARRAY['BOOK'::character varying, 'RESEARCH'::character varying, 'MP3'::character varying, 'LECTURE'::character varying]::text[])),
  item_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Table: bible_testaments (rows=2, rls=True)
CREATE TABLE public.bible_testaments (
  id smallint NOT NULL,
  code character varying NOT NULL,
  name_ar character varying NOT NULL,
  name_en character varying NOT NULL,
  order_index integer NOT NULL,
  PRIMARY KEY (id)
);
ALTER TABLE public.bible_testaments ENABLE ROW LEVEL SECURITY;

-- Table: bible_books (rows=18, rls=True)
CREATE TABLE public.bible_books (
  id integer NOT NULL,
  testament_id smallint NOT NULL,
  code character varying NOT NULL,
  name_ar character varying NOT NULL,
  name_en character varying,
  chapters_count integer NOT NULL DEFAULT 1,
  order_index integer NOT NULL,
  source_url text NOT NULL,
  PRIMARY KEY (id)
);
ALTER TABLE public.bible_books ENABLE ROW LEVEL SECURITY;

-- Table: bible_chapters (rows=1, rls=True)
CREATE TABLE public.bible_chapters (
  id bigint NOT NULL DEFAULT nextval('bible_chapters_id_seq'::regclass),
  book_id integer NOT NULL,
  chapter_number integer NOT NULL,
  verses_count integer NOT NULL DEFAULT 0,
  source_url text NOT NULL,
  PRIMARY KEY (id)
);
ALTER TABLE public.bible_chapters ENABLE ROW LEVEL SECURITY;

-- Table: bible_verses (rows=3, rls=True)
CREATE TABLE public.bible_verses (
  id bigint NOT NULL DEFAULT nextval('bible_verses_id_seq'::regclass),
  chapter_id bigint NOT NULL,
  book_id integer NOT NULL,
  verse_number integer NOT NULL,
  text_ar text NOT NULL,
  text_clean text NOT NULL,
  source_url text NOT NULL,
  PRIMARY KEY (id)
);
ALTER TABLE public.bible_verses ENABLE ROW LEVEL SECURITY;

-- Table: bible_verse_words (rows=6, rls=True)
CREATE TABLE public.bible_verse_words (
  id bigint NOT NULL DEFAULT nextval('bible_verse_words_id_seq'::regclass),
  verse_id bigint NOT NULL,
  word_position integer NOT NULL,
  word_text character varying NOT NULL,
  clean_word character varying NOT NULL,
  has_commentary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (id)
);
ALTER TABLE public.bible_verse_words ENABLE ROW LEVEL SECURITY;

-- Table: bible_sources (rows=5, rls=True)
CREATE TABLE public.bible_sources (
  id character varying NOT NULL,
  author_name character varying NOT NULL,
  source_name character varying NOT NULL,
  base_url text NOT NULL,
  description text,
  PRIMARY KEY (id)
);
ALTER TABLE public.bible_sources ENABLE ROW LEVEL SECURITY;

-- Table: bible_commentaries (rows=2, rls=True)
CREATE TABLE public.bible_commentaries (
  id bigint NOT NULL DEFAULT nextval('bible_commentaries_id_seq'::regclass),
  verse_id bigint NOT NULL,
  source_id character varying NOT NULL,
  commentary_title character varying,
  commentary_text text NOT NULL,
  source_url text NOT NULL,
  PRIMARY KEY (id)
);
ALTER TABLE public.bible_commentaries ENABLE ROW LEVEL SECURITY;

-- Table: bible_word_commentaries (rows=2, rls=True)
CREATE TABLE public.bible_word_commentaries (
  id bigint NOT NULL DEFAULT nextval('bible_word_commentaries_id_seq'::regclass),
  word_id bigint NOT NULL,
  source_id character varying NOT NULL,
  explanation_title character varying,
  explanation_text text NOT NULL,
  source_url text NOT NULL,
  PRIMARY KEY (id)
);
ALTER TABLE public.bible_word_commentaries ENABLE ROW LEVEL SECURITY;

-- Table: audit_logs (rows=47, rls=True)
CREATE TABLE public.audit_logs (
  id bigint NOT NULL DEFAULT nextval('audit_logs_id_seq'::regclass),
  actor_id uuid,
  actor_name character varying,
  actor_role character varying,
  action character varying NOT NULL,
  entity_type character varying NOT NULL,
  entity_id character varying NOT NULL,
  old_values jsonb,
  new_values jsonb,
  ip_address character varying,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Table: backup_records (rows=10, rls=True)
CREATE TABLE public.backup_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  filename character varying NOT NULL,
  file_size_bytes bigint NOT NULL,
  storage_type character varying NOT NULL DEFAULT 'HOSTINGER'::character varying,
  storage_path text,
  status character varying NOT NULL DEFAULT 'COMPLETED'::character varying,
  checksum_sha256 character varying NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  PRIMARY KEY (id)
);
ALTER TABLE public.backup_records ENABLE ROW LEVEL SECURITY;

-- Table: import_history (rows=28, rls=True)
CREATE TABLE public.import_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  filename character varying NOT NULL,
  original_file_storage_path text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  new_accounts_count integer NOT NULL DEFAULT 0,
  updated_accounts_count integer NOT NULL DEFAULT 0,
  status character varying NOT NULL DEFAULT 'SUCCESS'::character varying,
  error_details jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  import_mode character varying NOT NULL DEFAULT 'DRY_RUN'::character varying,
  import_type character varying NOT NULL DEFAULT 'TRAINEES'::character varying,
  checksum_sha256 character varying,
  execution_time_ms integer DEFAULT 0,
  PRIMARY KEY (id)
);
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- Table: post_images (rows=10, rls=True)
CREATE TABLE public.post_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  storage_path character varying NOT NULL,
  image_url text NOT NULL,
  width integer,
  height integer,
  file_size_bytes integer,
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

-- Table: bible_dictionary_entries (rows=2, rls=True)
CREATE TABLE public.bible_dictionary_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  term character varying NOT NULL,
  clean_term character varying NOT NULL,
  title character varying NOT NULL,
  original_content text NOT NULL,
  author_name character varying NOT NULL DEFAULT 'موقع الأنبا تكلا هيمانوت'::character varying,
  source_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.bible_dictionary_entries ENABLE ROW LEVEL SECURITY;

-- Table: word_dictionary_mappings (rows=2, rls=True)
CREATE TABLE public.word_dictionary_mappings (
  id bigint NOT NULL DEFAULT nextval('word_dictionary_mappings_id_seq'::regclass),
  word_id bigint NOT NULL,
  dictionary_entry_id uuid NOT NULL,
  PRIMARY KEY (id)
);
ALTER TABLE public.word_dictionary_mappings ENABLE ROW LEVEL SECURITY;

-- Table: bible_content_versions (rows=0, rls=True)
CREATE TABLE public.bible_content_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  version_tag character varying NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT false,
  manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_books integer NOT NULL DEFAULT 0,
  total_chapters integer NOT NULL DEFAULT 0,
  total_verses integer NOT NULL DEFAULT 0,
  total_commentaries integer NOT NULL DEFAULT 0,
  total_dictionary_entries integer NOT NULL DEFAULT 0,
  checksum_sha256 character varying NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.bible_content_versions ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. FOREIGN KEYS
-- ============================================================================

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);
ALTER TABLE public.mp3_tracks ADD CONSTRAINT mp3_tracks_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.researches ADD CONSTRAINT researches_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.books ADD CONSTRAINT books_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.marathon_trainee_submissions ADD CONSTRAINT marathon_trainee_submissions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.marathons ADD CONSTRAINT marathons_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.exam_grades ADD CONSTRAINT exam_grades_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.exams ADD CONSTRAINT exams_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.attendance_sessions ADD CONSTRAINT attendance_sessions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.curriculums ADD CONSTRAINT curriculums_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.lectures ADD CONSTRAINT lectures_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.terms ADD CONSTRAINT terms_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.group_secretariat ADD CONSTRAINT group_secretariat_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.gallery_items ADD CONSTRAINT gallery_items_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.gallery_albums ADD CONSTRAINT gallery_albums_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.backup_records ADD CONSTRAINT backup_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.user_favorites ADD CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.mp3_tracks ADD CONSTRAINT mp3_tracks_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.mp3_tracks ADD CONSTRAINT mp3_tracks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.gallery_items ADD CONSTRAINT gallery_items_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.gallery_albums ADD CONSTRAINT gallery_albums_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.gallery_albums ADD CONSTRAINT gallery_albums_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.researches ADD CONSTRAINT researches_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.researches ADD CONSTRAINT researches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.books ADD CONSTRAINT books_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.books ADD CONSTRAINT books_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.daily_verses ADD CONSTRAINT daily_verses_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.daily_verses ADD CONSTRAINT daily_verses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id);
ALTER TABLE public.notification_templates ADD CONSTRAINT notification_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);
ALTER TABLE public.reactions ADD CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id);
ALTER TABLE public.feed_posts ADD CONSTRAINT feed_posts_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.feed_posts ADD CONSTRAINT feed_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id);
ALTER TABLE public.marathon_trainee_submissions ADD CONSTRAINT marathon_trainee_submissions_reopened_by_fkey FOREIGN KEY (reopened_by) REFERENCES public.profiles(id);
ALTER TABLE public.marathon_trainee_submissions ADD CONSTRAINT marathon_trainee_submissions_trainee_id_fkey FOREIGN KEY (trainee_id) REFERENCES public.profiles(id);
ALTER TABLE public.marathons ADD CONSTRAINT marathons_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.marathons ADD CONSTRAINT marathons_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.exam_grades ADD CONSTRAINT exam_grades_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.exam_grades ADD CONSTRAINT exam_grades_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.profiles(id);
ALTER TABLE public.exam_grades ADD CONSTRAINT exam_grades_trainee_id_fkey FOREIGN KEY (trainee_id) REFERENCES public.profiles(id);
ALTER TABLE public.exams ADD CONSTRAINT exams_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.exams ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.backup_records ADD CONSTRAINT backup_records_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id);
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_trainee_id_fkey FOREIGN KEY (trainee_id) REFERENCES public.profiles(id);
ALTER TABLE public.curriculums ADD CONSTRAINT curriculums_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.curriculums ADD CONSTRAINT curriculums_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.lectures ADD CONSTRAINT lectures_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.lectures ADD CONSTRAINT lectures_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.lecturers ADD CONSTRAINT lecturers_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.terms ADD CONSTRAINT terms_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
ALTER TABLE public.group_secretariat ADD CONSTRAINT group_secretariat_appointed_by_fkey FOREIGN KEY (appointed_by) REFERENCES public.profiles(id);
ALTER TABLE public.group_secretariat ADD CONSTRAINT group_secretariat_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);
ALTER TABLE public.servant_permissions ADD CONSTRAINT servant_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id);
ALTER TABLE public.servant_permissions ADD CONSTRAINT servant_permissions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
ALTER TABLE public.bible_content_versions ADD CONSTRAINT bible_content_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.import_history ADD CONSTRAINT import_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.servant_permissions ADD CONSTRAINT servant_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);
ALTER TABLE public.marathons ADD CONSTRAINT marathons_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id);
ALTER TABLE public.curriculums ADD CONSTRAINT curriculums_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id);
ALTER TABLE public.lectures ADD CONSTRAINT lectures_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id);
ALTER TABLE public.exams ADD CONSTRAINT exams_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id);
ALTER TABLE public.lectures ADD CONSTRAINT lectures_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.lecturers(id);
ALTER TABLE public.mp3_tracks ADD CONSTRAINT mp3_tracks_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.lecturers(id);
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id);
ALTER TABLE public.exam_grades ADD CONSTRAINT exam_grades_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id);
ALTER TABLE public.marathon_trainee_submissions ADD CONSTRAINT marathon_trainee_submissions_marathon_id_fkey FOREIGN KEY (marathon_id) REFERENCES public.marathons(id);
ALTER TABLE public.marathon_sections ADD CONSTRAINT marathon_sections_marathon_id_fkey FOREIGN KEY (marathon_id) REFERENCES public.marathons(id);
ALTER TABLE public.marathon_questions ADD CONSTRAINT marathon_questions_marathon_id_fkey FOREIGN KEY (marathon_id) REFERENCES public.marathons(id);
ALTER TABLE public.marathon_questions ADD CONSTRAINT marathon_questions_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.marathon_sections(id);
ALTER TABLE public.marathon_trainee_answers ADD CONSTRAINT marathon_trainee_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.marathon_questions(id);
ALTER TABLE public.marathon_answers ADD CONSTRAINT marathon_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.marathon_questions(id);
ALTER TABLE public.marathon_trainee_answers ADD CONSTRAINT marathon_trainee_answers_selected_answer_id_fkey FOREIGN KEY (selected_answer_id) REFERENCES public.marathon_answers(id);
ALTER TABLE public.marathon_trainee_answers ADD CONSTRAINT marathon_trainee_answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.marathon_trainee_submissions(id);
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feed_posts(id);
ALTER TABLE public.post_images ADD CONSTRAINT post_images_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feed_posts(id);
ALTER TABLE public.daily_verse_dispatch_state ADD CONSTRAINT daily_verse_dispatch_state_last_verse_id_fkey FOREIGN KEY (last_verse_id) REFERENCES public.daily_verses(id);
ALTER TABLE public.researches ADD CONSTRAINT researches_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);
ALTER TABLE public.gallery_albums ADD CONSTRAINT gallery_albums_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);
ALTER TABLE public.books ADD CONSTRAINT books_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);
ALTER TABLE public.gallery_items ADD CONSTRAINT gallery_items_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.gallery_albums(id);
ALTER TABLE public.bible_books ADD CONSTRAINT bible_books_testament_id_fkey FOREIGN KEY (testament_id) REFERENCES public.bible_testaments(id);
ALTER TABLE public.bible_verses ADD CONSTRAINT bible_verses_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.bible_books(id);
ALTER TABLE public.bible_chapters ADD CONSTRAINT bible_chapters_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.bible_books(id);
ALTER TABLE public.bible_verses ADD CONSTRAINT bible_verses_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.bible_chapters(id);
ALTER TABLE public.bible_commentaries ADD CONSTRAINT bible_commentaries_verse_id_fkey FOREIGN KEY (verse_id) REFERENCES public.bible_verses(id);
ALTER TABLE public.bible_verse_words ADD CONSTRAINT bible_verse_words_verse_id_fkey FOREIGN KEY (verse_id) REFERENCES public.bible_verses(id);
ALTER TABLE public.word_dictionary_mappings ADD CONSTRAINT word_dictionary_mappings_word_id_fkey FOREIGN KEY (word_id) REFERENCES public.bible_verse_words(id);
ALTER TABLE public.bible_word_commentaries ADD CONSTRAINT bible_word_commentaries_word_id_fkey FOREIGN KEY (word_id) REFERENCES public.bible_verse_words(id);
ALTER TABLE public.bible_word_commentaries ADD CONSTRAINT bible_word_commentaries_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.bible_sources(id);
ALTER TABLE public.bible_commentaries ADD CONSTRAINT bible_commentaries_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.bible_sources(id);
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id);
ALTER TABLE public.word_dictionary_mappings ADD CONSTRAINT word_dictionary_mappings_dictionary_entry_id_fkey FOREIGN KEY (dictionary_entry_id) REFERENCES public.bible_dictionary_entries(id);

-- ============================================================================
-- 3. INDEXES (36 non-PK)
-- ============================================================================

CREATE INDEX idx_attendance_records_lookup ON public.attendance_records USING btree (group_id, session_id, trainee_id);
CREATE UNIQUE INDEX uq_session_trainee ON public.attendance_records USING btree (session_id, trainee_id);
CREATE UNIQUE INDEX uq_group_session_date ON public.attendance_sessions USING btree (group_id, session_date);
CREATE INDEX idx_audit_logs_actor_timeline ON public.audit_logs USING btree (actor_id, created_at DESC);
CREATE UNIQUE INDEX bible_books_code_key ON public.bible_books USING btree (code);
CREATE UNIQUE INDEX uq_book_chapter ON public.bible_chapters USING btree (book_id, chapter_number);
CREATE INDEX idx_bible_commentaries_verse ON public.bible_commentaries USING btree (verse_id);
CREATE UNIQUE INDEX bible_content_versions_version_tag_key ON public.bible_content_versions USING btree (version_tag);
CREATE UNIQUE INDEX bible_testaments_code_key ON public.bible_testaments USING btree (code);
CREATE INDEX idx_bible_words_verse ON public.bible_verse_words USING btree (verse_id);
CREATE UNIQUE INDEX uq_verse_word_pos ON public.bible_verse_words USING btree (verse_id, word_position);
CREATE INDEX idx_bible_verses_search ON public.bible_verses USING btree (book_id, chapter_id, verse_number);
CREATE INDEX idx_bible_verses_text_trgm ON public.bible_verses USING gin (text_ar gin_trgm_ops);
CREATE UNIQUE INDEX uq_chapter_verse ON public.bible_verses USING btree (chapter_id, verse_number);
CREATE INDEX idx_bible_word_commentaries_word ON public.bible_word_commentaries USING btree (word_id);
CREATE INDEX idx_exam_grades_lookup ON public.exam_grades USING btree (group_id, exam_id, trainee_id);
CREATE UNIQUE INDEX uq_exam_trainee ON public.exam_grades USING btree (exam_id, trainee_id);
CREATE UNIQUE INDEX uq_exam_per_term ON public.exams USING btree (term_id, group_id);
CREATE INDEX idx_feed_posts_timeline ON public.feed_posts USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_secretariat_profile ON public.group_secretariat USING btree (profile_id);
CREATE UNIQUE INDEX uq_secretariat_profile_group ON public.group_secretariat USING btree (profile_id, group_id);
CREATE UNIQUE INDEX uq_submission_question ON public.marathon_trainee_answers USING btree (submission_id, question_id);
CREATE UNIQUE INDEX uq_marathon_trainee_submission ON public.marathon_trainee_submissions USING btree (marathon_id, trainee_id);
CREATE UNIQUE INDEX notification_templates_template_key_key ON public.notification_templates USING btree (template_key);
CREATE INDEX idx_notifications_recipient_unread ON public.notifications USING btree (recipient_id, is_read, created_at DESC);
CREATE INDEX idx_post_comments_post ON public.post_comments USING btree (post_id, created_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_profiles_role_group ON public.profiles USING btree (role_id, group_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);
CREATE UNIQUE INDEX uq_profiles_username ON public.profiles USING btree (username);
CREATE UNIQUE INDEX uq_single_admin ON public.profiles USING btree (role_id) WHERE (role_id = 'admin' AND deleted_at IS NULL);
CREATE UNIQUE INDEX uq_single_super_user ON public.profiles USING btree (role_id) WHERE (role_id = 'super_user' AND deleted_at IS NULL);
CREATE UNIQUE INDEX uq_profile_endpoint ON public.push_subscriptions USING btree (profile_id, endpoint);
CREATE UNIQUE INDEX uq_user_reaction ON public.reactions USING btree (target_type, target_id, user_id);
CREATE UNIQUE INDEX uq_servant_permission ON public.servant_permissions USING btree (profile_id, permission_id);
CREATE UNIQUE INDEX uq_user_fav ON public.user_favorites USING btree (user_id, item_type, item_id);
CREATE UNIQUE INDEX uq_word_dict ON public.word_dictionary_mappings USING btree (word_id, dictionary_entry_id);


-- ============================================================================
-- 4. FUNCTIONS (48 stubs)
-- ============================================================================

-- source_length: 3706 chars
CREATE OR REPLACE FUNCTION public._unsafe_get_group_operational_summary(p_group_id smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (3706 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 933 chars
CREATE OR REPLACE FUNCTION public._unsafe_get_group_secretariat_detailed(p_group_id smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (933 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1216 chars
CREATE OR REPLACE FUNCTION public._unsafe_get_group_servants_detailed(p_group_id smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1216 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1878 chars
CREATE OR REPLACE FUNCTION public._unsafe_get_trainee_attendance_summary(p_trainee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (1878 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 4101 chars
CREATE OR REPLACE FUNCTION public._unsafe_get_trainee_full_profile(p_trainee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (4101 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 390 chars
CREATE OR REPLACE FUNCTION public.check_attendance_session_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
AS $function$
  -- Function body omitted (390 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 358 chars
CREATE OR REPLACE FUNCTION public.check_secretariat_group_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
AS $function$
  -- Function body omitted (358 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 681 chars
CREATE OR REPLACE FUNCTION public.compute_exam_appreciation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
AS $function$
  -- Function body omitted (681 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1917 chars
CREATE OR REPLACE FUNCTION public.dispatch_absence_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1917 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 2627 chars
CREATE OR REPLACE FUNCTION public.dispatch_daily_verse_notification(p_force_send boolean DEFAULT false, p_mode varchar DEFAULT 'SEQUENTIAL')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (2627 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 433 chars
CREATE OR REPLACE FUNCTION public.export_manifest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $function$
  -- Function body omitted (433 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1129 chars
CREATE OR REPLACE FUNCTION public.export_table(p_table text, p_limit integer DEFAULT 1000, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $function$
  -- Function body omitted (1129 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1127 chars
CREATE OR REPLACE FUNCTION public.get_chapter_verses_with_words(p_book_id integer, p_chapter_number integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (1127 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 88 chars
CREATE OR REPLACE FUNCTION public.get_current_user_group()
RETURNS smallint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (88 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 87 chars
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS varchar
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (87 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 318 chars
CREATE OR REPLACE FUNCTION public.get_group_operational_summary(p_group_id smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (318 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 319 chars
CREATE OR REPLACE FUNCTION public.get_group_secretariat_detailed(p_group_id smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (319 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 316 chars
CREATE OR REPLACE FUNCTION public.get_group_servants_detailed(p_group_id smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (316 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 494 chars
CREATE OR REPLACE FUNCTION public.get_post_reactors(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (494 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1129 chars
CREATE OR REPLACE FUNCTION public.get_trainee_attendance_summary(p_trainee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1129 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1282 chars
CREATE OR REPLACE FUNCTION public.get_trainee_full_profile(p_trainee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1282 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1979 chars
CREATE OR REPLACE FUNCTION public.get_trainee_marathon_state(p_marathon_id uuid, p_trainee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (1979 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1487 chars
CREATE OR REPLACE FUNCTION public.get_word_details(p_word_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (1487 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 931 chars
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
AS $function$
  -- Function body omitted (931 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 178 chars
CREATE OR REPLACE FUNCTION public.has_servant_permission(perm_id varchar)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (178 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 9352 chars
CREATE OR REPLACE FUNCTION public.import_trainees_bulk_atomic(p_batch_json jsonb, p_filename varchar, p_file_storage_path text, p_dry_run boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (9352 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 181 chars
CREATE OR REPLACE FUNCTION public.is_admin_or_super_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (181 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 197 chars
CREATE OR REPLACE FUNCTION public.is_secretariat_of_group(target_group smallint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (197 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 150 chars
CREATE OR REPLACE FUNCTION public.is_servant_or_secretariat()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (150 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 824 chars
CREATE OR REPLACE FUNCTION public.log_operational_event(p_operation varchar, p_entity_type varchar, p_entity_id varchar, p_status varchar, p_details jsonb, p_checksum varchar DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (824 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 573 chars
CREATE OR REPLACE FUNCTION public.rebalance_marathon_question_weights()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
AS $function$
  -- Function body omitted (573 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1232 chars
CREATE OR REPLACE FUNCTION public.reopen_marathon_question(p_submission_id uuid, p_question_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1232 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1054 chars
CREATE OR REPLACE FUNCTION public.restore_accounts(p_profiles jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1054 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 4164 chars
CREATE OR REPLACE FUNCTION public.restore_database(p_tables jsonb, p_truncate boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (4164 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1160 chars
CREATE OR REPLACE FUNCTION public.restore_deleted_post(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1160 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 3317 chars
CREATE OR REPLACE FUNCTION public.restore_table(p_table text, p_rows jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (3317 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 737 chars
CREATE OR REPLACE FUNCTION public.search_bible_content(p_query text, p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $function$
  -- Function body omitted (737 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1618 chars
CREATE OR REPLACE FUNCTION public.soft_delete_comment(p_comment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1618 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1302 chars
CREATE OR REPLACE FUNCTION public.soft_delete_post(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1302 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 5249 chars
CREATE OR REPLACE FUNCTION public.submit_marathon_answer(p_marathon_id uuid, p_question_id uuid, p_selected_answer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (5249 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 255 chars
CREATE OR REPLACE FUNCTION public.sync_comment_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
AS $function$
  -- Function body omitted (255 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 255 chars
CREATE OR REPLACE FUNCTION public.sync_feed_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
AS $function$
  -- Function body omitted (255 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1548 chars
CREATE OR REPLACE FUNCTION public.sync_profile_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1548 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1201 chars
CREATE OR REPLACE FUNCTION public.toggle_post_reaction(p_post_id uuid, p_reaction_type varchar)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1201 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 57 chars
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
AS $function$
  -- Function body omitted (57 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 2333 chars
CREATE OR REPLACE FUNCTION public.trigger_absence_notification(p_trainee_id uuid, p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (2333 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 1844 chars
CREATE OR REPLACE FUNCTION public.trigger_birthday_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $function$
  -- Function body omitted (1844 chars). See migration files for full source.
  NULL;
$function$;

-- source_length: 794 chars
CREATE OR REPLACE FUNCTION public.update_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
AS $function$
  -- Function body omitted (794 chars). See migration files for full source.
  NULL;
$function$;


-- ============================================================================
-- 5. TRIGGERS (24)
-- ============================================================================

CREATE TRIGGER trg_absence_notification
  AFTER INSERT OR DELETE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_absence_notification();

CREATE TRIGGER trg_check_attendance_session_open
  BEFORE INSERT OR DELETE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.check_attendance_session_open();

CREATE TRIGGER trg_books_updated_at
  BEFORE DELETE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_curriculums_updated_at
  BEFORE DELETE ON public.curriculums
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_daily_verses_updated_at
  BEFORE DELETE ON public.daily_verses
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_compute_exam_appreciation
  BEFORE INSERT OR DELETE ON public.exam_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_exam_appreciation();

CREATE TRIGGER trg_exam_grades_updated_at
  BEFORE DELETE ON public.exam_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_exams_updated_at
  BEFORE DELETE ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_feed_posts_updated_at
  BEFORE DELETE ON public.feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_sync_feed_posts_content
  BEFORE INSERT OR DELETE ON public.feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_feed_content();

CREATE TRIGGER trg_gallery_albums_updated_at
  BEFORE DELETE ON public.gallery_albums
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_check_secretariat_limit
  BEFORE INSERT OR DELETE ON public.group_secretariat
  FOR EACH ROW
  EXECUTE FUNCTION public.check_secretariat_group_limit();

CREATE TRIGGER trg_lectures_updated_at
  BEFORE DELETE ON public.lectures
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_rebalance_marathon_weights
  AFTER INSERT OR UPDATE ON public.marathon_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.rebalance_marathon_question_weights();

CREATE TRIGGER trg_marathons_updated_at
  BEFORE DELETE ON public.marathons
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_mp3_tracks_updated_at
  BEFORE DELETE ON public.mp3_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_comments_count
  AFTER INSERT OR UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_counts();

CREATE TRIGGER trg_post_comments_updated_at
  BEFORE DELETE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_sync_post_comments_content
  BEFORE INSERT OR DELETE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_comment_content();

CREATE TRIGGER trg_profiles_guard_privilege
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privilege_columns();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_sync_profile_app_metadata
  AFTER INSERT OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_app_metadata();

CREATE TRIGGER trg_reactions_count
  AFTER INSERT OR UPDATE ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_counts();

CREATE TRIGGER trg_researches_updated_at
  BEFORE DELETE ON public.researches
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES (78)
-- ============================================================================

-- attendance_records
CREATE POLICY "Read attendance records in same group" ON public.attendance_records
  FOR SELECT TO authenticated;

CREATE POLICY "Secretariat record attendance" ON public.attendance_records
  FOR ALL TO authenticated
  USING (is_secretariat_of_group(group_id));


-- attendance_sessions
CREATE POLICY "Read attendance in same group" ON public.attendance_sessions
  FOR SELECT TO authenticated;

CREATE POLICY "Secretariat manage attendance sessions" ON public.attendance_sessions
  FOR ALL TO authenticated;


-- audit_logs
CREATE POLICY "Admin read audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated;

CREATE POLICY "Admin view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated;

CREATE POLICY "Deny all delete" ON public.audit_logs
  FOR DELETE TO authenticated
  USING (false);

CREATE POLICY "Deny all update" ON public.audit_logs
  FOR UPDATE TO authenticated
  USING (false);


-- backup_records
CREATE POLICY "Admin manage backup_records" ON public.backup_records
  FOR ALL TO authenticated
  USING (is_admin_or_super_user());


-- bible_books
CREATE POLICY "Public read" ON public.bible_books
  FOR SELECT TO public
  USING (true);


-- bible_chapters
CREATE POLICY "Public read" ON public.bible_chapters
  FOR SELECT TO public
  USING (true);


-- bible_commentaries
CREATE POLICY "Public read" ON public.bible_commentaries
  FOR SELECT TO public
  USING (true);


-- bible_content_versions
CREATE POLICY "Manage bible versions" ON public.bible_content_versions
  FOR ALL TO authenticated
  USING (is_admin_or_super_user());

CREATE POLICY "Public read active" ON public.bible_content_versions
  FOR SELECT TO public
  USING (true);


-- bible_dictionary_entries
CREATE POLICY "Public read dictionary entries" ON public.bible_dictionary_entries
  FOR SELECT TO public
  USING (true);


-- bible_sources
CREATE POLICY "Public read" ON public.bible_sources
  FOR SELECT TO public
  USING (true);


-- bible_testaments
CREATE POLICY "Public read" ON public.bible_testaments
  FOR SELECT TO public
  USING (true);


-- bible_verse_words
CREATE POLICY "Public read" ON public.bible_verse_words
  FOR SELECT TO public
  USING (true);


-- bible_verses
CREATE POLICY "Public read" ON public.bible_verses
  FOR SELECT TO public
  USING (true);


-- bible_word_commentaries
CREATE POLICY "Public read" ON public.bible_word_commentaries
  FOR SELECT TO public
  USING (true);


-- books
CREATE POLICY "Authenticated read books" ON public.books
  FOR SELECT TO authenticated
  USING ((deleted_at IS NULL) OR is_admin_or_super_user());

CREATE POLICY "Manage books with permission" ON public.books
  FOR ALL TO authenticated
  USING (has_servant_permission('MANAGE_LIBRARY'));


-- categories
CREATE POLICY "Manage categories" ON public.categories
  FOR ALL TO authenticated;

CREATE POLICY "Public read categories" ON public.categories
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Read categories" ON public.categories
  FOR SELECT TO authenticated
  USING (true);


-- curriculums
CREATE POLICY "Manage curriculums with permission" ON public.curriculums
  FOR ALL TO authenticated;

CREATE POLICY "Read curriculums in same group or admin" ON public.curriculums
  FOR SELECT TO authenticated;


-- daily_verse_dispatch_state
CREATE POLICY "Admin manage verse dispatch state" ON public.daily_verse_dispatch_state
  FOR ALL TO authenticated
  USING (is_admin_or_super_user());


-- daily_verses
CREATE POLICY "Authenticated read daily verses" ON public.daily_verses
  FOR SELECT TO authenticated
  USING (true);


-- exam_grades
CREATE POLICY "Read exam grades" ON public.exam_grades
  FOR SELECT TO authenticated;

CREATE POLICY "Servant with GRADE_EXAMS manage grades" ON public.exam_grades
  FOR ALL TO authenticated;


-- exams
CREATE POLICY "Admin manage exams" ON public.exams
  FOR ALL TO authenticated;

CREATE POLICY "Read exams in same group" ON public.exams
  FOR SELECT TO authenticated;


-- feed_posts
CREATE POLICY "Create feed posts Staff only" ON public.feed_posts
  FOR INSERT TO authenticated;

CREATE POLICY "Delete own feed post" ON public.feed_posts
  FOR DELETE TO authenticated;

CREATE POLICY "Edit own feed post" ON public.feed_posts
  FOR UPDATE TO authenticated;

CREATE POLICY "Read feed posts" ON public.feed_posts
  FOR SELECT TO authenticated;


-- gallery_albums
CREATE POLICY "Manage gallery albums" ON public.gallery_albums
  FOR ALL TO authenticated;

CREATE POLICY "Read gallery albums in same group" ON public.gallery_albums
  FOR SELECT TO authenticated;


-- gallery_items
CREATE POLICY "Manage gallery items" ON public.gallery_items
  FOR ALL TO authenticated;

CREATE POLICY "Read gallery items in same group" ON public.gallery_items
  FOR SELECT TO authenticated;


-- group_secretariat
CREATE POLICY "Admin manage secretariat assignments" ON public.group_secretariat
  FOR ALL TO authenticated;

CREATE POLICY "Read own secretariat assignment" ON public.group_secretariat
  FOR SELECT TO authenticated;


-- groups
CREATE POLICY "Public read for groups" ON public.groups
  FOR SELECT TO public
  USING (true);


-- import_history
CREATE POLICY "Admin manage import_history" ON public.import_history
  FOR ALL TO authenticated
  USING (is_admin_or_super_user());


-- lecturers
CREATE POLICY "Authenticated read lecturers" ON public.lecturers
  FOR SELECT TO authenticated
  USING (true);


-- lectures
CREATE POLICY "Manage lectures with permission" ON public.lectures
  FOR ALL TO authenticated;

CREATE POLICY "Read lectures in same group or admin" ON public.lectures
  FOR SELECT TO authenticated;


-- marathon_answers
CREATE POLICY "Manage marathon answers" ON public.marathon_answers
  FOR ALL TO authenticated
  USING (has_servant_permission('MANAGE_MARATHON'));

CREATE POLICY "Read marathon answers" ON public.marathon_answers
  FOR SELECT TO authenticated
  USING (true);


-- marathon_questions
CREATE POLICY "Manage marathon questions" ON public.marathon_questions
  FOR ALL TO authenticated;

CREATE POLICY "Read marathon questions" ON public.marathon_questions
  FOR SELECT TO authenticated
  USING (true);


-- marathon_sections
CREATE POLICY "Manage marathon sections" ON public.marathon_sections
  FOR ALL TO authenticated;

CREATE POLICY "Public read marathon sections" ON public.marathon_sections
  FOR SELECT TO public
  USING (true);


-- marathon_trainee_answers
CREATE POLICY "Trainee manage own marathon answers" ON public.marathon_trainee_answers
  FOR ALL TO authenticated;


-- marathon_trainee_submissions
CREATE POLICY "Trainee manage own marathon submission" ON public.marathon_trainee_submissions
  FOR ALL TO authenticated;


-- marathons
CREATE POLICY "Manage marathons with permission" ON public.marathons
  FOR ALL TO authenticated;

CREATE POLICY "Read marathons in same group" ON public.marathons
  FOR SELECT TO authenticated;


-- mp3_tracks
CREATE POLICY "Manage mp3 tracks" ON public.mp3_tracks
  FOR ALL TO authenticated;

CREATE POLICY "Read mp3 tracks in same group" ON public.mp3_tracks
  FOR SELECT TO authenticated;


-- notification_templates
CREATE POLICY "Admin delete" ON public.notification_templates
  FOR DELETE TO authenticated;

CREATE POLICY "Admin insert" ON public.notification_templates
  FOR INSERT TO authenticated;

CREATE POLICY "Admin update" ON public.notification_templates
  FOR UPDATE TO authenticated;

CREATE POLICY "Staff read" ON public.notification_templates
  FOR SELECT TO authenticated;


-- notifications
CREATE POLICY "Deny delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (false);

CREATE POLICY "Read own" ON public.notifications
  FOR SELECT TO authenticated;

CREATE POLICY "Update own" ON public.notifications
  FOR UPDATE TO authenticated;

CREATE POLICY "Users read own" ON public.notifications
  FOR SELECT TO authenticated;

CREATE POLICY "Users update own" ON public.notifications
  FOR UPDATE TO authenticated;


-- permissions
CREATE POLICY "Public read" ON public.permissions
  FOR SELECT TO public
  USING (true);


-- post_comments
CREATE POLICY "Delete own comment" ON public.post_comments
  FOR DELETE TO authenticated;

CREATE POLICY "Insert post comments" ON public.post_comments
  FOR INSERT TO authenticated;

CREATE POLICY "Read post comments" ON public.post_comments
  FOR SELECT TO authenticated;

CREATE POLICY "Update own comment" ON public.post_comments
  FOR UPDATE TO authenticated;


-- post_images
CREATE POLICY "Manage post images" ON public.post_images
  FOR ALL TO authenticated;

CREATE POLICY "Public read post images" ON public.post_images
  FOR SELECT TO public
  USING (true);


-- profiles
CREATE POLICY "Admin can manage all profiles" ON public.profiles
  FOR ALL TO authenticated;

CREATE POLICY "Users can update own basic profile" ON public.profiles
  FOR UPDATE TO authenticated;

CREATE POLICY "profiles_select_own_group" ON public.profiles
  FOR SELECT TO authenticated;


-- push_subscriptions
CREATE POLICY "Manage own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated;


-- reactions
CREATE POLICY "Manage reactions" ON public.reactions
  FOR ALL TO authenticated
  USING (user_id = auth.uid());


-- researches
CREATE POLICY "Authenticated read researches" ON public.researches
  FOR SELECT TO authenticated;

CREATE POLICY "Manage researches with permission" ON public.researches
  FOR ALL TO authenticated;


-- roles
CREATE POLICY "Public read for roles" ON public.roles
  FOR SELECT TO public
  USING (true);


-- servant_permissions
CREATE POLICY "Manage servant permissions" ON public.servant_permissions
  FOR ALL TO authenticated
  USING (is_admin_or_super_user());


-- terms
CREATE POLICY "Manage terms with permission" ON public.terms
  FOR ALL TO authenticated;

CREATE POLICY "Read terms in same group or admin" ON public.terms
  FOR SELECT TO authenticated;


-- user_favorites
CREATE POLICY "Manage favorites" ON public.user_favorites
  FOR ALL TO authenticated;

CREATE POLICY "Manage user favorites" ON public.user_favorites
  FOR ALL TO authenticated;


-- word_dictionary_mappings
CREATE POLICY "Public read word dictionary mappings" ON public.word_dictionary_mappings
  FOR SELECT TO public
  USING (true);



-- ============================================================================
-- 7. MIGRATIONS APPLIED (68)
-- ============================================================================
-- Listed in application order.

--   1. 001_extensions
--   2. 002_core_roles_groups
--   3. 003_profiles_auth_mapping
--   4. 004_permissions_secretariat
--   5. 005_academic_terms_lectures
--   6. 006_attendance
--   7. 007_exams_grades
--   8. 008_marathons
--   9. 009_feed_social
--  10. 010_notifications_verses
--  11. 011_library_media
--  12. 012_bible_local
--  13. 013_audit_backup_import
--  14. 014_indexes_functions_triggers
--  15. 015_rls_policies
--  16. 016_seed_data
--  17. 017_seed_test_accounts
--  18. 018_populate_test_accounts
--  19. 019_fix_auth_identities
--  20. 020_repopulate_test_accounts
--  21. 021_fix_gotrue_users
--  22. 022_set_default_auth_uid
--  23. 023_academic_attendance_engine
--  24. 024_attendance_thursday_lock
--  25. 025_attendance_summary_rpc
--  26. 026_marathon_engine_rpcs
--  27. 027_marathon_sections_rls
--  28. 028_marathon_timestamps
--  29. 029_fix_servant_permissions_rls
--  30. 030_feed_interactions_rpcs
--  31. 032_fix_feed_rpcs
--  32. 033_feed_content_columns
--  33. 034_create_post_images_table
--  34. 035_update_library_media_scope
--  35. 036_bible_dictionary_and_rpcs
--  36. 038_seed_all_bible_books
--  37. 039_seed_bible_sources
--  38. 037_seed_full_bible_chapters
--  39. 040_backup_restore_import_engine
--  40. 041_backup_restore_trainee_bulk_rpc
--  41. 042_fix_bulk_import_rpc_and_audit_rls
--  42. 043_fix_bulk_import_columns
--  43. 044_fix_auth_identities_columns
--  44. 045_notification_engine_rpcs
--  45. 046_group_and_profile_rpcs
--  46. 047_servants_drilldown_rpc
--  47. 048_seed_full_groups_data
--  48. 049_fix_trainee_full_profile_rpc
--  49. 050_fix_exam_grades_column_rpc
--  50. 051_fix_marathon_in_trainee_profile_rpc
--  51. 052_fix_marathon_status_rpc
--  52. revoke_anon_security_definer
--  53. close_self_escalation
--  54. close_self_escalation_v2
--  55. close_self_escalation_stage2
--  56. rpc_group_scope_guards
--  57. pastoral_template_admin_only
--  58. revoke_anon_execute_on_group_rpcs
--  59. fix_null_propagation_fail_open_authz
--  60. backfill_app_metadata_from_profiles
--  61. drop_create_test_user
--  62. logical_restore_rpcs
--  63. logical_restore_rpcs_patch_update_existing_v1
--  64. logical_restore_rpcs_patch_update_existing_v2
--  65. logical_restore_rpcs_patch_update_existing_v3
--  66. sync_profile_app_metadata
--  67. logical_export_rpcs
--  68. revoke_public_execute_on_data_reading_rpcs

-- ============================================================================
-- END OF SNAPSHOT
-- ============================================================================