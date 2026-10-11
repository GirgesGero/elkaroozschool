'use client';

import { useState, useEffect } from 'react';
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
import Avatar from '../components/Avatar';

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
    if (rate >= 85) return 'text-success bg-success/10 border-success/30';
    if (rate >= 70) return 'text-warning bg-warning/10 border-warning/30';
    return 'text-danger bg-danger/10 border-danger/30';
  };

  const getGroupName = (gId: number) => {
    if (gId === 1) return 'الفرقة الأولى';
    if (gId === 2) return 'الفرقة الثانية';
    return 'الفرقة الثالثة';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md animate-fade-in flex justify-end">
      <div
        className="w-full max-w-2xl bg-canvas border-r border-gold/30 h-full flex flex-col shadow-2xl shadow-black/80 overflow-hidden animate-slide-in-left relative"
        dir="rtl"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-canvas/90 border-b border-gold/20 flex items-center justify-between sticky top-0 z-20 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-nav/80 transition-colors border border-transparent hover:border-line"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-black text-lg text-content flex items-center gap-2">
                <span>الملف الأكاديمي والشخصي للمتدرب</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30">
                  {prof ? getGroupName(prof.group_id) : 'الفرقة'}
                </span>
              </h2>
              <p className="text-xs text-content-muted mt-0.5">إدارة ومتابعة الحضور، الامتحانات، والنشاط الأكاديمي</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 rounded-xl bg-nav hover:bg-nav text-content text-xs font-bold flex items-center gap-1.5 transition-all border border-gold/30 hover:border-gold/60 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5 text-gold" />
                <span>تعديل</span>
              </button>
            )}
            {isAdminOrSuper && prof && (
              <button
                onClick={handleToggleStatus}
                disabled={saving}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-sm ${
                  prof.is_active
                    ? 'bg-danger/10 text-danger border-danger/30 hover:bg-danger/20'
                    : 'bg-success/10 text-success border-success/30 hover:bg-success/20'
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
                ? 'bg-success/10 text-success border-success/30'
                : 'bg-danger/10 text-danger border-danger/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notice.text}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-content-muted hover:text-content">✕</button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-content-muted">
              <Loader2 className="w-8 h-8 animate-spin text-gold" />
              <p className="text-sm">جاري تحميل الملف الكامل للمتدرب...</p>
            </div>
          ) : prof ? (
            <>
              {/* Profile Hero Card */}
              <div className="bg-gradient-to-b from-canvas to-canvas border border-gold/30 rounded-3xl p-5 sm:p-6 relative overflow-hidden backdrop-blur-xl shadow-xl shadow-black/40">
                <div className="absolute top-0 right-0 w-36 h-36 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-gold/30 via-canvas to-gold/10 border-2 border-gold p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-gold/10">
                      {prof.avatar_url ? (
                        <Avatar src={prof.avatar_url} name={prof.full_name} size={80} />
                      ) : (
                        <User className="w-10 h-10 text-gold" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-xl font-black text-content tracking-tight">{prof.full_name}</h3>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            prof.is_active
                              ? 'bg-success/10 text-success border-success/30'
                              : 'bg-danger/10 text-danger border-danger/30'
                          }`}
                        >
                          {prof.is_active ? 'حساب نشط ✓' : 'حساب موقوف ✕'}
                        </span>
                      </div>
                      <p className="text-xs text-content-muted mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="text-gold font-mono">@{prof.username}</span>
                        {prof.confession_father && (
                          <>
                            <span className="text-content-muted">•</span>
                            <span className="text-content-secondary">أب الاعتراف: {prof.confession_father}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Attendance Rate Pill */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-line/80">
                    <span className="text-xs text-content-muted mb-1">نسبة الحضور الإجمالية</span>
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
                <div className="grid grid-cols-4 gap-2.5 mt-6 pt-5 border-t border-line/80 text-center">
                  <div className="bg-canvas/70 rounded-2xl p-2.5 border border-line">
                    <span className="block text-content-muted text-[11px]">الجلسات</span>
                    <span className="text-base font-bold text-content mt-0.5 block">{att?.total_sessions || 0}</span>
                  </div>
                  <div className="bg-success/5 rounded-2xl p-2.5 border border-success/20">
                    <span className="block text-success text-[11px]">حاضر</span>
                    <span className="text-base font-bold text-success mt-0.5 block">{att?.present_count || 0}</span>
                  </div>
                  <div className="bg-danger/5 rounded-2xl p-2.5 border border-danger/20">
                    <span className="block text-danger text-[11px]">غياب</span>
                    <span className="text-base font-bold text-danger mt-0.5 block">{att?.absent_count || 0}</span>
                  </div>
                  <div className="bg-warning/5 rounded-2xl p-2.5 border border-warning/20">
                    <span className="block text-warning text-[11px]">تأخير</span>
                    <span className="text-base font-bold text-warning mt-0.5 block">{att?.late_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Capsule Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-canvas border border-line rounded-2xl overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 min-w-[110px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'profile'
                      ? 'bg-gold text-brand-on shadow-md font-black'
                      : 'text-content-muted hover:text-content hover:bg-nav/50'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>البيانات الشخصية</span>
                </button>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'attendance'
                      ? 'bg-gold text-brand-on shadow-md font-black'
                      : 'text-content-muted hover:text-content hover:bg-nav/50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>سجل الحضور ({att?.history?.length || 0})</span>
                </button>
                <button
                  onClick={() => setActiveTab('marathon')}
                  className={`flex-1 min-w-[100px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'marathon'
                      ? 'bg-gold text-brand-on shadow-md font-black'
                      : 'text-content-muted hover:text-content hover:bg-nav/50'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>الماراثون ({marathons.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('exams')}
                  className={`flex-1 min-w-[100px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'exams'
                      ? 'bg-gold text-brand-on shadow-md font-black'
                      : 'text-content-muted hover:text-content hover:bg-nav/50'
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
                    <div className="bg-canvas/80 border border-gold/30 rounded-3xl p-5 sm:p-6 space-y-4">
                      <h4 className="text-sm font-bold text-gold flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        <span>تعديل بيانات المتدرب</span>
                      </h4>

                      {isAdminOrSuper && (
                        <div>
                          <label className="block text-xs font-semibold text-content-secondary mb-1">الاسم الكامل</label>
                          <input
                            type="text"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-sm text-content focus:outline-none focus:border-gold"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-content-secondary mb-1">رقم الهاتف / واتساب</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-sm text-content focus:outline-none focus:border-gold"
                            placeholder="01xxxxxxxxx"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-content-secondary mb-1">تاريخ الميلاد</label>
                          <input
                            type="date"
                            value={editBirthDate}
                            onChange={(e) => setEditBirthDate(e.target.value)}
                            className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-sm text-content focus:outline-none focus:border-gold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-content-secondary mb-1">الكنيسة التابع لها</label>
                          <input
                            type="text"
                            value={editChurch}
                            onChange={(e) => setEditChurch(e.target.value)}
                            className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-sm text-content focus:outline-none focus:border-gold"
                            placeholder="كنيسة مارمرقس بالمنشية"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-content-secondary mb-1">أب الاعتراف</label>
                          <input
                            type="text"
                            value={editConfessionFather}
                            onChange={(e) => setEditConfessionFather(e.target.value)}
                            className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-sm text-content focus:outline-none focus:border-gold"
                            placeholder="القمص / القس..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-content-secondary mb-1">العنوان بالتفصيل</label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-sm text-content focus:outline-none focus:border-gold"
                          placeholder="الشارع، المنطقة، شبرا الخيمة..."
                        />
                      </div>

                      {isAdminOrSuper && (
                        <div>
                          <label className="block text-xs font-semibold text-content-secondary mb-1">الفرقة الدراسية (نقل الطالب)</label>
                          <select
                            value={editGroupId}
                            onChange={(e) => setEditGroupId(Number(e.target.value))}
                            className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-sm text-content focus:outline-none focus:border-gold"
                          >
                            <option value={1}>الفرقة الأولى</option>
                            <option value={2}>الفرقة الثانية</option>
                            <option value={3}>الفرقة الثالثة</option>
                          </select>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line">
                        <button
                          onClick={() => setIsEditing(false)}
                          disabled={saving}
                          className="px-4 py-2 rounded-xl bg-nav text-content-secondary text-xs font-bold hover:bg-input transition-colors"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="px-5 py-2 rounded-xl bg-gold text-brand-on font-black text-xs hover:bg-gold/90 transition-all flex items-center gap-1.5 shadow-md"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>حفظ التعديلات</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Contact items */}
                      <div className="bg-canvas/70 border border-line/80 rounded-2xl p-4 flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-info/10 text-info border border-info/20">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="block text-content-muted text-[11px]">الهاتف / واتساب</span>
                          {prof.phone ? (
                            <a
                              href={`tel:${prof.phone}`}
                              className="text-sm font-bold text-content hover:text-gold flex items-center gap-1.5 mt-0.5"
                            >
                              <span>{prof.phone}</span>
                              <ExternalLink className="w-3 h-3 text-content-muted" />
                            </a>
                          ) : (
                            <span className="text-xs text-content-muted mt-0.5 block">غير مسجل</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-canvas/70 border border-line/80 rounded-2xl p-4 flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-info/10 text-purple-400 border border-info/20">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="block text-content-muted text-[11px]">تاريخ الميلاد والسن</span>
                          <span className="text-sm font-bold text-content block mt-0.5">
                            {prof.birth_date ? (
                              <>
                                {prof.birth_date}{' '}
                                <span className="text-xs text-content-muted">({calculateAge(prof.birth_date)} سنة)</span>
                              </>
                            ) : (
                              'غير محدد'
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="bg-canvas/70 border border-line/80 rounded-2xl p-4 flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-success/10 text-success border border-success/20">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="block text-content-muted text-[11px]">الكنيسة وأب الاعتراف</span>
                          <span className="text-sm font-bold text-content block mt-0.5">
                            {prof.church || 'كنيسة مارمرقس بالمنشية'}
                          </span>
                          <span className="text-xs text-content-muted block mt-0.5">
                            أب الاعتراف: {prof.confession_father || 'غير مسجل'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-canvas/70 border border-line/80 rounded-2xl p-4 flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-danger/10 text-danger border border-danger/20">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="block text-content-muted text-[11px]">العنوان السكني</span>
                          <span className="text-sm font-bold text-content block mt-0.5">
                            {prof.address || 'شبرا الخيمة'}
                          </span>
                          {prof.address && (
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(prof.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-gold hover:underline flex items-center gap-1 mt-1"
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
                    <h4 className="text-sm font-bold text-content flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gold" />
                      <span>التسلسل الزمني لجلسات الحضور</span>
                    </h4>
                    <span className="text-xs text-content-muted">إجمالي {att?.history?.length || 0} جلسة مسجلة</span>
                  </div>

                  {att?.history && att.history.length > 0 ? (
                    <div className="bg-canvas/70 border border-line/80 rounded-2xl overflow-hidden divide-y divide-line-subtle">
                      {att.history.map((record: any) => (
                        <div key={record.id} className="p-4 flex items-center justify-between hover:bg-nav/40 transition-colors">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-3.5 h-3.5 rounded-full ${
                                record.status === 'PRESENT'
                                  ? 'bg-success ring-4 ring-success/20'
                                  : record.status === 'ABSENT'
                                  ? 'bg-rose-400 ring-4 ring-danger/20'
                                  : 'bg-warning ring-4 ring-warning/20'
                              }`}
                            />
                            <div>
                              <span className="font-bold text-sm text-content block">
                                {new Date(record.session_date).toLocaleDateString('ar-EG', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                              <span className="text-xs text-content-muted">
                                {record.recorded_by_name ? `تم الرصد بواسطة: ${record.recorded_by_name}` : 'رصد تلقائي'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                                record.status === 'PRESENT'
                                  ? 'bg-success/10 text-success border-success/30'
                                  : record.status === 'ABSENT'
                                  ? 'bg-danger/10 text-danger border-danger/30'
                                  : 'bg-warning/10 text-warning border-warning/30'
                              }`}
                            >
                              {record.status === 'PRESENT' ? 'حاضر ✓' : record.status === 'ABSENT' ? 'غائب ✕' : 'متأخر ⏱'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center bg-canvas/40 border border-dashed border-line rounded-3xl text-content-muted text-xs">
                      لا توجد سجلات حضور مسجلة لهذا المتدرب حتى الآن.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Marathon Progress */}
              {activeTab === 'marathon' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-content flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-gold" />
                      <span>مشاركات الماراثون الإلكتروني</span>
                    </h4>
                  </div>

                  {marathons && marathons.length > 0 ? (
                    <div className="space-y-3">
                      {marathons.map((m: any) => (
                        <div key={m.marathon_id} className="bg-canvas/70 border border-line/80 rounded-2xl p-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-sm text-content">{m.marathon_title}</h5>
                            <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30">
                              {m.verbal_appreciation || 'مشارك'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-line text-center text-xs">
                            <div>
                              <span className="text-content-muted block text-[11px]">الأسئلة المجابة</span>
                              <span className="font-bold text-content mt-0.5 block">
                                {m.answered_questions} / {m.total_questions}
                              </span>
                            </div>
                            <div>
                              <span className="text-content-muted block text-[11px]">حالة الماراثون</span>
                              <span className="font-bold text-content mt-0.5 block">
                                {m.status === 'PUBLISHED' ? 'نشط' : 'منتهي'}
                              </span>
                            </div>
                            <div>
                              <span className="text-content-muted block text-[11px]">التقدير اللفظي</span>
                              <span className="font-bold text-gold mt-0.5 block">{m.verbal_appreciation || 'جيد'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center bg-canvas/40 border border-dashed border-line rounded-3xl text-content-muted text-xs">
                      لم يتم تسجيل أي مشاركات للماراثون لهذا المتدرب.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Exams & Grades */}
              {activeTab === 'exams' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-content flex items-center gap-2">
                      <Award className="w-4 h-4 text-gold" />
                      <span>سجل درجات الامتحانات والترم</span>
                    </h4>
                  </div>

                  {exams && exams.length > 0 ? (
                    <div className="bg-canvas/70 border border-line/80 rounded-2xl overflow-hidden divide-y divide-line-subtle">
                      {exams.map((g: any) => (
                        <div key={g.id} className="p-4 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-content block">{g.exam_title}</span>
                            <span className="text-xs text-content-muted">
                              تاريخ الرصد:{' '}
                              {new Date(g.graded_at).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-black text-gold block">
                              {g.score} / {g.max_grade}
                            </span>
                            <span className="text-xs text-success font-bold">{g.appreciation || 'ناجح'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center bg-canvas/40 border border-dashed border-line rounded-3xl text-content-muted text-xs">
                      لم ترصد درجات امتحانات رسمية لهذا المتدرب بعد.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-content-muted text-sm">لم يتم العثور على بيانات المتدرب.</div>
          )}
        </div>
      </div>
    </div>
  );
}
