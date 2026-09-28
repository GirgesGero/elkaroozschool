'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface AlbumItem {
  id: string;
  group_id: number;
  title: string;
  description: string | null;
  cover_url: string | null;
  event_date: string | null;
  items_count?: number;
}

interface GalleryPhoto {
  id: string;
  album_id: string;
  group_id: number;
  image_url: string;
  title: string | null;
  created_at: string;
}

export default function GalleryPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('ALL');
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Upload Modal State (Staff)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoAlbumId, setNewPhotoAlbumId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canManage = profile && ['admin', 'super_user', 'servant', 'secretariat'].includes(profile.role_id);

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

        // Fetch albums for group (or all if admin)
        let albQuery = supabase.from('gallery_albums').select('*').is('deleted_at', null);
        if (!['admin', 'super_user'].includes(prof.role_id)) {
          albQuery = albQuery.eq('group_id', prof.group_id);
        }

        const { data: albList } = await albQuery.order('created_at', { ascending: false });
        if (albList) setAlbums(albList);

        // Fetch photos for group
        let photoQuery = supabase.from('gallery_items').select('*').is('deleted_at', null);
        if (!['admin', 'super_user'].includes(prof.role_id)) {
          photoQuery = photoQuery.eq('group_id', prof.group_id);
        }

        const { data: photoList } = await photoQuery.order('created_at', { ascending: false });
        if (photoList) setPhotos(photoList);
      }
      setLoading(false);
    }

    init();
  }, [router]);

  const handleUploadPhoto = async () => {
    if (!newPhotoUrl.trim() || !profile) return;
    setUploading(true);
    const supabase = createClient();

    const { error } = await supabase.from('gallery_items').insert({
      album_id: newPhotoAlbumId || (albums[0]?.id as string),
      group_id: profile.group_id,
      image_url: newPhotoUrl.trim(),
      title: newPhotoTitle.trim() || null,
    });

    if (!error) {
      setShowUploadModal(false);
      setNewPhotoUrl('');
      setNewPhotoTitle('');
      setNotice('تمت إضافة الصورة إلى المعرض بنجاح.');

      // Refresh photos
      let photoQuery = supabase.from('gallery_items').select('*').is('deleted_at', null);
      if (!['admin', 'super_user'].includes(profile.role_id)) {
        photoQuery = photoQuery.eq('group_id', profile.group_id);
      }
      const { data: photoList } = await photoQuery.order('created_at', { ascending: false });
      if (photoList) setPhotos(photoList);
    } else {
      setNotice(`فشل الرفع: ${error.message}`);
    }
    setUploading(false);
  };

  const filteredPhotos = photos.filter((p) => {
    if (selectedAlbumId !== 'ALL' && p.album_id !== selectedAlbumId) return false;
    return true;
  });

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
            <span className="font-bold text-base text-karooz-gold">معرض الصور والأنشطة</span>
            <div className="relative w-7 h-7">
              <Image src="/logo.png" alt="شعار مدرسة الكاروز" fill sizes="32px" className="object-contain" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Banner & Filter */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-1 text-xs font-semibold">
              <Users className="w-4 h-4" />
              <span>
                {profile?.group_id === 1 && 'معرض الفرقة الأولى'}
                {profile?.group_id === 2 && 'معرض الفرقة الثانية'}
                {profile?.group_id === 3 && 'معرض الفرقة الثالثة'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">ألبوم الذكريات والأنشطة الكنسية</h1>
          </div>

          {canManage && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-karooz-crimson hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صورة للمعرض</span>
            </button>
          )}
        </div>

        {notice && (
          <div className="p-3 bg-blue-950/60 border border-blue-800/60 text-blue-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400" />
            <span>{notice}</span>
          </div>
        )}

        {/* --- PHOTOS GRID --- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredPhotos.length === 0 ? (
            <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              لا توجد صور في معرض فرقتك حالياً.
            </div>
          ) : (
            filteredPhotos.map((photo, pIdx) => (
              <div
                key={photo.id}
                onClick={() => setLightboxIndex(pIdx)}
                className="relative h-44 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 cursor-pointer group shadow-md"
              >
                <img
                  src={photo.image_url}
                  alt={photo.title || 'صورة المعرض'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {photo.title && (
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-[11px] font-semibold text-white truncate">
                    {photo.title}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* --- FULLSCREEN LIGHTBOX MODAL --- */}
        {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
          <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 text-white hover:text-rose-400 p-2 z-50"
            >
              <X className="w-7 h-7" />
            </button>

            {filteredPhotos.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev !== null && prev > 0 ? prev - 1 : filteredPhotos.length - 1
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 text-white rounded-full hover:bg-black"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev !== null && prev + 1 < filteredPhotos.length ? prev + 1 : 0
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 text-white rounded-full hover:bg-black"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="max-w-4xl max-h-[85vh] relative flex flex-col items-center justify-center">
              <img
                src={filteredPhotos[lightboxIndex].image_url}
                alt={filteredPhotos[lightboxIndex].title || 'صورة مكبرة'}
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
              {filteredPhotos[lightboxIndex].title && (
                <p className="text-white text-xs font-semibold mt-3 bg-black/60 px-4 py-1.5 rounded-full">
                  {filteredPhotos[lightboxIndex].title}
                </p>
              )}
            </div>
          </div>
        )}

        {/* --- UPLOAD MODAL --- */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-4">إضافة صورة جديدة للمعرض</h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">عنوان الصورة</label>
                  <input
                    type="text"
                    value={newPhotoTitle}
                    onChange={(e) => setNewPhotoTitle(e.target.value)}
                    placeholder="مثال: حفل بداية العام الدراسي"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">رابط الصورة</label>
                  <input
                    type="text"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="https://.../photo.jpg"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleUploadPhoto}
                  className="px-5 py-2 rounded-xl bg-karooz-crimson text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ في المعرض</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
