'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ChevronLeft } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  PRIMARY_NAV,
  SECONDARY_NAV,
  ADMIN_NAV,
  isNavActive,
  type NavItem,
} from '@/lib/navigation';

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  canAdmin: boolean;
  onOpenProfile?: () => void;
}

/**
 * Side drawer: the destination for everything that does not earn a spot in the
 * five-icon bar. Closed by default, opened by the "more" button.
 */
export default function NavDrawer({
  open,
  onClose,
  canAdmin,
  onOpenProfile,
}: NavDrawerProps) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(open, onClose, panelRef);

  // Manage body scroll: when NavDrawer is hidden on desktop (md:hidden),
  // NEVER lock body scroll (overflow = 'hidden') on desktop viewports.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const mql = window.matchMedia('(min-width: 768px)');
    const previousOverflow = document.body.style.overflow;

    const updateOverflow = () => {
      if (mql.matches) {
        document.body.style.overflow = previousOverflow;
      } else {
        document.body.style.overflow = 'hidden';
      }
    };

    updateOverflow();

    if (mql.addEventListener) {
      mql.addEventListener('change', updateOverflow);
    } else if (mql.addListener) {
      mql.addListener(updateOverflow);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', updateOverflow);
      } else if (mql.removeListener) {
        mql.removeListener(updateOverflow);
      }
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const renderRow = (item: NavItem) => {
    const active = isNavActive(item, pathname);
    const Icon = item.icon;
    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        onClick={onClose}
        aria-current={active ? 'page' : undefined}
        className="flex min-h-[48px] items-center gap-3 rounded-[12px] border px-3 py-2.5 transition-colors"
        style={{
          backgroundColor: active ? 'var(--bg-active-tab)' : 'transparent',
          borderColor: active ? 'var(--brand-primary)' : 'transparent',
          color: active ? 'var(--text-active-tab)' : 'var(--text-secondary)',
        }}
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-colors"
          style={{
            backgroundColor: active
              ? 'color-mix(in srgb, var(--brand-primary) 18%, transparent)'
              : 'var(--bg-card-hover)',
            color: active ? 'var(--brand-primary)' : 'var(--text-secondary)',
          }}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="flex-1 text-sm font-bold">{item.label}</span>
        {active && <ChevronLeft className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />}
      </Link>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p
      className="px-3 pb-1 pt-4 text-[11px] font-bold"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </p>
  );

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="قائمة التنقل"
    >
      {/* Scrim colour comes from the theme so it is strong enough to isolate
          the panel in the light theme too. */}
      <button
        aria-label="إغلاق القائمة"
        onClick={onClose}
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'var(--bg-scrim)' }}
      />

      <div
        ref={panelRef}
        className="absolute inset-y-0 right-0 flex w-[82%] max-w-sm flex-col border-l"
        style={{
          backgroundColor: 'var(--bg-nav)',
          borderColor: 'var(--border-card)',
          boxShadow: 'var(--shadow-overlay)',
          animation: 'slide-in-right 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-4"
          style={{ borderColor: 'var(--border-card)' }}
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
            <h2 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
              كل أقسام المدرسة
            </h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="إغلاق"
            className="tap-target rounded-full"
            style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" dir="rtl">
          <SectionLabel>الأساسية</SectionLabel>
          {PRIMARY_NAV.map(renderRow)}

          <SectionLabel>المزيد</SectionLabel>
          {SECONDARY_NAV.filter((s) => !PRIMARY_NAV.some((p) => p.href === s.href)).map(renderRow)}

          {canAdmin && (
            <>
              <SectionLabel>إدارة النظام</SectionLabel>
              {ADMIN_NAV.map(renderRow)}
            </>
          )}
        </nav>

        {onOpenProfile && (
          <div className="p-3" style={{ borderTop: '1px solid var(--border-card)' }}>
            <button
              onClick={() => {
                onClose();
                onOpenProfile();
              }}
              className="app-btn w-full"
              style={{
                backgroundColor: 'var(--bg-card-hover)',
                color: 'var(--text-primary)',
              }}
            >
              حسابي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}