'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ChevronLeft } from 'lucide-react';
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

  // Close on Escape, and move focus into the panel so keyboard users are not
  // stranded behind the overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

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
        className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all ${
          active
            ? 'bg-[#c29938]/15 border border-[#c29938]/40 text-[#c29938]'
            : 'border border-transparent text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
        }`}
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${
            active ? 'bg-[#c29938]/20 text-[#c29938]' : 'bg-slate-800/60 text-slate-400 group-hover:text-slate-200'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="flex-1 text-sm font-bold">{item.label}</span>
        {active && <ChevronLeft className="h-4 w-4 text-[#c29938]" />}
      </Link>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="قائمة التنقل"
    >
      <button
        aria-label="إغلاق القائمة"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        className="absolute inset-y-0 right-0 flex w-[82%] max-w-sm flex-col border-l border-[#c29938]/25 bg-[#070b14] shadow-2xl"
        style={{ animation: 'slide-in-right 220ms ease-out' }}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#c29938]" />
            <h2 className="text-sm font-black text-slate-100">كل أقسام المدرسة</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-full bg-slate-800 p-1.5 text-slate-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" dir="rtl">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            الأساسية
          </p>
          {PRIMARY_NAV.map(renderRow)}

          <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            المزيد
          </p>
          {SECONDARY_NAV.filter((s) => !PRIMARY_NAV.some((p) => p.href === s.href)).map(renderRow)}

          {canAdmin && (
            <>
              <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                إدارة النظام
              </p>
              {ADMIN_NAV.map(renderRow)}
            </>
          )}
        </nav>

        {onOpenProfile && (
          <div className="border-t border-slate-800 p-3">
            <button
              onClick={() => {
                onClose();
                onOpenProfile();
              }}
              className="w-full rounded-2xl bg-[#0e1626] px-3 py-2.5 text-sm font-bold text-slate-200 hover:border hover:border-[#c29938]/40"
            >
              حسابي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}