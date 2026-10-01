'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { phpApi, PhpApiError, type BackupCreateResult } from '@/lib/api/php';
import { explainDbError } from '@/lib/errors/db';
import type { Session } from '@supabase/supabase-js';
import {
  ShieldAlert,
  Download,
  Trash2,
  RefreshCw,
  Database,
  Lock,
  FileArchive,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  Layers,
  History
} from 'lucide-react';

interface BackupRecord {
  id: string;
  filename: string;
  file_size_bytes: number;
  storage_type: string;
  storage_path: string;
  status: string;
  checksum_sha256: string;
  created_at: string;
}

export default function AdminBackupsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [storageOption, setStorageOption] = useState<'DOWNLOAD' | 'HOSTINGER'>('HOSTINGER');

  // Confirmation Modal
  const [selectedBackupForDelete, setSelectedBackupForDelete] = useState<BackupRecord | null>(null);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupRecord | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreMode, setRestoreMode] = useState<'FULL' | 'DATABASE_ONLY' | 'FILES_ONLY'>('FULL');
  const [restoring, setRestoring] = useState(false);
  const [operationMsg, setOperationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // The database only stores archive metadata (name, size, checksum). Restoring needs
  // the actual encrypted ZIP, so the operator has to attach the file they hold. We keep
  // the File objects in memory for this page only — never uploaded, never persisted.
  const [backupFiles, setBackupFiles] = useState<Record<string, File>>({});

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
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

      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session ?? null);

      const { data, error } = await supabase
        .from('backup_records')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBackups(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupPassword || backupPassword.length < 8) {
      setOperationMsg({ type: 'error', text: 'كلمة مرور التشفير يجب ألا تقل عن 8 أحرف وأرقام' });
      return;
    }

    setCreatingBackup(true);
    setOperationMsg(null);

    try {
      // The archive is produced by the PHP backend: it snapshots the storage tree,
      // exports the database, and writes a real AES-256 ZIP whose sha256 it computes.
      // Nothing about that file is invented in the browser, and a success message is
      // only shown once the backend has actually returned a created archive.
      const result = await phpApi<BackupCreateResult>('/backup/create', {
        session,
        body: {
          encryption_password: backupPassword,
          storage_option: storageOption === 'HOSTINGER' ? 'HOSTINGER' : 'DOWNLOAD_ONLY',
        },
      });

      const dbNote = result.includes_database
        ? ` · قاعدة البيانات: ${result.database_tables ?? 0} جدول / ${result.database_rows ?? 0} صف`
        : '';

      setOperationMsg({
        type: 'success',
        text: `تم إنشاء النسخة الاحتياطية فعلياً: ${result.filename} (${result.files_included} ملف${dbNote})`,
      });
      setBackupPassword('');
      fetchBackups();
    } catch (err) {
      const message =
        err instanceof PhpApiError
          ? err.message
          : 'فشل إنشاء النسخة الاحتياطية. لم يتم إنشاء أي ملف.';
      setOperationMsg({ type: 'error', text: message });
    } finally {
      setCreatingBackup(false);
    }
  };

  /**
   * Attaches the operator's encrypted ZIP to a listed archive so it can be restored.
   * The file is held in memory for this page only; it is never stored or re-uploaded
   * anywhere except to /restore/execute at the moment the operator confirms.
   */
  const handleAttachFile = (backupId: string, file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setOperationMsg({ type: 'error', text: 'الملف يجب أن يكون أرشيف ZIP.' });
      return;
    }
    setBackupFiles((prev) => ({ ...prev, [backupId]: file }));
    setOperationMsg({ type: 'success', text: `تم إرفاق الملف ${file.name} لهذه النسخة.` });
  };

  const handleDeleteBackup = async () => {
    if (!selectedBackupForDelete) return;
    try {
      const { error } = await supabase
        .from('backup_records')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', selectedBackupForDelete.id);

      if (error) throw error;

      await supabase.rpc('log_operational_event', {
        p_operation: 'BACKUP_DELETE',
        p_entity_type: 'backup_records',
        p_entity_id: selectedBackupForDelete.filename,
        p_status: 'SUCCESS',
        p_details: { filename: selectedBackupForDelete.filename },
        p_checksum: selectedBackupForDelete.checksum_sha256
      });

      setOperationMsg({ type: 'success', text: 'تم حذف النسخة الاحتياطية بنجاح' });
      setSelectedBackupForDelete(null);
      fetchBackups();
    } catch (err) {
      setOperationMsg({ type: 'error', text: explainDbError(err) });
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackupForRestore) return;

    const source = backupFiles[selectedBackupForRestore.id];
    if (!source) {
      setOperationMsg({
        type: 'error',
        text: 'ملف النسخة الاحتياطية غير موجود على هذا الجهاز. ارفع الملف من جديد قبل الاستعادة.',
      });
      return;
    }
    if (!restorePassword) {
      setOperationMsg({ type: 'error', text: 'يرجى إدخال كلمة مرور فك تشفير النسخة' });
      return;
    }

    setRestoring(true);
    setOperationMsg(null);

    try {
      // The backend re-opens the archive, re-validates it, takes a safety backup, and
      // rolls the whole thing back on any failure. Passing the user's own password is
      // unavoidable: the archive is AES encrypted with a key the server never stored.
      const form = new FormData();
      form.append('backup_zip', source);
      form.append('encryption_password', restorePassword);
      form.append('restore_mode', restoreMode === 'FULL' ? 'FULL_SYSTEM' : restoreMode);
      form.append('confirm_restore', 'YES');
      form.append('truncate_mode', 'MERGE');

      const result = await phpApi<{ mode?: string; rolled_back?: boolean }>('/restore/execute', {
        session,
        formData: form,
        timeoutMs: 600_000,
      });

      if (result.rolled_back) {
        setOperationMsg({
          type: 'error',
          text: 'فشلت الاستعادة وتم التراجع تلقائياً. النظام في حالته السابقة.',
        });
        return;
      }

      setOperationMsg({
        type: 'success',
        text: `تمت استعادة النظام فعلياً بنمط ${result.mode ?? restoreMode}.`,
      });
      setSelectedBackupForRestore(null);
      setRestorePassword('');
    } catch (err) {
      const message =
        err instanceof PhpApiError
          ? err.message
          : 'فشل تنفيذ الاستعادة. لم يُطبَّق أي تغيير على النظام.';
      setOperationMsg({ type: 'error', text: message });
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-amber-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="font-bold">جاري تحميل لوحة النسخ الاحتياطي...</span>
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
            لوحة النسخ الاحتياطي وإدارة الملفات محصورة حصراً على مسؤولي النظام (Admin / Super User).
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
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Database className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">إدارة النسخ الاحتياطي والاستعادة المشفرة</h1>
            </div>
            <p className="text-slate-400 text-sm">
              إنشاء واستعادة النسخ الاحتياطية الكاملة (قاعدة البيانات وملفات التخزين) بتشفير AES-256 مع نقاط استرجاع ذرية.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/imports"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              استيراد الطلاب الجماعي
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

        {/* Operation Notifications */}
        {operationMsg && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 ${
              operationMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/40 border-red-500/40 text-red-200'
            }`}
          >
            {operationMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{operationMsg.text}</p>
          </div>
        )}

        {/* Create Backup Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">إنشاء نسخة احتياطية مشفرة جديدة (AES-256)</h2>
          </div>

          <form onSubmit={handleCreateBackup} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  كلمة مرور التشفير (تُدخل يدوياً ولا تُحفظ في النظام) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="أدخل كلمة مرور قوية لتشفير الـ ZIP..."
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  🔒 يتم استخدام معيار التشفير AES-256. كلمة المرور لا تُسجل إطلاقاً في السجلات أو قاعدة البيانات.
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  وجهة حفظ النسخة الاحتياطية *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStorageOption('HOSTINGER')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition ${
                      storageOption === 'HOSTINGER'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    خادم Hostinger
                  </button>
                  <button
                    type="button"
                    onClick={() => setStorageOption('DOWNLOAD')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition ${
                      storageOption === 'DOWNLOAD'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    تحميل مباشر
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingBackup}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-amber-900/20 disabled:opacity-50"
            >
              {creatingBackup ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  جاري تشفير وتجهيز النسخة...
                </>
              ) : (
                <>
                  <FileArchive className="w-5 h-5" />
                  بدء إنشاء النسخة الكاملة
                </>
              )}
            </button>
          </form>
        </div>

        {/* Backups List Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">سجل النسخ الاحتياطية المسجلة ({backups.length})</h2>
            </div>
            <button
              onClick={fetchBackups}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
              title="تحديث القائمة"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {backups.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileArchive className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد نسخ احتياطية مسجلة حالياً.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="pb-3 pr-4">اسم الملف</th>
                    <th className="pb-3">الحجم</th>
                    <th className="pb-3">موقع التخزين</th>
                    <th className="pb-3">رمز التحقق (SHA-256)</th>
                    <th className="pb-3">تاريخ الإنشاء</th>
                    <th className="pb-3">ملف الأرشيف</th>
                    <th className="pb-3 pl-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {backups.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 pr-4 font-mono text-white text-xs md:text-sm font-semibold flex items-center gap-2">
                        <FileArchive className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        {b.filename}
                      </td>
                      <td className="py-4 text-slate-300 font-mono text-xs">
                        {(b.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-300">
                          {b.storage_type}
                        </span>
                      </td>
                      <td className="py-4 font-mono text-xs text-slate-400" title={b.checksum_sha256}>
                        {b.checksum_sha256.slice(0, 16)}...
                      </td>
                      <td className="py-4 text-xs text-slate-400">
                        {new Date(b.created_at).toLocaleString('ar-EG')}
                      </td>
                      <td className="py-4">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/60 hover:border-amber-500/50 text-xs text-slate-300 transition">
                          <Upload className="w-3.5 h-3.5" />
                          {backupFiles[b.id] ? 'تغيير الملف' : 'إرفاق ملف ZIP'}
                          <input
                            type="file"
                            accept=".zip,application/zip"
                            className="hidden"
                            onChange={(e) => handleAttachFile(b.id, e.target.files?.[0] ?? null)}
                          />
                        </label>
                        {backupFiles[b.id] && (
                          <span className="block mt-1.5 text-[11px] text-emerald-400 truncate max-w-[160px]" title={backupFiles[b.id].name}>
                            {backupFiles[b.id].name}
                          </span>
                        )}
                      </td>
                      <td className="py-4 pl-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedBackupForRestore(b)}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 transition text-xs font-medium flex items-center gap-1"
                            title="استعادة من هذه النسخة"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            استعادة
                          </button>
                          <button
                            onClick={() => setSelectedBackupForDelete(b)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition"
                            title="حذف النسخة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {selectedBackupForDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-lg font-bold text-white">هل أنت متأكد الآن؟</h3>
              </div>
              <p className="text-slate-300 text-sm">
                أنت على وشك حذف النسخة الاحتياطية المشفرة:
                <br />
                <strong className="text-white font-mono text-xs mt-1 block">{selectedBackupForDelete.filename}</strong>
                <br />
                هذا الإجراء سيقوم بحذف السجل والملف من التخزين وتسجيل العملية في سجل التدقيق.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBackupForDelete(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBackup}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-red-900/30"
                >
                  تأكيد الحذف
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Restore Confirmation Modal */}
        {selectedBackupForRestore && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3 text-amber-400">
                <Layers className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-lg font-bold text-white">معاينة الاستعادة الآمنة والذرية</h3>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                <div><strong>الملف المستهدف:</strong> <span className="font-mono text-white">{selectedBackupForRestore.filename}</span></div>
                <div><strong>الحجم:</strong> {(selectedBackupForRestore.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</div>
                <div><strong>تاريخ النسخة:</strong> {new Date(selectedBackupForRestore.created_at).toLocaleString('ar-EG')}</div>
                <div><strong>نقطة الأمان التلقائية:</strong> سيتم إنشاء Pre-Restore Safety Backup تلقائياً قبل البدء.</div>
              </div>

              {!backupFiles[selectedBackupForRestore.id] && (
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-xs text-red-300 space-y-2">
                  <p className="font-bold">الملف غير مرفق — لا يمكن تنفيذ الاستعادة.</p>
                  <p>
                    قاعدة البيانات تخزّن بيانات النسخة فقط (الاسم، الحجم، والبصمة). الاستعادة تحتاج
                    أرشيف ZIP نفسه. أغلق هذه النافذة وأرفق الملف من عمود «ملف الأرشيف».
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    اختر وضع الاستعادة (Restore Mode)
                  </label>
                  <select
                    value={restoreMode}
                    onChange={(e: any) => setRestoreMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="FULL">استعادة كاملة (قاعدة البيانات + ملفات التخزين)</option>
                    <option value="DATABASE_ONLY">استعادة قاعدة البيانات فقط</option>
                    <option value="FILES_ONLY">استعادة ملفات التخزين فقط</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    أدخل كلمة مرور فك تشفير النسخة *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="كلمة مرور AES-256..."
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                ⚠️ هل تريد بدء الاستعادة؟ في حالة حدوث أي خطأ سيقوم النظام بالرجوع الذري الفوري (Atomic Rollback).
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() => setSelectedBackupForRestore(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={restoring || !backupFiles[selectedBackupForRestore.id]}
                  onClick={handleRestoreBackup}
                  title={
                    backupFiles[selectedBackupForRestore.id]
                      ? undefined
                      : 'أرفق ملف الأرشيف أولاً'
                  }
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {restoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      جاري التحقق والاستعادة...
                    </>
                  ) : (
                    'تأكيد وبدء الاستعادة'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
