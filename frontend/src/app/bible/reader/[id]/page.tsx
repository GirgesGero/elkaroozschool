'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getBibleArticle, type BibleArticle } from '@/lib/api/bible';
import { ArrowRight, ArrowLeft, Loader2, BookOpen, ChevronLeft, Copy, Check } from 'lucide-react';
import DOMPurify from 'dompurify';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import BibleSearchModal from '@/components/Bible/BibleSearchModal';
import type { Profile } from '@/types/database';

function isBinaryContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  if (/GIF8[79]a/i.test(content)) return true;
  if (/JFIF/i.test(content)) return true;
  if (/Software:\s*Microsoft Office/i.test(content)) return true;
  if (content.startsWith('\xFF\xD8\xFF') || content.startsWith('\x89PNG')) return true;
  if (content.includes('\u0000')) return true;
  const fffdCount = (content.match(/[\uFFFD]/g) || []).length;
  if (fffdCount > 5) return true;
  let badChars = 0;
  const sample = content.slice(0, 500);
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code === 0xFFFD || code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      badChars++;
    }
  }
  return badChars > 10;
}

function formatArticleProse(html: string, title?: string, slug?: string): string {
  if (!html || typeof html !== 'string') return '';

  if (isBinaryContent(html)) {
    return `<div class="archival-notice-card my-8 p-6 md:p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20 text-center">
  <div class="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-amber-500/10 text-amber-500 text-3xl shadow-inner">
    📜
  </div>
  <h3 class="text-xl font-bold text-amber-200 mb-2">${title || 'وثيقة أرشيفية'}</h3>
  <p class="text-content-secondary leading-relaxed text-sm md:text-base max-w-lg mx-auto mb-4">
    هذه المادة عبارة عن مخطط توضيحي أو وثيقة أرشيفية ملحقة ضمن النسخة التوثيقية للموسوعة الكنسية.
  </p>
  <div class="inline-block px-3 py-1 rounded-lg bg-canvas/60 border border-line text-content-muted text-xs font-mono" dir="ltr">
    ${slug || ''}
  </div>
</div>`;
  }

  // 1. Remove legacy web ad residues / broken image artifacts
  let cleaned = html
    .replace(/<p class="verse-p">\s*Image:[\s\S]*?<\/p>/gi, '')
    .replace(/<p class="verse-p">\s*صورة في\s*:?[\s\S]*?<\/p>/gi, '')
    .replace(/<p class="verse-p">\s*Arabic Bible Search[\s\S]*?<\/p>/gi, '')
    .replace(/<p class="verse-p">\s*البحث في الإنجيل[\s\S]*?<\/p>/gi, '');

  // 2. Remove legacy inline attributes that squeeze tables and text
  cleaned = cleaned
    .replace(/width=["']\d+%?["']/gi, '')
    .replace(/height=["']\d+%?["']/gi, '')
    .replace(/align=["'](right|left|center)["']/gi, '')
    .replace(/style=["'][^"']*(float|width\s*:\s*\d+)[^"']*["']/gi, '');

  // 3. Reconstitute fragmented verse-p blocks without verse numbers into cohesive paragraphs
  cleaned = cleaned.replace(/(?:<p class="verse-p">(?!<span class=["']verse-num["']>)([\s\S]*?)<\/p>\s*)+/gi, (match) => {
    const pRegex = /<p class="verse-p">([\s\S]*?)<\/p>/gi;
    let pMatch: RegExpExecArray | null;
    const pieces: string[] = [];
    while ((pMatch = pRegex.exec(match)) !== null) {
      const text = pMatch[1].trim();
      if (text) pieces.push(text);
    }
    if (pieces.length === 0) return '';

    const paragraphs: string[] = [];
    let currentParagraph = '';

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];

      // Orphan punctuation attach to previous
      if (/^[.,؛:!?()\]]+$/.test(piece) || /^[.,؛:!?)]/.test(piece)) {
        currentParagraph = (currentParagraph.trim() + piece).trim();
        continue;
      }

      const isExplicitHeader = (piece.length <= 40 && (piece.startsWith('✦') || piece.endsWith(':')));

      if (isExplicitHeader && currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }

      if (!currentParagraph) {
        currentParagraph = piece;
      } else {
        const prevTrim = currentParagraph.trim();
        const endsWithTerminal = /[.!?؛]$/.test(prevTrim);
        
        if (endsWithTerminal && currentParagraph.length > 300 && (piece.startsWith('-') || piece.startsWith('•') || piece.length > 50)) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = piece;
        } else {
          currentParagraph += ' ' + piece;
        }
      }

      if (isExplicitHeader) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }
    }

    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }

    return paragraphs
      .map(p => {
        if (p.length <= 40 && (p.startsWith('✦') || p.endsWith(':'))) {
          return `<h3 class="text-lg md:text-xl font-bold text-amber-300 mt-6 mb-3">${p}</h3>`;
        }
        return `<p class="bible-prose-p mb-4 text-justify leading-loose">${p}</p>`;
      })
      .join('\n');
  });

  return cleaned;
}

export default function ArticleReaderPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id ? parseInt(params.id as string, 10) : 0;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [article, setArticle] = useState<BibleArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

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
        // Non-blocking profile fetch for encyclopedia reader
      }
    }
    loadUserProfile();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (articleId > 1) {
      const loadArticle = async (id: number) => {
        setLoading(true);
        setError(null);
        try {
          const data = await getBibleArticle({ id });
          if (cancelled) return;
          if (!data || data.id === 1 || /avatony/i.test(data.title || '') || /avatony/i.test(data.slug || '')) {
            setError('المقال المطلوب غير متاح في الموسوعة');
            return;
          }
          setArticle(data);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
          if (cancelled) return;
          setError(err.message || 'فشل في تحميل المقال');
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };
      void loadArticle(articleId);
    } else {
      setError('المقال المطلوب غير متاح في الموسوعة');
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-4" aria-hidden="true" />
          <p className="text-content-muted">جاري جلب الوثيقة من الموسوعة...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-md bg-nav/60 p-8 rounded-3xl border border-line">
          <BookOpen className="w-12 h-12 text-content-muted mx-auto mb-4" />
          <h2 className="text-lg font-bold text-content mb-2">تعذر العثور على المقال</h2>
          <p className="text-content-muted text-sm mb-6">{error || 'المقال المطلوب غير متاح في الموسوعة'}</p>
          <button
            onClick={() => router.push('/bible')}
            className="px-6 py-2.5 rounded-xl bg-gold text-brand-on font-bold text-sm hover:bg-warning transition-all"
          >
            العودة للموسوعة
          </button>
        </div>
      </div>
    );
  }

  const formattedContent = formatArticleProse(article.content || '', article.title, article.slug);
  const sanitizedHtml =
    typeof window !== 'undefined' ? DOMPurify.sanitize(formattedContent) : '';

  return (
    <div className="min-h-screen bg-canvas" dir="rtl">
      <SmartHeader 
        profile={profile}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      <UnifiedProfileModal
        profileId={selectedProfileId}
        currentUser={profile}
        onClose={() => setSelectedProfileId(null)}
      />

      <main className="max-w-4xl mx-auto px-4 py-8 pb-28">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-between gap-2 text-xs text-content-muted mb-6 overflow-x-auto pb-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => router.push('/bible')} className="hover:text-gold transition-colors">
              الموسوعة
            </button>
            <ChevronLeft className="w-3.5 h-3.5" />
            {article.section_code ? (
              <button 
                onClick={() => router.push(`/bible/section/${article.section_code}`)}
                className="hover:text-gold transition-colors"
              >
                {article.section_title || 'القسم'}
              </button>
            ) : (
              <span>{article.section_title || 'القسم'}</span>
            )}
            <ChevronLeft className="w-3.5 h-3.5" />
            <span title={article.title} className="text-content font-medium truncate max-w-[200px]">{article.title}</span>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nav border border-line text-content-secondary hover:text-content shrink-0 transition-all text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'تم النسخ' : 'مشاركة'}</span>
          </button>
        </div>

        {/* Article Header Card */}
        <div className="p-6 md:p-8 rounded-3xl bg-nav/40 border border-line/80 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-gold font-bold mb-3">
            <span>مقال #{article.id}</span>
            {article.section_title && <span>• {article.section_title}</span>}
          </div>

          <h1 className="text-2xl md:text-4xl font-black text-content mb-4 leading-tight">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="text-base text-content-secondary mb-4 leading-relaxed">{article.subtitle}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-content-muted pt-4 border-t border-line/60">
            {article.book_name && (
              <span className="flex items-center gap-1.5 text-content-secondary">
                <BookOpen className="w-4 h-4 text-gold" />
                {article.book_name} {article.chapter_num > 0 && `- الإصحاح ${article.chapter_num}`}
              </span>
            )}
            {article.author && (
              <span>المؤلف: {article.author}</span>
            )}
          </div>
        </div>

        {/* Article Content */}
        <article className="p-4 sm:p-6 md:p-10 rounded-3xl bg-canvas border border-line/80 shadow-xl leading-loose text-content text-base md:text-lg font-normal mb-8 select-text overflow-hidden">
          <div 
            className="bible-article-body space-y-4 max-w-none overflow-x-auto break-words"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </article>

        {/* Navigation Prev / Next */}
        <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4 pt-4 border-t border-line/80">
          {article.prev_id && article.prev_id > 1 ? (
            <button
              onClick={() => router.push(`/bible/reader/${article.prev_id}`)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-nav/80 border border-line text-content-secondary hover:text-content hover:border-gold/40 transition-all text-xs font-bold"
            >
              <ArrowRight className="w-4 h-4 text-gold" />
              <span>المقال السابق</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={() => router.push('/bible')}
            className="px-4 py-2.5 rounded-xl text-xs text-content-muted hover:text-content transition-colors"
          >
            فهرس الموسوعة
          </button>

          {article.next_id && article.next_id > 1 ? (
            <button
              onClick={() => router.push(`/bible/reader/${article.next_id}`)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-nav/80 border border-line text-content-secondary hover:text-content hover:border-gold/40 transition-all text-xs font-bold"
            >
              <span>المقال التالي</span>
              <ArrowLeft className="w-4 h-4 text-gold" />
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

      <SmartBottomNav profile={profile} onOpenProfile={(id) => setSelectedProfileId(id)} />
    </div>
  );
}
