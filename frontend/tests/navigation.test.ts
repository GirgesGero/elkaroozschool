import { describe, it, expect } from 'vitest';
import {
  PRIMARY_NAV,
  SECONDARY_NAV,
  ADMIN_NAV,
  isNavActive,
  type NavItem,
} from '@/lib/navigation';

/**
 * The nav was previously hard-coded twice (header and bottom bar) and the two
 * copies drifted. These tests pin the invariants the single source now owns, so
 * a future edit cannot quietly reintroduce the bugs they were built to prevent.
 */
describe('navigation', () => {
  it('exposes exactly five primary destinations', () => {
    expect(PRIMARY_NAV).toHaveLength(5);
    expect(PRIMARY_NAV.map((i) => i.href)).toEqual([
      '/',
      '/groups',
      '/curriculum',
      '/bible',
      '/marathon',
    ]);
  });

  it('every item carries an icon and an Arabic label', () => {
    const all = [...PRIMARY_NAV, ...SECONDARY_NAV, ...ADMIN_NAV];
    for (const item of all) {
      expect(item.icon, `${item.href} has no icon`).toBeTruthy();
      expect(item.label.trim().length, `${item.href} has no label`).toBeGreaterThan(0);
      // Labels are shown to the user in the drawer.
      expect(item.label, `${item.href} label must be Arabic`).toMatch(/[؀-ۿ]/);
    }
  });

  it('has no duplicate hrefs within a group', () => {
    for (const group of [PRIMARY_NAV, SECONDARY_NAV, ADMIN_NAV]) {
      const hrefs = group.map((i) => i.href);
      expect(new Set(hrefs).size, `duplicates in ${hrefs.join(',')}`).toBe(hrefs.length);
    }
  });

  it('settings lives in the secondary group, not the bar', () => {
    expect(SECONDARY_NAV.some((i) => i.href === '/settings')).toBe(true);
    expect(PRIMARY_NAV.some((i) => i.href === '/settings')).toBe(false);
  });

  describe('isNavActive', () => {
    const home: NavItem = { href: '/', label: 'الرئيسية', icon: PRIMARY_NAV[0].icon };
    const bible: NavItem = {
      href: '/bible',
      label: 'الكتاب المقدس',
      icon: PRIMARY_NAV[3].icon,
      prefix: true,
    };
    const books: NavItem = {
      href: '/books',
      label: 'المكتبة',
      icon: SECONDARY_NAV[0].icon,
    };

    it('matches home only on the exact root', () => {
      // The classic bug: a bare startsWith('/') marks home active on every page.
      expect(isNavActive(home, '/')).toBe(true);
      expect(isNavActive(home, '/groups')).toBe(false);
      expect(isNavActive(home, '/bible/section/bible')).toBe(false);
      expect(isNavActive(home, '/settings')).toBe(false);
    });

    it('prefix items match their nested routes', () => {
      expect(isNavActive(bible, '/bible')).toBe(true);
      expect(isNavActive(bible, '/bible/reader/1167')).toBe(true);
      expect(isNavActive(bible, '/bible/section/bible')).toBe(true);
    });

    it('prefix items do not match a sibling sharing a name', () => {
      // `/biblemanship` must not light up the bible tab.
      expect(isNavActive(bible, '/biblemanship')).toBe(false);
    });

    it('non-prefix items match only themselves', () => {
      expect(isNavActive(books, '/books')).toBe(true);
      expect(isNavActive(books, '/books/123')).toBe(false);
    });

    it('handles an empty pathname', () => {
      expect(isNavActive(home, '')).toBe(false);
      expect(isNavActive(bible, '')).toBe(false);
    });
  });
});