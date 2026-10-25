'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import ChurchBanner from '@/components/ChurchBanner';

export default function Presentation() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      dir="rtl"
      className={`min-h-screen bg-canvas text-content flex flex-col justify-between selection:bg-gold selection:text-content p-4 sm:p-8 md:p-12 transition-opacity duration-1000 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Background ambient watermarks */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 flex items-center justify-center overflow-hidden opacity-[0.035] pointer-events-none select-none"
      >
        <div className="relative w-[600px] h-[600px] sm:w-[900px] sm:h-[900px]">
          <Image src="/logo.png" alt="" fill className="object-contain" priority />
        </div>
      </div>

      {/* Top Bar Navigation */}
      <header className="relative z-10 flex items-center justify-between pb-6 border-b border-line/60">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-2xl bg-card border border-gold/40 flex items-center justify-center shadow-md overflow-hidden">
            <Image src="/logo.png" alt="شعار مدرسة الكاروز" width={28} height={28} className="object-contain" />
          </div>
          <div>
            <h1 className="text-base font-black text-content">مدرسة الكاروز للكتاب المقدس</h1>
            <p className="text-[11px] text-content-muted">المنظومة التعليمية الكنسية المتكاملة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/bible"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-content hover:text-gold border border-line bg-nav/80 hover:border-gold/40 transition-all shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-gold" />
            <span>الموسوعة الكنسية</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gold hover:bg-warning text-brand-on transition-all shadow-md"
          >
            <span>تسجيل الدخول</span>
            <ArrowRight className="w-4 h-4 -rotate-180" />
          </Link>
        </div>
      </header>

      {/* Centerpiece: The Monumental Church Banner & Leaders */}
      <main className="relative z-10 max-w-5xl w-full mx-auto my-auto py-8 sm:py-12 space-y-8">
        {/* The Golden Hierarchy Banner */}
        <ChurchBanner size="lg" className="border-2 border-gold/50 shadow-2xl shadow-gold/10" />

        {/* Coptic Dedication & Scripture */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>برعاية وإشراف الآباء الأفاضل كهنة الكنيسة</span>
          </div>

          <p className="text-xl sm:text-2xl font-serif font-black text-content leading-relaxed">
            «كُلُّ الْكِتَابِ هُوَ مُوحىً بِهِ مِنَ اللهِ، وَنَافِعٌ لِلتَّعْلِيمِ وَالتَّوْبِيخِ، لِلتَّقْوِيمِ وَالتَّأْدِيبِ الَّذِي فِي الْبِرِّ»
          </p>
          <p className="text-xs font-bold text-gold">— الرسالة الثانية إلى تيموثاوس 3: 16</p>
        </div>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-6">
          <Link
            href="/bible"
            className="group p-5 rounded-2xl bg-nav/80 border border-line hover:border-gold/60 text-right transition-all shadow-lg flex items-center justify-between"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-black text-content group-hover:text-gold transition-colors">
                موسوعة الكتاب المقدس
              </h4>
              <p className="text-[11px] text-content-muted">
                تصفح 10 أقسام رئيسية و47 ألف وثيقة وشرح آبائي
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-canvas border border-line flex items-center justify-center text-gold group-hover:border-gold transition-colors shrink-0 mr-3">
              <BookOpen className="w-5 h-5" />
            </div>
          </Link>

          <Link
            href="/login"
            className="group p-5 rounded-2xl bg-nav/80 border border-line hover:border-gold/60 text-right transition-all shadow-lg flex items-center justify-between"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-black text-content group-hover:text-gold transition-colors">
                بوابة الخدام والدارسين
              </h4>
              <p className="text-[11px] text-content-muted">
                تسجيل الدخول لمتابعة المناهج والغياب والماراثون
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-canvas border border-line flex items-center justify-center text-gold group-hover:border-gold transition-colors shrink-0 mr-3">
              <ArrowRight className="w-5 h-5 -rotate-180" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 border-t border-line/60 text-xs text-content-muted">
        جميع الحقوق محفوظة © 2026 مدرسة الكاروز للكتاب المقدس • كنيسة مارمرقس الرسول بالمنشية
      </footer>
    </div>
  );
}
