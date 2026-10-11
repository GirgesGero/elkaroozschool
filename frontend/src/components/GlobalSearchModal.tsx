'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  X,
  User,
  Users,
  BookOpen,
  Calendar,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (id: string, role: string) => void;
}

export default function GlobalSearchModal({
  isOpen,
  onClose,
  onOpenProfile,
}: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'groups' | 'books' | 'posts'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    people: any[];
    groups: any[];
    books: any[];
    posts: any[];
  }>({
    people: [],
    groups: [],
    books: [],
    posts: [],
  });

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ people: [], groups: [], books: [], posts: [] });
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ people: [], groups: [], books: [], posts: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const supabase = createClient();
      const q = `%${query.trim()}%`;

      try {
        const [peopleRes, groupsRes, booksRes, postsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, username, role_id, group_id, avatar_url')
            .or(`full_name.ilike.${q},username.ilike.${q}`)
            .limit(5),
          supabase
            .from('study_groups')
            .select('id, name, description')
            .ilike('name', q)
            .limit(3),
          supabase
            .from('books')
            .select('id, title, author, category')
            .or(`title.ilike.${q},author.ilike.${q}`)
            .limit(4),
          supabase
            .from('posts')
            .select('id, content, created_at, group_id')
            .ilike('content', q)
            .limit(4),
        ]);

        setResults({
          people: peopleRes.data || [],
          groups: groupsRes.data || [],
          books: booksRes.data || [],
          posts: postsRes.data || [],
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.people.length + results.groups.length + results.books.length + results.posts.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 px-3 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="w-full max-w-2xl bg-canvas border border-gold/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
        {/* Search Bar Header */}
        <div className="p-4 border-b border-line flex items-center gap-3 bg-canvas">
          <Search className="w-5 h-5 text-gold shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن طلاب، خدام، فرق، كتب، أو منشورات..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-content placeholder-content-muted focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-content-muted hover:text-content"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-nav/80 text-content-secondary hover:text-content"
          >
            <span className="text-xs font-bold px-1">إلغاء</span>
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 p-2.5 bg-canvas border-b border-line overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-xl transition-all ${
              activeTab === 'all'
                ? 'bg-gold text-content font-black'
                : 'text-content-muted hover:text-content'
            }`}
          >
            الكل ({totalResults})
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`px-3 py-1 rounded-xl transition-all ${
              activeTab === 'people'
                ? 'bg-gold text-content font-black'
                : 'text-content-muted hover:text-content'
            }`}
          >
            الأشخاص ({results.people.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-3 py-1 rounded-xl transition-all ${
              activeTab === 'groups'
                ? 'bg-gold text-content font-black'
                : 'text-content-muted hover:text-content'
            }`}
          >
            الفرق ({results.groups.length})
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`px-3 py-1 rounded-xl transition-all ${
              activeTab === 'books'
                ? 'bg-gold text-content font-black'
                : 'text-content-muted hover:text-content'
            }`}
          >
            الكتب ({results.books.length})
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-3 py-1 rounded-xl transition-all ${
              activeTab === 'posts'
                ? 'bg-gold text-content font-black'
                : 'text-content-muted hover:text-content'
            }`}
          >
            المنشورات ({results.posts.length})
          </button>
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && (
            <div className="py-12 text-center text-xs text-content-muted">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              جاري البحث في قاعدة البيانات...
            </div>
          )}

          {!isLoading && !query && (
            <div className="py-16 text-center text-content-muted">
              <Search className="w-10 h-10 text-content-muted mx-auto mb-3" />
              <p className="text-sm font-bold text-content-secondary">مركز البحث الشامل</p>
              <p className="text-xs text-content-muted mt-1">
                اكتب أي كلمة للبحث الفوري في كافة أقسام المدرسة
              </p>
            </div>
          )}

          {!isLoading && query && totalResults === 0 && (
            <div className="py-16 text-center text-content-muted">
              <p className="text-sm font-bold text-content-secondary">لا توجد نتائج مطابقة لـ &quot;{query}&quot;</p>
              <p className="text-xs text-content-muted mt-1">تأكد من كتابة الكلمات بشكل صحيح</p>
            </div>
          )}

          {/* People Section */}
          {(activeTab === 'all' || activeTab === 'people') && results.people.length > 0 && (
            <div>
              <span className="text-xs font-black text-gold block mb-2 px-1">الأشخاص والخدام والطلاب</span>
              <div className="space-y-1.5">
                {results.people.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onOpenProfile(p.id, p.role_id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-canvas hover:bg-card border border-line transition-all text-right group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gold to-warning text-content flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                        {p.avatar_url ? (
                          <Image src={p.avatar_url} alt={p.full_name} width={36} height={36} className="object-cover" />
                        ) : (
                          p.full_name.charAt(0)
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-content block group-hover:text-gold">
                          {p.full_name}
                        </span>
                        <span className="text-[10px] text-content-muted">
                          {p.role_id === 'trainee'
                            ? 'طالب'
                            : p.role_id === 'servant'
                            ? 'خادم'
                            : p.role_id === 'secretariat'
                            ? 'سكرتارية'
                            : 'مسؤول'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-content-muted group-hover:text-gold transition-transform -rotate-180" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Groups Section */}
          {(activeTab === 'all' || activeTab === 'groups') && results.groups.length > 0 && (
            <div>
              <span className="text-xs font-black text-gold block mb-2 px-1">الفرق الدراسية</span>
              <div className="space-y-1.5">
                {results.groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      router.push(`/groups/${g.id}`);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-canvas hover:bg-card border border-line transition-all text-right group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-info/10 text-info flex items-center justify-center font-black text-xs shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-content block group-hover:text-gold">
                          {g.name}
                        </span>
                        <span className="text-[10px] text-content-muted line-clamp-1">{g.description || 'فرقة دراسية'}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-content-muted group-hover:text-gold transition-transform -rotate-180" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Books Section */}
          {(activeTab === 'all' || activeTab === 'books') && results.books.length > 0 && (
            <div>
              <span className="text-xs font-black text-gold block mb-2 px-1">الكتب والمراجع</span>
              <div className="space-y-1.5">
                {results.books.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      router.push('/books');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-canvas hover:bg-card border border-line transition-all text-right group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-warning/10 text-warning flex items-center justify-center font-black text-xs shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-content block group-hover:text-gold">
                          {b.title}
                        </span>
                        <span className="text-[10px] text-content-muted">{b.author || b.category}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-content-muted group-hover:text-gold transition-transform -rotate-180" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Posts Section */}
          {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
            <div>
              <span className="text-xs font-black text-gold block mb-2 px-1">المنشورات والأخبار</span>
              <div className="space-y-1.5">
                {results.posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onClose()}
                    className="p-3 rounded-2xl bg-canvas border border-line text-right cursor-pointer hover:border-gold/40 transition-colors"
                  >
                    <p className="text-xs text-content line-clamp-2">{post.content}</p>
                    <span className="text-[10px] text-content-muted mt-1 block">
                      {new Date(post.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
