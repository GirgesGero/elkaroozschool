import { describe, expect, it } from 'vitest';
import { getCurriculumQueryError, getCurriculumGroupLabel, getCurriculumUploadGroupId } from '@/lib/curriculum/display';

describe('curriculum display helpers', () => {
  it('returns no error when every query succeeds', () => {
    expect(getCurriculumQueryError([
      { error: null },
      { error: null },
    ])).toBeNull();
  });

  it('returns the first query failure instead of letting the page show an empty state', () => {
    const failure = { message: 'permission denied' };
    expect(getCurriculumQueryError([
      { error: null },
      { error: failure },
      { error: { message: 'later failure' } },
    ])).toBe(failure);
  });

  it('uses the administrator-selected group for uploads and falls back to the own group', () => {
    expect(getCurriculumUploadGroupId(3, 1)).toBe(3);
    expect(getCurriculumUploadGroupId(null, 2)).toBe(2);
  });

  it('labels only the three supported student groups', () => {
    expect(getCurriculumGroupLabel(1)).toBe('الفرقة الأولى');
    expect(getCurriculumGroupLabel(2)).toBe('الفرقة الثانية');
    expect(getCurriculumGroupLabel(3)).toBe('الفرقة الثالثة');
    expect(getCurriculumGroupLabel(99)).toBe('');
  });
});
