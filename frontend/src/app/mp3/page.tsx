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
  const [saving, setSaving] = useState(false);
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

        // Fetch tracks for group
        let trackQuery = supabase.from('mp3_tracks').select('*').is('deleted_at', null);
        if (!['admin', 'super_user'].includes(prof.role_id)) {
          trackQuery = trackQuery.eq('group_id', prof.group_id);
        }

        const { data: trackList } = await trackQuery.order('created_at', { ascending: false });
        if (trackList) setTracks(trackList);
      }
      setLoading(false);
    }

    init();
  }, [router]);

  const handlePlayTrack = (track: Mp3Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.src = track.audio_url;
        audioRef.current.play();
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
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('mp3_tracks').insert({
      group_id: profile.group_id,
      title: newTitle.trim(),
      audio_url: newAudioUrl.trim(),
    });

    if (!error) {
      setShowAddModal(false);
      setNewTitle('');
      setNewAudioUrl('');
      setNotice('تمت إضافة التسجيل الصوتي بنجاح.');

      // Refresh
      let trackQuery = supabase.from('mp3_tracks').select('*').is('deleted_at', null);
      if (!['admin', 'super_user'].includes(profile.role_id)) {
        trackQuery = trackQuery.eq('group_id', profile.group_id);
      }
      const { data: trackList } = await trackQuery.order('created_at', { ascending: false });
      if (trackList) setTracks(trackList);
    } else {
      setNotice(`فشل الإضافة: ${error.message}`);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-[#c29938] selection:text-slate-950 pb-32" dir="rtl">
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-1 text-xs font-semibold">
              <Headphones className="w-4 h-4" />
              <span>
                {profile?.group_id === 1 && 'تسجيلات الفرقة الأولى'}
                {profile?.group_id === 2 && 'تسجيلات الفرقة الثانية'}
                {profile?.group_id === 3 && 'تسجيلات الفرقة الثالثة'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">تسجيلات المحاضرات والترانيم الدراسية</h1>
            <p className="text-xs text-slate-400 mt-1">
              استمع للمحاضرات والتأملات الصوتية بدقة عالية داخل المشغل المدمج.
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-karooz-crimson hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تسجيل صوتي</span>
            </button>
          )}
        </div>

        {notice && (
          <div className="p-3 bg-blue-950/60 border border-blue-800/60 text-blue-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400" />
            <span>{notice}</span>
          </div>
        )}

        {/* --- TRACKS PLAYLIST --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-2">
          {tracks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
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
                      ? 'bg-amber-950/30 border-amber-600/60 text-white shadow'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        isCurrent && isPlaying
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 translate-x-[-1px]" />
                      )}
                    </button>

                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-white">{track.title}</h4>
                      <span className="text-[11px] text-slate-400">
                        {new Date(track.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
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
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-4">إضافة تسجيل صوتي جديد</h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">عنوان التسجيل</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: تسجيل محاضرة مقدمة العهد الجديد"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">رابط الملف الصوتي (MP3)</label>
                  <input
                    type="text"
                    value={newAudioUrl}
                    onChange={(e) => setNewAudioUrl(e.target.value)}
                    placeholder="https://.../lecture.mp3"
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
                  disabled={saving}
                  onClick={handleSaveTrack}
                  className="px-5 py-2 rounded-xl bg-karooz-crimson text-white text-xs font-bold flex items-center gap-1.5"
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
        <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 border-t border-slate-800 p-3.5 backdrop-blur-md z-40 shadow-2xl">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => handlePlayTrack(currentTrack)}
                className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-amber-950/40 hover:bg-amber-400 transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-[-1px]" />}
              </button>

              <div className="truncate">
                <h4 className="font-bold text-xs sm:text-sm text-white truncate max-w-xs sm:max-w-md">
                  {currentTrack.title}
                </h4>
                <span className="text-[10px] text-amber-400 font-semibold">جاري التشغيل في المدرسة</span>
              </div>
            </div>

            {/* Seek Bar & Timers */}
            <div className="flex items-center gap-3 w-full sm:w-1/2">
              <span className="text-[11px] font-mono text-slate-400">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-slate-950 rounded-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-400">{formatTime(duration)}</span>
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
