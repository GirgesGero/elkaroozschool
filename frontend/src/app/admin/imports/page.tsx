'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { explainDbError } from '@/lib/errors/db';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  Database,
  Users,
  Eye,
  History,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface ImportRecord {
  id: string;
  filename: string;
  total_rows: number;
  new_accounts_count: number;
  updated_accounts_count: number;
  status: string;
  created_at: string;
}

export default function AdminImportsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);

  // CSV/Excel upload states
  const [csvText, setCsvText] = useState('');
  const [filename, setFilename] = useState('trainees_batch_01.csv');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewStats, setPreviewStats] = useState<{
    total: number;
    newCount: number;
    updatedCount: number;
    errors: { row: number; error: string }[];
  } | null>(null);

  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setImportHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleParseCsv = (content: string) => {
    setCsvText(content);
    setStatusMsg(null);
    try {
      const lines = content.trim().split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setParsedRows([]);
        setPreviewStats(null);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const rows: any[] = [];
      const errors: { row: number; error: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });

        // Validation
        if (!rowObj.username || rowObj.username.length < 3) {
          errors.push({ row: i, error: 'اسم المستخدم غير صالح أو مفقود (3 أحرف على الأقل)' });
        }
        if (!rowObj.full_name) {
          errors.push({ row: i, error: 'الاسم بالكامل مطلوب' });
        }

        rows.push(rowObj);
      }

      setParsedRows(rows);
      setPreviewStats({
        total: rows.length,
        newCount: rows.length,
        updatedCount: 0,
        errors
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'فشل معالجة صيغة CSV: ' + err.message });
    }
  };

  const handleExecuteImport = async (isDryRun: boolean) => {
    if (parsedRows.length === 0) return;
    if (previewStats && previewStats.errors.length > 0 && !isDryRun) {
      setStatusMsg({
        type: 'error',
        text: 'لا يمكن إتمام الاستيراد لوجود أخطاء في البيانات (قاعدة All-or-Nothing)'
      });
      return;
    }

    setProcessing(true);
    setStatusMsg(null);

    try {
      const { data, error } = await supabase.rpc('import_trainees_bulk_atomic', {
        p_batch_json: parsedRows,
        p_filename: filename,
        p_file_storage_path: `imports/${filename}`,
        p_dry_run: isDryRun
      });

      if (error) throw error;

      if (data.success) {
        setStatusMsg({
          type: 'success',
          text: isDryRun
            ? `تمت المعاينة بنجاح: ${data.total_rows} سجل جاهز للاستيراد`
            : `تم استيراد ${data.new_accounts} حساب جديد وتحديث ${data.updated_accounts} حساب بنجاح!`
        });
        if (!isDryRun) {
          setParsedRows([]);
          setCsvText('');
          setPreviewStats(null);
          fetchData();
        }
      } else {
        setStatusMsg({
          type: 'error',
          text: 'فشل الاستيراد لوجود أخطاء في التحقق (All-or-Nothing)'
        });
        if (data.errors && data.errors.length > 0) {
          setPreviewStats((prev) => prev ? { ...prev, errors: data.errors } : null);
        }
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل تنفيذ عملية الاستيراد' });
    } finally {
      setProcessing(false);
    }
  };

  const handleExportTrainees = async (format: 'csv') => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, role_id, phone, father_name, birth_date, is_active')
        .eq('role_id', 'trainee')
        .order('full_name');

      if (error) throw error;

      if (!data || data.length === 0) {
        setStatusMsg({ type: 'error', text: 'لا توجد بيانات متدربين للتصدير' });
        return;
      }

      // Convert to CSV
      const headers = ['username', 'full_name', 'phone', 'father_name', 'birth_date', 'status'];
      const csvRows = [headers.join(',')];

      data.forEach((p) => {
        csvRows.push(
          [
            p.username,
            `"${p.full_name}"`,
            p.phone || '',
            `"${p.father_name || ''}"`,
            p.birth_date || '',
            p.is_active ? 'نشط' : 'موقوف'
          ].join(',')
        );
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `trainees_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Audit export
      await supabase.rpc('log_operational_event', {
        p_operation: 'EXPORT_TRAINEES_' + format.toUpperCase(),
        p_entity_type: 'profiles',
        p_entity_id: 'export_all',
        p_status: 'SUCCESS',
        p_details: { rows_count: data.length, format }
      });
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: explainDbError(err) });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-amber-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="font-bold">جاري تحميل لوحة الاستيراد...</span>
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
            لوحة الاستيراد الجماعي محصورة على مسؤولي النظام (Admin / Super User).
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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-[#c29938] selection:text-slate-950 pb-20 font-sans" dir="rtl">
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

      <div className="max-w-6xl w-full mx-auto p-4 md:p-6 flex-1 space-y-8 pb-28 md:pb-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">استيراد وتصدير بيانات المتدربين الجماعي</h1>
            </div>
            <p className="text-slate-400 text-sm">
              استيراد حسابات الطلاب دفعة واحدة بقاعدة (All-or-Nothing) الآمنة وتصدير الكشوفات المعتمدة.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/backups"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
            >
              <Database className="w-4 h-4 text-amber-400" />
              النسخ الاحتياطي المشفر
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
            >
              <ArrowRight className="w-4 h-4" />
              الرئيسية
            </Link>
          </div>
        </div>

        {/* Status Notification */}
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

        {/* Quick Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white mb-1">تصدير سجلات المتدربين (CSV)</h3>
              <p className="text-xs text-slate-400">تصدير فوري لكافة المتدربين حسب الصلاحية والنطاق</p>
            </div>
            <button
              onClick={() => handleExportTrainees('csv')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              <Download className="w-4 h-4 text-amber-400" />
              تحميل CSV
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between opacity-70">
            <div>
              <h3 className="font-bold text-slate-300 mb-1">تصدير سجلات المتدربين (Excel / XLSX)</h3>
              <p className="text-xs text-slate-500">
                غير متاح حالياً — التصدير بصيغة CSV فقط. لن نُنزّل ملف CSV باسم xlsx.
              </p>
            </div>
            <button
              disabled
              className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 text-slate-500 px-4 py-2 rounded-xl text-xs font-semibold cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              غير متاح
            </button>
          </div>
        </div>

        {/* Bulk Import Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">استيراد حسابات الطلاب (CSV / Excel)</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                const sample = `username,full_name,phone,father_name,group_name,birth_date,password\nmina_gerges,مينا جرجس صليب,01234567890,أبونا جرجس,الفرقة الأولى,2005-01-15,Trainee123!\nkareem_morcos,كريم مرقص حنا,01122334455,أبونا مرقص,الفرقة الأولى,2004-06-20,Trainee123!`;
                handleParseCsv(sample);
              }}
              className="text-xs text-amber-400 hover:underline"
            >
              تحميل نموذج تجريبي (Sample CSV)
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                الصق محتوى ملف الـ CSV أو اكتب السطور بالترتيب: (username,full_name,phone,father_name,group_name,birth_date,password)
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => handleParseCsv(e.target.value)}
                placeholder="username,full_name,phone,father_name,group_name,birth_date,password&#10;peter_samir,بيتر سمير زكي,01011223344,أبونا يوسف,الفرقة الأولى,2005-02-10,Trainee123!"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Validation & Preview Stats */}
            {previewStats && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200">معاينة دفعة الاستيراد:</span>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">الإجمالي: <strong className="text-white">{previewStats.total}</strong></span>
                    <span className="text-emerald-400">حسابات جديدة: <strong>{previewStats.newCount}</strong></span>
                    <span className="text-blue-400">تحديث حسابات: <strong>{previewStats.updatedCount}</strong></span>
                  </div>
                </div>

                {previewStats.errors.length > 0 ? (
                  <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-red-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      تم اكتشاف {previewStats.errors.length} خطأ في البيانات (الاستيراد معطل حتى التصحيح - All-or-Nothing):
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-xs text-red-200">
                      {previewStats.errors.map((err, idx) => (
                        <li key={idx}>السطر {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    كافة السطور مطابقة للشروط وجاهزة للاستيراد الذري.
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={processing || parsedRows.length === 0}
                onClick={() => handleExecuteImport(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                <Eye className="w-4 h-4 text-blue-400" />
                معاينة فقط (Dry-Run)
              </button>

              <button
                type="button"
                disabled={processing || parsedRows.length === 0 || (previewStats?.errors.length || 0) > 0}
                onClick={() => handleExecuteImport(false)}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري الاستيراد الذري...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    تأكيد واستيراد الحسابات
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Import History Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">سجل عمليات الاستيراد السابقة ({importHistory.length})</h2>
            </div>
            <button
              onClick={fetchData}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
              title="تحديث السجل"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {importHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد عمليات استيراد سابقة.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="pb-3 pr-4">الملف</th>
                    <th className="pb-3">الصفوف</th>
                    <th className="pb-3">حسابات جديدة</th>
                    <th className="pb-3">تحديث</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3 pl-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {importHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 pr-4 font-mono text-white text-xs font-semibold">
                        {h.filename}
                      </td>
                      <td className="py-4 text-slate-300 font-mono text-xs">
                        {h.total_rows}
                      </td>
                      <td className="py-4 text-emerald-400 font-mono text-xs font-semibold">
                        {h.new_accounts_count}
                      </td>
                      <td className="py-4 text-blue-400 font-mono text-xs font-semibold">
                        {h.updated_accounts_count}
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            h.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                              : h.status === 'DRY RUN ONLY'
                              ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                              : 'bg-red-500/10 border border-red-500/30 text-red-300'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="py-4 pl-4 text-xs text-slate-400">
                        {new Date(h.created_at).toLocaleString('ar-EG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
