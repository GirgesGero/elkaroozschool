import { useEffect, useMemo, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { explainDbError } from '@/lib/errors/db';
import { phpApi } from '@/lib/api/php';
import { Paperclip, Loader2, FileText, Music, Upload } from 'lucide-react';
import { createCurriculumDay, createCurriculumEntry, publishCurriculumDay, updateCurriculumDay, updateCurriculumEntry } from '@/lib/curriculum/management';
import type { CurriculumDay, CurriculumEntry } from '@/types/curriculum';
import type { Profile } from '@/types/database';

interface Props {
  profile: Profile;
}

/**
 * Phase 1 operator surface. It intentionally does not delete legacy records;
 * archive/publish are explicit and all mutations still pass through Supabase
 * RLS plus the database's group-scope function.
 */
export default function CurriculumManagementPanel({ profile }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [days, setDays] = useState<CurriculumDay[]>([]);
  const [entries, setEntries] = useState<CurriculumEntry[]>([]);
  const [termId, setTermId] = useState('');
  const [terms, setTerms] = useState<Array<{ id: string; name_ar: string; academic_year: string }>>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [newDayTitle, setNewDayTitle] = useState('');
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayTitle, setEditingDayTitle] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryTitle, setEditingEntryTitle] = useState('');
  const [uploadingEntryId, setUploadingEntryId] = useState<string | null>(null);

  const load = async () => {
    const [termResult, dayResult] = await Promise.all([
      supabase.from('terms').select('id,name_ar,academic_year').eq('group_id', profile.group_id).is('deleted_at', null).order('created_at'),
      supabase.from('curriculum_days').select('*').eq('group_id', profile.group_id).order('sort_order'),
    ]);
    if (termResult.error) setError(explainDbError(termResult.error));
    if (dayResult.error) setError(explainDbError(dayResult.error));
    setTerms((termResult.data || []) as typeof terms);
    setDays((dayResult.data || []) as CurriculumDay[]);
    if (!termId && termResult.data?.[0]) setTermId(termResult.data[0].id);
  };

  const loadEntries = async (dayId: string) => {
    const { data, error: queryError } = await supabase.from('curriculum_entries').select('*').eq('day_id', dayId).order('sort_order');
    if (queryError) setError(explainDbError(queryError));
    setEntries((data || []) as CurriculumEntry[]);
  };

  useEffect(() => {
    let cancelled = false;
    const resolveAccess = async () => {
      const baseAllowed = profile.role_id === 'admin' || profile.role_id === 'super_user' || profile.role_id === 'secretariat';
      let allowed = baseAllowed;
      if (profile.role_id === 'servant') {
        const [curriculumPermission, lecturePermission] = await Promise.all([
          supabase.rpc('has_servant_permission', { perm_id: 'MANAGE_CURRICULUM' }),
          supabase.rpc('has_servant_permission', { perm_id: 'MANAGE_LECTURES' }),
        ]);
        allowed = Boolean(curriculumPermission.data || lecturePermission.data);
      }
      if (cancelled) return;
      setCanManage(allowed);
      setCheckingAccess(false);
      if (allowed) void load();
    };
    void resolveAccess();
    return () => { cancelled = true; };
  }, [profile.id, profile.group_id, profile.role_id]);
  useEffect(() => { if (selectedDay && canManage) void loadEntries(selectedDay); }, [selectedDay, canManage]);

  if (checkingAccess || !canManage) return null;

  const addDay = async () => {
    if (!termId) return setError('اختر الترم أولاً.');
    setBusy(true); setError(null);
    try {
      const maxDay = days.filter((d) => d.term_id === termId).reduce((n, d) => Math.max(n, d.day_number), 0);
      const day = await createCurriculumDay(supabase, {
        term_id: termId, group_id: profile.group_id, day_number: maxDay + 1,
        title: newDayTitle.trim() || `اليوم الدراسي ${maxDay + 1}`, study_date: null, sort_order: maxDay + 1,
      });
      setDays((current) => [...current, day]);
      setNewDayTitle(''); setNotice('تم حفظ اليوم كمسودة.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إضافة اليوم.'); }
    finally { setBusy(false); }
  };

  const addEntry = async () => {
    if (!selectedDay || !newEntryTitle.trim()) return setError('اختر يومًا واكتب عنوان المحاضرة.');
    setBusy(true); setError(null);
    try {
      const next = entries.length + 1;
      const entry = await createCurriculumEntry(supabase, {
        day_id: selectedDay, group_id: profile.group_id, title: newEntryTitle.trim(),
        description: null, lecturer_id: null, sort_order: next,
      });
      setEntries((current) => [...current, entry]); setNewEntryTitle(''); setNotice('تم حفظ المحاضرة كمسودة.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إضافة المحاضرة.'); }
    finally { setBusy(false); }
  };

  const handleUploadAttachment = async (entryId: string, file: File) => {
    setUploadingEntryId(entryId);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('يرجى تسجيل الدخول');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder_type', 'curriculum');
      formData.append('group_id', String(profile.group_id));
      formData.append('resource_type', file.type.startsWith('audio/') ? 'LECTURE_AUDIO' : 'LECTURE_ATTACHMENT');
      formData.append('resource_id', entryId);
      const res = await phpApi<{ file_url: string; filename: string; file_size: number; mime_type: string; asset_id: string }>('/storage/upload', {
        formData,
        session
      });
      if (res?.file_url) {
        const currentEntry = entries.find((e) => e.id === entryId);
        const existingMeta = (currentEntry?.content_metadata as Record<string, any>) || {};
        const existingAttachments = Array.isArray(existingMeta.attachments) ? existingMeta.attachments : [];
        const newAttachment = {
          asset_id: res.asset_id,
          name: res.filename,
          url: res.file_url,
          size: res.file_size,
          mime: res.mime_type
        };
        const updatedMeta = { ...existingMeta, attachments: [...existingAttachments, newAttachment] };
        await updateCurriculumEntry(supabase, entryId, { content_metadata: updatedMeta });
        setEntries((current) => current.map((e) => e.id === entryId ? { ...e, content_metadata: updatedMeta } : e));
        setNotice(`تم رفع المرفق (${res.filename}) وحفظه في Google Drive.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر رفع المرفق.');
    } finally {
      setUploadingEntryId(null);
    }
  };

  const publish = async (dayId: string) => {
    setBusy(true); setError(null);
    try {
      const day = await publishCurriculumDay(supabase, dayId);
      setDays((current) => current.map((item) => item.id === day.id ? day : item));
      await loadEntries(dayId); setNotice('تم نشر اليوم ومحاضراته.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر نشر اليوم.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-canvas p-5 shadow-xl" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div><h2 className="text-base font-black text-content">إدارة المنهج الديناميكي</h2><p className="mt-1 text-xs text-content-muted">أيام ومحاضرات غير محدودة — مسودة ثم نشر</p></div>
        <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-bold text-gold">الفرقة {profile.group_id}</span>
      </div>
      {notice && <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-xs font-bold text-success">{notice}</div>}
      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-bold text-danger">{error}</div>}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select value={termId} onChange={(e) => setTermId(e.target.value)} className="min-h-[44px] rounded-xl border border-line bg-nav px-3 text-xs text-content">
          <option value="">اختر الترم</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.name_ar} — {term.academic_year}</option>)}
        </select>
        <input value={newDayTitle} onChange={(e) => setNewDayTitle(e.target.value)} placeholder="عنوان اليوم (اختياري)" className="min-h-[44px] rounded-xl border border-line bg-nav px-3 text-xs text-content" />
        <button disabled={busy} onClick={addDay} className="min-h-[44px] rounded-xl bg-gold px-4 text-xs font-black text-brand-on disabled:opacity-50">إضافة يوم</button>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-2">
          {days.filter((day) => !termId || day.term_id === termId).map((day) => (
            <button key={day.id} onClick={() => { setSelectedDay(day.id); void loadEntries(day.id); }} className={`w-full rounded-2xl border p-3 text-start ${selectedDay === day.id ? 'border-gold bg-gold/10' : 'border-line bg-nav'}`}>
              <span className="block text-sm font-black text-content">اليوم {day.day_number} · {day.title || 'بدون عنوان'}</span>
              <span className="mt-1 block text-[11px] text-content-muted">{day.status === 'PUBLISHED' ? 'منشور' : 'مسودة'} · ترتيب {day.sort_order}</span>
              {editingDayId === day.id ? (
                <span className="mt-2 flex gap-2" onClick={(event) => event.stopPropagation()}>
                  <input value={editingDayTitle} onChange={(event) => setEditingDayTitle(event.target.value)} className="min-h-[40px] flex-1 rounded-lg border border-line bg-canvas px-2 text-xs text-content" />
                  <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { const updated = await updateCurriculumDay(supabase, day.id, { title: editingDayTitle.trim() || null }); setDays((current) => current.map((item) => item.id === updated.id ? updated : item)); setEditingDayId(null); setNotice('تم تعديل اليوم.'); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تعديل اليوم.'); } finally { setBusy(false); } }} className="min-h-[40px] rounded-lg bg-gold px-3 text-[11px] font-black text-brand-on">حفظ</button>
                </span>
              ) : (
                <span className="mt-2 block text-start text-[11px] font-bold text-gold underline" onClick={(event) => { event.stopPropagation(); setEditingDayId(day.id); setEditingDayTitle(day.title || ''); }}>تعديل اسم اليوم</span>
              )}
            </button>
          ))}
        </div>
        <div className="space-y-3 rounded-2xl border border-line bg-nav p-4">
          {selectedDay ? <>
            <div className="flex flex-wrap items-center gap-2"><input value={newEntryTitle} onChange={(e) => setNewEntryTitle(e.target.value)} placeholder="عنوان المحاضرة الجديدة" className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-xs text-content" /><button disabled={busy} onClick={addEntry} className="min-h-[44px] rounded-xl border border-gold bg-gold/15 px-4 text-xs font-black text-gold">إضافة محاضرة</button></div>
            {entries.map((entry) => {
              const meta = (entry.content_metadata as Record<string, any>) || {};
              const atts = Array.isArray(meta.attachments) ? meta.attachments : [];
              return (
                <div key={entry.id} className="flex flex-col gap-2 rounded-xl border border-line bg-canvas p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-content">{entry.sort_order}. {entry.title}</span>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer text-gold hover:text-warning flex items-center gap-1 text-[11px] font-bold">
                        {uploadingEntryId === entry.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Paperclip className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingEntryId === entry.id ? 'جاري الرفع...' : 'إرفاق ملف'}</span>
                        <input
                          type="file"
                          className="hidden"
                          disabled={uploadingEntryId === entry.id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadAttachment(entry.id, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-content-muted">{entry.status === 'PUBLISHED' ? 'منشور' : 'مسودة'}</span>
                    </div>
                  </div>
                  {atts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-line/40">
                      {atts.map((att: any, i: number) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-nav border border-line text-[10px] text-content hover:border-gold"
                        >
                          {att.mime?.startsWith('audio/') ? <Music className="w-2.5 h-2.5 text-warning" /> : <FileText className="w-2.5 h-2.5 text-gold" />}
                          <span className="truncate max-w-[150px]">{att.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <button disabled={busy} onClick={() => void publish(selectedDay)} className="min-h-[44px] w-full rounded-xl bg-success px-4 text-xs font-black text-brand-on disabled:opacity-50">نشر اليوم والمحاضرات</button>
          </> : <p className="py-8 text-center text-xs text-content-muted">اختر يومًا لإدارة محاضراته.</p>}
        </div>
      </div>
    </section>
  );
}
