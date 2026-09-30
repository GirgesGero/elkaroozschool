'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Bell,
  HeartHandshake,
  Cake,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Save,
  Send,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

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

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [newVerseText, setNewVerseText] = useState('');
  const [newVerseRef, setNewVerseRef] = useState('');
  const [editingVerse, setEditingVerse] = useState<DailyVerseItem | null>(null);

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('role_id')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'super_user'].includes(profile.role_id)) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      setCanEditPastoral(profile.role_id === 'admin');

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
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل حفظ القالب' });
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
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل حفظ القالب' });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleAddVerse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVerseText || !newVerseRef) return;

    try {
      const { data, error } = await supabase
        .from('daily_verses')
        .insert({
          verse_text: newVerseText,
          reference: newVerseRef,
          display_order: verses.length + 1
        })
        .select()
        .single();

      if (error) throw error;

      setStatusMsg({ type: 'success', text: 'تمت إضافة الآية إلى بنك الآيات اليومية بنجاح' });
      setNewVerseText('');
      setNewVerseRef('');
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل إضافة الآية' });
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
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل حذف الآية' });
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

      if (data.success) {
        setStatusMsg({
          type: 'success',
          text: `تم توزيع آية اليوم (${data.reference}) بنجاح على ${data.recipients_count} مستخدم!`
        });
        fetchData();
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'تعذر إرسال الآية' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل إرسال الآية' });
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
        text: `تم فحص أعياد الميلاد وإرسال ${data.total_notifications} إشعار بنجاح!`
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل إرسال إشعارات أعياد الميلاد' });
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-amber-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="font-bold">جاري تحميل لوحة إدارة الإشعارات...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-red-500/30 p-8 rounded-2xl max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">غير مصرح بالوصول</h2>
          <p className="text-slate-400 mb-6 text-sm">
            لوحة إدارة الإشعارات والآيات محصورة حصراً على مسؤولي النظام (Admin / Super User).
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-medium transition"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Bell className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">إدارة الإشعارات والآيات اليومية</h1>
            </div>
            <p className="text-slate-400 text-sm">
              تخصيص قوالب رسائل الافتقاد وأعياد الميلاد وإدارة بنك الآيات وجدولة الإرسال.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
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
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/40 border-red-500/40 text-red-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{statusMsg.text}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
              activeTab === 'TEMPLATES'
                ? 'bg-amber-500/10 border border-amber-500 text-amber-300'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            قوالب الافتقاد وأعياد الميلاد
          </button>

          <button
            onClick={() => setActiveTab('DAILY_VERSES')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
              activeTab === 'DAILY_VERSES'
                ? 'bg-amber-500/10 border border-amber-500 text-amber-300'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            بنك الآيات اليومية ({verses.length})
          </button>

          <button
            onClick={() => setActiveTab('DISPATCH')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
              activeTab === 'DISPATCH'
                ? 'bg-amber-500/10 border border-amber-500 text-amber-300'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HeartHandshake className="w-5 h-5 text-rose-400" />
                  <h3 className="text-lg font-bold text-white">قالب رسالة الافتقاد الفوري (عند تسجيل الغياب)</h3>
                </div>
                {canEditPastoral ? (
                  <button
                    type="button"
                    onClick={() => setPastoralMsg((prev) => prev + ' {{student_name}} ')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    إدراج اسم المتدرب {'{{student_name}}'}
                  </button>
                ) : null}
              </div>

              <textarea
                rows={3}
                value={pastoralMsg}
                onChange={(e) => setPastoralMsg(e.target.value)}
                readOnly={!canEditPastoral}
                className={`w-full bg-slate-950 border rounded-xl p-4 text-white text-sm focus:outline-none ${
                  canEditPastoral ? 'border-slate-700 focus:border-rose-500' : 'border-slate-800 opacity-70'
                }`}
              />

              <div className="flex justify-end">
                <button
                  onClick={handleSavePastoralTemplate}
                  disabled={savingTemplate || !canEditPastoral}
                  className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-rose-900/30 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  حفظ قالب الافتقاد
                </button>
              </div>

              {!canEditPastoral && (
                <p className="text-xs text-slate-400 text-left">
                  تعديل قالب رسالة الافتقاد متاح للمسؤول فقط.
                </p>
              )}
            </div>

            {/* Birthday Template */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cake className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">قالب رسالة التهنئة بأعياد الميلاد السنوية</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBirthdayMsg((prev) => prev + ' {{student_name}} ')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  إدراج اسم المتدرب {'{{student_name}}'}
                </button>
              </div>

              <textarea
                rows={3}
                value={birthdayMsg}
                onChange={(e) => setBirthdayMsg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-amber-500"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleSaveBirthdayTemplate}
                  disabled={savingTemplate}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-amber-900/30 disabled:opacity-50"
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
            {/* Add Verse Form */}
            <form onSubmit={handleAddVerse} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">إضافة آية جديدة لبنك الآيات</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">نص الآية *</label>
                  <input
                    type="text"
                    required
                    placeholder="اكتب نص الآية المشكول أو الواضح..."
                    value={newVerseText}
                    onChange={(e) => setNewVerseText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">الشاهد (مثال: يوحنا 3: 16) *</label>
                  <input
                    type="text"
                    required
                    placeholder="الشاهد الكتابي..."
                    value={newVerseRef}
                    onChange={(e) => setNewVerseRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-900/30"
                >
                  <Plus className="w-4 h-4" />
                  إضافة الآية
                </button>
              </div>
            </form>

            {/* Verses Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4">قائمة الآيات المسجلة للتدوير</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-medium">
                      <th className="pb-3 pr-4">الترتيب</th>
                      <th className="pb-3">الشاهد</th>
                      <th className="pb-3">نص الآية</th>
                      <th className="pb-3">الحالة في الدورة</th>
                      <th className="pb-3 pl-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {verses.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 pr-4 font-mono text-xs text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 font-bold text-amber-300 text-xs">{v.reference}</td>
                        <td className="py-3.5 text-slate-200 text-xs max-w-md truncate">{v.verse_text}</td>
                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              v.is_sent
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                : 'bg-slate-800 border border-slate-700 text-slate-400'
                            }`}
                          >
                            {v.is_sent ? 'تم الإرسال' : 'في الانتظار'}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-center">
                          <button
                            onClick={() => handleDeleteVerse(v.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition"
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">إرسال وتوزيع آية اليوم الآن</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                يقوم النظام باختيار الآية التالية وفق دورة التدوير وإرسالها فورياً لجميع مستخدمي المنصة كإشعار In-App و Web Push.
              </p>
              <button
                onClick={handleManualDispatchVerse}
                disabled={dispatching}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                توزيع آية اليوم لكافة المستخدمين
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <Cake className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">فحص وإرسال تهاني أعياد الميلاد</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                يقوم بفحص سجلات تاريخ الميلاد لليوم وإرسال التهنئة الشخصية لصاحب العيد وتنبيه مجتمع المدرسة.
              </p>
              <button
                onClick={handleManualBirthdayTrigger}
                disabled={dispatching}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-amber-900/30 disabled:opacity-50"
              >
                <Cake className="w-4 h-4" />
                تشغيل فحص أعياد الميلاد اليوم
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
