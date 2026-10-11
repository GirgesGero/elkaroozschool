'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { explainDbError } from '@/lib/errors/db';
import { AttendanceService } from '@/lib/attendance/service';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import GroupSelector from '@/components/GroupSelector';
import TraineeProfileDrawer from '@/components/TraineeProfileDrawer';
import QRScannerModal from '@/components/QRScannerModal';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  Plus,
  QrCode,
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
  Sparkles,
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // QR Scanner Modal
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [rawTrainees, setRawTrainees] = useState<Profile[]>([]);

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
      setRawTrainees(trainees as Profile[]);
      const rows: TraineeAttendanceRow[] = trainees.map((t: any) => ({
        trainee_id: t.id,
        full_name: t.full_name,
        username: t.username,
        phone: t.phone,
        status: recordMap.get(t.id) || null,
      }));
      setTraineeRows(rows);
    } else {
      setRawTrainees([]);
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

  const handleMarkAttendance = async (
    traineeId: string,
    status: AttendanceStatus,
    source: 'QR' | 'MANUAL' = 'MANUAL'
  ) => {
    if (!currentSession || !profile) return;

    setSaving(true);
    setNotice(null);
    const supabase = createClient();

    const isAuthorized = isAdminOrSuper || (profile.role_id === 'secretariat' && profile.group_id === selectedGroupId);

    try {
      await AttendanceService.record(
        {
          upsert: async (record) => supabase.from('attendance_records').upsert(record, { onConflict: 'session_id,trainee_id' }),
        },
        {
          sessionId: selectedSessionId,
          groupId: selectedGroupId,
          traineeId,
          status,
          recordedBy: profile.id,
          source,
        },
        {
          id: currentSession.id,
          group_id: selectedGroupId,
          session_date: currentSession.session_date,
          status: currentSession.status,
        },
        isAuthorized
      );

      setTraineeRows((prev) =>
        prev.map((r) => (r.trainee_id === traineeId ? { ...r, status } : r))
      );
      setNotice(status === 'ABSENT'
        ? 'تم رصد الغياب وإرسال إشعار الافتقاد التلقائي للمتدرب ولخدام الفرقة.'
        : `تم تحديث حالة الحضور بنجاح (${source === 'QR' ? 'عبر رمز QR' : 'يدوياً'}).`);
    } catch (error) {
      setNotice(explainDbError(error));
    } finally {
      setSaving(false);
    }
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

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6 pb-28 md:pb-12">
        {/* Top Control Bar with Group Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-canvas border border-line shadow-xl">
          <div className="flex items-center gap-3">
            {isAdminOrSuper && (
              <GroupSelector
                selectedGroupId={selectedGroupId}
                onSelectGroup={handleGroupChange}
                showAllOption={false}
              />
            )}
            <div>
              <span className="font-bold text-base text-gold block">الحضور والافتقاد الأسبوعي</span>
              <span className="text-[11px] text-content-muted">
                {selectedGroupId === 1 ? 'الفرقة الأولى' : selectedGroupId === 2 ? 'الفرقة الثانية' : 'الفرقة الثالثة'}
              </span>
            </div>
          </div>
        </div>
        {/* Banner */}
        <div className="bg-gradient-to-r from-success/60 via-canvas to-canvas border border-success/40 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-success mb-1 text-xs font-semibold">
              <Calendar className="w-4 h-4" />
              <span>دورة الجمعة الأسبوعية</span>
            </div>
            <h1 className="text-xl font-bold text-content">نظام الحضور والافتقاد الكنسي</h1>
            <p className="text-xs text-content-muted mt-1">
              تفتح جلسة الجمعة وتغلق نهائياً بنهاية يوم الأربعاء (قفل الخميس الإجباري).
            </p>
          </div>

          <Link
            href={`/groups/${selectedGroupId}`}
            className="px-4 py-2 rounded-xl bg-gold text-content text-xs font-bold hover:bg-gold-light transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>عرض تفاصيل الفرقة كاملة</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        {notice && (
          <div className="p-3.5 bg-canvas/60 border border-line-subtle/60 text-info rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-info flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* --- VIEW 1: TRAINEE PERSONAL SUMMARY --- */}
        {profile?.role_id === 'trainee' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-nav border border-line p-4 rounded-xl text-center">
                <span className="text-xs text-content-muted block mb-1">نسبة الحضور</span>
                <span className="text-2xl font-bold text-content">
                  {personalSummary?.percentage || 0}%
                </span>
              </div>

              <div className="bg-nav border border-line p-4 rounded-xl text-center">
                <span className="text-xs text-content-muted block mb-1">التقدير العام</span>
                <span className="text-lg font-bold text-success">
                  {personalSummary?.appreciation_grade || '—'}
                </span>
              </div>

              <div className="bg-nav border border-line p-4 rounded-xl text-center">
                <span className="text-xs text-content-muted block mb-1">حاضر</span>
                <span className="text-2xl font-bold text-success">
                  {personalSummary?.present_count || 0}
                </span>
              </div>

              <div className="bg-nav border border-line p-4 rounded-xl text-center">
                <span className="text-xs text-content-muted block mb-1">غياب</span>
                <span className="text-2xl font-bold text-danger">
                  {personalSummary?.absent_count || 0}
                </span>
              </div>
            </div>

            {/* Attendance History */}
            <div className="bg-nav border border-line rounded-2xl p-5 shadow-md">
              <h3 className="font-bold text-base text-content mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-gold" />
                <span>سجل الحضور الأسبوعي</span>
              </h3>

              {personalRecords.length === 0 ? (
                <div className="text-center py-6 text-content-muted text-xs bg-nav/50 rounded-xl border border-line/60">
                  لا توجد سجلات حضور مسجلة حتى الآن.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {personalRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-nav/80 border border-line/80 p-3.5 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-content-muted" />
                        <span className="text-sm font-semibold text-content">
                          جمعة {rec.attendance_sessions?.session_date}
                        </span>
                      </div>
                      <div>
                        {rec.status === 'PRESENT' && (
                          <span className="px-3 py-1 bg-canvas/60 text-success border border-success/50 text-xs font-bold rounded-lg flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>حاضر</span>
                          </span>
                        )}
                        {rec.status === 'ABSENT' && (
                          <span className="px-3 py-1 bg-canvas/60 text-danger border border-danger/50 text-xs font-bold rounded-lg flex items-center gap-1.5">
                            <UserX className="w-3.5 h-3.5" />
                            <span>غائب</span>
                          </span>
                        )}
                        {rec.status === 'LATE' && (
                          <span className="px-3 py-1 bg-canvas/60 text-warning border border-warning/50 text-xs font-bold rounded-lg flex items-center gap-1.5">
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
            <div className="bg-nav border border-line rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <label className="block text-xs font-bold text-content-muted mb-1.5">
                    اختر جلسة الجمعة لرصد الحضور:
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => handleSessionChange(e.target.value)}
                    className="bg-nav border border-line text-gold text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-gold font-bold"
                  >
                    {sessions.map((sess) => (
                      <option key={sess.id} value={sess.id}>
                        جمعة {sess.session_date} {sess.status === 'LOCKED' ? '(مغلقة نهائياً)' : '(مفتوحة للرصد)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => setIsQRScannerOpen(true)}
                    disabled={!selectedSessionId || isSessionLocked}
                    className="px-4 py-2.5 rounded-xl bg-gold hover:bg-warning disabled:opacity-40 disabled:hover:bg-gold text-content text-xs font-black transition-all shadow-md flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>مسح رمز QR</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>

                  {isSessionLocked && (
                    <div className="flex items-center gap-2 bg-canvas/50 border border-danger/60 text-danger px-3.5 py-2 rounded-xl text-xs font-semibold">
                      <Lock className="w-4 h-4" />
                      <span>الجلسة مغلقة نهائياً</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Count Pills (Clickable Filter) */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-line text-center">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`p-2.5 rounded-xl border transition-all ${
                    statusFilter === 'all'
                      ? 'bg-nav border-line-subtle text-content font-bold'
                      : 'bg-nav/40 border-line text-content-muted hover:bg-nav'
                  }`}
                >
                  <span className="block text-[11px]">الكل</span>
                  <span className="text-sm font-bold text-content">{traineeRows.length}</span>
                </button>

                <button
                  onClick={() => setStatusFilter('PRESENT')}
                  className={`p-2.5 rounded-xl border transition-all ${
                    statusFilter === 'PRESENT'
                      ? 'bg-success/20 border-success text-success font-bold'
                      : 'bg-nav/40 border-line text-content-muted hover:bg-success/10'
                  }`}
                >
                  <span className="block text-[11px] text-success">حاضر</span>
                  <span className="text-sm font-bold text-success">{presentCount}</span>
                </button>

                <button
                  onClick={() => setStatusFilter('ABSENT')}
                  className={`p-2.5 rounded-xl border transition-all ${
                    statusFilter === 'ABSENT'
                      ? 'bg-danger/20 border-danger text-danger font-bold'
                      : 'bg-nav/40 border-line text-content-muted hover:bg-danger/10'
                  }`}
                >
                  <span className="block text-[11px] text-danger">غائب (الافتقاد)</span>
                  <span className="text-sm font-bold text-danger">{absentCount}</span>
                </button>

                <button
                  onClick={() => setStatusFilter('LATE')}
                  className={`p-2.5 rounded-xl border transition-all ${
                    statusFilter === 'LATE'
                      ? 'bg-warning/20 border-warning text-warning font-bold'
                      : 'bg-nav/40 border-line text-content-muted hover:bg-warning/10'
                  }`}
                >
                  <span className="block text-[11px] text-warning">متأخر</span>
                  <span className="text-sm font-bold text-warning">{lateCount}</span>
                </button>
              </div>
            </div>

            {/* Trainees Checklist */}
            <div className="bg-nav border border-line rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-base text-content flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold" />
                  <span>قائمة متدربي الفرقة ({filteredRows.length})</span>
                </h3>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-content-muted absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في القائمة..."
                    className="w-full bg-nav border border-line rounded-xl pr-9 pl-3 py-1.5 text-xs text-content placeholder-content-muted focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {filteredRows.length > 0 ? (
                <div className="divide-y divide-line-subtle/80">
                  {filteredRows.map((t) => (
                    <div
                      key={t.trainee_id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-nav/30 px-2 rounded-xl transition-colors"
                    >
                      <div
                        onClick={() => openDrawer(t.trainee_id)}
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <div className="w-9 h-9 rounded-xl bg-nav text-gold flex items-center justify-center font-bold text-sm">
                          {t.full_name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-content hover:text-gold transition-colors block">
                            {t.full_name}
                          </span>
                          <span className="text-xs text-content-muted font-mono">@{t.username} • {t.phone || 'بدون هاتف'}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          disabled={isSessionLocked || saving}
                          onClick={() => handleMarkAttendance(t.trainee_id, 'PRESENT')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            t.status === 'PRESENT'
                              ? 'bg-success text-content shadow-md shadow-emerald-500/20'
                              : 'bg-nav text-content-muted hover:bg-success/20 hover:text-success'
                          } disabled:opacity-50`}
                        >
                          حاضر ✓
                        </button>
                        <button
                          disabled={isSessionLocked || saving}
                          onClick={() => handleMarkAttendance(t.trainee_id, 'ABSENT')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            t.status === 'ABSENT'
                              ? 'bg-danger text-content shadow-md shadow-rose-500/20'
                              : 'bg-nav text-content-muted hover:bg-danger/20 hover:text-danger'
                          } disabled:opacity-50`}
                        >
                          غائب ✕
                        </button>
                        <button
                          disabled={isSessionLocked || saving}
                          onClick={() => handleMarkAttendance(t.trainee_id, 'LATE')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            t.status === 'LATE'
                              ? 'bg-warning text-content shadow-md shadow-amber-500/20'
                              : 'bg-nav text-content-muted hover:bg-warning/20 hover:text-warning'
                          } disabled:opacity-50`}
                        >
                          متأخر ⏱
                        </button>

                        <button
                          onClick={() => openDrawer(t.trainee_id)}
                          className="p-2 rounded-xl bg-nav hover:bg-input text-content-secondary transition-colors"
                          title="عرض ملف الطالب"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-content-muted bg-nav/40 rounded-xl border border-line">
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

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        groupId={selectedGroupId}
        sessionId={selectedSessionId}
        sessionStatus={currentSession?.status || 'OPEN'}
        sessionDate={currentSession?.session_date}
        trainees={rawTrainees}
        onRecordAttendance={async (traineeId, status) => {
          try {
            await handleMarkAttendance(traineeId, status, 'QR');
            return { success: true, message: '' };
          } catch (err: any) {
            return { success: false, message: err?.message || 'فشل في حفظ الحضور.' };
          }
        }}
      />

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
