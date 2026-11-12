'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  useBibleReadingPreferences, 
  FONT_FAMILY_MAP, 
  type BibleFontFamily, 
  type BibleReadingTheme, 
  type BibleLineHeight 
} from '@/lib/bible/reading-preferences';
import { 
  Type, 
  Minus, 
  Plus, 
  RotateCcw, 
  Sliders, 
  Check, 
  X, 
  Sparkles,
  AlignJustify
} from 'lucide-react';

interface Props {
  className?: string;
  variant?: 'floating' | 'inline' | 'compact';
}

export default function BibleReadingToolbar({ className = '', variant = 'inline' }: Props) {
  const {
    preferences,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    setFontFamily,
    setLineHeight,
    setReadingTheme,
    resetDefaults,
  } = useBibleReadingPreferences();

  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on click outside or escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const fontOptions: { id: BibleFontFamily; label: string; preview: string }[] = [
    { id: 'naskh', label: 'نسخ كنسي', preview: 'بِسْمِ الآبِ وَالاِبْنِ' },
    { id: 'amiri', label: 'أميري تراثي', preview: 'فِي الْبَدْءِ كَانَ الْكَلِمَةُ' },
    { id: 'cairo', label: 'قاهري حديث', preview: 'سِرَاجٌ لِرِجْلِي كَلاَمُكَ' },
  ];

  const lineHeightOptions: { value: BibleLineHeight; label: string }[] = [
    { value: 1.6, label: 'مضغوط' },
    { value: 1.9, label: 'عادي' },
    { value: 2.2, label: 'مريح' },
    { value: 2.5, label: 'واسع' },
  ];

  const themeOptions: { id: BibleReadingTheme; label: string; dotClass: string }[] = [
    { id: 'default', label: 'الافتراضي', dotClass: 'bg-zinc-700 border-zinc-500' },
    { id: 'luxury-dark', label: 'كحلي وذهبي', dotClass: 'bg-[#070b14] border-gold' },
    { id: 'sepia', label: 'ورقي دافئ', dotClass: 'bg-[#f4ebd9] border-[#cbb390]' },
  ];

  return (
    <div className={`relative select-none text-right ${className}`} dir="rtl">
      {/* Quick Access Stepper Bar */}
      <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-nav/90 border border-line shadow-lg backdrop-blur-md">
        {/* Decrease Font Button */}
        <button
          type="button"
          onClick={decreaseFontSize}
          disabled={preferences.fontSize <= 14}
          title="تصغير خط الموسوعة (A-)"
          aria-label="تصغير الخط"
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-canvas hover:bg-nav text-content-secondary hover:text-content border border-line/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 text-xs font-bold"
        >
          <span className="text-[11px] font-black">A-</span>
        </button>

        {/* Font Size Indicator Badge */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title="إعدادات حجم ونوع خط الموسوعة"
          aria-label="خيارات الخط والقراءة"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-canvas/80 hover:bg-gold/10 hover:border-gold/40 border border-line text-xs font-bold text-gold transition-all"
        >
          <Type className="w-3.5 h-3.5" />
          <span>{preferences.fontSize}px</span>
        </button>

        {/* Increase Font Button */}
        <button
          type="button"
          onClick={increaseFontSize}
          disabled={preferences.fontSize >= 34}
          title="تكبير خط الموسوعة (A+)"
          aria-label="تكبير الخط"
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-canvas hover:bg-nav text-content-secondary hover:text-content border border-line/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 text-xs font-bold"
        >
          <span className="text-[11px] font-black">A+</span>
        </button>

        {/* More Settings Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title="تخصيص كامل للقراءة والخط"
          aria-expanded={isOpen}
          className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
            isOpen
              ? 'bg-gold text-brand-on border-gold shadow-md'
              : 'bg-canvas hover:bg-nav text-content-secondary hover:text-gold border-line/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Detailed Preferences Popover */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute left-0 mt-2 z-50 w-80 sm:w-96 p-5 rounded-3xl bg-nav/95 border-2 border-gold/40 shadow-2xl backdrop-blur-xl text-content animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(194, 153, 56, 0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-line/80">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-gold/15 text-gold border border-gold/30">
                <Type className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-content leading-tight">تخصيص قراءة الموسوعة</h4>
                <p className="text-[10px] text-content-muted">تحكم فوري بحجم الخط والتباعد على كل الأجهزة</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-canvas text-content-muted hover:text-content transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 1. Font Size Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-content-secondary">حجم الخط:</span>
                <span className="text-gold font-mono px-2 py-0.5 rounded-md bg-canvas border border-line">
                  {preferences.fontSize} بكسل
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={decreaseFontSize}
                  disabled={preferences.fontSize <= 14}
                  className="p-1.5 rounded-lg bg-canvas border border-line text-content-secondary hover:text-content disabled:opacity-40"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="14"
                  max="34"
                  step="1"
                  value={preferences.fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1 accent-gold h-2 bg-canvas rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={increaseFontSize}
                  disabled={preferences.fontSize >= 34}
                  className="p-1.5 rounded-lg bg-canvas border border-line text-content-secondary hover:text-content disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. Font Family Selector */}
            <div>
              <span className="block text-xs font-bold text-content-secondary mb-2">نوع الخط العربي:</span>
              <div className="grid grid-cols-3 gap-2">
                {fontOptions.map((font) => {
                  const isSelected = preferences.fontFamily === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setFontFamily(font.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-gold/20 border-gold text-gold shadow-sm font-bold'
                          : 'bg-canvas/70 border-line text-content-secondary hover:border-gold/40 hover:text-content'
                      }`}
                    >
                      <span className="block text-xs">{font.label}</span>
                      <span className="block text-[10px] text-content-muted truncate mt-0.5" style={{ fontFamily: FONT_FAMILY_MAP[font.id].css }}>
                        {font.preview}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Line Spacing (Line Height) */}
            <div>
              <span className="block text-xs font-bold text-content-secondary mb-2">تباعد الأسطر:</span>
              <div className="grid grid-cols-4 gap-1.5">
                {lineHeightOptions.map((opt) => {
                  const isSelected = preferences.lineHeight === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLineHeight(opt.value)}
                      className={`py-1.5 px-2 rounded-lg border text-center text-xs transition-all ${
                        isSelected
                          ? 'bg-gold text-brand-on border-gold font-bold'
                          : 'bg-canvas/70 border-line text-content-secondary hover:text-content'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Reading Theme (Sepia / Luxury Dark / Default) */}
            <div>
              <span className="block text-xs font-bold text-content-secondary mb-2">سمة القراءة المريحة:</span>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((theme) => {
                  const isSelected = preferences.readingTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setReadingTheme(theme.id)}
                      className={`flex items-center justify-center gap-2 p-2 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'bg-gold/15 border-gold text-gold font-bold'
                          : 'bg-canvas/70 border-line text-content-secondary hover:text-content'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full border ${theme.dotClass}`} />
                      <span>{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Text Preview Box */}
            <div className="p-3.5 rounded-2xl bg-canvas border border-line">
              <span className="block text-[10px] text-content-muted mb-1">معاينة حية للنص:</span>
              <p
                style={{
                  fontSize: `${preferences.fontSize}px`,
                  lineHeight: preferences.lineHeight,
                  fontFamily: FONT_FAMILY_MAP[preferences.fontFamily].css,
                }}
                className="text-content text-justify"
              >
                «كُلُّ الْكِتَابِ هُوَ مُوحىً بِهِ مِنَ اللهِ، وَنَافِعٌ لِلتَّعْلِيمِ وَالتَّوْبِيخِ، لِلتَّقْوِيمِ وَالتَّأْدِيبِ الَّذِي فِي الْبِرِّ»
              </p>
            </div>

            {/* Footer / Reset */}
            <div className="flex items-center justify-between pt-2 border-t border-line/60">
              <button
                type="button"
                onClick={resetDefaults}
                className="flex items-center gap-1.5 text-xs text-content-muted hover:text-gold transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة ضبط للافتراضي</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-gold text-brand-on text-xs font-bold hover:bg-gold/90 transition-colors"
              >
                حفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
