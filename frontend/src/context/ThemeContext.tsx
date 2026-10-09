'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark' | 'luxury' | 'system';
export type AppAccent = 'gold' | 'burgundy' | 'navy' | 'emerald';

interface ThemeContextType {
  theme: AppTheme;
  accent: AppAccent;
  setTheme: (theme: AppTheme) => void;
  setAccent: (accent: AppAccent) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'luxury',
  accent: 'gold',
  setTheme: () => {},
  setAccent: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<AppTheme>('luxury');
  const [accent, setAccentState] = useState<AppAccent>('gold');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('elkarooz-theme') as AppTheme | null;
    const savedAccent = localStorage.getItem('elkarooz-accent') as AppAccent | null;

    const initialTheme: AppTheme = savedTheme && ['light', 'dark', 'luxury', 'system'].includes(savedTheme) ? savedTheme : 'luxury';
    const initialAccent: AppAccent = savedAccent && ['gold', 'burgundy', 'navy', 'emerald'].includes(savedAccent) ? savedAccent : 'gold';

    setThemeState(initialTheme);
    setAccentState(initialAccent);
    applyThemeClasses(initialTheme, initialAccent);
    setMounted(true);
  }, []);

  const applyThemeClasses = (t: AppTheme, a: AppAccent) => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-luxury', 'dark');
    root.classList.remove('accent-gold', 'accent-burgundy', 'accent-navy', 'accent-emerald');

    let effectiveTheme = t;
    if (t === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
    }

    root.classList.add(`theme-${effectiveTheme}`);
    if (effectiveTheme === 'dark' || effectiveTheme === 'luxury') {
      root.classList.add('dark');
    }

    root.classList.add(`accent-${a}`);
  };

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('elkarooz-theme', newTheme);
    applyThemeClasses(newTheme, accent);
  };

  const setAccent = (newAccent: AppAccent) => {
    setAccentState(newAccent);
    localStorage.setItem('elkarooz-accent', newAccent);
    applyThemeClasses(theme, newAccent);
  };

  const toggleTheme = () => {
    const next: AppTheme = theme === 'luxury' ? 'dark' : theme === 'dark' ? 'light' : 'luxury';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
