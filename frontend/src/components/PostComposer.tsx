'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { phpApi } from '@/lib/api/php';
import {
  Image as ImageIcon,
  Sparkles,
  Send,
  X,
  Users,
  Globe,
  Upload,
  Loader2,
} from 'lucide-react';
import type { Profile } from '@/types/database';
import Avatar from '../components/Avatar';

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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if current user can create posts (Staff or Admin)
  const canPost =
    currentUser?.role_id === 'admin' ||
    currentUser?.role_id === 'servant' ||
    currentUser?.role_id === 'secretariat';

  if (!canPost || !currentUser) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('يرجى تسجيل الدخول لرفع الصور');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder_type', 'feed');
      formData.append('group_id', String(currentUser?.group_id || targetGroup || 1));
      const res = await phpApi<{ file_url: string; asset_id: string }>('/storage/upload', {
        formData,
        session,
      });
      if (res?.file_url) {
        setImages((prev) => [...prev, res.file_url]);
      }
    } catch (err) {
      console.error('Feed image upload error:', err);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      const { error } = await supabase.from('feed_posts').insert({
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
    <div className="rounded-3xl border border-line bg-canvas p-4 shadow-xl mb-5" dir="rtl">
      <form onSubmit={handleSubmitPost}>
        {/* Top bar: Author avatar and text area */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gold to-warning text-content flex items-center justify-center font-black text-sm shadow-md overflow-hidden shrink-0 mt-0.5">
            {currentUser.avatar_url ? (
              <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size={40} />
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
              className="w-full bg-transparent text-sm text-content placeholder-content-muted focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Staged Images Previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 my-3 pr-12">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gold/40 group">
                <Image src={img} alt="صورة مرفقة" fill sizes="80px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1 left-1 p-1 rounded-full bg-black/70 text-content hover:bg-danger transition-colors"
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
              className="flex-1 bg-canvas border border-line rounded-xl px-3 py-1.5 text-xs text-content focus:outline-none focus:border-gold"
            />
            <button
              type="button"
              onClick={handleAddImage}
              className="px-3 py-1.5 rounded-xl bg-gold text-brand-on font-bold text-xs hover:bg-warning"
            >
              إضافة
            </button>
            <button
              type="button"
              onClick={() => setShowImageInput(false)}
              className="px-2 py-1.5 rounded-xl bg-nav text-content-secondary text-xs"
            >
              إلغاء
            </button>
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between border-t border-line/80 pt-3 mt-2 pr-12">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            {/* Upload file button */}
            <button
              type="button"
              disabled={isUploadingImage}
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl bg-nav border border-line hover:border-gold/50 text-content-secondary hover:text-gold transition-colors flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
              title="رفع صورة من الجهاز إلى Google Drive"
            >
              {isUploadingImage ? (
                <Loader2 className="w-4 h-4 text-warning animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-warning" />
              )}
              <span>{isUploadingImage ? 'جاري الرفع...' : 'رفع صورة'}</span>
            </button>

            {/* Image URL toggle button */}
            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className="p-2 rounded-xl bg-nav border border-line hover:border-gold/50 text-content-secondary hover:text-gold transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="إضافة رابط صورة"
            >
              <ImageIcon className="w-4 h-4 text-success" />
              <span>رابط صورة</span>
            </button>

            {/* Target Group Selector */}
            <select
              value={targetGroup === null ? 'all' : targetGroup}
              onChange={(e) => setTargetGroup(e.target.value === 'all' ? null : Number(e.target.value))}
              className="bg-nav border border-line rounded-xl px-2.5 py-1.5 text-xs font-bold text-content-secondary focus:outline-none"
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
            className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-gold hover:bg-warning text-brand-on font-black text-xs shadow-lg disabled:opacity-40 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>نشر الآن</span>
          </button>
        </div>
      </form>
    </div>
  );
}
