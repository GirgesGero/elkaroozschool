import { describe, it, expect } from 'vitest';
import {
  getSections,
  getCategories,
  getArticle,
} from '@/lib/bible/browser-encyclopedia';

describe('Bible Section & Resolution Tests', () => {
  it('loads all categories and returns valid category codes', async () => {
    const cats = await getCategories();
    expect(cats.length).toBe(4);
    const codes = cats.map((c) => c.code);
    expect(codes).toContain('bible');
    expect(codes).toContain('commentaries');
    expect(codes).toContain('refs');
    expect(codes).toContain('theology');
  });

  it('loads sections filtered by category code', async () => {
    const bibleSections = await getSections('bible');
    expect(bibleSections.length).toBeGreaterThan(0);
    expect(bibleSections.some((s) => s.code === 'sec-holy-bible-complete')).toBe(true);

    const commentariesSections = await getSections('commentaries');
    expect(commentariesSections.length).toBeGreaterThan(0);
    expect(commentariesSections.some((s) => s.code === 'sec-02')).toBe(true);
  });

  it('loads all sections when no category code is passed', async () => {
    const allSections = await getSections();
    expect(allSections.length).toBeGreaterThanOrEqual(36);
  });

  describe('resolveArticleId strict Biblical book resolution', () => {
    it('accurately resolves Exodus chapter 2 without cross-matching', async () => {
      const art = await getArticle({ book: 'سفر الخروج', ch: 2 });
      expect(art).not.toBeNull();
      expect(art?.id).toBe(47966);
      expect(art?.book_name).toContain('الخروج');
      expect(art?.chapter_num).toBe(2);
    });

    it('distinguishes Gospel of John from 1 John, 2 John, 3 John, and Revelation', async () => {
      const gospelJohn = await getArticle({ book: 'إنجيل يوحنا', ch: 1 });
      const firstJohn = await getArticle({ book: 'رسالة يوحنا الأولى', ch: 1 });
      const secondJohn = await getArticle({ book: 'رسالة يوحنا الثانية', ch: 1 });
      const thirdJohn = await getArticle({ book: 'رسالة يوحنا الثالثة', ch: 1 });
      const revelation = await getArticle({ book: 'سفر الرؤيا', ch: 1 });

      expect(gospelJohn).not.toBeNull();
      expect(firstJohn).not.toBeNull();
      expect(secondJohn).not.toBeNull();
      expect(thirdJohn).not.toBeNull();
      expect(revelation).not.toBeNull();

      const ids = [
        gospelJohn?.id,
        firstJohn?.id,
        secondJohn?.id,
        thirdJohn?.id,
        revelation?.id,
      ];
      expect(new Set(ids).size).toBe(5);

      expect(gospelJohn?.book_name).toBe('إنجيل يوحنا');
      expect(firstJohn?.book_name).toBe('رسالة يوحنا الرسول الأولى');
      expect(secondJohn?.book_name).toBe('رسالة يوحنا الرسول الثانية');
      expect(thirdJohn?.book_name).toBe('رسالة يوحنا الرسول الثالثة');
      expect(revelation?.book_name).toBe('سفر رؤيا يوحنا اللاهوتي');
    });

    it('resolves epistles with and without honorifics (Peter 1 & 2, Corinthians 1 & 2)', async () => {
      const pet1 = await getArticle({ book: 'رسالة بطرس الأولى', ch: 1 });
      const pet2 = await getArticle({ book: 'رسالة بطرس الثانية', ch: 1 });
      expect(pet1?.id).not.toBe(pet2?.id);
      expect(pet1?.book_name).toContain('بطرس');
      expect(pet2?.book_name).toContain('بطرس');

      const cor1 = await getArticle({ book: 'كورنثوس الأولى', ch: 1 });
      const cor2 = await getArticle({ book: 'كورنثوس الثانية', ch: 1 });
      expect(cor1?.id).not.toBe(cor2?.id);
      expect(cor1?.book_name).toContain('كورنثوس');
      expect(cor2?.book_name).toContain('كورنثوس');
    });
  });

  describe('Section navigation contract', () => {
    it('direct section code (sec-holy-bible-complete) resolves to a valid section', async () => {
      const allSections = await getSections();
      const match = allSections.find((s) => s.code === 'sec-holy-bible-complete');
      expect(match).toBeDefined();
      expect(match!.title).toBeTruthy();
      expect(match!.category_id).toBeTruthy();
    });

    it('section code sec-02 resolves and has a parent category', async () => {
      const allSections = await getSections();
      const match = allSections.find((s) => s.code === 'sec-02');
      expect(match).toBeDefined();

      const cats = await getCategories();
      const parent = cats.find((c) => c.id === match!.category_id);
      expect(parent).toBeDefined();
      expect(parent!.code).toBe('commentaries');
    });

    it('category codes (bible, commentaries, refs, theology) each return filtered sections', async () => {
      for (const catCode of ['bible', 'commentaries', 'refs', 'theology']) {
        const secs = await getSections(catCode);
        expect(secs.length).toBeGreaterThan(0);
        // All returned sections belong to the same category
        const catIds = new Set(secs.map((s) => s.category_id));
        expect(catIds.size).toBe(1);
      }
    });
  });
});
