'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import GroupDashboardCards from '@/components/GroupDashboardCards';
import { Layers, Loader2, Users } from 'lucide-react';
import type { Profile } from '@/types/database';

export default function GroupsIndexPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-[#c29938] selection:text-slate-950" dir="rtl">
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

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-6 pb-28 md:pb-12">
        {/* Section Header */}
        <div className="flex items-center gap-3.5 p-5 rounded-3xl bg-gradient-to-r from-[#0e172a] via-[#101c36] to-[#070b14] border border-[#c29938]/30 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#c29938]/20 border border-[#c29938]/40 text-[#c29938] flex items-center justify-center shadow-lg shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100">إدارة الفرق والمجموعات الدراسية</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              متابعة الفرق الثلاثة، توزيع الخدام، وجلسات الحضور الأسبوعية
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#c29938]" />
            <p className="text-sm">جاري التحميل...</p>
          </div>
        ) : (
          <GroupDashboardCards />
        )}
      </main>

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
