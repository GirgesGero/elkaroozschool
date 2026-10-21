'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppTheme } from '@/context/ThemeContext';
import {
  getLockoutState,
  recordFailedAttempt,
  clearLockout,
  MAX_FAILED_ATTEMPTS,
  type LockoutState,
} from '@/lib/auth/login-lockout';
import {
  Lock,
  User,
  AlertCircle,
  Loader2,
  BookOpen,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Crown,
  Clock,
  ShieldAlert,
} from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo');
  const redirectTo =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/';
  const { theme, setTheme } = useAppTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockout, setLockout] = useState<LockoutState>({
    failedAttempts: 0,
    isLocked: false,
    remainingSeconds: 0,
    remainingAttempts: MAX_FAILED_ATTEMPTS,
    lockedUntil: null,
  });

  // Track and tick cooldown countdown timer
  useEffect(() => {
    const syncState = () => {
      const current = getLockoutState();
      setLockout(current);
    };

    syncState();
    const interval = setInterval(syncState, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();

    // Prevent attempt if temporarily locked out
    const currentLock = getLockoutState();
    if (currentLock.isLocked) {
      setError(`تم قفل تسجيل الدخول مؤقتاً لتكرار المحاولات الخاطئة. يرجى الانتظار ${currentLock.remainingSeconds} ثانية.`);
      return;
    }

    const userToLogin = customUser || username;
    const passToLogin = customPass || password;

    if (!userToLogin.trim() || !passToLogin) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const identifier = userToLogin.trim();

      // Accept either a username or a real email address.
      let email = identifier.toLowerCase();
      if (!identifier.includes('@')) {
        const { data: resolved, error: lookupError } = await supabase.rpc(
          'username_to_email',
          { p_identifier: identifier }
        );

        if (lookupError || !resolved) {
          const { state: newState } = recordFailedAttempt(identifier);
          setLockout(newState);
          if (newState.isLocked) {
            setError(`تم استنفاد عدد محاولات الدخول (${MAX_FAILED_ATTEMPTS} محاولات). تم قفل تسجيل الدخول مؤقتاً لمدة ${newState.remainingSeconds} ثانية.`);
          } else if (newState.remainingAttempts <= 2) {
            setError(`اسم المستخدم أو كلمة المرور غير صحيحة. متبقي ${newState.remainingAttempts} محاولات قبل قفل الدخول مؤقتاً.`);
          } else {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة');
          }
          setLoading(false);
          return;
        }
        email = String(resolved).toLowerCase();
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: passToLogin,
      });

      if (authError) {
        const { state: newState } = recordFailedAttempt(identifier);
        setLockout(newState);
        if (newState.isLocked) {
          setError(`تم استنفاد عدد محاولات الدخول (${MAX_FAILED_ATTEMPTS} محاولات). تم قفل تسجيل الدخول مؤقتاً لمدة ${newState.remainingSeconds} ثانية.`);
        } else if (newState.remainingAttempts <= 2) {
          setError(`اسم المستخدم أو كلمة المرور غير صحيحة. متبقي ${newState.remainingAttempts} محاولات قبل قفل الدخول مؤقتاً.`);
        } else {
          setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        }
        setLoading(false);
        return;
      }

      // Successful login -> clear lockout records
      clearLockout();
      setLockout(getLockoutState());

      if (data.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden selection:bg-brand selection:text-content"
         style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
      
      {/* Background Ambient Logo Watermark */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden">
        <div className="relative w-[750px] h-[750px] opacity-[var(--watermark-opacity)]">
          <Image
            src="/logo.png"
            alt="Watermark Logo"
            fill
            sizes="750px"
            priority
            className="object-contain filter grayscale"
          />
        </div>
      </div>

      {/* Top Navbar (Facebook Style Minimal Header) */}
      <header className="relative z-10 w-full border-b backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between"
              style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border-card)' }}>
        
        {/* Right side in RTL: Brand details */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border shadow-sm flex-shrink-0"
               style={{ borderColor: 'var(--border-card)' }}>
            <Image
              src="/logo.png"
              alt="شعار مدرسة الكاروز"
              fill
              sizes="40px"
              priority
              className="object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-tight">مدرسة الكاروز للكتاب المقدس</span>
            <span className="text-xs opacity-75 font-medium hidden sm:inline">
              مطرانية شبرا الخيمة وتوابعها • كنيسة مارمرقس المنشية
            </span>
          </div>
        </div>

        {/* Left side in RTL: Navigation + Theme Switcher */}
        <div className="flex items-center gap-3">
          {/* One brand accent for every pill. These were #7B0017 (crimson),
              #FA383E (red) and #D4AF37 (gold) — three different colours for
              one control group, so the row read as three unrelated buttons. */}
          <div className="flex items-center gap-1 rounded-full p-1 bg-[var(--bg-input)] border border-[var(--border-card)]">
            <button
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
              aria-label="المظهر النهاري"
              className="flex min-h-[44px] items-center gap-1.5 px-4 rounded-full text-xs font-bold transition-colors"
              style={{
                backgroundColor: theme === 'light' ? 'var(--brand-primary)' : 'transparent',
                color: theme === 'light' ? 'var(--brand-primary-text)' : 'var(--text-secondary)',
              }}
            >
              <Sun className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">نهاري</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
              aria-label="المظهر الليلي"
              className="flex min-h-[44px] items-center gap-1.5 px-4 rounded-full text-xs font-bold transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? 'var(--brand-primary)' : 'transparent',
                color: theme === 'dark' ? 'var(--brand-primary-text)' : 'var(--text-secondary)',
              }}
            >
              <Moon className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">ليلي</span>
            </button>
            <button
              onClick={() => setTheme('luxury')}
              aria-pressed={theme === 'luxury'}
              aria-label="المظهر الملكي القبطي"
              className="flex min-h-[44px] items-center gap-1.5 px-4 rounded-full text-xs font-bold transition-colors"
              style={{
                backgroundColor: theme === 'luxury' ? 'var(--brand-primary)' : 'transparent',
                color: theme === 'luxury' ? 'var(--brand-primary-text)' : 'var(--text-secondary)',
              }}
            >
              <Crown className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">ملكي</span>
            </button>
          </div>

          <Link
            href="/bible"
            className="flex min-h-[44px] items-center gap-1.5 px-4 rounded-full text-xs font-bold transition-colors bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-card)]"
          >
            <BookOpen className="w-4 h-4 text-[var(--brand-gold)]" aria-hidden="true" />
            <span className="hidden sm:inline">تصفح الكتاب المقدس</span>
          </Link>
        </div>
      </header>

      {/* Main Facebook-Style 2-Column Container */}
      <main className="relative z-10 max-w-6xl w-full mx-auto my-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Right Side in RTL: Hero & Recent One-Click Accounts (col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-right order-2 lg:order-1">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                مرحباً بك في <br />
                <span className="text-brand dark:text-brand">مدرسة الكاروز</span>
              </h1>
              <p className="text-base sm:text-lg opacity-80 leading-relaxed max-w-xl">
                المنظومة الرقمية الشاملة لدراسة أسفار وتفاسير الكتاب المقدس ومتابعة الأنشطة الأكاديمية والخدمية.
              </p>
            </div>
          </div>

          {/* Left Side in RTL: Login Form Card (col-span-5) */}
          <div className="lg:col-span-5 order-1 lg:order-2">
            <div className="app-card-elevated p-6 sm:p-8 space-y-6">
              
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">تسجيل الدخول</h2>
                <p className="text-xs opacity-75">أدخل بيانات حسابك للمتابعة إلى المنظومة</p>
              </div>

              {lockout.isLocked ? (
                <div role="alert" aria-live="assertive" className="p-4 bg-danger/10 border border-danger/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-start gap-3 text-sm animate-pulse">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-danger" />
                  <div className="space-y-1">
                    <p className="font-bold">الحساب مقفل مؤقتاً لحماية أمانك</p>
                    <p className="text-xs leading-relaxed opacity-90">
                      تم استنفاد الحد الأقصى للمحاولات ({MAX_FAILED_ATTEMPTS} محاولات). يرجى الانتظار{' '}
                      <span className="font-mono font-bold text-sm bg-danger/20 text-danger px-2 py-0.5 rounded-md inline-block">
                        {lockout.remainingSeconds}s
                      </span>{' '}
                      ثانية قبل المحاولة مجدداً.
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div role="alert" aria-live="assertive" className="p-3.5 bg-danger/10 border border-danger/20 text-rose-600 dark:text-danger rounded-xl flex items-center gap-2.5 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="login-username" className="block text-xs font-bold opacity-80">
                    اسم المستخدم أو البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <input
                      id="login-username"
                      type="text"
                      dir="ltr"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="app-input w-full rounded-xl px-4 py-3 pl-11 font-mono text-sm transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                      disabled={loading || lockout.isLocked}
                    />
                    <User className="w-4 h-4 opacity-50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="block text-xs font-bold opacity-80">
                    كلمة المرور (Password)
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="app-input w-full rounded-xl px-4 py-3 pl-20 font-mono text-sm transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                      disabled={loading || lockout.isLocked}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        /* Was tabIndex={-1} — a keyboard user could not reach the
                           toggle at all. The field is a real focusable control and
                           must be labelled, not decorative. */
                        aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        aria-pressed={showPassword}
                        className="tap-target opacity-70 hover:opacity-100 transition-opacity rounded-lg disabled:opacity-40"
                        disabled={loading || lockout.isLocked}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                      <Lock className="w-4 h-4 opacity-50" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || lockout.isLocked}
                  className="app-btn-primary w-full py-3.5 px-4 shadow-md flex items-center justify-center gap-2 text-base active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري تسجيل الدخول...</span>
                    </>
                  ) : lockout.isLocked ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin text-gold" />
                      <span>مقفل مؤقتاً ({lockout.remainingSeconds} ثانية)</span>
                    </>
                  ) : (
                    <span>تسجيل الدخول إلى الحساب</span>
                  )}
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t" style={{ borderColor: 'var(--border-card)' }} />
                <span className="flex-shrink mx-4 text-xs opacity-50">أو</span>
                <div className="flex-grow border-t" style={{ borderColor: 'var(--border-card)' }} />
              </div>

              <Link
                href="/bible"
                className="app-btn-secondary w-full py-3 px-4 flex items-center justify-center gap-2 text-sm text-center block"
              >
                <BookOpen className="w-4 h-4 text-gold" />
                <span>تصفح الكتاب المقدس والتفاسير (عام)</span>
              </Link>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t py-4 text-center text-xs opacity-60"
              style={{ borderColor: 'var(--border-card)' }}>
        جميع الحقوق محفوظة © {new Date().getFullYear()} مدرسة الكاروز للكتاب المقدس • كنيسة مارمرقس المنشية
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-canvas)' }}
        >
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
