'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getBibleSections, 
  getBibleSectionArticles, 
  type BibleSection,
  type BibleSectionArticleSummary 
} from '@/lib/api/bible';
import { ArrowRight, BookOpen, ChevronLeft, Loader2, Search, Grid, List, ChevronRight, FileText } from 'lucide-react';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import BibleSearchModal from '@/components/Bible/BibleSearchModal';

export default function SectionBrowserPage() {
  const params = useParams();
  const router = useRouter();
  const categoryCode = params.code as string;

  const [sections, setSections] = useState<BibleSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<BibleSection | null>(null);
  const [articles, setArticles] = useState<BibleSectionArticleSummary[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const loadSectionArticles = useCallback(async (sectionId: number, page: number = 1) => {
    setLoadingArticles(true);
    try {
      const response = await getBibleSectionArticles(sectionId, page, 24);
      setArticles(response.items || []);
      setTotalArticles(response.total || 0);
      setCurrentPage(response.page || 1);
      setTotalPages(response.total_pages || 1);
    } catch (error) {
      console.error('Failed to load section articles:', error);
      setArticles([]);
    } finally {
      setLoadingArticles(false);
    }
  }, []);

  const loadSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const data = await getBibleSections(categoryCode);
      setSections(data);
      if (data.length > 0) {
        setSelectedSection(data[0]);
        loadSectionArticles(data[0].id, 1);
      }
    } catch (error) {
      console.error('Failed to load sections:', error);
    } finally {
      setLoadingSections(false);
    }
  }, [categoryCode, loadSectionArticles]);

  useEffect(() => {
    if (categoryCode) {
      loadSections();
    }
  }, [categoryCode, loadSections]);

  const handleSelectSection = (sec: BibleSection) => {
    setSelectedSection(sec);
    setCurrentPage(1);
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

  const categoryTitle = sections[0]?.category_title || 'الموسوعة';

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
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
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
          <div className="py-20 text-center">
            <Loader2 className="w-10 h-10 text-gold animate-spin mx-auto mb-4" />
            <p className="text-sm text-content-muted">جاري تحميل وثائق القسم...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-20 text-center bg-nav/30 rounded-3xl border border-line/60 p-8">
            <BookOpen className="w-12 h-12 text-content-muted mx-auto mb-4" />
            <p className="text-content-muted">لا توجد وثائق في هذا القسم حالياً</p>
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
              disabled={currentPage <= 1 || loadingArticles}
              onClick={() => {
                const nextP = currentPage - 1;
                setCurrentPage(nextP);
                if (selectedSection) loadSectionArticles(selectedSection.id, nextP);
              }}
              className="px-4 py-2 rounded-xl bg-nav border border-line text-xs text-content-secondary hover:text-content disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <span className="text-xs text-content-muted px-3">
              صفحة <span className="text-content font-bold">{currentPage}</span> من <span className="text-content font-bold">{totalPages}</span>
            </span>

            <button
              disabled={currentPage >= totalPages || loadingArticles}
              onClick={() => {
                const nextP = currentPage + 1;
                setCurrentPage(nextP);
                if (selectedSection) loadSectionArticles(selectedSection.id, nextP);
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
