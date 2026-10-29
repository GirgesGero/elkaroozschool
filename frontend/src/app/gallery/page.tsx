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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Upload Modal State (Staff)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoAlbumId, setNewPhotoAlbumId] = useState('');
  const [groupId, setGroupId] = useState<number>(1);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canManage = profile?.role_id === 'admin' || profile?.role_id === 'servant' || profile?.role_id === 'secretariat';

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

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id,full_name,username,role_id,group_id,is_active,phone,avatar_url,created_at')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;

      if (userProfile) {
        const prof = userProfile as Profile;
        setProfile(prof);
        if (prof.role_id === 'admin' && prof.group_id) setGroupId(prof.group_id);

        // Fetch albums for group (or all if admin)
        let albQuery = supabase
          .from('gallery_albums')
          .select('id,group_id,category_id,title,description,cover_url,event_date,created_at')
          .is('deleted_at', null);
        if (prof.role_id !== 'admin' && prof.group_id) {
          albQuery = albQuery.eq('group_id', prof.group_id);
        }

        const { data: albumList, error: albumError } = await albQuery
          .order('created_at', { ascending: false })
          .limit(100);
        if (albumError) throw albumError;
        let albumRows: Array<{
          id: string;
          category_id: string | null;
          group_id: number | null;
          title: string;
          description: string | null;
          cover_url: string | null;
          event_date: string | null;
          created_at: string;
        }> = albumList || [];

        // Fetch photos for group (bounded to 120 items for performance)
        let photoQuery = supabase
          .from('gallery_items')
          .select('id,album_id,image_url,title,created_at')
          .is('deleted_at', null);
        if (prof.role_id !== 'admin' && prof.group_id) {
          const { data: scopedAlbumIds } = await supabase
            .from('gallery_albums')
            .select('id')
            .eq('group_id', prof.group_id)
            .is('deleted_at', null)
            .limit(1000);
          const allowedAlbumIds = (scopedAlbumIds || []).map((album) => album.id);
          photoQuery = allowedAlbumIds.length > 0
            ? photoQuery.in('album_id', allowedAlbumIds)
            : photoQuery.eq('album_id', '00000000-0000-0000-0000-000000000000');
        }

        const { data: photoList, error: photoError } = await photoQuery
          .select('id,album_id,image_url,title,created_at')
          .order('created_at', { ascending: false })
          .limit(120);
        if (photoError) throw photoError;
        if (photoList) {
          const albumIds = [...new Set(photoList.map((photo) => photo.album_id).filter(Boolean))];
          const counts = new Map<string, number>();
          photoList.forEach((photo) => counts.set(photo.album_id, (counts.get(photo.album_id) || 0) + 1));
          if (albumIds.length > 0) {
            const { data: linkedAlbums } = await supabase
              .from('gallery_albums')
              .select('id,group_id,title,description,cover_url,event_date,created_at')
              .in('id', albumIds)
              .is('deleted_at', null);
            const linkedAlbumRows = (linkedAlbums || []).map((album) => ({ ...album, category_id: null }));
            albumRows = [...albumRows, ...linkedAlbumRows.filter((album: typeof albumRows[number]) => !albumRows.some((existing) => existing.id === album.id))];
          }
          setPhotos(photoList.map((photo) => ({ ...photo, group_id: prof.group_id || 0 })));
        const scopedAlbums = prof.role_id === 'admin'
          ? albumRows.filter((album) => !album.group_id || album.group_id === groupId)
          : albumRows;
        setAlbums(scopedAlbums.map((album) => ({ ...album, group_id: album.group_id || prof.group_id || 0, items_count: counts.get(album.id) || 0 })));
        } else {
          setAlbums(albumRows.map((album) => ({ ...album, group_id: album.group_id || prof.group_id || 0 })));
        }
      }
      setLoading(false);
    }

    init();
  }, [router, groupId]);

  const handleUploadPhoto = async () => {
    if (!newPhotoUrl.trim() || !newPhotoAlbumId || !profile) {
      setNotice('اختر ألبوماً وأدخل رابط الصورة قبل الحفظ.');
      return;
    }
    if (profile.role_id === 'admin') {
      const selectedAlbum = albums.find((album) => album.id === newPhotoAlbumId);
      if (!selectedAlbum || (selectedAlbum.group_id && selectedAlbum.group_id !== groupId)) {
        setNotice('الألبوم المختار لا ينتمي إلى الفرقة المحددة.');
        return;
      }
    }
    const targetGroupId = profile.group_id || groupId;
    if (!targetGroupId) {
      setNotice('حدد الفرقة قبل الإضافة.');
      return;
    }
    setUploading(true);
    const supabase = createClient();

    const { error } = await supabase.from('gallery_items').insert({
      album_id: newPhotoAlbumId,
      group_id: targetGroupId,
      image_url: newPhotoUrl.trim(),
      title: newPhotoTitle.trim() || null,
    });

    if (!error) {
      setShowUploadModal(false);
      setNewPhotoUrl('');
      setNewPhotoTitle('');
      setNewPhotoAlbumId('');
      setNotice('تمت إضافة الصورة إلى المعرض بنجاح.');

      // Refresh photos
      let photoQuery = supabase.from('gallery_items').select('id,album_id,image_url,title,created_at').is('deleted_at', null);
      if (profile.role_id !== 'admin' && profile.group_id) {
        const { data: scopedAlbumIds } = await supabase
          .from('gallery_albums')
          .select('id')
          .eq('group_id', profile.group_id)
          .is('deleted_at', null)
          .limit(1000);
        const allowedAlbumIds = (scopedAlbumIds || []).map((album) => album.id);
        photoQuery = allowedAlbumIds.length > 0
          ? photoQuery.in('album_id', allowedAlbumIds)
          : photoQuery.eq('album_id', '00000000-0000-0000-0000-000000000000');
      }
      const { data: photoList, error: refreshError } = await photoQuery
        .select('id,album_id,image_url,title,created_at')
        .order('created_at', { ascending: false })
        .limit(120);
      if (refreshError) throw refreshError;
      if (photoList) setPhotos(photoList.map((photo) => ({ ...photo, group_id: targetGroupId })));
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
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6 pb-28 md:pb-12">
        {/* Banner & Filter */}
        <div className="bg-nav border border-line rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-warning mb-1 text-xs font-semibold">
              <Users className="w-4 h-4" />
              <span>
                {profile?.group_id === 1 && 'معرض الفرقة الأولى'}
                {profile?.group_id === 2 && 'معرض الفرقة الثانية'}
                {profile?.group_id === 3 && 'معرض الفرقة الثالثة'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-content">ألبوم الذكريات والأنشطة الكنسية</h1>
          </div>

          {canManage && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-karooz-crimson hover:bg-danger text-content font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صورة للمعرض</span>
            </button>
          )}
        </div>

        {notice && (
          <div className="p-3 bg-canvas/60 border border-line-subtle/60 text-info rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-info" />
            <span>{notice}</span>
          </div>
        )}

        {/* --- PHOTOS GRID --- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredPhotos.length === 0 ? (
            <div className="col-span-full bg-nav border border-line rounded-2xl p-12 text-center text-content-muted text-xs">
              لا توجد صور في معرض فرقتك حالياً.
            </div>
          ) : (
            filteredPhotos.map((photo, pIdx) => (
              <div
                key={photo.id}
                onClick={() => setLightboxIndex(pIdx)}
                className="relative h-44 bg-nav rounded-2xl overflow-hidden border border-line cursor-pointer group shadow-md"
              >
                <img
                  src={photo.image_url}
                  alt={photo.title || 'صورة المعرض'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {photo.title && (
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-[11px] font-semibold text-content truncate">
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
              className="absolute top-4 right-4 text-content hover:text-danger p-2 z-50"
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
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 text-content rounded-full hover:bg-black"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev !== null && prev + 1 < filteredPhotos.length ? prev + 1 : 0
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 text-content rounded-full hover:bg-black"
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
                <p className="text-content text-xs font-semibold mt-3 bg-black/60 px-4 py-1.5 rounded-full">
                  {filteredPhotos[lightboxIndex].title}
                </p>
              )}
            </div>
          </div>
        )}

        {/* --- UPLOAD MODAL --- */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-nav border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-base font-bold text-content mb-4">إضافة صورة جديدة للمعرض</h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-content-secondary font-semibold mb-1">الألبوم</label>
                  <select
                    value={newPhotoAlbumId}
                    onChange={(e) => {
                      const albumId = e.target.value;
                      setNewPhotoAlbumId(albumId);
                      const selectedAlbum = albums.find((album) => album.id === albumId);
                      if (selectedAlbum?.group_id) setGroupId(selectedAlbum.group_id);
                    }}
                    className="w-full bg-nav border border-line rounded-xl p-2.5 text-content"
                  >
                    <option value="">اختر ألبوماً</option>
                    {albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-content-secondary font-semibold mb-1">الفرقة</label>
                  <select
                    value={profile?.group_id || groupId}
                    disabled={Boolean(profile?.group_id)}
                    onChange={(e) => setGroupId(Number(e.target.value))}
                    className="w-full bg-nav border border-line rounded-xl p-2.5 text-content"
                  >
                    <option value={1}>الفرقة الأولى</option>
                    <option value={2}>الفرقة الثانية</option>
                    <option value={3}>الفرقة الثالثة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-content-secondary font-semibold mb-1">عنوان الصورة</label>
                  <input
                    type="text"
                    value={newPhotoTitle}
                    onChange={(e) => setNewPhotoTitle(e.target.value)}
                    placeholder="مثال: حفل بداية العام الدراسي"
                    className="w-full bg-nav border border-line rounded-xl p-2.5 text-content"
                  />
                </div>

                <div>
                  <label className="block text-content-secondary font-semibold mb-1">رابط الصورة</label>
                  <input
                    type="text"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="https://.../photo.jpg"
                    className="w-full bg-nav border border-line rounded-xl p-2.5 text-content"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-nav text-content-muted text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleUploadPhoto}
                  className="px-5 py-2 rounded-xl bg-karooz-crimson text-content text-xs font-bold flex items-center gap-1.5"
                >
                  {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ في المعرض</span>
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
