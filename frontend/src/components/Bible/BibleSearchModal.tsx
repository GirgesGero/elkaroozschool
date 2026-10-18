'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, BookOpen, Sparkles } from 'lucide-react';
import { searchBibleEncyclopedia, getBibleStats, type BibleSearchResult } from '@/lib/api/bible';

interface BibleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectArticle: (articleId: number) => void;
  sectionId?: number;
}

interface SearchState {
  query: string;
  results: BibleSearchResult[];
  total: number;
  loading: boolean;
  searched: boolean;
  /** Tokens the backend widened by prefix expansion, e.g. "المسي" -> المسيح. */
  expandedTokens?: string[];
}

export default function BibleSearchModal({ isOpen, onClose, onSelectArticle, sectionId }: BibleSearchModalProps) {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    results: [],
    total: 0,
    loading: false,
    searched: false,
  });
  // Read the real count from the dataset instead of a hardcoded figure that
  // drifts the moment the encyclopedia is rebuilt.
  const [articleCount, setArticleCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || articleCount !== null) return;
    let cancelled = false;
    getBibleStats()
      .then((s) => {
        if (!cancelled) setArticleCount(s.total_articles ?? null);
      })
      .catch(() => {
        /* header count is cosmetic -- never block search on it */
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, articleCount]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const executeSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchState({
        query: searchQuery,
        results: [],
        total: 0,
        loading: false,
        searched: false,
      });
      return;
    }

    setSearchState(prev => ({ ...prev, loading: true, searched: true, query: searchQuery }));
    try {
      const response = await searchBibleEncyclopedia(trimmed, { 
        limit: 20,
        sectionId: sectionId && sectionId > 0 ? sectionId : undefined 
      });
      setSearchState(prev => ({
        ...prev,
        results: response.results || response.items || [],
        total: response.total || 0,
        loading: false,
        // Surfaced so the results list can tell the reader these are
        // approximations, not exact hits for the word they typed.
        expandedTokens: response.prefix_expanded,
      }));
    } catch (error) {
      console.error('Search error:', error);
      setSearchState(prev => ({
        ...prev,
        results: [],
        total: 0,
        loading: false,
        expandedTokens: undefined,
      }));
    }
  };

  const handleInputChange = (value: string) => {
    setSearchState(prev => ({ ...prev, query: value }));
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 400ms debounce
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(value);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      executeSearch(searchState.query);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { query, results, total, loading, searched, expandedTokens } = searchState;

  return (
    <div role="dialog" aria-modal="true" aria-label="البحث في الموسوعة" onClick={onClose} className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-nav/80 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl mt-20 rounded-3xl overflow-hidden shadow-2xl border border-line bg-canvas">
        {/* Header */}
        <div className="p-6 border-b border-line/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gold/15 border border-gold/30">
              <Search className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h3 className="font-black text-base text-content flex items-center gap-2">
                <span>البحث في الموسوعة</span>
                <Sparkles className="w-3.5 h-3.5 text-gold" />
              </h3>
              <p className="text-xs text-content-muted mt-0.5">
                {articleCount === null
                  ? 'البحث الفوري في الموسوعة'
                  : `البحث الفوري في ${articleCount.toLocaleString('ar-EG')} مقال ووثيقة`}
              </p>
            </div>
          </div>
          <button
            aria-label="اغلاق"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-nav/80 hover:bg-nav text-content-muted hover:text-content border border-line transition-all"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-line/80">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ابحث في الكتاب المقدس، التفاسير، الأطلس، اللاهوتيات..."
              autoFocus
              aria-label="ابحث في الموسوعة"
              className="w-full bg-nav/60 border border-line rounded-2xl px-5 py-4 pr-12 text-[16px] md:text-sm text-content placeholder-content-muted focus:outline-none focus:border-gold transition-all"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
            {loading && (
              <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold animate-spin" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[500px] overflow-y-auto">
          {loading && !results.length ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
              <p className="text-sm text-content-muted">جاري البحث في الفهارس...</p>
            </div>
          ) : searched && results.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-content-muted mx-auto mb-4" />
              <p className="text-sm text-content-muted">لم يتم العثور على نتائج للبحث &ldquo;{query}&rdquo;</p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-4 space-y-2">
              <div className="px-3 py-2 text-xs text-content-muted">
                تم العثور على <span className="text-gold font-bold">{total.toLocaleString()}</span> نتيجة
              </div>
              {expandedTokens && expandedTokens.length > 0 && (
                <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/25 text-[11px] text-warning/90 leading-relaxed">
                  لم يُعثر على &ldquo;{expandedTokens.join('، ')}&rdquo; ككلمة كاملة — هذه نتائج تقريبية لكلمات مشابهة.
                </div>
              )}
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    onSelectArticle(result.id);
                    onClose();
                  }}
                  className="w-full p-4 rounded-2xl bg-nav/40 hover:bg-nav/60 border border-line/60 hover:border-gold/40 text-right transition-all group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-sm font-bold text-content group-hover:text-gold transition-colors flex-1">
                      {result.title}
                    </h4>
                    {result.section_title && (
                      <span className="text-xs text-content-muted shrink-0">{result.section_title}</span>
                    )}
                  </div>
                  {result.snippet && (
                    <p className="text-xs text-content-secondary leading-relaxed line-clamp-2">
                      {result.snippet}
                    </p>
                  )}
                  {result.book_name && (
                    <div className="mt-2 text-xs text-content-muted">
                      {result.book_name} {result.chapter_num && result.chapter_num > 0 ? `- الإصحاح ${result.chapter_num}` : ''}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 text-content-muted mx-auto mb-4" />
              <p className="text-sm text-content-muted">اكتب كلمة البحث واضغط Enter أو انتظر النتائج</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
