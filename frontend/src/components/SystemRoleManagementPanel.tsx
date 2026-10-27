'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Crown, Loader2, LockKeyhole, Save, Shield, UserCheck, UserMinus, UserPlus, X } from 'lucide-react';

const PERMISSION_LABELS: Record<string, string> = {
  MANAGE_LECTURES: 'إدارة المحاضرات والأيام',
  MANAGE_CURRICULUM: 'إدارة المناهج',
  MANAGE_MARATHON: 'إدارة المرصد والأسئلة والماراثون',
  GRADE_EXAMS: 'إدخال درجات الامتحانات وتصحيحها',
  MANAGE_BOOKS: 'إدارة الكتب والأبحاث',
};
const CANDIDATE_ROLES = ['supervisor', 'servant', 'secretariat'];
const DB = () => createClient() as any;

type Staff = { id: string; full_name: string; username: string; role_id: string; group_id: number | null };
type Member = { profile_id: string; is_active: boolean };
type AuditRow = { id: number; action: string; actor_name: string | null; created_at: string; entity_id: string };

export default function SystemRoleManagementPanel({ adminId }: { adminId: string }) {
  const [admins, setAdmins] = useState<Staff[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberPermissions, setMemberPermissions] = useState<Record<string, string[]>>({});
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [permissionDraft, setPermissionDraft] = useState<Record<string, string[]>>({});

  // Add Co-Administrator state
  const [grantTarget, setGrantTarget] = useState('');
  const [grantPassword, setGrantPassword] = useState('');
  const [grantConfirmation, setGrantConfirmation] = useState('');

  // Revoke Co-Administrator state
  const [revokeTarget, setRevokeTarget] = useState<Staff | null>(null);
  const [revokePassword, setRevokePassword] = useState('');
  const [revokeConfirmation, setRevokeConfirmation] = useState('');

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const db = DB();
    const [adminsRes, staffRes, memberRes, permissionRes, auditRes] = await Promise.all([
      db.from('profiles').select('id,full_name,username,role_id,group_id').eq('role_id', 'admin').eq('is_active', true).is('deleted_at', null).order('full_name'),
      db.from('profiles').select('id,full_name,username,role_id,group_id').in('role_id', CANDIDATE_ROLES).eq('is_active', true).is('deleted_at', null).order('full_name'),
      db.from('general_secretariat_members').select('profile_id,is_active'),
      db.from('permissions').select('id').in('id', Object.keys(PERMISSION_LABELS)),
      db.from('audit_logs').select('id,action,actor_name,created_at,entity_id').in('action', ['SYSTEM_ADMIN_GRANT', 'SYSTEM_ADMIN_REVOKE', 'SYSTEM_ADMIN_TRANSFER', 'GENERAL_SECRETARIAT_UPDATE', 'SYSTEM_ADMIN_BREAK_GLASS_RECOVERY']).order('created_at', { ascending: false }).limit(10),
    ]);
    if (adminsRes.error || staffRes.error || memberRes.error || permissionRes.error) {
      setError('تعذر تحميل إدارة الأدوار. تحقق من اتصال قاعدة البيانات وصلاحيات الحساب.');
      setLoading(false);
      return;
    }
    setAdmins((adminsRes.data ?? []) as Staff[]);
    setStaff((staffRes.data ?? []) as Staff[]);
    setMembers((memberRes.data ?? []) as Member[]);
    setAvailablePermissions((permissionRes.data ?? []).map((p: { id: string }) => p.id).filter((id: string) => id in PERMISSION_LABELS));
    setAudit((auditRes.data ?? []) as AuditRow[]);

    const permissionData = await db.from('general_secretariat_permissions').select('profile_id,permission_id');
    if (!permissionData.error) {
      const grouped: Record<string, string[]> = {};
      for (const row of permissionData.data ?? []) (grouped[row.profile_id] ??= []).push(row.permission_id);
      setMemberPermissions(grouped);
      setPermissionDraft(grouped);
    }
    setLoading(false);
  }, [adminId]);

  useEffect(() => { void load(); }, [load]);

  const activeMemberIds = useMemo(() => new Set(members.filter((m) => m.is_active).map((m) => m.profile_id)), [members]);
  const eligible = useMemo(() => staff.filter((person) => !admins.some((a) => a.id === person.id)), [staff, admins]);

  const saveSecretariat = async (profileId: string, enabled: boolean) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: rpcError } = await DB().rpc('admin_set_general_secretariat', {
        p_profile_id: profileId,
        p_permission_ids: permissionDraft[profileId] ?? [],
        p_enabled: enabled,
      });
      if (rpcError) throw rpcError;
      setNotice(enabled ? 'تم حفظ تعيين السكرتارية العامة وصلاحياته.' : 'تم إلغاء تعيين السكرتارية العامة وصلاحياته.');
      await load();
    } catch {
      setError('لم يتم حفظ التعيين. تأكد من اختيار صلاحيات تشغيلية متاحة ثم أعد المحاولة.');
    } finally { setBusy(false); }
  };

  const togglePermission = (profileId: string, permission: string) => {
    setPermissionDraft((current) => {
      const existing = current[profileId] ?? [];
      return { ...current, [profileId]: existing.includes(permission) ? existing.filter((item) => item !== permission) : [...existing, permission] };
    });
  };

  const grantCoAdmin = async () => {
    if (!grantTarget || !grantPassword || (grantConfirmation !== 'إضافة مسؤول نظام' && grantConfirmation !== 'منح صلاحية مسؤول النظام')) {
      setError('اختر المستخدم المؤهل، أدخل كلمة مرورك للتأكيد، واكتب عبارة التأكيد بدقة.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    const db = DB();
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user?.email || user.id !== adminId) throw new Error('identity');
      const { data, error: authError } = await db.auth.signInWithPassword({ email: user.email, password: grantPassword });
      if (authError || data.user?.id !== adminId) throw new Error('reauth');

      const { error: rpcError } = await db.rpc('grant_system_admin', {
        p_target_profile_id: grantTarget,
        p_confirmation: grantConfirmation,
      });
      if (rpcError) throw rpcError;

      const targetStaff = staff.find((s) => s.id === grantTarget);
      setNotice(`تم منح صلاحيات مسؤول النظام بنجاح للمستخدم (${targetStaff?.full_name || 'المسؤول الجديد'}). كلاكما الآن يمتلك نفس الصلاحيات والقدرة على الإدارة والتعديل.`);
      setGrantTarget('');
      setGrantPassword('');
      setGrantConfirmation('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'فشل منح الصلاحية. تأكد من كلمة المرور وصحة البيانات ثم أعد المحاولة.');
    } finally {
      setGrantPassword('');
      setBusy(false);
    }
  };

  const executeRevokeAdmin = async () => {
    if (!revokeTarget || !revokePassword || revokeConfirmation !== 'إلغاء صلاحية مسؤول النظام') {
      setError('أدخل كلمة المرور وعبارة التأكيد لإلغاء الصلاحية.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    const db = DB();
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user?.email || user.id !== adminId) throw new Error('identity');
      const { data, error: authError } = await db.auth.signInWithPassword({ email: user.email, password: revokePassword });
      if (authError || data.user?.id !== adminId) throw new Error('reauth');

      const { error: rpcError } = await db.rpc('revoke_system_admin', {
        p_target_profile_id: revokeTarget.id,
        p_demote_to_role: 'supervisor',
        p_confirmation: revokeConfirmation,
      });
      if (rpcError) throw rpcError;

      setNotice(`تم إلغاء صلاحية مسؤول النظام للمستخدم (${revokeTarget.full_name}) وتحويل حسابه إلى مشرف.`);
      setRevokeTarget(null);
      setRevokePassword('');
      setRevokeConfirmation('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'فشل إلغاء الصلاحية. لا يمكن إلغاء صلاحية آخر مسؤول نظام نشط.');
    } finally {
      setRevokePassword('');
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-[#c29938]/30 bg-[#070b14] text-slate-100 shadow-2xl">
      <header className="flex items-start gap-4 border-b border-[#c29938]/20 bg-gradient-to-l from-[#c29938]/10 to-transparent p-5">
        <div className="rounded-2xl border border-[#c29938]/35 bg-[#c29938]/10 p-3 text-[#d8b75b]"><Shield className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-white">مسؤول النظام والسكرتارية العامة</h2>
          <p className="mt-1 text-xs leading-6 text-slate-400">تعيينات منفصلة بصلاحيات تشغيلية محددة؛ لا تُمنح صلاحيات النسخ أو الاستعادة أو الأمان للسكرتارية.</p>
        </div>
      </header>
      {loading ? <div className="flex items-center gap-2 p-6 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />جارٍ تحميل الصلاحيات…</div> : (
        <div className="space-y-6 p-5">
          {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-950/25 p-3 text-sm text-emerald-200">{notice}</p>}
          {/* 1. CURRENT SYSTEM ADMINISTRATORS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Crown className="h-4 w-4 text-[#d8b75b]" />
                <span>مسؤولو النظام الحاليون (كامل الصلاحيات)</span>
              </h3>
              <span className="text-xs font-bold text-[#d8b75b] bg-[#c29938]/15 px-2.5 py-0.5 rounded-full border border-[#c29938]/30">
                {admins.length} {admins.length === 1 ? 'مسؤول وحيد' : 'مسؤولين'}
              </span>
            </div>

            <div className="grid gap-2.5">
              {admins.map((adm) => (
                <article key={adm.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#c29938]/30 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#c29938]/15 p-2 text-[#d8b75b]">
                      <Crown className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{adm.full_name}</span>
                        {adm.id === adminId && (
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            حسابك الحالي
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">@{adm.username} · مسؤول نظام كامل الصلاحيات</p>
                    </div>
                  </div>

                  {admins.length > 1 && adm.id !== adminId && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRevokeTarget(adm)}
                      className="inline-flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200 border border-red-500/30 bg-red-950/25 hover:bg-red-950/50 px-3 py-1.5 rounded-xl transition font-medium"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      إلغاء صفة المسؤول
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>

          {/* 2. GRANT CO-ADMINISTRATOR (إضافة مسؤول نظام مشارك) */}
          <details className="rounded-2xl border border-[#c29938]/35 bg-[#c29938]/[0.04] p-4 group">
            <summary className="cursor-pointer list-none font-bold text-[#e3c66f] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>إضافة مسؤول نظام مشارك (بنفس الصلاحيات والتعديلات)</span>
              </span>
              <span className="text-xs text-slate-400 group-open:hidden">+ إظهار النموذج</span>
            </summary>

            <div className="mt-4 space-y-3 pt-3 border-t border-[#c29938]/20">
              <p className="flex items-start gap-2 text-xs leading-6 text-slate-300">
                <UserCheck className="mt-1 h-4 w-4 shrink-0 text-[#d8b75b]" />
                سيُمنح المستخدم المختار رتبة مسؤول النظام (Admin) بكافة الصلاحيات الكاملة بالتوازي معك؛ بحيث يتمكن كلاكما من إدارة المنظومة وإجراء التعديلات والتحكم الكامل في آن واحد.
              </p>

              <div>
                <label className="block text-xs text-slate-300 mb-1">المستخدم المراد منحه الصلاحية</label>
                <select
                  aria-label="المسؤول المشارك الجديد"
                  value={grantTarget}
                  onChange={(event) => setGrantTarget(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0e1626] px-3 text-sm text-white"
                >
                  <option value="">اختر مستخدمًا مؤهلًا من الخدام أو المشرفين</option>
                  {eligible.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name} (@{person.username}) — {person.role_id === 'supervisor' ? 'مشرف' : person.role_id === 'servant' ? 'خادم' : 'سكرتارية'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">كلمة مرور حسابك الحالي لإعادة المصادقة</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="أدخل كلمة مرورك الحالية للتأكيد"
                  value={grantPassword}
                  onChange={(event) => setGrantPassword(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0e1626] px-3 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  اكتب للتأكيد: <strong className="text-amber-300">إضافة مسؤول نظام</strong>
                </label>
                <input
                  placeholder="إضافة مسؤول نظام"
                  value={grantConfirmation}
                  onChange={(event) => setGrantConfirmation(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0e1626] px-3 text-sm text-white font-bold"
                />
              </div>

              <button
                type="button"
                onClick={() => void grantCoAdmin()}
                disabled={busy || !grantTarget || !grantPassword || (grantConfirmation !== 'إضافة مسؤول نظام' && grantConfirmation !== 'منح صلاحية مسؤول النظام')}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#c29938] to-[#9e7a25] hover:brightness-110 px-5 text-sm font-bold text-slate-950 disabled:opacity-40 transition"
              >
                <LockKeyhole className="h-4 w-4" />
                تأكيد ومنح صلاحيات مسؤول النظام
              </button>
            </div>
          </details>

          {/* REVOKE CONFIRMATION MODAL / PANEL */}
          {revokeTarget && (
            <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-red-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span>تأكيد إلغاء صفة مسؤول النظام عن ({revokeTarget.full_name})</span>
                </h4>
                <button type="button" onClick={() => setRevokeTarget(null)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300">سيتم سحب صلاحيات مسؤول النظام وتحويل الحساب إلى دور مشرف (Supervisor).</p>

              <div>
                <label className="block text-xs text-slate-300 mb-1">كلمة مرور حسابك للتأكيد</label>
                <input
                  type="password"
                  value={revokePassword}
                  onChange={(e) => setRevokePassword(e.target.value)}
                  placeholder="كلمة مرورك للتأكيد"
                  className="min-h-10 w-full rounded-xl border border-white/10 bg-[#0e1626] px-3 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  اكتب للتأكيد: <strong className="text-red-300">إلغاء صلاحية مسؤول النظام</strong>
                </label>
                <input
                  value={revokeConfirmation}
                  onChange={(e) => setRevokeConfirmation(e.target.value)}
                  placeholder="إلغاء صلاحية مسؤول النظام"
                  className="min-h-10 w-full rounded-xl border border-white/10 bg-[#0e1626] px-3 text-sm text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={busy || !revokePassword || revokeConfirmation !== 'إلغاء صلاحية مسؤول النظام'}
                  onClick={() => void executeRevokeAdmin()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-700 hover:bg-red-600 px-4 text-xs font-bold text-white disabled:opacity-40"
                >
                  تأكيد سحب الصلاحية
                </button>
                <button
                  type="button"
                  onClick={() => setRevokeTarget(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs text-slate-300 hover:text-white"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-white">السكرتارية العامة</h3><span className="text-xs text-slate-500">الصلاحيات المتاحة المثبتة: {availablePermissions.length}</span></div>
            {eligible.map((person) => {
              const enabled = activeMemberIds.has(person.id);
              const draft = permissionDraft[person.id] ?? memberPermissions[person.id] ?? [];
              return <article key={person.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-bold text-white">{person.full_name}</p><p className="mt-1 text-xs text-slate-500">{person.username} · {person.role_id === 'supervisor' ? 'مشرف' : person.role_id === 'servant' ? 'خادم' : 'سكرتارية فرقة'}{person.group_id ? ` · الفرقة ${person.group_id}` : ''}</p></div>
                  <button type="button" disabled={busy || (enabled && draft.join('|') === (memberPermissions[person.id] ?? []).join('|'))} onClick={() => void saveSecretariat(person.id, true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#c29938]/35 px-3 text-xs font-bold text-[#e3c66f] disabled:opacity-40"><Save className="h-4 w-4" />{enabled ? 'حفظ الصلاحيات' : 'تعيين'}</button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {availablePermissions.map((permission) => <label key={permission} className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/5 px-3 py-2 text-xs text-slate-300 hover:border-[#c29938]/30">
                    <input type="checkbox" checked={draft.includes(permission)} onChange={() => togglePermission(person.id, permission)} className="accent-[#c29938]" />{PERMISSION_LABELS[permission]}
                  </label>)}
                </div>
                {!availablePermissions.length && <p className="mt-3 text-xs text-amber-200">لم تُكتشف صلاحيات تشغيلية في قاعدة البيانات؛ لن يُسمح بمنح صلاحية غير موجودة.</p>}
                {enabled && <button type="button" disabled={busy} onClick={() => void saveSecretariat(person.id, false)} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs text-red-300 hover:bg-red-950/30 disabled:opacity-40"><X className="h-4 w-4" />إلغاء التعيين</button>}
              </article>;
            })}
            {!eligible.length && <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">لا يوجد حاليًا مستخدمون مؤهلون للتعيين.</p>}
          </div>

          <div>
            <h3 className="mb-3 font-bold text-white">سجل تغييرات الأدوار</h3>
            {audit.length ? <ul className="space-y-2">{audit.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-white/5 px-3 py-2 text-xs"><span className="text-slate-300">{item.action === 'SYSTEM_ADMIN_GRANT' ? 'منح صلاحية مسؤول نظام مشارك' : item.action === 'SYSTEM_ADMIN_REVOKE' ? 'إلغاء صفة مسؤول نظام' : item.action === 'SYSTEM_ADMIN_TRANSFER' ? 'نقل مسؤول النظام' : item.action === 'SYSTEM_ADMIN_BREAK_GLASS_RECOVERY' ? 'استعادة طارئة لمسؤول النظام' : 'تعديل السكرتارية العامة'} · {item.actor_name ?? 'مسؤول النظام'}</span><time className="text-slate-500" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('ar-EG')}</time></li>)}</ul> : <p className="text-xs text-slate-500">لا توجد تغييرات مسجلة بعد.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
