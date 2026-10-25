'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { phpApi, PhpApiError, type BackupCreateResult } from '@/lib/api/php';
import { explainDbError } from '@/lib/errors/db';
import type { Session } from '@supabase/supabase-js';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
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
  History,
} from 'lucide-react';
import type { Profile } from '@/types/database';

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

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
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
      <div className="min-h-screen bg-nav flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-warning">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="font-bold">جاري تحميل لوحة النسخ الاحتياطي...</span>
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
            لوحة النسخ الاحتياطي وإدارة الملفات محصورة حصراً على مسؤولي النظام (Admin / Super User).
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
              <div className="p-2.5 bg-warning/10 border border-warning/30 rounded-xl text-warning">
                <Database className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-content">إدارة النسخ الاحتياطي والاستعادة المشفرة</h1>
            </div>
            <p className="text-content-muted text-sm">
              إنشاء واستعادة النسخ الاحتياطية الكاملة (قاعدة البيانات وملفات التخزين) بتشفير AES-256 مع نقاط استرجاع ذرية.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/imports"
              className="flex items-center gap-2 bg-nav hover:bg-input border border-line text-content px-4 py-2.5 rounded-xl text-sm font-medium transition"
            >
              <Upload className="w-4 h-4 text-success" />
              استيراد الطلاب الجماعي
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

        {/* Operation Notifications */}
        {operationMsg && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 ${
              operationMsg.type === 'success'
                ? 'bg-canvas/40 border-success/40 text-success'
                : 'bg-canvas/40 border-danger/40 text-danger'
            }`}
          >
            {operationMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{operationMsg.text}</p>
          </div>
        )}

        {/* Create Backup Form Card */}
        <div className="bg-nav border border-line rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-warning" />
            <h2 className="text-lg font-bold text-content">إنشاء نسخة احتياطية مشفرة جديدة (AES-256)</h2>
          </div>

          <form onSubmit={handleCreateBackup} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-2">
                  كلمة مرور التشفير (تُدخل يدوياً ولا تُحفظ في النظام) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="أدخل كلمة مرور قوية لتشفير الـ ZIP..."
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  className="w-full bg-nav border border-line rounded-xl px-4 py-3 text-content placeholder-content-muted focus:outline-none focus:border-warning text-sm"
                />
                <span className="text-xs text-content-muted mt-1 block">
                  🔒 يتم استخدام معيار التشفير AES-256. كلمة المرور لا تُسجل إطلاقاً في السجلات أو قاعدة البيانات.
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-content-secondary mb-2">
                  وجهة حفظ النسخة الاحتياطية *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStorageOption('HOSTINGER')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition ${
                      storageOption === 'HOSTINGER'
                        ? 'bg-warning/10 border-warning text-warning'
                        : 'bg-nav border-line text-content-muted hover:border-line'
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
                        ? 'bg-warning/10 border-warning text-warning'
                        : 'bg-nav border-line text-content-muted hover:border-line'
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
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-warning hover:to-warning text-content px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-amber-900/20 disabled:opacity-50"
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
        <div className="bg-nav border border-line rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-warning" />
              <h2 className="text-lg font-bold text-content">سجل النسخ الاحتياطية المسجلة ({backups.length})</h2>
            </div>
            <button
              onClick={fetchBackups}
              className="p-2 bg-nav hover:bg-input rounded-lg text-content-secondary transition"
              title="تحديث القائمة"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {backups.length === 0 ? (
            <div className="text-center py-12 text-content-muted">
              <FileArchive className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد نسخ احتياطية مسجلة حالياً.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-line text-content-muted font-medium">
                    <th className="pb-3 pr-4">اسم الملف</th>
                    <th className="pb-3">الحجم</th>
                    <th className="pb-3">موقع التخزين</th>
                    <th className="pb-3">رمز التحقق (SHA-256)</th>
                    <th className="pb-3">تاريخ الإنشاء</th>
                    <th className="pb-3">ملف الأرشيف</th>
                    <th className="pb-3 pl-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle/60">
                  {backups.map((b) => (
                    <tr key={b.id} className="hover:bg-nav/40 transition">
                      <td className="py-4 pr-4 font-mono text-content text-xs md:text-sm font-semibold flex items-center gap-2">
                        <FileArchive className="w-4 h-4 text-warning flex-shrink-0" />
                        {b.filename}
                      </td>
                      <td className="py-4 text-content-secondary font-mono text-xs">
                        {(b.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-info/10 border border-info/30 text-info">
                          {b.storage_type}
                        </span>
                      </td>
                      <td className="py-4 font-mono text-xs text-content-muted" title={b.checksum_sha256}>
                        {b.checksum_sha256.slice(0, 16)}...
                      </td>
                      <td className="py-4 text-xs text-content-muted">
                        {new Date(b.created_at).toLocaleString('ar-EG')}
                      </td>
                      <td className="py-4">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg border border-line bg-nav/60 hover:border-warning/50 text-xs text-content-secondary transition">
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
                          <span className="block mt-1.5 text-[11px] text-success truncate max-w-[160px]" title={backupFiles[b.id].name}>
                            {backupFiles[b.id].name}
                          </span>
                        )}
                      </td>
                      <td className="py-4 pl-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedBackupForRestore(b)}
                            className="p-2 bg-success/10 hover:bg-success/20 text-success rounded-lg border border-success/30 transition text-xs font-medium flex items-center gap-1"
                            title="استعادة من هذه النسخة"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            استعادة
                          </button>
                          <button
                            onClick={() => setSelectedBackupForDelete(b)}
                            className="p-2 bg-danger/10 hover:bg-danger/20 text-danger rounded-lg border border-danger/30 transition"
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
            <div className="bg-nav border border-danger/40 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3 text-danger">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-lg font-bold text-content">هل أنت متأكد الآن؟</h3>
              </div>
              <p className="text-content-secondary text-sm">
                أنت على وشك حذف النسخة الاحتياطية المشفرة:
                <br />
                <strong className="text-content font-mono text-xs mt-1 block">{selectedBackupForDelete.filename}</strong>
                <br />
                هذا الإجراء سيقوم بحذف السجل والملف من التخزين وتسجيل العملية في سجل التدقيق.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBackupForDelete(null)}
                  className="px-4 py-2 bg-nav hover:bg-input text-content-secondary rounded-xl text-sm font-medium transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBackup}
                  className="px-6 py-2 bg-danger hover:bg-danger text-content rounded-xl text-sm font-bold transition shadow-lg shadow-red-900/30"
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
            <div className="bg-nav border border-warning/40 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3 text-warning">
                <Layers className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-lg font-bold text-content">معاينة الاستعادة الآمنة والذرية</h3>
              </div>

              <div className="bg-nav p-4 rounded-xl border border-line space-y-2 text-xs text-content-secondary">
                <div><strong>الملف المستهدف:</strong> <span className="font-mono text-content">{selectedBackupForRestore.filename}</span></div>
                <div><strong>الحجم:</strong> {(selectedBackupForRestore.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</div>
                <div><strong>تاريخ النسخة:</strong> {new Date(selectedBackupForRestore.created_at).toLocaleString('ar-EG')}</div>
                <div><strong>نقطة الأمان التلقائية:</strong> سيتم إنشاء Pre-Restore Safety Backup تلقائياً قبل البدء.</div>
              </div>

              {!backupFiles[selectedBackupForRestore.id] && (
                <div className="bg-danger/10 border border-danger/30 p-3 rounded-xl text-xs text-danger space-y-2">
                  <p className="font-bold">الملف غير مرفق — لا يمكن تنفيذ الاستعادة.</p>
                  <p>
                    قاعدة البيانات تخزّن بيانات النسخة فقط (الاسم، الحجم، والبصمة). الاستعادة تحتاج
                    أرشيف ZIP نفسه. أغلق هذه النافذة وأرفق الملف من عمود «ملف الأرشيف».
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-content-secondary mb-2">
                    اختر وضع الاستعادة (Restore Mode)
                  </label>
                  <select
                    value={restoreMode}
                    onChange={(e: any) => setRestoreMode(e.target.value)}
                    className="w-full bg-nav border border-line rounded-xl px-4 py-2.5 text-content text-sm focus:outline-none focus:border-warning"
                  >
                    <option value="FULL">استعادة كاملة (قاعدة البيانات + ملفات التخزين)</option>
                    <option value="DATABASE_ONLY">استعادة قاعدة البيانات فقط</option>
                    <option value="FILES_ONLY">استعادة ملفات التخزين فقط</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-content-secondary mb-2">
                    أدخل كلمة مرور فك تشفير النسخة *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="كلمة مرور AES-256..."
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    className="w-full bg-nav border border-line rounded-xl px-4 py-2.5 text-content text-sm focus:outline-none focus:border-warning"
                  />
                </div>
              </div>

              <p className="text-xs text-warning bg-warning/10 border border-warning/20 p-3 rounded-xl">
                ⚠️ هل تريد بدء الاستعادة؟ في حالة حدوث أي خطأ سيقوم النظام بالرجوع الذري الفوري (Atomic Rollback).
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() => setSelectedBackupForRestore(null)}
                  className="px-4 py-2 bg-nav hover:bg-input text-content-secondary rounded-xl text-sm font-medium transition"
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
                  className="flex items-center gap-2 px-6 py-2 bg-success hover:bg-success text-content rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
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

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
