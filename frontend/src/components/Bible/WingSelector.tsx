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
    bible: 'from-blue-600/20 to-blue-900/40 border-blue-500/30 hover:border-blue-400/60',
    commentaries: 'from-amber-600/20 to-[#c29938]/40 border-[#c29938]/30 hover:border-[#c29938]/60',
    refs: 'from-emerald-600/20 to-emerald-900/40 border-emerald-500/30 hover:border-emerald-400/60',
    theology: 'from-purple-600/20 to-purple-900/40 border-purple-500/30 hover:border-purple-400/60',
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header with Daily Verse */}
      {stats?.daily_verse && (
        <div className="relative overflow-hidden rounded-3xl border border-[#c29938]/30 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-8 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[url('/patterns/coptic-cross.svg')] opacity-5" />
          <div className="relative z-10">
            <p className="text-2xl font-serif leading-relaxed text-slate-100 mb-4">
              {stats.daily_verse.text}
            </p>
            <p className="text-sm font-bold text-[#c29938]">— {stats.daily_verse.ref}</p>
          </div>
        </div>
      )}

      {/* Stats Banner */}
      {stats && (
        <div className="flex items-center justify-center gap-6 text-center">
          <div className="flex items-center gap-2 text-slate-300">
            <TrendingUp className="w-5 h-5 text-[#c29938]" />
            <span className="text-lg font-bold text-white">{stats.total_articles.toLocaleString()}</span>
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
                    <h3 className="text-2xl font-black text-white mb-2 leading-tight">
                      {category.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {category.subtitle}
                    </p>
                  </div>
                  <div className="shrink-0 p-3 rounded-2xl bg-white/10 border border-white/20 group-hover:bg-white/20 transition-all">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="text-2xl font-bold text-white">{totalDocs.toLocaleString()}</span>
                    <span className="text-xs">مستند</span>
                  </div>
                  <div className="flex items-center gap-2 text-white font-bold text-sm group-hover:gap-3 transition-all">
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
