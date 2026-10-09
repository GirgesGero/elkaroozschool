// frontend/src/lib/api/bible.ts
// Bible Encyclopedia v1.0 (Distributed Static Architecture) — Frontend API Client

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:3000/api';
}

/**
 * Build Bible API endpoint URL
 */
function buildBibleUrl(endpoint: string, params?: Record<string, string | number | undefined>): string {
  const base = getApiBase();
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
  }
  const qs = searchParams.toString();
  return `${base}/bible/${endpoint}${qs ? `?${qs}` : ''}`;
}

/**
 * Base fetcher for Bible API with standardized error handling
 */
async function bibleApiFetch<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = buildBibleUrl(endpoint, params);
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('المحتوى المطلوب غير موجود في الموسوعة');
    }
    throw new Error(`فشل الاتصال بالخادم (${response.status})`);
  }

  const json = await response.json();
  const isSuccessful = json.success === true || json.status === 'success';

  if (!isSuccessful) {
    throw new Error(json.error?.message || json.message || 'حدث خطأ أثناء جلب البيانات');
  }

  return json.data as T;
}

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

export interface BibleSectionArticlesResponse {
  section_id: number;
  section_code?: string;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  items: BibleSectionArticleSummary[];
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
  offset?: number;
  results: BibleSearchResult[];
  items?: BibleSearchResult[];
}

export interface BibleStats {
  total_articles: number;
  total_sections: number;
  total_categories: number;
  dataset_version?: string;
  daily_verse: {
    text: string;
    ref?: string;
    reference?: string;
    theme?: string;
  };
}

export interface TreeNode {
  name: string;
  id?: string;
  children?: TreeNode[];
  type?: string;
}

/**
 * Article lookup parameter types - enforces valid combinations
 */
export type ArticleLookupById = { id: number };
export type ArticleLookupBySlug = { slug: string };
export type ArticleLookupByPath = { path: string };
export type ArticleLookupByBook = { book: string; chapter: number };
export type ArticleLookup = 
  | ArticleLookupById 
  | ArticleLookupBySlug 
  | ArticleLookupByPath 
  | ArticleLookupByBook;

/**
 * Fetch all categories with their sections grouped.
 */
export async function getBibleCategories(): Promise<BibleCategory[]> {
  return bibleApiFetch<BibleCategory[]>('sections', { grouped: '1' });
}

/**
 * Fetch sections, optionally filtered by category code.
 */
export async function getBibleSections(categoryCode?: string): Promise<BibleSection[]> {
  const params = categoryCode ? { category: categoryCode } : undefined;
  return bibleApiFetch<BibleSection[]>('sections', params);
}

/**
 * Fetch paginated articles list for a specific section (Fast metadata index).
 */
export async function getBibleSectionArticles(
  sectionId: number,
  page: number = 1,
  limit: number = 20
): Promise<BibleSectionArticlesResponse> {
  return bibleApiFetch<BibleSectionArticlesResponse>('section-articles', {
    id: sectionId,
    page,
    limit,
  });
}

/**
 * Fetch a single article by ID, slug, path, or book+chapter.
 */
export async function getBibleArticle(lookup: ArticleLookup): Promise<BibleArticle> {
  const params: Record<string, string | number> = {};
  
  if ('id' in lookup) {
    params.id = lookup.id;
  } else if ('slug' in lookup) {
    params.slug = lookup.slug;
  } else if ('path' in lookup) {
    params.path = lookup.path;
  } else if ('book' in lookup) {
    params.book = lookup.book;
    params.ch = lookup.chapter;
  }

  const raw = await bibleApiFetch<BibleArticle | { article: BibleArticle }>('article', params);
  if (raw && typeof raw === 'object' && 'article' in raw) {
    return (raw as { article: BibleArticle }).article;
  }
  return raw as BibleArticle;
}

/**
 * Full-text search across 49,249 articles using Sharded Hash Index.
 */
export async function searchBibleEncyclopedia(
  query: string,
  options?: {
    scope?: string;
    sectionId?: number;
    limit?: number;
    page?: number;
    offset?: number;
  }
): Promise<BibleSearchResponse> {
  const params: Record<string, string | number | undefined> = { q: query };
  if (options?.scope) params.scope = options.scope;
  if (options?.sectionId) params.section = options.sectionId;
  if (options?.limit) params.limit = options.limit;
  if (options?.page) params.page = options.page;
  if (options?.offset) params.offset = options.offset;

  const raw = await bibleApiFetch<any>('search', params);
  const items = raw.items || raw.results || [];

  return {
    query: raw.query || query,
    total: raw.total || 0,
    page: raw.page || 1,
    limit: raw.limit || options?.limit || 20,
    total_pages: raw.total_pages || 1,
    results: items,
    items,
  };
}

/**
 * Get encyclopedia statistics and daily verse.
 */
export async function getBibleStats(): Promise<BibleStats> {
  return bibleApiFetch<BibleStats>('stats');
}

/**
 * Get dataset manifest and metadata.
 */
export async function getBibleManifest(): Promise<Record<string, any>> {
  return bibleApiFetch<Record<string, any>>('manifest');
}
