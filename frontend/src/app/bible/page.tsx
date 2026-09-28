'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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
} from 'lucide-react';

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

  // 1. Initial Load: Testaments & Books
  useEffect(() => {
    async function loadTestamentsAndBooks() {
      const supabase = createClient();

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

  // 2. Load Chapter Verses with Word Breakdown
  useEffect(() => {
    if (!selectedBookId || !selectedChapter) return;

    async function loadChapter() {
      setLoadingVerses(true);
      const supabase = createClient();

      const { data: vList } = await supabase.rpc('get_chapter_verses_with_words', {
        p_book_id: selectedBookId,
        p_chapter_number: selectedChapter,
      });

      setVerses((vList as BibleVerse[]) || []);
      setLoadingVerses(false);
    }

    loadChapter();
  }, [selectedBookId, selectedChapter]);

  // 3. Handle Word Click -> Fetch Contextual Commentary + Dictionary
  const handleWordClick = async (word: VerseWord) => {
    setSelectedWordId(word.id);
    setLoadingWordDetails(true);
    const supabase = createClient();

    const { data: details } = await supabase.rpc('get_word_details', {
      p_word_id: word.id,
    });

    setWordDetails((details as WordDetailData) || null);
    setLoadingWordDetails(false);
  };

  // 4. Handle Verse Commentary Click
  const handleVerseCommentaryClick = async (verse: BibleVerse) => {
    setSelectedVerseForCommentary(verse);
    setLoadingCommentary(true);
    const supabase = createClient();

    const { data: comList } = await supabase
      .from('bible_commentaries')
      .select('*, source:bible_sources(author_name, source_name)')
      .eq('verse_id', verse.id);

    setVerseCommentaries((comList as VerseCommentary[]) || []);
    setLoadingCommentary(false);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-base text-karooz-gold">
              الكتاب المقدس والتفاسير المعتمدة
            </span>
            <div className="relative w-7 h-7">
              <Image src="/logo.png" alt="شعار مدرسة الكاروز" fill sizes="32px" className="object-contain" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Banner & Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-1 text-xs font-semibold">
              <BookOpen className="w-4 h-4" />
              <span>مستودع نصوص وتفاسير موقع الأنبا تكلا هيمانوت المعتمد</span>
            </div>
            <h1 className="text-xl font-bold text-white">الكتاب المقدس والشروحات الآبائية</h1>
            <p className="text-xs text-slate-400 mt-1">
              انقر على أي كلمة لعرض معناها وقاموسها، أو انقر على رقم الآية لعرض تفاسير الآباء كاملة.
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full md:w-auto flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في الآيات والتفاسير..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-10 pl-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              className="p-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold transition-colors"
            >
              بحث
            </button>
          </form>
        </div>

        {/* Navigation Selector: Testament -> Book -> Chapter */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Testament Toggle */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
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
                  className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all ${
                    selectedTestamentId === t.id
                      ? 'bg-amber-600 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
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
              className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold disabled:opacity-30 transition-colors flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              <span>الإصحاح السابق</span>
            </button>
            <button
              disabled={selectedChapter >= (currentBook?.chapters_count || 1)}
              onClick={() => setSelectedChapter((prev) => prev + 1)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold disabled:opacity-30 transition-colors flex items-center gap-1"
            >
              <span>الإصحاح التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* --- CHAPTER VERSES DISPLAY --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
          <div className="text-center pb-4 border-b border-slate-800">
            <h2 className="text-xl font-bold text-karooz-gold">
              سفر {currentBook?.name_ar} — الإصحاح {selectedChapter}
            </h2>
          </div>

          {loadingVerses ? (
            <div className="py-16 text-center text-amber-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            </div>
          ) : verses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              جاري تجهيز باقي إصحاحات السفر من خادم المحتوى.
            </div>
          ) : (
            <div className="space-y-4">
              {verses.map((verse) => (
                <div
                  key={verse.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerseCommentaryClick(verse)}
                        className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-300 font-mono font-bold text-xs flex items-center justify-center hover:bg-amber-900 transition-colors"
                        title="عرض تفسير الآية كاملاً"
                      >
                        {verse.verse_number}
                      </button>
                      <button
                        onClick={() => handleVerseCommentaryClick(verse)}
                        className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>التفاسير ({verse.commentaries_count})</span>
                      </button>
                    </div>

                    <a
                      href={verse.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-1"
                    >
                      <span>المصدر: تكلا</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Interactive Word Breakdown */}
                  <div className="text-base leading-loose font-medium text-slate-100 flex flex-wrap gap-1.5">
                    {verse.words && verse.words.length > 0 ? (
                      verse.words.map((w) => (
                        <span
                          key={w.id}
                          onClick={() => handleWordClick(w)}
                          className={`cursor-pointer px-1 py-0.5 rounded transition-all ${
                            w.has_commentary
                              ? 'bg-amber-950/40 text-amber-200 border-b-2 border-amber-500/80 hover:bg-amber-900/60 font-semibold'
                              : 'hover:bg-slate-800 hover:text-white'
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
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-base text-white">
                    معنى وشرح الكلمة: «{wordDetails?.word_text}»
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedWordId(null);
                    setWordDetails(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingWordDetails ? (
                <div className="py-12 text-center text-amber-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 text-xs">
                  {/* Contextual Word Explanations */}
                  {wordDetails?.word_commentaries &&
                  wordDetails.word_commentaries.length > 0 ? (
                    <div className="space-y-3">
                      <span className="font-bold text-amber-400 block text-sm">
                        الشرح في سياق الآية:
                      </span>
                      {wordDetails.word_commentaries.map((wc) => (
                        <div
                          key={wc.id}
                          className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2"
                        >
                          <h4 className="font-bold text-white text-xs">{wc.explanation_title}</h4>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                            {wc.explanation_text}
                          </p>
                          <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
                            <span>المرجع: {wc.author_name}</span>
                            <a
                              href={wc.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400/70 hover:text-amber-400 flex items-center gap-1"
                            >
                              <span>المصدر الأصلي</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Biblical Dictionary Entries */}
                  {wordDetails?.dictionary_entries &&
                  wordDetails.dictionary_entries.length > 0 ? (
                    <div className="space-y-3">
                      <span className="font-bold text-emerald-400 block text-sm">
                        قاموس الكتاب المقدس:
                      </span>
                      {wordDetails.dictionary_entries.map((de) => (
                        <div
                          key={de.id}
                          className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2"
                        >
                          <h4 className="font-bold text-white text-xs">{de.title}</h4>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                            {de.original_content}
                          </p>
                          <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
                            <span>المصدر: {de.author_name}</span>
                            <a
                              href={de.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400/70 hover:text-emerald-400 flex items-center gap-1"
                            >
                              <span>المصدر</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {(!wordDetails?.word_commentaries ||
                    wordDetails.word_commentaries.length === 0) &&
                    (!wordDetails?.dictionary_entries ||
                      wordDetails.dictionary_entries.length === 0) && (
                      <p className="text-slate-400 text-center py-6">
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
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div>
                  <h3 className="font-bold text-base text-white">
                    تفسير الآية {selectedVerseForCommentary.verse_number} — سفر {currentBook?.name_ar}
                  </h3>
                  <p className="text-xs text-amber-300 mt-1">
                    «{selectedVerseForCommentary.text_ar}»
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVerseForCommentary(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingCommentary ? (
                <div className="py-12 text-center text-amber-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : verseCommentaries.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-xs">
                  لا توجد تفاسير مضافة لهذه الآية حالياً.
                </p>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 text-xs">
                  {verseCommentaries.map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="font-bold text-amber-400 text-xs">
                          {c.commentary_title || c.source?.author_name}
                        </span>
                        <a
                          href={c.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-1"
                        >
                          <span>موقع الأنبا تكلا</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <p className="text-slate-200 leading-relaxed whitespace-pre-line text-sm">
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
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="font-bold text-base text-white">
                  نتائج البحث عن: «{searchQuery}» ({searchResults.length})
                </h3>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 text-xs">
                {searchResults.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">لا توجد نتائج مطابقة لبحثك.</p>
                ) : (
                  searchResults.map((sr, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedBookId(sr.book_id);
                        setSelectedChapter(sr.chapter_number);
                        setShowSearchModal(false);
                      }}
                      className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-amber-500/60 cursor-pointer transition-all space-y-1.5"
                    >
                      <span className="font-bold text-amber-400 text-xs">
                        سفر {sr.book_name} — الإصحاح {sr.chapter_number} : الآية {sr.verse_number}
                      </span>
                      <p className="text-slate-200 text-sm leading-relaxed">{sr.text_ar}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
