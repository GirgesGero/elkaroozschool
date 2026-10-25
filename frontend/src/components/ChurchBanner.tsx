'use client';

import Image from 'next/image';

interface ChurchBannerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ChurchBanner({ className = '', size = 'md' }: ChurchBannerProps) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  // Dimension configurations
  const imageDims = isSm
    ? { width: 56, height: 72, container: 'w-14 h-18 sm:w-16 sm:h-20' }
    : isLg
    ? { width: 140, height: 180, container: 'w-28 h-36 sm:w-36 sm:h-48 md:w-44 md:h-56' }
    : { width: 84, height: 110, container: 'w-20 h-26 sm:w-24 sm:h-32' };

  return (
    <div
      dir="rtl"
      className={`relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-nav/95 via-card/90 to-nav/95 p-4 sm:p-6 shadow-2xl backdrop-blur-xl transition-all ${className}`}
    >
      {/* Golden top decorative bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
      <div className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-6">
        {/* RIGHT SIDE in RTL: قداسة البابا تواضروس الثاني */}
        <div className="flex flex-col items-center gap-2 group flex-shrink-0">
          <div
            className={`relative ${imageDims.container} rounded-2xl overflow-hidden border-2 border-gold/50 shadow-xl shadow-black/40 group-hover:border-gold group-hover:scale-105 transition-all duration-500 ease-out`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none" />
            <Image
              src="/images/papa_tawadros.jpg"
              alt="قداسة البابا تواضروس الثاني"
              fill
              sizes="(max-width: 640px) 96px, 160px"
              className="object-cover object-top transition-transform duration-700 group-hover:scale-110"
              priority
            />
          </div>
          <span className="text-[10px] sm:text-xs font-black text-gold text-center tracking-tight leading-tight">
            قداسة البابا تواضروس الثاني
          </span>
        </div>

        {/* CENTER: مطرانية شبرا الخيمة وتوابعها • كنيسة مارمرقس الرسول */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2 sm:px-4 space-y-1.5 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gold/15 border border-gold/30 text-gold text-[10px] sm:text-xs font-bold shadow-sm">
            <span>✝️</span>
            <span>الكنيسة القبطية الأرثوذكسية</span>
          </div>

          <h2 className={`${isLg ? 'text-2xl sm:text-3xl md:text-4xl' : isSm ? 'text-sm sm:text-base' : 'text-lg sm:text-2xl'} font-black tracking-tight text-content leading-tight font-serif`}>
            مطرانية شبرا الخيمة وتوابعها
          </h2>

          <div className="flex items-center gap-2 justify-center w-full max-w-xs">
            <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gold/60" />
            <h3 className={`${isLg ? 'text-lg sm:text-xl md:text-2xl' : isSm ? 'text-xs sm:text-sm' : 'text-sm sm:text-lg'} font-black text-gold tracking-wide`}>
              كنيسة مارمرقس الرسول
            </h3>
            <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gold/60" />
          </div>

          <p className="text-[10px] sm:text-xs text-content-muted font-medium hidden sm:block">
            بالمنشية الجديدة — مدرسة الكاروز للكتاب المقدس
          </p>
        </div>

        {/* LEFT SIDE in RTL: نيافة الأنبا مرقس مطران شبرا الخيمة */}
        <div className="flex flex-col items-center gap-2 group flex-shrink-0">
          <div
            className={`relative ${imageDims.container} rounded-2xl overflow-hidden border-2 border-gold/50 shadow-xl shadow-black/40 group-hover:border-gold group-hover:scale-105 transition-all duration-500 ease-out`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none" />
            <Image
              src="/images/bishop_mark.jpg"
              alt="نيافة الأنبا مرقس مطران شبرا الخيمة"
              fill
              sizes="(max-width: 640px) 96px, 160px"
              className="object-cover object-top transition-transform duration-700 group-hover:scale-110"
              priority
            />
          </div>
          <span className="text-[10px] sm:text-xs font-black text-gold text-center tracking-tight leading-tight">
            نيافة الأنبا مرقس
          </span>
        </div>
      </div>
    </div>
  );
}
