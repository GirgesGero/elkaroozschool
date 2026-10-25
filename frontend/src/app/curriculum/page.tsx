'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import {
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Calendar,
  Download,
  FileText,
  GraduationCap,
  Headphones,
  Lock,
  Sparkles,
  Unlock,
  User,
  Volume2,
} from 'lucide-react';
import type { Profile } from '@/types/database';
import type { CurriculumDay, CurriculumEntry } from '@/types/curriculum';
import Avatar from '@/components/Avatar';
import { explainDbError } from '@/lib/errors/db';
import { getCurriculumGroupLabel, getCurriculumQueryError } from '@/lib/curriculum/display';

interface LectureItem {
  id: string;
  title: string;
  description: string | null;
  audio_url?: string | null;
  lecturer?: {
    full_name: string;
    title: string;
    avatar_url?: string | null;
  } | null;
}

interface LecturerItem {
  id: string;
  full_name: string;
  title: string;
  avatar_url?: string | null;
}

interface CurriculumItem {
  id: string;
  term_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
}

interface TermItem {
  id: string;
  name_ar: string;
  academic_year: string;
}

export default function CurriculumPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [days, setDays] = useState<CurriculumDay[]>([]);
  const [entries, setEntries] = useState<CurriculumEntry[]>([]);
  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [curriculums, setCurriculums] = useState<CurriculumItem[]>([]);
  const [lecturers, setLecturers] = useState<LecturerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setLoadError(null);
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: userProfile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileError) throw profileError;
        if (!userProfile) throw new Error('تعذر تحميل الملف الشخصي.');
        const nextProfile = userProfile as Profile;
        if (cancelled) return;
        setProfile(nextProfile);

        const effectiveGroupId = nextProfile.group_id || 1;

        const [termResult, curriculumResult, dayResult, entryResult, lectureResult] = await Promise.all([
          supabase.from('terms').select('id,name_ar,academic_year').eq('group_id', effectiveGroupId).is('deleted_at', null).order('created_at'),
          supabase.from('curriculums').select('*').eq('group_id', effectiveGroupId).is('deleted_at', null).order('created_at'),
          supabase.from('curriculum_days').select('*').eq('group_id', effectiveGroupId).eq('status', 'PUBLISHED').is('deleted_at', null).order('sort_order'),
          supabase.from('curriculum_entries').select('*').eq('group_id', effectiveGroupId).eq('status', 'PUBLISHED').is('deleted_at', null).order('sort_order'),
          supabase.from('lectures').select('id,title,description,audio_url,lecturer_id').eq('group_id', effectiveGroupId).is('deleted_at', null).order('lecture_date'),
        ]);

        const queryError = getCurriculumQueryError([termResult, curriculumResult, dayResult, entryResult, lectureResult]);
        if (queryError) throw queryError;

        const lecturerIds = [...new Set(((entryResult.data || []) as CurriculumEntry[])
          .map((entry) => entry.lecturer_id)
          .filter((id): id is string => Boolean(id)))];
        let lecturerRows: LecturerItem[] = [];
        if (lecturerIds.length > 0) {
          const lecturerResult = await supabase.from('lecturers').select('id,full_name,title,avatar_url').in('id', lecturerIds);
          if (lecturerResult.error) throw lecturerResult.error;
          lecturerRows = (lecturerResult.data || []) as LecturerItem[];
        }

        if (cancelled) return;
        setTerms((termResult.data || []) as TermItem[]);
        setCurriculums((curriculumResult.data || []) as CurriculumItem[]);
        setDays((dayResult.data || []) as CurriculumDay[]);
        setEntries((entryResult.data || []) as CurriculumEntry[]);
        setLectures((lectureResult.data || []) as LectureItem[]);
        setLecturers(lecturerRows);
        setSelectedTermId((current) => termResult.data?.some((term) => term.id === current)
          ? current
          : termResult.data?.[0]?.id || '');
      } catch (error) {
        if (!cancelled) setLoadError(explainDbError(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, [router, reloadVersion]);

  const selectedTerm = selectedTermId || terms[0]?.id || '';
  const selectedDays = days.filter((day) => day.term_id === selectedTerm);
  const selectedEntries = entries.filter((entry) => selectedDays.some((day) => day.id === entry.day_id));
  const selectedCurriculums = curriculums.filter((curriculum) => curriculum.term_id === selectedTerm);
  const lectureById = new Map(lectures.map((lecture) => [lecture.id, lecture]));
  const lecturerById = new Map(lecturers.map((lecturer) => [lecturer.id, lecturer]));

  return (
    <div className="min-h-screen bg-canvas text-content flex flex-col selection:bg-gold selection:text-content" dir="rtl">
      {/* Smart Unified Header */}
      <SmartHeader
        profile={profile}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      {/* Global Search Dialog */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      {/* Unified Profile Modal */}
      <UnifiedProfileModal
        profileId={selectedProfileId}
        currentUser={profile}
        onClose={() => setSelectedProfileId(null)}
      />

      {loadError && (
        <div role="alert" className="mx-auto mt-4 flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{loadError}</span>
          <button type="button" onClick={() => setReloadVersion((version) => version + 1)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-danger/30 px-3 font-bold">
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6 pb-28 md:pb-12">
        {/* Banner */}
        <div className="bg-gradient-to-r from-info/60 via-canvas to-canvas border border-info/40 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-info mb-1 text-xs font-semibold">
              <GraduationCap className="w-4 h-4" />
              <span>
                {getCurriculumGroupLabel(profile?.group_id ?? 0)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-content">الخطة الأكاديمية والمحاضرات الأسبوعية</h1>
            <p className="text-xs text-content-muted mt-1">
              محاضرتان كل يوم جمعة مع إمكانية الاستماع للتسجيل الصوتي وتحميل المذكرات.
            </p>
          </div>
        </div>

        {/* Dynamic terms: no fixed first/second term assumption. */}
        <div className="flex flex-wrap items-center gap-3">
          {terms.map((term, index) => {
            const active = selectedTermId === term.id;
            return (
              <button
                key={term.id}
                onClick={() => setSelectedTermId(term.id)}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-5 py-2.5 text-start text-sm font-bold transition-all ${
                  active ? 'border-info bg-info text-content shadow-lg shadow-blue-900/40' : 'border-line bg-nav text-content-muted hover:text-content'
                }`}
              >
                {active ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4 text-warning" />}
                <span>{term.name_ar} · {term.academic_year}</span>
                {index === 0 && <span className="text-[10px] opacity-75">(الحالي)</span>}
              </button>
            );
          })}
        </div>

        {/* Section 1: Curriculum Downloads */}
        <section className="bg-nav border border-line rounded-2xl p-5 shadow-md">
          <h3 className="font-bold text-base text-content mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold" />
            <span>المذكرات والمناهج الدراسية</span>
          </h3>

          {loading ? (
            <div role="status" className="space-y-3" aria-label="جاري تحميل المناهج" aria-live="polite">
              <div className="h-16 animate-pulse rounded-xl bg-canvas" />
              <div className="h-16 animate-pulse rounded-xl bg-canvas" />
            </div>
          ) : loadError ? (
            <p className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-xs text-content-muted">تعذر تحميل المذكرات. استخدم زر إعادة المحاولة بالأعلى.</p>
          ) : selectedCurriculums.length === 0 ? (
            <div className="text-center py-6 text-content-muted text-xs bg-nav/50 rounded-xl border border-line/60">
              سيتم رفع مذكرات ومناهج التيرم قريباً من قِبل إدارة المدرسة.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {selectedCurriculums.map((curr) => (
                <div
                  key={curr.id}
                  className="bg-nav/80 border border-line rounded-xl p-4 flex items-center justify-between hover:border-line transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-canvas/50 border border-line-subtle/40 flex items-center justify-center text-info">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-content">{curr.title}</h4>
                      <span className="text-[11px] text-content-muted">{curr.file_type} • {Math.round(curr.file_size_bytes / 1024)} KB</span>
                    </div>
                  </div>
                  <a
                    href={curr.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-nav hover:bg-info text-content-secondary hover:text-content transition-colors"
                    title="تحميل المنهج"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Published curriculum days and entries */}
        <section className="rounded-2xl border border-line bg-nav p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-content"><Calendar className="h-5 w-5 text-success" /><span>الأيام والمحاضرات المنشورة</span></h3>
            <span className="rounded-lg border border-line bg-nav px-3 py-1 text-xs text-content-muted">{selectedDays.length} أيام · {selectedEntries.length} محاضرات</span>
          </div>
          {loading ? (
            <div role="status" className="space-y-3" aria-label="جاري تحميل الأيام والمحاضرات" aria-live="polite">
              <div className="h-28 animate-pulse rounded-xl bg-canvas" />
              <div className="h-28 animate-pulse rounded-xl bg-canvas" />
            </div>
          ) : loadError ? (
            <p className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-xs text-content-muted">تعذر تحميل الجدول. استخدم زر إعادة المحاولة بالأعلى.</p>
          ) : selectedDays.length === 0 ? (
            <div className="rounded-xl border border-line/60 bg-nav/50 py-8 text-center text-xs text-content-muted">لا توجد أيام منشورة لهذا الترم حالياً.</div>
          ) : (
            <div className="space-y-4">
              {selectedDays.map((day) => {
                const dayEntries = selectedEntries.filter((entry) => entry.day_id === day.id).sort((a, b) => a.sort_order - b.sort_order);
                return <div key={day.id} className="rounded-xl border border-line/80 bg-nav/90 p-4">
                  <div className="mb-3 flex items-center justify-between border-b border-line/80 pb-2.5"><span className="flex items-center gap-2 text-sm font-bold text-gold"><Calendar className="h-4 w-4" />اليوم {day.day_number} · {day.title || 'يوم دراسي'}</span><span className="text-[11px] text-content-muted">{dayEntries.length} محاضرات</span></div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {dayEntries.map((entry, index) => {
                      const legacyLecture = entry.lecture_id ? lectureById.get(entry.lecture_id) : undefined;
                      const audio = legacyLecture?.audio_url || (entry.content_metadata.legacy_audio_url as string | undefined);
                      const lecturer = entry.lecturer_id ? lecturerById.get(entry.lecturer_id) : legacyLecture?.lecturer;
                      return <div key={entry.id} className="flex flex-col justify-between rounded-lg border border-line bg-nav/80 p-3.5">
                        <div><div className="mb-1.5 text-xs font-bold text-info">المحاضرة {index + 1}</div><h5 className="mb-2 text-sm font-bold text-content">{entry.title}</h5>{entry.description && <p className="mb-3 text-xs leading-6 text-content-secondary">{entry.description}</p>}
                          {lecturer && <div className="mb-3 flex items-center gap-2 rounded-lg border border-line/60 bg-nav/60 p-2 text-xs text-content-secondary"><Avatar src={lecturer.avatar_url} name={lecturer.full_name} size={28} rounded="rounded-full" /><div><span className="block text-[10px] text-content-muted">{lecturer.title}</span><span className="font-semibold">{lecturer.full_name}</span></div></div>}
                        </div>
                        {audio ? <div className="flex items-center justify-between border-t border-line/80 pt-2"><span className="flex items-center gap-1.5 text-xs text-success"><Headphones className="h-4 w-4" />التسجيل متاح</span><a href={audio} target="_blank" rel="noreferrer" className="rounded-lg border border-success/50 bg-canvas/60 px-3 py-1 text-xs text-success">استماع</a></div> : <span className="text-[11px] text-content-muted">لا يوجد تسجيل مرفق</span>}
                      </div>;
                    })}
                  </div>
                </div>;
              })}
            </div>
          )}
        </section>
      </main>

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
