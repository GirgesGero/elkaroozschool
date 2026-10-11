/**
 * Single source of truth for app navigation.
 *
 * WHY THIS EXISTS: the header and the bottom bar previously each hard-coded
 * their own link lists, so they drifted (7 links in the header, 4 in the bar)
 * and every addition meant editing two files. One array drives both surfaces.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Users,
  GraduationCap,
  BookOpen,
  Flame,
  Library,
  Music,
  Map,
  Award,
  CalendarCheck,
  Bell,
  Settings,
  Shield,
  ScrollText,
} from 'lucide-react';

/**
 * The five primary destinations. Icons only in the chrome -- the label lives in
 * `aria-label`/`title` so it is still announced to a screen reader and shown on
 * hover, without spending horizontal space on text at every breakpoint.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match nested routes too (`/bible/section/..` is still "bible"). */
  prefix?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'الحائط العام', icon: Home },
  { href: '/groups', label: 'الفرق', icon: Users },
  { href: '/curriculum', label: 'المحاضرات', icon: GraduationCap, prefix: true },
  { href: '/bible', label: 'الكتاب المقدس', icon: BookOpen, prefix: true },
  { href: '/marathon', label: 'الماراثون', icon: Flame, prefix: true },
];

/** Secondary destinations. Reachable from the side drawer, not the bar. */
export const SECONDARY_NAV: NavItem[] = [
  { href: '/books', label: 'المكتبة', icon: Library },
  { href: '/mp3', label: 'الصوتيات', icon: Music },
  { href: '/bible', label: 'الموسوعة والأطلس', icon: Map, prefix: true },
  { href: '/exams', label: 'الامتحانات', icon: Award },
  { href: '/attendance', label: 'الغياب والحضور', icon: CalendarCheck },
  { href: '/notifications', label: 'الإشعارات', icon: Bell },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
];

/** Admin-only destinations, shown at the foot of the drawer. */
export const ADMIN_NAV: NavItem[] = [
  { href: '/admin/backups', label: 'النسخ الاحتياطي', icon: Shield },
  { href: '/admin/audit', label: 'سجل التدقيق', icon: ScrollText },
];

/**
 * Is `item` the active destination for `pathname`?
 *
 * PRECISION REQUIRED: `/` must match only exactly. A naive `startsWith('/')`
 * makes the home button permanently active on every page in the app, which is
 * the classic bug in hand-rolled nav matching.
 */
export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/';
  if (!pathname) return false;
  return item.prefix
    ? pathname === item.href || pathname.startsWith(item.href + '/')
    : pathname === item.href;
}