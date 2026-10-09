// frontend/src/lib/server/bible-service.ts
// Native Node.js / Next.js Server-side Bible Encyclopedia Service (High Performance Static Reader)

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export interface BibleCategory {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  icon: string;
  display_order: number;
  sections?: BibleSection[];
}

export interface BibleSection {
  id: number;
  category_id: number;
  code: string;
  title: string;
  icon: string;
  doc_count: number;
  description: string;
  display_order: number;
  category_title?: string;
  category_code?: string;
}

export interface BibleSectionArticleSummary {
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  book?: string | null;
  ch?: number | null;
}

export interface BibleArticle {
  id: number;
  section_id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  book_name?: string | null;
  chapter_num: number;
  total_chapters: number;
  author?: string | null;
  content: string;
  formatted_html?: string;
  views_count: number;
  created_at: string;
  section_title?: string;
  section_code?: string;
  category_title?: string;
  category_code?: string;
  prev_id?: number | null;
  next_id?: number | null;
  prev_article?: {
    id: number;
    title: string;
    slug: string;
    book_name?: string;
    chapter_num?: number;
  } | null;
  next_article?: {
    id: number;
    title: string;
    slug: string;
    book_name?: string;
    chapter_num?: number;
  } | null;
}

export interface BibleSearchResult {
  id: number;
  section_id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  book_name?: string | null;
  chapter_num?: number | null;
  section_title?: string;
  section_icon?: string;
  category_title?: string;
  snippet: string;
  score?: number;
}

export interface BibleSearchResponse {
  query: string;
  normalized_query?: string;
  scope?: string;
  total: number;
  page?: number;
  limit: number;
  total_pages?: number;
  results: BibleSearchResult[];
  items?: BibleSearchResult[];
}

export interface BibleStats {
  total_articles: number;
  total_sections: number;
  total_categories: number;
  dataset_version: string;
  daily_verse: {
    text: string;
    ref?: string;
    reference?: string;
    theme?: string;
  };
}

// CRC32 Lookup table
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c;
}

function calculateCrc32(str: string): number {
  let crc = 0 ^ (-1);
  const buf = Buffer.from(str, 'utf8');
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

class BibleService {
  private baseDir: string;
  private manifestCache: any = null;
  private categoriesCache: BibleCategory[] | null = null;
  private sectionsCache: BibleSection[] | null = null;
  private articleMapCache: Record<string, { s: number; c: string; p: number }> | null = null;
  private slugMapCache: Record<string, number> | null = null;
  private titleIndexCache: Record<string, number[]> | null = null;
  private sectionArticlesCache: Map<string, BibleSectionArticleSummary[]> = new Map();
  private chunksCache: Map<string, any> = new Map();
  private shardsCache: Map<number, Record<string, number[]>> = new Map();

  constructor() {
    // Locate the dataset directory across different runtime environments (dev, build, serverless)
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'storage', 'bible-dataset', 'v1'),
      path.join(process.cwd(), 'frontend', 'public', 'storage', 'bible-dataset', 'v1'),
      path.join(__dirname, '..', '..', '..', 'public', 'storage', 'bible-dataset', 'v1'),
    ];

    let found = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p) && fs.existsSync(path.join(p, 'manifest.json'))) {
        found = p;
        break;
      }
    }

    this.baseDir = found || possiblePaths[0];
  }

  private readJsonOrGz(relPath: string): any {
    const fullPath = path.join(this.baseDir, relPath);
    
    // Check if plain .json exists
    if (fs.existsSync(fullPath)) {
      try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(raw);
      } catch (e) {
        console.error(`Failed to parse json at ${fullPath}:`, e);
      }
    }

    // Check if .json.gz exists
    const gzPath = fullPath.endsWith('.gz') ? fullPath : `${fullPath}.gz`;
    if (fs.existsSync(gzPath)) {
      try {
        const buf = fs.readFileSync(gzPath);
        const decompressed = zlib.gunzipSync(buf).toString('utf8');
        return JSON.parse(decompressed);
      } catch (e) {
        console.error(`Failed to parse gz at ${gzPath}:`, e);
      }
    }

    return null;
  }

  public getManifest(): any {
    if (!this.manifestCache) {
      this.manifestCache = this.readJsonOrGz('manifest.json') || {
        dataset_version: 'v1.0.0',
        statistics: { article_count: 47923, section_count: 36, category_count: 4 }
      };
    }
    return this.manifestCache;
  }

  public getCategories(): BibleCategory[] {
    if (!this.categoriesCache) {
      const data = this.readJsonOrGz('categories.json');
      this.categoriesCache = Array.isArray(data) ? data : [];
    }
    return this.categoriesCache || [];
  }

  public getSections(categoryCode?: string): BibleSection[] {
    if (!this.sectionsCache) {
      const data = this.readJsonOrGz('sections.json');
      this.sectionsCache = Array.isArray(data) ? data : [];
    }

    const allSections = this.sectionsCache || [];
    if (!categoryCode) {
      return allSections;
    }

    const categories = this.getCategories();
    const targetCat = categories.find(c => c.code === categoryCode);
    if (!targetCat) return [];

    return allSections.filter(s => s.category_id === targetCat.id);
  }

  public getCategoriesAndSections(): BibleCategory[] {
    const categories = this.getCategories();
    const sections = this.getSections();

    const sectionsByCat = new Map<number, BibleSection[]>();
    for (const s of sections) {
      const list = sectionsByCat.get(s.category_id) || [];
      list.push(s);
      sectionsByCat.set(s.category_id, list);
    }

    return categories.map(cat => ({
      ...cat,
      sections: sectionsByCat.get(cat.id) || []
    }));
  }

  public getSectionArticles(sectionId: number, page: number = 1, limit: number = 20) {
    const sections = this.getSections();
    const section = sections.find(s => s.id === sectionId);
    const secCode = section ? section.code : (sectionId < 10 ? `sec-0${sectionId}` : `sec-${sectionId}`);

    let items = this.sectionArticlesCache.get(secCode);
    if (!items) {
      const data = this.readJsonOrGz(`indexes/sections/${secCode}.json`);
      items = Array.isArray(data) ? data : [];
      this.sectionArticlesCache.set(secCode, items);
    }

    const total = items.length;
    const offset = Math.max(0, (page - 1) * limit);
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      section_id: sectionId,
      section_code: secCode,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / Math.max(1, limit)),
      items: paginatedItems
    };
  }

  private getArticleMap(): Record<string, { s: number; c: string; p: number }> {
    if (!this.articleMapCache) {
      const data = this.readJsonOrGz('indexes/article-map.json');
      this.articleMapCache = (data && typeof data === 'object') ? data : {};
    }
    return this.articleMapCache || {};
  }

  private getSlugMap(): Record<string, number> {
    if (!this.slugMapCache) {
      const data = this.readJsonOrGz('indexes/slug-map.json');
      this.slugMapCache = (data && typeof data === 'object') ? data : {};
    }
    return this.slugMapCache || {};
  }

  private getTitleIndex(): Record<string, number[]> {
    if (!this.titleIndexCache) {
      const data = this.readJsonOrGz('search/title-index.json');
      this.titleIndexCache = (data && typeof data === 'object') ? data : {};
    }
    return this.titleIndexCache || {};
  }

  private loadChunk(chunkRelPath: string): any {
    if (this.chunksCache.has(chunkRelPath)) {
      return this.chunksCache.get(chunkRelPath);
    }

    // Keep max 15 chunks in LRU cache
    if (this.chunksCache.size > 15) {
      const firstKey = this.chunksCache.keys().next().value;
      if (firstKey) this.chunksCache.delete(firstKey);
    }

    const fullRelPath = path.join('articles', chunkRelPath);
    const chunkData = this.readJsonOrGz(fullRelPath);
    if (chunkData) {
      this.chunksCache.set(chunkRelPath, chunkData);
    }
    return chunkData;
  }

  private loadSearchShard(shardId: number): Record<string, number[]> {
    const clamped = Math.max(0, Math.min(63, shardId));
    if (this.shardsCache.has(clamped)) {
      return this.shardsCache.get(clamped)!;
    }

    if (this.shardsCache.size > 4) {
      const firstKey = this.shardsCache.keys().next().value;
      if (firstKey !== undefined) this.shardsCache.delete(firstKey);
    }

    const shardPadded = String(clamped).padStart(2, '0');
    const shardData = this.readJsonOrGz(`search/shards/shard-${shardPadded}.json`) || {};
    this.shardsCache.set(clamped, shardData);
    return shardData;
  }

  public getArticle(lookup: { id?: number; slug?: string; path?: string; book?: string; ch?: number }): BibleArticle | null {
    let articleId: number | null = lookup.id ? Number(lookup.id) : null;

    if (!articleId && lookup.slug) {
      const slugMap = this.getSlugMap();
      articleId = slugMap[lookup.slug] || null;
    }

    if (!articleId && lookup.path) {
      const slugMap = this.getSlugMap();
      articleId = slugMap[lookup.path] || null;
    }

    if (!articleId && lookup.book && lookup.ch !== undefined) {
      const slug = `${lookup.book}-${lookup.ch}`.toLowerCase();
      const slugMap = this.getSlugMap();
      articleId = slugMap[slug] || null;
    }

    if (!articleId) {
      return null;
    }

    const map = this.getArticleMap();
    const entry = map[String(articleId)];
    if (!entry || !entry.c) {
      return null;
    }

    const chunkData = this.loadChunk(entry.c);
    if (!chunkData || !Array.isArray(chunkData.articles)) {
      return null;
    }

    const article = chunkData.articles.find((a: any) => a.id === articleId);
    if (!article) {
      return null;
    }

    // Enrich with section/category titles if available
    const sections = this.getSections();
    const categories = this.getCategories();
    const section = sections.find(s => s.id === article.section_id);
    const category = section ? categories.find(c => c.id === section.category_id) : null;

    return {
      ...article,
      section_title: section?.title || article.section_title,
      section_code: section?.code || article.section_code,
      category_title: category?.title || article.category_title,
      category_code: category?.code || article.category_code,
    };
  }

  public normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      .replace(/[\u064B-\u065F\u0670]/g, '') // Remove diacritics
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .toLowerCase()
      .trim();
  }

  private tokenize(query: string): string[] {
    const norm = this.normalizeArabic(query);
    const matches = norm.match(/[a-zA-Z0-9\u0600-\u06FF]+/g) || [];
    const tokens = matches.filter(t => t.length >= 2);
    return Array.from(new Set(tokens));
  }

  public search(
    query: string,
    options?: { scope?: string; sectionId?: number; limit?: number; page?: number; offset?: number }
  ): BibleSearchResponse {
    const trimmed = (query || '').trim();
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    if (!trimmed) {
      return { query: trimmed, total: 0, page, limit, total_pages: 0, results: [], items: [] };
    }

    const tokens = this.tokenize(trimmed);
    if (tokens.length === 0) {
      return { query: trimmed, total: 0, page, limit, total_pages: 0, results: [], items: [] };
    }

    const titleIndex = this.getTitleIndex();
    const articleMap = this.getArticleMap();
    const scope = options?.scope || 'all';
    const filterSecId = options?.sectionId ? Number(options.sectionId) : 0;

    const tokenPostingsMap: Map<string, Map<number, number>> = new Map();

    for (const token of tokens) {
      const postings = new Map<number, number>();

      // Title hits (weight 10)
      const titleHits = titleIndex[token] || [];
      for (const id of titleHits) {
        postings.set(id, 10);
      }

      if (scope !== 'title') {
        const shardId = calculateCrc32(token) % 64;
        const shard = this.loadSearchShard(shardId);
        const bodyHits = shard[token] || [];
        for (const id of bodyHits) {
          postings.set(id, (postings.get(id) || 0) + 1);
        }
      }

      if (postings.size === 0) {
        // No match for this required token
        return { query: trimmed, total: 0, page, limit, total_pages: 0, results: [], items: [] };
      }

      tokenPostingsMap.set(token, postings);
    }

    // Intersect hits across all tokens
    const firstToken = tokens[0];
    const firstPostings = tokenPostingsMap.get(firstToken)!;
    const candidateIds: number[] = [];

    const entries = Array.from(firstPostings.entries());
    for (const [id, score] of entries) {
      let matchedAll = true;
      let totalScore = score;

      for (let i = 1; i < tokens.length; i++) {
        const otherPostings = tokenPostingsMap.get(tokens[i])!;
        if (!otherPostings.has(id)) {
          matchedAll = false;
          break;
        }
        totalScore += otherPostings.get(id)!;
      }

      if (matchedAll) {
        // Apply section filter if requested
        if (filterSecId > 0) {
          const entry = articleMap[String(id)];
          if (entry && entry.s !== filterSecId) {
            continue;
          }
        }
        candidateIds.push(id);
      }
    }

    // Sort by ID / Relevance
    candidateIds.sort((a, b) => a - b);
    const total = candidateIds.length;
    const startOffset = Math.max(0, (page - 1) * limit);
    const pageIds = candidateIds.slice(startOffset, startOffset + limit);

    const sections = this.getSections();
    const categories = this.getCategories();
    const sectionsById = new Map(sections.map(s => [s.id, s]));
    const categoriesById = new Map(categories.map(c => [c.id, c]));

    const results: BibleSearchResult[] = [];

    for (const id of pageIds) {
      const art = this.getArticle({ id });
      if (!art) continue;

      const sec = sectionsById.get(art.section_id);
      const cat = sec ? categoriesById.get(sec.category_id) : null;

      // Extract snippet
      const cleanContent = (art.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      let snippet = cleanContent.slice(0, 160);
      const normContent = this.normalizeArabic(cleanContent);
      const firstTokenNorm = tokens[0];
      const matchPos = normContent.indexOf(firstTokenNorm);

      if (matchPos > 50) {
        const start = Math.max(0, matchPos - 40);
        snippet = '...' + cleanContent.slice(start, start + 160) + '...';
      } else if (cleanContent.length > 160) {
        snippet = snippet + '...';
      }

      results.push({
        id: art.id,
        section_id: art.section_id,
        slug: art.slug,
        title: art.title,
        subtitle: art.subtitle,
        book_name: art.book_name,
        chapter_num: art.chapter_num,
        section_title: sec?.title || '',
        section_icon: sec?.icon || '',
        category_title: cat?.title || '',
        snippet,
        score: 1,
      });
    }

    return {
      query: trimmed,
      normalized_query: this.normalizeArabic(trimmed),
      scope,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / Math.max(1, limit)),
      results,
      items: results,
    };
  }

  public getStats(): BibleStats {
    const manifest = this.getManifest();
    const sections = this.getSections();
    const categories = this.getCategories();

    return {
      total_articles: manifest.statistics?.article_count || 47923,
      total_sections: sections.length || 36,
      total_categories: categories.length || 4,
      dataset_version: manifest.dataset_version || 'v1.0.0',
      daily_verse: {
        text: 'كُلُّ الْكِتَابِ هُوَ مُوحىً بِهِ مِنَ اللهِ، وَنَافِعٌ لِلتَّعْلِيمِ وَالتَّوْبِيخِ، لِلتَّقْوِيمِ وَالتَّأْدِيبِ الَّذِي فِي الْبِرِّ',
        reference: '2 تيموثاوس 3: 16',
        theme: 'كلمة الله الحية'
      }
    };
  }
}

export const bibleService = new BibleService();
