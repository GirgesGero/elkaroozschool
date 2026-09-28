'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import GroupDashboardCards from '@/components/GroupDashboardCards';
import { ArrowRight, Layers, Loader2 } from 'lucide-react';
import type { Profile } from '@/types/database';

export default function GroupsIndexPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      if (userProfile) {
        const prof = userProfile as Profile;
        setProfile(prof);

        // If regular user (Trainee/Servant/Secretariat), direct them to their group
        if (!['admin', 'super_user'].includes(prof.role_id)) {
          router.push(`/groups/${prof.group_id}`);
          return;
        }
      }
      setLoading(false);
    }

    init();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20" dir="rtl">
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرئيسية</span>
            </Link>

            <div>
              <h1 className="text-base sm:text-lg font-black text-karooz-gold flex items-center gap-2">
                <Layers className="w-5 h-5" />
                <span>إدارة الفرق الدراسية</span>
              </h1>
              <span className="text-[11px] text-slate-400">مدرسة الكاروز للكتاب المقدس</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-karooz-gold" />
            <p className="text-sm">جاري التحميل...</p>
          </div>
        ) : (
          <GroupDashboardCards />
        )}
      </main>
    </div>
  );
}
