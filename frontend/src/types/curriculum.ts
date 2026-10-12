export type CurriculumStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CurriculumDay {
  id: string;
  term_id: string;
  group_id: 1 | 2 | 3;
  day_number: number;
  title: string | null;
  study_date: string | null;
  status: CurriculumStatus;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface CurriculumEntry {
  id: string;
  day_id: string;
  lecture_id: string | null;
  group_id: 1 | 2 | 3;
  title: string;
  description: string | null;
  lecturer_id: string | null;
  audio_asset_id: string | null;
  content_metadata: Record<string, unknown>;
  sort_order: number;
  status: CurriculumStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
}

export interface CurriculumRevision {
  id: string;
  entry_id: string;
  revision_number: number;
  snapshot: Record<string, unknown>;
  changed_by: string;
  changed_at: string;
}
