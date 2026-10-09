'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Bell,
  User,
  Menu,
  BookOpen,
  Music,
  Image as ImageIcon,
  Flame,
  Award,
  CalendarCheck,
  Settings,
  Shield,
  X,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface SmartBottomNavProps {
  profile: Profile | null;
  unreadNotificationsCount?: number;
  onOpenProfile: (id: string, role: string) => void;
}

export default function SmartBottomNav({
  profile,
  unreadNotificationsCount = 0,
  onOpenProfile,
}: SmartBottomNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Always show when near top or bottom
          if (currentScrollY < 40) {
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY && currentScrollY > 80) {
            // Scrolling down -> hide bottom nav to expand screen area
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY - 15) {
            // Scrolling up -> restore bottom nav
            setIsVisible(true);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const isAdminOrSuper = profile?.role_id === 'admin' || profile?.role_id === 'super_user';
  const isServant = profile?.role_id === 'servant';
  const isSecretariat = profile?.role_id === 'secretariat';

  const isMoreActive = [
    '/books',
    '/bible',
    '/mp3',
    '/gallery',
    '/marathon',
    '/exams',
    '/attendance',
    '/admin',
  ].some((p) => pathname.startsWith(p));

  return (
    <>
      {/* Elevated Floating Modern Bottom Navigation with Iconic Center Home Button */}
      <nav
        className={`fixed bottom-0 inset-x-0 z-40 md:hidden transition-all duration-300 pb-safe ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        dir="rtl"
      >
        <div className="relative max-w-md mx-auto px-3 pb-2">
          {/* Main Glassmorphic Capsule Bar */}
          <div
            className="h-16 rounded-3xl backdrop-blur-2xl border flex items-center justify-between px-2 shadow-2xl relative"
            style={{
              backgroundColor: 'rgba(7, 11, 20, 0.94)',
              borderColor: 'rgba(194, 153, 56, 0.35)',
              boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(194, 153, 56, 0.1)',
            }}
          >
            {/* RIGHT WING: 1. Groups & 2. Notifications */}
            <div className="flex items-center justify-around flex-1">
              {/* 1. Groups (الفرق) */}
              <Link
                href="/groups"
                className={`flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all ${
                  pathname.startsWith('/groups') ? 'text-[#c29938] font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    pathname.startsWith('/groups')
                      ? 'bg-[#c29938]/15 border border-[#c29938]/40 shadow-sm'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] leading-none">الفرق</span>
              </Link>

              {/* 2. Notifications (الإشعارات) */}
              <Link
                href="/notifications"
                className={`relative flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all ${
                  pathname.startsWith('/notifications')
                    ? 'text-[#c29938] font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl relative transition-all ${
                    pathname.startsWith('/notifications')
                      ? 'bg-[#c29938]/15 border border-[#c29938]/40 shadow-sm'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-md animate-pulse">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] leading-none">الإشعارات</span>
              </Link>
            </div>

            {/* CENTER ICONIC HOME BUTTON (Elevated Floating Orb) */}
            <div className="relative -top-5 flex flex-col items-center justify-center px-1">
              <Link
                href="/"
                className="group relative flex items-center justify-center focus:outline-none"
              >
                {/* Ambient Glow Aura */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#c29938] via-amber-500 to-amber-200 blur-md opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" />

                {/* Outer Golden Halo Ring */}
                <div
                  className={`relative w-14 h-14 rounded-full p-1 bg-gradient-to-tr from-[#070b14] via-[#101b33] to-[#070b14] border-2 shadow-2xl flex items-center justify-center transition-all duration-300 transform group-hover:scale-105 active:scale-95 ${
                    pathname === '/'
                      ? 'border-[#c29938] shadow-[#c29938]/40'
                      : 'border-[#c29938]/60 shadow-black/80'
                  }`}
                >
                  {/* Center Core Button */}
                  <div
                    className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
                      pathname === '/'
                        ? 'bg-gradient-to-tr from-[#c29938] to-amber-400 text-slate-950 shadow-inner'
                        : 'bg-[#0f1a30] text-[#c29938] group-hover:bg-[#c29938] group-hover:text-slate-950'
                    }`}
                  >
                    <Home className={`w-6 h-6 ${pathname === '/' ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  </div>
                </div>
              </Link>
              <span
                className={`text-[10px] font-black mt-1 leading-none transition-colors ${
                  pathname === '/' ? 'text-[#c29938]' : 'text-slate-400'
                }`}
              >
                الرئيسية
              </span>
            </div>

            {/* LEFT WING: 3. Profile & 4. More Sheet */}
            <div className="flex items-center justify-around flex-1">
              {/* 3. Profile (حسابي) */}
              <button
                onClick={() => profile && onOpenProfile(profile.id, profile.role_id)}
                className="flex flex-col items-center justify-center gap-1 py-1 rounded-2xl text-slate-400 hover:text-slate-200 transition-all"
              >
                <div className="p-1.5 rounded-xl hover:bg-slate-800/40 transition-all">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-[10px] leading-none">حسابي</span>
              </button>

              {/* 4. More Menu (المزيد) */}
              <button
                onClick={() => setShowMoreSheet(true)}
                className={`flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all ${
                  isMoreActive || showMoreSheet ? 'text-[#c29938] font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isMoreActive || showMoreSheet
                      ? 'bg-[#c29938]/15 border border-[#c29938]/40 shadow-sm'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <Menu className="w-5 h-5" />
                </div>
                <span className="text-[10px] leading-none">المزيد</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Modern Bottom Sheet Menu for 'More' */}
      {showMoreSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md animate-fade-in md:hidden">
          <div
            className="w-full bg-[#070b14] border-t border-[#c29938]/40 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pb-8 shadow-2xl animate-slide-up"
            dir="rtl"
          >
            {/* Sheet Handle and Close */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#c29938] animate-pulse" />
                <h3 className="text-base font-black text-slate-100">أقسام مدرسة الكاروز</h3>
              </div>
              <button
                onClick={() => setShowMoreSheet(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Feature Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Link
                href="/bible"
                onClick={() => setShowMoreSheet(false)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0e1626] border border-slate-800 hover:border-[#c29938]/50 text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">الكتاب المقدس</span>
              </Link>

              <Link
                href="/books"
                onClick={() => setShowMoreSheet(false)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0e1626] border border-slate-800 hover:border-[#c29938]/50 text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">المكتبة</span>
              </Link>

              <Link
                href="/marathon"
                onClick={() => setShowMoreSheet(false)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0e1626] border border-slate-800 hover:border-[#c29938]/50 text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Flame className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">الماراثون</span>
              </Link>

              <Link
                href="/exams"
                onClick={() => setShowMoreSheet(false)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0e1626] border border-slate-800 hover:border-[#c29938]/50 text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">الامتحانات</span>
              </Link>

              <Link
                href="/attendance"
                onClick={() => setShowMoreSheet(false)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0e1626] border border-slate-800 hover:border-[#c29938]/50 text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">الغياب والحضور</span>
              </Link>

              <Link
                href="/mp3"
                onClick={() => setShowMoreSheet(false)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0e1626] border border-slate-800 hover:border-[#c29938]/50 text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Music className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">الصوتيات MP3</span>
              </Link>

              <Link
                href="/settings"
                onClick={() => setShowMoreSheet(false)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0e1626] border border-[#c29938]/40 hover:border-[#c29938] text-center group col-span-2"
              >
                <div className="w-10 h-10 rounded-xl bg-[#c29938]/15 text-[#c29938] flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Settings className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-slate-100">الإعدادات وتخصيص المظهر</span>
              </Link>
            </div>

            {/* Admin Management Section */}
            {isAdminOrSuper && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <span className="text-xs font-bold text-[#c29938] block mb-2">إدارة النظام</span>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/admin/backup"
                    onClick={() => setShowMoreSheet(false)}
                    className="p-3 rounded-2xl bg-[#121c32] border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>النسخ الاحتياطي</span>
                  </Link>
                  <Link
                    href="/admin/audit"
                    onClick={() => setShowMoreSheet(false)}
                    className="p-3 rounded-2xl bg-[#121c32] border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-[#c29938]" />
                    <span>سجل التدقيق</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
