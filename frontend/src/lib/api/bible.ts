// frontend/src/lib/api/bible.ts
// Bible Encyclopedia — frontend API client
//
// IMPORTANT: this used to be an HTTP client for the PHP `/api/bible/*` routes.
// The encyclopedia now lives entirely inside the frontend as gzipped static
// files under /storage/bible-dataset/v1, so every function below reads the
// dataset directly in the browser. The exported signatures are UNCHANGED, which
// is what lets every existing page/component switch over with zero edits.
//
// If a remote API is ever needed again, restore a `bibleApiFetch`-style body
// inside each function — nothing else depends on where the bytes come from.

import {
  getManifest as _getManifest,
  getCategoriesAndSections as _getCategoriesAndSections,
  getSections as _getSections,
  getSectionArticles as _getSectionArticles,
  getArticle as _getArticle,
  searchBible as _searchBible,
  getStats as _getStats,
} from '@/lib/bible/browser-encyclopedia';

const NOT_FOUND = 'المحتوى المطلوب غير موجود في الموسوعة';

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
  /**
   * Tokens the reader typed that had no exact match and were widened by
   * prefix expansion, e.g. "المسيحا" -> ["المسيح", "المسيحي", ...].
   *
   * Present so the UI can say "approximate results" instead of presenting a
   * fuzzy hit list as if the reader's exact words were found. Absent when every
   * token matched exactly.
   */
  prefix_expanded?: string[];
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
  return _getCategoriesAndSections();
}

/**
 * Fetch sections, optionally filtered by category code.
 */
export async function getBibleSections(categoryCode?: string): Promise<BibleSection[]> {
  return _getSections(categoryCode);
}

/**
 * Fetch paginated articles list for a specific section (static per-section index).
 */
export async function getBibleSectionArticles(
  sectionId: number,
  page: number = 1,
  limit: number = 20
): Promise<BibleSectionArticlesResponse> {
  return _getSectionArticles(sectionId, page, limit);
}

/**
 * Fetch a single article by ID, slug, path, or book+chapter.
 *
 * Still rejects on "not found" rather than resolving to null, because the
 * reader page treats a rejection as its error state.
 */
export async function getBibleArticle(lookup: ArticleLookup): Promise<BibleArticle> {
  const params: Parameters<typeof _getArticle>[0] = {};

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

  const art = await _getArticle(params);
  if (!art) throw new Error(NOT_FOUND);
  return art;
}

/**
 * Full-text search across the encyclopedia using the local sharded hash index.
 *
 * Reads the title index plus one gzip shard per query token, so a query costs a
 * few hundred KB and zero server round-trips.
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
  const raw = await _searchBible(query, {
    scope: options?.scope,
    sectionId: options?.sectionId,
    limit: options?.limit,
    page: options?.page,
  });

  return {
    query: raw.query,
    normalized_query: raw.normalized_query,
    scope: raw.scope,
    total: raw.total,
    page: raw.page,
    limit: raw.limit,
    total_pages: raw.total_pages,
    offset: (raw.page - 1) * raw.limit,
    prefix_expanded: raw.prefix_expanded,
    results: raw.results,
    // Legacy alias: callers read `results || items`.
    items: raw.results,
  };
}

/**
 * Get encyclopedia statistics and daily verse.
 *
 * `reference` is duplicated as `ref` because the UI reads `daily_verse.ref`.
 */
export async function getBibleStats(): Promise<BibleStats> {
  const s = await _getStats();
  return {
    total_articles: s.total_articles,
    total_sections: s.total_sections,
    total_categories: s.total_categories,
    dataset_version: s.dataset_version,
    daily_verse: {
      text: s.daily_verse?.text ?? '',
      ref: s.daily_verse?.reference,
      reference: s.daily_verse?.reference,
      theme: s.daily_verse?.theme,
    },
  };
}

/**
 * Get dataset manifest and metadata.
 */
export async function getBibleManifest(): Promise<Record<string, any>> {
  return _getManifest();
}
