-- 012_bible_local.sql
-- Complete Local Bible Schema, Verses, Words, Commentaries and St. Takla Sources

CREATE TABLE IF NOT EXISTS public.bible_testaments (
    id SMALLINT PRIMARY KEY, -- 1 = Old Testament, 2 = New Testament
    code VARCHAR(10) NOT NULL UNIQUE,
    name_ar VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    order_index INT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bible_books (
    id INT PRIMARY KEY,
    testament_id SMALLINT NOT NULL REFERENCES public.bible_testaments(id),
    code VARCHAR(10) NOT NULL UNIQUE,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    chapters_count INT NOT NULL DEFAULT 1,
    order_index INT NOT NULL,
    source_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bible_chapters (
    id BIGSERIAL PRIMARY KEY,
    book_id INT NOT NULL REFERENCES public.bible_books(id) ON DELETE CASCADE,
    chapter_number INT NOT NULL,
    verses_count INT NOT NULL DEFAULT 0,
    source_url TEXT NOT NULL,
    CONSTRAINT uq_book_chapter UNIQUE (book_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS public.bible_verses (
    id BIGSERIAL PRIMARY KEY,
    chapter_id BIGINT NOT NULL REFERENCES public.bible_chapters(id) ON DELETE CASCADE,
    book_id INT NOT NULL REFERENCES public.bible_books(id) ON DELETE CASCADE,
    verse_number INT NOT NULL,
    text_ar TEXT NOT NULL,
    text_clean TEXT NOT NULL,
    source_url TEXT NOT NULL,
    CONSTRAINT uq_chapter_verse UNIQUE (chapter_id, verse_number)
);

CREATE TABLE IF NOT EXISTS public.bible_verse_words (
    id BIGSERIAL PRIMARY KEY,
    verse_id BIGINT NOT NULL REFERENCES public.bible_verses(id) ON DELETE CASCADE,
    word_position INT NOT NULL,
    word_text VARCHAR(100) NOT NULL,
    clean_word VARCHAR(100) NOT NULL,
    has_commentary BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_verse_word_pos UNIQUE (verse_id, word_position)
);

CREATE TABLE IF NOT EXISTS public.bible_sources (
    id VARCHAR(64) PRIMARY KEY,
    author_name VARCHAR(150) NOT NULL,
    source_name VARCHAR(200) NOT NULL,
    base_url TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.bible_commentaries (
    id BIGSERIAL PRIMARY KEY,
    verse_id BIGINT NOT NULL REFERENCES public.bible_verses(id) ON DELETE CASCADE,
    source_id VARCHAR(64) NOT NULL REFERENCES public.bible_sources(id) ON DELETE CASCADE,
    commentary_title VARCHAR(250),
    commentary_text TEXT NOT NULL,
    source_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bible_word_commentaries (
    id BIGSERIAL PRIMARY KEY,
    word_id BIGINT NOT NULL REFERENCES public.bible_verse_words(id) ON DELETE CASCADE,
    source_id VARCHAR(64) NOT NULL REFERENCES public.bible_sources(id) ON DELETE CASCADE,
    explanation_title VARCHAR(200),
    explanation_text TEXT NOT NULL,
    source_url TEXT NOT NULL
);
