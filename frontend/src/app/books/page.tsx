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
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Eye,
  FileText,
  Filter,
  Heart,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface CategoryItem {
  id: string;
  name_ar: string;
  type: string;
}

interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  file_url: string;
  cover_url: string | null;
  file_size_bytes: number;
  category_id: string | null;
  category_name?: string;
  is_favorite?: boolean;
  type: 'BOOK' | 'RESEARCH';
}

export default function BooksAndResearchPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Active Tab: 'books' | 'researches' | 'favorites'
  const [activeTab, setActiveTab] = useState<'books' | 'researches' | 'favorites'>('books');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // In-App Reader Modal State (NO DOWNLOAD BUTTON)
  const [readingItem, setReadingItem] = useState<LibraryItem | null>(null);

  // Add Item Modal State (Staff/Admin)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [savingItem, setSavingItem] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        const prof = userProfile as Profile;
        setProfile(prof);

        // Check if user has MANAGE_LIBRARY or Admin/Super
        let hasMgmt = ['admin', 'super_user'].includes(prof.role_id);
        if (prof.role_id === 'servant') {
          const { data: perm } = await supabase
            .from('servant_permissions')
            .select('*')
            .eq('profile_id', prof.id)
            .eq('permission_id', 'MANAGE_LIBRARY')
            .single();
          if (perm) hasMgmt = true;
        }
        setCanManage(hasMgmt);

        // Fetch categories
        const { data: cats } = await supabase.from('categories').select('*').order('name_ar');
        if (cats) setCategories(cats);

        await loadLibraryContent(user.id);
      }
      setLoading(false);
    }

    init();
  }, [router]);

  const loadLibraryContent = async (userId: string) => {
    const supabase = createClient();

    // 1. Fetch Books
    const { data: booksData } = await supabase
      .from('books')
      .select('*, categories(name_ar)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // 2. Fetch Researches
    const { data: resData } = await supabase
      .from('researches')
      .select('*, categories(name_ar)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // 3. Fetch User Favorites
    const { data: favs } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId);

    const favSet = new Set((favs || []).map((f) => `${f.item_type}_${f.item_id}`));

    const mappedBooks: LibraryItem[] = (booksData || []).map((b: any) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      file_url: b.file_url,
      cover_url: b.cover_url,
      file_size_bytes: b.file_size_bytes,
      category_id: b.category_id,
      category_name: b.categories?.name_ar,
      is_favorite: favSet.has(`BOOK_${b.id}`),
      type: 'BOOK',
    }));

    const mappedRes: LibraryItem[] = (resData || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      author: r.author,
      file_url: r.file_url,
      cover_url: r.cover_url,
      file_size_bytes: r.file_size_bytes,
      category_id: r.category_id,
      category_name: r.categories?.name_ar,
      is_favorite: favSet.has(`RESEARCH_${r.id}`),
      type: 'RESEARCH',
    }));

    setItems([...mappedBooks, ...mappedRes]);
  };

  // Toggle Favorite
  const handleToggleFavorite = async (item: LibraryItem) => {
    if (!profile) return;
    const supabase = createClient();

    if (item.is_favorite) {
      // Remove favorite
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', profile.id)
        .eq('item_type', item.type)
        .eq('item_id', item.id);
    } else {
      // Add favorite
      await supabase.from('user_favorites').insert({
        user_id: profile.id,
        item_type: item.type,
        item_id: item.id,
      });
    }

    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, is_favorite: !it.is_favorite } : it))
    );
  };

  // Add Item (Staff/Admin)
  const handleSaveItem = async () => {
    if (!newTitle.trim() || !newFileUrl.trim()) return;
    setSavingItem(true);
    const supabase = createClient();

    const table = activeTab === 'researches' ? 'researches' : 'books';
    const { error } = await supabase.from(table).insert({
      title: newTitle.trim(),
      author: newAuthor.trim() || null,
      category_id: newCategoryId || null,
      cover_url: newCoverUrl.trim() || null,
      file_url: newFileUrl.trim(),
    });

    if (!error) {
      setShowAddModal(false);
      setNewTitle('');
      setNewAuthor('');
      setNewCoverUrl('');
      setNewFileUrl('');
      setNotice('تم إضافة العنصر إلى المكتبة بنجاح.');
      if (profile) await loadLibraryContent(profile.id);
    } else {
      setNotice(`فشل الإضافة: ${error.message}`);
    }
    setSavingItem(false);
  };

  // Filtered List
  const filteredItems = items.filter((it) => {
    // Tab filter
    if (activeTab === 'books' && it.type !== 'BOOK') return false;
    if (activeTab === 'researches' && it.type !== 'RESEARCH') return false;
    if (activeTab === 'favorites' && !it.is_favorite) return false;

    // Category filter
    if (selectedCategoryId !== 'ALL' && it.category_id !== selectedCategoryId) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = it.title.toLowerCase().includes(q);
      const matchAuthor = it.author?.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-[#c29938] selection:text-slate-950 pb-20" dir="rtl">
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
        {/* Controls & Tabs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('books')}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'books'
                    ? 'bg-karooz-crimson text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>الكتب الدراسية</span>
              </button>
              <button
                onClick={() => setActiveTab('researches')}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'researches'
                    ? 'bg-karooz-crimson text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>الأبحاث والدراسات</span>
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'favorites'
                    ? 'bg-amber-600 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>المفضلة</span>
              </button>
            </div>

            {canManage && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-karooz-crimson hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة {activeTab === 'researches' ? 'بحث' : 'كتاب'}</span>
              </button>
            )}
          </div>

          {/* Search Bar & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو المؤلف..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-karooz-crimson"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategoryId('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategoryId === 'ALL'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                الكل
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCategoryId === c.id
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {c.name_ar}
                </button>
              ))}
            </div>
          </div>
        </div>

        {notice && (
          <div className="p-3 bg-blue-950/60 border border-blue-800/60 text-blue-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400" />
            <span>{notice}</span>
          </div>
        )}

        {/* --- ITEMS GRID --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {filteredItems.length === 0 ? (
            <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              لا توجد عناصر مطابقة لبحثك في المكتبة.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between hover:border-slate-700 transition-all group"
              >
                <div>
                  {/* Cover & Type Badge */}
                  <div className="relative h-44 bg-slate-950 rounded-xl overflow-hidden mb-3 border border-slate-800 flex items-center justify-center">
                    {item.cover_url ? (
                      <img
                        src={item.cover_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <BookOpen className="w-12 h-12 text-slate-700" />
                    )}

                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 text-amber-300 backdrop-blur-sm border border-slate-700">
                        {item.type === 'BOOK' ? 'كتاب' : 'بحث'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleFavorite(item)}
                      className="absolute top-2 left-2 p-1.5 rounded-full bg-black/70 text-slate-300 hover:text-rose-500 backdrop-blur-sm transition-colors"
                      title="المفضلة"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          item.is_favorite ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Title & Category */}
                  {item.category_name && (
                    <span className="text-[10px] text-amber-400 font-bold block mb-1">
                      {item.category_name}
                    </span>
                  )}
                  <h3 className="font-bold text-sm text-white mb-1 leading-snug">{item.title}</h3>
                  {item.author && (
                    <span className="text-xs text-slate-400 block mb-3">بقلم: {item.author}</span>
                  )}
                </div>

                {/* Read Button (NO DOWNLOAD BUTTON) */}
                <button
                  onClick={() => setReadingItem(item)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>قراءة وعرض داخل التطبيق</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* --- IN-APP READER MODAL (NO DOWNLOAD BUTTON) --- */}
        {readingItem && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 max-w-5xl w-full mx-auto">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">{readingItem.title}</h3>
              </div>
              <button
                onClick={() => setReadingItem(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 max-w-5xl w-full mx-auto mt-4 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
              <iframe
                src={readingItem.file_url}
                className="w-full h-full flex-1 border-0"
                title={readingItem.title}
              />
            </div>
          </div>
        )}

        {/* --- ADD ITEM MODAL (Staff/Admin) --- */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-4">
                إضافة {activeTab === 'researches' ? 'بحث دراسي' : 'كتاب جديد'}
              </h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">العنوان</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="عنوان الكتاب أو البحث"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">المؤلف / الباحث</label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="اسم الكاتب أو الأستاذ"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">التصنيف</label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="">اختر التصنيف...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_ar}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">رابط صورة الغلاف</label>
                  <input
                    type="text"
                    value={newCoverUrl}
                    onChange={(e) => setNewCoverUrl(e.target.value)}
                    placeholder="https://.../cover.jpg"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">رابط ملف المحتوى (PDF)</label>
                  <input
                    type="text"
                    value={newFileUrl}
                    onChange={(e) => setNewFileUrl(e.target.value)}
                    placeholder="https://.../document.pdf"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={savingItem}
                  onClick={handleSaveItem}
                  className="px-5 py-2 rounded-xl bg-karooz-crimson text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {savingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ في المكتبة</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
