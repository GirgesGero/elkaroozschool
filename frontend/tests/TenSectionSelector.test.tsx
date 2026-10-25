import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TenSectionSelector from '@/components/Bible/TenSectionSelector';
import { ENCYCLOPEDIA_SECTIONS } from '@/lib/bible/encyclopedia-sections';
import type { BibleCategory } from '@/lib/api/bible';

// Mock next/link to simple <a> element
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Build a mock categories array that contains all 36 sections
// The shape mirrors what the real API returns: each category has an id, code, title, and an array of sections.
// We split the flat section list into four artificial categories (like the legacy wingMeta) – the
// component will later regroup them according to ENCYCLOPEDIA_SECTIONS.
const sectionData = [
  ['sec-01', '01 الكتاب المقدس'], ['sec-holy-bible-complete', 'الكتاب المقدس الكامل'], ['sec-05', '05 شبهات الكتاب المقدس'], ['sec-06', '06 مسابقات الكتاب المقدس'],
  ['sec-12', '12 كتب أبوكريفا'], ['sec-13', 'أسئلة مسيحية'], ['sec-16', 'علم الأخرويات'], ['sec-17', 'علم الإنسان'], ['sec-19', 'علم الخلاص'],
  ['sec-20', 'علم الكتاب المقدس'], ['sec-21', 'علم الكنيسة'], ['sec-22', 'علم الله'], ['sec-23', 'علم المسيح'], ['sec-24', 'علم الملائكة'], ['sec-34', 'لغة قبطية'],
  ['sec-35', 'مناهج التربية الكنسية'], ['sec-02', '02 تفسير الكتاب المقدس'], ['sec-09', '09 مريم العذراء'], ['sec-15', 'علم الأباء'], ['sec-03', '03 قاموس الكتاب المقدس'],
  ['sec-04', '04 أطلس الكتاب المقدس'], ['sec-07', '07 شخصيات الكتاب المقدس'], ['sec-08', '08 شخصيات الكنيسة'], ['sec-18', 'علم التاريخ'],
  ['sec-agpeya', 'الأجبية - كتاب صلوات السواعي'], ['sec-10', '10 صلوات الكنيسة القبطية'], ['sec-11', '11 بدع وهرطقات'], ['sec-25', 'لاهوت أدبى'],
  ['sec-26', 'لاهوت دستورى'], ['sec-27', 'لاهوت دفاعى'], ['sec-28', 'لاهوت رعوى'], ['sec-29', 'لاهوت روحى'], ['sec-30', 'لاهوت طقسى'],
  ['sec-31', 'لاهوت عقيدى'], ['sec-32', 'لاهوت مقارن'], ['sec-33', 'لاهوت نظرى'],
] as const;

// Split the flat list into four legacy categories (the component does not rely on these codes for rendering)
const categories: BibleCategory[] = [
  { id: 1, code: 'bible', title: 'الكتاب المقدس', subtitle: '', icon: '📖', display_order: 1, sections: sectionData.slice(0, 16).map(([code, title], i) => ({
    id: i + 1,
    category_id: 1,
    code,
    title,
    icon: '📜',
    doc_count: 2,
    description: '',
    display_order: i + 1,
  })) },
  { id: 2, code: 'commentaries', title: 'التفاسير', subtitle: '', icon: '📜', display_order: 2, sections: sectionData.slice(16, 19).map(([code, title], i) => ({
    id: 100 + i,
    category_id: 2,
    code,
    title,
    icon: '📜',
    doc_count: 2,
    description: '',
    display_order: i + 1,
  })) },
  { id: 3, code: 'refs', title: 'المعاجم', subtitle: '', icon: '🗺️', display_order: 3, sections: sectionData.slice(19, 24).map(([code, title], i) => ({
    id: 200 + i,
    category_id: 3,
    code,
    title,
    icon: '📜',
    doc_count: 2,
    description: '',
    display_order: i + 1,
  })) },
  { id: 4, code: 'theology', title: 'اللاهوتيات', subtitle: '', icon: '✨', display_order: 4, sections: sectionData.slice(24).map(([code, title], i) => ({
    id: 300 + i,
    category_id: 4,
    code,
    title,
    icon: '📜',
    doc_count: 2,
    description: '',
    display_order: i + 1,
  })) },
];

describe('TenSectionSelector', () => {
  it('renders 10 groups, each with its assigned sections, and shows 36 unique links', () => {
    render(
      <TenSectionSelector
        categories={categories}
        onSelectCategory={vi.fn()}
      />
    );

    // Verify that each of the ten group titles from ENCYCLOPEDIA_SECTIONS is rendered
    // Verify that each group title is rendered (as plain text, not as a semantic heading)
    ENCYCLOPEDIA_SECTIONS.forEach(g => {
      expect(screen.getByText(g.title)).toBeInTheDocument();
    });

    // Verify that we have exactly 36 links to /bible/section/<code>
    const allLinks = screen.getAllByRole('link');
    const sectionLinks = allLinks.filter(l => (l.getAttribute('href') || '').startsWith('/bible/section/'));
    expect(sectionLinks).toHaveLength(36);
    const hrefs = sectionLinks.map(l => l.getAttribute('href'));
    expect(new Set(hrefs).size).toBe(36);

    // Verify each group contains its declared section codes via hrefs
    ENCYCLOPEDIA_SECTIONS.forEach(g => {
      const headingEl = screen.getByText(g.title);
      const groupEl = headingEl.closest('[data-encyclopedia-group]');
      expect(groupEl).not.toBeNull();
      g.sectionCodes.forEach(code => {
        const linksInGroup = within(groupEl as HTMLElement).getAllByRole('link', { name: /تصفح وثائق القسم/i });
        const hasCorrect = linksInGroup.some(l => l.getAttribute('href') === `/bible/section/${code}`);
        expect(hasCorrect).toBeTruthy();
      });
    });

    // Marathon link (the group exists even if empty)
    const marathonLink = screen.getByRole('link', { name: /الماراثون/i });
    expect(marathonLink).toHaveAttribute('href', '/marathon');
  });
});
