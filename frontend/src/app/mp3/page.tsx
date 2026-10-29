'use client';

import { useEffect, useState, useRef } from 'react';
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
  Headphones,
  Loader2,
  Mic,
  Music,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface Mp3Track {
  id: string;
  group_id: number;
  title: string;
  audio_url: string;
  duration_seconds: number;
  file_size_bytes: number;
  lecturer_name?: string;
  created_at: string;
}

export default function Mp3Page() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tracks, setTracks] = useState<Mp3Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Audio Player State
  const [currentTrack, setCurrentTrack] = useState<Mp3Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Upload Modal State (Staff)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [newLecturerName, setNewLecturerName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canManage = profile && ['admin', 'servant', 'secretariat'].includes(profile.role_id);

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
        if (prof.group_id) setSelectedGroupId(prof.group_id);

        // Fetch tracks for group (bounded for performance)
        let trackQuery = supabase.from('mp3_tracks').select('*').is('deleted_at', null);
        if (prof.role_id !== 'admin' && prof.group_id) {
          trackQuery = trackQuery.eq('group_id', prof.group_id);
        }

        const { data: tracks, error: tracksError } = await trackQuery
          .select('id,group_id,title,lecturer_id,audio_url,duration_seconds,file_size_bytes,created_at')
          .order('created_at', { ascending: false })
          .limit(100);
        if (tracksError) throw tracksError;
        if (tracks) setTracks(tracks);
      }
      setLoading(false);
    }

    init();
  }, [router]);

  const playAudio = (audio: HTMLAudioElement) => {
    void audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        setIsPlaying(false);
        setNotice('تعذر تشغيل التسجيل. تحقق من الرابط أو اضغط التشغيل مرة أخرى.');
      });
  };

  const handlePlayTrack = (track: Mp3Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else if (audioRef.current) {
        playAudio(audioRef.current);
      }
    } else {
      setCurrentTrack(track);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.src = track.audio_url;
        playAudio(audioRef.current);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSaveTrack = async () => {
    if (!newTitle.trim() || !newAudioUrl.trim() || !profile) return;
    const targetGroupId = profile.group_id || selectedGroupId;
    if (!targetGroupId) {
      setNotice('حدد الفرقة قبل الإضافة.');
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('mp3_tracks').insert({
      group_id: targetGroupId,
      title: newTitle.trim(),
      audio_url: newAudioUrl.trim(),
    });

    if (error) {
      setNotice(`فشل الإضافة: ${error.message}`);
      setSaving(false);
      return;
    }

    setShowAddModal(false);
    setNewTitle('');
    setNewAudioUrl('');
    setNotice('تمت إضافة التسجيل الصوتي بنجاح.');

    try {
      let trackQuery = supabase.from('mp3_tracks').select('*').is('deleted_at', null);
      if (profile.role_id !== 'admin' && profile.group_id) {
        trackQuery = trackQuery.eq('group_id', profile.group_id);
      }
      const { data: tracks, error: refreshError } = await trackQuery
        .select('id,group_id,title,lecturer_id,audio_url,duration_seconds,file_size_bytes,created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (refreshError) throw refreshError;
      if (tracks) setTracks(tracks);
    } catch (refreshError) {
      setNotice(`تمت الإضافة، لكن تعذر تحديث القائمة: ${refreshError instanceof Error ? refreshError.message : 'خطأ غير معروف'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-content flex flex-col selection:bg-gold selection:text-content" dir="rtl">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      />

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
        {/* Banner */}
        <div className="bg-nav border border-line rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-warning mb-1 text-xs font-semibold">
              <Headphones className="w-4 h-4" />
              <span>
                {profile?.group_id === 1 && 'تسجيلات الفرقة الأولى'}
                {profile?.group_id === 2 && 'تسجيلات الفرقة الثانية'}
                {profile?.group_id === 3 && 'تسجيلات الفرقة الثالثة'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-content">تسجيلات المحاضرات والترانيم الدراسية</h1>
            <p className="text-xs text-content-muted mt-1">
              استمع للمحاضرات والتأملات الصوتية بدقة عالية داخل المشغل المدمج.
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-karooz-crimson hover:bg-danger text-content font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تسجيل صوتي</span>
            </button>
          )}
        </div>

        {notice && (
          <div className="p-3 bg-canvas/60 border border-line-subtle/60 text-info rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-info" />
            <span>{notice}</span>
          </div>
        )}

        {/* --- TRACKS PLAYLIST --- */}
        <div className="bg-nav border border-line rounded-2xl p-4 shadow-md space-y-2">
          {tracks.length === 0 ? (
            <div className="p-8 text-center text-content-muted text-xs">
              لا توجد تسجيلات صوتية مضافة لفرقتك حالياً.
            </div>
          ) : (
            tracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => handlePlayTrack(track)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-canvas/30 border-warning/60 text-content shadow'
                      : 'bg-nav/60 border-line/80 text-content-secondary hover:bg-nav/60 hover:border-line'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        isCurrent && isPlaying
                          ? 'bg-warning text-content shadow-md'
                          : 'bg-nav text-warning hover:bg-input'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 translate-x-[-1px]" />
                      )}
                    </button>

                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-content">{track.title}</h4>
                      <span className="text-[11px] text-content-muted">
                        {new Date(track.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-content-muted bg-nav px-2 py-0.5 rounded border border-line">
                    MP3
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* --- ADD MODAL --- */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-nav border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-base font-bold text-content mb-4">إضافة تسجيل صوتي جديد</h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-content-secondary font-semibold mb-1">عنوان التسجيل</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: تسجيل محاضرة مقدمة العهد الجديد"
                    className="w-full bg-nav border border-line rounded-xl p-2.5 text-content"
                  />
                </div>

                <div>
                  <label className="block text-content-secondary font-semibold mb-1">الفرقة</label>
                  <select
                    value={profile?.group_id || selectedGroupId}
                    disabled={Boolean(profile?.group_id)}
                    onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                    className="w-full bg-nav border border-line rounded-xl p-2.5 text-content"
                  >
                    <option value={1}>الفرقة الأولى</option>
                    <option value={2}>الفرقة الثانية</option>
                    <option value={3}>الفرقة الثالثة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-content-secondary font-semibold mb-1">رابط الملف الصوتي (MP3)</label>
                  <input
                    type="text"
                    value={newAudioUrl}
                    onChange={(e) => setNewAudioUrl(e.target.value)}
                    placeholder="https://.../lecture.mp3"
                    className="w-full bg-nav border border-line rounded-xl p-2.5 text-content"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-nav text-content-muted text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveTrack}
                  className="px-5 py-2 rounded-xl bg-karooz-crimson text-content text-xs font-bold flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- BOTTOM STICKY AUDIO PLAYER BAR --- */}
      {currentTrack && (
        <div className="fixed bottom-0 inset-x-0 bg-nav/95 border-t border-line p-3.5 backdrop-blur-md z-40 shadow-2xl">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => handlePlayTrack(currentTrack)}
                className="w-10 h-10 rounded-full bg-warning text-content font-bold flex items-center justify-center shadow-lg shadow-amber-950/40 hover:bg-warning transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-[-1px]" />}
              </button>

              <div className="truncate">
                <h4 className="font-bold text-xs sm:text-sm text-content truncate max-w-xs sm:max-w-md">
                  {currentTrack.title}
                </h4>
                <span className="text-[10px] text-warning font-semibold">جاري التشغيل في المدرسة</span>
              </div>
            </div>

            {/* Seek Bar & Timers */}
            <div className="flex items-center gap-3 w-full sm:w-1/2">
              <span className="text-[11px] font-mono text-content-muted">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-nav rounded-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-content-muted">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
