import { describe, it, expect } from 'vitest';
import { bibleService } from '@/lib/server/bible-service';

describe('Native Next.js Bible Encyclopedia Service', () => {
  it('loads manifest with 47,923 articles and 36 sections', () => {
    const manifest = bibleService.getManifest();
    expect(manifest).toBeDefined();
    expect(manifest.dataset_version).toBe('v1.0.0');
    expect(manifest.statistics.article_count).toBe(47923);
    expect(manifest.statistics.section_count).toBe(36);
  });

  it('loads categories and sections grouped correctly', () => {
    const categories = bibleService.getCategoriesAndSections();
    expect(categories.length).toBe(4);
    const totalSections = categories.reduce((acc, cat) => acc + (cat.sections?.length || 0), 0);
    expect(totalSections).toBe(36);
  });

  it('loads paginated section articles for section 1', () => {
    const res = bibleService.getSectionArticles(1, 1, 10);
    expect(res.section_id).toBe(1);
    expect(res.total).toBeGreaterThan(0);
    expect(res.items.length).toBe(10);
    expect(res.items[0].id).toBeDefined();
  });

  it('retrieves single article #1 and article #9400 correctly', () => {
    const art1 = bibleService.getArticle({ id: 1 });
    expect(art1).not.toBeNull();
    expect(art1?.id).toBe(1);
    expect(art1?.title).toBe('AvaTony');

    const art9400 = bibleService.getArticle({ id: 9400 });
    expect(art9400).not.toBeNull();
    expect(art9400?.id).toBe(9400);
    expect(art9400?.title).toContain('رِسَالَةُ بُولُسَ');
  });

  it('performs full-text search with Arabic normalization', () => {
    const res = bibleService.search('المسيح', { limit: 5 });
    expect(res.total).toBeGreaterThan(1000);
    expect(res.results.length).toBe(5);
    expect(res.results[0].snippet).toBeDefined();
  });

  it('returns valid statistics and daily verse', () => {
    const stats = bibleService.getStats();
    expect(stats.total_articles).toBe(47923);
    expect(stats.total_sections).toBe(36);
    expect(stats.daily_verse.text).toBeDefined();
  });
});
