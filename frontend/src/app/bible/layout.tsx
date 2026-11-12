'use client';

import React from 'react';
import { BibleReadingPreferencesProvider } from '@/lib/bible/reading-preferences';

export default function BibleLayout({ children }: { children: React.ReactNode }) {
  return (
    <BibleReadingPreferencesProvider>
      {children}
    </BibleReadingPreferencesProvider>
  );
}
