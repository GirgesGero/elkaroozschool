'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import TenSectionSelector from '@/components/Bible/TenSectionSelector';
import BibleSearchModal from '@/components/Bible/BibleSearchModal';
import BibleReadingToolbar from '@/components/Bible/BibleReadingToolbar';
import ChurchBanner from '@/components/ChurchBanner';
import {
  getBibleCategories,
  getBibleStats,
  getBibleSections,
  getBibleArticle,
  searchBibleEncyclopedia,
  type BibleCategory,
  type BibleArticle,
} from '@/lib/api/bible';
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
import DOMPurify from 'dompurify';
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

const DEFAULT_TESTAMENTS: Testament[] = [
  { id: 1, code: 'OT', name_ar: 'العهد القديم' },
  { id: 2, code: 'NT', name_ar: 'العهد الجديد' },
];

const CANONICAL_BIBLE_BOOKS: Array<{ testament_id: number; code: string; name_ar: string; chapters_count: number }> = [
  { testament_id: 1, code: 'GEN', name_ar: 'التكوين', chapters_count: 50 },
  { testament_id: 1, code: 'EXO', name_ar: 'الخروج', chapters_count: 40 },
  { testament_id: 1, code: 'LEV', name_ar: 'اللاويين', chapters_count: 27 },
  { testament_id: 1, code: 'NUM', name_ar: 'العدد', chapters_count: 36 },
  { testament_id: 1, code: 'DEU', name_ar: 'التثنية', chapters_count: 34 },
  { testament_id: 1, code: 'JOS', name_ar: 'يشوع', chapters_count: 24 },
  { testament_id: 1, code: 'JDG', name_ar: 'القضاة', chapters_count: 21 },
  { testament_id: 1, code: 'RUT', name_ar: 'راعوث', chapters_count: 4 },
  { testament_id: 1, code: '1SA', name_ar: 'صموئيل الأول', chapters_count: 31 },
  { testament_id: 1, code: '2SA', name_ar: 'صموئيل الثاني', chapters_count: 24 },
  { testament_id: 1, code: '1KI', name_ar: 'الملوك الأول', chapters_count: 22 },
  { testament_id: 1, code: '2KI', name_ar: 'الملوك الثاني', chapters_count: 25 },
  { testament_id: 1, code: '1CH', name_ar: 'أخبار الأيام الأول', chapters_count: 29 },
  { testament_id: 1, code: '2CH', name_ar: 'أخبار الأيام الثاني', chapters_count: 36 },
  { testament_id: 1, code: 'EZR', name_ar: 'عزرا', chapters_count: 10 },
  { testament_id: 1, code: 'NEH', name_ar: 'نحميا', chapters_count: 13 },
  { testament_id: 1, code: 'TOB', name_ar: 'طوبيا', chapters_count: 14 },
  { testament_id: 1, code: 'JDT', name_ar: 'يهوديت', chapters_count: 16 },
  { testament_id: 1, code: 'EST', name_ar: 'أستير وتتمة أستير', chapters_count: 16 },
  { testament_id: 1, code: '1MA', name_ar: 'المكابيين الأول', chapters_count: 16 },
  { testament_id: 1, code: '2MA', name_ar: 'المكابيين الثاني', chapters_count: 15 },
  { testament_id: 1, code: 'JOB', name_ar: 'أيوب', chapters_count: 42 },
  { testament_id: 1, code: 'PSA', name_ar: 'المزامير', chapters_count: 151 },
  { testament_id: 1, code: 'PRO', name_ar: 'الأمثال', chapters_count: 31 },
  { testament_id: 1, code: 'ECC', name_ar: 'الجامعة', chapters_count: 12 },
  { testament_id: 1, code: 'SNG', name_ar: 'نشيد الأنشاد', chapters_count: 8 },
  { testament_id: 1, code: 'WIS', name_ar: 'حكمة سليمان', chapters_count: 19 },
  { testament_id: 1, code: 'SIR', name_ar: 'يشوع بن سيراخ', chapters_count: 51 },
  { testament_id: 1, code: 'ISA', name_ar: 'إشعياء', chapters_count: 66 },
  { testament_id: 1, code: 'JER', name_ar: 'إرميا', chapters_count: 52 },
  { testament_id: 1, code: 'LAM', name_ar: 'مراثي إرميا', chapters_count: 5 },
  { testament_id: 1, code: 'BAR', name_ar: 'باروخ ورسالة إرميا', chapters_count: 6 },
  { testament_id: 1, code: 'EZK', name_ar: 'حزقيال', chapters_count: 48 },
  { testament_id: 1, code: 'DAN', name_ar: 'دانيال وتتمة دانيال', chapters_count: 14 },
  { testament_id: 1, code: 'HOS', name_ar: 'هوشع', chapters_count: 14 },
  { testament_id: 1, code: 'JOL', name_ar: 'يوئيل', chapters_count: 3 },
  { testament_id: 1, code: 'AMO', name_ar: 'عاموس', chapters_count: 9 },
  { testament_id: 1, code: 'OBA', name_ar: 'عوبديا', chapters_count: 1 },
  { testament_id: 1, code: 'JON', name_ar: 'يونان', chapters_count: 4 },
  { testament_id: 1, code: 'MIC', name_ar: 'ميخا', chapters_count: 7 },
  { testament_id: 1, code: 'NAM', name_ar: 'ناحوم', chapters_count: 3 },
  { testament_id: 1, code: 'HAB', name_ar: 'حبقوق', chapters_count: 3 },
  { testament_id: 1, code: 'ZEP', name_ar: 'صفنيا', chapters_count: 3 },
  { testament_id: 1, code: 'HAG', name_ar: 'حجي', chapters_count: 2 },
  { testament_id: 1, code: 'ZEC', name_ar: 'زكريا', chapters_count: 14 },
  { testament_id: 1, code: 'MAL', name_ar: 'ملاخي', chapters_count: 4 },
  { testament_id: 2, code: 'MAT', name_ar: 'إنجيل متى', chapters_count: 28 },
  { testament_id: 2, code: 'MRK', name_ar: 'إنجيل مرقس', chapters_count: 16 },
  { testament_id: 2, code: 'LUK', name_ar: 'إنجيل لوقا', chapters_count: 24 },
  { testament_id: 2, code: 'JHN', name_ar: 'إنجيل يوحنا', chapters_count: 21 },
  { testament_id: 2, code: 'ACT', name_ar: 'أعمال الرسل', chapters_count: 28 },
  { testament_id: 2, code: 'ROM', name_ar: 'رسالة بولس الرسول إلى أهل رومية', chapters_count: 16 },
  { testament_id: 2, code: '1CO', name_ar: 'رسالة بولس الرسول الأولى إلى أهل كورنثوس', chapters_count: 16 },
  { testament_id: 2, code: '2CO', name_ar: 'رسالة بولس الرسول الثانية إلى أهل كورنثوس', chapters_count: 13 },
  { testament_id: 2, code: 'GAL', name_ar: 'رسالة بولس الرسول إلى أهل غلاطية', chapters_count: 6 },
  { testament_id: 2, code: 'EPH', name_ar: 'رسالة بولس الرسول إلى أهل أفسس', chapters_count: 6 },
  { testament_id: 2, code: 'PHP', name_ar: 'رسالة بولس الرسول إلى أهل فيلبي', chapters_count: 4 },
  { testament_id: 2, code: 'COL', name_ar: 'رسالة بولس الرسول إلى أهل كولوسي', chapters_count: 4 },
  { testament_id: 2, code: '1TH', name_ar: 'رسالة بولس الرسول الأولى إلى أهل تسالونيكي', chapters_count: 5 },
  { testament_id: 2, code: '2TH', name_ar: 'رسالة بولس الرسول الثانية إلى أهل تسالونيكي', chapters_count: 3 },
  { testament_id: 2, code: '1TI', name_ar: 'رسالة بولس الرسول الأولى إلى تيموثاوس', chapters_count: 6 },
  { testament_id: 2, code: '2TI', name_ar: 'رسالة بولس الرسول الثانية إلى تيموثاوس', chapters_count: 4 },
  { testament_id: 2, code: 'TIT', name_ar: 'رسالة بولس الرسول إلى تيطس', chapters_count: 3 },
  { testament_id: 2, code: 'PHM', name_ar: 'رسالة بولس الرسول إلى فليمون', chapters_count: 1 },
  { testament_id: 2, code: 'HEB', name_ar: 'رسالة بولس الرسول إلى العبرانيين', chapters_count: 13 },
  { testament_id: 2, code: 'JAS', name_ar: 'رسالة يعقوب الرسول', chapters_count: 5 },
  { testament_id: 2, code: '1PE', name_ar: 'رسالة بطرس الرسول الأولى', chapters_count: 5 },
  { testament_id: 2, code: '2PE', name_ar: 'رسالة بطرس الرسول الثانية', chapters_count: 3 },
  { testament_id: 2, code: '1JN', name_ar: 'رسالة يوحنا الرسول الأولى', chapters_count: 5 },
  { testament_id: 2, code: '2JN', name_ar: 'رسالة يوحنا الرسول الثانية', chapters_count: 1 },
  { testament_id: 2, code: '3JN', name_ar: 'رسالة يوحنا الرسول الثالثة', chapters_count: 1 },
  { testament_id: 2, code: 'JUD', name_ar: 'رسالة يهوذا الرسول', chapters_count: 1 },
  { testament_id: 2, code: 'REV', name_ar: 'رؤيا يوحنا اللاهوتي', chapters_count: 22 },
];

function formatBookDisplayName(name?: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (/^(سفر|إنجيل|انجيل|رسالة|أعمال|اعمال|رؤيا)\b/.test(trimmed)) {
    return trimmed;
  }
  return `سفر ${trimmed}`;
}

function mergeWithCanonicalBooks(dbBooks: BibleBook[] | null | undefined): BibleBook[] {
  const existing = Array.isArray(dbBooks) ? [...dbBooks] : [];
  if (existing.length === 0) {
    return CANONICAL_BIBLE_BOOKS.map((b, idx) => ({
      id: idx + 1,
      testament_id: b.testament_id,
      code: b.code,
      name_ar: b.name_ar,
      chapters_count: b.chapters_count,
    }));
  }

  const byCode = new globalThis.Map(existing.map((b) => [b.code.toUpperCase(), b]));
  const byName = new globalThis.Map(
    existing.map((b) => [b.name_ar.replace(/^سفر\s+/, '').trim(), b])
  );
  let nextSyntheticId = Math.max(...existing.map((b) => b.id), 100) + 1;

  const merged: BibleBook[] = [];
  for (const canon of CANONICAL_BIBLE_BOOKS) {
    const cleanCanonName = canon.name_ar.replace(/^سفر\s+/, '').trim();
    const match = byCode.get(canon.code.toUpperCase()) || byName.get(cleanCanonName);
    if (match) {
      merged.push({
        ...match,
        chapters_count: Math.max(match.chapters_count || 1, canon.chapters_count),
      });
    } else {
      merged.push({
        id: nextSyntheticId++,
        testament_id: canon.testament_id,
        code: canon.code,
        name_ar: canon.name_ar,
        chapters_count: canon.chapters_count,
      });
    }
  }
  return merged;
}

function BiblePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBookParamRef = useRef(searchParams.get('book'));
  const lastUrlQueryRef = useRef<string | null>(null);
  const loadedChapterKeyRef = useRef<string | null>(null);
  const chapterReqSeqRef = useRef(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  // View Mode: 'hub' (Encyclopedia Wings) or 'reader' (Bible Verses)
  const initialMode = searchParams.get('mode') === 'reader' ? 'reader' : 'hub';
  const [viewMode, setViewMode] = useState<'hub' | 'reader'>(initialMode);
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

  const initialBookId = parseInt(searchParams.get('book') || '1', 10) || 1;
  const [selectedBookId, setSelectedBookId] = useState<number>(initialBookId);

  const initialChapter = parseInt(searchParams.get('chapter') || '1', 10) || 1;
  const [selectedChapter, setSelectedChapter] = useState<number>(initialChapter);

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const selectedBookIdRef = useRef(selectedBookId);
  selectedBookIdRef.current = selectedBookId;
  const selectedChapterRef = useRef(selectedChapter);
  selectedChapterRef.current = selectedChapter;

  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [chapterArticle, setChapterArticle] = useState<BibleArticle | null>(null);
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
      let fetchedTestaments: Testament[] | null = null;
      let fetchedBooks: BibleBook[] | null = null;

      try {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (pData) setProfile(pData as Profile);
        }

        const [{ data: testList }, { data: bookList }] = await Promise.all([
          supabase.from('bible_testaments').select('*').order('order_index'),
          supabase.from('bible_books').select('*').order('order_index'),
        ]);

        fetchedTestaments = testList as Testament[] | null;
        fetchedBooks = bookList as BibleBook[] | null;
      } catch {
        // Fallback to canonical static list below
      }

      setTestaments(
        fetchedTestaments && fetchedTestaments.length > 0
          ? fetchedTestaments
          : DEFAULT_TESTAMENTS
      );

      const finalBooks = mergeWithCanonicalBooks(fetchedBooks);
      setBooks(finalBooks);

      const bookParam = initialBookParamRef.current;
      let matchedBook: BibleBook | undefined;
      if (bookParam) {
        matchedBook = finalBooks.find(
          (b) =>
            String(b.id) === bookParam ||
            b.code.toLowerCase() === bookParam.toLowerCase() ||
            b.name_ar === bookParam
        );
      }
      if (matchedBook) {
        setSelectedBookId(matchedBook.id);
        setSelectedTestamentId(matchedBook.testament_id);
      } else if (finalBooks.length > 0) {
        setSelectedBookId(finalBooks[0].id);
        setSelectedTestamentId(finalBooks[0].testament_id);
      }

      setLoading(false);
    }

    void loadTestamentsAndBooks();
  }, []);

  // 2. Load Chapter Verses with Word Breakdown (Supports both live DB & offline static dataset)
  useEffect(() => {
    if (viewMode !== 'reader' || !selectedBookId || !selectedChapter || books.length === 0) return;

    const chapterKey = `${selectedBookId}:${selectedChapter}`;
    if (loadedChapterKeyRef.current === chapterKey) return;
    loadedChapterKeyRef.current = chapterKey;

    let cancelled = false;
    let finished = false;
    const reqId = ++chapterReqSeqRef.current;

    async function loadChapter() {
      setLoadingVerses(true);
      setChapterArticle(null);
      const book = books.find((b) => b.id === selectedBookId);
      const bookName = book?.name_ar || '';

      let rpcVerses: BibleVerse[] = [];
      // Only Genesis 1 (book_id = 1, chapter_number = 1) has word-level records in Supabase bible_verses
      if (selectedBookId === 1 && selectedChapter === 1) {
        try {
          const supabase = createClient();
          const { data: vList, error } = await supabase.rpc('get_chapter_verses_with_words', {
            p_book_id: selectedBookId,
            p_chapter_number: selectedChapter,
          });

          if (cancelled || reqId !== chapterReqSeqRef.current) return;

          if (!error && vList && Array.isArray(vList) && vList.length > 0) {
            rpcVerses = vList as BibleVerse[];
          }
        } catch {
          // Fallback to static encyclopedia below
        }
      }

      if (cancelled || reqId !== chapterReqSeqRef.current) return;

      // Load full chapter from complete offline static encyclopedia dataset
      try {
        const article = await getBibleArticle({ book: bookName, chapter: selectedChapter });
        if (cancelled || reqId !== chapterReqSeqRef.current) return;
        if (article) {
          setChapterArticle(article);
          if (article.content) {
            const pattern = /<p class="verse-p"><span class="verse-num">(\d+)<\/span>\s*(.*?)<\/p>/g;
            const parsedVerses: BibleVerse[] = [];
            const rpcByVerseNum = new globalThis.Map(rpcVerses.map((rv) => [rv.verse_number, rv]));
            let match;
            while ((match = pattern.exec(article.content)) !== null) {
              const vNum = parseInt(match[1], 10);
              const rpcMatch = rpcByVerseNum.get(vNum);
              if (rpcMatch) {
                parsedVerses.push(rpcMatch);
                continue;
              }
              const textClean = match[2].replace(/<[^>]*>/g, '').trim();
              parsedVerses.push({
                id: -vNum,
                verse_number: vNum,
                text_ar: textClean,
                source_url: article.slug || '',
                commentaries_count: 0,
                words: textClean.split(/\s+/).filter(Boolean).map((w, i) => ({
                  id: -(vNum * 10000 + i + 1),
                  word_position: i + 1,
                  word_text: w,
                  has_commentary: false,
                })),
              });
            }
            setVerses(parsedVerses.length > 0 ? parsedVerses : rpcVerses);
          } else {
            setVerses(rpcVerses);
          }
        } else {
          setVerses(rpcVerses);
        }
      } catch (err) {
        if (cancelled || reqId !== chapterReqSeqRef.current) return;
        if (rpcVerses.length > 0) {
          setVerses(rpcVerses);
        } else {
          console.error('Failed to load chapter from offline dataset:', err);
          setVerses([]);
        }
      } finally {
        if (!cancelled && reqId === chapterReqSeqRef.current) {
          finished = true;
          setLoadingVerses(false);
        }
      }
    }

    void loadChapter();

    return () => {
      cancelled = true;
      if (!finished && loadedChapterKeyRef.current === chapterKey) {
        loadedChapterKeyRef.current = null;
      }
    };
  }, [viewMode, selectedBookId, selectedChapter, books]);

  // 3. Handle Word Click -> Fetch Contextual Commentary + Dictionary
  const handleWordClick = async (word: VerseWord) => {
    setSelectedWordId(word.id);
    if (!word.has_commentary) {
      // When word has no pre-indexed commentary or in offline dataset mode,
      // present word without making failing RPC calls.
      setWordDetails({
        word_text: word.word_text,
        clean_word: word.word_text.replace(/[ً-ْ]/g, ''),
        word_commentaries: [],
        dictionary_entries: [],
      });
      return;
    }
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
    if (verse.id <= 0) {
      // Synthetic offline fallback verse ID: avoid querying bible_commentaries with a chapter-relative verse number
      setVerseCommentaries([]);
      setLoadingCommentary(false);
      return;
    }
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

  // Synchronize state (mode, book, chapter) to URL searchParams
  useEffect(() => {
    const rawSearch = typeof window !== 'undefined' ? window.location.search : '';
    const params = new URLSearchParams(rawSearch);
    let changed = false;

    if (viewMode === 'reader') {
      if (params.get('mode') !== 'reader') {
        params.set('mode', 'reader');
        changed = true;
      }
      if (selectedBookId && params.get('book') !== String(selectedBookId)) {
        params.set('book', String(selectedBookId));
        changed = true;
      }
      if (selectedChapter && params.get('chapter') !== String(selectedChapter)) {
        params.set('chapter', String(selectedChapter));
        changed = true;
      }
    } else {
      if (params.has('mode')) {
        params.delete('mode');
        changed = true;
      }
      if (params.has('book')) {
        params.delete('book');
        changed = true;
      }
      if (params.has('chapter')) {
        params.delete('chapter');
        changed = true;
      }
    }

    if (changed) {
      const q = params.toString();
      lastUrlQueryRef.current = q;
      const newUrl = q ? `/bible?${q}` : '/bible';
      const currentUrl = typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '';
      if (currentUrl !== newUrl) {
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [viewMode, selectedBookId, selectedChapter, router]);

  // Read URL searchParams when browser navigates (Back/Forward or external link)
  useEffect(() => {
    const nextQuery = new URLSearchParams(searchParams.toString()).toString();
    if (lastUrlQueryRef.current === nextQuery) return;
    lastUrlQueryRef.current = nextQuery;

    const modeParam = searchParams.get('mode');
    if (modeParam === 'reader' && viewModeRef.current !== 'reader') {
      setViewMode('reader');
    } else if (modeParam !== 'reader' && viewModeRef.current !== 'hub' && !modeParam) {
      setViewMode('hub');
    }

    const bookParam = searchParams.get('book');
    if (bookParam && books.length > 0) {
      const matched = books.find(
        (b) =>
          String(b.id) === bookParam ||
          b.code.toLowerCase() === bookParam.toLowerCase() ||
          b.name_ar === bookParam
      );
      if (matched && matched.id !== selectedBookIdRef.current) {
        setSelectedBookId(matched.id);
        setSelectedTestamentId(matched.testament_id);
      }
    }

    const chapterParam = parseInt(searchParams.get('chapter') || '', 10);
    if (chapterParam && chapterParam > 0 && chapterParam !== selectedChapterRef.current) {
      setSelectedChapter(chapterParam);
    }
  }, [searchParams, books]);

  // 5. Handle Global Bible Search — uses static offline encyclopedia (no RPC)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    try {
      const res = await searchBibleEncyclopedia(q, { limit: 25 });
      const mapped = (res.results || []).map((r: any) => {
        const foundBook = books.find(
          (b) =>
            b.name_ar === r.book_name ||
            (r.book_name && (b.name_ar.includes(r.book_name) || r.book_name.includes(b.name_ar))) ||
            (r.title && b.name_ar && r.title.includes(b.name_ar))
        );
        return {
          book_id: foundBook?.id || null,
          testament_id: foundBook?.testament_id || null,
          book_name: foundBook?.name_ar || r.book_name || r.section_title || '',
          chapter_number: r.chapter_num && r.chapter_num > 0 ? r.chapter_num : 1,
          verse_number: 0,
          text_ar: r.snippet || r.title,
          title: r.title,
          id: r.id,
        };
      });
      setSearchResults(mapped);
    } catch (err) {
      console.error('Bible search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setShowSearchModal(true);
    }
  };

  const handleSelectSearchResult = (sr: any) => {
    setShowSearchModal(false);
    if (sr.book_id) {
      const matchedBook = books.find((b) => b.id === sr.book_id);
      if (matchedBook) {
        setSelectedTestamentId(matchedBook.testament_id);
        setSelectedBookId(matchedBook.id);
        setSelectedChapter(sr.chapter_number || 1);
        setViewMode('reader');
      } else if (sr.id) {
        router.push(`/bible/reader/${sr.id}`);
      }
    } else if (sr.id) {
      router.push(`/bible/reader/${sr.id}`);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedWordId !== null) { setSelectedWordId(null); setWordDetails(null); return; }
      if (selectedVerseForCommentary) { setSelectedVerseForCommentary(null); return; }
      if (showSearchModal) setShowSearchModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedWordId, selectedVerseForCommentary, showSearchModal]);

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
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6 pb-28 md:pb-12">
        {/* Ecclesiastical Hierarchy Banner (مطرانية شبرا الخيمة • البابا تواضروس • الأنبا مرقس) */}
        <ChurchBanner size="md" className="border-2 border-gold/40 shadow-xl" />

        {/* Top Header & Navigation Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-nav/95 border-2 border-gold/40 shadow-xl backdrop-blur-xl">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-content flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-gold" />
              <span>موسوعة الكتاب المقدس والعلوم الكنسية</span>
            </h1>
            <p className="text-xs text-content-muted leading-relaxed">
              مكتبة شاملة تضم الأسفار الإلهية، شروحات الآباء، أطلس الكتاب، والمعاجم الكنسية
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <BibleReadingToolbar variant="inline" />
            <div className="flex p-1 bg-canvas rounded-2xl border border-line w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode('hub')}
                className={`flex items-center flex-1 sm:flex-initial justify-center gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                  viewMode === 'hub'
                    ? 'bg-gold text-brand-on shadow-md font-black'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <span>شجرة الموسوعة والأجنحة</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('reader')}
                className={`flex items-center flex-1 sm:flex-initial justify-center gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                  viewMode === 'reader'
                    ? 'bg-gold text-brand-on shadow-md font-black'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <span>قارئ الإصحاحات والآيات</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setEncyclopedia((prev) => ({ ...prev, searchOpen: true }))}
              className="px-3.5 py-2.5 rounded-2xl bg-gold hover:bg-warning text-brand-on font-black text-xs transition-all shadow-md flex items-center gap-1.5 shrink-0"
              title="بحث سريع في نصوص الموسوعة"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">بحث سريع</span>
            </button>
          </div>
        </div>

        {/* --- VIEW 1: ENCYCLOPEDIA TREE & HUB --- */}
        {viewMode === 'hub' && (
          <div className="space-y-6 animate-fade-in">
            {encyclopedia.loading ? (
              <div className="text-center py-24">
                <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-4" />
                <p className="text-content-muted text-sm">جاري تحميل شجرة الموسوعة الكنسية...</p>
              </div>
            ) : (
              <TenSectionSelector
                categories={encyclopedia.categories}
                onSelectCategory={handleSelectCategory}
                stats={encyclopedia.stats}
                onOpenReader={() => setViewMode('reader')}
                onOpenSearch={() => setEncyclopedia((prev) => ({ ...prev, searchOpen: true }))}
              />
            )}
          </div>
        )}

        {/* --- VIEW 2: SCRIPTURE VERSE READER --- */}
        {viewMode === 'reader' && (
          <div className="space-y-6 animate-fade-in">
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
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-xl pr-10 pl-3 py-2 text-[16px] md:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
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
            <fieldset aria-label="اختر العهد" className="flex bg-nav p-1 rounded-xl border border-line">
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
            </fieldset>

            {/* Book Selector */}
            <label htmlFor="bible-book-select" className="sr-only">اختر السفر</label>
            <select
              id="bible-book-select"
              aria-label="اختر السفر"
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(parseInt(e.target.value));
                setSelectedChapter(1);
              }}
              className="bg-nav border border-line text-content text-xs rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:ring-1 focus:ring-warning"
            >
              {filteredBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {formatBookDisplayName(b.name_ar)}
                </option>
              ))}
            </select>

            {/* Chapter Selector */}
            <label htmlFor="bible-chapter-select" className="sr-only">اختر الاصحاح</label>
            <select
              id="bible-chapter-select"
              aria-label="اختر الاصحاح"
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
              {formatBookDisplayName(currentBook?.name_ar)} — الإصحاح {selectedChapter}
            </h2>
          </div>

          {loadingVerses ? (
            <div className="py-16 text-center text-warning">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            </div>
          ) : verses.length === 0 && chapterArticle?.content ? (
            <div className="space-y-4">
              <div
                className="bible-article-body space-y-4 text-content leading-loose text-base sm:text-lg select-text"
                dangerouslySetInnerHTML={{ __html: typeof window !== 'undefined' ? DOMPurify.sanitize(chapterArticle.content) : '' }}
              />
              <div className="pt-4 border-t border-line flex justify-end">
                <Link
                  href={`/bible/reader/${chapterArticle.id}`}
                  className="px-4 py-2 rounded-xl bg-gold text-brand-on font-bold text-xs hover:bg-warning transition-all flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>فتح في قارئ الموسوعة الكامل</span>
                </Link>
              </div>
            </div>
          ) : verses.length === 0 ? (
            <div className="py-12 text-center text-content-muted text-xs">
              لا توجد نصوص مسجلة لهذا الإصحاح حالياً.
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
                      verse.words.map((w) =>
                        w.has_commentary ? (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => handleWordClick(w)}
                            aria-label={`شرح كلمة ${w.word_text}`}
                            className="px-1 py-0.5 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1 bg-canvas/40 text-warning border-b-2 border-warning/80 hover:bg-canvas/60 font-semibold cursor-pointer"
                            title="انقر لعرض معنى الكلمة وقاموسها وتفسيرها"
                          >
                            {w.word_text}
                          </button>
                        ) : (
                          <span
                            key={w.id}
                            className="px-0.5 py-0.5 text-content select-text"
                          >
                            {w.word_text}
                          </span>
                        )
                      )
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
          <div role="dialog" aria-modal="true" aria-label="شرح الكلمة" onClick={() => { setSelectedWordId(null); setWordDetails(null); }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-nav border border-line rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[85dvh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-warning" aria-hidden="true" />
                  <h3 className="font-bold text-base text-content">
                    معنى وشرح الكلمة: «{wordDetails?.word_text}»
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="اغلاق"
                  onClick={() => {
                    setSelectedWordId(null);
                    setWordDetails(null);
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-content-muted hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
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
          <div role="dialog" aria-modal="true" aria-label="تفسير الاية" onClick={() => setSelectedVerseForCommentary(null)} className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-nav border border-line rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl max-h-[85dvh] flex flex-col">
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
                  type="button"
                  aria-label="اغلاق"
                  onClick={() => setSelectedVerseForCommentary(null)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-content-muted hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
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
          <div role="dialog" aria-modal="true" aria-label="نتائج البحث" onClick={() => setShowSearchModal(false)} className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-nav border border-line rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl max-h-[85dvh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
                <h3 className="font-bold text-base text-content">
                  نتائج البحث عن: «{searchQuery}» ({searchResults.length})
                </h3>
                <button
                  type="button"
                  aria-label="اغلاق"
                  onClick={() => setShowSearchModal(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-content-muted hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 text-xs">
                {searchResults.length === 0 ? (
                  <p className="text-content-muted text-center py-8">لا توجد نتائج مطابقة لبحثك.</p>
                ) : (
                  searchResults.map((sr, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSearchResult(sr)}
                      className="bg-nav p-3.5 rounded-xl border border-line hover:border-warning/60 cursor-pointer transition-all space-y-1.5"
                    >
                      <span className="font-bold text-warning text-xs">
                        سفر {sr.book_name} — الإصحاح {sr.chapter_number}{sr.verse_number > 0 ? ` : الآية ${sr.verse_number}` : ''}
                      </span>
                      <p className="text-content text-sm leading-relaxed">{sr.text_ar}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
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

export default function BiblePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center" dir="rtl">
          <Loader2 className="w-10 h-10 text-gold animate-spin" />
        </div>
      }
    >
      <BiblePageContent />
    </Suspense>
  );
}
