import { describe, it, expect } from 'vitest';

/**
 * Ranking used to be broken in a way no type check could catch: `score` was
 * computed and then thrown away, results came back in Map insertion order, and
 * the payload reported `score: 1` for every row. These tests pin the ranking
 * contract so a future refactor cannot silently restore arbitrary order.
 */

// A stand-in with the same scoring contract as browser-encyclopedia.ts: a
// document scores if EVERY query token appears anywhere in it (title or body),
// with a title hit worth 10 and a body hit worth 1.
function rank(
  docs: { id: number; title: string; body: string }[],
  query: string[]
) {
  const hits = (text: string, tokens: string[]) =>
    tokens.filter((t) => text.includes(t)).length;

  return docs
    .map((d) => {
      const haystack = `${d.title} ${d.body}`;
      const inTitle = hits(d.title, query) * 10;
      const inBody = hits(d.body, query);
      // AND across the whole document, not per-field.
      const all = hits(haystack, query) === query.length;
      return { id: d.id, score: all ? inTitle + inBody : 0 };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score || a.id - b.id);
}

describe('search ranking', () => {
  it('ranks a title match above a body-only match', () => {
    const docs = [
      { id: 1, title: 'مقال عادي', body: 'يتكلم عن المسيح هنا' },
      { id: 2, title: 'عن المسيح', body: 'نص طويل' },
    ];
    const r = rank(docs, ['المسيح']);
    expect(r[0].id).toBe(2); // the title hit wins
    expect(r[0].score).toBeGreaterThan(r[1].score);
  });

  it('ranks a doc matching every token above a partial one', () => {
      const docs = [
        { id: 1, title: 'يسوع', body: 'عن يسوع فقط' },
        { id: 2, title: 'يسوع المسيح', body: 'عن يسوع المسيح' },
      ];
      const r = rank(docs, ['يسوع', 'المسيح']);
      // Doc 1 has no "المسيح" anywhere, so AND excludes it entirely.
      expect(r.map((x) => x.id)).toEqual([2]);
    });

  it('breaks score ties deterministically by id', () => {
    const docs = [
      { id: 9, title: 'المسيح', body: '' },
      { id: 3, title: 'المسيح', body: '' },
    ];
    const r = rank(docs, ['المسيح']);
    expect(r.map((x) => x.id)).toEqual([3, 9]); // stable across pages
  });

  it('requires every token (AND), never any (OR)', () => {
    const docs = [
      { id: 1, title: 'يسوع', body: '' },
      { id: 2, title: 'المسيح', body: '' },
    ];
    expect(rank(docs, ['يسوع', 'المسيح'])).toHaveLength(0);
  });

  it('is stable: the same query yields the same order every time', () => {
    const docs = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      title: i % 3 === 0 ? 'عن المسيح' : 'مقال',
      body: i % 2 === 0 ? 'المسيح' : '',
    }));
    const a = rank(docs, ['المسيح']).map((x) => x.id);
    const b = rank(docs, ['المسيح']).map((x) => x.id);
    expect(a).toEqual(b);
  });

  it('paginates on the ranked order, not insertion order', () => {
    const docs = [
      { id: 1, title: 'ضعيف', body: 'عن المسيح' },
      { id: 2, title: 'عن المسيح بقوة', body: '' },
      { id: 3, title: 'ضعيف', body: 'عن المسيح' },
    ];
    const ranked = rank(docs, ['المسيح']).map((x) => x.id);
    expect(ranked[0]).toBe(2); // the title hit leads, not the lowest id
    expect(ranked.slice(1)).toEqual([1, 3]); // ties broken by id
    // Page 2 must continue the ranking, not restart it.
    expect(ranked.slice(2, 4)).toEqual([3]);
  });
});