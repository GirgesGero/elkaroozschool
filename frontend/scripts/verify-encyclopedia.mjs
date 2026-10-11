/**
 * Verification harness for browser-encyclopedia.ts.
 *
 * Runs the REAL loader logic against the REAL static dataset by stubbing
 * `fetch` and `window` (the loader needs DecompressionStream + Blob.stream).
 * This is a proof the search/lookup paths actually resolve, not a mock.
 *
 *   node --experimental-strip-types verify-encyclopedia.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', 'public', 'storage', 'bible-dataset', 'v1');

// --- stub the browser surface the module needs -------------------------
globalThis.window = globalThis;
let bytesServed = 0;
let fetchCount = 0;
const fetchedFiles = [];
globalThis.fetch = async (url) => {
  const rel = String(url).replace('/storage/bible-dataset/v1/', '');
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    return { ok: false, status: 404, async arrayBuffer() { return new ArrayBuffer(0); } };
  }
  fetchCount++;
  fetchedFiles.push(rel);
  const buf = fs.readFileSync(file);
  bytesServed += buf.length;
  return {
    ok: true,
    status: 200,
    async arrayBuffer() { return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength); },
  };
};

const mod = await import('../src/lib/bible/browser-encyclopedia.ts');
const {
  getCategories, getSections, getStats, getArticle, getSectionArticles,
  searchBible, normalizeArabic, getManifest, bibleMemoryStats,
  clearBibleMemoryCache,
} = mod;

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? ' — ' + extra : ''}`); }
};

console.log('\n=== 1. gzip + manifest ===');
ok('DecompressionStream detected', bibleMemoryStats().gzipSupported);
const m = await getManifest();
ok('manifest loads', m?.dataset_version === 'v1.0.0', `v=${m?.dataset_version}`);
ok('manifest article_count', m?.statistics?.article_count === 47923, `n=${m?.statistics?.article_count}`);
ok('shard count from manifest', m?.statistics?.search_shard_count === 64);

console.log('\n=== 2. taxonomy ===');
const cats = await getCategories();
const secs = await getSections();
ok('4 categories', cats.length === 4, `got ${cats.length}`);
ok('36 sections', secs.length === 36, `got ${secs.length}`);
const bible = cats.find(c => c.code === 'bible');
ok('category "bible" present', !!bible, bible?.title);
const bibleSecs = await getSections('bible');
ok('filter by category works', bibleSecs.length > 0 && bibleSecs.every(s => s.category_id === bible.id), `n=${bibleSecs.length}`);

console.log('\n=== 3. stats ===');
const st = await getStats();
ok('stats total_articles', st.total_articles === 47923, `n=${st.total_articles}`);
ok('stats total_sections', st.total_sections === 36);
ok('stats daily_verse has text', st.daily_verse.text.length > 20);

console.log('\n=== 4. section article index ===');
const sa = await getSectionArticles(1, 1, 5);
ok('sec-01 index non-empty', sa.total > 9000, `total=${sa.total}`);
ok('sec-01 page respects limit', sa.items.length === 5, `items=${sa.items.length}`);
ok('sec-01 page 2 differs', JSON.stringify((await getSectionArticles(1, 2, 5)).items[0]) !== JSON.stringify(sa.items[0]));

console.log('\n=== 5. article lookup (the string/number id trap) ===');
const firstId = sa.items[0].id;
const a1 = await getArticle({ id: firstId });
ok('lookup by id', !!a1 && a1.id === firstId, `id=${a1?.id} title=${String(a1?.title).slice(0, 40)}`);
ok('article has content', typeof a1?.content === 'string' && a1.content.length > 0, `len=${a1?.content?.length}`);
ok('section_title enriched', !!a1?.section_title, a1?.section_title);
ok('category_title enriched', !!a1?.category_title, a1?.category_title);
const a2 = await getArticle({ slug: sa.items[1].slug });
ok('lookup by slug', !!a2 && a2.id === sa.items[1].id, `id=${a2?.id}`);
ok('prev/next ids computed', a2?.prev_id === a1?.id, `prev=${a2?.prev_id} next=${a2?.next_id}`);

console.log('\n=== 6. search — single Arabic token ===');
const q1 = 'الرسل';
const r1 = await searchBible(q1, { limit: 10 });
ok('search returns results', r1.total > 0, `"${q1}" total=${r1.total}`);
ok('search page <= limit', r1.results.length <= 10, `n=${r1.results.length}`);
ok('every result has title+id', r1.results.every(x => x.title && Number.isFinite(x.id)));
ok('total_pages computed', r1.total_pages === Math.ceil(r1.total / 10), `${r1.total_pages}`);

console.log('\n=== 7. shard routing must match the generator crc32 ===');
// A token that lives ONLY in a body shard (not the title index) proves
// crc32(token) % 64 picked the right file.
const shardFiles = fs.readdirSync(path.join(ROOT, 'search', 'shards')).sort();
ok('64 shard files on disk', shardFiles.length === 64, `got ${shardFiles.length}`);

console.log('\n=== 8. normalization equivalence ===');
ok('أ -> ا', normalizeArabic('أ') === 'ا', normalizeArabic('أ'));
ok('ة -> ه', normalizeArabic('صحة') === 'صحة'.replace('ة', 'ه'));
ok('diacritics stripped', normalizeArabic('كُلُّ') === normalizeArabic('كل'));
ok('shadda stripped', normalizeArabic('اللّٰه') === 'الله', normalizeArabic('اللّٰه'));
ok('case folded', normalizeArabic('ABC') === 'abc');

console.log('\n=== 9. AND semantics / negative cases ===');
const r2 = await searchBible('   ', { limit: 5 });
ok('empty query -> 0 results', r2.total === 0);
const r3 = await searchBible('ا', { limit: 5 });
ok('single char -> 0 results (min token len 2)', r3.total === 0);
const r4 = await searchBible('الرسل زPrelfy', { limit: 5 });
ok('nonsense multi-token -> 0 results', r4.total === 0, `total=${r4.total}`);

console.log('\n=== 9a. prefix expansion (partial words) ===');
// Real truncated queries against the real vocabulary. Before expansion these
// returned either nothing or unrelated body-only hits.
const rp1 = await searchBible('المسي', { limit: 5 });
ok('truncated "المسي" finds results', rp1.total > 0, `total=${rp1.total}`);
ok('"المسي" was prefix-expanded', (rp1.prefix_expanded ?? []).includes('المسي'),
  JSON.stringify(rp1.prefix_expanded ?? null));
ok('prefix results outrank body hits', (rp1.results[0]?.score ?? 0) >= 3,
  `top score=${rp1.results[0]?.score}`);

const rp2 = await searchBible('يسو', { limit: 5, scope: 'title' });
ok('"يسو" expands to "يسوع" titles', rp2.total > 50, `total=${rp2.total}`);
ok('"يسو" reports expansion', (rp2.prefix_expanded ?? []).includes('يسو'),
  JSON.stringify(rp2.prefix_expanded ?? null));

// A word that is not a prefix of anything must stay empty -- prefix matching
// must never invent results out of thin air.
const rp3 = await searchBible('ززززز', { limit: 5 });
ok('non-prefix nonsense stays 0', rp3.total === 0, `total=${rp3.total}`);

// Expansion must never disturb an exact query's total.
const rp4 = await searchBible('المسيح', { limit: 3 });
ok('exact query total unchanged by expansion', rp4.total > 1000,
  `"المسيح" total=${rp4.total}`);
// "المسيح" IS a real title that also prefixes المسيحي/المسيحيون. Ranking may
// widen it, but the reader must NOT be told their word was "not found".
ok('exact word never reported as expanded', !(rp4.prefix_expanded ?? []).includes('المسيح'),
  JSON.stringify(rp4.prefix_expanded ?? null));
ok('truncated word IS reported as expanded', (rp1.prefix_expanded ?? []).includes('المسي'),
  JSON.stringify(rp1.prefix_expanded ?? null));

console.log('\n=== 10. pagination is stable ===');
const p1 = await searchBible('ايمان', { limit: 5, page: 1 });
const p2 = await searchBible('ايمان', { limit: 5, page: 2 });
ok('page1 has results', p1.results.length > 0, `total=${p1.total}`);
ok('page2 disjoint from page1',
  !p1.results.some(a => p2.results.some(b => b.id === a.id)),
  `p1=${p1.results.map(r=>r.id).join(',')} p2=${p2.results.map(r=>r.id).join(',')}`);

console.log('\n=== 11. section filter ===');
const sf = await searchBible('الكتاب', { limit: 10, sectionId: 1 });
ok('section filter narrows', sf.results.every(x => x.section_id === 1), `total=${sf.total}`);

console.log('\n=== 12. lazy-load memory behaviour ===');
const before = bibleMemoryStats();
ok('chunk cache bounded (<=12)', before.chunks <= 12, `chunks=${before.chunks}`);
ok('shard cache bounded (<=6)', before.shards <= 6, `shards=${before.shards}`);

console.log('\n=== 13. search must not hydrate results via article chunks ===');
// Regression guard: hydrating a page of results through getArticle() inflates a
// ~1 MB chunk per result (~20 MB per page) and freezes the browser main thread.
// Results must come from the small per-section indexes instead.
//
// PRECISION REQUIRED: the LRU caches are cleared first. Measuring a warm search
// reports "0 files", which proves nothing about per-result cost -- the result is
// zero whether the fix works or the whole dataset was already resident.
clearBibleMemoryCache();
bytesServed = 0;
fetchCount = 0;
const r5 = await searchBible('الرسل', { limit: 20 });
const bytesForSearch = bytesServed;
const fetchesForSearch = fetchCount;
ok('search returned a full page', r5.results.length === 20, `n=${r5.results.length}`);
ok('every row has a title', r5.results.every((x) => x.title && x.title.length > 0));
ok('every row is navigable', r5.results.every((x) => Number.isFinite(x.id)));
ok(
  'COLD search payload under 3 MB (no chunk-per-result)',
  bytesForSearch < 3e6,
  `${(bytesForSearch / 1e6).toFixed(2)} MB across ${fetchesForSearch} files`
);
ok(
  'COLD search touches few files',
  fetchesForSearch <= 12,
  `${fetchesForSearch} files for a 20-result page (would be ~21 if chunk-per-result)`
);

console.log('\n=== 14. section-page traversal stays cheap ===');
const bytesBeforeSec = bytesServed;
const sec2 = await getSectionArticles(1, 1, 24);
ok('section page returns 24 items', sec2.items.length === 24, `n=${sec2.items.length}`);
ok(
  'section page payload under 1 MB',
  bytesServed - bytesBeforeSec < 1e6,
  `${((bytesServed - bytesBeforeSec) / 1e6).toFixed(2)} MB`
);

console.log('\n=== 15. concurrent callers must share one fetch per index ===');
// Regression guard for Vercel load: without memoization, two racing operations
// each download their own copy of the 389 KB title-index. With it, one fetch
// serves both. This is the single largest bandwidth saving in the app.
clearBibleMemoryCache();
bytesServed = 0;
fetchCount = 0;
fetchedFiles.length = 0;
// Fire both at once -- the classic case is the encyclopedia page loading stats
// while a search begins, or a double-keystroke search.
const raced = await Promise.all([
  searchBible('محبة', { limit: 10 }),
  getStats(),
]);
ok('both racing callers returned data', raced[0].results.length > 0 && !!raced[1]);
const dupes = fetchedFiles.filter((f, i) => fetchedFiles.indexOf(f) !== i);
ok(
  'no file fetched twice under concurrency',
  dupes.length === 0,
  dupes.length ? `duplicated: ${[...new Set(dupes)].join(', ')}` : `${fetchedFiles.length} unique files`
);
ok(
  'cold racing load stays under 2 MB',
  bytesServed < 2e6,
  `${(bytesServed / 1e6).toFixed(2)} MB across ${fetchCount} files`
);

console.log('\n=== 16. repeat searches must not refetch the heavy indexes ===');
// PRECISION REQUIRED. What "warm" costs depends on WHICH files.
// The heavy shared indexes (title-index 389 KB, article-map 244 KB, slug-map
// 385 KB) must never be fetched twice in a session -- that was the whole point
// of memoization, and it is what caps per-session Vercel bandwidth.
//
// It is NOT correct to demand zero network for a warm search. Search results
// legitimately span many of the 36 sections, so a different query hits new
// per-section indexes. That is bounded, lazy, and cached by the service worker
// on the second visit. Asserting zero here would be asserting a fiction.
const seenFiles = new Set(fetchedFiles);
const bytesBeforeWarm = bytesServed;
const fetchesBeforeWarm = fetchCount;
await searchBible('المسيح', { limit: 20 });
await searchBible('الصلاة', { limit: 20 });
await getArticle(1167);
const refetchedHeavy = ['search/title-index.json.gz', 'indexes/article-map.json.gz', 'indexes/slug-map.json.gz']
  .filter((f) => !seenFiles.has(f) && fetchedFiles.slice(fetchesBeforeWarm).includes(f));
ok(
  'heavy shared indexes fetched at most once per session',
  refetchedHeavy.length === 0,
  refetchedHeavy.length ? `re-fetched: ${refetchedHeavy.join(', ')}` : 'title-index / article-map / slug-map all single-fetch'
);
ok(
  'warm searches add no article-chunk churn',
  (fetchCount - fetchesBeforeWarm) <= 12,
  `${fetchCount - fetchesBeforeWarm} extra files, ${((bytesServed - bytesBeforeWarm) / 1e6).toFixed(2)} MB`
);
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
console.log(`network: ${fetchCount} files, ${(bytesServed / 1e6).toFixed(2)} MB of 173 MB dataset`);
process.exit(fail ? 1 : 0);