import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENCYCLOPEDIA_SECTIONS } from '@/lib/bible/encyclopedia-sections';

describe('Bible encyclopedia display taxonomy', () => {
  it('assigns every dataset section to exactly one of the ten requested groups', () => {
    const dataset = JSON.parse(
      readFileSync('public/storage/bible-dataset/v1/sections.json', 'utf8')
    ) as Array<{ code: string }>;
    const expectedTitles = [
      'الكتاب المقدس', 'تفسير الكتاب المقدس', 'ترجمات الكتاب المقدس', 'مخطوطات الكتاب المقدس',
      'شبهات الكتاب المقدس', 'اطلس الكتاب المقدس', 'موسوعة الشخصيات الكتابية',
      'موسوعة الاماكن و الشعوب', 'المارثون', 'قواميس الكتاب المقدس',
    ];

    expect(ENCYCLOPEDIA_SECTIONS.map(({ title }) => title)).toEqual(expectedTitles);
    const assignedCodes = ENCYCLOPEDIA_SECTIONS.flatMap(({ sectionCodes }) => sectionCodes);
    expect(new Set(assignedCodes).size).toBe(assignedCodes.length);
    expect([...assignedCodes].sort()).toEqual(dataset.map(({ code }) => code).sort());
    expect(ENCYCLOPEDIA_SECTIONS.find(({ id }) => id === 'marathon')).toMatchObject({
      sectionCodes: ['sec-06'], route: '/marathon',
    });
    expect(ENCYCLOPEDIA_SECTIONS.find(({ id }) => id === 'manuscripts')?.sectionCodes).toEqual([]);
  });
});
