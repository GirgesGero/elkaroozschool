'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import Avatar from '../../components/Avatar';
import CurriculumManagementPanel from '@/components/CurriculumManagementPanel';

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
    <div className="min-h-screen bg-canvas text-content flex flex-col selection:bg-gold selection:text-content" dir="rtl">
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
        <div className="flex items-center gap-3.5 p-5 rounded-3xl bg-gradient-to-r from-canvas via-canvas to-brand/30 border border-gold/30 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-gold/20 border border-gold/40 text-gold flex items-center justify-center shadow-lg shrink-0">
            <SettingsIcon className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-black text-content">لوحة الإعدادات والتحكم</h1>
            <p className="text-xs text-content-muted mt-0.5">
              تخصيص المظهر وتصفح الأدوات والإعدادات المخصصة لصلاحيات حسابك
            </p>
          </div>
        </div>

        {/* 1. Appearance & Theme Settings (مظهر النظام والثيم الموحد) */}
        <section className="p-5 rounded-3xl bg-canvas border border-line shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-line/80 pb-3">
            <div className="flex items-center gap-2.5">
              <Palette className="w-5 h-5 text-gold" />
              <h2 className="text-sm font-black text-content">المظهر والهوية البصرية (Theme & Accents)</h2>
            </div>
            <span className="text-[11px] font-bold text-gold bg-gold/10 px-2.5 py-0.5 rounded-full border border-gold/30">
              تطبيق مباشر
            </span>
          </div>

          {/* Theme Display Mode Selector */}
          <div>
            <label className="text-xs font-bold text-content-secondary block mb-2.5">وضع العرض (Display Mode)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => setTheme('luxury')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'luxury'
                    ? 'bg-gold text-brand-on font-black border-gold shadow-lg shadow-gold/20 scale-102'
                    : 'bg-canvas text-content-secondary border-line hover:border-line'
                }`}
              >
                <Crown className="w-5 h-5" />
                <span className="text-xs">الملكي القبطي</span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'dark'
                    ? 'bg-nav text-content font-black border-line-subtle shadow-lg scale-102'
                    : 'bg-canvas text-content-secondary border-line hover:border-line'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs">الداكن الليلي</span>
              </button>

              <button
                onClick={() => setTheme('light')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'bg-card text-content font-black border-line-subtle shadow-lg scale-102'
                    : 'bg-canvas text-content-secondary border-line hover:border-line'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs">النهاري الفاتح</span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'system'
                    ? 'bg-info text-content font-black border-info shadow-lg scale-102'
                    : 'bg-canvas text-content-secondary border-line hover:border-line'
                }`}
              >
                <Laptop className="w-5 h-5" />
                <span className="text-xs">تلقائي (النظام)</span>
              </button>
            </div>
          </div>

          {/* Accent Color Palette Selector */}
          <div className="pt-2 border-t border-line/80">
            <label className="text-xs font-bold text-content-secondary block mb-2.5">لون التمييز الكنسي (Brand Accent)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => setAccent('gold')}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                  accent === 'gold'
                    ? 'bg-gold/20 border-gold text-brand-on font-bold'
                    : 'bg-canvas border-line text-content-secondary hover:border-line'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-gold shadow-sm shrink-0" />
                <span className="text-xs">الذهب القبطي</span>
              </button>

              <button
                onClick={() => setAccent('burgundy')}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                  accent === 'burgundy'
                    ? 'bg-brand/30 border-brand text-brand-on font-bold'
                    : 'bg-canvas border-line text-content-secondary hover:border-line'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-brand shadow-sm shrink-0" />
                <span className="text-xs">العنابي الكنسي</span>
              </button>

              <button
                onClick={() => setAccent('navy')}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                  accent === 'navy'
                    ? 'bg-nav/50 border-info text-content font-bold'
                    : 'bg-canvas border-line text-content-secondary hover:border-line'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-nav border border-info shadow-sm shrink-0" />
                <span className="text-xs">الأزرق النيلي</span>
              </button>

              <button
                onClick={() => setAccent('emerald')}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                  accent === 'emerald'
                    ? 'bg-success/20 border-success text-content font-bold'
                    : 'bg-canvas border-line text-content-secondary hover:border-line'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-success shadow-sm shrink-0" />
                <span className="text-xs">الأخضر النخل</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. User Identity Summary Card */}
        {profile && (
          <section className="relative overflow-hidden rounded-3xl border border-line bg-canvas shadow-xl">
            {/* Coptic gold hairline + ambient wash, matching the rest of the theme */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold to-transparent" />
            <div className="pointer-events-none absolute -top-24 -left-16 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />

            <div className="relative flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
                {/* Ring + soft halo. The Avatar component handles the image,
                    the missing-avatar initial, and any broken remote URL. */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 -m-1.5 rounded-full bg-gold/20 blur-lg" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-gold via-amber-400 to-warning p-[3px] shadow-lg">
                    <div className="w-full h-full rounded-full bg-nav flex items-center justify-center overflow-hidden">
                      <Avatar
                        src={profile.avatar_url}
                        name={profile.full_name}
                        size={74}
                        rounded="rounded-full"
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-center sm:text-start">
                  <h3 className="font-black text-xl leading-tight text-content">
                    {profile.full_name}
                  </h3>
                  {profile.username && (
                    <p className="mt-0.5 text-xs text-content-muted" dir="ltr">
                      @{profile.username}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-gold ring-1 ring-gold/30">
                      {getRoleName(profile.role_id)}
                    </span>
                    <span className="rounded-full bg-info/10 px-2.5 py-1 text-[11px] font-bold text-info ring-1 ring-info/25">
                      {getGroupName(profile.group_id)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedProfileId(profile.id)}
                className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-2.5 text-xs font-black text-brand-on transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:w-auto"
              >
                تعديل الصورة والبيانات الشخصية
              </button>
            </div>
          </section>
        )}

        {profile && <CurriculumManagementPanel profile={profile} />}

        {/* 3. Role-Aware Administrative & Management Sections (أقسام الإدارة حسب الصلاحيات) */}
        
        {/* ========================================== */}
        {/* SECTION A: Admin & Super User Control Hub */}
        {/* ========================================== */}
        {isAdminOrSuper && (
          <section className="p-5 rounded-3xl bg-canvas border border-gold/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-success" />
                <h2 className="text-sm font-black text-content">أدوات إدارة النظام (System Administration)</h2>
              </div>
              <span className="text-[10px] font-black text-success bg-success/10 px-2.5 py-0.5 rounded-full border border-success/30">
                صلاحية كاملة (Full Access)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Backups Hub */}
              <Link
                href="/admin/backups"
                className="p-4 rounded-2xl bg-canvas hover:bg-card border border-line hover:border-success/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-success/10 text-success group-hover:scale-110 transition-transform">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-content group-hover:text-success block">
                      النسخ الاحتياطي السحابي
                    </span>
                    <span className="text-[11px] text-content-muted mt-0.5 block">
                      إنشاء، تحميل، واستعادة أرشيف النظام وقاعدة البيانات وGoogle Drive
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-success transition-transform shrink-0" />
              </Link>

              {/* Data Imports Hub */}
              <Link
                href="/admin/imports"
                className="p-4 rounded-2xl bg-canvas hover:bg-card border border-line hover:border-info/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-info/10 text-info group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-content group-hover:text-info block">
                      استيراد وتغذية البيانات
                    </span>
                    <span className="text-[11px] text-content-muted mt-0.5 block">
                      استيراد دفعات الطلاب والخدام عبر ملفات Excel وCSV المعتمدة
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-info transition-transform shrink-0" />
              </Link>

              {/* Notifications & Pastoral Dispatch */}
              <Link
                href="/admin/notifications"
                className="p-4 rounded-2xl bg-canvas hover:bg-card border border-line hover:border-warning/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-warning/10 text-warning group-hover:scale-110 transition-transform">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-content group-hover:text-warning block">
                      إدارة الإشعارات والافتقاد
                    </span>
                    <span className="text-[11px] text-content-muted mt-0.5 block">
                      تعديل رسائل أعياد الميلاد، قوالب الغياب، وبث الآيات اليومية
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-warning transition-transform shrink-0" />
              </Link>

              {/* Group & Secretariat Assignment */}
              <Link
                href="/groups"
                className="p-4 rounded-2xl bg-canvas hover:bg-card border border-line hover:border-info/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-info/10 text-purple-400 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-content group-hover:text-purple-400 block">
                      إدارة الفرق وتعيين السكرتارية
                    </span>
                    <span className="text-[11px] text-content-muted mt-0.5 block">
                      قفل جلسات الحضور، توزيع الخدام، وتفويض الصلاحيات
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-purple-400 transition-transform shrink-0" />
              </Link>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* SECTION B: Servant & Academic Section Hub  */}
        {/* ========================================== */}
        {(isServant || isAdminOrSuper) && (
          <section className="p-5 rounded-3xl bg-canvas border border-line shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-warning" />
                <h2 className="text-sm font-black text-content">الأقسام الأكاديمية والخدمية (Academic & Ministry)</h2>
              </div>
              <span className="text-[10px] font-bold text-warning bg-warning/10 px-2.5 py-0.5 rounded-full border border-warning/30">
                صلاحيات الخدمة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/curriculum"
                className="p-4 rounded-2xl bg-canvas hover:bg-card border border-line hover:border-warning/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-warning/10 text-warning group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-content group-hover:text-warning block">
                      المناهج والمحاضرات الدراسية
                    </span>
                    <span className="text-[11px] text-content-muted mt-0.5 block">
                      عرض وإدارة مواد المحاضرات ومحاضري الفرقة
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-warning transition-transform shrink-0" />
              </Link>

              <Link
                href="/marathon/manage"
                className="p-4 rounded-2xl bg-canvas hover:bg-card border border-line hover:border-danger/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-danger/10 text-danger group-hover:scale-110 transition-transform">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-content group-hover:text-danger block">
                      إدارة أسئلة الماراثون
                    </span>
                    <span className="text-[11px] text-content-muted mt-0.5 block">
                      متابعة إجابات وتصحيح ماراثون الآيات الأسبوعي
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-danger transition-transform shrink-0" />
              </Link>

              <Link
                href="/exams"
                className="p-4 rounded-2xl bg-canvas hover:bg-card border border-line hover:border-info/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-info/10 text-purple-400 group-hover:scale-110 transition-transform">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-content group-hover:text-purple-400 block">
                      رصد درجات الامتحانات
                    </span>
                    <span className="text-[11px] text-content-muted mt-0.5 block">
                      تسجيل درجات الترم والامتحانات النهائية للطلاب
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-purple-400 transition-transform shrink-0" />
              </Link>

              <Link
                href="/trainees"
                className="p-4 rounded-2xl bg-canvas hover:bg-card border border-line hover:border-cyan-500/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-info/10 text-info group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-content group-hover:text-info block">
                      سجل طلاب الفرقة والافتقاد
                    </span>
                    <span className="text-[11px] text-content-muted mt-0.5 block">
                      عرض بيانات الطلاب والمتابعة الدورية لأب الاعتراف
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-info transition-transform shrink-0" />
              </Link>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* SECTION C: Secretariat & Attendance Hub    */}
        {/* ========================================== */}
        {(isSecretariat || isAdminOrSuper || isServant) && (
          <section className="p-5 rounded-3xl bg-canvas border border-line shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="w-5 h-5 text-success" />
                <h2 className="text-sm font-black text-content">أعمال السكرتارية والغياب (Secretariat & Attendance)</h2>
              </div>
              <span className="text-[10px] font-bold text-success bg-success/10 px-2.5 py-0.5 rounded-full border border-success/30">
                إدارة الحضور
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/attendance"
                className="p-4 rounded-2xl bg-canvas hover:bg-card border border-line hover:border-success/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-success/10 text-success group-hover:scale-110 transition-transform">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-content group-hover:text-success block">
                      تسجيل الحضور الأسبوعي للفرقة
                    </span>
                    <span className="text-[11px] text-content-muted mt-0.5 block">
                      رصد الحضور والغياب المباشر لجلسات يوم الجمعة
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-success transition-transform shrink-0" />
              </Link>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* SECTION D: Trainee Student Shortcuts       */}
        {/* ========================================== */}
        {isTrainee && (
          <section className="p-5 rounded-3xl bg-canvas border border-line shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-gold" />
                <h2 className="text-sm font-black text-content">خدمات الطالب (Trainee Services)</h2>
              </div>
              <span className="text-[10px] font-bold text-gold bg-gold/10 px-2.5 py-0.5 rounded-full border border-gold/30">
                ملفي الدراسي
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/marathon"
                className="p-4 rounded-2xl bg-canvas hover:bg-card border border-line hover:border-gold/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-danger/10 text-danger group-hover:scale-110 transition-transform">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-content group-hover:text-gold block">
                      ماراثون الآيات الأسبوعي
                    </span>
                    <span className="text-[11px] text-content-muted mt-0.5 block">
                      حل أسئلة الحفظ الأسبوعية ومتابعة تقييمك
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-gold transition-transform shrink-0" />
              </Link>

              <Link
                href="/notifications"
                className="p-4 rounded-2xl bg-canvas hover:bg-card border border-line hover:border-gold/50 flex items-start justify-between group transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-warning/10 text-warning group-hover:scale-110 transition-transform">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-content group-hover:text-gold block">
                      تنبيهات ورسائل الافتقاد
                    </span>
                    <span className="text-[11px] text-content-muted mt-0.5 block">
                      متابعة رسائل الافتقاد وأعياد الميلاد وتنبيهات المدرسة
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-gold transition-transform shrink-0" />
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
