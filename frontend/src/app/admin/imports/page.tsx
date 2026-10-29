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
import { phpApi } from '@/lib/api/php';

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

      if (!userProfile || userProfile.role_id !== 'admin') {
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

  const csvEscape = (value: unknown): string => {
    const text = value == null ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const handleExportTrainees = async (format: 'csv' | 'excel') => {
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

      let exportBlob: Blob;
      let exportFilename: string;

      if (format === 'excel') {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('المتدربون');
        worksheet.columns = [
          { header: 'اسم المستخدم', key: 'username', width: 20 },
          { header: 'الاسم بالكامل', key: 'full_name', width: 30 },
          { header: 'رقم الهاتف', key: 'phone', width: 18 },
          { header: 'اسم الأب / المرشد', key: 'father_name', width: 25 },
          { header: 'تاريخ الميلاد', key: 'birth_date', width: 15 },
          { header: 'الحالة', key: 'status', width: 12 },
        ];
        data.forEach((p) => {
          worksheet.addRow({
            username: p.username,
            full_name: p.full_name,
            phone: p.phone || '',
            father_name: p.father_name || '',
            birth_date: p.birth_date || '',
            status: p.is_active ? 'نشط' : 'موقوف',
          });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        exportBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        exportFilename = `trainees_export_${Date.now()}.xlsx`;
      } else {
        const headers = ['username', 'full_name', 'phone', 'father_name', 'birth_date', 'status'];
        const csvRows = [headers.map(csvEscape).join(',')];
        data.forEach((p) => {
          csvRows.push([
            p.username,
            p.full_name,
            p.phone || '',
            p.father_name || '',
            p.birth_date || '',
            p.is_active ? 'نشط' : 'موقوف'
          ].map(csvEscape).join(','));
        });
        exportBlob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        exportFilename = `trainees_export_${Date.now()}.csv`;
      }

      // Trigger direct browser download
      const url = URL.createObjectURL(exportBlob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', exportFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 0);

      // Save a copy to Google Drive / Storage in the background if session exists
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          const formData = new FormData();
          formData.append('file', exportBlob, exportFilename);
          formData.append('folder_type', 'general');
          formData.append('group_id', '0');
          formData.append('resource_type', 'GENERAL');
          await phpApi('/storage/upload', { formData, session: sessionData.session });
        }
      } catch (cloudErr) {
        console.warn('Google Drive backup copy skipped/failed:', cloudErr);
        setStatusMsg({ type: 'error', text: 'تم تنزيل الملف، لكن فشل حفظ النسخة على التخزين البعيد.' });
        return;
      }

      // Audit export
      await supabase.rpc('log_operational_event', {
        p_operation: 'EXPORT_TRAINEES_' + format.toUpperCase(),
        p_entity_type: 'profiles',
        p_entity_id: 'export_all',
        p_status: 'SUCCESS',
        p_details: { rows_count: data.length, format }
      });
      setStatusMsg({ type: 'success', text: `تم تصدير وحفظ كشف المتدربين بنجاح (${format.toUpperCase()})` });
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: explainDbError(err) });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-nav flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-warning">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="font-bold">جاري تحميل لوحة الاستيراد...</span>
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
            لوحة الاستيراد الجماعي محصورة على مسؤولي النظام (Admin / Super User).
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

      <div className="max-w-6xl w-full mx-auto p-4 md:p-6 flex-1 space-y-8 pb-28 md:pb-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-success/10 border border-success/30 rounded-xl text-success">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-content">استيراد وتصدير بيانات المتدربين الجماعي</h1>
            </div>
            <p className="text-content-muted text-sm">
              استيراد حسابات الطلاب دفعة واحدة بقاعدة (All-or-Nothing) الآمنة وتصدير الكشوفات المعتمدة.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/backups"
              className="flex items-center gap-2 bg-nav hover:bg-input border border-line text-content px-4 py-2.5 rounded-xl text-sm font-medium transition"
            >
              <Database className="w-4 h-4 text-warning" />
              النسخ الاحتياطي المشفر
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 bg-nav hover:bg-input border border-line text-content px-4 py-2.5 rounded-xl text-sm font-medium transition"
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

        {/* Quick Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-nav border border-line rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-content mb-1">تصدير سجلات المتدربين (CSV)</h3>
              <p className="text-xs text-content-muted">تصدير فوري لكافة المتدربين حسب الصلاحية والنطاق</p>
            </div>
            <button
              onClick={() => handleExportTrainees('csv')}
              className="flex items-center gap-2 bg-nav hover:bg-input border border-line text-content px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              <Download className="w-4 h-4 text-warning" />
              تحميل CSV
            </button>
          </div>

          <div className="bg-nav border border-line rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-content mb-1">تصدير سجلات المتدربين (Excel / XLSX)</h3>
              <p className="text-xs text-content-muted">
                تصدير معتمد بصيغة Microsoft Excel مع حفظ نسخة سحابية على Google Drive
              </p>
            </div>
            <button
              onClick={() => handleExportTrainees('excel')}
              className="flex items-center gap-2 bg-nav hover:bg-input border border-line text-content px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-success" />
              تحميل Excel
            </button>
          </div>
        </div>

        {/* Bulk Import Form Card */}
        <div className="bg-nav border border-line rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-success" />
              <h2 className="text-lg font-bold text-content">استيراد حسابات الطلاب (CSV / Excel)</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                const sample = `username,full_name,phone,father_name,group_name,birth_date,password\nmina_gerges,مينا جرجس صليب,01234567890,أبونا جرجس,الفرقة الأولى,2005-01-15,Trainee123!\nkareem_morcos,كريم مرقص حنا,01122334455,أبونا مرقص,الفرقة الأولى,2004-06-20,Trainee123!`;
                handleParseCsv(sample);
              }}
              className="text-xs text-warning hover:underline"
            >
              تحميل نموذج تجريبي (Sample CSV)
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-content-secondary mb-2">
                الصق محتوى ملف الـ CSV أو اكتب السطور بالترتيب: (username,full_name,phone,father_name,group_name,birth_date,password)
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => handleParseCsv(e.target.value)}
                placeholder="username,full_name,phone,father_name,group_name,birth_date,password&#10;peter_samir,بيتر سمير زكي,01011223344,أبونا يوسف,الفرقة الأولى,2005-02-10,Trainee123!"
                className="w-full bg-nav border border-line rounded-xl p-4 text-content font-mono text-xs placeholder-content-muted focus:outline-none focus:border-success"
              />
            </div>

            {/* Validation & Preview Stats */}
            {previewStats && (
              <div className="bg-nav p-4 rounded-xl border border-line space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-bold text-content">معاينة دفعة الاستيراد:</span>
                  <div className="flex items-center gap-4">
                    <span className="text-content-muted">الإجمالي: <strong className="text-content">{previewStats.total}</strong></span>
                    <span className="text-success">حسابات جديدة: <strong>{previewStats.newCount}</strong></span>
                    <span className="text-info">تحديث حسابات: <strong>{previewStats.updatedCount}</strong></span>
                  </div>
                </div>

                {previewStats.errors.length > 0 ? (
                  <div className="p-3 bg-canvas/40 border border-danger/40 rounded-lg text-danger space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-danger" />
                      تم اكتشاف {previewStats.errors.length} خطأ في البيانات (الاستيراد معطل حتى التصحيح - All-or-Nothing):
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-xs text-danger">
                      {previewStats.errors.map((err, idx) => (
                        <li key={idx}>السطر {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 bg-canvas/30 border border-success/30 rounded-lg text-success flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
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
                className="flex items-center gap-2 px-5 py-2.5 bg-nav hover:bg-input text-content rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                <Eye className="w-4 h-4 text-info" />
                معاينة فقط (Dry-Run)
              </button>

              <button
                type="button"
                disabled={processing || parsedRows.length === 0 || (previewStats?.errors.length || 0) > 0}
                onClick={() => handleExecuteImport(false)}
                className="flex items-center gap-2 px-6 py-2.5 bg-success hover:bg-success text-content rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
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
        <div className="bg-nav border border-line rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-success" />
              <h2 className="text-lg font-bold text-content">سجل عمليات الاستيراد السابقة ({importHistory.length})</h2>
            </div>
            <button
              onClick={fetchData}
              className="p-2 bg-nav hover:bg-input rounded-lg text-content-secondary transition"
              title="تحديث السجل"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {importHistory.length === 0 ? (
            <div className="text-center py-12 text-content-muted">
              <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد عمليات استيراد سابقة.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-line text-content-muted font-medium">
                    <th className="pb-3 pr-4">الملف</th>
                    <th className="pb-3">الصفوف</th>
                    <th className="pb-3">حسابات جديدة</th>
                    <th className="pb-3">تحديث</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3 pl-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle/60">
                  {importHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-nav/40 transition">
                      <td className="py-4 pr-4 font-mono text-content text-xs font-semibold">
                        {h.filename}
                      </td>
                      <td className="py-4 text-content-secondary font-mono text-xs">
                        {h.total_rows}
                      </td>
                      <td className="py-4 text-success font-mono text-xs font-semibold">
                        {h.new_accounts_count}
                      </td>
                      <td className="py-4 text-info font-mono text-xs font-semibold">
                        {h.updated_accounts_count}
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            h.status === 'SUCCESS'
                              ? 'bg-success/10 border border-success/30 text-success'
                              : h.status === 'DRY RUN ONLY'
                              ? 'bg-info/10 border border-info/30 text-info'
                              : 'bg-danger/10 border border-danger/30 text-danger'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="py-4 pl-4 text-xs text-content-muted">
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
