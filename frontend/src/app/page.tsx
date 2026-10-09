'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import FeedPostCard from '@/components/FeedPostCard';
import PostComposer from '@/components/PostComposer';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import {
  BookOpen,
  Flame,
  Award,
  CalendarCheck,
  Music,
  Image as ImageIcon,
  Users,
  Shield,
  Clock,
  Sparkles,
  ChevronLeft,
  MessageCircle,
} from 'lucide-react';
import type { Profile } from '@/types/database';

export default function FeedPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [quickVerse, setQuickVerse] = useState<{ text: string; reference: string }>({
    text: '«أَمَّا أَنَا وَبَيْتِي فَنَعْبُدُ الرَّبَّ»',
    reference: 'يشوع ٢٤: ١٥',
  });

  const fetchSessionAndFeed = async () => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userProfile) {
        setProfile(userProfile);
      }

      // Fetch Posts with reactions & author
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(id, full_name, avatar_url, role_id),
          reactions(user_id, type),
          comments(*, author:profiles(id, full_name, avatar_url))
        `)
        .order('created_at', { ascending: false })
        .limit(25);

      if (postsData) {
        const formatted = postsData.map((p) => {
          let imgs: string[] = [];
          if (Array.isArray(p.images)) {
            imgs = p.images;
          } else if (p.images && typeof p.images === 'string') {
            try {
              imgs = JSON.parse(p.images);
            } catch {
              imgs = [p.images];
            }
          }
          return { ...p, images: imgs };
        });
        setPosts(formatted);
      }
    } catch (err) {
      console.error('Feed initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndFeed();
  }, [router]);

  const handleOpenProfile = (id: string) => {
    setSelectedProfileId(id);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-[#c29938] selection:text-slate-950" dir="rtl">
      {/* Smart Scroll Header */}
      <SmartHeader
        profile={profile}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={handleOpenProfile}
      />

      {/* Global Search Dialog */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenProfile={handleOpenProfile}
      />

      {/* Unified Profile Modal */}
      <UnifiedProfileModal
        profileId={selectedProfileId}
        currentUser={profile}
        onClose={() => setSelectedProfileId(null)}
      />

      {/* Main Responsive Grid Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 py-4 pb-20 md:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* RIGHT SIDEBAR (Desktop Only) */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-20 h-fit">
            {profile && (
              <div className="p-4 rounded-3xl bg-[#0a101d] border border-slate-800/80 shadow-xl text-center">
                <div className="relative w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-[#c29938] to-amber-600 p-0.5 shadow-lg overflow-hidden mb-2">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-black text-xl text-[#c29938] overflow-hidden">
                    {profile.avatar_url ? (
                      <Image src={profile.avatar_url} alt={profile.full_name} fill sizes="64px" className="object-cover" />
                    ) : (
                      profile.full_name.charAt(0)
                    )}
                  </div>
                </div>
                <h3 className="font-black text-sm text-slate-100">{profile.full_name}</h3>
                <span className="text-[11px] font-bold text-[#c29938] block mt-0.5">
                  {profile.role_id === 'admin'
                    ? 'مدير النظام'
                    : profile.role_id === 'servant'
                    ? 'خادم الفرقة'
                    : profile.role_id === 'secretariat'
                    ? 'سكرتارية'
                    : 'طالب بالمدرسة'}
                </span>
                <button
                  onClick={() => handleOpenProfile(profile.id)}
                  className="w-full mt-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#c29938] hover:text-slate-950 border border-slate-800 text-xs font-bold text-slate-300 transition-all"
                >
                  عرض ملفي الشخصي
                </button>
              </div>
            )}

            <div className="p-4 rounded-3xl bg-[#0a101d] border border-slate-800/80 shadow-xl space-y-1">
              <span className="text-xs font-black text-[#c29938] block px-2 mb-2">الأقسام التعليمية</span>
              <Link
                href="/groups"
                className="flex items-center gap-2.5 p-2.5 rounded-2xl hover:bg-slate-800/60 text-slate-300 hover:text-white text-xs font-bold transition-all"
              >
                <Users className="w-4 h-4 text-blue-400" />
                <span>الفرق والمجموعات</span>
              </Link>
              <Link
                href="/curriculum"
                className="flex items-center gap-2.5 p-2.5 rounded-2xl hover:bg-slate-800/60 text-slate-300 hover:text-white text-xs font-bold transition-all"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>المناهج والمحاضرات</span>
              </Link>
              <Link
                href="/marathon"
                className="flex items-center gap-2.5 p-2.5 rounded-2xl hover:bg-slate-800/60 text-slate-300 hover:text-white text-xs font-bold transition-all"
              >
                <Flame className="w-4 h-4 text-rose-400" />
                <span>ماراثون الآيات</span>
              </Link>
              <Link
                href="/exams"
                className="flex items-center gap-2.5 p-2.5 rounded-2xl hover:bg-slate-800/60 text-slate-300 hover:text-white text-xs font-bold transition-all"
              >
                <Award className="w-4 h-4 text-purple-400" />
                <span>الامتحانات والتقييم</span>
              </Link>
              <Link
                href="/attendance"
                className="flex items-center gap-2.5 p-2.5 rounded-2xl hover:bg-slate-800/60 text-slate-300 hover:text-white text-xs font-bold transition-all"
              >
                <CalendarCheck className="w-4 h-4 text-emerald-400" />
                <span>الغياب والحضور</span>
              </Link>
              <Link
                href="/bible"
                className="flex items-center gap-2.5 p-2.5 rounded-2xl hover:bg-slate-800/60 text-slate-300 hover:text-white text-xs font-bold transition-all"
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>الكتاب المقدس</span>
              </Link>
            </div>
          </aside>

          {/* CENTER FEED STREAM */}
          <section className="lg:col-span-6 space-y-4">
            <div className="p-4 rounded-3xl bg-gradient-to-r from-[#0B1B3D]/80 via-[#132347]/80 to-[#7B0017]/50 border border-[#c29938]/30 shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#c29938]/20 border border-[#c29938]/40 text-[#c29938] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200 leading-snug">{quickVerse.text}</p>
                  <span className="text-[10px] text-[#c29938] font-black mt-0.5 block">{quickVerse.reference}</span>
                </div>
              </div>
            </div>

            <PostComposer currentUser={profile} onPostCreated={fetchSessionAndFeed} />

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-4 rounded-3xl bg-[#0a101d] border border-slate-800 animate-pulse space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800" />
                      <div className="space-y-1.5">
                        <div className="w-24 h-3 bg-slate-800 rounded" />
                        <div className="w-16 h-2 bg-slate-800 rounded" />
                      </div>
                    </div>
                    <div className="w-full h-12 bg-slate-800/60 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="p-12 rounded-3xl bg-[#0a101d] border border-slate-800 text-center">
                <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-300">لا توجد منشورات حالياً</h4>
                <p className="text-xs text-slate-500 mt-1">كن أول من ينشر إعلاناً أو كلمة مباركة للمدرسة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    currentUser={profile}
                    onOpenProfile={handleOpenProfile}
                    onPostDeleted={handlePostDeleted}
                  />
                ))}
              </div>
            )}
          </section>

          {/* LEFT SIDEBAR (Desktop Only) */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-20 h-fit">
            <div className="p-4 rounded-3xl bg-[#0a101d] border border-slate-800/80 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-[#c29938]">الفرق الدراسية</span>
                <Link href="/groups" className="text-[11px] text-slate-400 hover:text-[#c29938]">
                  عرض الكل
                </Link>
              </div>
              <div className="space-y-1.5">
                <Link
                  href="/groups/1"
                  className="p-3 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 flex items-center justify-between text-xs font-bold text-slate-200 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>الفرقة الأولى</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-[#c29938] transition-transform" />
                </Link>

                <Link
                  href="/groups/2"
                  className="p-3 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 flex items-center justify-between text-xs font-bold text-slate-200 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>الفرقة الثانية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-[#c29938] transition-transform" />
                </Link>

                <Link
                  href="/groups/3"
                  className="p-3 rounded-2xl bg-[#0e1626] hover:bg-[#131f37] border border-slate-800 flex items-center justify-between text-xs font-bold text-slate-200 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>الفرقة الثالثة</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-[#c29938] transition-transform" />
                </Link>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#0a101d] border border-slate-800/80 shadow-xl space-y-2">
              <span className="text-xs font-black text-[#c29938] block px-1">الوسائط السحابية</span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/mp3"
                  className="p-3 rounded-2xl bg-[#0e1626] border border-slate-800 hover:border-cyan-500/50 flex flex-col items-center justify-center text-center group transition-all"
                >
                  <Music className="w-5 h-5 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-200">الصوتيات MP3</span>
                </Link>
                <Link
                  href="/gallery"
                  className="p-3 rounded-2xl bg-[#0e1626] border border-slate-800 hover:border-amber-500/50 flex flex-col items-center justify-center text-center group transition-all"
                >
                  <ImageIcon className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-200">معرض الصور</span>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav profile={profile} onOpenProfile={handleOpenProfile} />
    </div>
  );
}
