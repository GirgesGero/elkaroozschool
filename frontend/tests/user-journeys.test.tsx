import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TraineeCard from '@/components/TraineeCard';
import { ThemeProvider, useAppTheme, AppTheme, AppAccent } from '@/context/ThemeContext';
import SmartBottomNav from '@/components/SmartBottomNav';
import NavDrawer from '@/components/NavDrawer';
import FeedPostCard from '@/components/FeedPostCard';
import GroupSelector from '@/components/GroupSelector';
import type { Profile, UserRole } from '@/types/database';

// Mock next/navigation
let mockPathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next/link
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

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => React.createElement('img', props),
}));

// Mock localStorage in JSDOM environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Helper mock profile generator
function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-uuid-1',
    username: 'mina_adel',
    full_name: 'مينا عادل لبيب',
    avatar_url: null,
    birth_date: '2005-04-12',
    phone: '01234567890',
    address: 'شبرا، القاهرة',
    church: 'كنيسة السيدة العذراء والأنبا بيشوي',
    confession_father: 'القمص بيشوي بطرس',
    role_id: 'trainee',
    group_id: 1,
    is_active: true,
    deleted_at: null,
    deleted_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('User Journey & Scenario 1: TraineeCard Interactivity and Accessibility', () => {
  it('renders all student details, academic group, and pastoral info accurately', () => {
    const trainee = createMockProfile();
    const handleClick = vi.fn();

    render(<TraineeCard trainee={trainee} onClick={handleClick} />);

    expect(screen.getByText('مينا عادل لبيب')).toBeInTheDocument();
    expect(screen.getByText('@mina_adel')).toBeInTheDocument();
    expect(screen.getByText('الفرقة الأولى')).toBeInTheDocument();
    expect(screen.getByText('القمص بيشوي بطرس')).toBeInTheDocument();
    expect(screen.getByText('01234567890')).toBeInTheDocument();
    expect(screen.getByText('نشط')).toBeInTheDocument();
  });

  it('triggers onClick with trainee id when clicking anywhere on the card', () => {
    const trainee = createMockProfile();
    const handleClick = vi.fn();

    render(<TraineeCard trainee={trainee} onClick={handleClick} />);
    const card = screen.getByRole('button', { name: /السجل الأكاديمي/i });
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith('user-uuid-1');
  });

  it('supports keyboard navigation via Enter and Space keys', () => {
    const trainee = createMockProfile();
    const handleClick = vi.fn();

    render(<TraineeCard trainee={trainee} onClick={handleClick} />);
    const card = screen.getByRole('button', { name: /السجل الأكاديمي/i });

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith('user-uuid-1');

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('handles phone click without triggering the card navigation onClick', () => {
    const trainee = createMockProfile();
    const handleClick = vi.fn();

    render(<TraineeCard trainee={trainee} onClick={handleClick} />);
    const phoneLink = screen.getByText('01234567890');

    expect(phoneLink).toHaveAttribute('href', 'tel:01234567890');
    fireEvent.click(phoneLink);

    // Click on phone link must stop propagation and NOT open the drawer
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('allows quick suspension toggle without triggering the card navigation onClick', () => {
    const trainee = createMockProfile({ is_active: true });
    const handleClick = vi.fn();
    const handleToggleStatus = vi.fn();

    render(
      <TraineeCard
        trainee={trainee}
        onClick={handleClick}
        onToggleStatus={handleToggleStatus}
      />
    );

    const toggleBtn = screen.getByTitle('إيقاف الحساب مؤقتاً');
    fireEvent.click(toggleBtn);

    expect(handleToggleStatus).toHaveBeenCalledTimes(1);
    expect(handleToggleStatus).toHaveBeenCalledWith(trainee, expect.any(Object));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders suspended student state with red accent, warning badge, and activation button', () => {
    const trainee = createMockProfile({ is_active: false, confession_father: null });
    const handleClick = vi.fn();
    const handleToggleStatus = vi.fn();

    render(
      <TraineeCard
        trainee={trainee}
        onClick={handleClick}
        onToggleStatus={handleToggleStatus}
      />
    );

    expect(screen.getByText('موقوف')).toBeInTheDocument();
    expect(screen.getByTitle('تفعيل الحساب')).toBeInTheDocument();
    expect(screen.getByText('غير محدد')).toBeInTheDocument();
  });
});

describe('User Journey & Scenario 2: Liturgical Theme & Multi-Color Accent System', () => {
  function ThemeTestComponent() {
    const { theme, accent, setTheme, setAccent } = useAppTheme();
    const [clickCount, setClickCount] = useState(0);

    return (
      <div>
        <div data-testid="current-theme">{theme}</div>
        <div data-testid="current-accent">{accent}</div>

        <button onClick={() => setTheme('light')}>تفعيل الوضع النهاري</button>
        <button onClick={() => setTheme('dark')}>تفعيل الوضع الليلي</button>
        <button onClick={() => setTheme('luxury')}>تفعيل الوضع الملكي</button>

        <button onClick={() => setAccent('gold')}>ذهب</button>
        <button onClick={() => setAccent('burgundy')}>عنابي</button>
        <button onClick={() => setAccent('navy')}>نيلي</button>
        <button onClick={() => setAccent('emerald')}>زمرد</button>
        <button onClick={() => setAccent('amethyst')}>بنفسجي</button>

        <button
          className="app-btn app-btn-primary"
          onClick={() => setClickCount((c) => c + 1)}
          data-testid="physics-test-btn"
        >
          نقرات: {clickCount}
        </button>
      </div>
    );
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('switches between Light, Dark, and Luxury modes and updates document classes', () => {
    render(
      <ThemeProvider>
        <ThemeTestComponent />
      </ThemeProvider>
    );

    // Switch to Light
    fireEvent.click(screen.getByText('تفعيل الوضع النهاري'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false);

    // Switch to Dark
    fireEvent.click(screen.getByText('تفعيل الوضع الليلي'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);

    // Switch to Luxury
    fireEvent.click(screen.getByText('تفعيل الوضع الملكي'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('luxury');
    expect(document.documentElement.classList.contains('theme-luxury')).toBe(true);
  });

  it('switches between all five liturgical accents and verifies document classes', () => {
    render(
      <ThemeProvider>
        <ThemeTestComponent />
      </ThemeProvider>
    );

    const accents: { label: string; key: AppAccent; className: string }[] = [
      { label: 'عنابي', key: 'burgundy', className: 'accent-burgundy' },
      { label: 'نيلي', key: 'navy', className: 'accent-navy' },
      { label: 'زمرد', key: 'emerald', className: 'accent-emerald' },
      { label: 'بنفسجي', key: 'amethyst', className: 'accent-amethyst' },
      { label: 'ذهب', key: 'gold', className: 'accent-gold' },
    ];

    for (const item of accents) {
      fireEvent.click(screen.getByText(item.label));
      expect(screen.getByTestId('current-accent')).toHaveTextContent(item.key);
      expect(document.documentElement.classList.contains(item.className)).toBe(true);
    }
  });

  it('exercises interactive tactile button clicks and state transitions', () => {
    render(
      <ThemeProvider>
        <ThemeTestComponent />
      </ThemeProvider>
    );

    const btn = screen.getByTestId('physics-test-btn');
    expect(btn).toHaveTextContent('نقرات: 0');

    fireEvent.click(btn);
    expect(btn).toHaveTextContent('نقرات: 1');

    fireEvent.click(btn);
    expect(btn).toHaveTextContent('نقرات: 2');
  });
});

describe('User Journey & Scenario 3: Smart Navigation & Role-Gated Drawer', () => {
  it('opens navigation drawer when clicking "كل الأقسام" and displays menu items', () => {
    const profile = createMockProfile({ role_id: 'servant' });
    const onOpenProfile = vi.fn();

    render(
      <SmartBottomNav
        profile={profile}
        onOpenProfile={onOpenProfile}
        unreadNotificationsCount={5}
      />
    );

    // Click "كل الأقسام" button
    const moreBtn = screen.getByRole('button', { name: /كل الأقسام/i });
    fireEvent.click(moreBtn);

    // Drawer should open and display secondary app sections
    expect(screen.getByText('كل أقسام المدرسة')).toBeInTheDocument();
    expect(screen.getByText('الكتاب المقدس')).toBeInTheDocument();
    expect(screen.getByText('المكتبة')).toBeInTheDocument();
    expect(screen.getByText('الصوتيات')).toBeInTheDocument();
  });

  it('shows administration tools only to admin and super_user roles', () => {
    const onClose = vi.fn();

    // Render with canAdmin = true
    const { rerender } = render(
      <NavDrawer open={true} onClose={onClose} canAdmin={true} />
    );

    expect(screen.getByText('إدارة النظام')).toBeInTheDocument();
    expect(screen.getByText('النسخ الاحتياطي')).toBeInTheDocument();
    expect(screen.getByText('سجل التدقيق')).toBeInTheDocument();

    // Rerender with canAdmin = false
    rerender(<NavDrawer open={true} onClose={onClose} canAdmin={false} />);

    expect(screen.queryByText('إدارة النظام')).not.toBeInTheDocument();
    expect(screen.queryByText('النسخ الاحتياطي')).not.toBeInTheDocument();
    expect(screen.queryByText('سجل التدقيق')).not.toBeInTheDocument();
  });
});

describe('User Journey & Scenario 4: Group Hub & Group Filtering Selector', () => {
  it('renders active group name and lets user pick between groups', () => {
    const onSelect = vi.fn();

    render(
      <GroupSelector
        selectedGroupId={1}
        onSelectGroup={onSelect}
        showAllOption={true}
      />
    );

    // Initial button shows active group 1
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('الفرقة الأولى');

    // Click to open dropdown
    fireEvent.click(trigger);

    // Verify all groups and 'جميع الفرق' appear
    expect(screen.getByText('جميع الفرق (نظرة شاملة)')).toBeInTheDocument();
    expect(screen.getByText('الفرقة الثانية')).toBeInTheDocument();
    expect(screen.getByText('الفرقة الثالثة')).toBeInTheDocument();

    // Select Group 2
    fireEvent.click(screen.getByText('الفرقة الثانية'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});

describe('User Journey & Scenario 5: Feed Post Card & Author Identity', () => {
  it('correctly badges the author role including super_user and admin', () => {
    const authorSuper = createMockProfile({
      id: 'super-1',
      full_name: 'أستاذ سامي عزيز',
      role_id: 'super_user',
    });

    const mockPost = {
      id: 'post-1',
      author_id: authorSuper.id,
      content: 'نحيطكم علماً بأن مسابقة سفر الرؤيا ستبدأ يوم الجمعة القادم.',
      post_type: 'ANNOUNCEMENT',
      group_id: 1,
      images: [],
      created_at: '2026-10-10T12:00:00Z',
      author: authorSuper,
      post_comments: [],
    };

    const handleOpenProfile = vi.fn();

    render(
      <FeedPostCard
        post={mockPost}
        currentUser={createMockProfile()}
        onOpenProfile={handleOpenProfile}
      />
    );

    expect(screen.getByText('أستاذ سامي عزيز')).toBeInTheDocument();
    expect(screen.getByText('مشرف عام')).toBeInTheDocument();
    expect(screen.getByText('الفرقة الأولى')).toBeInTheDocument();
    expect(screen.getByText('نحيطكم علماً بأن مسابقة سفر الرؤيا ستبدأ يوم الجمعة القادم.')).toBeInTheDocument();

    // Clicking author opens author profile
    fireEvent.click(screen.getByText('أستاذ سامي عزيز'));
    expect(handleOpenProfile).toHaveBeenCalledWith('super-1', 'super_user');
  });
});
