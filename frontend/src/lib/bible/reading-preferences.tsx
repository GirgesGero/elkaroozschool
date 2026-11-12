'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type BibleFontSize = number; // in pixels (e.g. 16, 18, 20, 22, 24, 28, 32)
export type BibleFontFamily = 'naskh' | 'amiri' | 'cairo';
export type BibleLineHeight = 1.6 | 1.9 | 2.2 | 2.5;
export type BibleReadingTheme = 'default' | 'luxury-dark' | 'sepia';

export interface BibleReadingPreferences {
  fontSize: BibleFontSize;
  fontFamily: BibleFontFamily;
  lineHeight: BibleLineHeight;
  readingTheme: BibleReadingTheme;
}

interface BibleReadingContextType {
  preferences: BibleReadingPreferences;
  setFontSize: (size: BibleFontSize) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  setFontFamily: (font: BibleFontFamily) => void;
  setLineHeight: (height: BibleLineHeight) => void;
  setReadingTheme: (theme: BibleReadingTheme) => void;
  resetDefaults: () => void;
}

const DEFAULT_PREFERENCES: BibleReadingPreferences = {
  fontSize: 20,
  fontFamily: 'naskh',
  lineHeight: 2.2,
  readingTheme: 'default',
};

const STORAGE_KEY = 'elkarooz_bible_reading_prefs';

const BibleReadingContext = createContext<BibleReadingContextType>({
  preferences: DEFAULT_PREFERENCES,
  setFontSize: () => {},
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
  setFontFamily: () => {},
  setLineHeight: () => {},
  setReadingTheme: () => {},
  resetDefaults: () => {},
});

export const FONT_FAMILY_MAP: Record<BibleFontFamily, { name: string; css: string }> = {
  naskh: {
    name: 'نسخ كنسي',
    css: "'Noto Naskh Arabic', 'Traditional Arabic', var(--font-cairo), serif",
  },
  amiri: {
    name: 'أميري تراثي',
    css: "'Amiri', 'Traditional Arabic', serif",
  },
  cairo: {
    name: 'قاهري حديث',
    css: "var(--font-cairo), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
};

export function BibleReadingPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<BibleReadingPreferences>(DEFAULT_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch {
      // ignore JSON parse / localStorage errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // ignore quota errors
    }
  }, [preferences, isHydrated]);

  // Apply CSS Variables to Document Root for the whole encyclopedia
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const fontCss = FONT_FAMILY_MAP[preferences.fontFamily]?.css || FONT_FAMILY_MAP.naskh.css;

    root.style.setProperty('--bible-font-size', `${preferences.fontSize}px`);
    root.style.setProperty('--bible-font-size-sm', `${Math.max(13, preferences.fontSize * 0.75)}px`);
    root.style.setProperty('--bible-font-size-base', `${preferences.fontSize}px`);
    root.style.setProperty('--bible-font-size-lg', `${preferences.fontSize * 1.2}px`);
    root.style.setProperty('--bible-font-size-xl', `${preferences.fontSize * 1.45}px`);
    root.style.setProperty('--bible-font-size-2xl', `${preferences.fontSize * 1.75}px`);
    root.style.setProperty('--bible-line-height', `${preferences.lineHeight}`);
    root.style.setProperty('--bible-font-family', fontCss);

    // Apply Reading Theme Classes to body
    const body = document.body;
    body.classList.remove('bible-theme-luxury-dark', 'bible-theme-sepia');
    if (preferences.readingTheme === 'luxury-dark') {
      body.classList.add('bible-theme-luxury-dark');
    } else if (preferences.readingTheme === 'sepia') {
      body.classList.add('bible-theme-sepia');
    }
  }, [preferences]);

  const setFontSize = useCallback((size: BibleFontSize) => {
    const clamped = Math.min(34, Math.max(14, size));
    setPreferences((prev) => ({ ...prev, fontSize: clamped }));
  }, []);

  const increaseFontSize = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      fontSize: Math.min(34, prev.fontSize + 2),
    }));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      fontSize: Math.max(14, prev.fontSize - 2),
    }));
  }, []);

  const setFontFamily = useCallback((fontFamily: BibleFontFamily) => {
    setPreferences((prev) => ({ ...prev, fontFamily }));
  }, []);

  const setLineHeight = useCallback((lineHeight: BibleLineHeight) => {
    setPreferences((prev) => ({ ...prev, lineHeight }));
  }, []);

  const setReadingTheme = useCallback((readingTheme: BibleReadingTheme) => {
    setPreferences((prev) => ({ ...prev, readingTheme }));
  }, []);

  const resetDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return (
    <BibleReadingContext.Provider
      value={{
        preferences,
        setFontSize,
        increaseFontSize,
        decreaseFontSize,
        setFontFamily,
        setLineHeight,
        setReadingTheme,
        resetDefaults,
      }}
    >
      {children}
    </BibleReadingContext.Provider>
  );
}

export function useBibleReadingPreferences() {
  const context = useContext(BibleReadingContext);
  if (!context) {
    throw new Error('useBibleReadingPreferences must be used within a BibleReadingPreferencesProvider');
  }
  return context;
}
