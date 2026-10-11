'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Avatar from './Avatar';
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

interface ThemeOption {
  id: AppTheme;
  label: string;
  Icon: typeof Sun;
}

/**
 * Every colour here is a CSS variable. The previous version hardcoded
 * `slate-800`, `#c29938` and `slate-900/80` in 20+ places, so the header stayed
 * navy-on-dark in ALL THREE themes — the light theme rendered a dark bar
 * across the top with dark-on-dark text in places.
 *
 * Every icon-only control is >=44px (`.tap-target`) and carries an accessible
 * name, because an icon with no text has no name for a screen reader.
 */
export default function SmartHeader({ profile, onOpenSearch, onOpenProfile }: SmartHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useAppTheme();
  const isVisible = useScrollChrome();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Click outside AND Escape both close the menu — a keyboard user must not be
  // stranded in a popover they cannot dismiss.
  useEffect(() => {
    if (!showThemeMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowThemeMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showThemeMenu]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isAdminOrSuper =
    profile?.role_id === 'admin' || profile?.role_id === 'super_user';

  const THEME_OPTIONS: ThemeOption[] = [
    { id: 'luxury', label: 'الملكي القبطي', Icon: Crown },
    { id: 'dark', label: 'الداكن الليلي', Icon: Moon },
    { id: 'light', label: 'النهاري الفاتح', Icon: Sun },
    { id: 'system', label: 'تلقائي النظام', Icon: Sparkles },
  ];

  const activeThemeOption = THEME_OPTIONS.find((o) => o.id === theme) ?? THEME_OPTIONS[0];
  const ActiveThemeIcon = activeThemeOption.Icon;

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 backdrop-blur-xl border-b ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}
      style={{
        backgroundColor: 'var(--bg-nav)',
        borderColor: 'var(--border-card)',
        boxShadow: 'var(--shadow-card-elevated)',
      }}
      dir="rtl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Right: brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="app-card-interactive flex items-center gap-2.5 rounded-[14px] px-1 py-1">
            <div
              className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border p-0.5"
              style={{ borderColor: 'var(--brand-gold)', backgroundColor: 'var(--bg-card-hover)' }}
            >
              <Image src="/logo.png" alt="شعار مدرسة الكاروز" fill sizes="40px" className="object-cover rounded-[10px]" />
            </div>
            <div className="text-right">
              <span
                className="block text-sm font-extrabold leading-tight transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                مدرسة الكاروز
              </span>
              <span className="-mt-0.5 block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                كنيسة مارمرقس بالمنشية
              </span>
            </div>
          </Link>

          {/* Search trigger — 44px tall (was 30px, below tap-target guidance). */}
          <button
            onClick={onOpenSearch}
            className="hidden items-center gap-2 rounded-[12px] border px-3 text-xs transition-colors md:flex md:h-11 lg:w-64"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-muted)',
            }}
            aria-label="فتح البحث الشامل"
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-gold)' }} aria-hidden="true" />
            <span className="truncate">ابحث في الكتاب المقدس والتفاسير</span>
          </button>
        </div>

        {/* Centre: the five primary destinations, icons only (desktop).
            Icon-only means each link MUST carry an accessible name — aria-label
            and title both provide one. */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
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
                className="grid h-11 w-11 place-items-center rounded-[12px] border transition-colors"
                style={{
                  backgroundColor: active ? 'var(--bg-active-tab)' : 'transparent',
                  borderColor: active ? 'var(--brand-primary)' : 'transparent',
                  color: active ? 'var(--text-active-tab)' : 'var(--text-secondary)',
                }}
              >
                <Icon className={`h-[18px] w-[18px] ${active ? 'stroke-[2.4]' : ''}`} aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        {/* Left: mobile search, theme, overflow, notifications, profile, logout */}
        <div className="flex items-center gap-1.5">
          <button onClick={onOpenSearch} className="tap-target md:hidden" aria-label="بحث" title="بحث">
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Theme quick switcher */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu((v) => !v)}
              className="tap-target gap-1"
              aria-label="تغيير المظهر"
              aria-expanded={showThemeMenu}
              aria-haspopup="menu"
              title="تغيير المظهر"
            >
              <ActiveThemeIcon className="h-5 w-5" style={{ color: 'var(--brand-gold)' }} aria-hidden="true" />
              <ChevronDown className="h-3 w-3" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
            </button>

            {showThemeMenu && (
              <div
                role="menu"
                className="absolute left-0 z-50 mt-2 w-52 overflow-hidden rounded-[14px] border p-1.5"
                style={{
                  backgroundColor: 'var(--bg-card-raised)',
                  borderColor: 'var(--border-card)',
                  boxShadow: 'var(--shadow-overlay)',
                }}
              >
                <div className="app-meta px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  المظهر
                </div>
                {THEME_OPTIONS.map(({ id, label, Icon }) => {
                  const selected = theme === id;
                  return (
                    <button
                      key={id}
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        setTheme(id);
                        setShowThemeMenu(false);
                      }}
                      className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] px-3 text-sm font-semibold transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--bg-active-tab)' : 'transparent',
                        color: selected ? 'var(--text-active-tab)' : 'var(--text-primary)',
                      }}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span>{label}</span>
                      </span>
                      {selected && <span aria-hidden="true">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Overflow: opens the side drawer where settings and the rest live */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="tap-target"
            aria-label="كل الأقسام"
            title="كل الأقسام"
            aria-expanded={drawerOpen}
          >
            <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          </button>

          <NotificationCenter />

          {/* Profile capsule */}
          {profile && (
            <button
              onClick={() => onOpenProfile(profile.id, profile.role_id)}
              className="flex min-h-[44px] items-center gap-2 rounded-full border py-1 pr-1 pl-3 transition-colors"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-card)' }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-extrabold"
                style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}
              >
                {profile.avatar_url ? (
                  <Avatar src={profile.avatar_url} name={profile.full_name} size={28} rounded="rounded-full" />
                ) : (
                  profile.full_name.charAt(0)
                )}
              </div>
              <span
                className="hidden max-w-[90px] truncate text-xs font-bold sm:inline"
                style={{ color: 'var(--text-primary)' }}
              >
                {profile.full_name.split(' ')[0]}
              </span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="tap-target"
            style={{ color: 'var(--color-danger)' }}
            title="تسجيل الخروج"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
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
