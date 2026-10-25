'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, Search, Sparkles, FolderTree, LayoutGrid, ArrowRight, BookOpen, Church, Map as MapIcon } from 'lucide-react';
import type { BibleCategory, BibleSection } from '@/lib/api/bible';
import { ENCYCLOPEDIA_SECTIONS } from '@/lib/bible/encyclopedia-sections';

interface WingSelectorProps {
  categories: BibleCategory[];
  onSelectCategory: (categoryCode: string) => void;
  stats?: {
    total_articles: number;
    daily_verse: { text: string; ref?: string; reference?: string };
  };
  onOpenReader?: () => void;
  onOpenSearch?: () => void;
}

export default function WingSelector({
  categories,
  onSelectCategory,
  stats,
  onOpenReader,
  onOpenSearch,
}: WingSelectorProps) {
  const [hubTab, setHubTab] = useState<'tree' | 'grid'>('tree');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    bible: true,
    commentaries: true,
    refs: false,
    theology: false,
  });
  const [treeSearch, setTreeSearch] = useState('');

  const wingMeta: Record<
    string,
    {
      icon: any;
      bgGradient: string;
      borderClass: string;
      accentText: string;
      badgeBg: string;
      label: string;
    }
  > = {
    bible: {
      icon: BookOpen,
      bgGradient: 'from-amber-950/20 via-canvas to-amber-950/10',
      borderClass: 'border-gold/40 hover:border-gold',
      accentText: 'text-gold',
      badgeBg: 'bg-gold/15 text-gold border-gold/30',
      label: 'الكتاب المقدس والتراجم',
    },
    commentaries: {
      icon: Church,
      bgGradient: 'from-rose-950/25 via-canvas to-rose-950/10',
      borderClass: 'border-rose-500/30 hover:border-rose-500/70',
      accentText: 'text-rose-400',
      badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      label: 'التفاسير والعلوم الآبائية',
    },
    refs: {
      icon: MapIcon,
      bgGradient: 'from-emerald-950/25 via-canvas to-emerald-950/10',
      borderClass: 'border-emerald-500/30 hover:border-emerald-500/70',
      accentText: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      label: 'المعاجم والأطلس والتاريخ',
    },
    theology: {
      icon: Sparkles,
      bgGradient: 'from-purple-950/25 via-canvas to-purple-950/10',
      borderClass: 'border-purple-500/30 hover:border-purple-500/70',
      accentText: 'text-purple-400',
      badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      label: 'اللاهوتيات والعقائد والصلوات',
    },
  };

  const toggleCat = (code: string) => {
    setExpandedCats((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    categories.forEach((c) => {
      all[c.code] = true;
    });
    setExpandedCats(all);
  };

  const collapseAll = () => {
    const none: Record<string, boolean> = {};
    categories.forEach((c) => {
      none[c.code] = false;
    });
    setExpandedCats(none);
  };

  const filteredCategories = useMemo(() => {
    const q = treeSearch.trim().toLowerCase();
    if (!q) return categories;

    return categories
      .map((cat) => {
        const catMatches =
          cat.title.toLowerCase().includes(q) || cat.subtitle.toLowerCase().includes(q);
        const filteredSecs = (cat.sections || []).filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q) ||
            (s.description && s.description.toLowerCase().includes(q))
        );

        if (catMatches) return cat;
        if (filteredSecs.length > 0) {
          return { ...cat, sections: filteredSecs };
        }
        return null;
      })
      .filter(Boolean) as BibleCategory[];
  }, [categories, treeSearch]);

  const totalSectionsCount = useMemo(() => {
    return categories.reduce((acc, c) => acc + (c.sections?.length || 0), 0);
  }, [categories]);

  const totalDocsCount = useMemo(() => {
    if (stats?.total_articles) return stats.total_articles;
    return categories.reduce(
      (acc, c) => acc + (c.sections?.reduce((sAcc, s) => sAcc + (s.doc_count || 0), 0) || 0),
      0
    );
  }, [categories, stats]);

  const dailyRef = stats?.daily_verse?.ref || stats?.daily_verse?.reference || 'سفر المزامير';

  return (
    <div className="space-y-8 select-text" dir="rtl">
      {/* 1. Sanctuary Verse & Monumental Header */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-gold/40 bg-gradient-to-br from-nav via-card to-nav p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-black/80">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 bg-gold/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>الآية اليومية المختارة</span>
            </div>
            {stats?.daily_verse ? (
              <div>
                <p className="text-xl sm:text-2xl font-black leading-relaxed text-content font-serif">
                  «{stats.daily_verse.text}»
                </p>
                <p className="text-xs font-bold text-gold mt-1.5">— {dailyRef}</p>
              </div>
            ) : (
              <p className="text-lg font-bold text-content leading-relaxed">
                «سِرَاجٌ لِرِجْلِي كَلاَمُكَ وَنُورٌ لِسَبِيلِي»
                <span className="text-xs text-gold mr-2 font-bold">— مزمور 119: 105</span>
              </p>
            )}
          </div>

          {/* Quick Metrics Capsule */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 md:border-r border-line/60 pt-4 md:pt-0 md:pr-6">
            <div className="p-3 rounded-2xl bg-canvas/70 border border-line text-center">
              <span className="text-content-muted text-[11px] block">الأجنحة الكبرى</span>
              <span className="text-lg font-black text-gold mt-0.5 block">4 أجنحة</span>
            </div>
            <div className="p-3 rounded-2xl bg-canvas/70 border border-line text-center">
              <span className="text-content-muted text-[11px] block">الأقسام العلمية</span>
              <span className="text-lg font-black text-content mt-0.5 block">{totalSectionsCount} قسماً</span>
            </div>
            <div className="p-3 rounded-2xl bg-canvas/70 border border-line text-center col-span-2 sm:col-span-1">
              <span className="text-content-muted text-[11px] block">إجمالي الوثائق</span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                {totalDocsCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Control Strip: Tree vs Portals Toggle & Search */}
      <div className="p-4 rounded-2xl bg-nav/90 border border-line/90 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-canvas rounded-2xl border border-line w-full md:w-auto">
          <button
            type="button"
            onClick={() => setHubTab('tree')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              hubTab === 'tree'
                ? 'bg-gold text-brand-on shadow-md font-black'
                : 'text-content-secondary hover:text-content'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>شجرة الموسوعة الهرمية</span>
          </button>
          <button
            type="button"
            onClick={() => setHubTab('grid')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              hubTab === 'grid'
                ? 'bg-gold text-brand-on shadow-md font-black'
                : 'text-content-secondary hover:text-content'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>بوابات الأجنحة الملكية</span>
          </button>
        </div>

        {/* Tree Search & Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {hubTab === 'tree' && (
            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 text-content-muted absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                aria-label="تصفية فروع الشجرة"
                placeholder="تصفية فروع وأقسام الشجرة..."
                className="w-full bg-canvas border border-line rounded-xl pr-9 pl-3 py-1.5 text-[16px] md:text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-gold"
              />
              {treeSearch && (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  onClick={() => setTreeSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-content-muted hover:text-content text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {hubTab === 'tree' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1.5 rounded-xl bg-canvas border border-line text-[11px] font-bold text-content-secondary hover:text-gold hover:border-gold/40 transition-colors"
                aria-label="توسيع كافة الفروع"
                title="توسيع كافة الفروع"
              >
                توسيع الكل
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1.5 rounded-xl bg-canvas border border-line text-[11px] font-bold text-content-secondary hover:text-gold hover:border-gold/40 transition-colors"
                aria-label="طي كافة الفروع"
                title="طي كافة الفروع"
              >
                طي الكل
              </button>
            </div>
          )}

          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="px-3.5 py-1.5 rounded-xl bg-nav border border-gold/40 hover:bg-gold hover:text-brand-on text-xs font-bold text-gold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              <span>بحث في النصوص</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. VIEW 1: THE INTERACTIVE HIERARCHY TREE */}
      {hubTab === 'tree' && (
        <div className="space-y-5 animate-fade-in">
          {filteredCategories.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-nav border border-line text-content-muted text-xs">
              لا توجد فروع أو أقسام مطابقة لكلمة البحث «{treeSearch}»
            </div>
          ) : (
            filteredCategories.map((category) => {
              const meta = wingMeta[category.code] || wingMeta.bible;
              const Icon = meta.icon;
              const isExpanded = treeSearch.trim().length > 0 || !!expandedCats[category.code];
              const sections = category.sections || [];
              const catDocsCount = sections.reduce((acc, s) => acc + (s.doc_count || 0), 0);

              return (
                <div
                  key={category.id}
                  className={`rounded-3xl border transition-all overflow-hidden bg-nav/80 shadow-lg ${meta.borderClass}`}
                >
                  {/* Category Trunk Bar (Branch Header) */}
                  <div
                    onClick={() => toggleCat(category.code)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCat(category.code);
                      }
                    }}
                    className={`p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none bg-gradient-to-r ${meta.bgGradient} transition-colors`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-canvas border border-line/80 flex items-center justify-center shrink-0 shadow-md">
                        <Icon className={`w-5 h-5 ${meta.accentText}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-black text-content tracking-tight">
                            {category.title}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeBg}`}>
                            {sections.length} قسم علمي
                          </span>
                        </div>
                        <p className="text-xs text-content-muted mt-0.5 truncate max-w-xl">
                          {category.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left hidden sm:block">
                        <span className="text-[11px] text-content-muted block">محتوى الجناح</span>
                        <span className="text-xs font-mono font-bold text-content">
                          {catDocsCount.toLocaleString()} وثيقة
                        </span>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-canvas/80 border border-line flex items-center justify-center text-content-secondary transition-transform">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category Leaves / Sub-Sections Grid */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 bg-canvas/60 border-t border-line/80 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {sections.map((sec) => {
                          const isCompleteBible = sec.code === 'sec-holy-bible-complete';

                          return (
                            <div
                              key={sec.id}
                              className="group relative rounded-2xl border border-line bg-nav p-4 hover:border-gold/60 hover:shadow-lg transition-all flex flex-col justify-between gap-3 text-right"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-base shrink-0 p-1.5 rounded-xl bg-canvas border border-line">
                                      {sec.icon || '📜'}
                                    </span>
                                    <h4 className="text-xs font-black text-content group-hover:text-gold transition-colors truncate">
                                      {sec.title}
                                    </h4>
                                  </div>

                                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-canvas border border-line text-[10px] font-mono font-bold text-content-secondary">
                                    {sec.doc_count.toLocaleString()}
                                  </span>
                                </div>

                                {sec.description && (
                                  <p className="text-[11px] text-content-muted line-clamp-2 leading-relaxed">
                                    {sec.description}
                                  </p>
                                )}
                              </div>

                              <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2 text-xs">
                                <Link
                                  href={`/bible/section/${sec.code}`}
                                  className="text-gold font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                                >
                                  <span>تصفح وثائق القسم</span>
                                  <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                                </Link>

                                {isCompleteBible && onOpenReader && (
                                  <button
                                    type="button"
                                    onClick={onOpenReader}
                                    className="px-2 py-1 rounded-lg bg-gold/15 text-gold border border-gold/40 hover:bg-gold hover:text-brand-on text-[10px] font-bold transition-colors"
                                  >
                                    فتح القارئ
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. VIEW 2: MONUMENTAL WING PORTALS CARDS */}
      {hubTab === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {categories.map((category) => {
            const meta = wingMeta[category.code] || wingMeta.bible;
            const Icon = meta.icon;
            const sections = category.sections || [];
            const totalDocs = sections.reduce((sum, s) => sum + (s.doc_count || 0), 0);

            return (
              <div
                key={category.id}
                className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 sm:p-8 text-right transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between gap-6 ${meta.borderClass} ${meta.bgGradient}`}
              >
                {/* Background Watermark Icon */}
                <div className="pointer-events-none absolute -bottom-6 -left-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Icon className="w-48 h-48" />
                </div>

                <div className="relative z-10 space-y-4">
                  {/* Portal Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeBg}`}>
                          جناح رئيسي
                        </span>
                        <span className="text-xs text-content-muted font-mono">
                          {sections.length} قسماً تخصصياً
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-content leading-tight group-hover:text-gold transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-xs text-content-secondary mt-1.5 leading-relaxed">
                        {category.subtitle}
                      </p>
                    </div>

                    <div className="shrink-0 p-3.5 rounded-2xl bg-canvas border border-line shadow-md">
                      <Icon className={`w-7 h-7 ${meta.accentText}`} />
                    </div>
                  </div>

                  {/* Highlights of Sections */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-content-muted block mb-2">
                      أبرز أقسام الجناح:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {sections.slice(0, 5).map((sec) => (
                        <Link
                          key={sec.id}
                          href={`/bible/section/${sec.code}`}
                          className="px-2.5 py-1 rounded-xl bg-canvas/80 border border-line hover:border-gold/60 text-[11px] font-bold text-content-secondary hover:text-content transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <span>{sec.icon || '•'}</span>
                          <span className="truncate max-w-[130px]">{sec.title}</span>
                        </Link>
                      ))}
                      {sections.length > 5 && (
                        <span className="px-2 py-1 text-[10px] text-content-muted font-bold self-center">
                          +{sections.length - 5} أقسام أخرى
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Portal Footer Action */}
                <div className="relative z-10 pt-4 border-t border-line/60 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-content-muted block">إجمالي الوثائق</span>
                    <span className="text-lg font-black text-content font-mono">
                      {totalDocs.toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectCategory(category.code)}
                    className="app-btn app-btn-primary text-xs py-2 px-4 shadow-md flex items-center gap-2"
                  >
                    <span>استعراض الجناح</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
