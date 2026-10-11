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

interface LectureItem {
  id: string;
  title: string;
  description: string;
  lecture_date: string;
  audio_url?: string;
  lecturer?: {
    full_name: string;
    title: string;
    avatar_url?: string;
  };
}

interface CurriculumItem {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
}

export default function CurriculumPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<1 | 2>(1);
  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [curriculums, setCurriculums] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        setProfile(userProfile as Profile);

        // Fetch Curriculums for user's group
        const { data: currData } = await supabase
          .from('curriculums')
          .select('*')
          .eq('group_id', userProfile.group_id)
          .order('created_at', { ascending: true });

        if (currData) setCurriculums(currData);

        // Fetch Lectures with lecturers for user's group
        const { data: lecData } = await supabase
          .from('lectures')
          .select('*, lecturers(full_name, title, avatar_url)')
          .eq('group_id', userProfile.group_id)
          .order('lecture_date', { ascending: true });

        if (lecData) {
          const mapped = lecData.map((l: any) => ({
            ...l,
            lecturer: l.lecturers,
          }));
          setLectures(mapped);
        }
      }
      setLoading(false);
    }

    loadData();
  }, [router]);

  // Group lectures by Friday date (2 lectures per Friday)
  const groupedByFriday = lectures.reduce((acc: { [key: string]: LectureItem[] }, lec) => {
    const d = lec.lecture_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(lec);
    return acc;
  }, {});

  // Determine current or next Friday
  const today = new Date();
  const isFridayToday = today.getDay() === 5;

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

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6 pb-28 md:pb-12">
        {/* Banner */}
        <div className="bg-gradient-to-r from-info/60 via-canvas to-canvas border border-info/40 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-info mb-1 text-xs font-semibold">
              <GraduationCap className="w-4 h-4" />
              <span>
                {profile?.group_id === 1 && 'الفرقة الأولى'}
                {profile?.group_id === 2 && 'الفرقة الثانية'}
                {profile?.group_id === 3 && 'الفرقة الثالثة'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-content">الخطة الأكاديمية والمحاضرات الأسبوعية</h1>
            <p className="text-xs text-content-muted mt-1">
              محاضرتان كل يوم جمعة مع إمكانية الاستماع للتسجيل الصوتي وتحميل المذكرات.
            </p>
          </div>
        </div>

        {/* Term Tabs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedTerm(1)}
            className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-sm transition-all ${
              selectedTerm === 1
                ? 'bg-info text-content shadow-lg shadow-blue-900/40'
                : 'bg-nav text-content-muted hover:text-content border border-line'
            }`}
          >
            <Unlock className="w-4 h-4" />
            <span>التيرم الأول (مفتوح)</span>
          </button>

          <button
            onClick={() => setSelectedTerm(2)}
            className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-sm transition-all ${
              selectedTerm === 2
                ? 'bg-info text-content'
                : 'bg-nav text-content-muted hover:text-content-muted border border-line/80'
            }`}
          >
            <Lock className="w-4 h-4 text-warning" />
            <span>التيرم الثاني (مغلق حتى اكتمال التيرم الأول)</span>
          </button>
        </div>

        {/* Section 1: Curriculum Downloads */}
        <section className="bg-nav border border-line rounded-2xl p-5 shadow-md">
          <h3 className="font-bold text-base text-content mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold" />
            <span>المذكرات والمناهج الدراسية</span>
          </h3>

          {curriculums.length === 0 ? (
            <div className="text-center py-6 text-content-muted text-xs bg-nav/50 rounded-xl border border-line/60">
              سيتم رفع مذكرات ومناهج التيرم قريباً من قِبل إدارة المدرسة.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {curriculums.map((curr) => (
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

        {/* Section 2: Friday Lectures Timeline */}
        <section className="bg-nav border border-line rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-content flex items-center gap-2">
              <Calendar className="w-5 h-5 text-success" />
              <span>جدول محاضرات الجمعة (محاضرتان أسبوعياً)</span>
            </h3>
            <span className="text-xs text-content-muted bg-nav px-3 py-1 rounded-lg border border-line">
              {isFridayToday ? '⭐ اليوم الجمعة (المحاضرة جارية)' : 'المحاضرة القادمة الجمعة'}
            </span>
          </div>

          {Object.keys(groupedByFriday).length === 0 ? (
            <div className="text-center py-8 text-content-muted text-xs bg-nav/50 rounded-xl border border-line/60">
              لا توجد محاضرات مجدولة حالياً.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByFriday).map(([fridayDate, dayLectures], idx) => (
                <div
                  key={fridayDate}
                  className="bg-nav/90 border border-line/80 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-line/80 pb-2.5 mb-3">
                    <span className="font-bold text-sm text-gold flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>جمعة {fridayDate}</span>
                    </span>
                    <span className="text-[11px] font-mono text-content-muted bg-nav px-2.5 py-0.5 rounded border border-line">
                      {dayLectures.length} محاضرات
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dayLectures.map((lec, lIdx) => (
                      <div
                        key={lec.id}
                        className="bg-nav/80 border border-line rounded-lg p-3.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-content-muted mb-1.5">
                            <span className="font-bold text-info">المحاضرة {lIdx + 1}</span>
                          </div>
                          <h5 className="font-bold text-sm text-content mb-2">{lec.title}</h5>

                          {lec.lecturer && (
                            <div className="flex items-center gap-2 text-xs text-content-secondary mb-3 bg-nav/60 p-2 rounded-lg border border-line/60">
                              <div className="w-7 h-7 rounded-full bg-nav flex items-center justify-center text-content-muted text-xs font-bold">
                                {lec.lecturer.full_name.charAt(0)}
                              </div>
                              <div>
                                <span className="text-content-muted text-[10px] block">{lec.lecturer.title}</span>
                                <span className="font-semibold">{lec.lecturer.full_name}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {lec.audio_url ? (
                          <div className="pt-2 border-t border-line/80 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-success">
                              <Headphones className="w-4 h-4" />
                              <span>التسجيل الصوتي متاح</span>
                            </div>
                            <a
                              href={lec.audio_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs bg-canvas/60 text-success border border-success/50 hover:bg-canvas px-3 py-1 rounded-lg transition-colors"
                            >
                              استماع
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-content-muted">التسجيل الصوتي يرفع بعد المحاضرة</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
