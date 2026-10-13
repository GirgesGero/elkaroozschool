'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { explainDbError, dbWrite } from '@/lib/errors/db';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import {
  Bell,
  HeartHandshake,
  Cake,
  BookOpen,
  Trash2,
  Edit2,
  Save,
  Send,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface TemplateItem {
  id: string;
  template_key: string;
  template_body: string;
}

interface DailyVerseItem {
  id: string;
  verse_text: string;
  reference: string;
  display_order: number;
  is_sent: boolean;
  last_sent_date?: string;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  // SRS 8.1: the pastoral (absence) template is admin-only. SRS 8.2 keeps
  // birthday at admin + super_user. The DB enforces this per row; this flag
  // exists so the UI does not offer a control the server will refuse.
  const [canEditPastoral, setCanEditPastoral] = useState(false);
  const [activeTab, setActiveTab] = useState<'TEMPLATES' | 'DAILY_VERSES' | 'DISPATCH'>('TEMPLATES');

  // Templates
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [pastoralMsg, setPastoralMsg] = useState('');
  const [birthdayMsg, setBirthdayMsg] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Daily Verses
  const [verses, setVerses] = useState<DailyVerseItem[]>([]);
  
  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!userProfile || !['admin', 'super_user'].includes(userProfile.role_id)) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setProfile(userProfile as Profile);
      setIsAdmin(true);
      setCanEditPastoral(['admin', 'super_user'].includes(userProfile.role_id));

      // 1. Fetch Templates
      const { data: tmpls } = await supabase.from('notification_templates').select('*');
      if (tmpls) {
        setTemplates(tmpls);
        const p = tmpls.find((t) => t.template_key === 'PASTORAL');
        const b = tmpls.find((t) => t.template_key === 'BIRTHDAY');
        if (p) setPastoralMsg(p.template_body);
        if (b) setBirthdayMsg(b.template_body);
      }

      // 2. Fetch Daily Verses
      const { data: vrs } = await supabase
        .from('daily_verses')
        .select('*')
        .is('deleted_at', null)
        .order('display_order', { ascending: true });
      if (vrs) setVerses(vrs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePastoralTemplate = async () => {
    // Defence in depth: the RLS policy already blocks non-admins, but fail
    // closed in the client too so the UI never claims a save the server drops.
    if (!canEditPastoral) {
      setStatusMsg({ type: 'error', text: 'تعديل قالب رسالة الافتقاد متاح للمسؤول فقط' });
      return;
    }
    setSavingTemplate(true);
    setStatusMsg(null);
    try {
      const { error } = await supabase
        .from('notification_templates')
        .upsert({ template_key: 'PASTORAL', template_body: pastoralMsg }, { onConflict: 'template_key' });
      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'تم حفظ وتحديث قالب رسالة الافتقاد بنجاح' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: explainDbError(err) });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSaveBirthdayTemplate = async () => {
    setSavingTemplate(true);
    setStatusMsg(null);
    try {
      const { error } = await supabase
        .from('notification_templates')
        .upsert({ template_key: 'BIRTHDAY', template_body: birthdayMsg }, { onConflict: 'template_key' });
      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'تم حفظ وتحديث قالب رسالة عيد الميلاد بنجاح' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: explainDbError(err) });
    } finally {
      setSavingTemplate(false);
    }
  };


  const handleDeleteVerse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('daily_verses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      setStatusMsg({ type: 'success', text: 'تم حذف الآية بنجاح' });
      fetchData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: explainDbError(err) });
    }
  };

  const handleManualDispatchVerse = async () => {
    setDispatching(true);
    setStatusMsg(null);
    try {
      const { data, error } = await supabase.rpc('dispatch_daily_verse_notification', {
        p_force_send: true,
        p_mode: 'SEQUENTIAL'
      });
      if (error) throw error;

      if (data?.success) {
        setStatusMsg({
          type: 'success',
          text: `تم توزيع آية اليوم (${data.reference}) بنجاح على ${data.recipients_count} مستخدم!`
        });
        fetchData();
      } else {
        setStatusMsg({ type: 'error', text: data?.message || 'تعذر إرسال الآية' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: explainDbError(err) });
    } finally {
      setDispatching(false);
    }
  };

  const handleManualBirthdayTrigger = async () => {
    setDispatching(true);
    setStatusMsg(null);
    try {
      const { data, error } = await supabase.rpc('trigger_birthday_notifications');
      if (error) throw error;

      setStatusMsg({
        type: 'success',
        text: `تم فحص أعياد الميلاد وإرسال ${data?.total_notifications ?? 0} إشعار بنجاح!`
      });
    } catch (err) {
      setStatusMsg({ type: 'error', text: explainDbError(err) });
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-nav flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-warning">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="font-bold">جاري تحميل لوحة إدارة الإشعارات...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-nav flex items-center justify-center p-4">
        <div className="bg-nav border border-danger/30 p-8 rounded-2xl max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold text-content mb-2">غير مصرح بالوصول</h2>
          <p className="text-content-muted mb-6 text-sm">
            لوحة إدارة الإشعارات والآيات محصورة حصراً على مسؤولي النظام (Admin / Super User).
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-warning hover:bg-warning text-content px-6 py-2.5 rounded-xl font-medium transition"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-content flex flex-col selection:bg-gold selection:text-content font-sans" dir="rtl">
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

      <div className="max-w-5xl w-full mx-auto p-4 md:p-6 flex-1 space-y-8 pb-28 md:pb-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-warning/10 border border-warning/30 rounded-xl text-warning">
                <Bell className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-content">إدارة الإشعارات والآيات اليومية</h1>
            </div>
            <p className="text-content-muted text-sm">
              تخصيص قوالب رسائل الافتقاد وأعياد الميلاد وإدارة بنك الآيات وجدولة الإرسال.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 bg-nav hover:bg-input border border-line text-content px-4 py-2.5 rounded-xl text-sm font-medium transition"
            >
              <ArrowRight className="w-4 h-4" />
              الرئيسية
            </Link>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 ${
              statusMsg.type === 'success'
                ? 'bg-canvas/40 border-success/40 text-success'
                : 'bg-canvas/40 border-danger/40 text-danger'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{statusMsg.text}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-line pb-2">
          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
              activeTab === 'TEMPLATES'
                ? 'bg-warning/10 border border-warning text-warning'
                : 'bg-nav border border-line text-content-muted hover:text-content'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            قوالب الافتقاد وأعياد الميلاد
          </button>

          <button
            onClick={() => setActiveTab('DAILY_VERSES')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
              activeTab === 'DAILY_VERSES'
                ? 'bg-warning/10 border border-warning text-warning'
                : 'bg-nav border border-line text-content-muted hover:text-content'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            بنك الآيات اليومية ({verses.length})
          </button>

          <button
            onClick={() => setActiveTab('DISPATCH')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
              activeTab === 'DISPATCH'
                ? 'bg-warning/10 border border-warning text-warning'
                : 'bg-nav border border-line text-content-muted hover:text-content'
            }`}
          >
            <Send className="w-4 h-4" />
            التوزيع والإرسال الفوري
          </button>
        </div>

        {/* Tab 1: Templates */}
        {activeTab === 'TEMPLATES' && (
          <div className="space-y-6">
            {/* Pastoral / Absence Template — admin only (SRS 8.1) */}
            <div className="bg-nav border border-line rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HeartHandshake className="w-5 h-5 text-danger" />
                  <h3 className="text-lg font-bold text-content">قالب رسالة الافتقاد الفوري (عند تسجيل الغياب)</h3>
                </div>
                {canEditPastoral ? (
                  <button
                    type="button"
                    onClick={() => setPastoralMsg((prev) => prev + ' {{student_name}} ')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 rounded-lg text-xs font-semibold transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-danger" />
                    إدراج اسم المتدرب {'{{student_name}}'}
                  </button>
                ) : null}
              </div>

              <textarea
                rows={3}
                value={pastoralMsg}
                onChange={(e) => setPastoralMsg(e.target.value)}
                readOnly={!canEditPastoral}
                className={`w-full bg-nav border rounded-xl p-4 text-content text-sm focus:outline-none ${
                  canEditPastoral ? 'border-line focus:border-danger' : 'border-line opacity-70'
                }`}
              />

              <div className="flex justify-end">
                <button
                  onClick={handleSavePastoralTemplate}
                  disabled={savingTemplate || !canEditPastoral}
                  className="flex items-center gap-2 px-6 py-2.5 bg-danger hover:bg-danger text-content rounded-xl text-sm font-bold transition shadow-lg shadow-rose-900/30 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  حفظ قالب الافتقاد
                </button>
              </div>

              {!canEditPastoral && (
                <p className="text-xs text-content-muted text-left">
                  تعديل قالب رسالة الافتقاد متاح للمسؤول فقط.
                </p>
              )}
            </div>

            {/* Birthday Template */}
            <div className="bg-nav border border-line rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cake className="w-5 h-5 text-warning" />
                  <h3 className="text-lg font-bold text-content">قالب رسالة التهنئة بأعياد الميلاد السنوية</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBirthdayMsg((prev) => prev + ' {{student_name}} ')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 hover:bg-warning/20 text-warning border border-warning/30 rounded-lg text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-warning" />
                  إدراج اسم المتدرب {'{{student_name}}'}
                </button>
              </div>

              <textarea
                rows={3}
                value={birthdayMsg}
                onChange={(e) => setBirthdayMsg(e.target.value)}
                className="w-full bg-nav border border-line rounded-xl p-4 text-content text-sm focus:outline-none focus:border-warning"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleSaveBirthdayTemplate}
                  disabled={savingTemplate}
                  className="flex items-center gap-2 px-6 py-2.5 bg-warning hover:bg-warning text-content rounded-xl text-sm font-bold transition shadow-lg shadow-amber-900/30 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  حفظ قالب عيد الميلاد
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Daily Verses */}
        {activeTab === 'DAILY_VERSES' && (
          <div className="space-y-6">
            {/* The verse bank is read-only by design: the database grants SELECT only, so an
                add form here could never succeed — it would just fail at the RLS layer. */}
            <div className="bg-nav border border-line rounded-2xl p-6 shadow-xl">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-content">بنك الآيات اليومية — للقراءة فقط</h3>
                  <p className="text-sm text-content-muted mt-1.5 leading-relaxed">
                    بنك الآيات اليومية للعرض والتوزيع فقط. إضافة أو تعديل الآيات يتم من
                    لوحة تحكم الخادم (Server Dashboard) أو عبر migration رسمية.
                  </p>
                </div>
              </div>
            </div>

            {/* Verses Table */}
            <div className="bg-nav border border-line rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-content mb-4">قائمة الآيات المسجلة للتدوير</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-line text-content-muted font-medium">
                      <th className="pb-3 pr-4">الترتيب</th>
                      <th className="pb-3">الشاهد</th>
                      <th className="pb-3">نص الآية</th>
                      <th className="pb-3">الحالة في الدورة</th>
                      <th className="pb-3 pl-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle/60">
                    {verses.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-nav/40 transition">
                        <td className="py-3.5 pr-4 font-mono text-xs text-content-muted">{idx + 1}</td>
                        <td className="py-3.5 font-bold text-warning text-xs">{v.reference}</td>
                        <td className="py-3.5 text-content text-xs max-w-md truncate">{v.verse_text}</td>
                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              v.is_sent
                                ? 'bg-success/10 border border-success/30 text-success'
                                : 'bg-nav border border-line text-content-muted'
                            }`}
                          >
                            {v.is_sent ? 'تم الإرسال' : 'في الانتظار'}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-center">
                          <button
                            onClick={() => handleDeleteVerse(v.id)}
                            className="p-1.5 bg-danger/10 hover:bg-danger/20 text-danger rounded-lg border border-danger/30 transition"
                            title="حذف الآية"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Dispatch */}
        {activeTab === 'DISPATCH' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-nav border border-line rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-success" />
                <h3 className="text-base font-bold text-content">إرسال وتوزيع آية اليوم الآن</h3>
              </div>
              <p className="text-xs text-content-muted leading-relaxed">
                يقوم النظام باختيار الآية التالية وفق دورة التدوير وإرسالها فورياً لجميع مستخدمي المنصة كإشعار In-App و Web Push.
              </p>
              <button
                onClick={handleManualDispatchVerse}
                disabled={dispatching}
                className="w-full flex items-center justify-center gap-2 py-3 bg-success hover:bg-success text-content rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                توزيع آية اليوم لكافة المستخدمين
              </button>
            </div>

            <div className="bg-nav border border-line rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <Cake className="w-5 h-5 text-warning" />
                <h3 className="text-base font-bold text-content">فحص وإرسال تهاني أعياد الميلاد</h3>
              </div>
              <p className="text-xs text-content-muted leading-relaxed">
                يقوم بفحص سجلات تاريخ الميلاد لليوم وإرسال التهنئة الشخصية لصاحب العيد وتنبيه مجتمع المدرسة.
              </p>
              <button
                onClick={handleManualBirthdayTrigger}
                disabled={dispatching}
                className="w-full flex items-center justify-center gap-2 py-3 bg-warning hover:bg-warning text-content rounded-xl text-sm font-bold transition shadow-lg shadow-amber-900/30 disabled:opacity-50"
              >
                <Cake className="w-4 h-4" />
                تشغيل فحص أعياد الميلاد اليوم
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
