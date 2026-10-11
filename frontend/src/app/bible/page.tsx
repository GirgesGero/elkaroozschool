'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import WingSelector from '@/components/Bible/WingSelector';
import BibleSearchModal from '@/components/Bible/BibleSearchModal';
import { getBibleCategories, getBibleStats, getBibleSections, type BibleCategory } from '@/lib/api/bible';
import {
  AlertCircle,
  ArrowRight,
  Book,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Info,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Volume2,
  X,
  Map,
  Church,
  Layers,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface EncyclopediaState {
  categories: BibleCategory[];
  stats: any;
  searchOpen: boolean;
  loading: boolean;
}

interface Testament {
  id: number;
  code: string;
  name_ar: string;
}

interface BibleBook {
  id: number;
  testament_id: number;
  code: string;
  name_ar: string;
  chapters_count: number;
}

interface VerseWord {
  id: number;
  word_position: number;
  word_text: string;
  has_commentary: boolean;
}

interface BibleVerse {
  id: number;
  verse_number: number;
  text_ar: string;
  source_url: string;
  words: VerseWord[];
  commentaries_count: number;
}

interface WordDetailData {
  word_text: string;
  clean_word: string;
  word_commentaries: Array<{
    id: number;
    explanation_title: string;
    explanation_text: string;
    source_name: string;
    author_name: string;
    source_url: string;
  }>;
  dictionary_entries: Array<{
    id: string;
    term: string;
    title: string;
    original_content: string;
    author_name: string;
    source_url: string;
  }>;
}

interface VerseCommentary {
  id: number;
  source_id: string;
  commentary_title: string;
  commentary_text: string;
  source_url: string;
  source?: {
    author_name: string;
    source_name: string;
  };
}

export default function BiblePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  // View Mode: 'hub' (Encyclopedia Wings) or 'reader' (Bible Verses)
  const [viewMode, setViewMode] = useState<'hub' | 'reader'>('hub');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Encyclopedia State
  const [encyclopedia, setEncyclopedia] = useState<EncyclopediaState>({
    categories: [],
    stats: null,
    searchOpen: false,
    loading: true,
  });
  
  // Bible Reader State (existing Supabase-based)
  const [testaments, setTestaments] = useState<Testament[]>([]);
  const [selectedTestamentId, setSelectedTestamentId] = useState<number>(1);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number>(1);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVerses, setLoadingVerses] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Word Interaction Modal State
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [wordDetails, setWordDetails] = useState<WordDetailData | null>(null);
  const [loadingWordDetails, setLoadingWordDetails] = useState(false);

  // Verse Full Commentary Panel State
  const [selectedVerseForCommentary, setSelectedVerseForCommentary] = useState<BibleVerse | null>(
    null
  );
  const [verseCommentaries, setVerseCommentaries] = useState<VerseCommentary[]>([]);
  const [loadingCommentary, setLoadingCommentary] = useState(false);

  // Load Encyclopedia Data
  useEffect(() => {
    loadEncyclopediaData();
  }, []);

  const loadEncyclopediaData = async () => {
    try {
      const [categories, stats] = await Promise.all([
        getBibleCategories(),
        getBibleStats(),
      ]);
      setEncyclopedia({
        categories,
        stats,
        searchOpen: false,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load encyclopedia:', error);
      setEncyclopedia(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSelectCategory = (categoryCode: string) => {
    if (categoryCode === 'bible') {
      // Switch to Bible verse reader mode
      setViewMode('reader');
    } else {
      // Navigate to section browser
      router.push(`/bible/section/${categoryCode}`);
    }
  };

  const handleSelectArticle = (articleId: number) => {
    router.push(`/bible/reader/${articleId}`);
  };

  // 1. Initial Load: Testaments & Books & User
  useEffect(() => {
    async function loadTestamentsAndBooks() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (pData) setProfile(pData as Profile);
      }

      const { data: testList } = await supabase
        .from('bible_testaments')
        .select('*')
        .order('order_index');

      const { data: bookList } = await supabase
        .from('bible_books')
        .select('*')
        .order('order_index');

      if (testList && testList.length > 0) setTestaments(testList);
      if (bookList && bookList.length > 0) {
        setBooks(bookList);
        setSelectedBookId(bookList[0].id);
      }

      setLoading(false);
    }

    loadTestamentsAndBooks();
  }, []);

  // 2. Load Chapter Verses with Word Breakdown (Only in Reader view mode)
  useEffect(() => {
    if (viewMode !== 'reader' || !selectedBookId || !selectedChapter) return;

    async function loadChapter() {
      setLoadingVerses(true);
      try {
        const supabase = createClient();
        const { data: vList, error } = await supabase.rpc('get_chapter_verses_with_words', {
          p_book_id: selectedBookId,
          p_chapter_number: selectedChapter,
        });

        if (!error && vList) {
          setVerses((vList as BibleVerse[]) || []);
        } else {
          setVerses([]);
        }
      } catch (err) {
        setVerses([]);
      } finally {
        setLoadingVerses(false);
      }
    }

    loadChapter();
  }, [viewMode, selectedBookId, selectedChapter]);

  // 3. Handle Word Click -> Fetch Contextual Commentary + Dictionary
  const handleWordClick = async (word: VerseWord) => {
    setSelectedWordId(word.id);
    setLoadingWordDetails(true);
    try {
      const supabase = createClient();
      const { data: details, error } = await supabase.rpc('get_word_details', {
        p_word_id: word.id,
      });

      if (!error && details) {
        setWordDetails((details as WordDetailData) || null);
      } else {
        setWordDetails(null);
      }
    } catch (err) {
      setWordDetails(null);
    } finally {
      setLoadingWordDetails(false);
    }
  };

  // 4. Handle Verse Commentary Click
  const handleVerseCommentaryClick = async (verse: BibleVerse) => {
    setSelectedVerseForCommentary(verse);
    setLoadingCommentary(true);
    try {
      const supabase = createClient();
      const { data: comList, error } = await supabase
        .from('bible_commentaries')
        .select('*, source:bible_sources(author_name, source_name)')
        .eq('verse_id', verse.id);

      if (!error && comList) {
        setVerseCommentaries((comList as VerseCommentary[]) || []);
      } else {
        setVerseCommentaries([]);
      }
    } catch (err) {
      setVerseCommentaries([]);
    } finally {
      setLoadingCommentary(false);
    }
  };

  // 5. Handle Global Bible Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    const supabase = createClient();
    const { data: res } = await supabase.rpc('search_bible_content', {
      p_query: searchQuery.trim(),
      p_limit: 25,
    });

    setSearchResults((res as any[]) || []);
    setIsSearching(false);
    setShowSearchModal(true);
  };

  const currentBook = books.find((b) => b.id === selectedBookId);
  const filteredBooks = books.filter((b) => b.testament_id === selectedTestamentId);

  return (
    <div className="min-h-screen bg-canvas text-content flex flex-col selection:bg-gold selection:text-content" dir="rtl">
      {/* Smart Unified Header */}
      <SmartHeader
        profile={profile}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      {/* Global Search Dialog */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      {/* Unified Profile Modal */}
      <UnifiedProfileModal
        profileId={selectedProfileId}
        currentUser={profile}
        onClose={() => setSelectedProfileId(null)}
      />

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6 pb-28 md:pb-12">
        {/* Banner & Search */}
        <div className="bg-nav border border-line rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-warning mb-1 text-xs font-semibold">
              <BookOpen className="w-4 h-4" />
              <span>مستودع نصوص وتفاسير موقع الأنبا تكلا هيمانوت المعتمد</span>
            </div>
            <h1 className="text-xl font-bold text-content">الكتاب المقدس والشروحات الآبائية</h1>
            <p className="text-xs text-content-muted mt-1">
              انقر على أي كلمة لعرض معناها وقاموسها، أو انقر على رقم الآية لعرض تفاسير الآباء كاملة.
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full md:w-auto flex items-center gap-2">
                      <div className="relative flex-1 md:w-64">
                        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="ابحث في الآيات والتفاسير..."
                          aria-label="ابحث في الآيات والتفاسير"
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-xl pr-10 pl-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="flex min-h-[44px] items-center rounded-xl bg-[var(--brand-primary)] text-[var(--brand-primary-text)] px-4 text-xs font-bold transition-colors"
                      >
                        بحث
                      </button>
                    </form>
        </div>

        {/* Navigation Selector: Testament -> Book -> Chapter */}
        <div className="bg-nav border border-line rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Testament Toggle */}
            <div className="flex bg-nav p-1 rounded-xl border border-line">
              {testaments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTestamentId(t.id);
                    const firstB = books.find((b) => b.testament_id === t.id);
                    if (firstB) {
                      setSelectedBookId(firstB.id);
                      setSelectedChapter(1);
                    }
                  }}
                  className={`flex min-h-[44px] items-center rounded-lg px-3.5 text-xs font-bold transition-colors ${
                                      selectedTestamentId === t.id
                                        ? 'text-[var(--brand-primary-text)] shadow'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                    style={{
                                      backgroundColor: selectedTestamentId === t.id
                                        ? 'var(--brand-primary)'
                                        : 'var(--bg-card-hover)',
                                    }}
                >
                  {t.name_ar}
                </button>
              ))}
            </div>

            {/* Book Selector */}
            <select
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(parseInt(e.target.value));
                setSelectedChapter(1);
              }}
              className="bg-nav border border-line text-content text-xs rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:ring-1 focus:ring-warning"
            >
              {filteredBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  سفر {b.name_ar}
                </option>
              ))}
            </select>

            {/* Chapter Selector */}
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
              className="bg-nav border border-line text-content text-xs rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:ring-1 focus:ring-warning"
            >
              {Array.from({ length: currentBook?.chapters_count || 1 }, (_, i) => i + 1).map(
                (ch) => (
                  <option key={ch} value={ch}>
                    الإصحاح {ch}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Chapter Quick Pagination */}
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={selectedChapter <= 1}
                        onClick={() => setSelectedChapter((prev) => prev - 1)}
                        className="flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-xs font-bold transition-colors disabled:opacity-40"
                        style={{
                          backgroundColor: 'var(--btn-secondary-bg)',
                          color: 'var(--btn-secondary-text)',
                        }}
                      >
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        <span>الإصحاح السابق</span>
                      </button>
                      <button
                        disabled={selectedChapter >= (currentBook?.chapters_count || 1)}
                        onClick={() => setSelectedChapter((prev) => prev + 1)}
                        className="flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-xs font-bold transition-colors disabled:opacity-40"
                        style={{
                          backgroundColor: 'var(--btn-secondary-bg)',
                          color: 'var(--btn-secondary-text)',
                        }}
                      >
                        <span>الإصحاح التالي</span>
                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
        </div>

        {/* --- CHAPTER VERSES DISPLAY --- */}
        <div className="bg-nav border border-line rounded-2xl p-6 shadow-md space-y-6">
          <div className="text-center pb-4 border-b border-line">
            <h2 className="text-xl font-bold text-gold">
              سفر {currentBook?.name_ar} — الإصحاح {selectedChapter}
            </h2>
          </div>

          {loadingVerses ? (
            <div className="py-16 text-center text-warning">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            </div>
          ) : verses.length === 0 ? (
            <div className="py-12 text-center text-content-muted text-xs">
              جاري تجهيز باقي إصحاحات السفر من خادم المحتوى.
            </div>
          ) : (
            <div className="space-y-4">
              {verses.map((verse) => (
                <div
                  key={verse.id}
                  className="p-4 rounded-xl bg-nav/60 border border-line/80 hover:border-line transition-all flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerseCommentaryClick(verse)}
                        className="w-7 h-7 rounded-lg bg-canvas/60 border border-warning/60 text-warning font-mono font-bold text-xs flex items-center justify-center hover:bg-canvas transition-colors"
                        title="عرض تفسير الآية كاملاً"
                      >
                        {verse.verse_number}
                      </button>
                      <button
                        onClick={() => handleVerseCommentaryClick(verse)}
                        className="text-[11px] text-warning/80 hover:text-warning flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>التفاسير ({verse.commentaries_count})</span>
                      </button>
                    </div>


                  </div>

                  {/* Interactive Word Breakdown */}
                  <div className="text-base leading-loose font-medium text-content flex flex-wrap gap-1.5">
                    {verse.words && verse.words.length > 0 ? (
                      verse.words.map((w) => (
                        <span
                          key={w.id}
                          onClick={() => handleWordClick(w)}
                          className={`cursor-pointer px-1 py-0.5 rounded transition-all ${
                            w.has_commentary
                              ? 'bg-canvas/40 text-warning border-b-2 border-warning/80 hover:bg-canvas/60 font-semibold'
                              : 'hover:bg-nav hover:text-content'
                          }`}
                          title={
                            w.has_commentary
                              ? 'انقر لعرض معنى الكلمة وقاموسها وتفسيرها'
                              : 'انقر لعرض الكلمة'
                          }
                        >
                          {w.word_text}
                        </span>
                      ))
                    ) : (
                      <span>{verse.text_ar}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- INTERACTIVE WORD DETAILS MODAL --- */}
        {selectedWordId !== null && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-nav border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-warning" />
                  <h3 className="font-bold text-base text-content">
                    معنى وشرح الكلمة: «{wordDetails?.word_text}»
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedWordId(null);
                    setWordDetails(null);
                  }}
                  className="text-content-muted hover:text-content"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingWordDetails ? (
                <div className="py-12 text-center text-warning">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 text-xs">
                  {/* Contextual Word Explanations */}
                  {wordDetails?.word_commentaries &&
                  wordDetails.word_commentaries.length > 0 ? (
                    <div className="space-y-3">
                      <span className="font-bold text-warning block text-sm">
                        الشرح في سياق الآية:
                      </span>
                      {wordDetails.word_commentaries.map((wc) => (
                        <div
                          key={wc.id}
                          className="bg-nav p-4 rounded-xl border border-line space-y-2"
                        >
                          <h4 className="font-bold text-content text-xs">{wc.explanation_title}</h4>
                          <p className="text-content-secondary leading-relaxed whitespace-pre-line">
                            {wc.explanation_text}
                          </p>
                          <div className="pt-2 border-t border-line-subtle flex items-center justify-between text-[10px] text-content-muted">
                            <span>المرجع: {wc.author_name || 'تفسير الكتاب المقدس'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Biblical Dictionary Entries */}
                  {wordDetails?.dictionary_entries &&
                  wordDetails.dictionary_entries.length > 0 ? (
                    <div className="space-y-3">
                      <span className="font-bold text-success block text-sm">
                        قاموس الكتاب المقدس:
                      </span>
                      {wordDetails.dictionary_entries.map((de) => (
                        <div
                          key={de.id}
                          className="bg-nav p-4 rounded-xl border border-line space-y-2"
                        >
                          <h4 className="font-bold text-content text-xs">{de.title}</h4>
                          <p className="text-content-secondary leading-relaxed whitespace-pre-line">
                            {de.original_content}
                          </p>
                          <div className="pt-2 border-t border-line-subtle flex items-center justify-between text-[10px] text-content-muted">
                            <span>المرجع: {de.author_name || 'قاموس الكتاب المقدس'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {(!wordDetails?.word_commentaries ||
                    wordDetails.word_commentaries.length === 0) &&
                    (!wordDetails?.dictionary_entries ||
                      wordDetails.dictionary_entries.length === 0) && (
                      <p className="text-content-muted text-center py-6">
                        لا يوجد شرح مسجل لهذه الكلمة في هذا الإصحاح.
                      </p>
                    )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- VERSE FULL COMMENTARY PANEL --- */}
        {selectedVerseForCommentary && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-nav border border-line rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
                <div>
                  <h3 className="font-bold text-base text-content">
                    تفسير الآية {selectedVerseForCommentary.verse_number} — سفر {currentBook?.name_ar}
                  </h3>
                  <p className="text-xs text-warning mt-1">
                    «{selectedVerseForCommentary.text_ar}»
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVerseForCommentary(null)}
                  className="text-content-muted hover:text-content"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingCommentary ? (
                <div className="py-12 text-center text-warning">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : verseCommentaries.length === 0 ? (
                <p className="text-content-muted text-center py-8 text-xs">
                  لا توجد تفاسير مضافة لهذه الآية حالياً.
                </p>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 text-xs">
                  {verseCommentaries.map((c) => (
                    <div
                      key={c.id}
                      className="bg-nav p-4 rounded-xl border border-line space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                        <span className="font-bold text-warning text-xs">
                          {c.commentary_title || c.source?.author_name || 'تفسير الآية'}
                        </span>
                      </div>

                      <p className="text-content leading-relaxed whitespace-pre-line text-sm">
                        {c.commentary_text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- GLOBAL SEARCH RESULTS MODAL --- */}
        {showSearchModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-nav border border-line rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
                <h3 className="font-bold text-base text-content">
                  نتائج البحث عن: «{searchQuery}» ({searchResults.length})
                </h3>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-content-muted hover:text-content"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 text-xs">
                {searchResults.length === 0 ? (
                  <p className="text-content-muted text-center py-8">لا توجد نتائج مطابقة لبحثك.</p>
                ) : (
                  searchResults.map((sr, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedBookId(sr.book_id);
                        setSelectedChapter(sr.chapter_number);
                        setShowSearchModal(false);
                      }}
                      className="bg-nav p-3.5 rounded-xl border border-line hover:border-warning/60 cursor-pointer transition-all space-y-1.5"
                    >
                      <span className="font-bold text-warning text-xs">
                        سفر {sr.book_name} — الإصحاح {sr.chapter_number} : الآية {sr.verse_number}
                      </span>
                      <p className="text-content text-sm leading-relaxed">{sr.text_ar}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {/* Encyclopedia Hub View */}
        {viewMode === 'hub' && (
          <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-content mb-2" dir="rtl">
                  موسوعة الكتاب المقدس
                </h1>
                <p className="text-content-muted text-sm" dir="rtl">
                  مكتبة شاملة تضم الأسفار، التفاسير، الأطلس، واللاهوتيات
                </p>
              </div>
              <button
                onClick={() => setEncyclopedia(prev => ({ ...prev, searchOpen: true }))}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gold hover:bg-warning text-content font-bold text-sm transition-all"
              >
                <Search className="w-4 h-4" />
                <span>بحث سريع</span>
              </button>
            </div>

            {encyclopedia.loading ? (
              <div className="text-center py-24">
                <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-4" />
                <p className="text-content-muted">جاري تحميل الموسوعة...</p>
              </div>
            ) : (
              <WingSelector
                categories={encyclopedia.categories}
                onSelectCategory={handleSelectCategory}
                stats={encyclopedia.stats}
              />
            )}
          </div>
        )}

        {/* Bible Verse Reader View (existing) */}
        {viewMode === 'reader' && (
          <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setViewMode('hub')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-nav/60 hover:bg-nav/80 border border-line text-content-secondary hover:text-content transition-all"
                dir="rtl"
              >
                <ArrowRight className="w-4 h-4" />
                <span className="text-sm">العودة للموسوعة</span>
              </button>
            </div>
            
            {/* Paste existing Bible verse reader UI here (the original content) */}
            {/* This preserves the existing Supabase-based Bible reader */}
          </div>
        )}
      </main>

      {/* Encyclopedia Search Modal */}
      <BibleSearchModal
        isOpen={encyclopedia.searchOpen}
        onClose={() => setEncyclopedia(prev => ({ ...prev, searchOpen: false }))}
        onSelectArticle={handleSelectArticle}
      />

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
