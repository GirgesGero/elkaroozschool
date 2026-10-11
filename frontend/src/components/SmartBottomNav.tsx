'use client';

import { useState } from 'react';
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
    profile?.role_id === 'admin' || profile?.role_id === 'super_user';

  // Slots are explicit so the bar stays stable no matter how PRIMARY_NAV is
  // edited: [groups, curriculum] | [home] | [profile, drawer].
  const home = PRIMARY_NAV[0];
  // A capitalised alias: `<home.icon>` is parsed as JSX, not as a member lookup.
  const HomeIcon = home.icon;
  const rightWing = PRIMARY_NAV.slice(1, 3);
  const drawerActive = PRIMARY_NAV.slice(3).some((i) => isNavActive(i, pathname));

  const iconBtn =
    'flex h-full w-full items-center justify-center transition-colors';

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
              backgroundColor: 'rgba(7, 11, 20, 0.94)',
              borderColor: 'rgba(194, 153, 56, 0.28)',
              boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.6)',
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
                    className={`${iconBtn} ${active ? 'text-[#c29938]' : 'text-slate-400'}`}
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                        active ? 'bg-[#c29938]/15' : ''
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? 'stroke-[2.4]' : ''}`} />
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Centre: home orb */}
            <Link
              href={home.href}
              aria-label={home.label}
              title={home.label}
              aria-current={pathname === '/' ? 'page' : undefined}
              className="-mt-5 grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#c29938]/70 bg-gradient-to-tr from-[#101b33] to-[#070b14] shadow-lg"
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-[#0f1a30]">
                <HomeIcon className="h-6 w-6 text-[#c29938]" />
              </span>
            </Link>

            {/* Left: profile, drawer */}
            <div className="flex h-full flex-1 items-center">
              <button
                onClick={() => profile && onOpenProfile(profile.id, profile.role_id)}
                aria-label="حسابي"
                title="حسابي"
                className={`${iconBtn} text-slate-400 hover:text-slate-200`}
              >
                <span className="relative grid h-9 w-9 place-items-center rounded-xl">
                  <User className="h-5 w-5" />
                  {unreadNotificationsCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500"
                    />
                  )}
                </span>
              </button>

              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="كل الأقسام"
                title="كل الأقسام"
                aria-expanded={drawerOpen}
                className={`${iconBtn} ${
                  drawerActive || drawerOpen
                    ? 'text-[#c29938]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                    drawerActive || drawerOpen ? 'bg-[#c29938]/15' : ''
                  }`}
                >
                  <LayoutGrid className="h-5 w-5" />
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
