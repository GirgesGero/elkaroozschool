'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
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
} from 'lucide-react';
import type { Profile } from '@/types/database';

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

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: newUrl.trim() || null })
        .eq('id', profile.id);

      if (!error) {
        const updated = { ...profile, avatar_url: newUrl.trim() || null };
        setProfile(updated);
        setIsChangingAvatar(false);
        setAvatarSuccessMsg(true);
        setTimeout(() => setAvatarSuccessMsg(false), 3000);
        if (onProfileUpdated) onProfileUpdated(updated);
      }
    } catch (err) {
      console.error('Avatar update error:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle File Upload from Local Device (Data URI or Storage)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setAvatarErrorMsg('حجم الصورة كبير جداً، الحد الأقصى 3 ميجابايت.');
      setTimeout(() => setAvatarErrorMsg(null), 4000);
      return;
    }

    setAvatarErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        await handleSaveAvatarUrl(result);
      }
    };
    reader.readAsDataURL(file);
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
      <div className="w-full max-w-2xl bg-[#070b14] border-t sm:border border-[#c29938]/40 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-slide-up sm:animate-scale-in">
        {/* Hidden File Input for Avatars */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        {/* Profile Cover & Header */}
        <div className="relative h-32 sm:h-44 bg-gradient-to-r from-[#0B1B3D] via-[#1a2d54] to-[#7B0017] p-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-[#c29938] border border-[#c29938]/30 shadow-md">
              {profile?.role_id === 'admin'
                ? 'مدير النظام'
                : profile?.role_id === 'servant'
                ? 'خادم الفرقة'
                : profile?.role_id === 'secretariat'
                ? 'سكرتارية الفرقة'
                : 'طالب بالمدرسة'}
            </span>
            {profile?.group_id && (
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-slate-200 border border-slate-700">
                {profile.group_id === 1 ? 'الفرقة الأولى' : profile.group_id === 2 ? 'الفرقة الثانية' : 'الفرقة الثالثة'}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 text-white hover:bg-[#c29938] hover:text-slate-950 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* User Avatar with Halo Ring & Camera Edit Trigger */}
          <div className="absolute -bottom-11 right-6 group">
            <div className="relative w-22 h-22 sm:w-26 sm:h-26 rounded-full bg-gradient-to-tr from-[#c29938] via-amber-400 to-amber-600 p-1 shadow-2xl ring-4 ring-[#070b14]">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-slate-100 font-black text-3xl overflow-hidden relative shadow-inner">
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.full_name} fill sizes="104px" className="object-cover" />
                ) : (
                  profile?.full_name?.charAt(0) || 'ك'
                )}
              </div>

              {/* Camera Icon Overlay button for Changing Avatar */}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsChangingAvatar(!isChangingAvatar)}
                  className="absolute bottom-0 left-0 p-2 rounded-full bg-[#c29938] hover:bg-amber-400 text-slate-950 shadow-xl border-2 border-[#070b14] transition-transform group-hover:scale-110 active:scale-95"
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
          <div className="bg-[#0b1424] border-b border-[#c29938]/30 p-4 animate-slide-down">
            <span className="text-xs font-black text-[#c29938] block mb-2">تحديث الصورة الشخصية</span>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Upload className="w-4 h-4 text-[#c29938]" />
                <span>اختر صورة من الجهاز</span>
              </button>

              <div className="flex-1 w-full flex items-center gap-1.5">
                <input
                  type="url"
                  value={avatarUrlInput}
                  onChange={(e) => setAvatarUrlInput(e.target.value)}
                  placeholder="أو الصق رابط صورة مباشر (https://...)"
                  className="flex-1 bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#c29938]"
                />
                <button
                  type="button"
                  onClick={() => handleSaveAvatarUrl(avatarUrlInput)}
                  disabled={isUploadingAvatar}
                  className="px-4 py-2 rounded-xl bg-[#c29938] text-slate-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50 transition-all shadow-md flex items-center gap-1"
                >
                  {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsChangingAvatar(false)}
                className="px-3 py-2 rounded-xl bg-slate-900 text-slate-400 text-xs hover:text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Success Avatar Feedback */}
        {avatarSuccessMsg && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2 flex items-center gap-2 text-emerald-400 text-xs font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>تم تحديث الصورة الشخصية بنجاح!</span>
          </div>
        )}

        {/* Profile Identity & Action Bar */}
        <div className="pt-14 px-6 pb-4 border-b border-slate-800/80 bg-[#090f1d]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-100">
                  {profile?.full_name || 'جاري التحميل...'}
                </h2>
                {canEdit && !isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-[#c29938] hover:bg-slate-800 transition-colors"
                    title="تعديل البيانات"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <span className="text-xs text-[#c29938] font-bold">@{profile?.username}</span>
            </div>

            {/* Quick Contact / Actions */}
            <div className="flex items-center gap-2">
              {profile?.phone && (
                <>
                  <a
                    href={`tel:${profile.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال</span>
                  </a>
                  <a
                    href={`https://wa.me/2${profile.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600/10 text-green-400 border border-green-600/30 text-xs font-bold hover:bg-green-600/20 transition-colors"
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
        <div className="flex items-center gap-2 px-6 py-2 bg-[#0a101d] border-b border-slate-800 text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-[#c29938] text-slate-950 font-black'
                : 'text-slate-400 hover:text-slate-200'
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
                    ? 'bg-[#c29938] text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                سجل الحضور
              </button>
              <button
                onClick={() => setActiveTab('academic')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  activeTab === 'academic'
                    ? 'bg-[#c29938] text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-200'
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
                  ? 'bg-[#c29938] text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              مصفوفة الصلاحيات
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-[#c29938] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
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
                      <div className="p-3.5 rounded-2xl bg-[#0e1626] border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block mb-1">نسبة الحضور</span>
                        <span className="text-lg font-black text-[#c29938]">{stats.attendanceRate}%</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-[#0e1626] border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block mb-1">مرات الحضور</span>
                        <span className="text-lg font-black text-emerald-400">{stats.presentCount}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-[#0e1626] border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block mb-1">الماراثون المكتمل</span>
                        <span className="text-lg font-black text-rose-400">{stats.marathonParticipation}</span>
                      </div>
                    </div>
                  )}

                  {/* Personal Information & Edit Form */}
                  {isEditingProfile ? (
                    <form onSubmit={handleSaveProfileInfo} className="p-4 rounded-2xl bg-[#0b1322] border border-[#c29938]/40 space-y-3">
                      <span className="text-xs font-black text-[#c29938] block mb-2">تعديل البيانات الأساسية</span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-slate-400 block mb-1">الاسم بالكامل:</label>
                          <input
                            type="text"
                            value={editFormData.full_name}
                            onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                            required
                            className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#c29938]"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">رقم الهاتف:</label>
                          <input
                            type="tel"
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                            className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#c29938]"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">أب الاعتراف:</label>
                          <input
                            type="text"
                            value={editFormData.confession_father}
                            onChange={(e) => setEditFormData({ ...editFormData, confession_father: e.target.value })}
                            className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#c29938]"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">العنوان:</label>
                          <input
                            type="text"
                            value={editFormData.address}
                            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                            className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#c29938]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingProfile}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#c29938] text-slate-950 text-xs font-black hover:bg-amber-400 transition-all shadow-md"
                        >
                          {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>حفظ التعديلات</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[#0b1322] border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#c29938]">البيانات الشخصية</span>
                        {canEdit && (
                          <button
                            onClick={() => setIsEditingProfile(true)}
                            className="text-[11px] text-[#c29938] hover:underline flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>تعديل</span>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">أب الاعتراف:</span>
                          <span className="font-bold text-slate-200">{profile?.confession_father || 'غير مسجل'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">العنوان:</span>
                          <span className="font-bold text-slate-200">{profile?.address || 'غير مسجل'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">تاريخ الميلاد:</span>
                          <span className="font-bold text-slate-200">{profile?.birth_date || 'غير مسجل'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">رقم الهاتف:</span>
                          <span className="font-bold text-slate-200">{profile?.phone || 'غير مسجل'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Attendance */}
              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#0b1322] border border-slate-800">
                    <span className="text-xs font-black text-[#c29938] block mb-2">مقياس الحضور العام</span>
                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-[#c29938] rounded-full transition-all"
                        style={{ width: `${stats.attendanceRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>حضور: {stats.presentCount} جلسة</span>
                      <span>غياب: {stats.absentCount} جلسة</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Permissions for Staff */}
              {activeTab === 'permissions' && (
                <div className="p-4 rounded-2xl bg-[#0b1322] border border-slate-800 space-y-2">
                  <span className="text-xs font-black text-[#c29938] block mb-2">الصلاحيات الإدارية والأكاديمية</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span>إدارة محاضرات الفرقة والمناهج</span>
                      <span className="text-emerald-400 font-bold">مفوضة ✓</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span>تسجيل حضور وغياب الطلاب</span>
                      <span className="text-emerald-400 font-bold">مفوضة ✓</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span>إدارة أسئلة الماراثون</span>
                      <span className="text-slate-400">تلقائية للنظام</span>
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
