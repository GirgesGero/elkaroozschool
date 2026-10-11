'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Search, Map, Church, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import type { BibleCategory } from '@/lib/api/bible';

interface WingSelectorProps {
  categories: BibleCategory[];
  onSelectCategory: (categoryCode: string) => void;
  stats?: {
    total_articles: number;
    daily_verse: { text: string; ref: string };
  };
}

export default function WingSelector({ categories, onSelectCategory, stats }: WingSelectorProps) {
  const wingIcons: Record<string, any> = {
    bible: BookOpen,
    commentaries: Church,
    refs: Map,
    theology: Sparkles,
  };

  const wingColors: Record<string, string> = {
    bible: 'from-info/20 to-canvas/40 border-info/30 hover:border-info/60',
    commentaries: 'from-warning/20 to-gold/40 border-gold/30 hover:border-gold/60',
    refs: 'from-success/20 to-canvas/40 border-success/30 hover:border-success/60',
    theology: 'from-info/20 to-canvas/40 border-info/30 hover:border-info/60',
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header with Daily Verse */}
      {stats?.daily_verse && (
        <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-canvas/90 to-canvas/90 p-8 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[url('/patterns/coptic-cross.svg')] opacity-5" />
          <div className="relative z-10">
            <p className="text-2xl font-serif leading-relaxed text-content mb-4">
              {stats.daily_verse.text}
            </p>
            <p className="text-sm font-bold text-gold">— {stats.daily_verse.ref}</p>
          </div>
        </div>
      )}

      {/* Stats Banner */}
      {stats && (
        <div className="flex items-center justify-center gap-6 text-center">
          <div className="flex items-center gap-2 text-content-secondary">
            <TrendingUp className="w-5 h-5 text-gold" />
            <span className="text-lg font-bold text-content">{stats.total_articles.toLocaleString()}</span>
            <span className="text-sm">مقال ووثيقة</span>
          </div>
        </div>
      )}

      {/* 4 Wings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((category) => {
          const Icon = wingIcons[category.code] || BookOpen;
          const colorClass = wingColors[category.code] || wingColors.bible;
          const totalDocs = category.sections?.reduce((sum, s) => sum + (s.doc_count || 0), 0) || 0;

          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.code)}
              className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br p-8 text-right transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${colorClass}`}
            >
              <div className="absolute top-4 left-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className="w-32 h-32" />
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-content mb-2 leading-tight">
                      {category.title}
                    </h3>
                    <p className="text-sm text-content-secondary leading-relaxed">
                      {category.subtitle}
                    </p>
                  </div>
                  <div className="shrink-0 p-3 rounded-2xl bg-card/10 border border-line/20 group-hover:bg-card/20 transition-all">
                    <Icon className="w-6 h-6 text-content" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-line/10">
                                  <div className="flex items-center gap-2 text-content">
                                    <span className="text-2xl font-bold text-content">{totalDocs.toLocaleString()}</span>
                                    <span className="text-xs text-content-secondary">مستند</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-content-secondary font-bold text-sm group-hover:gap-3 transition-all group-hover:text-content">
                                    <span>استعراض</span>
                                    <ArrowRight className="w-4 h-4" />
                                  </div>
                                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
