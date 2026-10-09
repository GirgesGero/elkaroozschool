'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { explainDbError } from '@/lib/errors/db';
import {
  X,
  User,
  Phone,
  Calendar,
  Shield,
  BookOpen,
  Trophy,
  Award,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  Edit3,
  Save,
  Loader2,
  Users,
  Briefcase,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { Profile, DelegatedPermission } from '@/types/database';

interface ServantProfileDrawerProps {
  servantId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: Profile | null;
  onProfileUpdated?: () => void;
}

const DELEGATED_PERMISSIONS_LIST: { id: DelegatedPermission; label: string; desc: string; icon: any }[] = [
  { id: 'MANAGE_LECTURES', label: 'إدارة المحاضرات', desc: 'إضافة وتعديل جدول ومواعيد المحاضرات الأسبوعية', icon: Calendar },
  { id: 'MANAGE_CURRICULUM', label: 'إدارة المناهج', desc: 'رفع وتعديل المناهج الدراسية والترم الأكاديمي', icon: BookOpen },
  { id: 'MANAGE_MARATHON', label: 'إدارة الماراثون', desc: 'إنشاء وإدارة مسابقات الماراثون وتوزيع الأسئلة', icon: Trophy },
  { id: 'GRADE_EXAMS', label: 'درجات وتصحيح الامتحانات', desc: 'رصد وتعديل درجات الامتحانات والتقييمات', icon: Award },
  { id: 'MANAGE_BOOKS', label: 'إدارة الكتب والأبحاث', desc: 'إدارة المكتبة الرقمية العامة ورفع الأبحاث والكتب', icon: Layers },
];

export default function ServantProfileDrawer({
  servantId,
  isOpen,
  onClose,
  currentUserProfile,
  onProfileUpdated,
}: ServantProfileDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [servant, setServant] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<DelegatedPermission[]>([]);
  const [isSecretariat, setIsSecretariat] = useState(false);
  const [groupTraineesCount, setGroupTraineesCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit State
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGroupId, setEditGroupId] = useState<number>(1);
  const [isEditing, setIsEditing] = useState(false);

  const isAdminOrSuper = currentUserProfile?.role_id === 'admin' || currentUserProfile?.role_id === 'super_user';

  useEffect(() => {
    if (!isOpen || !servantId) return;

    async function loadServant() {
      setLoading(true);
      setNotice(null);
      setIsEditing(false);
      const supabase = createClient();

      // 1. Fetch Profile
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', servantId).single();

      if (prof) {
        const p = prof as Profile;
        setServant(p);
        setEditFullName(p.full_name);
        setEditPhone(p.phone || '');
        setEditGroupId(p.group_id);

        // 2. Fetch Delegated Permissions
        const { data: perms } = await supabase
          .from('servant_permissions')
          .select('permission_id')
          .eq('profile_id', servantId);

        if (perms) {
          setPermissions(perms.map((item: any) => item.permission_id as DelegatedPermission));
        }

        // 3. Check Secretariat appointment
        const { data: sec } = await supabase
          .from('group_secretariat')
          .select('*')
          .eq('profile_id', servantId)
          .eq('group_id', p.group_id)
          .eq('is_active', true)
          .maybeSingle();

        setIsSecretariat(!!sec);

        // 4. Group Trainees count
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', p.group_id)
          .eq('role_id', 'trainee')
          .eq('is_active', true);

        setGroupTraineesCount(count || 0);
      }
      setLoading(false);
    }

    loadServant();
  }, [isOpen, servantId]);

  const handleTogglePermission = (permId: DelegatedPermission) => {
    if (!isAdminOrSuper) return;
    setPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleSavePermissions = async () => {
    if (!servantId || !isAdminOrSuper) return;
    setSaving(true);
    setNotice(null);
    const supabase = createClient();

    try {
      // Delete existing
      await supabase.from('servant_permissions').delete().eq('profile_id', servantId);

      // Insert new permissions
      if (permissions.length > 0) {
        const insertRows = permissions.map((p) => ({
          profile_id: servantId,
          permission_id: p,
          granted_by: currentUserProfile?.id,
        }));
        const { error: insErr } = await supabase.from('servant_permissions').insert(insertRows);
        if (insErr) throw insErr;
      }

      // Update basic info if edited
      if (isEditing) {
        const { error: profErr } = await supabase
          .from('profiles')
          .update({
            full_name: editFullName.trim(),
            phone: editPhone.trim() || null,
            group_id: editGroupId,
          })
          .eq('id', servantId);

        if (profErr) throw profErr;

        setServant((prev) => (prev ? { ...prev, full_name: editFullName.trim(), phone: editPhone.trim() || null, group_id: editGroupId as any } : null));
        setIsEditing(false);
      }

      setNotice({ type: 'success', text: 'تم حفظ صلاحيات وبيانات الخادم بنجاح!' });
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setNotice({ type: 'error', text: explainDbError(err) });
    }
    setSaving(false);
  };

  const handleToggleSecretariat = async () => {
    if (!servantId || !isAdminOrSuper || !servant) return;
    setSaving(true);
    setNotice(null);
    const supabase = createClient();

    try {
      if (isSecretariat) {
        // Remove Secretariat
        await supabase
          .from('group_secretariat')
          .delete()
          .eq('profile_id', servantId)
          .eq('group_id', servant.group_id);

        setIsSecretariat(false);
        setNotice({ type: 'success', text: 'تم إزالة صفة السكرتارية عن الخادم.' });
      } else {
        // Appoint as Secretariat (DB trigger enforces limit of 3)
        const { error } = await supabase.from('group_secretariat').insert({
          profile_id: servantId,
          group_id: servant.group_id,
          appointed_by: currentUserProfile?.id,
          is_active: true,
        });

        if (error) throw error;
        setIsSecretariat(true);
        setNotice({ type: 'success', text: 'تم تعيين الخادم كسكرتارية للفرقة بنجاح.' });
      }
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setNotice({ type: 'error', text: explainDbError(err) });
    }
    setSaving(false);
  };

  const handleToggleActiveStatus = async () => {
    if (!servantId || !isAdminOrSuper || !servant) return;
    setSaving(true);
    setNotice(null);
    const supabase = createClient();
    const newActive = !servant.is_active;

    try {
      const { error } = await supabase.from('profiles').update({ is_active: newActive }).eq('id', servantId);
      if (error) throw error;

      setNotice({
        type: 'success',
        text: newActive ? 'تم تفعيل حساب الخادم بنجاح.' : 'تم إيقاف حساب الخادم.',
      });
      setServant((prev) => (prev ? { ...prev, is_active: newActive } : null));
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setNotice({ type: 'error', text: explainDbError(err) });
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  const getGroupName = (gId: number) => {
    if (gId === 1) return 'الفرقة الأولى';
    if (gId === 2) return 'الفرقة الثانية';
    return 'الفرقة الثالثة';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md animate-fade-in flex justify-end">
      <div
        className="w-full max-w-xl bg-[#070b14] border-r border-[#c29938]/30 h-full flex flex-col shadow-2xl shadow-black/80 overflow-hidden animate-slide-in-left relative"
        dir="rtl"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#c29938]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-[#070b14]/90 border-b border-[#c29938]/20 flex items-center justify-between sticky top-0 z-20 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-black text-lg text-slate-100 flex items-center gap-2">
                <span>ملف وصلاحيات الخادم</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#c29938]/15 text-[#c29938] border border-[#c29938]/30">
                  {servant ? getGroupName(servant.group_id) : 'الفرقة'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">إدارة الصلاحيات المفوضة والبيانات التنظيمية</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdminOrSuper && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-[#c29938]/30 hover:border-[#c29938]/60 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#c29938]" />
                <span>تعديل</span>
              </button>
            )}
            {isAdminOrSuper && servant && (
              <button
                onClick={handleToggleActiveStatus}
                disabled={saving}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-sm ${
                  servant.is_active
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                {servant.is_active ? (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    <span>إيقاف</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>تفعيل</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Notice Banner */}
        {notice && (
          <div
            className={`px-4 py-3 text-xs flex items-center justify-between border-b ${
              notice.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notice.text}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#c29938]" />
              <p className="text-sm">جاري تحميل بيانات الخادم والصلاحيات...</p>
            </div>
          ) : servant ? (
            <>
              {/* Servant Card */}
              <div className="bg-gradient-to-b from-[#0e1626] to-[#070b14] border border-[#c29938]/30 rounded-3xl p-5 sm:p-6 relative overflow-hidden backdrop-blur-xl shadow-xl shadow-black/40">
                <div className="flex items-center gap-4">
                  <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#c29938]/30 via-slate-800 to-[#c29938]/10 border-2 border-[#c29938] p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-[#c29938]/10">
                    {servant.avatar_url ? (
                      <Image src={servant.avatar_url} alt={servant.full_name} fill sizes="80px" className="object-cover rounded-xl" />
                    ) : (
                      <User className="w-10 h-10 text-[#c29938]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-slate-100">{servant.full_name}</h3>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          servant.is_active
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {servant.is_active ? 'نشط ✓' : 'موقوف ✕'}
                      </span>
                      {isSecretariat && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          عضو سكرتارية
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                      <span className="text-[#c29938] font-mono">@{servant.username}</span>
                      <span>•</span>
                      <span>{servant.phone || 'بدون هاتف مسجل'}</span>
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-800/80 text-center">
                  <div className="bg-[#070b14]/70 rounded-2xl p-3 border border-slate-800">
                    <span className="block text-slate-400 text-xs font-semibold">طلبة الفرقة المتابعون</span>
                    <span className="text-xl font-black text-[#c29938] mt-0.5 block">{groupTraineesCount} طالب</span>
                  </div>
                  <div className="bg-[#070b14]/70 rounded-2xl p-3 border border-slate-800">
                    <span className="block text-slate-400 text-xs font-semibold">الصلاحيات المفوضة</span>
                    <span className="text-xl font-black text-emerald-400 mt-0.5 block">{permissions.length} / 5</span>
                  </div>
                </div>
              </div>

              {/* Edit Form (if editing) */}
              {isEditing && (
                <div className="bg-[#0e1626]/80 border border-[#c29938]/30 rounded-3xl p-5 sm:p-6 space-y-4">
                  <h4 className="text-sm font-bold text-[#c29938] flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    <span>تعديل البيانات الأساسية</span>
                  </h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">اسم الخادم الكامل</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
                        placeholder="01xxxxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">الفرقة الدراسية (نقل الخادم)</label>
                      <select
                        value={editGroupId}
                        onChange={(e) => setEditGroupId(Number(e.target.value))}
                        className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#c29938]"
                      >
                        <option value={1}>الفرقة الأولى</option>
                        <option value={2}>الفرقة الثانية</option>
                        <option value={3}>الفرقة الثالثة</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Secretariat Management Action */}
              {isAdminOrSuper && (
                <div className="bg-[#0e1626]/70 border border-purple-500/30 rounded-3xl p-5 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-black text-sm text-slate-100 block">عضوية سكرتارية الفرقة</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      {isSecretariat
                        ? 'الخادم معين حالياً كسكرتارية للفرقة وله صلاحيات الرصد وإدارة الحضور.'
                        : 'يمكن تعيين الخادم كسكرتارية للفرقة (بحد أقصى 3 سكرتارية لكل فرقة).'}
                    </span>
                  </div>
                  <button
                    onClick={handleToggleSecretariat}
                    disabled={saving}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 shadow-md ${
                      isSecretariat
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20'
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                  >
                    {isSecretariat ? 'إزالة السكرتارية' : 'تعيين كسكرتارية'}
                  </button>
                </div>
              )}

              {/* Delegated Permissions Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#c29938]" />
                      <span>مصفوفة الصلاحيات المفوضة (Independent Permissions)</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      كل صلاحية مستقلة بذاتها وتمنح الخادم حق إدارة الموديول الخاص بها داخل فرقته.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {DELEGATED_PERMISSIONS_LIST.map((perm) => {
                    const isGranted = permissions.includes(perm.id);
                    const Icon = perm.icon;
                    return (
                      <div
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                          isAdminOrSuper ? 'cursor-pointer' : ''
                        } ${
                          isGranted
                            ? 'bg-[#c29938]/10 border-[#c29938]/50 shadow-sm'
                            : 'bg-[#0e1626]/40 border-slate-800/80 opacity-60'
                        }`}
                      >
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${
                            isGranted ? 'bg-[#c29938] text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-sm ${isGranted ? 'text-[#c29938]' : 'text-slate-300'}`}>
                              {perm.label}
                            </span>
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                isGranted
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isGranted ? 'مفوضة ✓' : 'غير مفوضة ✕'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{perm.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons for Admin */}
              {isAdminOrSuper && (
                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
                  >
                    إغلاق
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-[#c29938] text-slate-950 font-black text-xs hover:bg-[#c29938]/90 transition-all shadow-lg flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>حفظ الصلاحيات والتعديلات</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">لم يتم العثور على بيانات الخادم.</div>
          )}
        </div>
      </div>
    </div>
  );
}
