'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAppTheme, AppTheme, AppAccent } from '@/context/ThemeContext';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import {
  Settings as SettingsIcon,
  Palette,
  Sun,
  Moon,
  Crown,
  Sparkles,
  Shield,
  Database,
  Upload,
  BellRing,
  Award,
  BookOpen,
  Users,
  Flame,
  CalendarCheck,
  FileText,
  Lock,
  ChevronLeft,
  User,
  CheckCircle2,
  Sliders,
  Laptop,
  Layers,
} from 'lucide-react';
import type { Profile } from '@/types/database';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, accent, setTheme, setAccent } = useAppTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      const supabase = createClient();
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: pData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (pData) {
          setProfile(pData as Profile);
        }
      } catch (err) {
        console.error('Settings load error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [router]);

  const isAdminOrSuper = profile?.role_id === 'admin' || profile?.role_id === 'super_user';
  const isServant = profile?.role_id === 'servant';
  const isSecretariat = profile?.role_id === 'secretariat';
  const isTrainee = profile?.role_id === 'trainee';

  const getRoleName = (r: string) => {
    switch (r) {
      case 'admin':
        return 'مدير النظام (Admin)';
      case 'super_user':
        return 'المسؤول المتميز (Super User)';
      case 'servant':
        return 'خادم الفرقة الدراسية';
      case 'secretariat':
        return 'سكرتارية الفرقة الدراسية';
      default:
        return 'طالب بالمدرسة';
    }
  };

  const getGroupName = (gId: number) => {
    if (gId === 1) return 'الفرقة الأولى';
    if (gId === 2) return 'الفرقة الثانية';
    return 'الفرقة الثالثة';
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-[#c29938] selection:text-slate-950" dir="rtl">
      {/* Smart Header */}
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

      {/* Main Settings Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 pb-28 md:pb-12 space-y-6">
        {/* Page Hero Header */}
        <div className="flex items-center gap-3.5 p-5 rounded-3xl bg-gradient-to-r from-[#0e172a] via-[#101c36] to-[#7B0017]/30 border border-[#c29938]/30 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#c29938]/20 border border-[#c29938]/40 text-[#c29938] flex items-center justify-center shadow-lg shrink-0">
            <SettingsIcon className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100">لوحة الإعدادات والتحكم</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              تخصيص المظهر وتصفح الأدوات والإعدادات المخصصة لصلاحيات حسابك
            </p>
          </div>
        </div>

        {/* 1. Appearance & Theme Settings (مظهر النظام والثيم الموحد) */}
        <section className="p-5 rounded-3xl bg-[#0a101d] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <Palette className="w-5 h-5 text-[#c29938]" />
              <h2 className="text-sm font-black text-slate-100">المظهر والهوية البصرية (Theme & Accents)</h2>
            </div>
            <span className="text-[11px] font-bold text-[#c29938] bg-[#c29938]/10 px-2.5 py-0.5 rounded-full border border-[#c29938]/30">
              تطبيق مباشر
            </span>
          </div>

          {/* Theme Display Mode Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2.5">وضع العرض (Display Mode)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => setTheme('luxury')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'luxury'
                    ? 'bg-[#c29938] text-slate-950 font-black border-[#c29938] shadow-lg shadow-[#c29938]/20 scale-102'
                    : 'bg-[#0e1626] text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Crown className="w-5 h-5" />
                <span className="text-xs">الملكي القبطي</span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-white font-black border-slate-600 shadow-lg scale-102'
                    : 'bg-[#0e1626] text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs">الداكن الليلي</span>
              </button>

              <button
                onClick={() => setTheme('light')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'bg-slate-200 text-slate-950 font-black border-slate-300 shadow-lg scale-102'
                    : 'bg-[#0e1626] text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs">النهاري الفاتح</span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'system'
                    ? 'bg-blue-600 text-white font-black border-blue-500 shadow-lg scale-102'
                    : 'bg-[#0e1626] text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Laptop className="w-5 h-5" />
                <span className="text-xs">تلقائي (النظام)</span>
              </button>
            </div>
          </div>

          {/* Accent Color Palette Selector */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 block mb-2.5">لون التمييز الكنسي (Brand Accent)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => setAccent('gold')}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                  accent === 'gold'
                    ? 'bg-[#c29938]/20 border-[#c29938] text-white font-bold'
                    : 'bg-[#0e1626] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-[#c29938] shadow-sm shrink-0" />
                <span className="text-xs">الذهب القبطي</span>
              </button>

              <button
                onClick={() => setAccent('burgundy')}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                  accent === 'burgundy'
                    ? 'bg-[#7B0017]/30 border-[#7B0017] text-white font-bold'
                    : 'bg-[#0e1626] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-[#7B0017] shadow-sm shrink-0" />
                <span className="text-xs">العنابي الكنسي</span>
              </button>

              <button
                onClick={() => setAccent('navy')}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                  accent === 'navy'
                    ? 'bg-[#0B1B3D]/50 border-blue-400 text-white font-bold'
                    : 'bg-[#0e1626] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-[#0B1B3D] border border-blue-400 shadow-sm shrink-0" />
                <span className="text-xs">الأزرق النيلي</span>
              </button>

              <button
                onClick={() => setAccent('emerald')}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                  accent === 'emerald'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                    : 'bg-[#0e1626] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-[#10B981] shadow-sm shrink-0" />
                <span className="text-xs">الأخضر النخل</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. User Identity Summary Card */}
        {profile && (
          <section className="p-5 rounded-3xl bg-[#0a101d] border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#c29938] via-amber-400 to-amber-600 p-0.5 shadow-lg overflow-hidden shrink-0">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-black text-lg text-[#c29938] overflow-hidden">
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt={profile.full_name} width={56} height={56} className="object-cover" />
                  ) : (
                    profile.full_name.charAt(0)
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-black text-base text-slate-100">{profile.full_name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="text-[#c29938] font-bold">{getRoleName(profile.role_id)}</span>
                  <span>•</span>
                  <span>{getGroupName(profile.group_id)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedProfileId(profile.id)}
              className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-[#0e1626] hover:bg-[#c29938] hover:text-slate-950 border border-slate-800 text-xs font-bold text-slate-300 transition-all"
            >
              تعديل الصورة والبيانات الشخصية
            </button>
          </section>
        )}

        {/* 3. Role-Aware Administrative & Management Sections (أقسام الإدارة حسب الصلاحيات) */}
        
        {/* ========================================== */}
        {/* SECTION A: Admin & Super User Control Hub */}
        {/* ========================================== */}
        {isAdminOrSuper && (
          <section className="p-5 rounded-3xl bg-[#0a101d] border border-[#c29938]/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-black text-slate-100">أدوات إدارة النظام (System Administration)</h2>
              </div>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                صلاحية كاملة (Full Access)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Backups Hub */}
              <Link
                href="/admin/backups"
                className="p-4 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 hover:border-emerald-500/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 group-hover:text-emerald-400 block">
                      النسخ الاحتياطي السحابي
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      إنشاء، تحميل، واستعادة أرشيف النظام وقاعدة البيانات وGoogle Drive
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-transform shrink-0" />
              </Link>

              {/* Data Imports Hub */}
              <Link
                href="/admin/imports"
                className="p-4 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 hover:border-blue-500/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 group-hover:text-blue-400 block">
                      استيراد وتغذية البيانات
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      استيراد دفعات الطلاب والخدام عبر ملفات Excel وCSV المعتمدة
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-transform shrink-0" />
              </Link>

              {/* Notifications & Pastoral Dispatch */}
              <Link
                href="/admin/notifications"
                className="p-4 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 hover:border-amber-500/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 group-hover:text-amber-400 block">
                      إدارة الإشعارات والافتقاد
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      تعديل رسائل أعياد الميلاد، قوالب الغياب، وبث الآيات اليومية
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-transform shrink-0" />
              </Link>

              {/* Group & Secretariat Assignment */}
              <Link
                href="/groups"
                className="p-4 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 hover:border-purple-500/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 group-hover:text-purple-400 block">
                      إدارة الفرق وتعيين السكرتارية
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      قفل جلسات الحضور، توزيع الخدام، وتفويض الصلاحيات
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-transform shrink-0" />
              </Link>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* SECTION B: Servant & Academic Section Hub  */}
        {/* ========================================== */}
        {(isServant || isAdminOrSuper) && (
          <section className="p-5 rounded-3xl bg-[#0a101d] border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-black text-slate-100">الأقسام الأكاديمية والخدمية (Academic & Ministry)</h2>
              </div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                صلاحيات الخدمة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/curriculum"
                className="p-4 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 hover:border-amber-500/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 group-hover:text-amber-400 block">
                      المناهج والمحاضرات الدراسية
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      عرض وإدارة مواد المحاضرات ومحاضري الفرقة
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-transform shrink-0" />
              </Link>

              <Link
                href="/marathon/manage"
                className="p-4 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 hover:border-rose-500/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 group-hover:text-rose-400 block">
                      إدارة أسئلة الماراثون
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      متابعة إجابات وتصحيح ماراثون الآيات الأسبوعي
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-transform shrink-0" />
              </Link>

              <Link
                href="/exams"
                className="p-4 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 hover:border-purple-500/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 group-hover:text-purple-400 block">
                      رصد درجات الامتحانات
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      تسجيل درجات الترم والامتحانات النهائية للطلاب
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-transform shrink-0" />
              </Link>

              <Link
                href="/trainees"
                className="p-4 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 hover:border-cyan-500/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 group-hover:text-cyan-400 block">
                      سجل طلاب الفرقة والافتقاد
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      عرض بيانات الطلاب والمتابعة الدورية لأب الاعتراف
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-transform shrink-0" />
              </Link>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* SECTION C: Secretariat & Attendance Hub    */}
        {/* ========================================== */}
        {(isSecretariat || isAdminOrSuper) && (
          <section className="p-5 rounded-3xl bg-[#0a101d] border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-black text-slate-100">أعمال السكرتارية والغياب (Secretariat & Attendance)</h2>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                إدارة الحضور
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/attendance"
                className="p-4 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 hover:border-emerald-500/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 group-hover:text-emerald-400 block">
                      تسجيل الحضور الأسبوعي للفرقة
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      رصد الحضور والغياب المباشر لجلسات يوم الجمعة
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-transform shrink-0" />
              </Link>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* SECTION D: Trainee Student Shortcuts       */}
        {/* ========================================== */}
        {isTrainee && (
          <section className="p-5 rounded-3xl bg-[#0a101d] border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-[#c29938]" />
                <h2 className="text-sm font-black text-slate-100">خدمات الطالب (Trainee Services)</h2>
              </div>
              <span className="text-[10px] font-bold text-[#c29938] bg-[#c29938]/10 px-2.5 py-0.5 rounded-full border border-[#c29938]/30">
                ملفي الدراسي
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/marathon"
                className="p-4 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 hover:border-[#c29938]/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 group-hover:text-[#c29938] block">
                      ماراثون الآيات الأسبوعي
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      حل أسئلة الحفظ الأسبوعية ومتابعة تقييمك
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-[#c29938] transition-transform shrink-0" />
              </Link>

              <Link
                href="/notifications"
                className="p-4 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 hover:border-[#c29938]/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 group-hover:text-[#c29938] block">
                      تنبيهات ورسائل الافتقاد
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      متابعة رسائل الافتقاد وأعياد الميلاد وتنبيهات المدرسة
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-[#c29938] transition-transform shrink-0" />
              </Link>
            </div>
          </section>
        )}
      </main>

      {/* Smart Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
