'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-base text-karooz-gold">المناهج والمحاضرات</span>
            <div className="relative w-7 h-7">
              <Image src="/logo.png" alt="شعار مدرسة الكاروز" fill sizes="32px" className="object-contain" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border border-blue-900/40 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-1 text-xs font-semibold">
              <GraduationCap className="w-4 h-4" />
              <span>
                {profile?.group_id === 1 && 'الفرقة الأولى'}
                {profile?.group_id === 2 && 'الفرقة الثانية'}
                {profile?.group_id === 3 && 'الفرقة الثالثة'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">الخطة الأكاديمية والمحاضرات الأسبوعية</h1>
            <p className="text-xs text-slate-400 mt-1">
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
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Unlock className="w-4 h-4" />
            <span>التيرم الأول (مفتوح)</span>
          </button>

          <button
            onClick={() => setSelectedTerm(2)}
            className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-sm transition-all ${
              selectedTerm === 2
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-500 hover:text-slate-400 border border-slate-800/80'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-500" />
            <span>التيرم الثاني (مغلق حتى اكتمال التيرم الأول)</span>
          </button>
        </div>

        {/* Section 1: Curriculum Downloads */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <h3 className="font-bold text-base text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-karooz-gold" />
            <span>المذكرات والمناهج الدراسية</span>
          </h3>

          {curriculums.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/50 rounded-xl border border-slate-800/60">
              سيتم رفع مذكرات ومناهج التيرم قريباً من قِبل إدارة المدرسة.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {curriculums.map((curr) => (
                <div
                  key={curr.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-950/50 border border-blue-800/40 flex items-center justify-center text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{curr.title}</h4>
                      <span className="text-[11px] text-slate-400">{curr.file_type} • {Math.round(curr.file_size_bytes / 1024)} KB</span>
                    </div>
                  </div>
                  <a
                    href={curr.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
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
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>جدول محاضرات الجمعة (محاضرتان أسبوعياً)</span>
            </h3>
            <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
              {isFridayToday ? '⭐ اليوم الجمعة (المحاضرة جارية)' : 'المحاضرة القادمة الجمعة'}
            </span>
          </div>

          {Object.keys(groupedByFriday).length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs bg-slate-950/50 rounded-xl border border-slate-800/60">
              لا توجد محاضرات مجدولة حالياً.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByFriday).map(([fridayDate, dayLectures], idx) => (
                <div
                  key={fridayDate}
                  className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                    <span className="font-bold text-sm text-karooz-gold flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>جمعة {fridayDate}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                      {dayLectures.length} محاضرات
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dayLectures.map((lec, lIdx) => (
                      <div
                        key={lec.id}
                        className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                            <span className="font-bold text-blue-400">المحاضرة {lIdx + 1}</span>
                          </div>
                          <h5 className="font-bold text-sm text-white mb-2">{lec.title}</h5>

                          {lec.lecturer && (
                            <div className="flex items-center gap-2 text-xs text-slate-300 mb-3 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold">
                                {lec.lecturer.full_name.charAt(0)}
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">{lec.lecturer.title}</span>
                                <span className="font-semibold">{lec.lecturer.full_name}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {lec.audio_url ? (
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                              <Headphones className="w-4 h-4" />
                              <span>التسجيل الصوتي متاح</span>
                            </div>
                            <a
                              href={lec.audio_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-800 px-3 py-1 rounded-lg transition-colors"
                            >
                              استماع
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">التسجيل الصوتي يرفع بعد المحاضرة</span>
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
    </div>
  );
}
