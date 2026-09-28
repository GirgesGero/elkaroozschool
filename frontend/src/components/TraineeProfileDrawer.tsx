'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Shield,
  BookOpen,
  Trophy,
  Activity,
  UserCheck,
  UserX,
  Edit3,
  Save,
  Loader2,
  Flame,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import type { Profile, AttendanceStatus } from '@/types/database';

interface TraineeProfileDrawerProps {
  traineeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: Profile | null;
  onProfileUpdated?: () => void;
}

export default function TraineeProfileDrawer({
  traineeId,
  isOpen,
  onClose,
  currentUserProfile,
  onProfileUpdated,
}: TraineeProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'marathon' | 'exams' | 'activity'>('profile');
  const [loading, setLoading] = useState(true);
  const [traineeData, setTraineeData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit form state
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editChurch, setEditChurch] = useState('');
  const [editConfessionFather, setEditConfessionFather] = useState('');
  const [editGroupId, setEditGroupId] = useState<number>(1);
  const [editBirthDate, setEditBirthDate] = useState('');

  const isAdminOrSuper = currentUserProfile?.role_id === 'admin' || currentUserProfile?.role_id === 'super_user';
  const isSecretariat = currentUserProfile?.role_id === 'secretariat';
  const canEdit = isAdminOrSuper || isSecretariat;

  useEffect(() => {
    if (!isOpen || !traineeId) return;

    async function fetchTrainee() {
      setLoading(true);
      setNotice(null);
      setIsEditing(false);
      const supabase = createClient();

      const { data, error } = await supabase.rpc('get_trainee_full_profile', {
        p_trainee_id: traineeId,
      });

      if (error || !data) {
        // Fallback to direct query if RPC fails
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', traineeId).single();
        if (prof) {
          setTraineeData({
            profile: prof,
            attendance: { total_sessions: 0, present_count: 0, absent_count: 0, late_count: 0, attendance_rate: 100, history: [] },
            exams: [],
            marathons: [],
          });
          initEditForm(prof);
        }
      } else {
        setTraineeData(data);
        if (data.profile) {
          initEditForm(data.profile);
        }
      }
      setLoading(false);
    }

    fetchTrainee();
  }, [isOpen, traineeId]);

  const initEditForm = (p: Profile) => {
    setEditFullName(p.full_name || '');
    setEditPhone(p.phone || '');
    setEditAddress(p.address || '');
    setEditChurch(p.church || '');
    setEditConfessionFather(p.confession_father || '');
    setEditGroupId(p.group_id || 1);
    setEditBirthDate(p.birth_date || '');
  };

  const handleSaveProfile = async () => {
    if (!traineeId || !traineeData?.profile) return;
    setSaving(true);
    setNotice(null);
    const supabase = createClient();

    const updatePayload: any = {
      phone: editPhone.trim() || null,
      address: editAddress.trim() || null,
      church: editChurch.trim() || null,
      confession_father: editConfessionFather.trim() || null,
      birth_date: editBirthDate || traineeData.profile.birth_date,
    };

    if (isAdminOrSuper) {
      updatePayload.full_name = editFullName.trim();
      updatePayload.group_id = editGroupId;
    }

    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', traineeId);

    if (error) {
      setNotice({ type: 'error', text: `فشل التعديل: ${error.message}` });
    } else {
      setNotice({ type: 'success', text: 'تم حفظ بيانات المتدرب بنجاح!' });
      setIsEditing(false);
      setTraineeData((prev: any) => ({
        ...prev,
        profile: { ...prev.profile, ...updatePayload },
      }));
      if (onProfileUpdated) onProfileUpdated();
    }
    setSaving(false);
  };

  const handleToggleStatus = async () => {
    if (!traineeId || !traineeData?.profile) return;
    setSaving(true);
    setNotice(null);
    const supabase = createClient();
    const newActiveState = !traineeData.profile.is_active;

    const { error } = await supabase.from('profiles').update({ is_active: newActiveState }).eq('id', traineeId);

    if (error) {
      setNotice({ type: 'error', text: `فشل تعديل الحالة: ${error.message}` });
    } else {
      setNotice({
        type: 'success',
        text: newActiveState ? 'تم تفعيل حساب المتدرب بنجاح.' : 'تم إيقاف حساب المتدرب مؤقتاً.',
      });
      setTraineeData((prev: any) => ({
        ...prev,
        profile: { ...prev.profile, is_active: newActiveState },
      }));
      if (onProfileUpdated) onProfileUpdated();
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  const prof: Profile = traineeData?.profile;
  const att = traineeData?.attendance;
  const exams = traineeData?.exams || [];
  const marathons = traineeData?.marathons || [];

  const calculateAge = (bdate: string) => {
    if (!bdate) return null;
    const diff = Date.now() - new Date(bdate).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (rate >= 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm animate-fade-in flex justify-end">
      <div
        className="w-full max-w-2xl bg-slate-900 border-r border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-in-left"
        dir="rtl"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <span>الملف الأكاديمي والشخصي للمتدرب</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-karooz-gold/10 text-karooz-gold border border-karooz-gold/30">
                  {prof?.group_id === 1 ? 'الفرقة الأولى' : prof?.group_id === 2 ? 'الفرقة الثانية' : 'الفرقة الثالثة'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">إدارة ومتابعة الحضور، الامتحانات، والنشاط الأكاديمي</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Edit3 className="w-3.5 h-3.5 text-karooz-gold" />
                <span>تعديل</span>
              </button>
            )}
            {isAdminOrSuper && prof && (
              <button
                onClick={handleToggleStatus}
                disabled={saving}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  prof.is_active
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                {prof.is_active ? (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    <span>إيقاف الحساب</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>تفعيل الحساب</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Notice Banner */}
        {notice && (
          <div
            className={`px-4 py-3 text-xs flex items-center gap-2 border-b ${
              notice.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
          >
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notice.text}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-karooz-gold" />
              <p className="text-sm">جاري تحميل الملف الكامل للمتدرب...</p>
            </div>
          ) : prof ? (
            <>
              {/* Profile Hero Card */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 left-0 w-32 h-32 bg-karooz-gold/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-karooz-gold/20 to-karooz-burgundy/40 border-2 border-karooz-gold/40 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                      {prof.avatar_url ? (
                        <Image src={prof.avatar_url} alt={prof.full_name} fill sizes="64px" className="object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-karooz-gold" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-100">{prof.full_name}</h3>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            prof.is_active
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {prof.is_active ? 'حساب نشط' : 'حساب موقوف'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>@{prof.username}</span>
                        {prof.confession_father && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300">أب الاعتراف: {prof.confession_father}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Attendance Rate Indicator */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-700/60">
                    <span className="text-xs text-slate-400">نسبة الحضور</span>
                    <div
                      className={`text-base font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 ${getAttendanceRateColor(
                        att?.attendance_rate || 100
                      )}`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>{att?.attendance_rate ?? 100}%</span>
                    </div>
                  </div>
                </div>

                {/* Quick KPI Bar */}
                <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-slate-700/60 text-center">
                  <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800">
                    <span className="block text-slate-400 text-[11px]">الجلسات</span>
                    <span className="text-base font-bold text-slate-100">{att?.total_sessions || 0}</span>
                  </div>
                  <div className="bg-emerald-500/5 rounded-xl p-2 border border-emerald-500/20">
                    <span className="block text-emerald-400 text-[11px]">حاضر</span>
                    <span className="text-base font-bold text-emerald-300">{att?.present_count || 0}</span>
                  </div>
                  <div className="bg-rose-500/5 rounded-xl p-2 border border-rose-500/20">
                    <span className="block text-rose-400 text-[11px]">غياب</span>
                    <span className="text-base font-bold text-rose-300">{att?.absent_count || 0}</span>
                  </div>
                  <div className="bg-amber-500/5 rounded-xl p-2 border border-amber-500/20">
                    <span className="block text-amber-400 text-[11px]">تأخير</span>
                    <span className="text-base font-bold text-amber-300">{att?.late_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-800 pb-1 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'profile'
                      ? 'bg-karooz-gold text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>البيانات الشخصية</span>
                </button>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'attendance'
                      ? 'bg-karooz-gold text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>سجل الحضور بالتواريخ ({att?.history?.length || 0})</span>
                </button>
                <button
                  onClick={() => setActiveTab('marathon')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'marathon'
                      ? 'bg-karooz-gold text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>الماراثون ({marathons.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('exams')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'exams'
                      ? 'bg-karooz-gold text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>الامتحانات والدرجات ({exams.length})</span>
                </button>
              </div>

              {/* Tab 1: Personal & Contact Data */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  {isEditing ? (
                    <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                      <h4 className="text-sm font-bold text-karooz-gold flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        <span>تعديل بيانات المتدرب</span>
                      </h4>

                      {isAdminOrSuper && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">الاسم الكامل</label>
                          <input
                            type="text"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-karooz-gold"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف / واتساب</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-karooz-gold"
                            placeholder="01xxxxxxxxx"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ الميلاد</label>
                          <input
                            type="date"
                            value={editBirthDate}
                            onChange={(e) => setEditBirthDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-karooz-gold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">الكنيسة التابع لها</label>
                          <input
                            type="text"
                            value={editChurch}
                            onChange={(e) => setEditChurch(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-karooz-gold"
                            placeholder="كنيسة مارمرقس بالمنشية"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">أب الاعتراف</label>
                          <input
                            type="text"
                            value={editConfessionFather}
                            onChange={(e) => setEditConfessionFather(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-karooz-gold"
                            placeholder="القمص / القس..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">العنوان بالتفصيل</label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-karooz-gold"
                          placeholder="الشارع، المنطقة، شبرا الخيمة..."
                        />
                      </div>

                      {isAdminOrSuper && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">الفرقة الدراسية</label>
                          <select
                            value={editGroupId}
                            onChange={(e) => setEditGroupId(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-karooz-gold"
                          >
                            <option value={1}>الفرقة الأولى</option>
                            <option value={2}>الفرقة الثانية</option>
                            <option value={3}>الفرقة الثالثة</option>
                          </select>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                        <button
                          onClick={() => setIsEditing(false)}
                          disabled={saving}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="px-5 py-2 rounded-xl bg-karooz-gold text-slate-950 font-bold text-xs hover:bg-karooz-gold-light transition-colors flex items-center gap-1.5"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>حفظ التعديلات</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Contact items */}
                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="block text-slate-400 text-[11px]">الهاتف / واتساب</span>
                          {prof.phone ? (
                            <a
                              href={`tel:${prof.phone}`}
                              className="text-sm font-bold text-slate-200 hover:text-karooz-gold flex items-center gap-1 mt-0.5"
                            >
                              <span>{prof.phone}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">غير مسجل</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="block text-slate-400 text-[11px]">تاريخ الميلاد والسن</span>
                          <span className="text-sm font-bold text-slate-200 block mt-0.5">
                            {prof.birth_date ? (
                              <>
                                {prof.birth_date}{' '}
                                <span className="text-xs text-slate-400">({calculateAge(prof.birth_date)} سنة)</span>
                              </>
                            ) : (
                              'غير محدد'
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="block text-slate-400 text-[11px]">الكنيسة وأب الاعتراف</span>
                          <span className="text-sm font-bold text-slate-200 block mt-0.5">
                            {prof.church || 'كنيسة مارمرقس بالمنشية'}
                          </span>
                          <span className="text-xs text-slate-400 block">
                            أب الاعتراف: {prof.confession_father || 'غير مسجل'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="block text-slate-400 text-[11px]">العنوان السكني</span>
                          <span className="text-sm font-bold text-slate-200 block mt-0.5">
                            {prof.address || 'شبرا الخيمة'}
                          </span>
                          {prof.address && (
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(prof.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-karooz-gold hover:underline flex items-center gap-1 mt-1"
                            >
                              <span>فتح في خرائط Google</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Attendance History & Timeline */}
              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-karooz-gold" />
                      <span>التسلسل الزمني لجلسات الحضور</span>
                    </h4>
                    <span className="text-xs text-slate-400">إجمالي {att?.history?.length || 0} جلسة مسجلة</span>
                  </div>

                  {att?.history && att.history.length > 0 ? (
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden divide-y divide-slate-800">
                      {att.history.map((record: any) => (
                        <div key={record.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/60 transition-colors">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                record.status === 'PRESENT'
                                  ? 'bg-emerald-400 ring-4 ring-emerald-500/20'
                                  : record.status === 'ABSENT'
                                  ? 'bg-rose-400 ring-4 ring-rose-500/20'
                                  : 'bg-amber-400 ring-4 ring-amber-500/20'
                              }`}
                            />
                            <div>
                              <span className="font-bold text-sm text-slate-100 block">
                                {new Date(record.session_date).toLocaleDateString('ar-EG', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                              <span className="text-xs text-slate-400">
                                {record.recorded_by_name ? `تم الرصد بواسطة: ${record.recorded_by_name}` : 'رصد تلقائي'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                                record.status === 'PRESENT'
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                  : record.status === 'ABSENT'
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {record.status === 'PRESENT' ? 'حاضر ✓' : record.status === 'ABSENT' ? 'غائب ✕' : 'متأخر ⏱'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-800/30 border border-dashed border-slate-700 rounded-2xl text-slate-400 text-xs">
                      لا توجد سجلات حضور مسجلة لهذا المتدرب حتى الآن.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Marathon Progress */}
              {activeTab === 'marathon' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-karooz-gold" />
                      <span>مشاركات الماراثون الإلكتروني</span>
                    </h4>
                  </div>

                  {marathons && marathons.length > 0 ? (
                    <div className="space-y-3">
                      {marathons.map((m: any) => (
                        <div key={m.marathon_id} className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-sm text-slate-100">{m.marathon_title}</h5>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-karooz-gold/10 text-karooz-gold border border-karooz-gold/30">
                              {m.verbal_appreciation || 'مشارك'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/60 text-center text-xs">
                            <div>
                              <span className="text-slate-400 block">الأسئلة المجابة</span>
                              <span className="font-bold text-slate-200 mt-0.5 block">
                                {m.answered_questions} / {m.total_questions}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">حالة الماراثون</span>
                              <span className="font-bold text-slate-200 mt-0.5 block">
                                {m.status === 'PUBLISHED' ? 'نشط' : 'منتهي'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">التقدير اللفظي</span>
                              <span className="font-bold text-karooz-gold mt-0.5 block">{m.verbal_appreciation}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-800/30 border border-dashed border-slate-700 rounded-2xl text-slate-400 text-xs">
                      لم يتم تسجيل أي مشاركات للماراثون لهذا المتدرب.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Exams & Grades */}
              {activeTab === 'exams' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Award className="w-4 h-4 text-karooz-gold" />
                      <span>سجل درجات الامتحانات والترم</span>
                    </h4>
                  </div>

                  {exams && exams.length > 0 ? (
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden divide-y divide-slate-800">
                      {exams.map((g: any) => (
                        <div key={g.id} className="p-4 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-slate-100 block">{g.exam_title}</span>
                            <span className="text-xs text-slate-400">
                              تاريخ الرصد:{' '}
                              {new Date(g.graded_at).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-black text-karooz-gold block">
                              {g.score} / {g.max_grade}
                            </span>
                            <span className="text-xs text-emerald-400 font-bold">{g.appreciation || 'ناجح'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-800/30 border border-dashed border-slate-700 rounded-2xl text-slate-400 text-xs">
                      لم ترصد درجات امتحانات رسمية لهذا المتدرب بعد.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">لم يتم العثور على بيانات المتدرب.</div>
          )}
        </div>
      </div>
    </div>
  );
}
