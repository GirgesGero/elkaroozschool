'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  prepareAvatar,
  AvatarTooLargeError,
  AVATAR_MAX_EDGE,
} from '@/lib/avatar/prepareAvatar';
import {
  X,
  Phone,
  MessageCircle,
  Camera,
  Calendar,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Shield,
  Layers,
  FileText,
  User,
  Activity,
  Edit2,
  Save,
  Loader2,
  Check,
  Upload,
  AlertCircle,
} from 'lucide-react';
import type { Profile } from '@/types/database';
import Avatar from '../components/Avatar';

interface UnifiedProfileModalProps {
  profileId: string | null;
  currentUser: Profile | null;
  onClose: () => void;
  onProfileUpdated?: (updated: Profile) => void;
}

export default function UnifiedProfileModal({
  profileId,
  currentUser,
  onClose,
  onProfileUpdated,
}: UnifiedProfileModalProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<{
    attendanceRate: number;
    presentCount: number;
    absentCount: number;
    marathonParticipation: number;
    examsCount: number;
  }>({
    attendanceRate: 0,
    presentCount: 0,
    absentCount: 0,
    marathonParticipation: 0,
    examsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'academic' | 'permissions'>('overview');

  // Avatar changing states
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState(false);
  const [avatarErrorMsg, setAvatarErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    confession_father: '',
    church: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!profileId) return;

    const fetchProfileData = async () => {
      setIsLoading(true);
      const supabase = createClient();

      try {
        // Fetch target profile
        const { data: pData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (pData) {
          setProfile(pData);
          setAvatarUrlInput(pData.avatar_url || '');
          setEditFormData({
            full_name: pData.full_name || '',
            phone: pData.phone || '',
            address: pData.address || '',
            confession_father: pData.confession_father || '',
            church: pData.church || '',
          });

          // If trainee, fetch attendance & activity records
          if (pData.role_id === 'trainee') {
            const { data: attData } = await supabase
              .from('attendance')
              .select('status')
              .eq('trainee_id', profileId);

            const totalSessions = attData?.length || 0;
            const present = attData?.filter((a) => a.status === 'present').length || 0;
            const absent = attData?.filter((a) => a.status === 'absent').length || 0;
            const rate = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 100;

            const { count: marathonCount } = await supabase
              .from('marathon_responses')
              .select('id', { count: 'exact', head: true })
              .eq('trainee_id', profileId);

            setStats({
              attendanceRate: rate,
              presentCount: present,
              absentCount: absent,
              marathonParticipation: marathonCount || 0,
              examsCount: 0,
            });
          }
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [profileId]);

  if (!profileId) return null;

  const isSelf = currentUser?.id === profile?.id;
  const isAdminOrSuper = currentUser?.role_id === 'admin' || currentUser?.role_id === 'super_user';
  const canEdit = isSelf || isAdminOrSuper;
  const isStaff = profile?.role_id === 'servant' || profile?.role_id === 'secretariat' || profile?.role_id === 'admin';

  // Handle direct Avatar URL change
  const handleSaveAvatarUrl = async (newUrl: string) => {
    if (!profile || !canEdit) return;
    setIsUploadingAvatar(true);
    const supabase = createClient();

    const nextUrl = newUrl.trim() || null;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: nextUrl })
        .eq('id', profile.id);

      // A silently-swallowed PostgREST error is what made the old picker look
      // broken: the row never updated but the drawer reported success.
      if (error) throw error;

      const updated = { ...profile, avatar_url: nextUrl };
      setProfile(updated);
      setAvatarUrlInput(nextUrl || '');
      setIsChangingAvatar(false);
      setAvatarSuccessMsg(true);
      setTimeout(() => setAvatarSuccessMsg(false), 3000);
      if (onProfileUpdated) onProfileUpdated(updated);
    } catch (err) {
      console.error('Avatar update error:', err);
      setAvatarErrorMsg(
        err instanceof Error && err.message
          ? `تعذّر حفظ الصورة: ${err.message}`
          : 'تعذّر حفظ الصورة، حاول مرة أخرى.',
      );
      setTimeout(() => setAvatarErrorMsg(null), 5000);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle File Upload from Local Device.
  //
  // The file is downscaled and re-encoded before it reaches the database: a
  // raw phone photo would land in `profiles.avatar_url` as megabytes of base64
  // in a text column, which then failed to render (next/image rejects data:
  // URLs). See lib/avatar/prepareAvatar.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarErrorMsg('اختر ملف صورة صالح.');
      setTimeout(() => setAvatarErrorMsg(null), 4000);
      input.value = '';
      return;
    }

    setAvatarErrorMsg(null);
    setIsUploadingAvatar(true);

    try {
      const prepared = await prepareAvatar(file);
      await handleSaveAvatarUrl(prepared.dataUrl);
      setAvatarSuccessMsg(true);
    } catch (err) {
      const message =
        err instanceof AvatarTooLargeError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'تعذّر رفع الصورة، جرّب صورة أخرى.';
      setAvatarErrorMsg(message);
      setTimeout(() => setAvatarErrorMsg(null), 4000);
    } finally {
      setIsUploadingAvatar(false);
      // Let the same file be picked again after a failed attempt.
      input.value = '';
    }
  };

  // Handle Profile Info Update
  const handleSaveProfileInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !canEdit || isSavingProfile) return;
    setIsSavingProfile(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.full_name.trim(),
          phone: editFormData.phone.trim() || null,
          address: editFormData.address.trim() || null,
          confession_father: editFormData.confession_father.trim() || null,
          church: editFormData.church.trim() || null,
        })
        .eq('id', profile.id);

      if (!error) {
        const updated = {
          ...profile,
          full_name: editFormData.full_name.trim(),
          phone: editFormData.phone.trim() || null,
          address: editFormData.address.trim() || null,
          confession_father: editFormData.confession_father.trim() || null,
          church: editFormData.church.trim() || null,
        };
        setProfile(updated);
        setIsEditingProfile(false);
        if (onProfileUpdated) onProfileUpdated(updated);
      }
    } catch (err) {
      console.error('Save profile error:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-0 sm:p-4" dir="rtl">
      <div className="w-full max-w-2xl bg-canvas border-t sm:border border-gold/40 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-slide-up sm:animate-scale-in">
        {/* Hidden File Input for Avatars */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        {/* Profile Cover & Header */}
        <div className="relative h-32 sm:h-44 bg-gradient-to-r from-[#0B1B3D] via-card to-brand p-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-gold border border-gold/30 shadow-md">
              {profile?.role_id === 'admin'
                ? 'مدير النظام'
                : profile?.role_id === 'servant'
                ? 'خادم الفرقة'
                : profile?.role_id === 'secretariat'
                ? 'سكرتارية الفرقة'
                : 'طالب بالمدرسة'}
            </span>
            {profile?.group_id && (
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-content border border-line">
                {profile.group_id === 1 ? 'الفرقة الأولى' : profile.group_id === 2 ? 'الفرقة الثانية' : 'الفرقة الثالثة'}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 text-brand-on hover:bg-gold hover:text-brand-on transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* User Avatar with Halo Ring & Camera Edit Trigger */}
          <div className="absolute -bottom-11 right-6 group">
            <div className="relative w-22 h-22 sm:w-26 sm:h-26 rounded-full bg-gradient-to-tr from-gold via-amber-400 to-warning p-1 shadow-2xl ring-4 ring-canvas">
              <div className="w-full h-full rounded-full bg-nav flex items-center justify-center text-content font-black text-3xl overflow-hidden relative shadow-inner">
                {profile?.avatar_url ? (
                  <Avatar src={profile.avatar_url} name={profile.full_name} size={104} />
                ) : (
                  profile?.full_name?.charAt(0) || 'ك'
                )}
              </div>

              {/* Camera Icon Overlay button for Changing Avatar */}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsChangingAvatar(!isChangingAvatar)}
                  className="absolute bottom-0 left-0 p-2 rounded-full bg-gold hover:bg-warning text-brand-on shadow-xl border-2 border-canvas transition-transform group-hover:scale-110 active:scale-95"
                  title="تغيير الصورة الشخصية"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Change Avatar Interactive Drawer */}
        {isChangingAvatar && (
          <div className="bg-canvas border-b border-gold/30 p-4 animate-slide-down">
            <div className="mb-3 flex items-center gap-3">
              {/* Live preview: what the pick actually produced. */}
              <div className="w-14 h-14 shrink-0 rounded-full bg-gradient-to-tr from-gold via-amber-400 to-warning p-[2px]">
                <div className="w-full h-full rounded-full bg-nav flex items-center justify-center overflow-hidden">
                  <Avatar
                    src={avatarUrlInput || profile?.avatar_url}
                    name={profile?.full_name}
                    size={52}
                    rounded="rounded-full"
                    className="w-full h-full"
                  />
                </div>
              </div>
              <div>
                <span className="block text-xs font-black text-gold">تحديث الصورة الشخصية</span>
                <span className="block text-[11px] leading-snug text-content-muted">
                  تُصغَّر الصورة تلقائيًا إلى {AVATAR_MAX_EDGE} بكسل ويُضغط حجمها قبل الحفظ
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-2.5 text-xs font-black text-brand-on transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60 sm:w-auto"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{isUploadingAvatar ? 'جارٍ الضغط والرفع...' : 'اختر صورة من الجهاز'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsChangingAvatar(false)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-line bg-nav px-4 py-2.5 text-xs font-bold text-content-secondary transition-all hover:text-content sm:w-auto"
                >
                  إلغاء
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-content-muted">أو رابط مباشر</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="url"
                  value={avatarUrlInput}
                  onChange={(e) => setAvatarUrlInput(e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                  className="min-h-[44px] flex-1 rounded-2xl border border-line bg-nav px-3 py-2 text-xs text-content placeholder-content-muted focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveAvatarUrl(avatarUrlInput)}
                  disabled={isUploadingAvatar || !avatarUrlInput.trim()}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-gold/40 bg-gold/15 px-5 py-2.5 text-xs font-black text-gold transition-all hover:bg-gold/25 disabled:opacity-50"
                >
                  {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ الرابط'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Avatar Error Feedback — this state existed but was never rendered,
            so every failed save looked like a silent no-op. */}
        {avatarErrorMsg && (
          <div className="flex items-center gap-2 border-b border-danger/30 bg-danger/10 px-4 py-2 text-xs font-bold text-danger animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{avatarErrorMsg}</span>
          </div>
        )}

        {/* Success Avatar Feedback */}
        {avatarSuccessMsg && (
          <div className="bg-success/10 border-b border-success/30 px-4 py-2 flex items-center gap-2 text-success text-xs font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>تم تحديث الصورة الشخصية بنجاح!</span>
          </div>
        )}

        {/* Profile Identity & Action Bar */}
        <div className="pt-14 px-6 pb-4 border-b border-line/80 bg-canvas">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-content">
                  {profile?.full_name || 'جاري التحميل...'}
                </h2>
                {canEdit && !isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="p-1 rounded-lg text-content-muted hover:text-gold hover:bg-nav transition-colors"
                    title="تعديل البيانات"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <span className="text-xs text-gold font-bold">@{profile?.username}</span>
            </div>

            {/* Quick Contact / Actions */}
            <div className="flex items-center gap-2">
              {profile?.phone && (
                <>
                  <a
                    href={`tel:${profile.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/10 text-success border border-success/30 text-xs font-bold hover:bg-success/20 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال</span>
                  </a>
                  <a
                    href={`https://wa.me/2${profile.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/10 text-green-400 border border-green-600/30 text-xs font-bold hover:bg-success/20 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>واتساب</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-2 bg-canvas border-b border-line text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-gold text-brand-on font-black'
                : 'text-content-muted hover:text-content'
            }`}
          >
            نظرة عامة
          </button>

          {profile?.role_id === 'trainee' && (
            <>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  activeTab === 'attendance'
                    ? 'bg-gold text-brand-on font-black'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                سجل الحضور
              </button>
              <button
                onClick={() => setActiveTab('academic')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  activeTab === 'academic'
                    ? 'bg-gold text-brand-on font-black'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                الماراثون والتقييم
              </button>
            </>
          )}

          {isStaff && (
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'permissions'
                  ? 'bg-gold text-brand-on font-black'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              مصفوفة الصلاحيات
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-content-muted">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              جاري تحميل الملف الشخصي...
            </div>
          ) : (
            <>
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Trainee KPI Cards */}
                  {profile?.role_id === 'trainee' && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-canvas border border-line text-center">
                        <span className="text-[10px] text-content-muted block mb-1">نسبة الحضور</span>
                        <span className="text-lg font-black text-gold">{stats.attendanceRate}%</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-canvas border border-line text-center">
                        <span className="text-[10px] text-content-muted block mb-1">مرات الحضور</span>
                        <span className="text-lg font-black text-success">{stats.presentCount}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-canvas border border-line text-center">
                        <span className="text-[10px] text-content-muted block mb-1">الماراثون المكتمل</span>
                        <span className="text-lg font-black text-danger">{stats.marathonParticipation}</span>
                      </div>
                    </div>
                  )}

                  {/* Personal Information & Edit Form */}
                  {isEditingProfile ? (
                    <form onSubmit={handleSaveProfileInfo} className="p-4 rounded-2xl bg-canvas border border-gold/40 space-y-3">
                      <span className="text-xs font-black text-gold block mb-2">تعديل البيانات الأساسية</span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-content-muted block mb-1">الاسم بالكامل:</label>
                          <input
                            type="text"
                            value={editFormData.full_name}
                            onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                            required
                            className="w-full bg-canvas border border-line rounded-xl px-3 py-2 text-content focus:outline-none focus:border-gold"
                          />
                        </div>

                        <div>
                          <label className="text-content-muted block mb-1">رقم الهاتف:</label>
                          <input
                            type="tel"
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                            className="w-full bg-canvas border border-line rounded-xl px-3 py-2 text-content focus:outline-none focus:border-gold"
                          />
                        </div>

                        <div>
                          <label className="text-content-muted block mb-1">أب الاعتراف:</label>
                          <input
                            type="text"
                            value={editFormData.confession_father}
                            onChange={(e) => setEditFormData({ ...editFormData, confession_father: e.target.value })}
                            className="w-full bg-canvas border border-line rounded-xl px-3 py-2 text-content focus:outline-none focus:border-gold"
                          />
                        </div>

                        <div>
                          <label className="text-content-muted block mb-1">العنوان:</label>
                          <input
                            type="text"
                            value={editFormData.address}
                            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                            className="w-full bg-canvas border border-line rounded-xl px-3 py-2 text-content focus:outline-none focus:border-gold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-3 py-1.5 rounded-xl bg-nav text-content-secondary text-xs font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingProfile}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gold text-brand-on text-xs font-black hover:bg-warning transition-all shadow-md"
                        >
                          {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>حفظ التعديلات</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-4 rounded-2xl bg-canvas border border-line/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gold">البيانات الشخصية</span>
                        {canEdit && (
                          <button
                            onClick={() => setIsEditingProfile(true)}
                            className="text-[11px] text-gold hover:underline flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>تعديل</span>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-content-muted block">أب الاعتراف:</span>
                          <span className="font-bold text-content">{profile?.confession_father || 'غير مسجل'}</span>
                        </div>
                        <div>
                          <span className="text-content-muted block">العنوان:</span>
                          <span className="font-bold text-content">{profile?.address || 'غير مسجل'}</span>
                        </div>
                        <div>
                          <span className="text-content-muted block">تاريخ الميلاد:</span>
                          <span className="font-bold text-content">{profile?.birth_date || 'غير مسجل'}</span>
                        </div>
                        <div>
                          <span className="text-content-muted block">رقم الهاتف:</span>
                          <span className="font-bold text-content">{profile?.phone || 'غير مسجل'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Attendance */}
              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-canvas border border-line">
                    <span className="text-xs font-black text-gold block mb-2">مقياس الحضور العام</span>
                    <div className="w-full h-3 rounded-full bg-nav overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-success to-gold rounded-full transition-all"
                        style={{ width: `${stats.attendanceRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-content-muted">
                      <span>حضور: {stats.presentCount} جلسة</span>
                      <span>غياب: {stats.absentCount} جلسة</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Permissions for Staff */}
              {activeTab === 'permissions' && (
                <div className="p-4 rounded-2xl bg-canvas border border-line space-y-2">
                  <span className="text-xs font-black text-gold block mb-2">الصلاحيات الإدارية والأكاديمية</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-nav border border-line">
                      <span>إدارة محاضرات الفرقة والمناهج</span>
                      <span className="text-success font-bold">مفوضة ✓</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-nav border border-line">
                      <span>تسجيل حضور وغياب الطلاب</span>
                      <span className="text-success font-bold">مفوضة ✓</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-nav border border-line">
                      <span>إدارة أسئلة الماراثون</span>
                      <span className="text-content-muted">تلقائية للنظام</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
