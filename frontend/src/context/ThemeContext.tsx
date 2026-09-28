'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark' | 'luxury';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<AppTheme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('elkarooz-theme') as AppTheme | null;
    if (saved && (saved === 'light' || saved === 'dark' || saved === 'luxury')) {
      setThemeState(saved);
      document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-luxury');
      document.documentElement.classList.add(`theme-${saved}`);
      if (saved === 'dark' || saved === 'luxury') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      document.documentElement.classList.add('theme-light');
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('elkarooz-theme', newTheme);
    document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-luxury');
    document.documentElement.classList.add(`theme-${newTheme}`);
    if (newTheme === 'dark' || newTheme === 'luxury') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const next: AppTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'luxury' : 'light';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
