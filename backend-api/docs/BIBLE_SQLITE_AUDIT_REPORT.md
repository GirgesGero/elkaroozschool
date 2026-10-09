# Bible Encyclopedia SQLite - Comprehensive Audit Report

**Date:** 2026-10-06 17:32  
**Project:** EL KAROOZ School  
**Objective:** Convert SQLite to Distributed Static Data Architecture on Google Drive

---

## Executive Summary

✅ **SQLite Location:** `backend-api/storage/bible/database/bible_encyclopedia.sqlite`  
✅ **File Size:** 1,179,439,104 bytes (1.10 GB)  
✅ **Total Articles:** 49,249  
✅ **Content Size:** 254.37 MB (pure text)  
✅ **FTS5 Index:** Active with 17,565 results for test query "المسيح"

---

## PHASE 0.1: Database Schema

### Tables (9 total)

| Table | Type | Rows | Purpose |
|-------|------|------|---------|
| `articles` | Data | 49,249 | Main article content |
| `categories` | Data | 4 | Top-level categories |
| `sections` | Data | 37 | Sub-categories |
| `fts_articles` | FTS5 Virtual | 49,249 | Full-text search index |
| `fts_articles_config` | FTS5 Internal | 1 | FTS5 configuration |
| `fts_articles_content` | FTS5 Internal | 49,249 | FTS5 content storage |
| `fts_articles_data` | FTS5 Internal | 44,904 | FTS5 index data |
| `fts_articles_docsize` | FTS5 Internal | 49,249 | FTS5 document sizes |
| `fts_articles_idx` | FTS5 Internal | 35,110 | FTS5 term index |

**Total Rows:** 277,052 (including FTS5 internals)

### Schema Details

#### `articles` Table (PRIMARY DATA)

```sql
CREATE TABLE articles (
    id INTEGER PRIMARY KEY,
    section_id INTEGER DEFAULT 1,
    slug TEXT,
    title TEXT NOT NULL,
    subtitle TEXT,
    book_name TEXT,
    chapter_num INTEGER,
    total_chapters INTEGER DEFAULT 1,
    author TEXT,
    file_path TEXT,
    content TEXT NOT NULL,
    views_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_art_book` on `book_name`
- `idx_art_title` on `title`
- `idx_art_slug` on `slug`
- `idx_art_path` on `file_path`

**Key Statistics:**
- Total articles: 49,249
- Unique slugs: 49,249 (no duplicates)
- Content range: 0 - 442,531 chars
- Average content: 5,416 chars
- Total content size: 254.37 MB

#### `categories` Table

```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT,
    icon TEXT DEFAULT '🏛️',
    display_order INTEGER DEFAULT 0
);
```

**Data (4 categories):**

| ID | Code | Title | Subtitle | Icon |
|----|------|-------|----------|------|
| 1 | bible | الكتاب المقدس والتراجم | أسفار العهدين وتراجم اللغات القديمة والحديثة | 📜 |
| 2 | commentaries | التفاسير والعلوم الآبائية | شروحات الآباء ومدرسة الإسكندرية اللاهوتية | 📖 |
| 3 | refs | المعاجم والأطلس والتاريخ | قاموس الأعلام، جغرافية الكتاب، وتاريخ الكنيسة | 🗺️ |
| 4 | theology | اللاهوتيات والعقائد والدفاعيات | اللاهوت المقارن، العقيدة، والرد على الشبهات | ✝️ |

#### `sections` Table

```sql
CREATE TABLE sections (
    id INTEGER PRIMARY KEY,
    category_id INTEGER,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    icon TEXT DEFAULT '📁',
    doc_count INTEGER DEFAULT 0,
    description TEXT,
    display_order INTEGER DEFAULT 0
);
```

**Total Sections:** 37

**Top 10 Sections by Article Count:**

| Section ID | Code | Title | Articles | Avg Content |
|------------|------|-------|----------|-------------|
| 3 | sec-03 | قاموس الكتاب المقدس | 15,873 | 1,336 chars |
| 1 | sec-01 | الكتاب المقدس | 9,399 | 2,418 chars |
| 2 | sec-02 | تفسير الكتاب المقدس | 5,651 | 15,740 chars |
| 10 | sec-10 | صلوات الكنيسة القبطية | 2,692 | 4,566 chars |
| 8 | sec-08 | شخصيات الكنيسة | 2,087 | 1,727 chars |
| 15 | sec-15 | علم الأباء | 1,377 | 9,133 chars |
| 37 | sec-holy-bible-complete | الكتاب المقدس الكامل | 1,336 | 5,097 chars |
| 14 | sec-14 | المسيحية والإسلام | 1,326 | 12,135 chars |
| 12 | sec-12 | كتب أبوكريفا | 1,068 | 4,962 chars |
| 5 | sec-05 | شبهات الكتاب المقدس | 1,067 | 10,957 chars |

---

## PHASE 0.2: Data Distribution Analysis

### Articles by Category

| Category | Sections | Articles | % of Total |
|----------|----------|----------|------------|
| 1. Bible & Translations | 17 | ~17,359 | 35.2% |
| 2. Commentaries | 3 | ~7,477 | 15.2% |
| 3. Dictionary & Atlas | 5 | ~19,105 | 38.8% |
| 4. Theology | 12 | ~5,308 | 10.8% |

### Content Size Distribution

| Metric | Value |
|--------|-------|
| Smallest article | 0 chars |
| Largest article | 442,531 chars (432 KB) |
| Average article | 5,416 chars (~5.3 KB) |
| Median article | ~2,400 chars (estimated) |
| Total text content | 254.37 MB |
| SQLite overhead | 1.10 GB - 254 MB = ~870 MB (indexes, FTS5, metadata) |

---

## PHASE 0.3: Books & Chapters Structure

### Analysis

⚠️ **IMPORTANT FINDING:** This is **NOT a traditional Bible verse database**.

- Total books found: 20
- Most entries are **encyclopedia articles**, not verses
- `book_name` and `chapter_num` are used for **article organization**, not biblical verses
- Example: "سفر التكوين - إصحاح 3" is an **article ABOUT Genesis Chapter 3**, not the verses themselves

### Top Books

| Book | Chapters | Articles | Type |
|------|----------|----------|------|
| أ | 3 | 2,550 | Dictionary entries (letter A) |
| م | 4 | 1,553 | Dictionary entries (letter M) |
| ب | 3 | 1,433 | Dictionary entries (letter B) |
| سفر المزامير | 152 | 1,056 | Psalm commentaries |
| أسئلة مسيحية | 3 | 618 | Christian Q&A |

**Conclusion:** The "chapters" represent **article pagination/grouping**, not biblical chapters.

---

## PHASE 0.4: FTS5 Full-Text Search

### Configuration

**FTS5 Virtual Table:** `fts_articles`

**Indexed Columns:**
- `raw_title` - Original title
- `title` - Processed title
- `body` - Article content
- `path` - File path
- `section` - Section name

### Performance Test

**Query:** "المسيح" (Christ)  
**Results:** 17,565 articles (35.7% of total)  
**Response Time:** < 50ms (estimated from previous tests)

### FTS5 Storage Breakdown

| Component | Rows | Purpose |
|-----------|------|---------|
| `fts_articles` | 49,249 | Virtual table interface |
| `fts_articles_content` | 49,249 | Stored content |
| `fts_articles_data` | 44,904 | Index blocks |
| `fts_articles_docsize` | 49,249 | Document sizes for ranking |
| `fts_articles_idx` | 35,110 | Term index (segid + term + pgno) |

**Estimated FTS5 Size:** ~870 MB (75% of total SQLite file)

---

## PHASE 0.5: Relationships & Foreign Keys

### Schema Relationships

```
categories (4)
    ↓ category_id
sections (37)
    ↓ section_id
articles (49,249)
```

**Foreign Keys:** 
- `articles.section_id` → `sections.id` (implicit, no FK constraint)
- `sections.category_id` → `categories.id` (implicit, no FK constraint)

**Orphaned Articles:** 0 (all articles have valid section_id)

---

## PHASE 0.6: Existing JSON/Cache Files

Checking for existing data files...

```
backend-api/storage/bible/
├── database/
│   └── bible_encyclopedia.sqlite (1.10 GB)
├── data/
│   ├── tree_data.json (787 KB) ✅ Exists
│   ├── sections.json (6 KB) ✅ Exists
│   ├── search.json (9.6 MB) ✅ Exists
│   └── takla_bible_cache/ (1,341 files, 30 MB) ✅ Exists
└── images/ (15 files, 11.5 MB) ✅ Exists
```

**Finding:** Pre-built JSON indexes already exist!

---

## PHASE 0.7: Key Findings & Constraints

### ✅ What We Have

1. **Comprehensive Encyclopedia:** 49,249 articles covering:
   - Biblical commentaries
   - Dictionary of biblical terms
   - Church fathers' writings
   - Theological topics
   - Church history
   - Prayers & liturgy

2. **Rich Metadata:**
   - 4 categories
   - 37 sections
   - Unique slugs for every article
   - Book/chapter structure for navigation
   - File paths for source tracking

3. **Powerful Search:**
   - FTS5 full-text index
   - Multi-column search (title + body + path + section)
   - ~870 MB index data (75% of SQLite)

4. **Existing Indexes:**
   - Pre-built JSON files already exist
   - 1,341 cached article files
   - Images already separated

### ❌ What We DON'T Have

1. **NOT a verse database:**
   - No `books` table
   - No `chapters` table
   - No `verses` table
   - Book/chapter fields are for article organization only

2. **No images in SQLite:**
   - All images are external (good!)
   - Already in `storage/bible/images/`

3. **No triggers, views, or complex logic:**
   - Simple relational structure
   - Safe to export without losing functionality

---

## PHASE 1: Recommended Architecture Design

### Strategy: Hybrid Chunked Distribution

Based on the audit, I recommend:

### 1. **Chunk by Section (Not Article)**

**Rationale:**
- Section 3 (قاموس): 15,873 articles × 1,336 chars avg = ~21 MB → Split into ~20 chunks (~1 MB each)
- Section 2 (تفسير): 5,651 articles × 15,740 chars avg = ~89 MB → Split into ~90 chunks (~1 MB each)
- Small sections (< 100 articles): Single chunk

**Formula:**
```
chunk_size = 1 MB target
chunks_per_section = CEIL(section_content_size / 1MB)
articles_per_chunk = CEIL(section_article_count / chunks_per_section)
```

### 2. **Search Index: Pre-computed Term → Article ID Map**

**Instead of:**
- Downloading 870 MB FTS5 index
- Running SQLite queries on client

**Do:**
- Extract FTS5 term index → JSON
- Build inverted index: `{term: [article_ids]}`
- Split by term frequency:
  - Common terms (> 1000 articles): Separate files
  - Rare terms: Grouped files

**Estimated Search Index Size:** 30-50 MB (compressed)

### 3. **Proposed Directory Structure**

```
BIBLE/
├── manifest.json                      # Dataset metadata + version
├── categories.json                    # 4 categories (< 1 KB)
├── sections.json                      # 37 sections (< 10 KB)
│
├── articles/
│   ├── sec-01/
│   │   ├── chunk-001.json            # Articles 1-500
│   │   ├── chunk-002.json            # Articles 501-1000
│   │   └── ...
│   ├── sec-02/
│   │   ├── chunk-001.json            # Articles 1-100 (larger content)
│   │   └── ...
│   ├── sec-03/
│   │   ├── chunk-001.json            # Dictionary A-B
│   │   ├── chunk-002.json            # Dictionary C-D
│   │   └── ...
│   └── ...
│
├── indexes/
│   ├── article-map.json              # article_id → chunk_path
│   ├── slug-map.json                 # slug → article_id
│   ├── book-chapters.json            # book_name → [chapters]
│   └── section-stats.json            # pre-computed stats
│
├── search/
│   ├── search-manifest.json          # term → index file map
│   ├── common-terms/
│   │   ├── المسيح.json               # High-frequency term
│   │   ├── الله.json
│   │   └── ...
│   ├── terms-a.json                  # Terms starting with A
│   ├── terms-b.json                  # Terms starting with B
│   └── ...
│
└── images/
    ├── atlas/
    └── icons/
```

### 4. **Chunk Size Targets**

| Chunk Type | Target Size | Reason |
|------------|-------------|--------|
| Articles | 500 KB - 1 MB | Balance between requests & size |
| Search index | 100 KB - 500 KB | Fast term lookup |
| Metadata | < 100 KB | Single request |
| Images | Original size | Lazy load |

### 5. **API Endpoints Design**

```
GET /api/bible/manifest
→ Returns: dataset version, total articles, chunk map

GET /api/bible/categories
→ Returns: 4 categories (cached forever)

GET /api/bible/sections?category_id=1
→ Returns: sections for category (cached forever)

GET /api/bible/article/{id}
→ Logic: lookup chunk → load from cache/Drive → extract article

GET /api/bible/article/slug/{slug}
→ Logic: slug-map → article_id → chunk → article

GET /api/bible/section/{section_id}/articles?page=1&limit=20
→ Returns: article metadata only (title, id, slug, excerpt)

GET /api/bible/search?q=المسيح&page=1&limit=20
→ Logic: term lookup → article IDs → load metadata

GET /api/bible/chunk/{section}/{chunk_id}
→ Direct chunk access (for prefetch)
```

### 6. **Cache Strategy**

**Local PHP Cache:**
```
/storage/bible-cache/
├── v2026-10/                         # Version-based cache
│   ├── metadata/
│   │   ├── manifest.json
│   │   ├── categories.json
│   │   └── sections.json
│   ├── chunks/
│   │   ├── sec-01-chunk-001.json
│   │   ├── sec-01-chunk-002.json
│   │   └── ...
│   ├── search/
│   │   ├── terms-a.json
│   │   └── ...
│   └── images/
│       └── ...
└── .cache-manifest.json              # Track cache state
```

**Cache Policy:**
- **Metadata:** Cache forever (immutable per version)
- **Article chunks:** LRU cache, max 50 MB
- **Search indexes:** Cache hot terms only
- **Images:** CDN/browser cache, 1 year

**Cache Invalidation:**
- Version bump → new cache directory
- Old version remains until cleanup
- Atomic switch via manifest

---

## PHASE 2: Estimated Sizes

### After Conversion

| Component | Size (Compressed) | Files |
|-----------|-------------------|-------|
| Manifest | < 10 KB | 1 |
| Categories | < 1 KB | 1 |
| Sections | < 10 KB | 1 |
| Article Chunks | ~260 MB | ~300 files |
| Article Map | ~3 MB | 1 |
| Slug Map | ~3 MB | 1 |
| Book/Chapter Index | ~500 KB | 1 |
| Search Index | ~40 MB | ~100 files |
| Images | 11.5 MB | 15 files |
| **TOTAL** | **~320 MB** | **~420 files** |

**Compression Savings:** 1.10 GB → 320 MB (~71% reduction)

### Request Analysis

| Operation | Requests | Data Transferred |
|-----------|----------|------------------|
| Open Bible Hub | 2 | ~11 KB (manifest + categories) |
| Browse Section | 1 | ~100 KB (metadata + first 20 articles) |
| Open Article | 1-2 | ~500 KB - 1 MB (chunk + images if any) |
| Search "المسيح" | 2-3 | ~500 KB (term index + first page metadata) |
| Navigate prev/next | 0-1 | 0 (same chunk) or ~500 KB (new chunk) |

**vs. Current SQLite:**
- ❌ Would need: 1.10 GB download
- ✅ Will need: < 1 MB per operation

---

## PHASE 3: Migration Plan

### Step 1: Build Dataset

```bash
php backend-api/scripts/build-bible-dataset.php
```

**Actions:**
1. Read SQLite
2. Extract articles by section
3. Chunk by target size (1 MB)
4. Build article-map & slug-map
5. Extract FTS5 terms → inverted index
6. Build search index files
7. Generate manifest
8. Validate (count articles, check integrity)
9. Calculate checksums
10. Output to `/storage/bible-dataset/v2026-10/`

### Step 2: Upload to Google Drive

```bash
php backend-api/scripts/upload-bible-to-drive.php
```

**Actions:**
1. Connect to Google Drive via MCP
2. Create folder: `EL KAROOZ SCHOOL STORAGE/BIBLE/v2026-10/`
3. Upload files (with progress)
4. Verify uploads (checksum)
5. Generate Drive manifest (file_id map)
6. Save Drive manifest locally

### Step 3: Update PHP Backend

1. Create `BibleDataService`
2. Implement chunk loading
3. Implement cache manager
4. Update `BibleController` endpoints
5. Add search endpoint

### Step 4: Test & Validate

1. Test all API endpoints
2. Benchmark performance
3. Test cache hit/miss
4. Test Google Drive fallback
5. Validate article counts
6. Validate search results

### Step 5: Update Frontend

1. Keep existing API calls (backward compatible)
2. Add pagination support
3. Add prefetch for next article
4. Update loading states

---

## PHASE 4: Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during conversion | HIGH | Keep original SQLite untouched, validate counts |
| Search quality degradation | MEDIUM | Pre-test search results against SQLite FTS5 |
| Google Drive API limits | MEDIUM | Implement aggressive local caching |
| Slow first load (cache cold) | LOW | Prefetch hot chunks on deployment |
| Large article chunks | LOW | Monitor real usage, adjust chunk size |
| Too many small files | LOW | Group small sections into single chunks |

---

## PHASE 5: Success Criteria

### ✅ Must Pass

- [ ] Total articles == 49,249
- [ ] All article content preserved
- [ ] All slugs unique & working
- [ ] All categories/sections intact
- [ ] Search returns same results as SQLite FTS5 (top 100)
- [ ] No single request > 2 MB
- [ ] No operation requires > 5 requests
- [ ] Cache hit ratio > 80% after warm-up
- [ ] Average response time < 200ms
- [ ] Frontend loads Bible Hub in < 1s

### ⭐ Nice to Have

- [ ] Compression ratio > 70%
- [ ] Search response < 100ms
- [ ] Article load < 50ms (cached)
- [ ] Mobile 4G load time < 2s
- [ ] Browser cache efficiency > 90%

---

## Next Steps

1. ✅ **Audit Complete** (this document)
2. ⏳ **Await Approval** for architecture design
3. 🔄 **Build Migration Script**
4. 🔄 **Test Dataset Generation**
5. 🔄 **Validate Data Integrity**
6. 🔄 **Upload to Google Drive**
7. 🔄 **Update Backend API**
8. 🔄 **Performance Benchmark**
9. 🔄 **Frontend Integration**
10. 🔄 **Production Deployment**

---

## Appendix A: Sample Data

### Sample Article (ID: 5)

```json
{
  "id": 5,
  "section_id": 1,
  "slug": "genesis-3",
  "title": "الإصحَاحُ الثَّالِثُ",
  "subtitle": null,
  "book_name": "سفر التكوين",
  "chapter_num": 4,
  "total_chapters": 50,
  "author": null,
  "content": "...(1,962 chars)...",
  "views_count": 0,
  "created_at": "2024-01-01 00:00:00"
}
```

### Sample Search Result

```json
{
  "term": "المسيح",
  "total_results": 17565,
  "results": [
    {
      "article_id": 1234,
      "title": "يسوع المسيح",
      "snippet": "...نؤمن بربنا <mark>المسيح</mark> يسوع...",
      "rank": 0.95,
      "chunk": "sec-23/chunk-012"
    }
  ]
}
```

---

**Report End**  
**Generated:** 2026-10-06 17:32  
**Status:** ✅ Ready for Phase 1 Design Approval
