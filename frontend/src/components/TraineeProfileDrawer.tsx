'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { explainDbError } from '@/lib/errors/db';
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

    try {
      const { error } = await supabase.from('profiles').update(updatePayload).eq('id', traineeId);
      if (error) throw error;

      setNotice({ type: 'success', text: 'تم حفظ بيانات وتعديلات المتدرب بنجاح!' });
      setIsEditing(false);
      setTraineeData((prev: any) => ({
        ...prev,
        profile: { ...prev.profile, ...updatePayload },
      }));
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setNotice({ type: 'error', text: explainDbError(err) });
    }
    setSaving(false);
  };

  const handleToggleStatus = async () => {
    if (!traineeId || !traineeData?.profile) return;
    setSaving(true);
    setNotice(null);
    const supabase = createClient();
    const newActiveState = !traineeData.profile.is_active;

    try {
      const { error } = await supabase.from('profiles').update({ is_active: newActiveState }).eq('id', traineeId);
      if (error) throw error;

      setNotice({
        type: 'success',
        text: newActiveState ? 'تم تفعيل حساب المتدرب بنجاح.' : 'تم إيقاف حساب المتدرب مؤقتاً.',
      });
      setTraineeData((prev: any) => ({
        ...prev,
        profile: { ...prev.profile, is_active: newActiveState },
      }));
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setNotice({ type: 'error', text: explainDbError(err) });
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
    if (rate >= 85) return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
    if (rate >= 70) return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-300 bg-rose-500/10 border-rose-500/30';
  };

  const getGroupName = (gId: number) => {
    if (gId === 1) return 'الفرقة الأولى';
    if (gId === 2) return 'الفرقة الثانية';
    return 'الفرقة الثالثة';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md animate-fade-in flex justify-end">
      <div
        className="w-full max-w-2xl bg-[#070b14] border-r border-[#c29938]/30 h-full flex flex-col shadow-2xl shadow-black/80 overflow-hidden animate-slide-in-left relative"
        dir="rtl"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#c29938]/10 via-[#c29938]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-[#070b14]/90 border-b border-[#c29938]/20 flex items-center justify-between sticky top-0 z-20 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-black text-lg text-slate-100 flex items-center gap-2">
                <span>الملف الأكاديمي والشخصي للمتدرب</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#c29938]/15 text-[#c29938] border border-[#c29938]/30">
                  {prof ? getGroupName(prof.group_id) : 'الفرقة'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">إدارة ومتابعة الحضور، الامتحانات، والنشاط الأكاديمي</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-[#c29938]/30 hover:border-[#c29938]/60 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#c29938]" />
                <span>تعديل</span>
              </button>
            )}
            {isAdminOrSuper && prof && (
              <button
                onClick={handleToggleStatus}
                disabled={saving}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-sm ${
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
            className={`px-4 py-3 text-xs flex items-center justify-between border-b ${
              notice.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notice.text}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#c29938]" />
              <p className="text-sm">جاري تحميل الملف الكامل للمتدرب...</p>
            </div>
          ) : prof ? (
            <>
              {/* Profile Hero Card */}
              <div className="bg-gradient-to-b from-[#0e1626] to-[#070b14] border border-[#c29938]/30 rounded-3xl p-5 sm:p-6 relative overflow-hidden backdrop-blur-xl shadow-xl shadow-black/40">
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#c29938]/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#c29938]/30 via-slate-800 to-[#c29938]/10 border-2 border-[#c29938] p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-[#c29938]/10">
                      {prof.avatar_url ? (
                        <Image src={prof.avatar_url} alt={prof.full_name} fill sizes="80px" className="object-cover rounded-xl" />
                      ) : (
                        <User className="w-10 h-10 text-[#c29938]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-xl font-black text-slate-100 tracking-tight">{prof.full_name}</h3>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            prof.is_active
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {prof.is_active ? 'حساب نشط ✓' : 'حساب موقوف ✕'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[#c29938] font-mono">@{prof.username}</span>
                        {prof.confession_father && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-300">أب الاعتراف: {prof.confession_father}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Attendance Rate Pill */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    <span className="text-xs text-slate-400 mb-1">نسبة الحضور الإجمالية</span>
                    <div
                      className={`text-base font-black px-3.5 py-1.5 rounded-2xl border flex items-center gap-2 shadow-sm ${getAttendanceRateColor(
                        att?.attendance_rate || 100
                      )}`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>{att?.attendance_rate ?? 100}%</span>
                    </div>
                  </div>
                </div>

                {/* Quick KPI Bar */}
                <div className="grid grid-cols-4 gap-2.5 mt-6 pt-5 border-t border-slate-800/80 text-center">
                  <div className="bg-[#070b14]/70 rounded-2xl p-2.5 border border-slate-800">
                    <span className="block text-slate-400 text-[11px]">الجلسات</span>
                    <span className="text-base font-bold text-slate-100 mt-0.5 block">{att?.total_sessions || 0}</span>
                  </div>
                  <div className="bg-emerald-500/5 rounded-2xl p-2.5 border border-emerald-500/20">
                    <span className="block text-emerald-400 text-[11px]">حاضر</span>
                    <span className="text-base font-bold text-emerald-300 mt-0.5 block">{att?.present_count || 0}</span>
                  </div>
                  <div className="bg-rose-500/5 rounded-2xl p-2.5 border border-rose-500/20">
                    <span className="block text-rose-400 text-[11px]">غياب</span>
                    <span className="text-base font-bold text-rose-300 mt-0.5 block">{att?.absent_count || 0}</span>
                  </div>
                  <div className="bg-amber-500/5 rounded-2xl p-2.5 border border-amber-500/20">
                    <span className="block text-amber-400 text-[11px]">تأخير</span>
                    <span className="text-base font-bold text-amber-300 mt-0.5 block">{att?.late_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Capsule Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#0c1322] border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 min-w-[110px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'profile'
                      ? 'bg-[#c29938] text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>البيانات الشخصية</span>
                </button>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'attendance'
                      ? 'bg-[#c29938] text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>سجل الحضور ({att?.history?.length || 0})</span>
                </button>
                <button
                  onClick={() => setActiveTab('marathon')}
                  className={`flex-1 min-w-[100px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'marathon'
                      ? 'bg-[#c29938] text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>الماراثون ({marathons.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('exams')}
                  className={`flex-1 min-w-[100px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'exams'
                      ? 'bg-[#c29938] text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>الامتحانات ({exams.length})</span>
                </button>
              </div>

              {/* Tab 1: Personal & Contact Data */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  {isEditing ? (
                    <div className="bg-[#0e1626]/80 border border-[#c29938]/30 rounded-3xl p-5 sm:p-6 space-y-4">
                      <h4 className="text-sm font-bold text-[#c29938] flex items-center gap-2">
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
                            className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف / واتساب</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
                            placeholder="01xxxxxxxxx"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ الميلاد</label>
                          <input
                            type="date"
                            value={editBirthDate}
                            onChange={(e) => setEditBirthDate(e.target.value)}
                            className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">الكنيسة التابع لها</label>
                          <input
                            type="text"
                            value={editChurch}
                            onChange={(e) => setEditChurch(e.target.value)}
                            className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
                            placeholder="كنيسة مارمرقس بالمنشية"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">أب الاعتراف</label>
                          <input
                            type="text"
                            value={editConfessionFather}
                            onChange={(e) => setEditConfessionFather(e.target.value)}
                            className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
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
                          className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
                          placeholder="الشارع، المنطقة، شبرا الخيمة..."
                        />
                      </div>

                      {isAdminOrSuper && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">الفرقة الدراسية (نقل الطالب)</label>
                          <select
                            value={editGroupId}
                            onChange={(e) => setEditGroupId(Number(e.target.value))}
                            className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
                          >
                            <option value={1}>الفرقة الأولى</option>
                            <option value={2}>الفرقة الثانية</option>
                            <option value={3}>الفرقة الثالثة</option>
                          </select>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
                        <button
                          onClick={() => setIsEditing(false)}
                          disabled={saving}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="px-5 py-2 rounded-xl bg-[#c29938] text-slate-950 font-black text-xs hover:bg-[#c29938]/90 transition-all flex items-center gap-1.5 shadow-md"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>حفظ التعديلات</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Contact items */}
                      <div className="bg-[#0e1626]/70 border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="block text-slate-400 text-[11px]">الهاتف / واتساب</span>
                          {prof.phone ? (
                            <a
                              href={`tel:${prof.phone}`}
                              className="text-sm font-bold text-slate-200 hover:text-[#c29938] flex items-center gap-1.5 mt-0.5"
                            >
                              <span>{prof.phone}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500 mt-0.5 block">غير مسجل</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-[#0e1626]/70 border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
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

                      <div className="bg-[#0e1626]/70 border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="block text-slate-400 text-[11px]">الكنيسة وأب الاعتراف</span>
                          <span className="text-sm font-bold text-slate-200 block mt-0.5">
                            {prof.church || 'كنيسة مارمرقس بالمنشية'}
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            أب الاعتراف: {prof.confession_father || 'غير مسجل'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#0e1626]/70 border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
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
                              className="text-[11px] text-[#c29938] hover:underline flex items-center gap-1 mt-1"
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
                      <Clock className="w-4 h-4 text-[#c29938]" />
                      <span>التسلسل الزمني لجلسات الحضور</span>
                    </h4>
                    <span className="text-xs text-slate-400">إجمالي {att?.history?.length || 0} جلسة مسجلة</span>
                  </div>

                  {att?.history && att.history.length > 0 ? (
                    <div className="bg-[#0e1626]/70 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800">
                      {att.history.map((record: any) => (
                        <div key={record.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-3.5 h-3.5 rounded-full ${
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
                              className={`text-xs font-bold px-3 py-1 rounded-xl border ${
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
                    <div className="p-10 text-center bg-[#0e1626]/40 border border-dashed border-slate-800 rounded-3xl text-slate-400 text-xs">
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
                      <Trophy className="w-4 h-4 text-[#c29938]" />
                      <span>مشاركات الماراثون الإلكتروني</span>
                    </h4>
                  </div>

                  {marathons && marathons.length > 0 ? (
                    <div className="space-y-3">
                      {marathons.map((m: any) => (
                        <div key={m.marathon_id} className="bg-[#0e1626]/70 border border-slate-800/80 rounded-2xl p-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-sm text-slate-100">{m.marathon_title}</h5>
                            <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-[#c29938]/15 text-[#c29938] border border-[#c29938]/30">
                              {m.verbal_appreciation || 'مشارك'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-slate-800 text-center text-xs">
                            <div>
                              <span className="text-slate-400 block text-[11px]">الأسئلة المجابة</span>
                              <span className="font-bold text-slate-200 mt-0.5 block">
                                {m.answered_questions} / {m.total_questions}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">حالة الماراثون</span>
                              <span className="font-bold text-slate-200 mt-0.5 block">
                                {m.status === 'PUBLISHED' ? 'نشط' : 'منتهي'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">التقدير اللفظي</span>
                              <span className="font-bold text-[#c29938] mt-0.5 block">{m.verbal_appreciation || 'جيد'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center bg-[#0e1626]/40 border border-dashed border-slate-800 rounded-3xl text-slate-400 text-xs">
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
                      <Award className="w-4 h-4 text-[#c29938]" />
                      <span>سجل درجات الامتحانات والترم</span>
                    </h4>
                  </div>

                  {exams && exams.length > 0 ? (
                    <div className="bg-[#0e1626]/70 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800">
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
                            <span className="text-sm font-black text-[#c29938] block">
                              {g.score} / {g.max_grade}
                            </span>
                            <span className="text-xs text-emerald-400 font-bold">{g.appreciation || 'ناجح'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center bg-[#0e1626]/40 border border-dashed border-slate-800 rounded-3xl text-slate-400 text-xs">
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
