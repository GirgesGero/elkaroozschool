export type UserRole = 'admin' | 'super_user' | 'servant' | 'secretariat' | 'trainee';

export type DelegatedPermission = 
  | 'MANAGE_LECTURES'
  | 'MANAGE_CURRICULUM'
  | 'MANAGE_MARATHON'
  | 'GRADE_EXAMS'
  | 'MANAGE_BOOKS';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export type AppreciationGrade = 'ضعيف' | 'مقبول' | 'جيد' | 'جيد جدًا' | 'ممتاز';

export type NotificationCategory = 'PASTORAL' | 'BIRTHDAY' | 'DAILY_VERSE' | 'SYSTEM';

export type ReactionType = 'LIKE' | 'LOVE' | 'PRAY' | 'AMEN';

export interface Group {
  id: 1 | 2 | 3;
  name_ar: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  birth_date: string;
  phone: string | null;
  address: string | null;
  church: string | null;
  confession_father: string | null;
  role_id: UserRole;
  group_id: 1 | 2 | 3;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface ServantPermission {
  id: string;
  profile_id: string;
  permission_id: DelegatedPermission;
  granted_by: string;
  granted_at: string;
}

export interface Secretariat {
  id: string;
  profile_id: string;
  group_id: 1 | 2 | 3;
  appointed_by: string;
  appointed_at: string;
}

export interface FeedPost {
  id: string;
  author_id: string;
  content_text: string;
  images_metadata: Array<{
    url: string;
    width?: number;
    height?: number;
    size?: number;
  }>;
  reactions_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
  user_reaction?: ReactionType | null;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface Reaction {
  id: string;
  target_type: 'POST' | 'COMMENT';
  target_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  group_id: 1 | 2 | 3;
  trainee_id: string;
  status: AttendanceStatus;
  recorded_by: string;
  recorded_at: string;
  updated_at: string;
  trainee?: Profile;
}

export interface NotificationItem {
  id: string;
  recipient_id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DailyVerse {
  id: string;
  verse_text: string;
  reference: string;
  display_order: number;
  is_sent: boolean;
  last_sent_date: string | null;
  created_at: string;
}

export interface BibleVerse {
  id: number;
  chapter_id: number;
  book_id: number;
  verse_number: number;
  text_ar: string;
  text_clean: string;
  source_url: string;
  words?: BibleVerseWord[];
  commentaries?: BibleCommentary[];
}

export interface BibleVerseWord {
  id: number;
  verse_id: number;
  word_position: number;
  word_text: string;
  clean_word: string;
  has_commentary: boolean;
  explanation?: {
    title: string;
    text: string;
    source_url: string;
  };
}

export interface BibleCommentary {
  id: number;
  verse_id: number;
  source_id: string;
  commentary_title: string | null;
  commentary_text: string;
  source_url: string;
  source_author?: string;
}
