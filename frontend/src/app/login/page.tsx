'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppTheme } from '@/context/ThemeContext';
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
  Crown
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useAppTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
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
      const email = `${userToLogin.trim().toLowerCase()}@elkarooz-school.com`;

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: passToLogin,
      });

      if (authError) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      if (data.user) {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden selection:bg-[#7B0017] selection:text-white"
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
          <div className="flex items-center bg-[var(--bg-input)] rounded-full p-1 border border-[var(--border-card)]">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                theme === 'light' ? 'bg-[var(--bg-card)] shadow-sm text-[#7B0017]' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden md:inline">نهاري</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                theme === 'dark' ? 'bg-[var(--bg-card)] shadow-sm text-[#FA383E]' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">ليلي</span>
            </button>
            <button
              onClick={() => setTheme('luxury')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                theme === 'luxury' ? 'bg-[var(--bg-card)] shadow-sm text-[#D4AF37]' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span className="hidden md:inline">ملكي</span>
            </button>
          </div>

          <Link
            href="/bible"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-card)]"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="hidden sm:inline">الكتاب المقدس</span>
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
                <span className="text-[#7B0017] dark:text-[#9E1B32]">مدرسة الكاروز</span>
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

              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-2.5 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold opacity-80">
                    اسم المستخدم (Username)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      dir="ltr"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="app-input w-full rounded-xl px-4 py-3 pl-11 font-mono text-sm transition-all text-left"
                      required
                      disabled={loading}
                    />
                    <User className="w-4 h-4 opacity-50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold opacity-80">
                    كلمة المرور (Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="app-input w-full rounded-xl px-4 py-3 pl-20 font-mono text-sm transition-all text-left"
                      required
                      disabled={loading}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="opacity-60 hover:opacity-100 transition-opacity p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <Lock className="w-4 h-4 opacity-50" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="app-btn-primary w-full py-3.5 px-4 shadow-md flex items-center justify-center gap-2 text-base active:scale-[0.99] disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري تسجيل الدخول...</span>
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
                <BookOpen className="w-4 h-4 text-[#C5A059]" />
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
