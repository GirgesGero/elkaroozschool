import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SmartBottomNav from '@/components/SmartBottomNav';
import NavDrawer from '@/components/NavDrawer';
import type { Profile } from '@/types/database';

// next/navigation has no router outside the Next runtime; the components only
// read the current path from it. There is deliberately no MemoryRouter wrapper
// here -- react-router-dom is not a dependency of this Next.js app, and
// next/link does not need a router provider in a component test.
let mockPathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// Outside the Next runtime, `next/link` resolves to a module object rather than
// a renderable component, and React rejects it as a child. The components under
// test only need an anchor that forwards href/aria-label/children, so swap in a
// plain anchor. This is a test-environment shim, not a production change.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement('a', { href, ...rest }, children),
}));

const profile = {
  id: 'p1',
  full_name: 'جرجس',
  role_id: 'servant',
} as unknown as Profile;

function renderNav(roleId = 'servant') {
  const p = { ...profile, role_id: roleId } as unknown as Profile;
  return render(
    <SmartBottomNav
      profile={p}
      onOpenProfile={() => {}}
      unreadNotificationsCount={3}
    />
  );
}

describe('SmartBottomNav', () => {
  beforeEach(() => {
    mockPathname = '/';
  });

  it('renders five icon-only slots with no visible text', () => {
    const { container } = renderNav();
    const nav = container.querySelector('nav[aria-label="التنقل الرئيسي"]');

    const labelled = [...nav!.querySelectorAll('a,button')].filter((el) =>
      el.getAttribute('aria-label')
    );

    // Three destinations plus the profile and drawer triggers.
    expect(labelled).toHaveLength(5);

    // Icon-only: no label is painted, but every control still names itself.
    for (const el of labelled) {
      expect(el.textContent?.trim(), 'a label leaked into the pixels').toBe('');
      expect(el.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('exposes three in-bar destinations plus the two overflow triggers', () => {
    const { container } = renderNav();
    const nav = container.querySelector('nav[aria-label="التنقل الرئيسي"]');

    // Three destinations sit in the bar itself (two wings + the centre orb);
    // the remaining two primary routes live behind the drawer, which is the
    // point of a five-slot bar rather than five links.
    const links = [...nav!.querySelectorAll('a')].map((a) => a.getAttribute('aria-label'));
    expect(links).toEqual(['الفرق', 'المحاضرات', 'الحائط العام']);

    const buttons = [...nav!.querySelectorAll('button')].map((b) =>
      b.getAttribute('aria-label')
    );
    expect(buttons).toEqual(['حسابي', 'كل الأقسام']);

    // Five icon slots in total, which is what "5 buttons" means here.
    expect(links.length + buttons.length).toBe(5);
  });

  it('keeps the remaining primary routes reachable from the drawer', () => {
    renderNav();
    fireEvent.click(screen.getByLabelText('كل الأقسام'));
    const dialog = screen.getByRole('dialog', { name: 'قائمة التنقل' });
    expect(within(dialog).getByText('الكتاب المقدس')).toBeTruthy();
    expect(within(dialog).getByText('الماراثون')).toBeTruthy();
  });

  it('offers the drawer trigger labelled for all sections', () => {
    renderNav();
    expect(screen.getByLabelText('كل الأقسام')).toBeTruthy();
    expect(screen.getByLabelText('حسابي')).toBeTruthy();
  });

  it('marks the active destination with aria-current, not colour alone', () => {
    mockPathname = '/groups';
    const { container } = renderNav();
    const nav = container.querySelector('nav[aria-label="التنقل الرئيسي"]');
    const current = nav!.querySelector('[aria-current="page"]');

    expect(current).toBeTruthy();
    expect(current!.getAttribute('aria-label')).toBe('الفرق');
  });

  it('marks home active only on the exact root', () => {
    mockPathname = '/';
    const { container } = renderNav();
    const nav = container.querySelector('nav[aria-label="التنقل الرئيسي"]');
    const current = nav!.querySelector('[aria-current="page"]');
    expect(current!.getAttribute('aria-label')).toBe('الحائط العام');

    mockPathname = '/bible/reader/1';
    const second = render(
      <SmartBottomNav profile={profile} onOpenProfile={() => {}} />
    );
    const nav2 = second.container.querySelector('nav[aria-label="التنقل الرئيسي"]');
    expect(nav2!.querySelector('[aria-current="page"]')).toBeNull();
  });

  it('opens the drawer from the bar', () => {
    renderNav();
    fireEvent.click(screen.getByLabelText('كل الأقسام'));
    expect(screen.getByRole('dialog', { name: 'قائمة التنقل' })).toBeTruthy();
  });
});

describe('NavDrawer', () => {
  beforeEach(() => {
    mockPathname = '/';
  });

  const noop = () => {};

  it('is not in the DOM when closed', () => {
    render(<NavDrawer open={false} onClose={noop} canAdmin={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lists settings as a destination', () => {
    render(<NavDrawer open onClose={noop} canAdmin={false} />);
    expect(screen.getByText('الإعدادات')).toBeTruthy();
  });

  it('hides admin links from a non-admin', () => {
    render(<NavDrawer open onClose={noop} canAdmin={false} />);
    expect(screen.queryByText('النسخ الاحتياطي')).toBeNull();
  });

  it('shows admin links to an admin', () => {
    render(<NavDrawer open onClose={noop} canAdmin />);
    expect(screen.getByText('النسخ الاحتياطي')).toBeTruthy();
    expect(screen.getByText('سجل التدقيق')).toBeTruthy();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<NavDrawer open onClose={onClose} canAdmin={false} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('never locks body overflow to hidden on desktop viewports', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('768px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    document.body.style.overflow = 'auto';
    const { unmount } = render(<NavDrawer open onClose={noop} canAdmin={false} />);
    expect(document.body.style.overflow).not.toBe('hidden');
    unmount();
    window.matchMedia = originalMatchMedia;
  });

  it('locks body overflow to hidden on mobile viewports', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    document.body.style.overflow = 'auto';
    const { unmount } = render(<NavDrawer open onClose={noop} canAdmin={false} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
    window.matchMedia = originalMatchMedia;
  });
});