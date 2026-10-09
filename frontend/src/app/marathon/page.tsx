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
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  GraduationCap,
  Play,
  Plus,
  Settings,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface MarathonItem {
  id: string;
  title: string;
  description: string;
  group_id: number;
  total_score: number;
  is_active: boolean;
  sections_count?: number;
  questions_count?: number;
  trainee_progress?: number;
  is_completed?: boolean;
}

export default function MarathonListPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [marathons, setMarathons] = useState<MarathonItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    async function loadMarathons() {
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
        const prof = userProfile as Profile;
        setProfile(prof);

        // Check if user has MANAGE_MARATHON
        let hasManage = ['admin', 'super_user'].includes(prof.role_id);
        if (prof.role_id === 'servant') {
          const { data: perm } = await supabase
            .from('servant_permissions')
            .select('*')
            .eq('profile_id', prof.id)
            .eq('permission_id', 'MANAGE_MARATHON')
            .single();
          if (perm) hasManage = true;
        }
        setCanManage(hasManage);

        // Fetch Marathons for user's group
        const { data: mList } = await supabase
          .from('marathons')
          .select('*, marathon_questions(count)')
          .eq('group_id', prof.group_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (mList) {
          // Fetch trainee progress for each marathon
          const enhanced = await Promise.all(
            mList.map(async (m: any) => {
              const { data: state } = await supabase.rpc('get_trainee_marathon_state', {
                p_marathon_id: m.id,
                p_trainee_id: prof.id,
              });

              return {
                ...m,
                questions_count: m.marathon_questions?.[0]?.count || 0,
                trainee_progress: state?.progress_percentage || 0,
                is_completed: state?.is_completed || false,
              };
            })
          );
          setMarathons(enhanced);
        }
      }
      setLoading(false);
    }

    loadMarathons();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-[#c29938] selection:text-slate-950 pb-20" dir="rtl">
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

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6 pb-28 md:pb-12">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border border-amber-900/40 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-1 text-xs font-semibold">
              <Trophy className="w-4 h-4" />
              <span>
                {profile?.group_id === 1 && 'الفرقة الأولى'}
                {profile?.group_id === 2 && 'الفرقة الثانية'}
                {profile?.group_id === 3 && 'الفرقة الثالثة'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">ماراثون الكتاب المقدس التفاعلي</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              إجابة متتالية ومحفوظة بنسبة 100 درجة موزعة بالتساوي. يمكنك الإجابة على مراحل والعودة في أي وقت.
            </p>
          </div>

          {canManage && (
            <Link
              href="/marathon/manage"
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800/60 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all"
            >
              <Settings className="w-4 h-4" />
              <span>إدارة الماراثون والأسئلة</span>
            </Link>
          )}
        </div>

        {/* Marathons List */}
        <div className="space-y-4">
          {marathons.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              لا توجد مسابقات ماراثون نشطة حالياً لفرقتك الدراسية.
            </div>
          ) : (
            marathons.map((m) => (
              <div
                key={m.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-slate-700 transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/50">
                      100 درجة متساوية
                    </span>
                    {m.is_completed ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>تم إكمال الماراثون</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {m.questions_count} أسئلة
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{m.title}</h3>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                    {m.description || 'ماراثون دراسي تنافسي لمدرسة الكاروز للكتاب المقدس.'}
                  </p>

                  {/* Progress Bar */}
                  <div className="max-w-md">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>نسبة الإنجاز</span>
                      <span className="font-mono font-bold text-amber-400">
                        {m.trainee_progress}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${m.trainee_progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto flex items-center justify-end">
                  <Link
                    href={`/marathon/${m.id}`}
                    className={`w-full md:w-auto px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      m.is_completed
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : m.trainee_progress && m.trainee_progress > 0
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                        : 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/40'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    <span>
                      {m.is_completed
                        ? 'مراجعة الإجابات'
                        : m.trainee_progress && m.trainee_progress > 0
                        ? 'استكمال الماراثون'
                        : 'بدء الماراثون'}
                    </span>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
