'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import NotificationCenter from '@/components/NotificationCenter';
import GroupDashboardCards from '@/components/GroupDashboardCards';
import TraineeProfileDrawer from '@/components/TraineeProfileDrawer';
import ServantProfileDrawer from '@/components/ServantProfileDrawer';

import { useAppTheme } from '@/context/ThemeContext';
import {
  Sun,
  Moon,
  Crown,
  AlertCircle,
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  GraduationCap,
  Heart,
  Image as ImageIcon,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  ThumbsUp,
  Trash2,
  Trophy,
  User,
  Users,
  X,
  Music,
  Library,
  Settings,
  Database,
  Upload,
  FileText,
  BellRing,
  Award,
  Layers,
  Search,
  Bookmark,
  Share2,
  Smile,
  Shield,
  Clock,
  Cake,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface PostImage {
  id: string;
  storage_path: string;
  image_url: string;
}

interface CommentItem {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface FeedPostItem {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  reactions_count: number;
  comments_count: number;
  author?: {
    full_name: string;
    avatar_url: string | null;
    role_id: string;
  };
  post_images?: PostImage[];
  user_reaction?: string | null;
}

interface ReactorUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  reaction_type: string;
  created_at: string;
}

const REACTION_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  LIKE: { label: 'إعجاب', icon: ThumbsUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  LOVE: { label: 'أحببته', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  PRAY: { label: 'صلاة', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  AMEN: { label: 'آمين', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
};

export default function FeedPage() {
  const router = useRouter();
  const { theme, setTheme } = useAppTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Interactive Profile Drawers State
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);
  const [selectedServantId, setSelectedServantId] = useState<string | null>(null);
  const [isTraineeDrawerOpen, setIsTraineeDrawerOpen] = useState(false);
  const [isServantDrawerOpen, setIsServantDrawerOpen] = useState(false);
  const [myGroupSummary, setMyGroupSummary] = useState<any>(null);

  const openUserProfile = (userId: string, roleId?: string) => {
    if (roleId === 'trainee') {
      setSelectedTraineeId(userId);
      setIsTraineeDrawerOpen(true);
    } else {
      setSelectedServantId(userId);
      setIsServantDrawerOpen(true);
    }
  };


  // New Post State
  const [postContent, setPostContent] = useState('');
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Active Comments Drawer
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Map<string, CommentItem[]>>(new Map());
  const [commentInputs, setCommentInputs] = useState<Map<string, string>>(new Map());
  const [submittingComment, setSubmittingComment] = useState(false);

  // Hover reaction popup
  const [hoveredReactionPostId, setHoveredReactionPostId] = useState<string | null>(null);

  // Lightbox State
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Reactors Modal State
  const [showReactorsPostId, setShowReactorsPostId] = useState<string | null>(null);
  const [reactorsList, setReactorsList] = useState<ReactorUser[]>([]);
  const [loadingReactors, setLoadingReactors] = useState(false);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'post' | 'comment';
    id: string;
    postId?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Deleted Items Drawer (Admin / Super User)
  const [showTrashDrawer, setShowTrashDrawer] = useState(false);
  const [deletedPosts, setDeletedPosts] = useState<any[]>([]);

  // Daily verse widget
  const [dailyVerse, setDailyVerse] = useState<{ text: string; ref: string } | null>({
    text: 'الرَّبُّ رَاعِيَّ فَلاَ يَعْوُزُنِي شَيْءٌ.',
    ref: 'مزمور 23: 1'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canCreatePost = profile && ['admin', 'super_user', 'servant', 'secretariat'].includes(profile.role_id);
  const isAdminOrSuper = profile && ['admin', 'super_user'].includes(profile.role_id);

  // 1. Initial Load & Auth Check
  useEffect(() => {
    async function initFeed() {
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
        setProfile(userProfile as Profile);
        await loadPosts(user.id);

        // Fetch my group summary for secretariat/servants
        if (['secretariat', 'servant'].includes(userProfile.role_id) && userProfile.group_id) {
          const { data: grpData } = await supabase.rpc('get_group_operational_summary', {
            p_group_id: userProfile.group_id,
          });
          if (grpData) setMyGroupSummary(grpData);
        }
      }
      setLoading(false);
    }

    initFeed();
  }, [router]);

  // 2. Realtime Subscriptions
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('public_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_posts' }, () => {
        if (profile) loadPosts(profile.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => {
        if (profile) loadPosts(profile.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // 3. Load Posts
  const loadPosts = async (currentUserId: string) => {
    const supabase = createClient();
    const { data: postsData } = await supabase
      .from('feed_posts')
      .select('*, author:profiles!feed_posts_author_id_fkey(full_name, avatar_url, role_id), post_images(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(30);

    if (postsData) {
      const postIds = postsData.map((p) => p.id);
      const { data: userReactions } = await supabase
        .from('reactions')
        .select('target_id, reaction_type')
        .eq('target_type', 'POST')
        .eq('user_id', currentUserId)
        .in('target_id', postIds);

      const reactionMap = new Map();
      (userReactions || []).forEach((r) => reactionMap.set(r.target_id, r.reaction_type));

      const enhanced: FeedPostItem[] = postsData.map((p: any) => ({
        ...p,
        user_reaction: reactionMap.get(p.id) || null,
      }));

      setPosts(enhanced);
    }
  };

  // 4. Create Post with Images
  const handlePublishPost = async () => {
    if (!postContent.trim() && newImageUrls.length === 0) return;
    setIsPublishing(true);
    setPublishError(null);

    const supabase = createClient();
    const { data: post, error } = await supabase
      .from('feed_posts')
      .insert({
        content: postContent.trim(),
      })
      .select()
      .single();

    if (error || !post) {
      setPublishError(error?.message || 'فشل نشر المنشور');
      setIsPublishing(false);
      return;
    }

    if (newImageUrls.length > 0) {
      const imgPayload = newImageUrls.map((url, idx) => ({
        post_id: post.id,
        storage_path: `feed/${post.id}_${idx}.jpg`,
        image_url: url,
      }));
      await supabase.from('post_images').insert(imgPayload);
    }

    setPostContent('');
    setNewImageUrls([]);
    setIsPublishing(false);
    if (profile) await loadPosts(profile.id);
  };

  // 5. Toggle Reaction (Like, Love, Pray, Amen)
  const handleReaction = async (postId: string, reactionType: string) => {
    setHoveredReactionPostId(null);
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isSame = p.user_reaction === reactionType;
          return {
            ...p,
            user_reaction: isSame ? null : reactionType,
            reactions_count: isSame
              ? Math.max(0, p.reactions_count - 1)
              : p.user_reaction
              ? p.reactions_count
              : p.reactions_count + 1,
          };
        }
        return p;
      })
    );

    const supabase = createClient();
    await supabase.rpc('toggle_post_reaction', {
      p_post_id: postId,
      p_reaction_type: reactionType,
    });
  };

  // 6. View Reactors Modal
  const handleViewReactors = async (postId: string) => {
    setShowReactorsPostId(postId);
    setLoadingReactors(true);
    const supabase = createClient();
    const { data: reactors } = await supabase.rpc('get_post_reactors', { p_post_id: postId });
    setReactorsList(reactors || []);
    setLoadingReactors(false);
  };

  // 7. Load & Post Comments
  const handleToggleComments = async (postId: string) => {
    if (expandedCommentsPostId === postId) {
      setExpandedCommentsPostId(null);
      return;
    }

    setExpandedCommentsPostId(postId);
    const supabase = createClient();
    const { data: comments } = await supabase
      .from('post_comments')
      .select('*, author:profiles!post_comments_author_id_fkey(full_name, avatar_url)')
      .eq('post_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (comments) {
      setCommentsMap((prev) => new Map(prev).set(postId, comments as CommentItem[]));
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs.get(postId)?.trim();
    if (!text) return;
    setSubmittingComment(true);

    const supabase = createClient();
    const { data: newComment, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        content: text,
      })
      .select('*, author:profiles!post_comments_author_id_fkey(full_name, avatar_url)')
      .single();

    if (!error && newComment) {
      setCommentsMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(postId) || [];
        next.set(postId, [...existing, newComment as CommentItem]);
        return next;
      });

      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
      );

      setCommentInputs((prev) => new Map(prev).set(postId, ''));
    }
    setSubmittingComment(false);
  };

  // 8. Soft Delete Execution
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const supabase = createClient();

    if (deleteTarget.type === 'post') {
      const { error } = await supabase.rpc('soft_delete_post', { p_post_id: deleteTarget.id });
      if (!error) {
        setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      }
    } else if (deleteTarget.type === 'comment' && deleteTarget.postId) {
      const { error } = await supabase.rpc('soft_delete_comment', {
        p_comment_id: deleteTarget.id,
      });
      if (!error) {
        setCommentsMap((prev) => {
          const next = new Map(prev);
          const list = next.get(deleteTarget.postId!) || [];
          next.set(
            deleteTarget.postId!,
            list.filter((c) => c.id !== deleteTarget.id)
          );
          return next;
        });
        setPosts((prev) =>
          prev.map((p) =>
            p.id === deleteTarget.postId
              ? { ...p, comments_count: Math.max(0, p.comments_count - 1) }
              : p
          )
        );
      }
    }

    setIsDeleting(false);
    setDeleteTarget(null);
  };

  // 9. Load Deleted Items (Trash)
  const handleOpenTrash = async () => {
    setShowTrashDrawer(true);
    const supabase = createClient();
    const { data: trashed } = await supabase
      .from('feed_posts')
      .select('*, author:profiles!feed_posts_author_id_fkey(full_name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    setDeletedPosts(trashed || []);
  };

  const handleRestorePost = async (postId: string) => {
    const supabase = createClient();
    const { error } = await supabase.rpc('restore_deleted_post', { p_post_id: postId });
    if (!error) {
      setDeletedPosts((prev) => prev.filter((p) => p.id !== postId));
      if (profile) await loadPosts(profile.id);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'الآن';
    if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
    if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
    return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  };

  const getRoleBadge = (roleId?: string) => {
    switch (roleId) {
      case 'admin':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">مسؤول عام</span>;
      case 'super_user':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">سوبر يوزر</span>;
      case 'servant':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">خادم</span>;
      case 'secretariat':
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">سكرتارية</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">دارس / متدرب</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
        <span className="text-sm font-semibold tracking-wide">جاري تحميل مجتمع مدرسة الكاروز...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col font-sans selection:bg-[#7B0017] selection:text-white"
         style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
         dir="rtl">
      
      {/* Background Ambient Logo Watermark */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden">
        <div className="relative w-[850px] h-[850px] opacity-[var(--watermark-opacity)]">
          <Image
            src="/logo.png"
            alt="Watermark Logo"
            fill
            sizes="850px"
            priority
            className="object-contain filter grayscale"
          />
        </div>
      </div>

      {/* 1. Facebook-Style Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-md shadow-sm"
              style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border-card)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          
          {/* Right in RTL: Logo & School Name */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-10 h-10 rounded-full border shadow-sm overflow-hidden flex-shrink-0"
                   style={{ borderColor: 'var(--border-card)' }}>
                <Image src="/logo.png" alt="شعار مدرسة الكاروز" fill sizes="40px" className="object-cover" />
              </div>
              <div className="hidden sm:block text-right">
                <span className="font-extrabold text-sm block leading-tight text-[var(--text-primary)]">
                  مدرسة الكاروز
                </span>
                <span className="text-[10px] opacity-70 block -mt-0.5">كنيسة مارمرقس بالمنشية</span>
              </div>
            </Link>

            {/* Mock Search Bar */}
            <div className="hidden md:flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-full px-3.5 py-1.5 text-xs text-[var(--text-secondary)] w-56 focus-within:w-64 focus-within:border-[var(--brand-primary)] transition-all">
              <Search className="w-3.5 h-3.5 opacity-60" />
              <input
                type="text"
                placeholder="بحث في منشورات المدرسة..."
                className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:opacity-50 text-xs w-full"
              />
            </div>
          </div>

          {/* Center Shortcuts (FB Style Icons) */}
          <nav className="hidden lg:flex items-center gap-1 h-full">
            <Link
              href="/"
              className="px-6 h-full flex items-center border-b-2 border-[var(--brand-primary)] text-[var(--text-active-tab)] font-bold transition bg-[var(--bg-active-tab)]"
              title="الحائط العام"
            >
              <Users className="w-5 h-5" />
            </Link>
            <Link
              href="/bible"
              className="px-6 h-full flex items-center border-b-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition"
              title="الكتاب المقدس"
            >
              <BookOpen className="w-5 h-5" />
            </Link>
            <Link
              href="/curriculum"
              className="px-6 h-full flex items-center border-b-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition"
              title="المحاضرات"
            >
              <GraduationCap className="w-5 h-5" />
            </Link>
            <Link
              href="/attendance"
              className="px-6 h-full flex items-center border-b-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition"
              title="الحضور والغياب"
            >
              <Calendar className="w-5 h-5" />
            </Link>
            <Link
              href="/marathon"
              className="px-6 h-full flex items-center border-b-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition"
              title="الماراثون الإلكتروني"
            >
              <Trophy className="w-5 h-5" />
            </Link>
          </nav>

          {/* Left in RTL: User Controls & Theme Switcher */}
          <div className="flex items-center gap-2">
            
            {/* Theme Selector */}
            <div className="flex items-center bg-[var(--bg-input)] rounded-full p-1 border border-[var(--border-card)]">
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-full transition-all ${
                  theme === 'light' ? 'bg-[var(--bg-card)] shadow-sm text-[#7B0017]' : 'opacity-60 hover:opacity-100'
                }`}
                title="الثيم النهاري الفاتح"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-full transition-all ${
                  theme === 'dark' ? 'bg-[var(--bg-card)] shadow-sm text-[#FA383E]' : 'opacity-60 hover:opacity-100'
                }`}
                title="الثيم الليلي الداكن"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('luxury')}
                className={`p-1.5 rounded-full transition-all ${
                  theme === 'luxury' ? 'bg-[var(--bg-card)] shadow-sm text-[#D4AF37]' : 'opacity-60 hover:opacity-100'
                }`}
                title="ثيم الفخامة القبطية"
              >
                <Crown className="w-3.5 h-3.5" />
              </button>
            </div>

            <NotificationCenter />

            {isAdminOrSuper && (
              <button
                onClick={handleOpenTrash}
                className="p-2 bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] rounded-full text-xs flex items-center gap-1.5 transition border border-[var(--border-card)]"
                title="سلة المحذوفات"
              >
                <Trash2 className="w-4 h-4 text-[#C5A059]" />
              </button>
            )}

            {/* User Pill */}
            <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-full py-1 pr-1.5 pl-3">
              <div className="w-7 h-7 rounded-full bg-[#7B0017] text-white flex items-center justify-center font-bold text-xs shadow-inner">
                {profile?.full_name?.charAt(0) || 'م'}
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)] hidden sm:inline max-w-[100px] truncate">
                {profile?.full_name?.split(' ')[0]}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full transition"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main 3-Column Layout Container */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-2 sm:px-4 py-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* === RIGHT SIDEBAR IN RTL (Navigation & Admin Tools) === */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="app-card p-4 space-y-1">
            <div className="flex items-center gap-3 px-2 py-2 mb-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="w-10 h-10 rounded-full bg-[#7B0017] text-white flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0">
                {profile?.full_name?.charAt(0) || 'م'}
              </div>
              <div className="overflow-hidden text-right">
                <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">{profile?.full_name}</h3>
                <div className="mt-0.5">{getRoleBadge(profile?.role_id)}</div>
              </div>
            </div>

                        {/* Study Groups Navigation */}
            <div className="pt-2 pb-1 border-t border-[var(--border-subtle)]">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] px-3 mb-1 block">إدارة الفرق الدراسية</span>
              <div className="space-y-0.5">
                <Link
                  href="/groups/1"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-[var(--text-secondary)] hover:text-karooz-gold hover:bg-[var(--bg-card-hover)] transition text-xs font-semibold"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>الفرقة الأولى (التأسيس)</span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                </Link>

                <Link
                  href="/groups/2"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-[var(--text-secondary)] hover:text-karooz-gold hover:bg-[var(--bg-card-hover)] transition text-xs font-semibold"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>الفرقة الثانية (التعمق)</span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                </Link>

                <Link
                  href="/groups/3"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-[var(--text-secondary)] hover:text-karooz-gold hover:bg-[var(--bg-card-hover)] transition text-xs font-semibold"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>الفرقة الثالثة (التخرج)</span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                </Link>
              </div>
            </div>

            {/* Quick Links */}
            <Link
              href="/bible"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition text-xs font-semibold"
            >
              <BookOpen className="w-4 h-4 text-[#C5A059]" />
              <span>الكتاب المقدس والتفاسير</span>
            </Link>

            <Link
              href="/curriculum"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition text-xs font-semibold"
            >
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              <span>المحاضرات والمناهج</span>
            </Link>

            <Link
              href="/attendance"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition text-xs font-semibold"
            >
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>الحضور والغياب الأسبوعي</span>
            </Link>

            <Link
              href="/marathon"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition text-xs font-semibold"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>الماراثون الإلكتروني</span>
            </Link>

            <Link
              href="/books"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition text-xs font-semibold"
            >
              <Library className="w-4 h-4 text-purple-500" />
              <span>المكتبة والأبحاث</span>
            </Link>

            <Link
              href="/gallery"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition text-xs font-semibold"
            >
              <Camera className="w-4 h-4 text-amber-500" />
              <span>معرض صور الأنشطة</span>
            </Link>

            <Link
              href="/mp3"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition text-xs font-semibold"
            >
              <Music className="w-4 h-4 text-cyan-500" />
              <span>المكتبة الصوتية MP3</span>
            </Link>

            <Link
              href="/exams"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition text-xs font-semibold"
            >
              <Award className="w-4 h-4 text-emerald-500" />
              <span>الامتحانات والدرجات</span>
            </Link>
          </div>

          {/* Admin Tools Box */}
          {(isAdminOrSuper || profile?.role_id === 'secretariat' || profile?.role_id === 'servant') && (
            <div className="app-card p-4 space-y-2 border-r-4 border-r-[#C5A059]">
              <div className="flex items-center gap-2 px-1 mb-1">
                <Settings className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-xs text-amber-300">أدوات الإدارة ومتابعة الفرق</h4>
              </div>

              <div className="space-y-1">
                <Link
                  href="/trainees"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition text-xs font-medium"
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>شؤون المتدربين والفرق</span>
                </Link>

                <Link
                  href="/marathon/manage"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition text-xs font-medium"
                >
                  <Trophy className="w-3.5 h-3.5 text-rose-400" />
                  <span>إدارة أسئلة الماراثون</span>
                </Link>

                {isAdminOrSuper && (
                  <>
                    <Link
                      href="/admin/notifications"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition text-xs font-medium"
                    >
                      <BellRing className="w-3.5 h-3.5 text-amber-400" />
                      <span>إدارة الإشعارات والآيات</span>
                    </Link>

                    <Link
                      href="/admin/backups"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition text-xs font-medium"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>النسخ الاحتياطي المشفر</span>
                    </Link>

                    <Link
                      href="/admin/imports"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition text-xs font-medium"
                    >
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>الاستيراد الجماعي للطلاب</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* === CENTER FEED COLUMN (Main Social Stream) === */}
        <main className="col-span-1 lg:col-span-6 space-y-4">
          
          {/* Mobile Quick Shortcut Bar */}
          <div className="grid grid-cols-4 gap-2 lg:hidden">
            <Link href="/bible" className="app-card p-2.5 flex flex-col items-center gap-1 text-[11px] font-bold text-center">
              <BookOpen className="w-4 h-4 text-[#C5A059]" />
              <span>الكتاب المقدس</span>
            </Link>
            <Link href="/curriculum" className="app-card p-2.5 flex flex-col items-center gap-1 text-[11px] font-bold text-center">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              <span>المحاضرات</span>
            </Link>
            <Link href="/attendance" className="app-card p-2.5 flex flex-col items-center gap-1 text-[11px] font-bold text-center">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>الحضور</span>
            </Link>
            <Link href="/marathon" className="app-card p-2.5 flex flex-col items-center gap-1 text-[11px] font-bold text-center">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>الماراثون</span>
            </Link>
          </div>

                    {/* ADMIN OPERATIONAL DASHBOARD: 3 GROUP CARDS */}
          {isAdminOrSuper && (
            <div className="mb-6">
              <GroupDashboardCards />
            </div>
          )}

          {/* SECRETARIAT OPERATIONAL BANNER */}
          {profile?.role_id === 'secretariat' && (
            <div className="app-card p-4 border-r-4 border-r-purple-500 space-y-3 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span>فرقتي ({profile?.group_id === 1 ? 'الفرقة الأولى' : profile?.group_id === 2 ? 'الفرقة الثانية' : 'الفرقة الثالثة'}) — لوحة السكرتارية اليومية</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">متابعة وتسجيل حضور الجمعة، رصد الغياب، وإرسال الافتقاد</p>
                </div>
                <Link
                  href={`/groups/${profile?.group_id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs self-start sm:self-auto transition shadow-sm"
                >
                  فتح لوحة الفرقة ←
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-[var(--border-subtle)] text-xs">
                <div className="bg-slate-950/40 p-2 rounded-xl border border-[var(--border-card)]">
                  <span className="text-[11px] text-slate-400 block">إجمالي الطلبة</span>
                  <span className="font-bold text-sm text-slate-100 mt-0.5 block">{myGroupSummary?.trainees_count || 0}</span>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  <span className="text-[11px] text-emerald-400 block">حاضر الجمعة</span>
                  <span className="font-bold text-sm text-emerald-300 mt-0.5 block">{myGroupSummary?.latest_present || 0}</span>
                </div>
                <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                  <span className="text-[11px] text-rose-400 block">غياب الجمعة</span>
                  <span className="font-bold text-sm text-rose-300 mt-0.5 block">{myGroupSummary?.latest_absent || 0}</span>
                </div>
                <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  <span className="text-[11px] text-amber-400 block">متأخر</span>
                  <span className="font-bold text-sm text-amber-300 mt-0.5 block">{myGroupSummary?.latest_late || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* SERVANT OPERATIONAL BANNER */}
          {profile?.role_id === 'servant' && (
            <div className="app-card p-4 border-r-4 border-r-blue-500 space-y-2 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    <span>فرقتي ({profile?.group_id === 1 ? 'الفرقة الأولى' : profile?.group_id === 2 ? 'الفرقة الثانية' : 'الفرقة الثالثة'}) — الخادم</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">متابعة طلاب الفرقة والمهام الأكاديمية المفوضة</p>
                </div>
                <Link
                  href={`/groups/${profile?.group_id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs self-start sm:self-auto transition shadow-sm"
                >
                  عرض طلاب الفرقة ←
                </Link>
              </div>
            </div>
          )}

          {/* Facebook-Style Create Post Box */}
          {canCreatePost ? (
            <div className="app-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7B0017] text-white flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0">
                  {profile?.full_name?.charAt(0) || 'م'}
                </div>
                <textarea
                  rows={2}
                  placeholder={`بمَ تفكر يا ${profile?.full_name?.split(' ')[0] || 'خادم'}؟ شارك مجتمع مدرسة الكاروز...`}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="app-input w-full rounded-2xl p-3 text-xs resize-none transition"
                />
              </div>

              {/* Image previews */}
              {newImageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  {newImageUrls.map((url, i) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border-card)]">
                      <Image src={url} alt={`مرفق ${i + 1}`} fill sizes="(max-width: 768px) 33vw, 150px" className="object-cover" />
                      <button
                        onClick={() => setNewImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full hover:bg-red-600 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('أدخل رابط الصورة:');
                      if (url) setNewImageUrls((prev) => [...prev, url]);
                    }}
                    className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-emerald-500 px-3 py-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] transition font-medium"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>صورة / نشاط</span>
                  </button>
                </div>

                <button
                  onClick={handlePublishPost}
                  disabled={isPublishing || (!postContent.trim() && newImageUrls.length === 0)}
                  className="app-btn-primary flex items-center gap-2 px-5 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>نشر على الحائط</span>
                </button>
              </div>

              {publishError && <p className="text-red-500 text-xs">{publishError}</p>}
            </div>
          ) : (
            <div className="app-card p-3.5 text-xs text-[var(--text-secondary)] flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
              <span>الحائط العام مخصص لإعلانات وتأملات مدرسة الكاروز. نرحب بتفاعلاتك وتعليقاتك!</span>
            </div>
          )}

          {/* Posts Feed Stream */}
          <div className="space-y-4">
            {posts.map((post) => {
              const userRec = post.user_reaction ? REACTION_CONFIG[post.user_reaction] : null;
              const postImages = post.post_images || [];
              const isOwner = profile?.id === post.author_id;

              return (
                <article
                  key={post.id}
                  className="app-card p-4 space-y-3 transition hover:shadow-md"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#7B0017] text-white flex items-center justify-center font-bold text-sm shadow-inner">
                        {post.author?.full_name?.charAt(0) || 'خ'}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[var(--text-primary)] hover:underline cursor-pointer">
                            {post.author?.full_name || 'خادم مدرسة الكاروز'}
                          </span>
                          {getRoleBadge(post.author?.role_id)}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(post.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Post Options Menu */}
                    {(isOwner || isAdminOrSuper) && (
                      <button
                        onClick={() => setDeleteTarget({ type: 'post', id: post.id })}
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-500 rounded-lg hover:bg-[var(--bg-card-hover)] transition"
                        title="حذف المنشور"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Post Body Text */}
                  <p className="text-[var(--text-primary)] text-xs leading-relaxed whitespace-pre-line text-right">
                    {post.content}
                  </p>

                  {/* Post Images Mosaic / Grid */}
                  {postImages.length > 0 && (
                    <div
                      className={`grid gap-1.5 rounded-xl overflow-hidden ${
                        postImages.length === 1
                          ? 'grid-cols-1'
                          : postImages.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-2 sm:grid-cols-3'
                      }`}
                    >
                      {postImages.map((img, idx) => (
                        <div
                          key={img.id || idx}
                          onClick={() => {
                            setLightboxImages(postImages.map((p) => p.image_url));
                            setLightboxIndex(idx);
                          }}
                          className="relative aspect-video bg-slate-900 cursor-pointer overflow-hidden group"
                        >
                          <Image
                            src={img.image_url}
                            alt="صورة المنشور"
                            fill
                            sizes="(max-width: 768px) 100vw, 500px"
                            className="object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reactions & Comments Counter Bar */}
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={() => handleViewReactors(post.id)}
                      className="flex items-center gap-1.5 hover:text-[#7B0017] dark:hover:text-[#FA383E] transition"
                    >
                      <div className="flex items-center -space-x-1">
                        <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] text-white">👍</span>
                        <span className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-[9px] text-white">❤️</span>
                        <span className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-[9px] text-white">🙏</span>
                      </div>
                      <span>{post.reactions_count} تفاعل</span>
                    </button>

                    <button
                      onClick={() => handleToggleComments(post.id)}
                      className="hover:text-[#7B0017] dark:hover:text-[#FA383E] transition"
                    >
                      {post.comments_count} تعليق
                    </button>
                  </div>

                  {/* Facebook-Style Action Buttons Bar */}
                  <div className="relative grid grid-cols-2 pt-1 border-t border-[var(--border-subtle)]">
                    
                    {/* Reaction Button with Pop-up Flyout */}
                    <div
                      className="relative"
                      onMouseEnter={() => setHoveredReactionPostId(post.id)}
                      onMouseLeave={() => setHoveredReactionPostId(null)}
                    >
                      {/* Flyout Menu */}
                      {hoveredReactionPostId === post.id && (
                        <div className="absolute -top-12 right-2 app-card px-3 py-1.5 flex items-center gap-3 shadow-2xl z-20 animate-in fade-in zoom-in-90 duration-150">
                          {Object.entries(REACTION_CONFIG).map(([type, cfg]) => {
                            const IconComponent = cfg.icon;
                            return (
                              <button
                                key={type}
                                onClick={() => handleReaction(post.id, type)}
                                className="transform hover:scale-130 transition duration-150 p-1 flex flex-col items-center"
                                title={cfg.label}
                              >
                                <IconComponent className={`w-5 h-5 ${cfg.color}`} />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <button
                        onClick={() => handleReaction(post.id, post.user_reaction || 'LIKE')}
                        className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 transition text-xs font-bold hover:bg-[var(--bg-card-hover)] ${
                          userRec ? userRec.color : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {userRec ? (
                          <>
                            <userRec.icon className="w-4 h-4" />
                            <span>{userRec.label}</span>
                          </>
                        ) : (
                          <>
                            <ThumbsUp className="w-4 h-4" />
                            <span>تفاعل</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Comments Button */}
                    <button
                      onClick={() => handleToggleComments(post.id)}
                      className="w-full py-2 rounded-xl flex items-center justify-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition text-xs font-bold"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>تعليق</span>
                    </button>
                  </div>

                  {/* Embedded Comments Section */}
                  {expandedCommentsPostId === post.id && (
                    <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
                      
                      {/* Comments List */}
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {(commentsMap.get(post.id) || []).map((comment) => (
                          <div key={comment.id} className="flex items-start gap-2.5 group">
                            <div className="w-7 h-7 rounded-full bg-[#7B0017] text-white flex items-center justify-center font-bold text-[11px] shadow-inner flex-shrink-0 mt-0.5">
                              {comment.author?.full_name?.charAt(0) || 'م'}
                            </div>
                            <div className="flex-1 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-2xl px-3.5 py-2 text-right">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[11px] text-[var(--text-primary)]">
                                  {comment.author?.full_name || 'عضو بالمدرسة'}
                                </span>
                                {(profile?.id === comment.author_id || isAdminOrSuper || isOwner) && (
                                  <button
                                    onClick={() =>
                                      setDeleteTarget({ type: 'comment', id: comment.id, postId: post.id })
                                    }
                                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-500 p-0.5 transition"
                                    title="حذف التعليق"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-[var(--text-primary)] text-xs mt-0.5 whitespace-pre-line">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Comment Input Bar */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#7B0017] text-white flex items-center justify-center font-bold text-[11px] shadow-inner flex-shrink-0">
                          {profile?.full_name?.charAt(0) || 'م'}
                        </div>
                        <div className="flex-1 flex items-center bg-[var(--bg-input)] border border-[var(--border-card)] rounded-full px-3 py-1.5 focus-within:border-[var(--brand-primary)] transition">
                          <input
                            type="text"
                            placeholder="اكتب تعليقاً..."
                            value={commentInputs.get(post.id) || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => new Map(prev).set(post.id, e.target.value))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                            className="w-full bg-transparent border-none outline-none text-xs text-[var(--text-primary)] placeholder:opacity-50 text-right"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={submittingComment || !commentInputs.get(post.id)?.trim()}
                            className="p-1 text-[#7B0017] dark:text-[#FA383E] hover:opacity-80 disabled:opacity-30 transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </main>

        {/* === LEFT SIDEBAR IN RTL (Widgets & Community Cards) === */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          
          {/* Daily Bible Verse Widget */}
          <div className="app-card p-4 space-y-2 border-t-4 border-t-[#C5A059]">
            <div className="flex items-center gap-2 text-[#C5A059] font-bold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>آية اليوم</span>
            </div>
            <p className="text-[var(--text-primary)] text-xs leading-relaxed font-serif italic text-right">
              &quot;{dailyVerse?.text}&quot;
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[11px]">
              <span className="font-bold text-[#C5A059]">{dailyVerse?.ref}</span>
              <Link href="/bible" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition">
                <span>تصفح الإصحاح</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Upcoming Friday Lecture Widget */}
          <div className="app-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <h4 className="font-bold text-xs text-[var(--text-primary)]">محاضرات الجمعة القادمة</h4>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                6:00 م
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)] text-right">
                <span className="text-[10px] text-[#C5A059] font-bold block">المحاضرة الأولى</span>
                <span className="font-semibold text-[var(--text-primary)] text-xs block">الخلفيات العشرة للكتاب المقدس</span>
                <span className="text-[11px] text-[var(--text-secondary)]">تقديم: أ / عماد رمزي</span>
              </div>

              <div className="p-2.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)] text-right">
                <span className="text-[10px] text-cyan-500 font-bold block">المحاضرة الثانية</span>
                <span className="font-semibold text-[var(--text-primary)] text-xs block">مدخل إلى أسفار العهد الجديد</span>
                <span className="text-[11px] text-[var(--text-secondary)]">تقديم: القمص موريس</span>
              </div>
            </div>

            <Link
              href="/curriculum"
              className="app-btn-secondary w-full flex items-center justify-center gap-1.5 py-2 text-xs text-center"
            >
              <span>عرض جدول المنهج الكامل</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* School Community Footer Info */}
          <div className="px-2 text-[11px] text-[var(--text-muted)] space-y-1 text-right">
            <p>مدرسة الكاروز للكتاب المقدس © 2026</p>
            <p>كنيسة مار مرقس الرسول — مطرانية شبرا الخيمة</p>
          </div>
        </aside>

      </div>

      {/* Lightbox Modal */}
      {lightboxImages && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxImages(null)}
            className="absolute top-4 right-4 p-2.5 bg-slate-800/80 text-white rounded-full hover:bg-slate-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center">
            <Image
              src={lightboxImages[lightboxIndex]}
              alt="معاينة الصورة المكبرة"
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* Reactors Modal */}
      {showReactorsPostId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="app-card-elevated max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">المتفاعلون مع المنشور</h3>
              <button onClick={() => setShowReactorsPostId(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingReactors ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#C5A059]" />
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reactorsList.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-[var(--bg-card-hover)] rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#7B0017] text-white font-bold text-xs flex items-center justify-center shadow-inner">
                        {r.full_name?.charAt(0)}
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{r.full_name}</span>
                    </div>
                    <span className="text-xs">{REACTION_CONFIG[r.reaction_type]?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="app-card-elevated max-w-sm w-full p-5 space-y-4 text-center border-red-500/30">
            <Trash2 className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="font-bold text-base text-[var(--text-primary)]">هل أنت متأكد من الحذف؟</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              سيتم نقل العنصر إلى سلة المحذوفات المؤقتة لمدة 60 يوماً قبل الحذف النهائي.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="app-btn-secondary py-2.5 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Drawer */}
      {showTrashDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-end">
          <div className="app-card-elevated border-r max-w-md w-full h-full p-5 space-y-4 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-[#C5A059]" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">سلة المنشورات المحذوفة</h3>
              </div>
              <button onClick={() => setShowTrashDrawer(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {deletedPosts.length === 0 ? (
                <p className="text-center py-10 text-xs text-[var(--text-muted)]">سلة المحذوفات فارغة حالياً</p>
              ) : (
                deletedPosts.map((dp) => (
                  <div key={dp.id} className="p-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[var(--text-muted)] text-[10px]">
                      <span>بواسطة: {dp.author?.full_name}</span>
                      <span>تاريخ الحذف: {formatTimeAgo(dp.deleted_at)}</span>
                    </div>
                    <p className="text-[var(--text-primary)] line-clamp-2">{dp.content}</p>
                    <button
                      onClick={() => handleRestorePost(dp.id)}
                      className="w-full py-1.5 bg-[#7B0017]/10 hover:bg-[#7B0017]/20 text-[#7B0017] dark:text-[#FA383E] border border-[#7B0017]/30 rounded-lg text-xs font-bold transition"
                    >
                      استعادة المنشور الآن
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
