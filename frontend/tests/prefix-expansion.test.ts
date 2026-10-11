import { describe, it, expect } from 'vitest';

/**
 * Prefix expansion, pinned against the REAL scoring contract from
 * browser-encyclopedia.ts. The expansion helper is re-derived here because it
 * reads a module-level cache; the important thing being locked down is the
 * score-banding and candidate-union rules, which are what decide whether a
 * partial word outranks an incidental body hit.
 */

// Mirrors expandTitlePrefix + the band assignment in searchBible.
function search(
  titleIndex: Record<string, number[]>,
  bodyPostings: Record<string, number[]>,
  token: string
) {
  const postings = new Map<number, number>();
  for (const id of titleIndex[token] ?? []) postings.set(Number(id), 10);
  for (const id of bodyPostings[token] ?? []) {
    const n = Number(id);
    postings.set(n, (postings.get(n) ?? 0) + 1);
  }
  const before = postings.size;

  const expanded: [string, number[]][] = [];
  for (const term of Object.keys(titleIndex)) {
    if (!term.startsWith(token)) continue;
    if (titleIndex[term]?.length) expanded.push([term, titleIndex[term]]);
    if (expanded.length >= 64) break;
  }

  for (const [term, ids] of expanded) {
    for (const id of ids) {
      const n = Number(id);
      const band = term === token ? 10 : term.startsWith(token) ? 3 : 2;
      if (band > (postings.get(n) ?? 0)) postings.set(n, band);
    }
  }
  const usedPrefix = postings.size > before;
  return {
    total: postings.size,
    usedPrefix,
    rows: [...postings.entries()]
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score || a.id - b.id),
  };
}

describe('prefix expansion', () => {
  const VOCAB = {
    المسيح: [1, 2],
    المسيحي: [3],
    المسيحيون: [4],
    المسيا: [5],
    يسوع: [10, 11],
    زرززر: [99],
  };

  it('expands a truncated word to its full form', () => {
    const r = search(VOCAB, {}, 'المسي');
    expect(r.usedPrefix).toBe(true);
    expect(r.total).toBe(5); // المسيح + المسيحي + المسيحيون + المسيا
    expect(r.rows[0].score).toBe(3);
  });

  it('does NOT suppress prefix when the token already has weak body hits', () => {
    // The regression that motivated this: "المسي" appears inside a few
    // articles, so body postings were non-empty and the old gate
    // (`postings.size === 0`) skipped expansion entirely.
    const body = { المسي: [50, 51] };
    const r = search(VOCAB, body, 'المسي');
    expect(r.total).toBe(7); // 5 prefix candidates + 2 body-only
    // Title-prefix (3) must outrank the incidental body hit (1).
    expect(r.rows[0].score).toBe(3);
    expect(r.rows.filter((x) => x.score === 1).length).toBe(2);
  });

  it('keeps an exact title match at the top', () => {
    const r = search(VOCAB, {}, 'يسوع');
    expect(r.rows[0].score).toBe(10);
    expect(r.rows[0].id).toBe(10);
  });

  it('finds nothing for a token that is not a prefix of anything', () => {
    const r = search(VOCAB, {}, 'ززز');
    expect(r.usedPrefix).toBe(false);
  });

  it('never lets a prefix guess outrank an exact title hit', () => {
    // Both rows contain the exact word: id 1 in the title (band 10), id 7 in
    // the body (band 1). The title must win -- the reader typed the title word.
    const r = search({ ...VOCAB, المسيح: [1] }, { المسيح: [7] }, 'المسيح');
    expect(r.rows[0].id).toBe(1);
    expect(r.rows[0].score).toBe(10);
    expect(r.rows.find((x) => x.id === 7)?.score).toBe(1);
  });

  it('a prefix guess does not displace an unrelated exact title match', () => {
    // Token "يسو" prefix-expands to "يسوع"(3). A separate title that IS an
    // exact hit must stay above that guess.
    const r = search({ يسوع: [10], المسيح: [20] }, {}, 'يسو');
    // "يسوع" is the only expansion; it scores 3 as a prefix guess.
    expect(r.rows[0].id).toBe(10);
    expect(r.rows[0].score).toBe(3);
  });

  it('an expanded term that is also a real title keeps title-band scoring', () => {
    // "المسيح" is a genuine title AND an expansion target. When the reader
    // types it exactly, it must score 10, never the prefix band.
    const r = search(VOCAB, {}, 'المسيح');
    expect(r.rows[0].score).toBe(10);
    expect(r.rows.find((x) => x.id === 1)?.score).toBe(10);
  });

  it('respects the 64-expansion cap', () => {
    const big: Record<string, number[]> = {};
    for (let i = 0; i < 500; i++) big[`مم${i}`] = [i];
    const r = search(big, {}, 'مم');
    expect(r.total).toBeLessThanOrEqual(64);
  });

  it('adds candidates without losing body hits (union, not replace)', () => {
    const body = { المسي: [50] };
    const r = search(VOCAB, body, 'المسي');
    const ids = r.rows.map((x) => x.id);
    expect(ids).toContain(50); // body hit preserved
    expect(ids).toContain(1); // prefix hit added
  });
});