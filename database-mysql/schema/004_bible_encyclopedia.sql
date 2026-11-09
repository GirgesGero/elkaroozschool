-- =============================================================================
-- EL KAROOZ SCHOOL — MySQL 8.0+ Enterprise Schema
-- Part 4: Canonical Bible Engine & Patristic Encyclopedia
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Bible Testaments (Old / New / Deuterocanonical)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_testaments (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name_ar VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    order_num INT NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_testaments_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Bible Books (Canonical 73 Books)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_books (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    testament_id SMALLINT UNSIGNED NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    chapters_count INT NOT NULL DEFAULT 1,
    order_num INT NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_books_code (code),
    INDEX idx_bible_books_testament (testament_id),
    INDEX idx_bible_books_order (order_num),
    CONSTRAINT fk_bible_books_testament FOREIGN KEY (testament_id) REFERENCES bible_testaments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Bible Chapters
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_chapters (
    id CHAR(36) NOT NULL,
    book_id SMALLINT UNSIGNED NOT NULL,
    chapter_number INT NOT NULL,
    verses_count INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_book_chapter (book_id, chapter_number),
    INDEX idx_bible_chapters_book (book_id),
    CONSTRAINT fk_bible_chapters_book FOREIGN KEY (book_id) REFERENCES bible_books (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Bible Verses (Verbatim Text Preservation Law)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_verses (
    id CHAR(36) NOT NULL,
    chapter_id CHAR(36) NOT NULL,
    verse_number INT NOT NULL,
    text_ar TEXT NOT NULL,
    text_clean TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_chapter_verse (chapter_id, verse_number),
    INDEX idx_bible_verses_chapter (chapter_id),
    FULLTEXT INDEX ft_bible_verses_clean (text_clean),
    CONSTRAINT fk_bible_verses_chapter FOREIGN KEY (chapter_id) REFERENCES bible_chapters (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Positional Verse Words (Interactive Patristic Word Breakdown)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_verse_words (
    id CHAR(36) NOT NULL,
    verse_id CHAR(36) NOT NULL,
    word_position INT NOT NULL,
    word_ar VARCHAR(100) NOT NULL,
    has_commentary TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_verse_word_position (verse_id, word_position),
    INDEX idx_verse_words_verse (verse_id),
    INDEX idx_verse_words_commentary (has_commentary),
    CONSTRAINT fk_verse_words_verse FOREIGN KEY (verse_id) REFERENCES bible_verses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Patristic Commentary Sources (Fathers, Exegesis, Manuscripts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_sources (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name_ar VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NULL,
    source_url TEXT NULL,
    description TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Verse Commentaries (Full Contextual Commentary per Verse)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_commentaries (
    id CHAR(36) NOT NULL,
    verse_id CHAR(36) NOT NULL,
    source_id SMALLINT UNSIGNED NOT NULL,
    commentary_text MEDIUMTEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_verse_commentary_source (verse_id, source_id),
    INDEX idx_commentaries_verse (verse_id),
    INDEX idx_commentaries_source (source_id),
    FULLTEXT INDEX ft_commentary_text (commentary_text),
    CONSTRAINT fk_commentaries_verse FOREIGN KEY (verse_id) REFERENCES bible_verses (id) ON DELETE CASCADE,
    CONSTRAINT fk_commentaries_source FOREIGN KEY (source_id) REFERENCES bible_sources (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Word-Level Contextual Commentaries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_word_commentaries (
    id CHAR(36) NOT NULL,
    word_id CHAR(36) NOT NULL,
    source_id SMALLINT UNSIGNED NOT NULL,
    commentary_text TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_word_comm_word (word_id),
    INDEX idx_word_comm_source (source_id),
    CONSTRAINT fk_word_comm_word FOREIGN KEY (word_id) REFERENCES bible_verse_words (id) ON DELETE CASCADE,
    CONSTRAINT fk_word_comm_source FOREIGN KEY (source_id) REFERENCES bible_sources (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Universal Biblical Dictionary & Glossary Entries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_dictionary_entries (
    id CHAR(36) NOT NULL,
    term_ar VARCHAR(255) NOT NULL,
    definition MEDIUMTEXT NOT NULL,
    source_id SMALLINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_dict_term (term_ar),
    INDEX idx_dict_source (source_id),
    FULLTEXT INDEX ft_dict_def (definition),
    CONSTRAINT fk_dict_source FOREIGN KEY (source_id) REFERENCES bible_sources (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Word-to-Dictionary Mapping Junction
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS word_dictionary_mappings (
    id CHAR(36) NOT NULL,
    word_id CHAR(36) NOT NULL,
    entry_id CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_word_dict_mapping (word_id, entry_id),
    INDEX idx_wdm_word (word_id),
    INDEX idx_wdm_entry (entry_id),
    CONSTRAINT fk_wdm_word FOREIGN KEY (word_id) REFERENCES bible_verse_words (id) ON DELETE CASCADE,
    CONSTRAINT fk_wdm_entry FOREIGN KEY (entry_id) REFERENCES bible_dictionary_entries (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Content Version Ledger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bible_content_versions (
    id CHAR(36) NOT NULL,
    version_tag VARCHAR(50) NOT NULL,
    release_notes TEXT NULL,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_bible_version_tag (version_tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
