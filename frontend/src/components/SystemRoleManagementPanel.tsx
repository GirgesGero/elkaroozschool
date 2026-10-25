'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Crown, Loader2, LockKeyhole, Save, Shield, UserPlus, X } from 'lucide-react';

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
  const [admin, setAdmin] = useState<Staff | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberPermissions, setMemberPermissions] = useState<Record<string, string[]>>({});
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [selected, setSelected] = useState('');
  const [permissionDraft, setPermissionDraft] = useState<Record<string, string[]>>({});
  const [transferTarget, setTransferTarget] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [transferConfirmation, setTransferConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const db = DB();
    const [adminRes, staffRes, memberRes, permissionRes, auditRes] = await Promise.all([
      db.from('profiles').select('id,full_name,username,role_id,group_id').eq('id', adminId).eq('role_id', 'admin').eq('is_active', true).is('deleted_at', null).maybeSingle(),
      db.from('profiles').select('id,full_name,username,role_id,group_id').in('role_id', CANDIDATE_ROLES).eq('is_active', true).is('deleted_at', null).order('full_name'),
      db.from('general_secretariat_members').select('profile_id,is_active'),
      db.from('permissions').select('id').in('id', Object.keys(PERMISSION_LABELS)),
      db.from('audit_logs').select('id,action,actor_name,created_at,entity_id').in('action', ['SYSTEM_ADMIN_TRANSFER', 'GENERAL_SECRETARIAT_UPDATE', 'SYSTEM_ADMIN_BREAK_GLASS_RECOVERY']).order('created_at', { ascending: false }).limit(8),
    ]);
    if (adminRes.error || staffRes.error || memberRes.error || permissionRes.error) {
      setError('تعذر تحميل إدارة الأدوار. تحقق من اتصال قاعدة البيانات وصلاحيات الحساب.');
      setLoading(false);
      return;
    }
    setAdmin(adminRes.data ?? null);
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
  const eligible = useMemo(() => staff.filter((person) => person.id !== adminId), [staff, adminId]);

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

  const transferAdmin = async () => {
    if (!transferTarget || !transferPassword || transferConfirmation !== 'نقل مسؤول النظام') {
      setError('اختر المسؤول الجديد، أعد المصادقة، واكتب عبارة التأكيد كما هي.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    const db = DB();
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user?.email || user.id !== adminId) throw new Error('identity');
      const { data, error: authError } = await db.auth.signInWithPassword({ email: user.email, password: transferPassword });
      if (authError || data.user?.id !== adminId) throw new Error('reauth');
      const { error: rpcError } = await db.rpc('transfer_system_admin', {
        p_target_profile_id: transferTarget,
        p_confirmation: transferConfirmation,
      });
      if (rpcError) throw rpcError;
      setNotice('تم نقل منصب مسؤول النظام. انتهت صلاحيات هذا الحساب؛ سيتم تسجيل الخروج الآن.');
      await db.auth.signOut();
      window.location.assign('/login');
    } catch {
      setError('فشل نقل المنصب. لم تتغير صلاحيات المسؤول الحالي؛ تحقق من الحساب المستهدف وأعد المصادقة.');
    } finally {
      setTransferPassword(''); setBusy(false);
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
          <div className="flex items-center gap-3 rounded-2xl border border-[#c29938]/20 bg-white/[0.025] p-4">
            <Crown className="h-5 w-5 shrink-0 text-[#d8b75b]" />
            <div><p className="text-xs text-slate-400">مسؤول النظام الحالي</p><p className="mt-1 font-bold text-white">{admin?.full_name ?? 'تعذر تحديد المسؤول الحالي'}</p></div>
          </div>

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

          <details className="rounded-2xl border border-red-300/20 bg-red-950/10 p-4">
            <summary className="cursor-pointer list-none font-bold text-red-100">نقل منصب مسؤول النظام</summary>
            <div className="mt-4 space-y-3">
              <p className="flex items-start gap-2 text-xs leading-6 text-red-100/75"><AlertTriangle className="mt-1 h-4 w-4 shrink-0" />سيُزال الدور الإداري من هذا الحساب ويُمنح للمستخدم المختار داخل معاملة قاعدة بيانات واحدة.</p>
              <select aria-label="المسؤول الجديد" value={transferTarget} onChange={(event) => setTransferTarget(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0e1626] px-3 text-sm text-white">
                <option value="">اختر مستخدمًا مؤهلًا</option>{eligible.map((person) => <option key={person.id} value={person.id}>{person.full_name} — {person.role_id}</option>)}
              </select>
              <label className="block text-xs text-slate-300">كلمة مرور الحساب لإعادة المصادقة
                <input type="password" autoComplete="current-password" value={transferPassword} onChange={(event) => setTransferPassword(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#0e1626] px-3 text-sm text-white" />
              </label>
              <label className="block text-xs text-slate-300">اكتب: <strong className="text-red-200">نقل مسؤول النظام</strong>
                <input value={transferConfirmation} onChange={(event) => setTransferConfirmation(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#0e1626] px-3 text-sm text-white" />
              </label>
              <button type="button" onClick={() => void transferAdmin()} disabled={busy || !transferTarget || !transferPassword || transferConfirmation !== 'نقل مسؤول النظام'} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-800 px-4 text-sm font-bold text-white disabled:opacity-45"><LockKeyhole className="h-4 w-4" />إعادة المصادقة ونقل المنصب</button>
            </div>
          </details>

          <div>
            <h3 className="mb-3 font-bold text-white">سجل تغييرات الأدوار</h3>
            {audit.length ? <ul className="space-y-2">{audit.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-white/5 px-3 py-2 text-xs"><span className="text-slate-300">{item.action === 'SYSTEM_ADMIN_TRANSFER' ? 'نقل مسؤول النظام' : item.action === 'SYSTEM_ADMIN_BREAK_GLASS_RECOVERY' ? 'استعادة طارئة لمسؤول النظام' : 'تعديل السكرتارية العامة'} · {item.actor_name ?? 'مسؤول النظام'}</span><time className="text-slate-500" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('ar-EG')}</time></li>)}</ul> : <p className="text-xs text-slate-500">لا توجد تغييرات مسجلة بعد.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
