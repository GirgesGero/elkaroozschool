import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap, Heart, ShieldCheck } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-karooz-gold">عن المدرسة</span>
            <div className="relative w-7 h-7">
              <Image src="/logo.png" alt="شعار مدرسة الكاروز" fill sizes="32px" className="object-contain" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1">
        <div className="text-center mb-10">
          <div className="relative w-28 h-28 mx-auto mb-4">
            <Image src="/logo.png" alt="شعار مدرسة الكاروز" fill className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            مدرسة الكاروز للكتاب المقدس
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
            كنيسة القديس مار مرقس الرسول (المنشية) — مطرانية شبرا الخيمة وتوابعها
          </p>
        </div>

        {/* Pillars / Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-karooz-crimson/20 border border-karooz-crimson/30 flex items-center justify-center text-karooz-crimsonLight mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white mb-1.5">دراسة كلمة الله</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              منهج أكاديمي وكنسي متكامل لدراسة أسفار العهدين القديم والجديد وتفاسير الآباء الأولين.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-karooz-gold/20 border border-karooz-gold/30 flex items-center justify-center text-karooz-goldLight mb-3">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white mb-1.5">ثلاث فرق دراسية</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              نظام تعليمي متدرج مقسم إلى ثلاث سنوات دراسية يشمل محاضرات دورية، امتحانات، ومسابقات ماراثونية.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white mb-1.5">افتقاد ومتابعة مستمرة</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              رعاية روحية وافتقاد أسبوعي دوري منظم بالتعاون بين الخدام والسكرتارية لكافة الدارسين.
            </p>
          </div>
        </div>

        {/* Call to action */}
        <div className="bg-gradient-to-r from-karooz-crimsonDark via-slate-800 to-slate-800 border border-slate-700 p-6 rounded-2xl text-center">
          <h2 className="text-xl font-bold text-white mb-2">ابدأ دراسة الكتاب المقدس الآن</h2>
          <p className="text-xs text-slate-300 mb-5">
            تصفح نصوص العهدين وتفاسير موقع الأنبا تكلا هيمانوت المتاحة للجميع مجاناً.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/bible"
              className="bg-karooz-gold hover:bg-karooz-goldDark text-slate-950 font-bold py-2.5 px-5 rounded-xl text-sm transition-all"
            >
              تصفح الكتاب المقدس
            </Link>
            <Link
              href="/login"
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-4 border-t border-slate-800">
        جميع الحقوق محفوظة © {new Date().getFullYear()} مدرسة الكاروز للكتاب المقدس
      </footer>
    </div>
  );
}
