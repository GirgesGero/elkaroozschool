'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaCollageProps {
  images: string[];
}

export default function MediaCollage({ images }: MediaCollageProps) {
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const count = images.length;

  const openLightbox = (index: number) => {
    setActiveLightboxIndex(index);
  };

  const closeLightbox = () => {
    setActiveLightboxIndex(null);
  };

  const prevImage = () => {
    if (activeLightboxIndex === null) return;
    setActiveLightboxIndex((activeLightboxIndex - 1 + count) % count);
  };

  const nextImage = () => {
    if (activeLightboxIndex === null) return;
    setActiveLightboxIndex((activeLightboxIndex + 1) % count);
  };

  return (
    <>
      <div className="my-2.5 rounded-2xl overflow-hidden border border-slate-800 bg-[#090f1d]">
        {/* 1 Image: Full Width */}
        {count === 1 && (
          <div
            onClick={() => openLightbox(0)}
            className="relative w-full aspect-[16/10] cursor-pointer group overflow-hidden"
          >
            <Image
              src={images[0]}
              alt="صورة المنشور"
              fill
              sizes="(max-width: 768px) 100vw, 650px"
              className="object-cover group-hover:scale-102 transition-transform duration-300"
            />
          </div>
        )}

        {/* 2 Images: Split Grid */}
        {count === 2 && (
          <div className="grid grid-cols-2 gap-1 aspect-[16/10]">
            {images.map((img, idx) => (
              <div
                key={idx}
                onClick={() => openLightbox(idx)}
                className="relative w-full h-full cursor-pointer group overflow-hidden"
              >
                <Image
                  src={img}
                  alt={`صورة ${idx + 1}`}
                  fill
                  sizes="350px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        )}

        {/* 3 Images: 1 Large + 2 Stacked */}
        {count === 3 && (
          <div className="grid grid-cols-3 gap-1 aspect-[16/10]">
            <div
              onClick={() => openLightbox(0)}
              className="col-span-2 relative h-full cursor-pointer group overflow-hidden"
            >
              <Image
                src={images[0]}
                alt="صورة رئيسية"
                fill
                sizes="450px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col gap-1 h-full">
              {images.slice(1, 3).map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => openLightbox(idx + 1)}
                  className="relative flex-1 cursor-pointer group overflow-hidden"
                >
                  <Image
                    src={img}
                    alt={`صورة ${idx + 2}`}
                    fill
                    sizes="200px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4+ Images: 2x2 Grid with +N Overlay */}
        {count >= 4 && (
          <div className="grid grid-cols-2 gap-1 aspect-[16/11]">
            {images.slice(0, 4).map((img, idx) => (
              <div
                key={idx}
                onClick={() => openLightbox(idx)}
                className="relative w-full h-full cursor-pointer group overflow-hidden"
              >
                <Image
                  src={img}
                  alt={`صورة ${idx + 1}`}
                  fill
                  sizes="300px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {idx === 3 && count > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs">
                    <span className="text-xl font-black text-white">+{count - 3}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {activeLightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in select-none">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-[#c29938] hover:text-slate-950 transition-colors z-50"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Controls */}
          {count > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/70 text-white hover:bg-[#c29938] hover:text-slate-950 transition-colors z-50"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/70 text-white hover:bg-[#c29938] hover:text-slate-950 transition-colors z-50"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Active Image */}
          <div className="relative w-full max-w-4xl h-[80vh] flex items-center justify-center p-4">
            <Image
              src={images[activeLightboxIndex]}
              alt={`صورة مكبرة ${activeLightboxIndex + 1}`}
              fill
              className="object-contain"
            />
          </div>

          {/* Counter Badge */}
          <div className="absolute bottom-6 inset-x-0 flex justify-center">
            <span className="px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-200">
              {activeLightboxIndex + 1} من {count}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
