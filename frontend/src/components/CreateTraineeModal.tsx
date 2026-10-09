'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { explainDbError } from '@/lib/errors/db';
import {
  UserPlus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Users,
  Lock,
  Phone,
  Calendar,
  Church,
  MapPin,
  Shield,
  HeartHandshake,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface CreateTraineeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  defaultGroupId?: number;
  onTraineeCreated?: (newTrainee: any) => void;
}

export default function CreateTraineeModal({
  isOpen,
  onClose,
  currentUser,
  defaultGroupId = 1,
  onTraineeCreated,
}: CreateTraineeModalProps) {
  const isAdminOrSuper = currentUser?.role_id === 'admin' || currentUser?.role_id === 'super_user';
  const isSecretariat = currentUser?.role_id === 'secretariat';
  const allowedGroupId = isSecretariat ? (currentUser?.group_id || 1) : defaultGroupId;

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [groupId, setGroupId] = useState<number>(allowedGroupId);
  const [birthDate, setBirthDate] = useState('2005-01-01');
  const [phone, setPhone] = useState('');
  const [confessionFather, setConfessionFather] = useState('');
  const [church, setChurch] = useState('كنيسة مارمرقس بالمنشية');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('Trainee123!');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setGroupId(isSecretariat ? (currentUser?.group_id || 1) : defaultGroupId);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, isSecretariat, currentUser?.group_id, defaultGroupId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Form Validations
    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanFullName) {
      setErrorMsg('الاسم بالكامل مطلوب.');
      return;
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMsg('اسم المستخدم يجب ألا يقل عن 3 أحرف إنجليزية.');
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
      setErrorMsg('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام ونقاط فقط بدون مسافات.');
      return;
    }

    if (!birthDate) {
      setErrorMsg('تاريخ الميلاد مطلوب.');
      return;
    }

    const targetGroup = isSecretariat ? (currentUser?.group_id || 1) : Number(groupId);

    setSaving(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.rpc('create_trainee_profile', {
        p_username: cleanUsername,
        p_full_name: cleanFullName,
        p_group_id: targetGroup,
        p_birth_date: birthDate,
        p_phone: phone.trim() || null,
        p_confession_father: confessionFather.trim() || null,
        p_church: church.trim() || null,
        p_address: address.trim() || null,
        p_password: password.trim() || 'Trainee123!',
      });

      if (error) throw error;

      if (data && data.success) {
        setSuccessMsg(`تم إنشاء حساب المتدرب ${cleanFullName} بنجاح!`);
        if (onTraineeCreated) {
          onTraineeCreated(data);
        }
        setTimeout(() => {
          onClose();
          // Reset fields
          setFullName('');
          setUsername('');
          setPhone('');
          setConfessionFather('');
          setAddress('');
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(explainDbError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div
        className="w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all border my-8"
        style={{
          backgroundColor: 'var(--bg-card, #0e182d)',
          borderColor: 'var(--border-card, #253556)',
          color: 'var(--text-primary, #f8fafc)',
        }}
      >
        {/* Modal Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#c29938]/15 border border-[#c29938]/30 text-[#c29938]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <span>إضافة متدرب جديد</span>
                <Sparkles className="w-3.5 h-3.5 text-[#c29938]" />
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSecretariat
                  ? `تسجيل متدرب جديد في فرقتك (${currentUser?.group_id === 1 ? 'الفرقة الأولى' : currentUser?.group_id === 2 ? 'الفرقة الثانية' : 'الفرقة الثالثة'})`
                  : 'إضافة وتفعيل حساب متدرب جديد في المدرسة'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/70 border border-rose-800/80 text-rose-200 rounded-2xl text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 rounded-2xl text-xs flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                الاسم بالكامل <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: كيرلس سمير إبراهيم"
                required
                className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#c29938]"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                اسم المستخدم (Username) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="kyrollos_samir"
                dir="ltr"
                required
                className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#c29938] font-mono text-right"
              />
            </div>

            {/* Group Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>الفرقة الدراسية <span className="text-rose-400">*</span></span>
                {isSecretariat && (
                  <span className="text-[10px] text-[#c29938] font-normal flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>مقفل لفرقتك</span>
                  </span>
                )}
              </label>
              {isSecretariat ? (
                <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-[#c29938] font-bold flex items-center justify-between">
                  <span>{currentUser?.group_id === 1 ? 'الفرقة الأولى' : currentUser?.group_id === 2 ? 'الفرقة الثانية' : 'الفرقة الثالثة'}</span>
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                </div>
              ) : (
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(Number(e.target.value))}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-[#c29938] font-bold focus:outline-none focus:border-[#c29938]"
                >
                  <option value={1}>الفرقة الأولى</option>
                  <option value={2}>الفرقة الثانية</option>
                  <option value={3}>الفرقة الثالثة</option>
                </select>
              )}
            </div>

            {/* Birth Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                تاريخ الميلاد <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#c29938]"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">رقم الهاتف</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01234567890"
                dir="ltr"
                className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#c29938] font-mono text-right"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">كلمة المرور الابتدائية</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Trainee123!"
                dir="ltr"
                className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#c29938] font-mono text-right"
              />
            </div>

            {/* Confession Father */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">أب الاعتراف</label>
              <input
                type="text"
                value={confessionFather}
                onChange={(e) => setConfessionFather(e.target.value)}
                placeholder="أبونا القس ..."
                className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#c29938]"
              />
            </div>

            {/* Church */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">الكنيسة</label>
              <input
                type="text"
                value={church}
                onChange={(e) => setChurch(e.target.value)}
                placeholder="كنيسة مارمرقس بالمنشية"
                className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#c29938]"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">العنوان / المنطقة</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="الشارع، الحي، المحافظة..."
              className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#c29938]"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#c29938] hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black transition-all shadow-lg flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إنشاء الحساب...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>إنشاء حساب المتدرب</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
