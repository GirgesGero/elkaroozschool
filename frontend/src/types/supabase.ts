export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          deleted_at: string | null
          deleted_by: string | null
          group_id: number
          id: string
          notes: string | null
          recorded_at: string
          recorded_by: string | null
          session_id: string
          status: string
          trainee_id: string
          updated_at: string
        }
        Insert: {
          deleted_at?: string | null
          deleted_by?: string | null
          group_id: number
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          session_id: string
          status: string
          trainee_id: string
          updated_at?: string
        }
        Update: {
          deleted_at?: string | null
          deleted_by?: string | null
          group_id?: number
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          session_id?: string
          status?: string
          trainee_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          closed_at: string | null
          created_at: string
          group_id: number
          id: string
          session_date: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          group_id: number
          id?: string
          session_date: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          group_id?: number
          id?: string
          session_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: number
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: number
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      backup_records: {
        Row: {
          checksum_sha256: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          file_size_bytes: number
          filename: string
          id: string
          status: string
          storage_path: string | null
          storage_type: string
        }
        Insert: {
          checksum_sha256: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_size_bytes: number
          filename: string
          id?: string
          status?: string
          storage_path?: string | null
          storage_type?: string
        }
        Update: {
          checksum_sha256?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_size_bytes?: number
          filename?: string
          id?: string
          status?: string
          storage_path?: string | null
          storage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_records_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_books: {
        Row: {
          chapters_count: number
          code: string
          id: number
          name_ar: string
          name_en: string | null
          order_index: number
          source_url: string
          testament_id: number
        }
        Insert: {
          chapters_count?: number
          code: string
          id: number
          name_ar: string
          name_en?: string | null
          order_index: number
          source_url: string
          testament_id: number
        }
        Update: {
          chapters_count?: number
          code?: string
          id?: number
          name_ar?: string
          name_en?: string | null
          order_index?: number
          source_url?: string
          testament_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "bible_books_testament_id_fkey"
            columns: ["testament_id"]
            isOneToOne: false
            referencedRelation: "bible_testaments"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_chapters: {
        Row: {
          book_id: number
          chapter_number: number
          id: number
          source_url: string
          verses_count: number
        }
        Insert: {
          book_id: number
          chapter_number: number
          id?: number
          source_url: string
          verses_count?: number
        }
        Update: {
          book_id?: number
          chapter_number?: number
          id?: number
          source_url?: string
          verses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "bible_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "bible_books"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_commentaries: {
        Row: {
          commentary_text: string
          commentary_title: string | null
          id: number
          source_id: string
          source_url: string
          verse_id: number
        }
        Insert: {
          commentary_text: string
          commentary_title?: string | null
          id?: number
          source_id: string
          source_url: string
          verse_id: number
        }
        Update: {
          commentary_text?: string
          commentary_title?: string | null
          id?: number
          source_id?: string
          source_url?: string
          verse_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "bible_commentaries_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "bible_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_commentaries_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "bible_verses"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_content_versions: {
        Row: {
          checksum_sha256: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          manifest: Json
          total_books: number
          total_chapters: number
          total_commentaries: number
          total_dictionary_entries: number
          total_verses: number
          version_tag: string
        }
        Insert: {
          checksum_sha256: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          manifest?: Json
          total_books?: number
          total_chapters?: number
          total_commentaries?: number
          total_dictionary_entries?: number
          total_verses?: number
          version_tag: string
        }
        Update: {
          checksum_sha256?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          manifest?: Json
          total_books?: number
          total_chapters?: number
          total_commentaries?: number
          total_dictionary_entries?: number
          total_verses?: number
          version_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "bible_content_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_dictionary_entries: {
        Row: {
          author_name: string
          clean_term: string
          created_at: string
          id: string
          original_content: string
          source_url: string
          term: string
          title: string
        }
        Insert: {
          author_name?: string
          clean_term: string
          created_at?: string
          id?: string
          original_content: string
          source_url: string
          term: string
          title: string
        }
        Update: {
          author_name?: string
          clean_term?: string
          created_at?: string
          id?: string
          original_content?: string
          source_url?: string
          term?: string
          title?: string
        }
        Relationships: []
      }
      bible_sources: {
        Row: {
          author_name: string
          base_url: string
          description: string | null
          id: string
          source_name: string
        }
        Insert: {
          author_name: string
          base_url: string
          description?: string | null
          id: string
          source_name: string
        }
        Update: {
          author_name?: string
          base_url?: string
          description?: string | null
          id?: string
          source_name?: string
        }
        Relationships: []
      }
      bible_testaments: {
        Row: {
          code: string
          id: number
          name_ar: string
          name_en: string
          order_index: number
        }
        Insert: {
          code: string
          id: number
          name_ar: string
          name_en: string
          order_index: number
        }
        Update: {
          code?: string
          id?: number
          name_ar?: string
          name_en?: string
          order_index?: number
        }
        Relationships: []
      }
      bible_verse_words: {
        Row: {
          clean_word: string
          has_commentary: boolean
          id: number
          verse_id: number
          word_position: number
          word_text: string
        }
        Insert: {
          clean_word: string
          has_commentary?: boolean
          id?: number
          verse_id: number
          word_position: number
          word_text: string
        }
        Update: {
          clean_word?: string
          has_commentary?: boolean
          id?: number
          verse_id?: number
          word_position?: number
          word_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "bible_verse_words_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "bible_verses"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_verses: {
        Row: {
          book_id: number
          chapter_id: number
          id: number
          source_url: string
          text_ar: string
          text_clean: string
          verse_number: number
        }
        Insert: {
          book_id: number
          chapter_id: number
          id?: number
          source_url: string
          text_ar: string
          text_clean: string
          verse_number: number
        }
        Update: {
          book_id?: number
          chapter_id?: number
          id?: number
          source_url?: string
          text_ar?: string
          text_clean?: string
          verse_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "bible_verses_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "bible_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_verses_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "bible_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_word_commentaries: {
        Row: {
          explanation_text: string
          explanation_title: string | null
          id: number
          source_id: string
          source_url: string
          word_id: number
        }
        Insert: {
          explanation_text: string
          explanation_title?: string | null
          id?: number
          source_id: string
          source_url: string
          word_id: number
        }
        Update: {
          explanation_text?: string
          explanation_title?: string | null
          id?: number
          source_id?: string
          source_url?: string
          word_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "bible_word_commentaries_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "bible_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_word_commentaries_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "bible_verse_words"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          category_id: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          file_size_bytes: number
          file_url: string
          group_id: number | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_size_bytes?: number
          file_url: string
          group_id?: number | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_size_bytes?: number
          file_url?: string
          group_id?: number | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name_ar: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_ar: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          name_ar?: string
          type?: string
        }
        Relationships: []
      }
      curriculum_days: {
        Row: {
          created_at: string
          created_by: string
          day_number: number
          deleted_at: string | null
          deleted_by: string | null
          group_id: number
          id: string
          published_at: string | null
          published_by: string | null
          sort_order: number
          status: string
          study_date: string | null
          term_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          day_number: number
          deleted_at?: string | null
          deleted_by?: string | null
          group_id: number
          id?: string
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: string
          study_date?: string | null
          term_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          day_number?: number
          deleted_at?: string | null
          deleted_by?: string | null
          group_id?: number
          id?: string
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: string
          study_date?: string | null
          term_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_days_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_days_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_days_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_days_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_days_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_entries: {
        Row: {
          audio_asset_id: string | null
          content_metadata: Json
          created_at: string
          created_by: string
          day_id: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          group_id: number
          id: string
          lecture_id: string | null
          lecturer_id: string | null
          published_at: string | null
          published_by: string | null
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audio_asset_id?: string | null
          content_metadata?: Json
          created_at?: string
          created_by?: string
          day_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          group_id: number
          id?: string
          lecture_id?: string | null
          lecturer_id?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audio_asset_id?: string | null
          content_metadata?: Json
          created_at?: string
          created_by?: string
          day_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          group_id?: number
          id?: string
          lecture_id?: string | null
          lecturer_id?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_entries_audio_asset_id_fkey"
            columns: ["audio_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_entries_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "curriculum_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_entries_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_entries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_entries_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_entries_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "lecturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_entries_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_revisions: {
        Row: {
          changed_at: string
          changed_by: string
          entry_id: string
          id: string
          revision_number: number
          snapshot: Json
        }
        Insert: {
          changed_at?: string
          changed_by?: string
          entry_id: string
          id?: string
          revision_number: number
          snapshot: Json
        }
        Update: {
          changed_at?: string
          changed_by?: string
          entry_id?: string
          id?: string
          revision_number?: number
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_revisions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_revisions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "curriculum_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculums: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          file_size_bytes: number
          file_type: string
          file_url: string
          group_id: number
          id: string
          term_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          file_size_bytes?: number
          file_type?: string
          file_url: string
          group_id: number
          id?: string
          term_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          file_size_bytes?: number
          file_type?: string
          file_url?: string
          group_id?: number
          id?: string
          term_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculums_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculums_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculums_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculums_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_verse_dispatch_state: {
        Row: {
          current_cycle: number
          id: number
          last_dispatch_date: string | null
          last_verse_id: string | null
          mode: string
        }
        Insert: {
          current_cycle?: number
          id?: number
          last_dispatch_date?: string | null
          last_verse_id?: string | null
          mode?: string
        }
        Update: {
          current_cycle?: number
          id?: number
          last_dispatch_date?: string | null
          last_verse_id?: string | null
          mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_verse_dispatch_state_last_verse_id_fkey"
            columns: ["last_verse_id"]
            isOneToOne: false
            referencedRelation: "daily_verses"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_verses: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          display_order: number
          id: string
          is_sent: boolean
          last_sent_date: string | null
          reference: string
          updated_at: string
          verse_text: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_order?: number
          id?: string
          is_sent?: boolean
          last_sent_date?: string | null
          reference: string
          updated_at?: string
          verse_text: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_order?: number
          id?: string
          is_sent?: boolean
          last_sent_date?: string | null
          reference?: string
          updated_at?: string
          verse_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_verses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_verses_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_grades: {
        Row: {
          appreciation_grade: string
          deleted_at: string | null
          deleted_by: string | null
          exam_id: string
          graded_at: string
          graded_by: string | null
          group_id: number
          id: string
          notes: string | null
          numeric_score: number
          trainee_id: string
          updated_at: string
        }
        Insert: {
          appreciation_grade: string
          deleted_at?: string | null
          deleted_by?: string | null
          exam_id: string
          graded_at?: string
          graded_by?: string | null
          group_id: number
          id?: string
          notes?: string | null
          numeric_score: number
          trainee_id: string
          updated_at?: string
        }
        Update: {
          appreciation_grade?: string
          deleted_at?: string | null
          deleted_by?: string | null
          exam_id?: string
          graded_at?: string
          graded_by?: string | null
          group_id?: number
          id?: string
          notes?: string | null
          numeric_score?: number
          trainee_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_grades_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_grades_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_grades_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_grades_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          exam_date: string
          group_id: number
          id: string
          max_score: number
          term_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          exam_date: string
          group_id: number
          id?: string
          max_score?: number
          term_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          exam_date?: string
          group_id?: number
          id?: string
          max_score?: number
          term_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          author_id: string
          comments_count: number
          content: string | null
          content_text: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          images_metadata: Json | null
          reactions_count: number
          updated_at: string
        }
        Insert: {
          author_id?: string
          comments_count?: number
          content?: string | null
          content_text: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          images_metadata?: Json | null
          reactions_count?: number
          updated_at?: string
        }
        Update: {
          author_id?: string
          comments_count?: number
          content?: string | null
          content_text?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          images_metadata?: Json | null
          reactions_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_albums: {
        Row: {
          category_id: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          event_date: string | null
          group_id: number | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          event_date?: string | null
          group_id?: number | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          event_date?: string | null
          group_id?: number | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_albums_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_albums_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_albums_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_albums_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          album_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          group_id: number | null
          id: string
          image_url: string
          order_index: number
          title: string | null
        }
        Insert: {
          album_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          group_id?: number | null
          id?: string
          image_url: string
          order_index?: number
          title?: string | null
        }
        Update: {
          album_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          group_id?: number | null
          id?: string
          image_url?: string
          order_index?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_items_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      general_secretariat_members: {
        Row: {
          appointed_at: string
          appointed_by: string | null
          is_active: boolean
          profile_id: string
          updated_at: string
        }
        Insert: {
          appointed_at?: string
          appointed_by?: string | null
          is_active?: boolean
          profile_id: string
          updated_at?: string
        }
        Update: {
          appointed_at?: string
          appointed_by?: string | null
          is_active?: boolean
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "general_secretariat_members_appointed_by_fkey"
            columns: ["appointed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_secretariat_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      general_secretariat_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          permission_id: string
          profile_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          permission_id: string
          profile_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          permission_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "general_secretariat_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_secretariat_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_secretariat_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "general_secretariat_members"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      group_secretariat: {
        Row: {
          appointed_at: string
          appointed_by: string | null
          group_id: number
          id: string
          is_active: boolean
          profile_id: string
        }
        Insert: {
          appointed_at?: string
          appointed_by?: string | null
          group_id: number
          id?: string
          is_active?: boolean
          profile_id: string
        }
        Update: {
          appointed_at?: string
          appointed_by?: string | null
          group_id?: number
          id?: string
          is_active?: boolean
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_secretariat_appointed_by_fkey"
            columns: ["appointed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_secretariat_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_secretariat_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name_ar: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: number
          name_ar: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name_ar?: string
        }
        Relationships: []
      }
      import_history: {
        Row: {
          checksum_sha256: string | null
          created_at: string
          created_by: string | null
          error_details: Json | null
          execution_time_ms: number | null
          filename: string
          id: string
          import_mode: string
          import_type: string
          new_accounts_count: number
          original_file_storage_path: string
          status: string
          total_rows: number
          updated_accounts_count: number
        }
        Insert: {
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          error_details?: Json | null
          execution_time_ms?: number | null
          filename: string
          id?: string
          import_mode?: string
          import_type?: string
          new_accounts_count?: number
          original_file_storage_path: string
          status?: string
          total_rows?: number
          updated_accounts_count?: number
        }
        Update: {
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          error_details?: Json | null
          execution_time_ms?: number | null
          filename?: string
          id?: string
          import_mode?: string
          import_type?: string
          new_accounts_count?: number
          original_file_storage_path?: string
          status?: string
          total_rows?: number
          updated_accounts_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lecturers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          full_name: string
          id: string
          title: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          full_name: string
          id?: string
          title: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          full_name?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecturers_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          attachments_metadata: Json | null
          audio_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          group_id: number
          id: string
          lecture_date: string
          lecturer_id: string | null
          term_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments_metadata?: Json | null
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          group_id: number
          id?: string
          lecture_date: string
          lecturer_id?: string | null
          term_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachments_metadata?: Json | null
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          group_id?: number
          id?: string
          lecture_date?: string
          lecturer_id?: string | null
          term_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lectures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "lecturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      marathon_answers: {
        Row: {
          answer_text: string
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
        }
        Insert: {
          answer_text: string
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id: string
        }
        Update: {
          answer_text?: string
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marathon_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "marathon_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      marathon_question_revisions: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          options: Json
          order_index: number
          question_id: string
          question_text: string
          question_type: string
          revision_number: number
          section_id: string | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          options?: Json
          order_index: number
          question_id: string
          question_text: string
          question_type: string
          revision_number: number
          section_id?: string | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          options?: Json
          order_index?: number
          question_id?: string
          question_text?: string
          question_type?: string
          revision_number?: number
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marathon_question_revisions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathon_question_revisions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "marathon_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathon_question_revisions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "marathon_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      marathon_questions: {
        Row: {
          created_at: string
          id: string
          marathon_id: string
          order_index: number
          published_at: string | null
          published_by: string | null
          question_text: string
          question_type: string
          score_weight: number
          section_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          marathon_id: string
          order_index?: number
          published_at?: string | null
          published_by?: string | null
          question_text: string
          question_type?: string
          score_weight?: number
          section_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          marathon_id?: string
          order_index?: number
          published_at?: string | null
          published_by?: string | null
          question_text?: string
          question_type?: string
          score_weight?: number
          section_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marathon_questions_marathon_id_fkey"
            columns: ["marathon_id"]
            isOneToOne: false
            referencedRelation: "marathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathon_questions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathon_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "marathon_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      marathon_sections: {
        Row: {
          created_at: string
          id: string
          marathon_id: string
          order_index: number
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          marathon_id: string
          order_index?: number
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          marathon_id?: string
          order_index?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "marathon_sections_marathon_id_fkey"
            columns: ["marathon_id"]
            isOneToOne: false
            referencedRelation: "marathons"
            referencedColumns: ["id"]
          },
        ]
      }
      marathon_trainee_answers: {
        Row: {
          answered_at: string
          created_at: string
          id: string
          is_correct: boolean
          is_reopened: boolean
          question_id: string
          score_awarded: number
          selected_answer_id: string | null
          submission_id: string
        }
        Insert: {
          answered_at?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          is_reopened?: boolean
          question_id: string
          score_awarded?: number
          selected_answer_id?: string | null
          submission_id: string
        }
        Update: {
          answered_at?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          is_reopened?: boolean
          question_id?: string
          score_awarded?: number
          selected_answer_id?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marathon_trainee_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "marathon_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathon_trainee_answers_selected_answer_id_fkey"
            columns: ["selected_answer_id"]
            isOneToOne: false
            referencedRelation: "marathon_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathon_trainee_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "marathon_trainee_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      marathon_trainee_submissions: {
        Row: {
          appreciation_grade: string
          created_at: string
          group_id: number
          id: string
          is_reopened: boolean
          is_submitted: boolean
          marathon_id: string
          reopened_at: string | null
          reopened_by: string | null
          submitted_at: string | null
          total_score: number
          trainee_id: string
        }
        Insert: {
          appreciation_grade?: string
          created_at?: string
          group_id: number
          id?: string
          is_reopened?: boolean
          is_submitted?: boolean
          marathon_id: string
          reopened_at?: string | null
          reopened_by?: string | null
          submitted_at?: string | null
          total_score?: number
          trainee_id?: string
        }
        Update: {
          appreciation_grade?: string
          created_at?: string
          group_id?: number
          id?: string
          is_reopened?: boolean
          is_submitted?: boolean
          marathon_id?: string
          reopened_at?: string | null
          reopened_by?: string | null
          submitted_at?: string | null
          total_score?: number
          trainee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marathon_trainee_submissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathon_trainee_submissions_marathon_id_fkey"
            columns: ["marathon_id"]
            isOneToOne: false
            referencedRelation: "marathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathon_trainee_submissions_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathon_trainee_submissions_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marathons: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          end_date: string | null
          group_id: number
          id: string
          is_active: boolean
          start_date: string | null
          term_id: string
          title: string
          total_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          group_id: number
          id?: string
          is_active?: boolean
          start_date?: string | null
          term_id: string
          title: string
          total_score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          group_id?: number
          id?: string
          is_active?: boolean
          start_date?: string | null
          term_id?: string
          title?: string
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marathons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathons_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marathons_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          checksum_sha256: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          drive_file_id: string
          drive_folder_id: string
          file_name: string
          file_size_bytes: number
          group_id: number | null
          id: string
          mime_type: string
          resource_id: string | null
          resource_type: string
          status: string
          storage_provider: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          checksum_sha256: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          drive_file_id: string
          drive_folder_id: string
          file_name: string
          file_size_bytes: number
          group_id?: number | null
          id?: string
          mime_type: string
          resource_id?: string | null
          resource_type: string
          status?: string
          storage_provider?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          checksum_sha256?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          drive_file_id?: string
          drive_folder_id?: string
          file_name?: string
          file_size_bytes?: number
          group_id?: number | null
          id?: string
          mime_type?: string
          resource_id?: string | null
          resource_type?: string
          status?: string
          storage_provider?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mp3_tracks: {
        Row: {
          audio_url: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration_seconds: number
          file_size_bytes: number
          group_id: number
          id: string
          lecturer_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_seconds?: number
          file_size_bytes?: number
          group_id: number
          id?: string
          lecturer_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_seconds?: number
          file_size_bytes?: number
          group_id?: number
          id?: string
          lecturer_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp3_tracks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp3_tracks_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp3_tracks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp3_tracks_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "lecturers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          id: string
          template_body: string
          template_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          template_body: string
          template_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          template_body?: string
          template_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          category: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          title: string
        }
        Insert: {
          action_url?: string | null
          body: string
          category: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          title: string
        }
        Update: {
          action_url?: string | null
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name_ar: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          name_ar: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name_ar?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_id: string
          comment_text: string
          content: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          comment_text: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          comment_text?: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_images: {
        Row: {
          created_at: string
          file_size_bytes: number | null
          height: number | null
          id: string
          image_url: string
          order_index: number
          post_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          image_url: string
          order_index?: number
          post_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          image_url?: string
          order_index?: number
          post_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birth_date: string
          church: string | null
          confession_father: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          father_name: string | null
          full_name: string
          google_maps_location: string | null
          group_id: number
          id: string
          is_active: boolean
          phone: string | null
          role_id: string
          updated_at: string
          username: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birth_date: string
          church?: string | null
          confession_father?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          father_name?: string | null
          full_name: string
          google_maps_location?: string | null
          group_id: number
          id: string
          is_active?: boolean
          phone?: string | null
          role_id: string
          updated_at?: string
          username: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string
          church?: string | null
          confession_father?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          father_name?: string | null
          full_name?: string
          google_maps_location?: string | null
          group_id?: number
          id?: string
          is_active?: boolean
          phone?: string | null
          role_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          profile_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          profile_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          profile_id?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type?: string
          target_id: string
          target_type: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      researches: {
        Row: {
          author: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          file_size_bytes: number
          file_url: string
          group_id: number | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_size_bytes?: number
          file_url: string
          group_id?: number | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_size_bytes?: number
          file_url?: string
          group_id?: number | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "researches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "researches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "researches_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "researches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name_ar: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          name_ar: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name_ar?: string
        }
        Relationships: []
      }
      servant_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission_id: string
          profile_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          profile_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servant_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servant_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servant_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_admin_role_change_permits: {
        Row: {
          actor_id: string
          new_role_id: string
          old_role_id: string
          profile_id: string
          transaction_id: number
        }
        Insert: {
          actor_id: string
          new_role_id: string
          old_role_id: string
          profile_id: string
          transaction_id: number
        }
        Update: {
          actor_id?: string
          new_role_id?: string
          old_role_id?: string
          profile_id?: string
          transaction_id?: number
        }
        Relationships: []
      }
      system_reset_auth_delete_permits: {
        Row: {
          created_at: string
          expires_at: string
          run_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          run_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          run_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_reset_auth_delete_permits_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "system_reset_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_reset_gate: {
        Row: {
          active_run_id: string | null
          auth_cutoff_iat: number | null
          last_completed_at: string | null
          singleton: boolean
          updated_at: string
        }
        Insert: {
          active_run_id?: string | null
          auth_cutoff_iat?: number | null
          last_completed_at?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          active_run_id?: string | null
          auth_cutoff_iat?: number | null
          last_completed_at?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_reset_gate_active_run_id_fkey"
            columns: ["active_run_id"]
            isOneToOne: false
            referencedRelation: "system_reset_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_reset_run_assets: {
        Row: {
          asset_id: string
          checksum_sha256: string
          drive_file_id: string
          drive_folder_id: string
          file_name: string
          last_error: string | null
          run_id: string
          status: string
          storage_provider: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          checksum_sha256: string
          drive_file_id: string
          drive_folder_id: string
          file_name: string
          last_error?: string | null
          run_id: string
          status?: string
          storage_provider: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          checksum_sha256?: string
          drive_file_id?: string
          drive_folder_id?: string
          file_name?: string
          last_error?: string | null
          run_id?: string
          status?: string
          storage_provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_reset_run_assets_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "system_reset_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_reset_run_users: {
        Row: {
          last_error: string | null
          run_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_error?: string | null
          run_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_error?: string | null
          run_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_reset_run_users_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "system_reset_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_reset_runs: {
        Row: {
          actor_id: string | null
          backup_id: string
          completed_at: string | null
          created_at: string
          data_cleared_at: string | null
          id: string
          last_error: string | null
          preview_counts: Json
          status: string
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          backup_id: string
          completed_at?: string | null
          created_at?: string
          data_cleared_at?: string | null
          id?: string
          last_error?: string | null
          preview_counts?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          backup_id?: string
          completed_at?: string | null
          created_at?: string
          data_cleared_at?: string | null
          id?: string
          last_error?: string | null
          preview_counts?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_reset_runs_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backup_records"
            referencedColumns: ["id"]
          },
        ]
      }
      system_reset_write_permits: {
        Row: {
          created_at: string
          run_id: string
          scope: string
          transaction_id: number
        }
        Insert: {
          created_at?: string
          run_id: string
          scope?: string
          transaction_id: number
        }
        Update: {
          created_at?: string
          run_id?: string
          scope?: string
          transaction_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "system_reset_write_permits_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "system_reset_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          academic_year: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          group_id: number
          id: string
          is_current: boolean
          name_ar: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          group_id: number
          id?: string
          is_current?: boolean
          name_ar: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          group_id?: number
          id?: string
          is_current?: boolean
          name_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      word_dictionary_mappings: {
        Row: {
          dictionary_entry_id: string
          id: number
          word_id: number
        }
        Insert: {
          dictionary_entry_id: string
          id?: number
          word_id: number
        }
        Update: {
          dictionary_entry_id?: string
          id?: number
          word_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "word_dictionary_mappings_dictionary_entry_id_fkey"
            columns: ["dictionary_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_dictionary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_dictionary_mappings_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "bible_verse_words"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _unsafe_get_group_operational_summary: {
        Args: { p_group_id: number }
        Returns: Json
      }
      _unsafe_get_group_secretariat_detailed: {
        Args: { p_group_id: number }
        Returns: Json
      }
      _unsafe_get_group_servants_detailed: {
        Args: { p_group_id: number }
        Returns: Json
      }
      _unsafe_get_trainee_attendance_summary: {
        Args: { p_trainee_id: string }
        Returns: Json
      }
      _unsafe_get_trainee_full_profile: {
        Args: { p_trainee_id: string }
        Returns: Json
      }
      _unsafe_get_trainee_marathon_state: {
        Args: { p_marathon_id: string; p_trainee_id: string }
        Returns: Json
      }
      admin_set_general_secretariat: {
        Args: {
          p_enabled?: boolean
          p_permission_ids: string[]
          p_profile_id: string
        }
        Returns: Json
      }
      archive_marathon_question: {
        Args: { p_question_id: string }
        Returns: Json
      }
      can_manage_curriculum: { Args: { p_group_id: number }; Returns: boolean }
      can_manage_group_permission: {
        Args: { p_group_id: number; p_permission_id: string }
        Returns: boolean
      }
      can_manage_marathon: { Args: { p_group_id: number }; Returns: boolean }
      create_marathon_question: {
        Args: {
          p_marathon_id: string
          p_options: Json
          p_question_text: string
          p_section_id: string
        }
        Returns: string
      }
      create_marathon_section: {
        Args: { p_marathon_id: string; p_title: string }
        Returns: string
      }
      create_trainee_profile: {
        Args: {
          p_address?: string
          p_birth_date: string
          p_church?: string
          p_confession_father?: string
          p_full_name: string
          p_group_id: number
          p_password?: string
          p_phone?: string
          p_username: string
        }
        Returns: Json
      }
      dispatch_daily_verse_notification: {
        Args: { p_force_send?: boolean; p_mode?: string }
        Returns: Json
      }
      export_manifest: { Args: never; Returns: Json }
      export_table: {
        Args: { p_limit?: number; p_offset?: number; p_table: string }
        Returns: Json
      }
      get_chapter_verses_with_words: {
        Args: { p_book_id: number; p_chapter_number: number }
        Returns: Json
      }
      get_current_user_group: { Args: never; Returns: number }
      get_current_user_role: { Args: never; Returns: string }
      get_group_operational_summary: {
        Args: { p_group_id: number }
        Returns: Json
      }
      get_group_secretariat_detailed: {
        Args: { p_group_id: number }
        Returns: Json
      }
      get_group_servants_detailed: {
        Args: { p_group_id: number }
        Returns: Json
      }
      get_marathon_questions_for_player: {
        Args: { p_marathon_id: string }
        Returns: Json
      }
      get_post_reactors: { Args: { p_post_id: string }; Returns: Json }
      get_trainee_attendance_summary: {
        Args: { p_trainee_id: string }
        Returns: Json
      }
      get_trainee_full_profile: {
        Args: { p_trainee_id: string }
        Returns: Json
      }
      get_trainee_marathon_state: {
        Args: { p_marathon_id: string; p_trainee_id: string }
        Returns: Json
      }
      get_word_details: { Args: { p_word_id: number }; Returns: Json }
      grant_system_admin: {
        Args: { p_confirmation: string; p_target_profile_id: string }
        Returns: Json
      }
      has_general_secretariat_permission: {
        Args: { p_permission_id: string }
        Returns: boolean
      }
      has_servant_permission: { Args: { perm_id: string }; Returns: boolean }
      import_trainees_bulk_atomic: {
        Args: {
          p_batch_json: Json
          p_dry_run?: boolean
          p_file_storage_path: string
          p_filename: string
        }
        Returns: Json
      }
      is_admin_or_super_user: { Args: never; Returns: boolean }
      is_secretariat_of_group: {
        Args: { target_group: number }
        Returns: boolean
      }
      is_servant_or_secretariat: { Args: never; Returns: boolean }
      is_system_admin: { Args: never; Returns: boolean }
      log_operational_event: {
        Args: {
          p_checksum?: string
          p_details: Json
          p_entity_id: string
          p_entity_type: string
          p_operation: string
          p_status: string
        }
        Returns: number
      }
      publish_curriculum_day: {
        Args: { p_day_id: string }
        Returns: {
          created_at: string
          created_by: string
          day_number: number
          deleted_at: string | null
          deleted_by: string | null
          group_id: number
          id: string
          published_at: string | null
          published_by: string | null
          sort_order: number
          status: string
          study_date: string | null
          term_id: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "curriculum_days"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reopen_marathon_question: {
        Args: { p_question_id: string; p_submission_id: string }
        Returns: Json
      }
      replace_marathon_question: {
        Args: {
          p_options: Json
          p_question_id: string
          p_question_text: string
          p_section_id: string
        }
        Returns: string
      }
      replace_servant_permissions: {
        Args: {
          p_granted_by?: string
          p_permission_ids: string[]
          p_profile_id: string
        }
        Returns: Json
      }
      restore_accounts: { Args: { p_profiles: Json }; Returns: number }
      restore_database: {
        Args: { p_tables: Json; p_truncate?: boolean }
        Returns: Json
      }
      restore_deleted_post: { Args: { p_post_id: string }; Returns: Json }
      restore_table: {
        Args: { p_rows: Json; p_table: string }
        Returns: number
      }
      revoke_system_admin: {
        Args: {
          p_confirmation: string
          p_demote_to_role: string
          p_target_profile_id: string
        }
        Returns: Json
      }
      search_bible_content: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_comment: { Args: { p_comment_id: string }; Returns: Json }
      soft_delete_post: { Args: { p_post_id: string }; Returns: Json }
      submit_marathon_answer: {
        Args: {
          p_marathon_id: string
          p_question_id: string
          p_selected_answer_id: string
        }
        Returns: Json
      }
      system_admin_assert_current: { Args: never; Returns: undefined }
      system_admin_break_glass_recovery: {
        Args: {
          p_approval_reference: string
          p_confirmation: string
          p_operator_reference: string
          p_target_profile_id: string
        }
        Returns: Json
      }
      system_reset_assert_admin: {
        Args: { p_actor_id: string }
        Returns: undefined
      }
      system_reset_authorize_auth_delete: {
        Args: { p_actor_id: string; p_run_id: string; p_user_id: string }
        Returns: undefined
      }
      system_reset_begin: {
        Args: { p_actor_id: string; p_backup_id: string }
        Returns: string
      }
      system_reset_complete_if_no_users: {
        Args: { p_actor_id: string; p_run_id: string }
        Returns: Json
      }
      system_reset_finalize_data: {
        Args: { p_actor_id: string; p_run_id: string }
        Returns: Json
      }
      system_reset_guarded_restore_database: {
        Args: { p_tables: Json; p_truncate?: boolean }
        Returns: Json
      }
      system_reset_mark_asset_results: {
        Args: { p_actor_id: string; p_results: Json; p_run_id: string }
        Returns: Json
      }
      system_reset_mark_local_media_deleted: {
        Args: { p_actor_id: string; p_run_id: string }
        Returns: number
      }
      system_reset_mark_partial: {
        Args: { p_actor_id: string; p_error: string; p_run_id: string }
        Returns: undefined
      }
      system_reset_mark_user_result: {
        Args: {
          p_actor_id: string
          p_deleted: boolean
          p_error?: string
          p_run_id: string
          p_user_id: string
        }
        Returns: Json
      }
      system_reset_preview: { Args: { p_actor_id: string }; Returns: Json }
      system_reset_release_gate: {
        Args: { p_run_id: string }
        Returns: undefined
      }
      toggle_post_reaction: {
        Args: { p_post_id: string; p_reaction_type: string }
        Returns: Json
      }
      transfer_system_admin: {
        Args: { p_confirmation: string; p_target_profile_id: string }
        Returns: Json
      }
      trigger_absence_notification: {
        Args: { p_session_id: string; p_trainee_id: string }
        Returns: Json
      }
      trigger_birthday_notifications: { Args: never; Returns: Json }
      update_curriculum_day: {
        Args: {
          p_day_id: string
          p_day_number?: number
          p_sort_order?: number
          p_study_date?: string
          p_title?: string
        }
        Returns: {
          created_at: string
          created_by: string
          day_number: number
          deleted_at: string | null
          deleted_by: string | null
          group_id: number
          id: string
          published_at: string | null
          published_by: string | null
          sort_order: number
          status: string
          study_date: string | null
          term_id: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "curriculum_days"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_curriculum_entry: {
        Args: {
          p_content_metadata?: Json
          p_day_id?: string
          p_description?: string
          p_entry_id: string
          p_lecturer_id?: string
          p_sort_order?: number
          p_title?: string
        }
        Returns: {
          audio_asset_id: string | null
          content_metadata: Json
          created_at: string
          created_by: string
          day_id: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          group_id: number
          id: string
          lecture_id: string | null
          lecturer_id: string | null
          published_at: string | null
          published_by: string | null
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "curriculum_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_servant_profile_and_permissions: {
        Args: {
          p_full_name: string
          p_group_id: number
          p_permission_ids: string[]
          p_phone: string
          p_profile_id: string
        }
        Returns: Json
      }
      username_to_email: { Args: { p_identifier: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
