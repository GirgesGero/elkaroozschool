'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import GroupSelector from '@/components/GroupSelector';
import TraineeProfileDrawer from '@/components/TraineeProfileDrawer';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  Plus,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
  Eye,
  TrendingUp,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import type { Profile, AttendanceStatus } from '@/types/database';

interface AttendanceSession {
  id: string;
  group_id: number;
  session_date: string;
  status: 'OPEN' | 'LOCKED';
}

interface TraineeAttendanceRow {
  trainee_id: string;
  full_name: string;
  username: string;
  phone: string | null;
  status: AttendanceStatus | null;
}

export default function AttendancePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(1);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [traineeRows, setTraineeRows] = useState<TraineeAttendanceRow[]>([]);
  const [personalSummary, setPersonalSummary] = useState<any>(null);
  const [personalRecords, setPersonalRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'PRESENT' | 'ABSENT' | 'LATE'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Trainee Drawer
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isAdminOrSuper = profile?.role_id === 'admin' || profile?.role_id === 'super_user';

  const loadSessionsAndTrainees = async (targetGroupId: number) => {
    setLoading(true);
    const supabase = createClient();

    const { data: sessList } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('group_id', targetGroupId)
      .order('session_date', { ascending: false });

    if (sessList && sessList.length > 0) {
      setSessions(sessList);
      setSelectedSessionId(sessList[0].id);
      loadSessionTrainees(sessList[0].id, targetGroupId);
    } else {
      setSessions([]);
      setSelectedSessionId('');
      setTraineeRows([]);
    }
    setLoading(false);
  };

  const loadSessionTrainees = async (sId: string, gId: number) => {
    if (!sId) return;
    const supabase = createClient();

    const { data: trainees } = await supabase
      .from('profiles')
      .select('id, full_name, username, phone')
      .eq('group_id', gId)
      .eq('role_id', 'trainee')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    const { data: records } = await supabase
      .from('attendance_records')
      .select('trainee_id, status')
      .eq('session_id', sId)
      .is('deleted_at', null);

    const recordMap = new Map();
    if (records) {
      records.forEach((r: any) => recordMap.set(r.trainee_id, r.status));
    }

    if (trainees) {
      const rows: TraineeAttendanceRow[] = trainees.map((t: any) => ({
        trainee_id: t.id,
        full_name: t.full_name,
        username: t.username,
        phone: t.phone,
        status: recordMap.get(t.id) || null,
      }));
      setTraineeRows(rows);
    }
  };

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
        const defaultGroup = prof.group_id || 1;
        setSelectedGroupId(defaultGroup);

        if (prof.role_id === 'trainee') {
          const { data: summary } = await supabase.rpc('get_trainee_attendance_summary', {
            p_trainee_id: prof.id,
          });
          if (summary) setPersonalSummary(summary);

          const { data: records } = await supabase
            .from('attendance_records')
            .select('*, attendance_sessions(session_date)')
            .eq('trainee_id', prof.id)
            .is('deleted_at', null)
            .order('recorded_at', { ascending: false });

          if (records) setPersonalRecords(records);
          setLoading(false);
        } else {
          loadSessionsAndTrainees(defaultGroup);
        }
      }
    }

    init();
  }, [router]);

  const handleGroupChange = (newGroupId: number) => {
    setSelectedGroupId(newGroupId);
    loadSessionsAndTrainees(newGroupId);
  };

  const handleSessionChange = (sId: string) => {
    setSelectedSessionId(sId);
    loadSessionTrainees(sId, selectedGroupId);
  };

  const currentSession = sessions.find((s) => s.id === selectedSessionId);
  const isSessionLocked = currentSession?.status === 'LOCKED';

  const handleMarkAttendance = async (traineeId: string, status: AttendanceStatus) => {
    if (isSessionLocked) return;

    setSaving(true);
    setNotice(null);
    const supabase = createClient();

    const { error } = await supabase.from('attendance_records').upsert(
      {
        session_id: selectedSessionId,
        group_id: selectedGroupId,
        trainee_id: traineeId,
        status: status,
        recorded_by: profile?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,trainee_id' }
    );

    if (error) {
      setNotice(`فشل التسجيل: ${error.message}`);
    } else {
      setTraineeRows((prev) =>
        prev.map((r) => (r.trainee_id === traineeId ? { ...r, status } : r))
      );
      if (status === 'ABSENT') {
        setNotice('تم رصد الغياب وإرسال إشعار الافتقاد التلقائي للمتدرب ولخدام الفرقة.');
      } else {
        setNotice('تم تحديث حالة الحضور بنجاح.');
      }
    }
    setSaving(false);
  };

  const openDrawer = (tId: string) => {
    setSelectedTraineeId(tId);
    setIsDrawerOpen(true);
  };

  const presentCount = traineeRows.filter((r) => r.status === 'PRESENT').length;
  const absentCount = traineeRows.filter((r) => r.status === 'ABSENT').length;
  const lateCount = traineeRows.filter((r) => r.status === 'LATE').length;

  const filteredRows = traineeRows.filter((r) => {
    const matchSearch =
      searchQuery.trim() === '' ||
      r.full_name.includes(searchQuery.trim()) ||
      r.username.includes(searchQuery.trim());

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'PRESENT' && r.status === 'PRESENT') ||
      (statusFilter === 'ABSENT' && r.status === 'ABSENT') ||
      (statusFilter === 'LATE' && r.status === 'LATE');

    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20" dir="rtl">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرئيسية</span>
            </Link>

            {isAdminOrSuper && (
              <GroupSelector
                selectedGroupId={selectedGroupId}
                onSelectGroup={handleGroupChange}
                showAllOption={false}
              />
            )}

            <div>
              <span className="font-bold text-base text-karooz-gold block">الحضور والافتقاد الأسبوعي</span>
              <span className="text-[11px] text-slate-400">
                {selectedGroupId === 1 ? 'الفرقة الأولى' : selectedGroupId === 2 ? 'الفرقة الثانية' : 'الفرقة الثالثة'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-900/40 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 mb-1 text-xs font-semibold">
              <Calendar className="w-4 h-4" />
              <span>دورة الجمعة الأسبوعية</span>
            </div>
            <h1 className="text-xl font-bold text-white">نظام الحضور والافتقاد الكنسي</h1>
            <p className="text-xs text-slate-400 mt-1">
              تفتح جلسة الجمعة وتغلق نهائياً بنهاية يوم الأربعاء (قفل الخميس الإجباري).
            </p>
          </div>

          <Link
            href={`/groups/${selectedGroupId}`}
            className="px-4 py-2 rounded-xl bg-karooz-gold text-slate-950 text-xs font-bold hover:bg-karooz-gold-light transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>عرض تفاصيل الفرقة كاملة</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        {notice && (
          <div className="p-3.5 bg-blue-950/60 border border-blue-800/60 text-blue-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* --- VIEW 1: TRAINEE PERSONAL SUMMARY --- */}
        {profile?.role_id === 'trainee' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                <span className="text-xs text-slate-400 block mb-1">نسبة الحضور</span>
                <span className="text-2xl font-bold text-white">
                  {personalSummary?.percentage || 0}%
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                <span className="text-xs text-slate-400 block mb-1">التقدير العام</span>
                <span className="text-lg font-bold text-emerald-400">
                  {personalSummary?.appreciation_grade || '—'}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                <span className="text-xs text-slate-400 block mb-1">حاضر</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {personalSummary?.present_count || 0}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                <span className="text-xs text-slate-400 block mb-1">غياب</span>
                <span className="text-2xl font-bold text-rose-400">
                  {personalSummary?.absent_count || 0}
                </span>
              </div>
            </div>

            {/* Attendance History */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
              <h3 className="font-bold text-base text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-karooz-gold" />
                <span>سجل الحضور الأسبوعي</span>
              </h3>

              {personalRecords.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/50 rounded-xl border border-slate-800/60">
                  لا توجد سجلات حضور مسجلة حتى الآن.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {personalRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-white">
                          جمعة {rec.attendance_sessions?.session_date}
                        </span>
                      </div>
                      <div>
                        {rec.status === 'PRESENT' && (
                          <span className="px-3 py-1 bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 text-xs font-bold rounded-lg flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>حاضر</span>
                          </span>
                        )}
                        {rec.status === 'ABSENT' && (
                          <span className="px-3 py-1 bg-rose-950/60 text-rose-300 border border-rose-800/50 text-xs font-bold rounded-lg flex items-center gap-1.5">
                            <UserX className="w-3.5 h-3.5" />
                            <span>غائب</span>
                          </span>
                        )}
                        {rec.status === 'LATE' && (
                          <span className="px-3 py-1 bg-amber-950/60 text-amber-300 border border-amber-800/50 text-xs font-bold rounded-lg flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>متأخر</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- VIEW 2: STAFF & SECRETARIAT & ADMIN VIEW --- */}
        {profile?.role_id !== 'trainee' && (
          <div className="space-y-6">
            {/* Session Selector & Stats Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    اختر جلسة الجمعة لرصد الحضور:
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => handleSessionChange(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-karooz-gold text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-karooz-gold font-bold"
                  >
                    {sessions.map((sess) => (
                      <option key={sess.id} value={sess.id}>
                        جمعة {sess.session_date} {sess.status === 'LOCKED' ? '(مغلقة نهائياً)' : '(مفتوحة للرصد)'}
                      </option>
                    ))}
                  </select>
                </div>

                {isSessionLocked && (
                  <div className="flex items-center gap-2 bg-rose-950/50 border border-rose-800/60 text-rose-300 px-3.5 py-2 rounded-xl text-xs font-semibold">
                    <Lock className="w-4 h-4" />
                    <span>الجلسة مغلقة نهائياً (انتهت فترة السماح الأسبوعية)</span>
                  </div>
                )}
              </div>

              {/* Live Count Pills (Clickable Filter) */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800 text-center">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`p-2.5 rounded-xl border transition-all ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 border-slate-600 text-white font-bold'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-[11px]">الكل</span>
                  <span className="text-sm font-bold text-slate-100">{traineeRows.length}</span>
                </button>

                <button
                  onClick={() => setStatusFilter('PRESENT')}
                  className={`p-2.5 rounded-xl border transition-all ${
                    statusFilter === 'PRESENT'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-emerald-500/10'
                  }`}
                >
                  <span className="block text-[11px] text-emerald-400">حاضر</span>
                  <span className="text-sm font-bold text-emerald-300">{presentCount}</span>
                </button>

                <button
                  onClick={() => setStatusFilter('ABSENT')}
                  className={`p-2.5 rounded-xl border transition-all ${
                    statusFilter === 'ABSENT'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-rose-500/10'
                  }`}
                >
                  <span className="block text-[11px] text-rose-400">غائب (الافتقاد)</span>
                  <span className="text-sm font-bold text-rose-300">{absentCount}</span>
                </button>

                <button
                  onClick={() => setStatusFilter('LATE')}
                  className={`p-2.5 rounded-xl border transition-all ${
                    statusFilter === 'LATE'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-amber-500/10'
                  }`}
                >
                  <span className="block text-[11px] text-amber-400">متأخر</span>
                  <span className="text-sm font-bold text-amber-300">{lateCount}</span>
                </button>
              </div>
            </div>

            {/* Trainees Checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-karooz-gold" />
                  <span>قائمة متدربي الفرقة ({filteredRows.length})</span>
                </h3>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في القائمة..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-karooz-gold"
                  />
                </div>
              </div>

              {filteredRows.length > 0 ? (
                <div className="divide-y divide-slate-800/80">
                  {filteredRows.map((t) => (
                    <div
                      key={t.trainee_id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-950/30 px-2 rounded-xl transition-colors"
                    >
                      <div
                        onClick={() => openDrawer(t.trainee_id)}
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-800 text-karooz-gold flex items-center justify-center font-bold text-sm">
                          {t.full_name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-100 hover:text-karooz-gold transition-colors block">
                            {t.full_name}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">@{t.username} • {t.phone || 'بدون هاتف'}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          disabled={isSessionLocked || saving}
                          onClick={() => handleMarkAttendance(t.trainee_id, 'PRESENT')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            t.status === 'PRESENT'
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-300'
                          } disabled:opacity-50`}
                        >
                          حاضر ✓
                        </button>
                        <button
                          disabled={isSessionLocked || saving}
                          onClick={() => handleMarkAttendance(t.trainee_id, 'ABSENT')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            t.status === 'ABSENT'
                              ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                              : 'bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300'
                          } disabled:opacity-50`}
                        >
                          غائب ✕
                        </button>
                        <button
                          disabled={isSessionLocked || saving}
                          onClick={() => handleMarkAttendance(t.trainee_id, 'LATE')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            t.status === 'LATE'
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                              : 'bg-slate-800 text-slate-400 hover:bg-amber-500/20 hover:text-amber-300'
                          } disabled:opacity-50`}
                        >
                          متأخر ⏱
                        </button>

                        <button
                          onClick={() => openDrawer(t.trainee_id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="عرض ملف الطالب"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                  لا توجد نتائج مطابقة للتصفية.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Trainee Interactive Drawer */}
      <TraineeProfileDrawer
        traineeId={selectedTraineeId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentUserProfile={profile}
        onProfileUpdated={() => loadSessionTrainees(selectedSessionId, selectedGroupId)}
      />
    </div>
  );
}
