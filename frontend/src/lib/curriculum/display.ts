export type CurriculumQueryResult = { error: unknown | null };

/** Return the first Supabase query failure so a failed request cannot masquerade as an empty curriculum. */
export function getCurriculumQueryError(results: readonly CurriculumQueryResult[]): unknown | null {
  return results.find((result) => result.error)?.error ?? null;
}

export function getCurriculumUploadGroupId(selectedGroupId: number | null, profileGroupId: number): number {
  return selectedGroupId ?? profileGroupId;
}

export function getCurriculumGroupLabel(groupId: number): string {
  switch (groupId) {
    case 1: return 'الفرقة الأولى';
    case 2: return 'الفرقة الثانية';
    case 3: return 'الفرقة الثالثة';
    default: return '';
  }
}
