'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  getBibleCategories,
  getBibleSections, 
  getBibleSectionArticles, 
  type BibleSection,
  type BibleSectionArticleSummary 
} from '@/lib/api/bible';
import { ENCYCLOPEDIA_SECTIONS } from '@/lib/bible/encyclopedia-sections';
import { ArrowRight, BookOpen, ChevronLeft, Loader2, Search, Grid, List, ChevronRight, FileText } from 'lucide-react';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import BibleSearchModal from '@/components/Bible/BibleSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import BibleReadingToolbar from '@/components/Bible/BibleReadingToolbar';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

function SectionBrowserContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearchParamsRef = useRef(searchParams);
  const categoryCode = params.code as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [sections, setSections] = useState<BibleSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<BibleSection | null>(null);
  const [articles, setArticles] = useState<BibleSectionArticleSummary[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [filterQuery, setFilterQuery] = useState('');

  const filteredArticles = useMemo(() => {
    if (!filterQuery.trim()) return articles;
    const q = filterQuery.trim().toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.book && a.book.toLowerCase().includes(q)) ||
        String(a.id).includes(q)
    );
  }, [articles, filterQuery]);

  const initialPage = parseInt(searchParams.get('page') || '1', 10) || 1;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const articleRequestRef = useRef(0);
  const sectionRequestRef = useRef(0);
  const loadedKeyRef = useRef<string | null>(null);
  const lastHandledQueryRef = useRef<string | null>(null);
  const selectedSectionRef = useRef<BibleSection | null>(null);
  selectedSectionRef.current = selectedSection;
  const currentPageRef = useRef<number>(initialPage);
  currentPageRef.current = currentPage;

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (userProfile) {
            setProfile(userProfile as Profile);
          }
        }
      } catch {
        // Non-blocking profile fetch for section browser
      }
    }
    void loadUserProfile();
  }, []);

  const loadSectionArticles = useCallback(async (sectionId: number, page: number = 1) => {
    const requestId = ++articleRequestRef.current;
    setLoadingArticles(true);
    try {
      const response = await getBibleSectionArticles(sectionId, page, 24);
      if (requestId !== articleRequestRef.current) return;
      setArticles(response.items || []);
      setTotalArticles(response.total || 0);
      setCurrentPage(response.page || 1);
      setTotalPages(response.total_pages || 1);
    } catch (error) {
      if (requestId !== articleRequestRef.current) return;
      console.error('Failed to load section articles:', error);
      setArticles([]);
      setTotalArticles(0);
    } finally {
      if (requestId === articleRequestRef.current) setLoadingArticles(false);
    }
  }, []);

  const loadSections = useCallback(async () => {
    const requestId = ++sectionRequestRef.current;
    setLoadingSections(true);
    try {
      const allSections = await getBibleSections();
      if (requestId !== sectionRequestRef.current) return;
      const directMatch = allSections.find(
        (s) => s.code === categoryCode || String(s.id) === categoryCode
      );

      let categorySections: BibleSection[] = [];
      let initialSection: BibleSection | null = null;

      if (directMatch) {
        const cats = await getBibleCategories();
        const parentCat = cats.find((c) => c.id === directMatch.category_id);
        categorySections = await getBibleSections(parentCat?.code);
        initialSection = directMatch;
      } else {
        categorySections = await getBibleSections(categoryCode);
        if (categorySections.length === 0) {
          const encGroup = ENCYCLOPEDIA_SECTIONS.find((g) => g.id === categoryCode);
          if (encGroup) {
            categorySections = encGroup.sectionCodes
              .map((code) => allSections.find((s) => s.code === code))
              .filter((s): s is BibleSection => Boolean(s));
          }
        }
        if (categorySections.length > 0) {
          initialSection = categorySections[0];
        }
      }

      if (requestId !== sectionRequestRef.current) return;
      setSections(categorySections);

      // Check URL searchParams for section deep-link
      const sectionParam = initialSearchParamsRef.current.get('section');
      const pageParam = parseInt(initialSearchParamsRef.current.get('page') || '1', 10) || 1;

      if (sectionParam) {
        const matchedFromParam =
          categorySections.find(
            (s) => s.code === sectionParam || String(s.id) === sectionParam
          ) ||
          allSections.find(
            (s) => s.code === sectionParam || String(s.id) === sectionParam
          );
        if (matchedFromParam) {
          initialSection = matchedFromParam;
        }
      }

      if (initialSection) {
        setSelectedSection(initialSection);
        setCurrentPage(pageParam);
        const initialKey = `${initialSection.id}:${pageParam}`;
        if (loadedKeyRef.current !== initialKey) {
          loadedKeyRef.current = initialKey;
          loadSectionArticles(initialSection.id, pageParam);
        }
      }
    } catch (error) {
      if (requestId !== sectionRequestRef.current) return;
      console.error('Failed to load sections:', error);
    } finally {
      if (requestId === sectionRequestRef.current) setLoadingSections(false);
    }
  }, [categoryCode, loadSectionArticles]);

  useEffect(() => {
    if (categoryCode) {
      void loadSections();
    }
  }, [categoryCode, loadSections]);

  // Synchronize selectedSection and currentPage to URL searchParams
  useEffect(() => {
    if (!selectedSection) return;
    const rawSearch = typeof window !== 'undefined' ? window.location.search : '';
    const urlParams = new URLSearchParams(rawSearch);
    let changed = false;

    const currentSectionCode = selectedSection.code || String(selectedSection.id);
    if (urlParams.get('section') !== currentSectionCode) {
      urlParams.set('section', currentSectionCode);
      changed = true;
    }

    if (currentPage > 1) {
      if (urlParams.get('page') !== String(currentPage)) {
        urlParams.set('page', String(currentPage));
        changed = true;
      }
    } else {
      if (urlParams.has('page')) {
        urlParams.delete('page');
        changed = true;
      }
    }

    if (!changed) return;
    const q = urlParams.toString();
    lastHandledQueryRef.current = q;
    const newUrl = q
      ? `/bible/section/${categoryCode}?${q}`
      : `/bible/section/${categoryCode}`;
    const currentUrl = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '';
    if (currentUrl !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [selectedSection, currentPage, categoryCode, router]);

  // Listen to searchParams changes for browser back/forward navigation
  useEffect(() => {
    if (sections.length === 0) return;
    const nextQuery = new URLSearchParams(searchParams.toString()).toString();
    if (lastHandledQueryRef.current === nextQuery) return;
    lastHandledQueryRef.current = nextQuery;

    const activeSec = selectedSectionRef.current;
    const activePage = currentPageRef.current;
    const secParam = searchParams.get('section');
    if (secParam) {
      const targetSec = sections.find(
        (s) => s.code === secParam || String(s.id) === secParam
      );
      if (targetSec && targetSec.id !== activeSec?.id) {
        setSelectedSection(targetSec);
        const p = parseInt(searchParams.get('page') || '1', 10) || 1;
        setCurrentPage(p);
        const targetKey = `${targetSec.id}:${p}`;
        if (loadedKeyRef.current !== targetKey) {
          loadedKeyRef.current = targetKey;
          loadSectionArticles(targetSec.id, p);
        }
        return;
      }
    }

    const pParam = parseInt(searchParams.get('page') || '1', 10) || 1;
    if (pParam !== activePage && activeSec) {
      setCurrentPage(pParam);
      const pageKey = `${activeSec.id}:${pParam}`;
      if (loadedKeyRef.current !== pageKey) {
        loadedKeyRef.current = pageKey;
        loadSectionArticles(activeSec.id, pParam);
      }
    }
  }, [searchParams, sections, loadSectionArticles]);

  const handleSelectSection = (sec: BibleSection) => {
    if (selectedSection?.id === sec.id && currentPage === 1) return;
    setSelectedSection(sec);
    setCurrentPage(1);
    setArticles([]);
    loadedKeyRef.current = `${sec.id}:1`;
    loadSectionArticles(sec.id, 1);
  };

  if (loadingSections) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-4" />
          <p className="text-content-muted">جاري تحميل الأقسام...</p>
        </div>
      </div>
    );
  }

  const categoryTitle = selectedSection?.category_title || sections[0]?.category_title || 'الموسوعة الكنسية';

  return (
    <div className="min-h-screen bg-canvas" dir="rtl">
      <SmartHeader 
        profile={profile}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-content-muted mb-3">
              <button onClick={() => router.push('/bible')} className="hover:text-gold transition-colors">
                الموسوعة الكنسية
              </button>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-content font-bold">{categoryTitle}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-content">
              {categoryTitle}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BibleReadingToolbar variant="inline" />
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-nav/80 border border-line text-content-secondary hover:text-content hover:border-gold/40 transition-all text-xs font-bold"
            >
              <Search className="w-4 h-4 text-gold" />
              <span className="hidden sm:inline">بحث عام</span>
            </button>
            <div className="flex items-center gap-1 border border-line rounded-xl p-1 bg-nav/60">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-gold text-brand-on font-bold'
                    : 'text-content-muted hover:text-content'
                }`}
                title="عرض شبكي"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-gold text-brand-on font-bold'
                    : 'text-content-muted hover:text-content'
                }`}
                title="عرض قائمة"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Section Tabs / Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none snap-x snap-mandatory" style={{ WebkitMaskImage: "linear-gradient(to left, transparent, black 16px, black calc(100% - 16px), transparent)" } as any}>
          {sections.map((sec) => {
            const isSelected = selectedSection?.id === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => handleSelectSection(sec)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? 'bg-gold text-brand-on shadow-lg shadow-gold/20'
                    : 'bg-nav/60 border border-line text-content-secondary hover:border-line hover:text-content'
                }`}
              >
                <span>{sec.icon || '📁'}</span>
                <span>{sec.title}</span>
                {sec.doc_count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    isSelected ? 'bg-nav/20 text-content' : 'bg-nav text-content-muted'
                  }`}>
                    {sec.doc_count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Section Header with In-Section Filter */}
        {selectedSection && (
          <div className="mb-6 p-5 rounded-3xl bg-nav/50 border border-line/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-2 rounded-2xl bg-canvas border border-line/60 shadow-sm">{selectedSection.icon || '📁'}</span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-content flex items-center gap-2">
                    <span>{selectedSection.title}</span>
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-content-muted mt-1">
                    <span>إجمالي: <strong className="text-gold">{totalArticles.toLocaleString()}</strong> وثيقة</span>
                    <span>•</span>
                    <span>صفحة {currentPage} من {totalPages}</span>
                  </div>
                </div>
              </div>
              {selectedSection.description && (
                <p className="text-xs sm:text-sm text-content-muted mt-2.5 max-w-2xl leading-relaxed">{selectedSection.description}</p>
              )}
            </div>

            {/* In-section live filter input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
              <input
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="تصفية سريعة في العناوين..."
                aria-label="تصفية في عناوين هذا القسم"
                className="w-full bg-canvas border border-line rounded-xl pr-10 pl-3 py-2 text-xs text-content placeholder:text-content-muted focus:border-gold focus:outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Articles List / Grid */}
        {loadingArticles ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" aria-busy="true" aria-label="جاري التحميل">
            {[1,2,3,4,5,6,7,8].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-nav/40 border border-line/60 h-40 animate-pulse">
                <div className="h-3 w-16 bg-line/60 rounded mb-3" />
                <div className="h-4 w-full bg-line/40 rounded mb-2" />
                <div className="h-4 w-3/4 bg-line/40 rounded" />
              </div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-20 text-center bg-nav/30 rounded-3xl border border-line/60 p-8">
            <BookOpen className="w-12 h-12 text-content-muted mx-auto mb-4" />
            <p className="text-content-muted">{filterQuery ? 'لا توجد نتائج مطابقة لبحثك في هذا القسم' : 'لا توجد وثائق في هذا القسم حالياً'}</p>
            {filterQuery ? (
              <button onClick={() => setFilterQuery('')} className="mt-4 px-4 py-2 rounded-xl bg-canvas border border-line text-xs font-bold text-gold hover:border-gold">مسح التصفية</button>
            ) : (
              <button onClick={() => setIsSearchOpen(true)} className="mt-4 px-4 py-2 rounded-xl bg-gold text-brand-on text-xs font-bold">ابحث في كل الموسوعة</button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredArticles.map((art) => (
              <button
                key={art.id}
                onClick={() => router.push(`/bible/reader/${art.id}`)}
                className="bible-section-card group relative p-5 rounded-2xl bg-nav/50 hover:bg-nav/95 border border-line/80 hover:border-gold/60 shadow-md hover:shadow-xl text-right transition-all flex flex-col justify-between min-h-[155px] hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-content-muted mb-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-canvas border border-line/60 font-mono text-[10px] text-gold font-bold">
                      <FileText className="w-3 h-3" />
                      #{art.id}
                    </span>
                    {art.book && (
                      <span className="text-[11px] text-content-secondary truncate max-w-[120px]">
                        {art.book}
                      </span>
                    )}
                  </div>
                  <h3
                    className="font-bold text-content group-hover:text-gold transition-colors line-clamp-3 leading-relaxed"
                    style={{
                      fontSize: 'calc(var(--bible-font-size, 20px) * 0.85)',
                      lineHeight: '1.5',
                      fontFamily: 'var(--bible-font-family)'
                    }}
                  >
                    {art.title}
                  </h3>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-line/50 pt-2.5 mt-3 text-xs">
                  {art.ch && art.ch > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-gold/10 text-gold text-[10px] font-bold">
                      إصحاح {art.ch}
                    </span>
                  ) : (
                    <span className="text-[10px] text-content-muted">وثيقة معتمدة</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold group-hover:translate-x-[-2px] transition-transform">
                    <span>قراءة</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredArticles.map((art) => (
              <button
                key={art.id}
                onClick={() => router.push(`/bible/reader/${art.id}`)}
                className="w-full p-4 rounded-2xl bg-nav/50 hover:bg-nav/95 border border-line/70 hover:border-gold/50 text-right transition-all group flex items-center justify-between gap-4 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-xl bg-canvas border border-line font-mono text-xs text-gold font-bold shrink-0">
                    #{art.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="font-bold text-content group-hover:text-gold transition-colors truncate"
                      style={{
                        fontSize: 'calc(var(--bible-font-size, 20px) * 0.85)',
                        fontFamily: 'var(--bible-font-family)'
                      }}
                    >
                      {art.title}
                    </h3>
                    {art.book && (
                      <p className="text-xs text-content-muted mt-0.5">
                        {art.book} {art.ch && art.ch > 0 ? `- إصحاح ${art.ch}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-block px-3 py-1 rounded-xl bg-gold/15 text-gold text-xs font-bold">
                    قراءة الوثيقة
                  </span>
                  <ChevronLeft className="w-4 h-4 text-gold group-hover:translate-x-[-2px] transition-transform" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              aria-label="الصفحة السابقة"
              disabled={currentPage <= 1 || loadingArticles}
              onClick={() => {
                const nextP = currentPage - 1;
                setCurrentPage(nextP);
                if (selectedSection) loadSectionArticles(selectedSection.id, nextP);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2 rounded-xl bg-nav border border-line text-xs text-content-secondary hover:text-content disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <span aria-live="polite" className="text-xs text-content-muted px-3">
              صفحة <span className="text-content font-bold">{currentPage}</span> من <span className="text-content font-bold">{totalPages}</span>
            </span>

            <button
              aria-label="الصفحة التالية"
              disabled={currentPage >= totalPages || loadingArticles}
              onClick={() => {
                const nextP = currentPage + 1;
                setCurrentPage(nextP);
                if (selectedSection) loadSectionArticles(selectedSection.id, nextP);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2 rounded-xl bg-nav border border-line text-xs text-content-secondary hover:text-content disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      <BibleSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectArticle={(id) => router.push(`/bible/reader/${id}`)}
        sectionId={selectedSection?.id}
      />

      <UnifiedProfileModal profileId={selectedProfileId} currentUser={profile} onClose={() => setSelectedProfileId(null)} />
      <SmartBottomNav profile={profile} onOpenProfile={(id) => setSelectedProfileId(id)} />
    </div>
  );
}

export default function SectionBrowserPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center" dir="rtl">
          <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-4" />
        </div>
      }
    >
      <SectionBrowserContent />
    </Suspense>
  );
}
