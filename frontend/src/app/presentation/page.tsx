'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Presentation() {
  // simple fade‑in animation on mount
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className={`flex flex-col items-center justify-center min-h-screen px-4 py-12 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Title */}
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-center text-gold md:text-5xl">
        مطرانية شبرا الخيمة وتوابعها
        <br />
        كنيسة مارقس الرسول
      </h1>

      {/* Image container */}
      <div className="flex items-center justify-center gap-8 max-w-4xl">
        {/* Left: إنبا مرقس */}
        <div className="relative w-48 h-64 rounded-xl overflow-hidden shadow-lg border-4 border-gold/30 hover:scale-105 transition-transform duration-300">
          <Image
            src="/images/bishop_mark.jpg"
            alt="إنبا مرقس"
            fill
            className="object-cover"
          />
        </div>

        {/* Center decorative frame */}
        <div className="relative w-64 h-64 flex items-center justify-center rounded-full border-8 border-gold/20 bg-nav/30 shadow-xl animate-pulse">
          {/* optional inner decorative element */}
        </div>

        {/* Right: البابا تواضروس */}
        <div className="relative w-48 h-64 rounded-xl overflow-hidden shadow-lg border-4 border-gold/30 hover:scale-105 transition-transform duration-300">
          <Image
            src="/images/papa_tawadros.jpg"
            alt="البابا تواضروس"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
