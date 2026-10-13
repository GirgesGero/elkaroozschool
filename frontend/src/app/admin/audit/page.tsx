'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import {
  ScrollText,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  Shield,
  Activity,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Database,
  Lock,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface AuditLogEntry {
  id: number;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function AdminAuditPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    async function initUser() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: pData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!pData || !['admin', 'super_user'].includes(pData.role_id)) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setProfile(pData as Profile);
      setIsAdmin(true);
      await fetchLogs(1, actionFilter, searchQuery);
      setLoading(false);
    }

    initUser();
  }, [router]);

  const fetchLogs = async (pageNum: number, filter: string, query: string) => {
    try {
      const from = (pageNum - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filter !== 'ALL') {
        q = q.eq('action', filter);
      }

      if (query.trim()) {
        q = q.or(
          `actor_name.ilike.%${query.trim()}%,action.ilike.%${query.trim()}%,entity_type.ilike.%${query.trim()}%,entity_id.ilike.%${query.trim()}%`
        );
      }

      const { data, count, error } = await q;

      if (!error && data) {
        setLogs(data as AuditLogEntry[]);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error('Audit fetch error:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1, actionFilter, searchQuery);
  };

  const handleFilterChange = (newFilter: string) => {
    setActionFilter(newFilter);
    setPage(1);
    fetchLogs(1, newFilter, searchQuery);
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('DELETE')) return 'bg-danger/20 text-danger border-danger/40';
    if (action.includes('CREATE') || action.includes('UPLOAD'))
      return 'bg-success/20 text-success border-success/40';
    if (action.includes('UPDATE') || action.includes('RESTORE'))
      return 'bg-warning/20 text-warning border-warning/40';
    return 'bg-info/20 text-info border-info/40';
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-content flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-canvas text-content flex flex-col items-center justify-center p-4">
        <div className="p-6 rounded-3xl bg-nav border border-danger/40 text-center max-w-md shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-danger mx-auto mb-3" />
          <h2 className="text-lg font-black text-danger mb-2">صلاحية غير متوفرة</h2>
          <p className="text-xs text-content-muted leading-relaxed mb-4">
            سجل التدقيق الأمني مخصص لمدراء النظام والمشرفين العامين فقط لضمان سرية وسلامة التتبع الرقابي.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gold text-brand-on font-bold text-xs"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-content flex flex-col selection:bg-gold selection:text-content" dir="rtl">
      <SmartHeader
        profile={profile}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />

      <UnifiedProfileModal
        profileId={selectedProfileId}
        currentUser={profile}
        onClose={() => setSelectedProfileId(null)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-content-muted">
            <Link href="/" className="hover:text-gold transition-colors">الرئيسية</Link>
            <span>/</span>
            <span className="text-gold font-bold">سجل التدقيق والرقابة (Audit Trail)</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/backups"
              className="px-3.5 py-1.5 rounded-xl bg-nav border border-line text-xs font-bold hover:border-gold transition-colors text-content flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5 text-gold" />
              <span>النسخ الاحتياطي</span>
            </Link>
            <Link
              href="/admin/imports"
              className="px-3.5 py-1.5 rounded-xl bg-nav border border-line text-xs font-bold hover:border-gold transition-colors text-content flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-gold" />
              <span>استيراد المتدربين</span>
            </Link>
          </div>
        </div>

        {/* Page Hero Header */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-nav via-card to-nav border-2 border-gold/40 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/40 flex items-center justify-center shrink-0 shadow-md">
                <ScrollText className="w-7 h-7 text-gold" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-content">سجل التدقيق الأمني (Audit Log)</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-success/10 text-success border border-success/30 text-[10px] font-bold">
                    سجل محمي وغير قابل للتعديل
                  </span>
                </div>
                <p className="text-xs text-content-muted mt-1 max-w-2xl leading-relaxed">
                  تتبع شامل ومؤرخ لكافة العمليات الإدارية، تعديلات الدرجات، رفع الملفات، وتغيير الصلاحيات الصادرة من مسؤولي وخدام المدرسة.
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchLogs(page, actionFilter, searchQuery)}
              className="px-4 py-2 rounded-2xl bg-canvas border border-line hover:border-gold text-xs font-bold text-content flex items-center gap-2 shadow-sm transition-all shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gold" />
              <span>تحديث السجل</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 rounded-2xl bg-nav border border-line flex flex-col md:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="w-full md:w-96 relative">
            <Search className="w-4 h-4 text-content-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث بالفاعل، العملية، أو نوع الكيان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-canvas border border-line rounded-xl pr-10 pl-4 py-2 text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-gold"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-gold shrink-0" />
            <span className="text-xs text-content-muted shrink-0">نوع العملية:</span>
            {['ALL', 'FILE_UPLOAD', 'DATA_EXPORT', 'IMPORT', 'USER_UPDATE'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => handleFilterChange(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  actionFilter === f
                    ? 'bg-gold text-brand-on border-gold font-black shadow-sm'
                    : 'bg-canvas border-line text-content-secondary hover:border-gold/40'
                }`}
              >
                {f === 'ALL' ? 'الكل' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table / Cards */}
        {logs.length > 0 ? (
          <div className="bg-nav border border-line rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-canvas/80 border-b border-line text-content-secondary font-black">
                  <tr>
                    <th className="p-3.5">الوقت والتاريخ</th>
                    <th className="p-3.5">المسؤول (الفاعل)</th>
                    <th className="p-3.5">الرتبة</th>
                    <th className="p-3.5">نوع العملية</th>
                    <th className="p-3.5">الكيان المتأثر</th>
                    <th className="p-3.5">عنوان IP</th>
                    <th className="p-3.5 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-canvas/50 transition-colors">
                      <td className="p-3.5 text-content-muted font-mono whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3.5 font-bold text-content">
                        {log.actor_name || 'مستخدم غير مسجل'}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-canvas border border-line text-[11px] font-mono text-content-secondary">
                          {log.actor_role || 'SYSTEM'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${getActionBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-content-secondary">
                        <span className="text-gold font-bold">{log.entity_type}</span>
                        {log.entity_id && (
                          <span className="text-content-muted text-[11px] mr-1 truncate max-w-[120px] inline-block align-middle">
                            ({log.entity_id})
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-content-muted">
                        {log.ip_address || '—'}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-canvas border border-line hover:border-gold text-[11px] font-bold text-gold transition-colors"
                        >
                          عرض Payload
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-canvas/60 border-t border-line flex items-center justify-between text-xs text-content-muted">
              <div>
                إجمالي السجلات: <strong className="text-content font-mono">{totalCount}</strong> عملية
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    const next = page - 1;
                    setPage(next);
                    fetchLogs(next, actionFilter, searchQuery);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-nav border border-line disabled:opacity-40 hover:border-gold transition-colors text-content flex items-center gap-1"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <span className="px-2 font-mono">
                  {page} / {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    fetchLogs(next, actionFilter, searchQuery);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-nav border border-line disabled:opacity-40 hover:border-gold transition-colors text-content flex items-center gap-1"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-16 rounded-2xl bg-nav border border-line text-center text-xs text-content-muted space-y-2">
            <ScrollText className="w-10 h-10 text-content-muted mx-auto opacity-50" />
            <p>لا توجد سجلات تدقيق مسجلة حتى الآن أو مطابقة لخيارات البحث المحددة.</p>
          </div>
        )}

        {/* Log Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl rounded-3xl bg-nav border-2 border-gold/40 shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-gold" />
                  <h3 className="text-sm font-black text-content">
                    تفاصيل سجل التدقيق #{selectedLog.id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-full bg-canvas text-content-muted hover:text-content border border-line"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-3 bg-canvas/70 p-3 rounded-2xl border border-line">
                  <div>
                    <span className="text-content-muted block text-[10px]">العملية:</span>
                    <span className="font-bold text-gold">{selectedLog.action}</span>
                  </div>
                  <div>
                    <span className="text-content-muted block text-[10px]">الفاعل:</span>
                    <span className="font-bold text-content">{selectedLog.actor_name} ({selectedLog.actor_role})</span>
                  </div>
                  <div>
                    <span className="text-content-muted block text-[10px]">الكيان:</span>
                    <span className="text-content">{selectedLog.entity_type} - {selectedLog.entity_id}</span>
                  </div>
                  <div>
                    <span className="text-content-muted block text-[10px]">الوقت:</span>
                    <span className="text-content">{selectedLog.created_at}</span>
                  </div>
                </div>

                {selectedLog.old_values && (
                  <div>
                    <label className="text-[11px] font-bold text-warning block mb-1">القيم السابقة (Old Values):</label>
                    <pre className="p-3 rounded-2xl bg-canvas border border-line text-[11px] text-content-secondary overflow-x-auto">
                      {typeof selectedLog.old_values === 'string'
                        ? selectedLog.old_values
                        : JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_values && (
                  <div>
                    <label className="text-[11px] font-bold text-success block mb-1">القيم الجديدة / المعاملات (New Values):</label>
                    <pre className="p-3 rounded-2xl bg-canvas border border-line text-[11px] text-content-secondary overflow-x-auto">
                      {typeof selectedLog.new_values === 'string'
                        ? selectedLog.new_values
                        : JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="text-[10px] text-content-muted pt-2 border-t border-line">
                  User Agent: {selectedLog.user_agent || 'Unknown'}
                </div>
              </div>

              <div className="pt-4 border-t border-line mt-4 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl bg-canvas border border-line hover:border-gold text-xs font-bold text-content"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
