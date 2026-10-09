'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBibleArticle, type BibleArticle } from '@/lib/api/bible';
import { ArrowRight, ArrowLeft, Loader2, BookOpen, ChevronLeft, Eye, Share2, Copy, Check } from 'lucide-react';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import BibleSearchModal from '@/components/Bible/BibleSearchModal';

export default function ArticleReaderPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id ? parseInt(params.id as string, 10) : 0;

  const [article, setArticle] = useState<BibleArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (articleId > 0) {
      loadArticle(articleId);
    }
  }, [articleId]);

  const loadArticle = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBibleArticle({ id });
      setArticle(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل المقال');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#c29938] animate-spin mx-auto mb-4" />
          <p className="text-slate-400">جاري جلب الوثيقة من الموسوعة...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-md bg-slate-900/60 p-8 rounded-3xl border border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">تعذر العثور على المقال</h2>
          <p className="text-slate-400 text-sm mb-6">{error || 'المقال المطلوب غير متاح في الموسوعة'}</p>
          <button
            onClick={() => router.push('/bible')}
            className="px-6 py-2.5 rounded-xl bg-[#c29938] text-slate-950 font-bold text-sm hover:bg-amber-400 transition-all"
          >
            العودة للموسوعة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14]" dir="rtl">
      <SmartHeader 
        profile={null}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      <main className="max-w-4xl mx-auto px-4 py-8 pb-28">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-6 overflow-x-auto pb-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => router.push('/bible')} className="hover:text-[#c29938] transition-colors">
              الموسوعة
            </button>
            <ChevronLeft className="w-3.5 h-3.5" />
            {article.section_code ? (
              <button 
                onClick={() => router.push(`/bible/section/${article.section_code}`)}
                className="hover:text-[#c29938] transition-colors"
              >
                {article.section_title || 'القسم'}
              </button>
            ) : (
              <span>{article.section_title || 'القسم'}</span>
            )}
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="text-white font-medium truncate max-w-[200px]">{article.title}</span>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white shrink-0 transition-all text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'تم النسخ' : 'مشاركة'}</span>
          </button>
        </div>

        {/* Article Header Card */}
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-[#c29938] font-bold mb-3">
            <span>مقال #{article.id}</span>
            {article.section_title && <span>• {article.section_title}</span>}
          </div>

          <h1 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="text-base text-slate-300 mb-4 leading-relaxed">{article.subtitle}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-4 border-t border-slate-800/60">
            {article.book_name && (
              <span className="flex items-center gap-1.5 text-slate-300">
                <BookOpen className="w-4 h-4 text-[#c29938]" />
                {article.book_name} {article.chapter_num > 0 && `- الإصحاح ${article.chapter_num}`}
              </span>
            )}
            {article.author && (
              <span>المؤلف: {article.author}</span>
            )}
          </div>
        </div>

        {/* Article Content */}
        <article className="p-6 md:p-10 rounded-3xl bg-[#0a101d] border border-slate-800/80 shadow-xl leading-loose text-slate-200 text-base md:text-lg font-normal mb-8 select-text">
          <div 
            className="bible-article-body space-y-4 prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-200 prose-a:text-[#c29938]"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>

        {/* Navigation Prev / Next */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
          {article.prev_id ? (
            <button
              onClick={() => router.push(`/bible/reader/${article.prev_id}`)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-[#c29938]/40 transition-all text-xs font-bold"
            >
              <ArrowRight className="w-4 h-4 text-[#c29938]" />
              <span>المقال السابق</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={() => router.push('/bible')}
            className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
          >
            فهرس الموسوعة
          </button>

          {article.next_id ? (
            <button
              onClick={() => router.push(`/bible/reader/${article.next_id}`)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-[#c29938]/40 transition-all text-xs font-bold"
            >
              <span>المقال التالي</span>
              <ArrowLeft className="w-4 h-4 text-[#c29938]" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </main>

      <BibleSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectArticle={(id) => router.push(`/bible/reader/${id}`)}
      />

      <SmartBottomNav profile={null} onOpenProfile={(id) => setSelectedProfileId(id)} />
    </div>
  );
}
