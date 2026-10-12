import { explainDbError } from '@/lib/errors/db';
import type { CurriculumDay, CurriculumEntry } from '@/types/curriculum';
import type { SupabaseClient } from '@supabase/supabase-js';

type WriteResult<T> = { data: T | null; error: { message?: string; code?: string } | null };

/** Phase 1 curriculum data access. All writes remain subject to Supabase RLS. */
export async function createCurriculumDay(
  supabase: SupabaseClient,
  input: Pick<CurriculumDay, 'term_id' | 'group_id' | 'day_number' | 'title' | 'study_date' | 'sort_order'>,
): Promise<CurriculumDay> {
  const result = await supabase
    .from('curriculum_days')
    .insert({ ...input, status: 'DRAFT' })
    .select()
    .single() as WriteResult<CurriculumDay>;
  if (result.error || !result.data) throw new Error(explainDbError(result.error));
  return result.data;
}

export async function updateCurriculumDay(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<CurriculumDay, 'day_number' | 'title' | 'study_date' | 'sort_order' | 'status'>>,
): Promise<CurriculumDay> {
  const result = await supabase.rpc('update_curriculum_day', {
    p_day_id: id,
    p_day_number: patch.day_number ?? null,
    p_title: patch.title ?? null,
    p_study_date: patch.study_date ?? null,
    p_sort_order: patch.sort_order ?? null,
  }) as WriteResult<CurriculumDay>;
  if (result.error || !result.data) throw new Error(explainDbError(result.error));
  return result.data;
}

export async function createCurriculumEntry(
  supabase: SupabaseClient,
  input: Pick<CurriculumEntry, 'day_id' | 'group_id' | 'title' | 'description' | 'lecturer_id' | 'sort_order'> &
    Partial<Pick<CurriculumEntry, 'lecture_id' | 'content_metadata'>>,
): Promise<CurriculumEntry> {
  const result = await supabase
    .from('curriculum_entries')
    .insert({ ...input, status: 'DRAFT' })
    .select()
    .single() as WriteResult<CurriculumEntry>;
  if (result.error || !result.data) throw new Error(explainDbError(result.error));
  return result.data;
}

export async function updateCurriculumEntry(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<CurriculumEntry, 'day_id' | 'title' | 'description' | 'lecturer_id' | 'sort_order' | 'status' | 'content_metadata'>>,
): Promise<CurriculumEntry> {
  const result = await supabase.rpc('update_curriculum_entry', {
    p_entry_id: id,
    p_day_id: patch.day_id ?? null,
    p_title: patch.title ?? null,
    p_description: patch.description ?? null,
    p_lecturer_id: patch.lecturer_id ?? null,
    p_sort_order: patch.sort_order ?? null,
    p_content_metadata: patch.content_metadata ?? null,
  }) as WriteResult<CurriculumEntry>;
  if (result.error || !result.data) throw new Error(explainDbError(result.error));
  return result.data;
}

export async function publishCurriculumDay(
  supabase: SupabaseClient,
  dayId: string,
): Promise<CurriculumDay> {
  const result = await supabase.rpc('publish_curriculum_day', { p_day_id: dayId }) as WriteResult<CurriculumDay>;
  if (result.error || !result.data) throw new Error(explainDbError(result.error));
  return result.data;
}
