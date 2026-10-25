export type EncyclopediaSection = {
  id: string;
  title: string;
  icon: string;
  sectionCodes: string[];
  route?: '/marathon';
};

// Display-only grouping. Storage categories and section IDs remain unchanged.
export const ENCYCLOPEDIA_SECTIONS: EncyclopediaSection[] = [
  { id: 'bible', title: 'الكتاب المقدس', icon: '📖', sectionCodes: ['sec-01', 'sec-holy-bible-complete', 'sec-12', 'sec-20', 'sec-agpeya', 'sec-10'] },
  { id: 'commentary', title: 'تفسير الكتاب المقدس', icon: '✝️', sectionCodes: ['sec-02', 'sec-15', 'sec-16', 'sec-17', 'sec-19', 'sec-21', 'sec-22', 'sec-23', 'sec-24', 'sec-25', 'sec-26', 'sec-28', 'sec-29', 'sec-30', 'sec-31', 'sec-32', 'sec-33', 'sec-35'] },
  { id: 'translations', title: 'ترجمات الكتاب المقدس', icon: '🌍', sectionCodes: ['sec-34'] },
  { id: 'manuscripts', title: 'مخطوطات الكتاب المقدس', icon: '📜', sectionCodes: [] },
  { id: 'objections', title: 'شبهات الكتاب المقدس', icon: '❔', sectionCodes: ['sec-05', 'sec-11', 'sec-13', 'sec-27'] },
  { id: 'atlas', title: 'اطلس الكتاب المقدس', icon: '🗺️', sectionCodes: ['sec-04'] },
  { id: 'biblical-characters', title: 'موسوعة الشخصيات الكتابية', icon: '👥', sectionCodes: ['sec-07', 'sec-08', 'sec-09'] },
  { id: 'places-peoples', title: 'موسوعة الاماكن و الشعوب', icon: '🏺', sectionCodes: ['sec-18'] },
  { id: 'marathon', title: 'المارثون', icon: '🏆', sectionCodes: ['sec-06'], route: '/marathon' },
  { id: 'dictionaries', title: 'قواميس الكتاب المقدس', icon: '📚', sectionCodes: ['sec-03'] },
];
