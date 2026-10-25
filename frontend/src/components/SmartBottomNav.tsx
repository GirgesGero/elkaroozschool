'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, User } from 'lucide-react';
import { PRIMARY_NAV, isNavActive } from '@/lib/navigation';
import { useScrollChrome } from '@/hooks/useScrollChrome';
import NavDrawer from '@/components/NavDrawer';
import type { Profile } from '@/types/database';

interface SmartBottomNavProps {
  profile: Profile | null;
  unreadNotificationsCount?: number;
  onOpenProfile: (id: string, role: string) => void;
}

/**
 * Mobile bar: five icon-only slots, shaped like a professional app -- two
 * destinations, a raised home orb, then profile and the drawer trigger.
 *
 * The label is gone from the pixels but kept in `aria-label`/`title`, so nothing
 * is lost for a screen-reader or long-press user.
 */
export default function SmartBottomNav({
  profile,
  unreadNotificationsCount = 0,
  onOpenProfile,
}: SmartBottomNavProps) {
  const pathname = usePathname();
  const isVisible = useScrollChrome();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdminOrSuper =
    profile?.role_id === 'admin';

  // Slots are explicit so the bar stays stable no matter how PRIMARY_NAV is
  // edited: [groups, curriculum] | [home] | [profile, drawer].
  const home = PRIMARY_NAV[0];
  // A capitalised alias: `<home.icon>` is parsed as JSX, not as a member lookup.
  const HomeIcon = home.icon;
  const rightWing = PRIMARY_NAV.slice(1, 3);
  const drawerActive = PRIMARY_NAV.slice(3).some((i) => isNavActive(i, pathname));

  // The glass colour must come from the theme. The previous hardcoded
  // rgba(7,11,20,.94) navy, so in the light theme the bar was a dark slab with
  // slate-400 icons on it.
  const barBg = `color-mix(in srgb, var(--bg-nav) 92%, transparent)`;

  const iconBtn = 'flex h-full w-full items-center justify-center transition-colors';

  /**
   * Reserve scroll space under the bar so the last item of any list is not
   * hidden behind it. Done here, on <body>, instead of in 21 page files: the
   * bar is fixed, so the clearance belongs to the bar's lifecycle — it appears
   * only on mobile, where it actually renders, and is removed on desktop.
   */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => {
      document.body.classList.toggle('has-bottom-nav', !mq.matches);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => {
      mq.removeEventListener('change', sync);
      document.body.classList.remove('has-bottom-nav');
    };
  }, []);

  return (
    <>
      <nav
        aria-label="التنقل الرئيسي"
        className={`fixed inset-x-0 bottom-0 z-40 pb-safe transition-all duration-300 md:hidden ${
          isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
        }`}
        dir="rtl"
      >
        <div className="mx-auto max-w-md px-3 pb-2">
          <div
            className="relative flex h-16 items-center justify-between rounded-3xl border px-2 backdrop-blur-2xl"
            style={{
              backgroundColor: barBg,
              borderColor: `color-mix(in srgb, var(--brand-gold) 30%, transparent)`,
              boxShadow: 'var(--shadow-overlay)',
            }}
          >
            {/* Right: two destinations */}
            <div className="flex h-full flex-1 items-center">
              {rightWing.map((item) => {
                const active = isNavActive(item, pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    title={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={iconBtn}
                    style={{ color: active ? 'var(--text-active-tab)' : 'var(--text-secondary)' }}
                  >
                    <span
                      className="grid h-10 w-10 place-items-center rounded-xl transition-colors"
                      style={{ backgroundColor: active ? 'var(--bg-active-tab)' : 'transparent' }}
                    >
                      <Icon
                        className={`h-5 w-5 ${active ? 'stroke-[2.4]' : ''}`}
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Centre: home orb — the one circle in the bar */}
            <Link
              href={home.href}
              aria-label={home.label}
              title={home.label}
              aria-current={pathname === '/' ? 'page' : undefined}
              className="-mt-5 grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 shadow-lg transition-colors"
              style={{
                borderColor: 'var(--brand-gold)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <span className="grid h-full w-full place-items-center rounded-full" style={{ backgroundColor: 'var(--bg-card-hover)' }}>
                <HomeIcon className="h-6 w-6" style={{ color: 'var(--brand-gold)' }} aria-hidden="true" />
              </span>
            </Link>

            {/* Left: profile, drawer */}
            <div className="flex h-full flex-1 items-center">
              <button
                onClick={() => profile && onOpenProfile(profile.id, profile.role_id)}
                aria-label="حسابي"
                title="حسابي"
                className={iconBtn}
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="relative grid h-10 w-10 place-items-center rounded-xl">
                  <User className="h-5 w-5" aria-hidden="true" />
                  {unreadNotificationsCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-1 -top-1 h-2 w-2 rounded-full"
                      style={{ backgroundColor: 'var(--color-danger)' }}
                    />
                  )}
                </span>
              </button>

              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="كل الأقسام"
                title="كل الأقسام"
                aria-expanded={drawerOpen}
                className={iconBtn}
                style={{
                  color: drawerActive || drawerOpen ? 'var(--text-active-tab)' : 'var(--text-secondary)',
                }}
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl transition-colors"
                  style={{
                    backgroundColor: drawerActive || drawerOpen ? 'var(--bg-active-tab)' : 'transparent',
                  }}
                >
                  <LayoutGrid className="h-5 w-5" aria-hidden="true" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        canAdmin={!!isAdminOrSuper}
        onOpenProfile={() => profile && onOpenProfile(profile.id, profile.role_id)}
      />
    </>
  );
}
