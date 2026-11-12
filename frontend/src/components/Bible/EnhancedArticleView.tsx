'use client';

import { useEffect, useState, useRef } from 'react';
import BibleReadingToolbar from '@/components/Bible/BibleReadingToolbar';
import '../../styles/bible-article.css';

interface EnhancedArticleViewProps {
  title: string;
  content: string;
  hasToc?: boolean;
  sectionCode?: string;
}

export default function EnhancedArticleView({
  title,
  content,
  hasToc = false,
  sectionCode
}: EnhancedArticleViewProps) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const articleRef = useRef<HTMLDivElement>(null);

  // مراقبة التمرير لزر "رجوع للأعلى" ومؤشر التقدم
  useEffect(() => {
    const handleScroll = () => {
      // زر رجوع للأعلى
      setShowBackToTop(window.scrollY > 400);

      // مؤشر تقدم القراءة
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const trackLength = documentHeight - windowHeight;
      const progress = (scrollTop / trackLength) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // تمرير سلس عند النقر على روابط TOC
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const id = target.getAttribute('href')?.slice(1);
        if (id) {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
            // تحديث URL بدون إعادة تحميل
            window.history.pushState(null, '', `#${id}`);
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  // التمرير إلى القسم من URL عند التحميل
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {/* مؤشر تقدم القراءة */}
      <div className="reading-progress" role="progressbar" aria-valuenow={readingProgress} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="reading-progress-bar"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* المحتوى */}
      <div className={hasToc ? 'bible-article-container' : ''}>
        <article
          ref={articleRef}
          className="bible-article"
          itemScope
          itemType="https://schema.org/Article"
        >
          {/* العنوان وشريط أدوات القراءة */}
          <header className="mb-8 pb-6 border-b border-line/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              {sectionCode ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-nav/80 border border-line text-xs font-bold text-gold w-fit">
                  <span>📚 {sectionCode}</span>
                </div>
              ) : <div />}
              <BibleReadingToolbar variant="inline" />
            </div>

            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-black text-content leading-tight"
              style={{
                fontFamily: 'var(--bible-font-family)',
              }}
              itemProp="headline"
            >
              {title}
            </h1>
          </header>

          {/* المحتوى المعالج */}
          <div
            className="article-content"
            itemProp="articleBody"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* معلومات Schema.org */}
          <meta itemProp="inLanguage" content="ar" />
          <meta itemProp="datePublished" content={new Date().toISOString()} />
        </article>
      </div>

      {/* زر رجوع للأعلى */}
      <button
        className={`back-to-top ${showBackToTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="رجوع للأعلى"
        title="رجوع للأعلى"
      >
        ⬆️
      </button>
    </>
  );
}
