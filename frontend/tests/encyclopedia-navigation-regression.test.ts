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
    expect(source).toContain('articleRequestRef.current');
    expect(source).toContain('if (requestId !== articleRequestRef.current) return;');
  });

  it('deduplicates article loads for the same section and page key', () => {
    expect(source).toContain('loadedKeyRef.current');
    expect(source).toContain('const targetKey = `${targetSec.id}:${p}`');
  });

  it('clears stale cards when a new section is selected', () => {
    expect(source).toContain('setArticles([]);');
    expect(source).toContain('loadSectionArticles(sec.id, 1);');
  });

  it('prevents URL-to-state effect from fighting state-to-URL effect in section browser', () => {
    expect(source).toContain('}, [selectedSection, currentPage, categoryCode, router]);');
    expect(source).toContain('}, [searchParams, sections, loadSectionArticles]);');
  });
});

describe('bible reader and encyclopedia hub navigation regression contract', () => {
  const biblePageSource = readFileSync(resolve(process.cwd(), 'src/app/bible/page.tsx'), 'utf8');
  const selectorSource = readFileSync(resolve(process.cwd(), 'src/components/Bible/TenSectionSelector.tsx'), 'utf8');

  it('prevents infinite get_chapter_verses_with_words loops by decoupling URL-to-state and state-to-URL effects', () => {
    expect(biblePageSource).toContain('}, [viewMode, selectedBookId, selectedChapter, router]);');
    expect(biblePageSource).toContain('}, [searchParams, books]);');
    expect(biblePageSource).not.toContain('}, [searchParams, books, viewMode, selectedBookId, selectedChapter]);');
  });

  it('loads chapter verses only in reader mode and deduplicates chapter keys', () => {
    expect(biblePageSource).toContain("if (viewMode !== 'reader' || !selectedBookId || !selectedChapter || books.length === 0) return;");
    expect(biblePageSource).toContain('loadedChapterKeyRef.current');
  });

  it('toggles accordion groups in TenSectionSelector without hijacking page navigation', () => {
    expect(selectorSource).toContain('onClick={() => toggleGroup(group.id)}');
    expect(selectorSource).not.toContain('onClick={() => { toggleGroup(group.id); onSelectCategory?.(group.id); }}');
  });
});

describe('encyclopedia article sanitation and formatting contract', () => {
  const browserSource = readFileSync(resolve(process.cwd(), 'src/lib/bible/browser-encyclopedia.ts'), 'utf8');
  const readerSource = readFileSync(resolve(process.cwd(), 'src/app/bible/reader/[id]/page.tsx'), 'utf8');
  const cssSource = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

  it('permanently blocks AvaTony in browser encyclopedia loader and index queries', () => {
    expect(browserSource).toContain('/avatony/i.test(it.title || \'\')');
    expect(browserSource).toContain('if (num === 1 || Number.isNaN(num)) return null;');
    expect(browserSource).toContain('if (articleId === null || articleId === 1) return null;');
  });

  it('blocks AvaTony in the article reader UI', () => {
    expect(readerSource).toContain('if (articleId > 1)');
    expect(readerSource).toContain('/avatony/i.test(data.title || \'\')');
  });

  it('sanitizes binary corrupted image payloads into clean archival notice cards', () => {
    expect(readerSource).toContain('function isBinaryContent(content: string)');
    expect(readerSource).toContain('Software: Microsoft Office');
    expect(readerSource).toContain('archival-notice-card');
  });

  it('reconstitutes fragmented verse-p elements without verse numbers into readable paragraphs', () => {
    expect(readerSource).toContain('function formatArticleProse');
    expect(readerSource).toContain('bible-prose-p');
  });

  it('enforces responsive, full-width, justified typography in globals.css for bible-article-body', () => {
    expect(cssSource).toContain('.bible-article-body');
    expect(cssSource).toContain('.bible-article-body table');
    expect(cssSource).toContain('text-justify: inter-word;');
  });
});
