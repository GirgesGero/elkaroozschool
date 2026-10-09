'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { explainDbError } from '@/lib/errors/db';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import GroupSelector from '@/components/GroupSelector';
import TraineeProfileDrawer from '@/components/TraineeProfileDrawer';
import CreateTraineeModal from '@/components/CreateTraineeModal';
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ExternalLink,
  MapPin,
  Phone,
  Power,
  Search,
  ShieldAlert,
  User,
  UserCheck,
  UserX,
  Users,
  Eye,
  Filter,
  Layers,
  Clock,
  TrendingUp,
  Loader2,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import type { Profile } from '@/types/database';

export default function TraineesDirectoryPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trainees, setTrainees] = useState<Profile[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(0); // 0 = all
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Trainee Drawer & Creation Modal
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isAdminOrSuper = profile?.role_id === 'admin' || profile?.role_id === 'super_user';
  const isSecretariat = profile?.role_id === 'secretariat';
  const canAddTrainee = isAdminOrSuper || isSecretariat;

  const loadTrainees = async (currentUser: Profile, targetGroup: number) => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase.from('profiles').select('*').eq('role_id', 'trainee');

    if (!['admin', 'super_user'].includes(currentUser.role_id)) {
      query = query.eq('group_id', currentUser.group_id);
    } else if (targetGroup > 0) {
      query = query.eq('group_id', targetGroup);
    }

    const { data: traineeList } = await query.order('full_name', { ascending: true });
    if (traineeList) setTrainees(traineeList as Profile[]);
    setLoading(false);
  };

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

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        const prof = userProfile as Profile;
        setProfile(prof);
        const defaultGroup = ['admin', 'super_user'].includes(prof.role_id) ? 0 : prof.group_id;
        setSelectedGroupId(defaultGroup);
        loadTrainees(prof, defaultGroup);
      }
    }

    init();
  }, [router]);

  const handleGroupChange = (newGroupId: number) => {
    setSelectedGroupId(newGroupId);
    if (profile) loadTrainees(profile, newGroupId);
  };

  const handleToggleSuspension = async (trainee: Profile, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdating(true);
    setNotice(null);
    const supabase = createClient();
    const newActiveState = !trainee.is_active;

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newActiveState })
      .eq('id', trainee.id);

    if (error) {
      setNotice(explainDbError(error));
    } else {
      setTrainees((prev) =>
        prev.map((t) => (t.id === trainee.id ? { ...t, is_active: newActiveState } : t))
      );
      setNotice(
        newActiveState
          ? `تم إعادة تفعيل حساب المتدرب ${trainee.full_name} بنجاح.`
          : `تم إيقاف حساب المتدرب ${trainee.full_name}.`
      );
    }
    setUpdating(false);
  };

  const openDrawer = (tId: string) => {
    setSelectedTraineeId(tId);
    setIsDrawerOpen(true);
  };

  const filtered = trainees.filter((t) => {
    const matchSearch =
      searchQuery.trim() === '' ||
      t.full_name.includes(searchQuery.trim()) ||
      t.username.includes(searchQuery.trim()) ||
      (t.phone && t.phone.includes(searchQuery.trim()));

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && t.is_active) ||
      (statusFilter === 'suspended' && !t.is_active);

    return matchSearch && matchStatus;
  });

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
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6 pb-28 md:pb-12">
        {/* Top Control Bar with Group Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-[#0a101d] border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            {isAdminOrSuper && (
              <GroupSelector
                selectedGroupId={selectedGroupId}
                onSelectGroup={handleGroupChange}
                showAllOption={true}
              />
            )}

            <div>
              <span className="font-bold text-base text-[#c29938] block">سجل وبيانات المتدربين</span>
              <span className="text-[11px] text-slate-400">
                {selectedGroupId === 0
                  ? 'جميع الفرق الدراسية'
                  : selectedGroupId === 1
                  ? 'الفرقة الأولى'
                  : selectedGroupId === 2
                  ? 'الفرقة الثانية'
                  : 'الفرقة الثالثة'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-bold text-slate-200">
              {filtered.length} متدرب
            </span>

            {canAddTrainee && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#c29938] hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>إضافة متدرب جديد</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، اسم المستخدم، أو رقم الهاتف..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-karooz-gold"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-karooz-gold"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">الحسابات النشطة فقط</option>
              <option value="suspended">الحسابات الموقوفة فقط</option>
            </select>
          </div>
        </div>

        {notice && (
          <div className="p-3.5 bg-blue-950/60 border border-blue-800/60 text-blue-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Trainees Cards Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-karooz-gold" />
            <p className="text-sm">جاري تحميل سجل المتدربين...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <div
                key={t.id}
                onClick={() => openDrawer(t.id)}
                className={`border rounded-2xl p-5 shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.01] flex flex-col justify-between ${
                  t.is_active
                    ? 'bg-slate-900/90 border-slate-800 hover:border-karooz-gold/40'
                    : 'bg-rose-950/20 border-rose-900/40 opacity-85'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-karooz-gold font-bold text-base shrink-0">
                        {t.avatar_url ? (
                          <Image src={t.avatar_url} alt={t.full_name} width={48} height={48} className="rounded-xl object-cover" />
                        ) : (
                          <User className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white hover:text-karooz-gold transition-colors">
                          {t.full_name}
                        </h3>
                        <span className="text-xs text-slate-400 font-mono">@{t.username}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        t.is_active
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                          : 'bg-rose-950/60 text-rose-300 border-rose-800/50'
                      }`}
                    >
                      {t.is_active ? 'نشط' : 'موقوف'}
                    </span>
                  </div>

                  {/* Trainee Details */}
                  <div className="space-y-1.5 text-xs text-slate-300 mb-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>الفرقة الدراسية:</span>
                      <strong className="text-karooz-gold">
                        {t.group_id === 1 ? 'الفرقة الأولى' : t.group_id === 2 ? 'الفرقة الثانية' : 'الفرقة الثالثة'}
                      </strong>
                    </div>

                    {t.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">الهاتف:</span>
                        <span dir="ltr" className="text-slate-200 font-semibold">{t.phone}</span>
                      </div>
                    )}

                    {t.confession_father && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">أب الاعتراف:</span>
                        <span className="text-slate-200">{t.confession_father}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <span className="text-xs text-karooz-gold font-bold flex items-center gap-1">
                    <span>فتح الملف الأكاديمي</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>

                  <button
                    disabled={updating}
                    onClick={(e) => handleToggleSuspension(t, e)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      t.is_active
                        ? 'bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/50'
                        : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/50'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{t.is_active ? 'إيقاف' : 'تفعيل'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
            لا توجد سجلات مطابقة للبحث.
          </div>
        )}
      </main>

      {/* Interactive Trainee Drawer */}
      <TraineeProfileDrawer
        traineeId={selectedTraineeId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentUserProfile={profile}
        onProfileUpdated={() => loadTrainees(profile!, selectedGroupId)}
      />

      {/* Create Trainee Modal */}
      <CreateTraineeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={profile}
        defaultGroupId={selectedGroupId > 0 ? selectedGroupId : (profile?.group_id || 1)}
        onTraineeCreated={() => {
          if (profile) loadTrainees(profile, selectedGroupId);
        }}
      />

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
