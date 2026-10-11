import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap, Heart, ShieldCheck } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-nav text-content flex flex-col">
      {/* Header */}
      <header className="border-b border-line bg-nav/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-content-secondary hover:text-content transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-gold">عن المدرسة</span>
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
          <h1 className="text-3xl font-extrabold text-content mb-2">
            مدرسة الكاروز للكتاب المقدس
          </h1>
          <p className="text-content-muted text-sm max-w-xl mx-auto leading-relaxed">
            كنيسة القديس مار مرقس الرسول (المنشية) — مطرانية شبرا الخيمة وتوابعها
          </p>
        </div>

        {/* Pillars / Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-nav/80 border border-line/70 p-5 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-karooz-crimson/20 border border-karooz-crimson/30 flex items-center justify-center text-karooz-crimsonLight mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-content mb-1.5">دراسة كلمة الله</h3>
            <p className="text-xs text-content-muted leading-relaxed">
              منهج أكاديمي وكنسي متكامل لدراسة أسفار العهدين القديم والجديد وتفاسير الآباء الأولين.
            </p>
          </div>

          <div className="bg-nav/80 border border-line/70 p-5 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center text-gold-bright mb-3">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-content mb-1.5">ثلاث فرق دراسية</h3>
            <p className="text-xs text-content-muted leading-relaxed">
              نظام تعليمي متدرج مقسم إلى ثلاث سنوات دراسية يشمل محاضرات دورية، امتحانات، ومسابقات ماراثونية.
            </p>
          </div>

          <div className="bg-nav/80 border border-line/70 p-5 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-info/20 border border-info/30 flex items-center justify-center text-info mb-3">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-content mb-1.5">افتقاد ومتابعة مستمرة</h3>
            <p className="text-xs text-content-muted leading-relaxed">
              رعاية روحية وافتقاد أسبوعي دوري منظم بالتعاون بين الخدام والسكرتارية لكافة الدارسين.
            </p>
          </div>
        </div>

        {/* Call to action */}
        <div className="bg-gradient-to-r from-karooz-crimsonDark via-canvas to-canvas border border-line p-6 rounded-2xl text-center">
          <h2 className="text-xl font-bold text-content mb-2">ابدأ دراسة الكتاب المقدس الآن</h2>
          <p className="text-xs text-content-secondary mb-5">
            تصفح نصوص العهدين وتفاسير موقع الأنبا تكلا هيمانوت المتاحة للجميع مجاناً.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/bible"
              className="bg-gold hover:bg-gold text-content font-bold py-2.5 px-5 rounded-xl text-sm transition-all"
            >
              تصفح الكتاب المقدس
            </Link>
            <Link
              href="/login"
              className="bg-input hover:bg-input text-content font-semibold py-2.5 px-5 rounded-xl text-sm transition-all"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-content-muted py-4 border-t border-line">
        جميع الحقوق محفوظة © {new Date().getFullYear()} مدرسة الكاروز للكتاب المقدس
      </footer>
    </div>
  );
}
