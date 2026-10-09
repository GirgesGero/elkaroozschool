'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import MediaCollage from './MediaCollage';
import { DeepLinkService, ShareService } from '@/lib/mobile';
import {
  Heart,
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Trash2,
  Send,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import type { ReactionType, Profile } from '@/types/database';

export interface PostWithAuthor {
  id: string;
  author_id: string;
  content: string;
  group_id: number | null;
  created_at: string;
  images?: string[] | null;
  author?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role_id: string;
  };
  reactions?: Array<{ user_id: string; type: string }>;
  comments?: any[];
}

interface FeedPostCardProps {
  post: PostWithAuthor;
  currentUser: Profile | null;
  onOpenProfile: (id: string, role: string) => void;
  onPostDeleted?: (postId: string) => void;
}

export default function FeedPostCard({
  post,
  currentUser,
  onOpenProfile,
  onPostDeleted,
}: FeedPostCardProps) {
  const [reactions, setReactions] = useState<{
    likes: number;
    loves: number;
    prays: number;
    userReaction: ReactionType | null;
  }>({
    likes: post.reactions?.filter((r: any) => r.type === 'LIKE').length || 0,
    loves: post.reactions?.filter((r: any) => r.type === 'LOVE').length || 0,
    prays: post.reactions?.filter((r: any) => r.type === 'PRAY').length || 0,
    userReaction: (post.reactions?.find((r: any) => r.user_id === currentUser?.id)?.type as ReactionType) || null,
  });

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>(post.comments || []);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const canDelete =
    currentUser?.role_id === 'admin' ||
    currentUser?.role_id === 'super_user' ||
    currentUser?.id === post.author_id;

  const handleToggleReaction = async (type: ReactionType) => {
    if (!currentUser) return;
    const supabase = createClient();
    const currentType = reactions.userReaction;

    if (currentType === type) {
      // Remove reaction
      setReactions((prev) => ({
        ...prev,
        [type === 'LIKE' ? 'likes' : type === 'LOVE' ? 'loves' : 'prays']:
          prev[type === 'LIKE' ? 'likes' : type === 'LOVE' ? 'loves' : 'prays'] - 1,
        userReaction: null,
      }));
      await supabase.from('reactions').delete().match({ post_id: post.id, user_id: currentUser.id });
    } else {
      // Add or switch reaction
      setReactions((prev) => {
        const next = { ...prev };
        if (currentType) {
          const key = currentType === 'LIKE' ? 'likes' : currentType === 'LOVE' ? 'loves' : 'prays';
          next[key] = Math.max(0, next[key] - 1);
        }
        const newKey = type === 'LIKE' ? 'likes' : type === 'LOVE' ? 'loves' : 'prays';
        next[newKey] = next[newKey] + 1;
        next.userReaction = type;
        return next;
      });

      await supabase.from('reactions').upsert({
        post_id: post.id,
        user_id: currentUser.id,
        type: type,
      });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          author_id: currentUser.id,
          content: commentText.trim(),
        })
        .select('*, author:profiles(id, full_name, avatar_url, role_id)')
        .single();

      if (!error && data) {
        setComments((prev) => [...prev, data]);
        setCommentText('');
      }
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirmDeleteStep) {
      setConfirmDeleteStep(true);
      return;
    }
    setIsDeleting(true);
    const supabase = createClient();
    try {
      await supabase.from('posts').delete().eq('id', post.id);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
      setConfirmDeleteStep(false);
    }
  };

  const totalReactions = reactions.likes + reactions.loves + reactions.prays;

  const getGroupName = (gId: number | null) => {
    if (!gId) return 'عام لجميع الفرق';
    if (gId === 1) return 'الفرقة الأولى';
    if (gId === 2) return 'الفرقة الثانية';
    return 'الفرقة الثالثة';
  };

  return (
    <article
      className="rounded-3xl border border-slate-800/80 bg-[#0a101d] overflow-hidden shadow-xl transition-all duration-300 hover:border-[#c29938]/30"
      dir="rtl"
    >
      {/* Header: Author & Metadata */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenProfile(post.author_id, post.author?.role_id || 'trainee')}
            className="relative w-11 h-11 rounded-full bg-gradient-to-tr from-[#c29938] to-amber-600 text-slate-950 flex items-center justify-center font-black text-sm shadow-md overflow-hidden ring-2 ring-[#c29938]/40 hover:scale-105 transition-transform shrink-0"
          >
            {post.author?.avatar_url ? (
              <Image src={post.author.avatar_url} alt={post.author.full_name} fill sizes="44px" className="object-cover" />
            ) : (
              post.author?.full_name?.charAt(0) || 'ك'
            )}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenProfile(post.author_id, post.author?.role_id || 'trainee')}
                className="font-black text-sm text-slate-100 hover:text-[#c29938] transition-colors"
              >
                {post.author?.full_name || 'مستخدم مجهول'}
              </button>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">
                {post.author?.role_id === 'admin'
                  ? 'مسؤول'
                  : post.author?.role_id === 'servant'
                  ? 'خادم'
                  : post.author?.role_id === 'secretariat'
                  ? 'سكرتارية'
                  : 'طالب'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>{new Date(post.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span>•</span>
              <span className="text-[#c29938] font-bold">{getGroupName(post.group_id)}</span>
            </div>
          </div>
        </div>

        {/* Actions Dropdown */}
        {canDelete && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute left-0 mt-1 w-36 rounded-2xl bg-[#070b14] border border-slate-800 shadow-xl p-1.5 z-30 animate-scale-in">
                <button
                  onClick={handleDeletePost}
                  disabled={isDeleting}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    confirmDeleteStep
                      ? 'bg-rose-500 text-slate-950 font-black'
                      : 'text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{confirmDeleteStep ? 'تأكيد الحذف؟' : 'حذف المنشور'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Text */}
      {post.content && (
        <div className="px-4 pb-2 text-sm leading-relaxed text-slate-200 whitespace-pre-line select-text">
          {post.content}
        </div>
      )}

      {/* Media Images Collage */}
      {post.images && post.images.length > 0 && (
        <div className="px-4">
          <MediaCollage images={post.images} />
        </div>
      )}

      {/* Reaction Counts Summary */}
      {totalReactions > 0 && (
        <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/40">
          <div className="flex items-center gap-1.5">
            <span className="flex -space-x-1 space-x-reverse">
              {reactions.loves > 0 && <span className="p-0.5 rounded-full bg-rose-500 text-[10px]">❤️</span>}
              {reactions.prays > 0 && <span className="p-0.5 rounded-full bg-amber-500 text-[10px]">🙏</span>}
              {reactions.likes > 0 && <span className="p-0.5 rounded-full bg-blue-500 text-[10px]">👍</span>}
            </span>
            <span className="font-bold text-slate-300">{totalReactions}</span>
          </div>
          <button
            onClick={() => setShowComments(!showComments)}
            className="hover:text-[#c29938] transition-colors"
          >
            {comments.length} تعليق
          </button>
        </div>
      )}

      {/* Social Interactive Action Bar */}
      <div className="px-2 py-1.5 border-t border-slate-800/80 grid grid-cols-3 gap-1 bg-[#070b14]/50">
        <button
          onClick={() => handleToggleReaction(reactions.userReaction === 'LOVE' ? 'LIKE' : 'LOVE')}
          className={`flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-bold transition-all ${
            reactions.userReaction
              ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Heart className={`w-4 h-4 ${reactions.userReaction ? 'fill-current' : ''}`} />
          <span>تفاعل</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span>تعليق</span>
        </button>

        <button
          onClick={async () => {
            const canonicalUrl = DeepLinkService.buildCanonicalUrl('POST', post.id);
            const result = await ShareService.share({
              title: 'منشور من مدرسة الكاروز',
              text: post.content,
              url: canonicalUrl,
            });
            if (result.completed) {
              setShareFeedback(result.message || 'تم نسخ الرابط بنجاح');
              setTimeout(() => setShareFeedback(null), 3000);
            } else if (result.message) {
              setShareFeedback(result.message);
              setTimeout(() => setShareFeedback(null), 3000);
            }
          }}
          className="flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
        >
          <Share2 className="w-4 h-4" />
          <span>مشاركة</span>
        </button>
      </div>

      {shareFeedback && (
        <div className="px-4 py-1.5 bg-[#c29938]/15 border-t border-[#c29938]/30 text-[#c29938] text-[11px] font-bold text-center transition-all animate-fade-in">
          {shareFeedback}
        </div>
      )}

      {/* Collapsible Comments Section */}
      {showComments && (
        <div className="p-4 border-t border-slate-800/80 bg-[#070b14]/80 space-y-3">
          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="اكتب تعليقًا مباركًا..."
              className="flex-1 bg-[#0f172a] border border-slate-800 rounded-2xl px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#c29938]/50"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || isSubmittingComment}
              className="p-2.5 rounded-2xl bg-[#c29938] text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Comments List */}
          <div className="space-y-2 pt-2">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5 bg-[#0b1322] p-3 rounded-2xl border border-slate-800/60">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#c29938] to-amber-600 text-slate-950 flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden">
                  {c.author?.avatar_url ? (
                    <Image src={c.author.avatar_url} alt={c.author.full_name} width={28} height={28} className="object-cover" />
                  ) : (
                    c.author?.full_name?.charAt(0) || 'م'
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{c.author?.full_name}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
