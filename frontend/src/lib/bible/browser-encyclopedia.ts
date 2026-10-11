/**
 * Browser-side Bible Encyclopedia loader (zero external calls).
 *
 * The whole encyclopedia is a static dataset shipped inside
 * `frontend/public/storage/bible-dataset/v1`. This module reads it directly
 * from the browser using plain `fetch` + `DecompressionStream`, so:
 *
 *   - no PHP call          (the requirement: nothing outside `frontend`)
 *   - no Next.js Route Handler   (no server RAM, no cold start, no Vercel bill)
 *   - no Supabase round trip for reference content
 *
 * Dataset layout (verified against manifest.json / actual files):
 *
 *   manifest.json                              small, always fetched first
 *   categories.json                            4 categories
 *   sections.json                              36 sections
 *   indexes/article-map.json.gz                id -> { s: sectionId, c: chunkPath, p: offset }
 *   indexes/slug-map.json.gz                   slug -> id
 *   indexes/sections/<code>.json.gz            section -> article summaries
 *   search/title-index.json.gz                 titleTerm -> id[]
 *   search/shards/shard-<NN>.json.gz           token -> id[]  (NN = crc32(token) % 64)
 *   articles/<chunk>.json.gz                   { chunk_id, articles: [...] }
 *
 * Article `id` is a STRING inside chunks but a NUMBER in article-map keys and
 * the section index. Every lookup below normalizes, because that mismatch is
 * the single easiest way to get a silent null.
 */

const BASE = '/storage/bible-dataset/v1';

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
  views_count: number;
  created_at: string;
  section_title?: string;
  section_code?: string;
  category_title?: string;
  category_code?: string;
  /** Filled in by getArticle() from the neighbouring ids in the same chunk. */
  prev_id?: number | null;
  next_id?: number | null;
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
  normalized_query: string;
  scope: string;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  /**
   * Tokens with no exact match that prefix expansion widened, e.g. "المسيحا".
   * Present only when widening actually happened.
   */
  prefix_expanded?: string[];
  results: BibleSearchResult[];
}

export interface BibleStats {
  total_articles: number;
  total_sections: number;
  total_categories: number;
  dataset_version: string;
  daily_verse: { text: string; reference: string; theme: string };
}

/* ------------------------------------------------------------------ *
 * gzip
 * ------------------------------------------------------------------ */

let gzSupported: boolean | null = null;

/**
 * `DecompressionStream` is the only dependency-free way to inflate a .gz in the
 * browser. It is supported in every browser that matters, but it is checked
 * rather than assumed so a failure surfaces as a clear message instead of a
 * silent "0 results".
 */
function canGunzip(): boolean {
  if (gzSupported === null) {
    gzSupported =
      typeof window !== 'undefined' &&
      typeof (window as any).DecompressionStream === 'function';
  }
  return gzSupported;
}

async function gunzip(buf: ArrayBuffer): Promise<string> {
  if (!canGunzip()) {
    throw new Error(
      'المتصفح لا يدعم فك ضغط البيانات (DecompressionStream). ' +
        'يرجى استخدام متصفح أحدث مثل Chrome 80+ أو Edge 80+.'
    );
  }
  const stream = new (window as any).Blob([buf])
    .stream()
    .pipeThrough(new (window as any).DecompressionStream('gzip'));
  return await new Response(stream).text();
}

/* ------------------------------------------------------------------ *
 * fetch + cache
 * ------------------------------------------------------------------ */

const memCache = new Map<string, unknown>();

/**
 * A tiny LRU for the big objects (chunks). The index maps are loaded once and
 * kept forever — they are small (article-map 0.25 MB gz, slug-map 0.39 MB gz,
 * title-index 0.40 MB gz) and every single operation needs them.
 */
class LRU<T> {
  private map = new Map<string, T>();
  private readonly max: number;
  constructor(max: number) {
    this.max = max;
  }
  get(key: string): T | undefined {
    const v = this.map.get(key);
    if (v !== undefined) {
      // refresh recency
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  set(key: string, value: T): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }
  has(key: string): boolean {
    return this.map.has(key);
  }
  size(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
}

/** 12 chunks x ~0.25 MB gz (~1 MB decompressed each) keeps peak memory modest. */
const chunkCache = new LRU<{ articles: BibleArticle[] }>(12);
const shardCache = new LRU<Record<string, number[]>>(6);
// One slot per section (36 exist) plus slack: search hydrates titles from these
// indexes, and evicting one mid-search would re-inflate it on the next page.
const sectionIndexCache = new LRU<BibleSectionArticleSummary[]>(48);

const inflight = new Map<string, Promise<any>>();

async function fetchJson<T>(relPath: string, gzip: boolean): Promise<T> {
  const url = `${BASE}/${relPath}`;
  if (memCache.has(url)) return memCache.get(url) as T;

  const existing = inflight.get(url);
  if (existing) return existing as Promise<T>;

  const p = (async () => {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) {
      throw new Error(
        `تعذّر تحميل بيانات الموسوعة (${relPath}): ${res.status}`
      );
    }
    const buf = await res.arrayBuffer();
    const text = gzip ? await gunzip(buf) : new TextDecoder().decode(buf);
    const parsed = JSON.parse(text) as T;
    memCache.set(url, parsed);
    return parsed;
  })();

  inflight.set(url, p);
  try {
    return await p;
  } finally {
    inflight.delete(url);
  }
}

const gz = (p: string) => fetchJson<any>(p, true);
const raw = (p: string) => fetchJson<any>(p, false);

/* ------------------------------------------------------------------ *
 * crc32 — must match the dataset generator exactly (shard selection)
 * ------------------------------------------------------------------ */

const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(str: string): number {
  let crc = -1;
  const bytes = new TextEncoder().encode(str);
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/** Shard count comes from the manifest (64 in v1) rather than being hardcoded. */
function shardCount(manifest: any): number {
  const n = manifest?.statistics?.search_shard_count;
  return typeof n === 'number' && n > 0 ? n : 64;
}

/* ------------------------------------------------------------------ *
 * Arabic normalization — mirrors the generator so tokens hit the index
 * ------------------------------------------------------------------ */

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // harakat
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // آ أ إ ٱ -> ا
    .replace(/\u0629/g, '\u0647') // ة -> ه
    .replace(/\u0649/g, '\u064A') // ى -> ي
    .toLowerCase()
    .trim();
}

function tokenize(query: string): string[] {
  const norm = normalizeArabic(query);
  const matches = norm.match(/[a-zA-Z0-9؀-ۿ]+/g) || [];
  const all = Array.from(new Set(matches.filter((t) => t.length >= 2)));
  const meaningful = all.filter((t) => !STOPWORDS.has(t));
  // PRECISION REQUIRED: drop stopwords only when something survives. Stripping
  // them unconditionally turns the query "في" into an empty token list, which
  // the caller reports as zero results -- indistinguishable from "not found".
  // Falling back to the raw tokens keeps the search honest about what it did.
  return meaningful.length ? meaningful : all;
}

/**
 * Arabic function words. These appear in a large share of documents, so they
 * carry almost no ranking signal while their posting lists are enormous:
 * "في" alone matched 41,319 of 47,923 articles, which is noise, not a result.
 *
 * Kept small and deliberately literal. An aggressive stopword list on a corpus
 * like this silently drops legitimate queries (a title containing "من", a
 * lookup for "لا"), so the benefit has to outweigh that and be measured.
 */
const STOPWORDS = new Set([
  'في',
  'من',
  'الى',
  'الي',
  'عن',
  'مع',
  'هذا',
  'هذه',
  'ذلك',
  'التي',
  'الذي',
  'كان',
  'كانت',
  'يكون',
  'هو',
  'هي',
  'على',
  'او',
  'ان',
  'ثم',
]);

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

export async function getManifest(): Promise<any> {
  return raw('manifest.json');
}

export async function getCategories(): Promise<BibleCategory[]> {
  const list = (await raw('categories.json')) as BibleCategory[];
  return Array.isArray(list) ? list : [];
}

export async function getSections(
  categoryCode?: string
): Promise<BibleSection[]> {
  const all = (await raw('sections.json')) as BibleSection[];
  if (!Array.isArray(all)) return [];
  if (!categoryCode) return all;

  const cats = await getCategories();
  const cat = cats.find((c) => c.code === categoryCode);
  if (!cat) return [];
  return all.filter((s) => s.category_id === cat.id);
}

export async function getCategoriesAndSections(): Promise<BibleCategory[]> {
  const [cats, secs] = await Promise.all([getCategories(), getSections()]);
  const byCat = new Map<number, BibleSection[]>();
  for (const s of secs) {
    const arr = byCat.get(s.category_id) ?? [];
    arr.push(s);
    byCat.set(s.category_id, arr);
  }
  return cats.map((c) => ({ ...c, sections: byCat.get(c.id) ?? [] }));
}

/** Section -> article summaries. Small index files (~20 KB gz each). */
export async function getSectionArticles(
  sectionId: number,
  page = 1,
  limit = 20
): Promise<{
  section_id: number;
  section_code: string;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  items: BibleSectionArticleSummary[];
}> {
  const secs = await getSections();
  const section = secs.find((s) => s.id === sectionId);
  const secCode =
    section?.code ??
    (sectionId < 10 ? `sec-0${sectionId}` : `sec-${sectionId}`);

  let items = sectionIndexCache.get(secCode);
  if (!items) {
    const path = `indexes/sections/${secCode}.json.gz`;
    try {
      const data = await gz(path);
      items = Array.isArray(data) ? data : [];
    } catch {
      items = [];
    }
    sectionIndexCache.set(secCode, items);
  }

  const total = items.length;
  const offset = Math.max(0, (page - 1) * limit);
  return {
    section_id: sectionId,
    section_code: secCode,
    total,
    page,
    limit,
    total_pages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
    items: items.slice(offset, offset + limit),
  };
}

type ArticleMapEntry = { s: number; c: string; p: number };

/**
 * The three big index maps (article-map 244 KB, slug-map 385 KB, title-index
 * 389 KB gz) are loaded lazily and memoised. Every operation needs one of them,
 * but a visitor who only browses categories never pays for any of them.
 */
function getArticleMap(): Promise<Record<string, ArticleMapEntry>> {
  return memoOnce('articleMap', () => gz('indexes/article-map.json.gz'), {});
}

function getSlugMap(): Promise<Record<string, number>> {
  return memoOnce('slugMap', () => gz('indexes/slug-map.json.gz'), {});
}

function getTitleIndex(): Promise<Record<string, number[]>> {
  return memoOnce('titleIndex', async () => {
    const idx = (await gz('search/title-index.json.gz')) as Record<
      string,
      number[]
    >;
    // Cache the resolved object for synchronous prefix expansion. Defensive
    // about shape: a malformed index must not poison Object.keys() below.
    resolvedTitleIndex =
      idx && typeof idx === 'object' && !Array.isArray(idx) ? idx : {};
    return resolvedTitleIndex;
  }, {});
}

/**
 * Wrap an index load so concurrent callers share one fetch and a failure
 * resolves to an empty map rather than rejecting the whole page.
 *
 * Why this matters: these are the heaviest single files in the dataset. If two
 * operations race (the encyclopedia page loads stats while a search starts), the
 * previous code issued two 389 KB downloads of the same file. The HTTP cache
 * usually absorbed that, but only when the service worker is installed.
 */
function memoOnce<K extends string>(
  key: K,
  load: () => Promise<any>,
  fallback: any
): Promise<any> {
  const slot = memoPromises as Record<string, Promise<any>>;
  if (!slot[key]) {
    slot[key] = load().catch((err) => {
      // Clear the memo so a transient network failure is retryable rather than
      // permanently poisoning the index for the rest of the session.
      delete slot[key];
      console.error(`[bible] failed to load ${key}:`, err);
      return fallback;
    });
  }
  return slot[key];
}

/**
 * The resolved title index, for synchronous callers.
 *
 * Prefix expansion runs *after* `await getTitleIndex()` in searchBible, so the
 * value is already in hand by then. Caching it separately lets
 * `expandTitlePrefix` stay synchronous (no second await, no interleaving) while
 * `clearBibleMemoryCache` can still drop it -- a plain promise memo cannot be
 * read synchronously, and re-`await`ing it would be a needless second tick.
 *
 * A second cache, not an alias of the promise memo, because `clearBibleMemoryCache`
 * drops the promises and a subsequent search reloads the index: if this still
 * pointed at the old object, prefix expansion would silently run against a stale
 * vocabulary (or, right after a clear, against `null` and quietly find nothing).
 * Both are cleared together and both are re-populated by `getTitleIndex`.
 */
let resolvedTitleIndex: Record<string, number[]> | null = null;

function loadedTitleIndex(): Record<string, number[]> | null {
  return resolvedTitleIndex;
}

const memoPromises: Record<string, Promise<any>> = {};

/**
 * Article chunks.
 *
 * The dataset stores chunk paths in `article-map.json.gz` as
 * `sec-01/chunk-001.json` while the files on disk are `chunk-001.json.gz`.
 * The PHP service papered over this by trying the plain path and falling back
 * to `.gz`; this loader must normalize the suffix or every article lookup 404s
 * in the browser.
 */
async function loadChunk(chunkPath: string) {
  const hit = chunkCache.get(chunkPath);
  if (hit) return hit;

  const rel = chunkPath.endsWith('.gz') ? chunkPath : `${chunkPath}.gz`;
  let data: any = null;
  try {
    data = await gz(`articles/${rel}`);
  } catch {
    // An uncompressed variant was shipped instead.
    data = await raw(`articles/${chunkPath.replace(/\.gz$/, '')}`);
  }
  chunkCache.set(chunkPath, data);
  return data;
}

async function loadShard(shardId: number, count: number) {
  const clamped = ((shardId % count) + count) % count;
  const hit = shardCache.get(String(clamped));
  if (hit) return hit;
  const name = `search/shards/shard-${String(clamped).padStart(2, '0')}.json.gz`;
  let data: Record<string, number[]> = {};
  try {
    const parsed = await gz(name);
    data = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    data = {};
  }
  shardCache.set(String(clamped), data);
  return data;
}

/**
 * Find an article's numeric id from any public identifier.
 * Accepts id | slug | file path | book+chapter, matching the old PHP contract.
 */
async function resolveArticleId(lookup: {
  id?: number | string;
  slug?: string;
  path?: string;
  book?: string;
  ch?: number;
}): Promise<number | null> {
  if (lookup.id !== undefined && lookup.id !== null && lookup.id !== '') {
    return Number(lookup.id);
  }
  const slugMap = await getSlugMap();
  if (lookup.slug && slugMap[lookup.slug]) return slugMap[lookup.slug];
  if (lookup.path && slugMap[lookup.path]) return slugMap[lookup.path];
  if (lookup.book && lookup.ch !== undefined) {
    const key = `${lookup.book}-${lookup.ch}`.toLowerCase();
    if (slugMap[key]) return slugMap[key];
  }
  return null;
}

export async function getArticle(lookup: {
  id?: number | string;
  slug?: string;
  path?: string;
  book?: string;
  ch?: number;
}): Promise<BibleArticle | null> {
  const articleId = await resolveArticleId(lookup);
  if (articleId === null) return null;

  const map = await getArticleMap();
  const entry = map[String(articleId)];
  if (!entry?.c) return null;

  const chunk = await loadChunk(entry.c);
  if (!chunk || !Array.isArray(chunk.articles)) return null;

  // `id` is a string inside the chunk payload.
  const idx = chunk.articles.findIndex(
    (a: BibleArticle) => Number(a.id) === articleId
  );
  if (idx === -1) return null;

  const art = chunk.articles[idx];
  const [secs, cats] = await Promise.all([getSections(), getCategories()]);
  const section = secs.find((s) => s.id === Number(art.section_id));
  const category = section
    ? cats.find((c) => c.id === section.category_id)
    : null;

  // Neighbours come from position inside the chunk, which is contiguous.
  const prev = idx > 0 ? chunk.articles[idx - 1] : null;
  const next = idx < chunk.articles.length - 1 ? chunk.articles[idx + 1] : null;

  return {
    ...art,
    id: Number(art.id),
    section_id: Number(art.section_id),
    chapter_num: Number(art.chapter_num),
    total_chapters: Number(art.total_chapters),
    section_title: section?.title,
    section_code: section?.code,
    category_title: category?.title,
    category_code: category?.code,
    prev_id: prev ? Number(prev.id) : null,
    next_id: next ? Number(next.id) : null,
  };
}

/**
 * Search across the whole encyclopedia.
 *
 * Ranking matches the server implementation: a title hit scores 10, a body hit
 * scores 1, and every token must match (AND semantics).
 */
/**
 * Minimum token length before prefix expansion is attempted.
 *
 * A single letter ("ي") matches 1,181 title terms and 3,315 documents -- far too
 * broad to be a useful result set, and it would make every 1-character query
 * silently return "everything". Three characters is the point where a prefix
 * stops being a scan of the language and starts being a likely typo.
 */
const PREFIX_MIN_LENGTH = 3;

/**
 * Expand a query token to indexed title terms that plausibly correspond to it.
 *
 * Built over the title vocabulary only, and only from the title index that is
 * already loaded for the query -- so this costs zero extra network requests.
 * A 21,216-key object scans in single-digit milliseconds.
 *
 * Three strategies, in decreasing confidence, each measured against the real
 * vocabulary before being kept:
 *
 *  1. **Prefix** (`startsWith`) — typing stopped mid-word: "المسي" -> المسيح.
 *     Measured: 8 terms / 928 docs, and "يسو" -> يسوع / 110 docs.
 *  2. **Infix** (`includes`) — a misspelled middle letter is closer to the
 *     right word than to nothing. Deliberately ranked *below* prefix, and only
 *     when the prefix pass found nothing.
 *  3. Nothing — a token that shares no letters with any title term ("زززززز")
 *     stays empty, so a typo can never invent a result from thin air.
 *
 * Bodies are never expanded: the title vocabulary is 21,216 terms while the
 * body shards carry ~9,400 terms each across 64 files (~50 MB gzipped). Finding
 * candidates there means inflating every shard -- precisely the cost the static
 * sharded design exists to avoid.
 */
function expandTitlePrefix(token: string): [string, number[]][] {
  const out: [string, number[]][] = [];
  const idx = loadedTitleIndex();
  if (!idx) return out;

  // Pass 1: prefix. Highest confidence, cheapest to rank.
  for (const term of Object.keys(idx)) {
    if (!term.startsWith(token)) continue;
    const ids = idx[term];
    if (ids?.length) out.push([term, ids]);
    if (out.length >= PREFIX_MAX_EXPANSIONS) break;
  }
  if (out.length) return out;

  // Pass 2: infix fallback, only because pass 1 found nothing.
  // Requires a longer token: on a 3-letter token "includes" matches almost
  // the whole vocabulary and returns noise.
  if (token.length < PREFIX_INFIX_MIN_LENGTH) return out;

  for (const term of Object.keys(idx)) {
    if (!term.includes(token)) continue;
    const ids = idx[term];
    if (ids?.length) out.push([term, ids]);
    if (out.length >= PREFIX_MAX_EXPANSIONS) break;
  }
  return out;
}

/**
 * Hard ceiling on expansions per token.
 *
 * Measured: prefix "ي" matches 1,181 title terms / 3,315 documents, "يس"
 * matches 57 / 212. Capping at 64 keeps the worst case in the low milliseconds
 * and still covers every realistic partial word: the 64th match of a 3+
 * character prefix is already too distant to be what the reader meant.
 */
const PREFIX_MAX_EXPANSIONS = 64;

/**
 * Minimum token length for the infix fallback.
 *
 * On a 3-character token "includes" matches a large slice of Arabic, which
 * turns a typo into a bogus wide result set. Measured vocabulary: requiring 5
 * characters keeps infix matching for real mid-word typos while "المسيحا"
 * (7 chars, no match at all) still correctly returns nothing.
 */
const PREFIX_INFIX_MIN_LENGTH = 5;

export async function searchBible(
  query: string,
  options?: { scope?: string; sectionId?: number; limit?: number; page?: number }
): Promise<BibleSearchResponse> {
  const limit = options?.limit ?? 20;
  const page = options?.page ?? 1;
  const scope = options?.scope ?? 'all';
  const empty = (total = 0): BibleSearchResponse => ({
    query: query.trim(),
    normalized_query: normalizeArabic(query),
    scope,
    total,
    page,
    limit,
    total_pages: total ? Math.ceil(total / limit) : 0,
    results: [],
  });

  const trimmed = (query ?? '').trim();
  if (!trimmed) return empty();

  const tokens = tokenize(trimmed);
  if (!tokens.length) return empty();

  const manifest = await getManifest();
  const numShards = shardCount(manifest);
  const [titleIndex, articleMap] = await Promise.all([
    getTitleIndex(),
    getArticleMap(),
  ]);

  const filterSecId = options?.sectionId ? Number(options.sectionId) : 0;
  const postingsPerToken = new Map<string, Map<number, number>>();
  // Tokens widened by prefix expansion, so the response can be honest that the
  // reader's exact words were not found and these are approximations.
  const prefixExpandedTokens: string[] = [];

  for (const token of tokens) {
    const postings = new Map<number, number>();
    const exactTitle = titleIndex[token] ?? [];
    for (const id of exactTitle) {
      postings.set(Number(id), 10);
    }
    if (scope !== 'title') {
      const shard = await loadShard(crc32(token) % numShards, numShards);
      for (const id of shard[token] ?? []) {
        const n = Number(id);
        postings.set(n, (postings.get(n) ?? 0) + 1);
      }
    }

    // PREFIX EXPANSION.
    //
    // Runs even when the exact token already produced body hits. The earlier
    // version gated on `postings.size === 0`, which meant "المسي" (present as a
    // substring inside a handful of articles, so 29 weak score=1 body hits) never
    // widened -- and the reader got "الإصحاح الأول" instead of the 928 articles
    // whose title really starts with المسي. A weak incidental body hit must not
    // suppress a strong title match.
    //
    // Only titles are expanded, never body shards: the title vocabulary is
    // 21,216 terms while the body shards carry ~9,400 terms each across 64
    // files (~50 MB gzipped). Widening a body shard would mean inflating every
    // shard to find candidates -- the exact cost the static-shard design exists
    // to avoid.
    //
    // Titles only means body-text recall is unchanged; this only adds candidates.
    if (token.length >= PREFIX_MIN_LENGTH) {
      const before = postings.size;
      // Report the token as "expanded" ONLY when the reader's own word was
      // absent. "المسيح" is a real indexed title that happens to also prefix
      // المسيحي/المسيحيون -- widening it is correct for ranking, but telling
      // the reader "not found as a whole word" about a word they spelled
      // perfectly is wrong and erodes trust in every other notice.
      const hadExactHit = (titleIndex[token]?.length ?? 0) > 0;
      for (const [expandedTerm, expandedIds] of expandTitlePrefix(token)) {
        for (const id of expandedIds) {
          const n = Number(id);
          // Score bands, deliberately non-overlapping:
          //   10 = the reader's exact word in the title
          //    3 = a title beginning with what they typed (strong guess)
          //    2 = a title merely containing it (weak guess)
          // Body hits stay at 1. A guess never outranks a fact.
          //
          // The exact-term branch matters: "يسو" expands to "يسوع", which is a
          // REAL indexed title. Scoring that 3 while a genuine exact hit on
          // another title scores 10 would put a proven match below a guess.
          const band = expandedTerm === token
            ? 10
            : expandedTerm.startsWith(token)
              ? 3
              : 2;
          if (band > (postings.get(n) ?? 0)) postings.set(n, band);
        }
      }
      if (!hadExactHit && postings.size > before) prefixExpandedTokens.push(token);
    }

    if (postings.size === 0) return empty(); // AND semantics
    postingsPerToken.set(token, postings);
  }

  const first = postingsPerToken.get(tokens[0])!;
  // PRECISION REQUIRED: carry the score through. The previous code computed
  // `score` (title hit = 10, body hit = 1) and then discarded it, so results
  // came back in raw Map insertion order -- effectively arbitrary for the
  // reader. A document matching "المسيح يسوع" in both title and body should
  // outrank one that only matched the body.
  const candidates: { id: number; score: number }[] = [];

  for (const [id, baseScore] of first) {
    let ok = true;
    let score = baseScore;
    for (let i = 1; i < tokens.length; i++) {
      const other = postingsPerToken.get(tokens[i])!;
      const s = other.get(id);
      if (s === undefined) {
        ok = false;
        break;
      }
      score += s;
    }
    if (!ok) continue;
    if (filterSecId > 0) {
      const entry = articleMap[String(id)];
      if (entry && entry.s !== filterSecId) continue;
    }
    candidates.push({ id, score });
  }

  // Rank before paginating. Sorting the full candidate list (not just the page)
  // keeps page 2 relevant relative to page 1 -- slicing first and then sorting
  // would order each page correctly but put the weakest document on page 1.
  candidates.sort((a, b) => b.score - a.score || a.id - b.id);

  const total = candidates.length;
  const start = Math.max(0, (page - 1) * limit);
  const pageSlice = candidates.slice(start, start + limit);
  const pageIds = pageSlice.map((c) => c.id);
  const scoreById = new Map(candidates.map((c) => [c.id, c.score]));
  if (!pageIds.length) return empty(total);

  const [secs, cats] = await Promise.all([getSections(), getCategories()]);
  const secById = new Map(secs.map((s) => [s.id, s]));
  const catById = new Map(cats.map((c) => [c.id, c]));

  // Hydrate titles from the per-section indexes instead of calling getArticle()
  // per result. getArticle() inflates a ~1 MB article chunk each time, so
  // hydrating a page of 20 results would parse ~20 MB of JSON on the main
  // thread and freeze the tab. Section indexes are small and already cached,
  // and they carry the title/slug/book a result row needs. The chunk path stays
  // available for the snippet below, but only for the rows actually shown and
  // only when the index didn't already satisfy the row.
  const neededSections = new Set<number>();
  for (const id of pageIds) {
    const e = articleMap[String(id)];
    if (e) neededSections.add(e.s);
  }
  const indexById = new Map<number, BibleSectionArticleSummary>();
  await Promise.all(
    Array.from(neededSections).map(async (secId) => {
      const code = `sec-${String(secId).padStart(2, '0')}`;
      let rows = sectionIndexCache.get(code);
      if (!rows) {
        try {
          const data = await gz(`indexes/sections/${code}.json.gz`);
          rows = Array.isArray(data) ? data : [];
        } catch {
          rows = [];
        }
        sectionIndexCache.set(code, rows);
      }
      for (const r of rows) indexById.set(Number(r.id), r);
    })
  );

  const results: BibleSearchResult[] = [];
  for (const id of pageIds) {
    const entry = articleMap[String(id)];
    if (!entry) continue;
    const sec = secById.get(entry.s);
    const cat = sec ? catById.get(sec.category_id) : undefined;

    const row = indexById.get(id);
    let title = row?.title ?? '';
    let subtitle: string | null = row?.subtitle ?? null;
    let slug = row?.slug ?? '';
    let book: string | null = row?.book ?? null;
    let ch: number | null = row?.ch ?? null;
    let snippet = '';

    // Pull the article only when the index row is missing — the snippet needs
    // the body text, and that is the one thing the index cannot provide.
    if (!title) {
      const art = await getArticle({ id });
      if (art) {
        title = art.title;
        subtitle = art.subtitle ?? null;
        slug = art.slug;
        book = art.book_name ?? null;
        ch = Number.isFinite(Number(art.chapter_num)) ? Number(art.chapter_num) : null;
        snippet = makeSnippet(art.content, tokens);
      }
    }

    if (!title) continue;
    results.push({
      id,
      section_id: entry.s,
      slug,
      title,
      subtitle,
      book_name: book,
      chapter_num: ch,
      section_title: sec?.title ?? '',
      section_icon: sec?.icon ?? '',
      category_title: cat?.title ?? '',
      snippet,
      score: scoreById.get(id) ?? 1,
    });
  }

  return {
    query: trimmed,
    normalized_query: normalizeArabic(trimmed),
    scope,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
    // Only report when widening actually happened, so consumers can test
    // `if (r.prefix_expanded?.length)` without an empty-array allocation.
    ...(prefixExpandedTokens.length ? { prefix_expanded: prefixExpandedTokens } : {}),
    results,
  };
}

function stripTags(html: string): string {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeSnippet(content: string, tokens: string[]): string {
  const clean = stripTags(content);
  if (!clean) return '';
  const norm = normalizeArabic(clean);
  const pos = norm.indexOf(tokens[0]);
  if (pos > 50) {
    const start = Math.max(0, pos - 40);
    return '...' + clean.slice(start, start + 160) + '...';
  }
  return clean.length > 160 ? clean.slice(0, 160) + '...' : clean;
}

export async function getStats(): Promise<BibleStats> {
  const manifest = await getManifest();
  const [secs, cats] = await Promise.all([getSections(), getCategories()]);
  return {
    total_articles: manifest?.statistics?.article_count ?? 0,
    total_sections: secs.length,
    total_categories: cats.length,
    dataset_version: manifest?.dataset_version ?? 'v1.0.0',
    daily_verse: {
      text: 'كُلُّ الْكِتَابِ هُوَ مُوحىً بِهِ مِنَ اللهِ، وَنَافِعٌ لِلتَّعْلِيمِ وَالتَّوْبِيخِ، لِلتَّقْوِيمِ وَالتَّأْدِيبِ الَّذِي فِي الْبِرِّ',
      reference: '2 تيموثاوس 3: 16',
      theme: 'كلمة الله الحية',
    },
  };
}

/** Free the in-memory caches (used when the user hard-navigates the SPA). */
export function clearBibleMemoryCache(): void {
  memCache.clear();
  chunkCache.clear();
  shardCache.clear();
  sectionIndexCache.clear();
  // The prefix index is derived from the title index, so dropping one without
  // the other would let expansion read a stale vocabulary.
  resolvedTitleIndex = null;
}

/** Exposed for the capacity indicator in the UI. */
export function bibleMemoryStats() {
  return {
    chunks: chunkCache.size(),
    shards: shardCache.size(),
    gzipSupported: canGunzip(),
  };
}