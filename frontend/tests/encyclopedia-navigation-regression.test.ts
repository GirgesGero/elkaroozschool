import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('encyclopedia section navigation regression contract', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/app/bible/section/[code]/page.tsx'), 'utf8');

  it('avoids replaceState-style navigation loops by comparing the real URL', () => {
    expect(source).toContain('const currentUrl = typeof window');
    expect(source).toContain('if (currentUrl !== newUrl)');
  });

  it('ignores stale article responses after switching sections quickly', () => {
    expect(source).toContain('loadingRequestRef.current');
    expect(source).toContain('if (requestId !== loadingRequestRef.current) return;');
  });

  it('clears stale cards when a new section is selected', () => {
    expect(source).toContain('setArticles([]);');
    expect(source).toContain('loadSectionArticles(sec.id, 1);');
  });
});
