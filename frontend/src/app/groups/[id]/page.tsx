'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import ServantProfileDrawer from '@/components/ServantProfileDrawer';
import QRScannerModal from '@/components/QRScannerModal';
import CreateTraineeModal from '@/components/CreateTraineeModal';
import {
  Users,
  Briefcase,
  Shield,
  TrendingUp,
  Clock,
  Calendar,
  Search,
  Filter,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Phone,
  User,
  UserCheck,
  UserX,
  Edit3,
  Award,
  Trophy,
  BookOpen,
  FileText,
  Loader2,
  Sparkles,
  ExternalLink,
  Layers,
  BarChart3,
  Plus,
  Lock,
  Eye,
  Save,
  QrCode,
  UserPlus,
} from 'lucide-react';
import type { Profile, AttendanceStatus } from '@/types/database';

interface PageProps {
  params?: { id?: string };
}

export default function GroupDetailsPage({ params }: PageProps) {
  const routeParams = useParams();
  const rawId = routeParams?.id || params?.id;
  const groupId = Number(rawId) || 1;
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'servants' | 'secretariat' | 'trainees' | 'attendance' | 'curriculum' | 'marathon' | 'reports'>('overview');
  const [loading, setLoading] = useState(true);

  // Group Summary State
  const [summary, setSummary] = useState<any>(null);
  const [servants, setServants] = useState<any[]>([]);
  const [secretariat, setSecretariat] = useState<any[]>([]);
  const [trainees, setTrainees] = useState<Profile[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [sessionRecords, setSessionRecords] = useState<Record<string, AttendanceStatus>>({});
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [marathons, setMarathons] = useState<any[]>([]);

  // Filter & Search
  const [traineeSearch, setTraineeSearch] = useState('');
  const [traineeStatusFilter, setTraineeStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | 'PRESENT' | 'ABSENT' | 'LATE'>('all');

  // Drawer Modals
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);
  const [selectedServantId, setSelectedServantId] = useState<string | null>(null);
  const [isTraineeDrawerOpen, setIsTraineeDrawerOpen] = useState(false);
  const [isServantDrawerOpen, setIsServantDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedUnifiedProfileId, setSelectedUnifiedProfileId] = useState<string | null>(null);

  // QR & Trainee Creation Modals
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isCreateTraineeOpen, setIsCreateTraineeOpen] = useState(false);

  // Admin Operational Modals
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newSessionStatus, setNewSessionStatus] = useState<'OPEN' | 'LOCKED'>('OPEN');
  const [creatingSession, setCreatingSession] = useState(false);

  const [isAppointSecOpen, setIsAppointSecOpen] = useState(false);
  const [selectedAppointServantId, setSelectedAppointServantId] = useState('');
  const [appointingSec, setAppointingSec] = useState(false);

  const [isAssignServantOpen, setIsAssignServantOpen] = useState(false);
  const [availableServants, setAvailableServants] = useState<Profile[]>([]);
  const [selectedAssignServantId, setSelectedAssignServantId] = useState('');
  const [assigningServant, setAssigningServant] = useState(false);

  // Action Notice
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);

  const isAdminOrSuper = profile?.role_id === 'admin' || profile?.role_id === 'super_user';
  const isGroupSecretariat = profile?.role_id === 'secretariat' && profile?.group_id === groupId;
  const isGroupServant = profile?.role_id === 'servant' && profile?.group_id === groupId;
  const canMarkAttendance = isAdminOrSuper || isGroupSecretariat;

  // Load Group Data
  const loadGroupData = async (gId: number, currentProf: Profile) => {
    setLoading(true);
    const supabase = createClient();

    // 1. Group Summary RPC
    const { data: sumData } = await supabase.rpc('get_group_operational_summary', { p_group_id: gId });
    if (sumData) setSummary(sumData);

    // 2. Servants Detailed RPC
    const { data: servData } = await supabase.rpc('get_group_servants_detailed', { p_group_id: gId });
    if (servData) setServants(servData);

    // 3. Secretariat Detailed RPC
    const { data: secData } = await supabase.rpc('get_group_secretariat_detailed', { p_group_id: gId });
    if (secData) setSecretariat(secData);

    // 4. Trainees List
    const { data: traineeList } = await supabase
      .from('profiles')
      .select('*')
      .eq('group_id', gId)
      .eq('role_id', 'trainee')
      .order('full_name', { ascending: true });
    if (traineeList) setTrainees(traineeList as Profile[]);

    // 5. Attendance Sessions
    const { data: sessList } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('group_id', gId)
      .order('session_date', { ascending: false });

    if (sessList && sessList.length > 0) {
      setSessions(sessList);
      setSelectedSessionId(sessList[0].id);
      loadSessionRecords(sessList[0].id);
    }

    // 6. Curriculums
    const { data: currList } = await supabase
      .from('curriculums')
      .select('*, lectures(*)')
      .eq('group_id', gId)
      .is('deleted_at', null);
    if (currList) setCurriculums(currList);

    // 7. Marathons
    const { data: marList } = await supabase
      .from('marathons')
      .select('*, marathon_questions(count)')
      .eq('group_id', gId)
      .is('deleted_at', null);
    if (marList) setMarathons(marList);

    setLoading(false);
  };

  const loadSessionRecords = async (sId: string) => {
    if (!sId) return;
    const supabase = createClient();
    const { data: records } = await supabase
      .from('attendance_records')
      .select('trainee_id, status')
      .eq('session_id', sId)
      .is('deleted_at', null);

    const recMap: Record<string, AttendanceStatus> = {};
    if (records) {
      records.forEach((r: any) => {
        recMap[r.trainee_id] = r.status;
      });
    }
    setSessionRecords(recMap);
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

      const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      if (userProfile) {
        const prof = userProfile as Profile;
        setProfile(prof);

        // Security check: If not Admin/Super and trying to access other group, enforce isolation
        if (!['admin', 'super_user'].includes(prof.role_id) && prof.group_id !== groupId) {
          router.push(`/groups/${prof.group_id}`);
          return;
        }

        if (typeof window !== 'undefined') {
          const tabParam = new URLSearchParams(window.location.search).get('tab');
          if (
            tabParam &&
            ['overview', 'servants', 'secretariat', 'trainees', 'attendance', 'curriculum', 'marathon', 'reports'].includes(
              tabParam
            )
          ) {
            setActiveTab(tabParam as any);
          }
        }

        loadGroupData(groupId, prof);
      }
    }

    init();
  }, [groupId, router]);

  const handleSessionChange = (sId: string) => {
    setSelectedSessionId(sId);
    loadSessionRecords(sId);
  };

  const handleMarkAttendance = async (
    traineeId: string,
    status: AttendanceStatus,
    source: 'QR' | 'MANUAL' = 'MANUAL'
  ) => {
    if (!canMarkAttendance || !selectedSessionId || !profile) return;
    const currentSession = sessions.find((s) => s.id === selectedSessionId);
    if (!currentSession) return;

    setUpdatingAttendance(true);
    setNotice(null);
    const supabase = createClient();

    try {
      await AttendanceService.record(
        {
          upsert: async (record) => supabase.from('attendance_records').upsert(record, { onConflict: 'session_id,trainee_id' }),
        },
        {
          sessionId: selectedSessionId,
          groupId,
          traineeId,
          status,
          recordedBy: profile.id,
          source,
        },
        {
          id: currentSession.id,
          group_id: groupId,
          session_date: currentSession.session_date,
          status: currentSession.status,
        },
        canMarkAttendance
      );

      setSessionRecords((prev) => ({ ...prev, [traineeId]: status }));
      setNotice({ type: 'success', text: `تم رصد حالة الحضور بنجاح (${source === 'QR' ? 'عبر رمز QR' : 'يدوياً'}).` });

      // Refresh group summary in background
      const { data: sumData } = await supabase.rpc('get_group_operational_summary', { p_group_id: groupId });
      if (sumData) setSummary(sumData);
    } catch (err) {
      setNotice({ type: 'error', text: explainDbError(err) });
    }
    setUpdatingAttendance(false);
  };

  const handleCreateSession = async () => {
    if (!canMarkAttendance || !newSessionDate) return;
    setCreatingSession(true);
    setNotice(null);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          group_id: groupId,
          session_date: newSessionDate,
          status: newSessionStatus,
        })
        .select()
        .single();

      if (error) throw error;

      setNotice({ type: 'success', text: `تم إنشاء جلسة حضور جديدة بتاريخ ${newSessionDate} بنجاح!` });
      setIsCreateSessionOpen(false);

      if (data) {
        setSessions((prev) => [data, ...prev.filter((s) => s.id !== data.id)]);
        setSelectedSessionId(data.id);
        loadSessionRecords(data.id);
      }
    } catch (err) {
      setNotice({ type: 'error', text: explainDbError(err) });
    }
    setCreatingSession(false);
  };

  const handleToggleSessionStatus = async (sessionId: string, currentStatus: string) => {
    if (!canMarkAttendance || !sessionId) return;
    setNotice(null);
    const supabase = createClient();
    const nextStatus = currentStatus === 'OPEN' ? 'LOCKED' : 'OPEN';
    const closedAt = nextStatus === 'LOCKED' ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({
          status: nextStatus,
          closed_at: closedAt,
        })
        .eq('id', sessionId);

      if (error) throw error;

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: nextStatus, closed_at: closedAt } : s))
      );
      setNotice({
        type: 'success',
        text: nextStatus === 'LOCKED' ? 'تم إغلاق وقفل جلسة الحضور.' : 'تم إعادة فتح جلسة الحضور للرصد.',
      });
    } catch (err) {
      setNotice({ type: 'error', text: explainDbError(err) });
    }
  };

  const handleAppointSecretariat = async () => {
    if (!isAdminOrSuper || !selectedAppointServantId) return;
    setAppointingSec(true);
    setNotice(null);
    const supabase = createClient();

    try {
      const { error } = await supabase.from('group_secretariat').insert({
        profile_id: selectedAppointServantId,
        group_id: groupId,
        appointed_by: profile?.id,
        is_active: true,
      });

      if (error) throw error;

      setNotice({ type: 'success', text: 'تم تعيين عضو السكرتارية للفرقة بنجاح!' });
      setIsAppointSecOpen(false);
      setSelectedAppointServantId('');

      if (profile) loadGroupData(groupId, profile);
    } catch (err) {
      setNotice({ type: 'error', text: explainDbError(err) });
    }
    setAppointingSec(false);
  };

  const openAssignServantModal = async () => {
    setIsAssignServantOpen(true);
    setSelectedAssignServantId('');
    const supabase = createClient();

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role_id', ['servant', 'secretariat'])
      .neq('group_id', groupId)
      .order('full_name', { ascending: true });

    if (data) {
      setAvailableServants(data as Profile[]);
    }
  };

  const handleAssignServant = async () => {
    if (!isAdminOrSuper || !selectedAssignServantId) return;
    setAssigningServant(true);
    setNotice(null);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ group_id: groupId })
        .eq('id', selectedAssignServantId);

      if (error) throw error;

      setNotice({ type: 'success', text: 'تم نقل الخادم إلى هذه الفرقة بنجاح!' });
      setIsAssignServantOpen(false);
      setSelectedAssignServantId('');

      if (profile) loadGroupData(groupId, profile);
    } catch (err) {
      setNotice({ type: 'error', text: explainDbError(err) });
    }
    setAssigningServant(false);
  };

  const openTraineeDrawer = (tId: string) => {
    setSelectedTraineeId(tId);
    setIsTraineeDrawerOpen(true);
  };

  const openServantDrawer = (sId: string) => {
    setSelectedServantId(sId);
    setIsServantDrawerOpen(true);
  };

  const groupNames: Record<number, string> = {
    1: 'الفرقة الأولى',
    2: 'الفرقة الثانية',
    3: 'الفرقة الثالثة',
  };

  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  const filteredTrainees = trainees.filter((t) => {
    const matchSearch =
      traineeSearch.trim() === '' ||
      t.full_name.includes(traineeSearch.trim()) ||
      t.username.includes(traineeSearch.trim()) ||
      (t.phone && t.phone.includes(traineeSearch.trim()));

    const matchStatus =
      traineeStatusFilter === 'all' ||
      (traineeStatusFilter === 'active' && t.is_active) ||
      (traineeStatusFilter === 'suspended' && !t.is_active);

    return matchSearch && matchStatus;
  });

  const filteredAttendanceTrainees = trainees.filter((t) => {
    const matchSearch =
      traineeSearch.trim() === '' ||
      t.full_name.includes(traineeSearch.trim()) ||
      t.username.includes(traineeSearch.trim());

    const recStatus = sessionRecords[t.id];
    const matchAttendance =
      attendanceStatusFilter === 'all' ||
      (attendanceStatusFilter === 'PRESENT' && recStatus === 'PRESENT') ||
      (attendanceStatusFilter === 'ABSENT' && recStatus === 'ABSENT') ||
      (attendanceStatusFilter === 'LATE' && recStatus === 'LATE');

    return matchSearch && matchAttendance;
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-[#c29938] selection:text-slate-950 pb-20" dir="rtl">
      {/* Smart Unified Header */}
      <SmartHeader
        profile={profile}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={(id) => setSelectedUnifiedProfileId(id)}
      />

      {/* Global Search Dialog */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenProfile={(id) => setSelectedUnifiedProfileId(id)}
      />

      {/* Unified Profile Modal */}
      <UnifiedProfileModal
        profileId={selectedUnifiedProfileId}
        currentUser={profile}
        onClose={() => setSelectedUnifiedProfileId(null)}
      />

      {/* Group Operational Sub-Header */}
      <div className="sticky top-15 z-30 bg-[#070b14]/95 border-b border-[#c29938]/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isAdminOrSuper && (
              <GroupSelector
                selectedGroupId={groupId}
                onSelectGroup={(newId) => router.push(`/groups/${newId}`)}
              />
            )}

            <div>
              <h1 className="text-base sm:text-lg font-black text-[#c29938] flex items-center gap-2">
                <span>{groupNames[groupId] || 'تفاصيل الفرقة'}</span>
              </h1>
              <span className="text-[11px] text-slate-400">مدرسة الكاروز للكتاب المقدس</span>
            </div>
          </div>

          {/* Quick Metrics Bar on Navbar */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-karooz-gold" />
              <span className="text-slate-300">الطلبة:</span>
              <strong className="text-slate-100">{summary?.trainees_count || trainees.length}</strong>
            </div>
            <div className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300">الخدام:</span>
              <strong className="text-slate-100">{summary?.servants_count || servants.length}</strong>
            </div>
            <div className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-300">السكرتارية:</span>
              <strong className="text-slate-100">{summary?.secretariat_count || secretariat.length}</strong>
            </div>
            <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>نسبة الحضور: {summary?.attendance_rate ?? 100}%</span>
            </div>
          </div>
        </div>

        {/* 8 Operational Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-800/60 pt-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'overview'
                ? 'border-karooz-gold text-karooz-gold bg-karooz-gold/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>نظرة عامة</span>
          </button>
          <button
            onClick={() => setActiveTab('servants')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'servants'
                ? 'border-karooz-gold text-karooz-gold bg-karooz-gold/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>الخدام ({servants.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('secretariat')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'secretariat'
                ? 'border-karooz-gold text-karooz-gold bg-karooz-gold/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>السكرتارية ({secretariat.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('trainees')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'trainees'
                ? 'border-karooz-gold text-karooz-gold bg-karooz-gold/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>الطلبة ({trainees.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'attendance'
                ? 'border-karooz-gold text-karooz-gold bg-karooz-gold/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>تسجيل ومتابعة الحضور</span>
          </button>
          <button
            onClick={() => setActiveTab('curriculum')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'curriculum'
                ? 'border-karooz-gold text-karooz-gold bg-karooz-gold/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>المناهج والمحاضرات</span>
          </button>
          <button
            onClick={() => setActiveTab('marathon')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'marathon'
                ? 'border-karooz-gold text-karooz-gold bg-karooz-gold/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>الماراثون</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'reports'
                ? 'border-karooz-gold text-karooz-gold bg-karooz-gold/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>التقارير</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        {/* Notice Banner */}
        {notice && (
          <div
            className={`px-4 py-3 rounded-xl text-xs flex items-center justify-between border animate-fade-in ${
              notice.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notice.text}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-karooz-gold" />
            <p className="text-sm">جاري تحميل بيانات الفرقة التشغيلية...</p>
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* TAB 1: GROUP OVERVIEW */}
            {/* ========================================================================= */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                {/* 4 Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    onClick={() => setActiveTab('trainees')}
                    className="bg-slate-900/80 border border-slate-800 hover:border-karooz-gold/40 p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">إجمالي الطلبة المقيدين</span>
                      <div className="p-2 rounded-xl bg-karooz-gold/10 text-karooz-gold">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <span className="text-2xl font-black text-slate-100 block mt-2">
                      {summary?.trainees_count || trainees.length} طالب
                    </span>
                    <span className="text-xs text-karooz-gold flex items-center gap-1 mt-2">
                      <span>عرض قائمة الطلبة</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveTab('servants')}
                    className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">الخدام المعينون</span>
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                        <Briefcase className="w-5 h-5" />
                      </div>
                    </div>
                    <span className="text-2xl font-black text-slate-100 block mt-2">
                      {summary?.servants_count || servants.length} خادم
                    </span>
                    <span className="text-xs text-blue-400 flex items-center gap-1 mt-2">
                      <span>عرض الخدام والصلاحيات</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveTab('secretariat')}
                    className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">أعضاء السكرتارية</span>
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                        <Shield className="w-5 h-5" />
                      </div>
                    </div>
                    <span className="text-2xl font-black text-slate-100 block mt-2">
                      {summary?.secretariat_count || secretariat.length} سكرتارية
                    </span>
                    <span className="text-xs text-purple-400 flex items-center gap-1 mt-2">
                      <span>إدارة فريق السكرتارية</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveTab('attendance')}
                    className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">متوسط نسبة الحضور</span>
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <span className="text-2xl font-black text-emerald-300 block mt-2">
                      {summary?.attendance_rate ?? 100}%
                    </span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 mt-2">
                      <span>فتح سجل الحضور</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Latest Session Breakdown Bar */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-karooz-gold" />
                        <span>موقف حضور الجلسة الأخيرة ({summary?.latest_session_date || 'الجمعة الماضية'})</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        رصد تفصيلي لنسب ونسب الطلاب الحاضرين والغائبين والمتأخرين
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab('attendance')}
                      className="px-4 py-1.5 rounded-xl bg-karooz-gold text-slate-950 font-bold text-xs hover:bg-karooz-gold-light transition-colors self-start sm:self-auto"
                    >
                      تسجيل الحضور الآن ←
                    </button>
                  </div>

                  {/* Clickable Actionable Breakdown Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      onClick={() => {
                        setAttendanceStatusFilter('PRESENT');
                        setActiveTab('attendance');
                      }}
                      className="bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs text-emerald-400 font-semibold block">الحاضرون</span>
                        <span className="text-2xl font-bold text-emerald-300 mt-1 block">
                          {summary?.latest_present ?? 0} طالب
                        </span>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-emerald-400/40" />
                    </div>

                    <div
                      onClick={() => {
                        setAttendanceStatusFilter('ABSENT');
                        setActiveTab('attendance');
                      }}
                      className="bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs text-rose-400 font-semibold block">الغياب (يحتاج افتقاد)</span>
                        <span className="text-2xl font-bold text-rose-300 mt-1 block">
                          {summary?.latest_absent ?? 0} طالب
                        </span>
                      </div>
                      <AlertCircle className="w-8 h-8 text-rose-400/40" />
                    </div>

                    <div
                      onClick={() => {
                        setAttendanceStatusFilter('LATE');
                        setActiveTab('attendance');
                      }}
                      className="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs text-amber-400 font-semibold block">المتأخرون</span>
                        <span className="text-2xl font-bold text-amber-300 mt-1 block">
                          {summary?.latest_late ?? 0} طالب
                        </span>
                      </div>
                      <Clock className="w-8 h-8 text-amber-400/40" />
                    </div>
                  </div>
                </div>

                {/* Top Absent Students (Clickable Drilldown) */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>الطلبة الأكثر غياباً (أولوية الافتقاد)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        اضغط على أي طالب لفتح ملفه الأكاديمي، سجل حضوره بالتواريخ، ومعلومات التواصل
                      </p>
                    </div>
                  </div>

                  {summary?.top_absent && summary.top_absent.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {summary.top_absent.map((t: any) => (
                        <div
                          key={t.id}
                          onClick={() => openTraineeDrawer(t.id)}
                          className="bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-karooz-gold/40 rounded-xl p-3.5 cursor-pointer transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 text-karooz-gold flex items-center justify-center font-bold">
                              {t.avatar_url ? (
                                <Image src={t.avatar_url} alt={t.full_name} width={40} height={40} className="rounded-xl object-cover" />
                              ) : (
                                <User className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-sm text-slate-200 block">{t.full_name}</span>
                              <span className="text-xs text-slate-400">{t.phone || 'بدون هاتف'}</span>
                            </div>
                          </div>

                          <div className="text-left">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 block">
                              {t.absent_count} غياب
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 block">نسبة الحضور: {t.attendance_rate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                      لا يوجد حالات غياب متكررة مسجلة في هذه الفرقة.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: SERVANTS LIST & PROFILES */}
            {/* ========================================================================= */}
            {activeTab === 'servants' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#070b14] p-4 rounded-3xl border border-[#c29938]/30">
                  <div>
                    <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-blue-400" />
                      <span>خدام الفرقة والصلاحيات المفوضة</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      اضغط على بطاقة الخادم لعرض ملفه وتعديل صلاحياته المستقلة ونقله بين الفرق
                    </p>
                  </div>

                  {isAdminOrSuper && (
                    <button
                      onClick={openAssignServantModal}
                      className="px-4 py-2 rounded-2xl bg-[#c29938] text-slate-950 font-black text-xs hover:bg-[#c29938]/90 transition-all shadow-md flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة / نقل خادم للفرقة</span>
                    </button>
                  )}
                </div>

                {servants && servants.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {servants.map((s: any) => (
                      <div
                        key={s.id}
                        onClick={() => openServantDrawer(s.id)}
                        className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-karooz-gold/40 rounded-2xl p-5 cursor-pointer transition-all shadow-md flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-karooz-gold shrink-0">
                              {s.avatar_url ? (
                                <Image src={s.avatar_url} alt={s.full_name} width={48} height={48} className="rounded-xl object-cover" />
                              ) : (
                                <User className="w-6 h-6" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-sm text-slate-100">{s.full_name}</h4>
                                {s.is_secretariat && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                    سكرتارية
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 block mt-0.5">@{s.username}</span>
                            </div>
                          </div>

                          {/* Permissions Badges */}
                          <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
                            <span className="text-[11px] text-slate-400 block font-semibold">الصلاحيات المفوضة:</span>
                            <div className="flex flex-wrap gap-1">
                              {s.permissions && s.permissions.length > 0 ? (
                                s.permissions.map((p: string) => (
                                  <span
                                    key={p}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-karooz-gold/10 text-karooz-gold border border-karooz-gold/30"
                                  >
                                    {p === 'MANAGE_LECTURES'
                                      ? 'المحاضرات'
                                      : p === 'MANAGE_CURRICULUM'
                                      ? 'المناهج'
                                      : p === 'MANAGE_MARATHON'
                                      ? 'الماراثون'
                                      : p === 'GRADE_EXAMS'
                                      ? 'الامتحانات'
                                      : 'الكتب'}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-slate-500">لا توجد صلاحيات مفوضة</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-karooz-gold font-bold">
                          <span>عرض وتعديل الملف ←</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded ${
                              s.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                            }`}
                          >
                            {s.is_active ? 'نشط' : 'موقوف'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
                    لا يوجد خدام معينون في هذه الفرقة حالياً.
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: SECRETARIAT LIST */}
            {/* ========================================================================= */}
            {activeTab === 'secretariat' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#070b14] p-4 rounded-3xl border border-purple-500/30">
                  <div>
                    <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-400" />
                      <span>سكرتارية الفرقة المعينون</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                        {secretariat.length} / 3 معينون
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      مسؤولو رصد الحضور، إدارة بيانات الطلاب، ومتابعة الافتقاد (بحد أقصى 3 لكل فرقة)
                    </p>
                  </div>

                  {isAdminOrSuper && (
                    <button
                      onClick={() => {
                        setIsAppointSecOpen(true);
                        setSelectedAppointServantId('');
                      }}
                      disabled={secretariat.length >= 3}
                      className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 self-start sm:self-auto ${
                        secretariat.length >= 3
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>تعيين سكرتارية جديد</span>
                    </button>
                  )}
                </div>

                {secretariat && secretariat.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {secretariat.map((sec: any) => (
                      <div
                        key={sec.id}
                        onClick={() => openServantDrawer(sec.id)}
                        className="bg-slate-900/80 hover:bg-slate-800/90 border border-purple-500/30 hover:border-purple-500/60 rounded-2xl p-5 cursor-pointer transition-all shadow-md flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                              <Shield className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-sm text-slate-100">{sec.full_name}</h4>
                              <span className="text-xs text-slate-400 block mt-0.5">@{sec.username}</span>
                              <span className="text-[11px] text-purple-300 block mt-0.5">{sec.phone || 'بدون هاتف'}</span>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
                            <div className="flex justify-between">
                              <span>تاريخ التعيين:</span>
                              <strong className="text-slate-200">
                                {new Date(sec.appointed_at).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </strong>
                            </div>
                            <div className="flex justify-between">
                              <span>الطلبة المتابعون:</span>
                              <strong className="text-karooz-gold">{sec.group_trainees_count} طالب</strong>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-purple-300 font-bold">
                          <span>عرض الملف الكامل ←</span>
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                            سكرتارية نشطة
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
                    لم يتم تعيين أعضاء سكرتارية لهذه الفرقة حتى الآن.
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: TRAINEES DIRECTORY & PROFILES */}
            {/* ========================================================================= */}
            {activeTab === 'trainees' && (
              <div className="space-y-4 animate-fade-in">
                {/* Search & Filter Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="بحث باسم الطالب، اسم المستخدم، أو الهاتف..."
                      value={traineeSearch}
                      onChange={(e) => setTraineeSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-karooz-gold"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={traineeStatusFilter}
                      onChange={(e) => setTraineeStatusFilter(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-karooz-gold"
                    >
                      <option value="all">جميع الحالات</option>
                      <option value="active">الحسابات النشطة فقط</option>
                      <option value="suspended">الحسابات الموقوفة فقط</option>
                    </select>

                    <span className="text-xs text-slate-400 whitespace-nowrap px-2">
                      {filteredTrainees.length} طالب
                    </span>

                    {canMarkAttendance && (
                      <button
                        onClick={() => setIsCreateTraineeOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-[#c29938] hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>إضافة متدرب للفرقة</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Trainees Grid / Table */}
                {filteredTrainees.length > 0 ? (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800 shadow-xl">
                    {filteredTrainees.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => openTraineeDrawer(t.id)}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-karooz-gold flex items-center justify-center font-bold shrink-0">
                            {t.avatar_url ? (
                              <Image src={t.avatar_url} alt={t.full_name} width={40} height={40} className="rounded-xl object-cover" />
                            ) : (
                              <User className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-100">{t.full_name}</h4>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                                  t.is_active
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                }`}
                              >
                                {t.is_active ? 'نشط' : 'موقوف'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span>@{t.username}</span>
                              {t.phone && (
                                <>
                                  <span>•</span>
                                  <span>{t.phone}</span>
                                </>
                              )}
                              {t.confession_father && (
                                <>
                                  <span>•</span>
                                  <span>أب الاعتراف: {t.confession_father}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                          <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-700">
                            <span>فتح الملف الكامل</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
                    لا توجد نتائج مطابقة لبحثك.
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: ATTENDANCE HUB (CLICKABLE ABSENCE & 1-CLICK MARKING) */}
            {/* ========================================================================= */}
            {activeTab === 'attendance' && (
              <div className="space-y-4 animate-fade-in">
                {/* Session Selector & Breakdown Bar */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-karooz-gold" />
                        <span>رصد وتسجيل الحضور والافتقاد</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        اختر تاريخ الجمعة لرصد درجات الحضور والتأخير والغياب
                      </p>
                    </div>

                    {/* Session Dropdown Selector & Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {sessions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">جلسة:</span>
                          <select
                            value={selectedSessionId}
                            onChange={(e) => handleSessionChange(e.target.value)}
                            className="bg-[#070b14] border border-[#c29938]/40 rounded-xl px-3 py-2 text-xs font-bold text-[#c29938] focus:outline-none focus:border-[#c29938]"
                          >
                            {sessions.map((s) => (
                              <option key={s.id} value={s.id}>
                                {new Date(s.session_date).toLocaleDateString('ar-EG', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}{' '}
                                ({s.status === 'OPEN' ? 'مفتوحة للرصد' : 'مغلقة'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {canMarkAttendance && currentSession && (
                        <button
                          onClick={() => handleToggleSessionStatus(currentSession.id, currentSession.status)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            currentSession.status === 'OPEN'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                          title={currentSession.status === 'OPEN' ? 'قفل الجلسة لمنع التعديل' : 'إعادة فتح الجلسة للرصد'}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{currentSession.status === 'OPEN' ? 'قفل الجلسة' : 'فتح الجلسة'}</span>
                        </button>
                      )}

                      {canMarkAttendance && (
                        <>
                          <button
                            onClick={() => setIsQRScannerOpen(true)}
                            disabled={!selectedSessionId || currentSession?.status === 'LOCKED'}
                            className="px-3.5 py-2 rounded-xl bg-[#c29938] hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-[#c29938] text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>مسح رمز QR</span>
                          </button>

                          <button
                            onClick={() => {
                              setNewSessionDate(new Date().toISOString().split('T')[0]);
                              setIsCreateSessionOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>جلسة جديدة</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Filter Pills: All, Present, Absent, Late */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800 overflow-x-auto">
                    <button
                      onClick={() => setAttendanceStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        attendanceStatusFilter === 'all'
                          ? 'bg-slate-100 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      الكل ({trainees.length})
                    </button>
                    <button
                      onClick={() => setAttendanceStatusFilter('PRESENT')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        attendanceStatusFilter === 'PRESENT'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      }`}
                    >
                      حاضر
                    </button>
                    <button
                      onClick={() => setAttendanceStatusFilter('ABSENT')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        attendanceStatusFilter === 'ABSENT'
                          ? 'bg-rose-500 text-slate-950'
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                      }`}
                    >
                      غائب (الافتقاد)
                    </button>
                    <button
                      onClick={() => setAttendanceStatusFilter('LATE')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        attendanceStatusFilter === 'LATE'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}
                    >
                      متأخر
                    </button>
                  </div>
                </div>

                {/* Trainee Attendance List */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800 shadow-xl">
                  {filteredAttendanceTrainees.map((t) => {
                    const status = sessionRecords[t.id];

                    return (
                      <div
                        key={t.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                      >
                        <div
                          onClick={() => openTraineeDrawer(t.id)}
                          className="flex items-center gap-3 cursor-pointer flex-1"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-karooz-gold flex items-center justify-center font-bold shrink-0">
                            {t.avatar_url ? (
                              <Image src={t.avatar_url} alt={t.full_name} width={40} height={40} className="rounded-xl object-cover" />
                            ) : (
                              <User className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-100 hover:text-karooz-gold transition-colors block">
                              {t.full_name}
                            </span>
                            <span className="text-xs text-slate-400">@{t.username} • {t.phone || 'بدون هاتف'}</span>
                          </div>
                        </div>

                        {/* Status Buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {canMarkAttendance ? (
                            <>
                              <button
                                onClick={() => handleMarkAttendance(t.id, 'PRESENT')}
                                disabled={updatingAttendance || currentSession?.status === 'LOCKED'}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  status === 'PRESENT'
                                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                    : 'bg-slate-800 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-300'
                                }`}
                              >
                                حاضر ✓
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(t.id, 'ABSENT')}
                                disabled={updatingAttendance || currentSession?.status === 'LOCKED'}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  status === 'ABSENT'
                                    ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                                    : 'bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300'
                                }`}
                              >
                                غائب ✕
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(t.id, 'LATE')}
                                disabled={updatingAttendance || currentSession?.status === 'LOCKED'}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  status === 'LATE'
                                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                    : 'bg-slate-800 text-slate-400 hover:bg-amber-500/20 hover:text-amber-300'
                                }`}
                              >
                                متأخر ⏱
                              </button>
                            </>
                          ) : (
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                                status === 'PRESENT'
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                  : status === 'ABSENT'
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                  : status === 'LATE'
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {status === 'PRESENT' ? 'حاضر' : status === 'ABSENT' ? 'غائب' : status === 'LATE' ? 'متأخر' : 'لم يرصد'}
                            </span>
                          )}

                          <button
                            onClick={() => openTraineeDrawer(t.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="فتح الملف الكامل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: CURRICULUM */}
            {/* ========================================================================= */}
            {activeTab === 'curriculum' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-karooz-gold" />
                      <span>مناهج ومحاضرات {groupNames[groupId]}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">المقررات الدراسية وجدول المحاضرات الأسبوعي</p>
                  </div>
                  <Link
                    href="/curriculum"
                    className="px-4 py-2 rounded-xl bg-karooz-gold text-slate-950 font-bold text-xs hover:bg-karooz-gold-light transition-colors"
                  >
                    الانتقال للمقررات كاملة ←
                  </Link>
                </div>

                {curriculums.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {curriculums.map((c) => (
                      <div key={c.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-base text-slate-100">{c.title}</h4>
                          <span className="text-xs text-karooz-gold font-bold">{c.lectures?.length || 0} محاضرات</span>
                        </div>
                        <p className="text-xs text-slate-400">{c.description || 'مقرر دراسي معتمد'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
                    لم يتم إدراج مقررات خاصة بهذه الفرقة بعد.
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: MARATHON */}
            {/* ========================================================================= */}
            {activeTab === 'marathon' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-karooz-gold" />
                      <span>ماراثون {groupNames[groupId]} الإلكتروني</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">المسابقات الأسبوعية وتوزيع الـ 100 درجة</p>
                  </div>
                  <Link
                    href="/marathon"
                    className="px-4 py-2 rounded-xl bg-karooz-gold text-slate-950 font-bold text-xs hover:bg-karooz-gold-light transition-colors"
                  >
                    الانتقال للماراثون ←
                  </Link>
                </div>

                {marathons.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {marathons.map((m) => (
                      <div key={m.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-base text-slate-100">{m.title}</h4>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-karooz-gold/10 text-karooz-gold border border-karooz-gold/30">
                            {m.status === 'PUBLISHED' ? 'نشط' : 'مسودة'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{m.description || 'ماراثون دراسي وتفاعلي'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
                    لا يوجد ماراثون منشور لهذه الفرقة حالياً.
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 8: REPORTS */}
            {/* ========================================================================= */}
            {activeTab === 'reports' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-karooz-gold" />
                    <span>تقارير وبيانات {groupNames[groupId]}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    تقارير الحضور الأسبوعي، إحصائيات الغياب المتكرر، وموقف تسليم الماراثونات
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="text-sm font-bold text-slate-200 block">تقرير الحضور والغياب العام</span>
                      <p className="text-xs text-slate-400">متوسط حضور الفرقة: {summary?.attendance_rate ?? 100}%</p>
                      <span className="text-xs text-karooz-gold font-bold block mt-2">متاح للطباعة والأرشفة</span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="text-sm font-bold text-slate-200 block">كشف السكرتارية والافتقاد</span>
                      <p className="text-xs text-slate-400">إجمالي الطلبة الخاضعين للمتابعة: {trainees.length} طالب</p>
                      <span className="text-xs text-karooz-gold font-bold block mt-2">تحديث تلقائي فوري</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal 1: Create Attendance Session */}
      {isCreateSessionOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#070b14] border border-[#c29938]/40 rounded-3xl p-6 space-y-5 shadow-2xl shadow-black">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#c29938]" />
                <span>إنشاء جلسة حضور جديدة</span>
              </h3>
              <button
                onClick={() => setIsCreateSessionOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">تاريخ الجلسة</label>
                <input
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="w-full bg-[#0e1626] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">حالة الجلسة الابتدائية</label>
                <select
                  value={newSessionStatus}
                  onChange={(e) => setNewSessionStatus(e.target.value as any)}
                  className="w-full bg-[#0e1626] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
                >
                  <option value="OPEN">مفتوحة للرصد المباشر</option>
                  <option value="LOCKED">مغلقة ومؤرشفة</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsCreateSessionOpen(false)}
                disabled={creatingSession}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateSession}
                disabled={creatingSession || !newSessionDate}
                className="px-5 py-2 rounded-xl bg-[#c29938] text-slate-950 font-black text-xs hover:bg-[#c29938]/90 transition-all flex items-center gap-1.5 shadow-md"
              >
                {creatingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>إنشاء وتفعيل الجلسة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Appoint Secretariat */}
      {isAppointSecOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#070b14] border border-purple-500/40 rounded-3xl p-6 space-y-5 shadow-2xl shadow-black">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <span>تعيين عضو سكرتارية للفرقة</span>
              </h3>
              <button
                onClick={() => setIsAppointSecOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                اختر أحد خدام الفرقة الحاليين لتعيينه ضمن فريق السكرتارية (الحد الأقصى 3 أعضاء):
              </p>

              {servants.filter((s: any) => !s.is_secretariat).length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {servants
                    .filter((s: any) => !s.is_secretariat)
                    .map((s: any) => (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                          selectedAppointServantId === s.id
                            ? 'bg-purple-500/15 border-purple-500 text-slate-100'
                            : 'bg-[#0e1626] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="sec_servant"
                            checked={selectedAppointServantId === s.id}
                            onChange={() => setSelectedAppointServantId(s.id)}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <div>
                            <span className="font-bold text-sm block">{s.full_name}</span>
                            <span className="text-xs text-slate-400">@{s.username}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-[#0e1626] rounded-2xl border border-slate-800">
                  جميع خدام هذه الفرقة معينون بالفعل في السكرتارية أو لا يوجد خدام مسجلون.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsAppointSecOpen(false)}
                disabled={appointingSec}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleAppointSecretariat}
                disabled={appointingSec || !selectedAppointServantId}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {appointingSec ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                <span>اعتماد التعيين</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Assign / Transfer Servant to Group */}
      {isAssignServantOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#070b14] border border-[#c29938]/40 rounded-3xl p-6 space-y-5 shadow-2xl shadow-black">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-400" />
                <span>إضافة أو نقل خادم إلى {groupNames[groupId]}</span>
              </h3>
              <button
                onClick={() => setIsAssignServantOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                اختر الخادم المراد نقله أو إضافته إلى هذه الفرقة الدراسية:
              </p>

              {availableServants.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {availableServants.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                        selectedAssignServantId === s.id
                          ? 'bg-[#c29938]/15 border-[#c29938] text-slate-100'
                          : 'bg-[#0e1626] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="assign_servant"
                          checked={selectedAssignServantId === s.id}
                          onChange={() => setSelectedAssignServantId(s.id)}
                          className="text-[#c29938] focus:ring-[#c29938]"
                        />
                        <div>
                          <span className="font-bold text-sm block">{s.full_name}</span>
                          <span className="text-xs text-slate-400">
                            الفرقة الحالية: {groupNames[s.group_id] || 'غير محددة'}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-[#0e1626] rounded-2xl border border-slate-800">
                  لا يوجد خدام مسجلون في فرق أخرى حالياً.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsAssignServantOpen(false)}
                disabled={assigningServant}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleAssignServant}
                disabled={assigningServant || !selectedAssignServantId}
                className="px-5 py-2 rounded-xl bg-[#c29938] text-slate-950 font-black text-xs hover:bg-[#c29938]/90 transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {assigningServant ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>نقل الخادم للفرقة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trainee Interactive Drawer */}
      <TraineeProfileDrawer
        traineeId={selectedTraineeId}
        isOpen={isTraineeDrawerOpen}
        onClose={() => setIsTraineeDrawerOpen(false)}
        currentUserProfile={profile}
        onProfileUpdated={() => loadGroupData(groupId, profile!)}
      />

      {/* Servant Interactive Drawer */}
      <ServantProfileDrawer
        servantId={selectedServantId}
        isOpen={isServantDrawerOpen}
        onClose={() => setIsServantDrawerOpen(false)}
        currentUserProfile={profile}
        onProfileUpdated={() => loadGroupData(groupId, profile!)}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        groupId={groupId}
        sessionId={selectedSessionId}
        sessionStatus={sessions.find((s) => s.id === selectedSessionId)?.status || 'OPEN'}
        sessionDate={sessions.find((s) => s.id === selectedSessionId)?.session_date}
        trainees={trainees}
        onRecordAttendance={async (traineeId, status) => {
          try {
            await handleMarkAttendance(traineeId, status, 'QR');
            return { success: true, message: '' };
          } catch (err: any) {
            return { success: false, message: err?.message || 'فشل في حفظ الحضور.' };
          }
        }}
      />

      {/* Create Trainee Modal */}
      <CreateTraineeModal
        isOpen={isCreateTraineeOpen}
        onClose={() => setIsCreateTraineeOpen(false)}
        currentUser={profile}
        defaultGroupId={groupId}
        onTraineeCreated={() => {
          if (profile) loadGroupData(groupId, profile);
        }}
      />

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedUnifiedProfileId(id)}
      />
    </div>
  );
}
