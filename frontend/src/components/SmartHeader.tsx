'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAppTheme, type AppTheme } from '@/context/ThemeContext';
import NotificationCenter from '@/components/NotificationCenter';
import { useScrollChrome } from '@/hooks/useScrollChrome';
import NavDrawer from '@/components/NavDrawer';
import { PRIMARY_NAV, isNavActive as navIsActive } from '@/lib/navigation';
import {
  Search,
  Sun,
  Moon,
  Crown,
  Sparkles,
  LogOut,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface SmartHeaderProps {
  profile: Profile | null;
  onOpenSearch: () => void;
  onOpenProfile: (id: string, role: string) => void;
}

export default function SmartHeader({ profile, onOpenSearch, onOpenProfile }: SmartHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, toggleTheme } = useAppTheme();
  const isVisible = useScrollChrome();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Click outside to close theme menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isAdminOrSuper =
    profile?.role_id === 'admin' || profile?.role_id === 'super_user';

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 backdrop-blur-xl border-b ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}
      style={{
        backgroundColor: 'var(--bg-nav, #0b1324)',
        borderColor: 'var(--border-card, #253556)',
        boxShadow: 'var(--shadow-card-elevated, 0 4px 20px rgba(0, 0, 0, 0.4))',
      }}
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-5 h-15 flex items-center justify-between gap-3">
        {/* Right Section: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#c29938]/30 via-slate-800 to-[#c29938]/10 border border-[#c29938]/40 p-0.5 shadow-md flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="شعار مدرسة الكاروز" fill sizes="40px" className="object-cover rounded-xl" />
            </div>
            <div className="text-right">
              <span className="font-black text-sm block leading-tight text-slate-100 group-hover:text-[#c29938] transition-colors">
                مدرسة الكاروز
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">كنيسة مارمرقس بالمنشية</span>
            </div>
          </Link>

          {/* Search Trigger Button */}
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center gap-2 bg-[#0e1626]/80 hover:bg-[#131f37] border border-slate-800 hover:border-[#c29938]/40 rounded-2xl px-3 py-1.5 text-xs text-slate-400 w-44 lg:w-56 transition-all shadow-inner"
          >
            <Search className="w-3.5 h-3.5 text-[#c29938] shrink-0" />
            <span className="truncate">بحث شامل...</span>
          </button>
        </div>

        {/* Center: the five primary destinations, icons only (Desktop) */}
        <nav className="hidden lg:flex items-center gap-0.5 h-full" aria-label="التنقل الرئيسي">
          {PRIMARY_NAV.map((item) => {
            const active = navIsActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                aria-current={active ? 'page' : undefined}
                className={`grid h-9 w-9 place-items-center rounded-xl transition-all ${
                  active
                    ? 'bg-[#c29938]/15 text-[#c29938] border border-[#c29938]/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${active ? 'stroke-[2.4]' : ''}`} />
              </Link>
            );
          })}
        </nav>

        {/* Left Section: Mobile Search, Settings/Theme Icon, Notification Bell, User Profile Capsule & Logout */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Button */}
          <button
            onClick={onOpenSearch}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 md:hidden hover:text-[#c29938]"
            title="بحث"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme Quick Switcher Popover */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-slate-300 hover:text-[#c29938] transition-all flex items-center gap-1"
              title="تغيير المظهر السريع"
            >
              {theme === 'luxury' ? (
                <Crown className="w-4 h-4 text-[#c29938]" />
              ) : theme === 'dark' ? (
                <Moon className="w-4 h-4 text-rose-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showThemeMenu && (
              <div
                className="absolute left-0 mt-2 w-44 rounded-2xl border shadow-xl p-2 z-50 animate-fade-in space-y-1"
                style={{
                  backgroundColor: 'var(--bg-card, #0e182d)',
                  borderColor: 'var(--border-card, #253556)',
                }}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  المظهر السريع
                </div>
                <button
                  onClick={() => {
                    setTheme('luxury');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    theme === 'luxury' ? 'bg-[#c29938] text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5" />
                    <span>الملكي القبطي</span>
                  </span>
                  {theme === 'luxury' && <span className="text-[10px]">✓</span>}
                </button>
                <button
                  onClick={() => {
                    setTheme('dark');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    theme === 'dark' ? 'bg-rose-900/60 text-white font-black' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5" />
                    <span>الداكن الليلي</span>
                  </span>
                  {theme === 'dark' && <span className="text-[10px]">✓</span>}
                </button>
                <button
                  onClick={() => {
                    setTheme('light');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    theme === 'light' ? 'bg-slate-200 text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sun className="w-3.5 h-3.5" />
                    <span>النهاري الفاتح</span>
                  </span>
                  {theme === 'light' && <span className="text-[10px]">✓</span>}
                </button>
                <button
                  onClick={() => {
                    setTheme('system');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    theme === 'system' ? 'bg-slate-700 text-white font-black' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تلقائي النظام</span>
                  </span>
                  {theme === 'system' && <span className="text-[10px]">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Overflow: opens the side drawer where settings and the rest live */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="كل الأقسام"
            title="كل الأقسام"
            aria-expanded={drawerOpen}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 transition-colors hover:border-[#c29938]/40 hover:text-[#c29938]"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>

          {/* Notification Center Popover */}
          <NotificationCenter />

          {/* User Profile Capsule Button */}
          {profile && (
            <button
              onClick={() => onOpenProfile(profile.id, profile.role_id)}
              className="flex items-center gap-2 bg-[#0e1626]/80 hover:bg-[#131f37] border border-slate-800 hover:border-[#c29938]/40 rounded-full py-1 pr-1.5 pl-3 transition-all shadow-sm group"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#c29938] to-amber-600 text-slate-950 flex items-center justify-center font-black text-xs shadow-sm overflow-hidden shrink-0">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.full_name} width={28} height={28} className="object-cover" />
                ) : (
                  profile.full_name.charAt(0)
                )}
              </div>
              <span className="text-xs font-bold text-slate-200 hidden sm:inline max-w-[90px] truncate group-hover:text-[#c29938]">
                {profile.full_name.split(' ')[0]}
              </span>
            </button>
          )}

          {/* Quick Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        canAdmin={!!isAdminOrSuper}
        onOpenProfile={() => profile && onOpenProfile(profile.id, profile.role_id)}
      />
    </header>
  );
}
