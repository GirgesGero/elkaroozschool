'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, BookOpen, Sparkles } from 'lucide-react';
import { searchBibleEncyclopedia, type BibleSearchResult } from '@/lib/api/bible';

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
}

export default function BibleSearchModal({ isOpen, onClose, onSelectArticle, sectionId }: BibleSearchModalProps) {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    results: [],
    total: 0,
    loading: false,
    searched: false,
  });

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
      }));
    } catch (error) {
      console.error('Search error:', error);
      setSearchState(prev => ({
        ...prev,
        results: [],
        total: 0,
        loading: false,
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

  if (!isOpen) return null;

  const { query, results, total, loading, searched } = searchState;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="w-full max-w-3xl mt-20 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-[#0a101d]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#c29938]/15 border border-[#c29938]/30">
              <Search className="w-5 h-5 text-[#c29938]" />
            </div>
            <div>
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <span>البحث في الموسوعة</span>
                <Sparkles className="w-3.5 h-3.5 text-[#c29938]" />
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">البحث الفوري في 49,249 مقال ووثيقة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ابحث في الكتاب المقدس، التفاسير، الأطلس، اللاهوتيات..."
              autoFocus
              className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c29938] transition-all"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            {loading && (
              <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c29938] animate-spin" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[500px] overflow-y-auto">
          {loading && !results.length ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-[#c29938] animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-400">جاري البحث في الفهارس...</p>
            </div>
          ) : searched && results.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-sm text-slate-400">لم يتم العثور على نتائج للبحث &ldquo;{query}&rdquo;</p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-4 space-y-2">
              <div className="px-3 py-2 text-xs text-slate-400">
                تم العثور على <span className="text-[#c29938] font-bold">{total.toLocaleString()}</span> نتيجة
              </div>
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    onSelectArticle(result.id);
                    onClose();
                  }}
                  className="w-full p-4 rounded-2xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/60 hover:border-[#c29938]/40 text-right transition-all group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-[#c29938] transition-colors flex-1">
                      {result.title}
                    </h4>
                    {result.section_title && (
                      <span className="text-xs text-slate-500 shrink-0">{result.section_title}</span>
                    )}
                  </div>
                  {result.snippet && (
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                      {result.snippet}
                    </p>
                  )}
                  {result.book_name && (
                    <div className="mt-2 text-xs text-slate-500">
                      {result.book_name} {result.chapter_num && result.chapter_num > 0 ? `- الإصحاح ${result.chapter_num}` : ''}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-sm text-slate-400">اكتب كلمة البحث واضغط Enter أو انتظر النتائج</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
