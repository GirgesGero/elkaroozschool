'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  getBibleCategories,
  getBibleSections, 
  getBibleSectionArticles, 
  type BibleSection,
  type BibleSectionArticleSummary 
} from '@/lib/api/bible';
import { ArrowRight, BookOpen, ChevronLeft, Loader2, Search, Grid, List, ChevronRight, FileText } from 'lucide-react';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import BibleSearchModal from '@/components/Bible/BibleSearchModal';

function SectionBrowserContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryCode = params.code as string;

  const [sections, setSections] = useState<BibleSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<BibleSection | null>(null);
  const [articles, setArticles] = useState<BibleSectionArticleSummary[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);

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
  const initialQueryRef = useRef(searchParams.toString());

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
        if (categorySections.length > 0) {
          initialSection = categorySections[0];
        }
      }

      if (requestId !== sectionRequestRef.current) return;
      setSections(categorySections);

      // Check URL searchParams for section deep-link
      const sectionParam = new URLSearchParams(initialQueryRef.current).get('section');
      const pageParam = parseInt(new URLSearchParams(initialQueryRef.current).get('page') || '1', 10) || 1;

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
      loadSections();
    }
  }, [categoryCode, loadSections]);

  // Synchronize selectedSection and currentPage to URL searchParams
  useEffect(() => {
    if (!selectedSection) return;
    const urlParams = new URLSearchParams(searchParams.toString());
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
    const newUrl = q
      ? `/bible/section/${categoryCode}?${q}`
      : `/bible/section/${categoryCode}`;
    const currentUrl = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '';
    if (currentUrl !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [selectedSection, currentPage, categoryCode, router, searchParams]);

  // Listen to searchParams changes for browser back/forward navigation
  useEffect(() => {
    const secParam = searchParams.get('section');
    if (secParam && sections.length > 0) {
      const targetSec = sections.find(
        (s) => s.code === secParam || String(s.id) === secParam
      );
      if (targetSec && targetSec.id !== selectedSection?.id) {
        const nextQuery = new URLSearchParams(searchParams.toString()).toString();
        if (nextQuery === initialQueryRef.current) return;
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
    if (pParam !== currentPage && selectedSection) {
      setCurrentPage(pParam);
      const pageKey = `${selectedSection.id}:${pParam}`;
      if (loadedKeyRef.current !== pageKey) {
        loadedKeyRef.current = pageKey;
        loadSectionArticles(selectedSection.id, pParam);
      }
    }
  }, [searchParams, sections, selectedSection, currentPage, loadSectionArticles]);

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
        profile={null}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-content-muted mb-3">
              <button onClick={() => router.push('/bible')} className="hover:text-gold transition-colors">
                الموسوعة الكنسية
              </button>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-content font-bold">{categoryTitle}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-content">
              {categoryTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-nav/80 border border-line text-content-secondary hover:text-content hover:border-gold/40 transition-all text-sm"
            >
              <Search className="w-4 h-4 text-gold" />
              <span className="hidden sm:inline">بحث في القسم</span>
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

        {/* Selected Section Header */}
        {selectedSection && (
          <div className="mb-6 flex items-center justify-between border-b border-line/80 pb-4">
            <div>
              <h2 className="text-xl font-bold text-content flex items-center gap-2">
                <span>{selectedSection.icon}</span>
                <span>{selectedSection.title}</span>
              </h2>
              {selectedSection.description && (
                <p className="text-sm text-content-muted mt-1">{selectedSection.description}</p>
              )}
            </div>
            <div className="text-xs text-content-muted">
              إجمالي: <span className="text-gold font-bold">{totalArticles.toLocaleString()}</span> وثيقة
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
        ) : articles.length === 0 ? (
          <div className="py-20 text-center bg-nav/30 rounded-3xl border border-line/60 p-8">
            <BookOpen className="w-12 h-12 text-content-muted mx-auto mb-4" />
            <p className="text-content-muted">لا توجد وثائق في هذا القسم حالياً</p>
            <button onClick={() => setIsSearchOpen(true)} className="mt-4 px-4 py-2 rounded-xl bg-gold text-brand-on text-xs font-bold">ابحث في كل الموسوعة</button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {articles.map((art) => (
              <button
                key={art.id}
                onClick={() => router.push(`/bible/reader/${art.id}`)}
                className="p-5 rounded-2xl bg-nav/40 hover:bg-nav/80 border border-line/80 hover:border-gold/40 text-right transition-all group flex flex-col justify-between h-40"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-content-muted mb-2">
                    <FileText className="w-3.5 h-3.5 text-gold" />
                    <span>مقال #{art.id}</span>
                  </div>
                  <h3 className="text-sm font-bold text-content group-hover:text-gold transition-colors line-clamp-2 leading-relaxed">
                    {art.title}
                  </h3>
                </div>
                {art.book && (
                  <div className="text-xs text-content-muted mt-2 flex items-center justify-between border-t border-line/40 pt-2">
                    <span className="truncate">{art.book}</span>
                    {art.ch && art.ch > 0 ? (
                      <span className="text-gold shrink-0 font-medium">إصحاح {art.ch}</span>
                    ) : null}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map((art) => (
              <button
                key={art.id}
                onClick={() => router.push(`/bible/reader/${art.id}`)}
                className="w-full p-4 rounded-xl bg-nav/40 hover:bg-nav/60 border border-line/60 hover:border-gold/40 text-right transition-all group flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-nav/60 text-gold shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-content group-hover:text-gold transition-colors truncate">
                      {art.title}
                    </h3>
                    {art.book && (
                      <p className="text-xs text-content-muted mt-0.5">
                        {art.book} {art.ch && art.ch > 0 ? `- إصحاح ${art.ch}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-content-muted group-hover:text-gold transition-colors shrink-0" />
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

      <SmartBottomNav profile={null} onOpenProfile={(id) => setSelectedProfileId(id)} />
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
