'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Image as ImageIcon,
  Sparkles,
  Send,
  X,
  Users,
  Globe,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface PostComposerProps {
  currentUser: Profile | null;
  onPostCreated?: () => void;
}

export default function PostComposer({ currentUser, onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [targetGroup, setTargetGroup] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showImageInput, setShowImageInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user can create posts (Staff or Admin)
  const canPost =
    currentUser?.role_id === 'admin' ||
    currentUser?.role_id === 'super_user' ||
    currentUser?.role_id === 'servant' ||
    currentUser?.role_id === 'secretariat';

  if (!canPost || !currentUser) return null;

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    setImages((prev) => [...prev, imageUrl.trim()]);
    setImageUrl('');
    setShowImageInput(false);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && images.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.from('posts').insert({
        author_id: currentUser.id,
        content: content.trim(),
        group_id: targetGroup,
        images: images.length > 0 ? images : null,
      });

      if (!error) {
        setContent('');
        setImages([]);
        setTargetGroup(null);
        if (onPostCreated) onPostCreated();
      }
    } catch (err) {
      console.error('Post creation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0a101d] p-4 shadow-xl mb-5" dir="rtl">
      <form onSubmit={handleSubmitPost}>
        {/* Top bar: Author avatar and text area */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#c29938] to-amber-600 text-slate-950 flex items-center justify-center font-black text-sm shadow-md overflow-hidden shrink-0 mt-0.5">
            {currentUser.avatar_url ? (
              <Image src={currentUser.avatar_url} alt={currentUser.full_name} width={40} height={40} className="object-cover" />
            ) : (
              currentUser.full_name.charAt(0)
            )}
          </div>

          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`بم تفكّر يا ${currentUser.full_name.split(' ')[0]}؟ انشر إعلانًا أو كلمة روحية...`}
              rows={2}
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Staged Images Previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 my-3 pr-12">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#c29938]/40 group">
                <Image src={img} alt="صورة مرفقة" fill sizes="80px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1 left-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Image URL Input Form */}
        {showImageInput && (
          <div className="flex items-center gap-2 my-2 pr-12">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="رابط الصورة المباشر (https://...)"
              className="flex-1 bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#c29938]"
            />
            <button
              type="button"
              onClick={handleAddImage}
              className="px-3 py-1.5 rounded-xl bg-[#c29938] text-slate-950 font-bold text-xs hover:bg-amber-400"
            >
              إضافة
            </button>
            <button
              type="button"
              onClick={() => setShowImageInput(false)}
              className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
            >
              إلغاء
            </button>
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-2 pr-12">
          <div className="flex items-center gap-2">
            {/* Image attachment button */}
            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#c29938]/50 text-slate-300 hover:text-[#c29938] transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>صورة</span>
            </button>

            {/* Target Group Selector */}
            <select
              value={targetGroup === null ? 'all' : targetGroup}
              onChange={(e) => setTargetGroup(e.target.value === 'all' ? null : Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-300 focus:outline-none"
            >
              <option value="all">🌐 عام لجميع الفرق</option>
              <option value="1">👥 الفرقة الأولى</option>
              <option value="2">👥 الفرقة الثانية</option>
              <option value="3">👥 الفرقة الثالثة</option>
            </select>
          </div>

          {/* Submit Post Button */}
          <button
            type="submit"
            disabled={(!content.trim() && images.length === 0) || isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-[#c29938] hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg disabled:opacity-40 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>نشر الآن</span>
          </button>
        </div>
      </form>
    </div>
  );
}
