'use client';

import Image from 'next/image';

interface ChurchBannerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ChurchBanner({ className = '', size = 'md' }: ChurchBannerProps) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  // Responsive container sizing: strict, valid Tailwind widths & heights with aspect ratios
  // Mobile (<640px) uses compact, high-density frames that fit comfortably on 360px+ screens
  const containerClasses = isSm
    ? 'w-12 h-16 sm:w-16 sm:h-20'
    : isLg
    ? 'w-20 h-28 sm:w-32 sm:h-44 md:w-40 md:h-52'
    : 'w-16 h-20 sm:w-24 sm:h-32 md:w-28 md:h-36';

  return (
    <div
      dir="rtl"
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gold/40 bg-gradient-to-br from-nav/95 via-card/90 to-nav/95 p-3 sm:p-6 shadow-2xl backdrop-blur-xl transition-all ${className}`}
    >
      {/* Top golden halo line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
      <div className="pointer-events-none absolute -right-12 -top-12 w-48 h-48 sm:w-64 sm:h-64 bg-gold/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 w-48 h-48 sm:w-64 sm:h-64 bg-gold/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-6">
        {/* RIGHT SIDE (in RTL): قداسة البابا المعظم الأنبا تواضروس الثاني */}
        <div className="flex flex-col items-center gap-1 sm:gap-2 group flex-shrink-0">
          <div
            className={`relative ${containerClasses} rounded-xl sm:rounded-2xl overflow-hidden border-2 border-gold/60 shadow-lg shadow-black/50 group-hover:border-gold group-hover:scale-105 transition-all duration-300 ease-out`}
            style={{ animation: 'bannerFloat 6s ease-in-out infinite' }}
          >
            {/* Ambient vignette shadow inside frame */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10 pointer-events-none" />
            <Image
              src="/images/papa_tawadros.jpg"
              alt="قداسة البابا تواضروس الثاني"
              fill
              sizes="(max-width: 640px) 72px, 160px"
              className="object-cover object-top transition-transform duration-700 group-hover:scale-110"
              priority
            />
          </div>
          <div className="text-center">
            <span className="block text-[10px] sm:text-xs font-black text-gold tracking-tight leading-tight">
              البابا تواضروس
              <span className="hidden sm:inline"> الثاني</span>
            </span>
            <span className="hidden md:block text-[9px] text-content-muted font-medium mt-0.5">
              بابا وبطريرك الكرازة
            </span>
          </div>
        </div>

        {/* CENTER: مطرانية شبرا الخيمة وتوابعها • كنيسة مارمرقس الرسول */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-1 sm:px-4 space-y-1 sm:space-y-2 min-w-0">
          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 rounded-full bg-gold/15 border border-gold/30 text-gold text-[9px] sm:text-xs font-bold shadow-sm whitespace-nowrap">
            <span>✝️</span>
            <span className="hidden xs:inline">الكنيسة القبطية الأرثوذكسية</span>
            <span className="xs:hidden">الكنيسة القبطية</span>
          </div>

          <h2
            className={`${
              isLg
                ? 'text-base sm:text-2xl md:text-3xl'
                : isSm
                ? 'text-xs sm:text-sm md:text-base'
                : 'text-xs sm:text-lg md:text-2xl'
            } font-black tracking-tight text-content leading-tight font-serif truncate max-w-full`}
            title="مطرانية شبرا الخيمة وتوابعها"
          >
            مطرانية شبرا الخيمة وتوابعها
          </h2>

          <div className="flex items-center gap-1.5 sm:gap-2 justify-center w-full max-w-xs">
            <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gold/60" />
            <h3
              className={`${
                isLg
                  ? 'text-sm sm:text-lg md:text-xl'
                  : isSm
                  ? 'text-[11px] sm:text-xs md:text-sm'
                  : 'text-[11px] sm:text-sm md:text-lg'
              } font-black text-gold tracking-wide whitespace-nowrap`}
            >
              كنيسة مارمرقس الرسول
            </h3>
            <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gold/60" />
          </div>

          <p className="text-[9px] sm:text-xs text-content-muted font-medium hidden sm:block truncate max-w-full">
            بالمنشية الجديدة — مدرسة الكاروز للكتاب المقدس
          </p>
        </div>

        {/* LEFT SIDE (in RTL): نيافة الحبر الجليل الأنبا مرقس مطران شبرا الخيمة */}
        <div className="flex flex-col items-center gap-1 sm:gap-2 group flex-shrink-0">
          <div
            className={`relative ${containerClasses} rounded-xl sm:rounded-2xl overflow-hidden border-2 border-gold/60 shadow-lg shadow-black/50 group-hover:border-gold group-hover:scale-105 transition-all duration-300 ease-out`}
            style={{ animation: 'bannerFloat 6s ease-in-out 3s infinite' }}
          >
            {/* Ambient vignette shadow inside frame */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10 pointer-events-none" />
            <Image
              src="/images/bishop_mark.jpg"
              alt="نيافة الأنبا مرقس مطران شبرا الخيمة"
              fill
              sizes="(max-width: 640px) 72px, 160px"
              className="object-cover object-top transition-transform duration-700 group-hover:scale-110"
              priority
            />
          </div>
          <div className="text-center">
            <span className="block text-[10px] sm:text-xs font-black text-gold tracking-tight leading-tight">
              الأنبا مرقس
            </span>
            <span className="hidden md:block text-[9px] text-content-muted font-medium mt-0.5">
              مطران شبرا الخيمة
            </span>
          </div>
        </div>
      </div>

      {/* Global CSS animation for gentle floating */}
      <style jsx>{`
        @keyframes bannerFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
}
