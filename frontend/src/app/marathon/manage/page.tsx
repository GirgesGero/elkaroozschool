'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SmartHeader from '@/components/SmartHeader';
import SmartBottomNav from '@/components/SmartBottomNav';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import UnifiedProfileModal from '@/components/UnifiedProfileModal';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Edit,
  Eye,
  FolderPlus,
  HelpCircle,
  Plus,
  RotateCcw,
  Save,
  Trophy,
  Users,
} from 'lucide-react';
import type { Profile } from '@/types/database';
import { phpApi } from '@/lib/api/php';
import { Paperclip, Loader2 } from 'lucide-react';

interface MarathonDetail {
  id: string;
  title: string;
  group_id: number;
  total_score: number;
  is_active: boolean;
  sections: Array<{ id: string; title: string }>;
  questions: Array<{
    id: string;
    section_id: string;
    question_text: string;
    order_index: number;
    score_weight: number;
    options: Array<{ id: string; answer_text: string; is_correct: boolean }>;
  }>;
}

interface SubmissionRow {
  id: string;
  trainee_id: string;
  trainee_name: string;
  username: string;
  total_score: number;
  appreciation_grade: string;
  is_submitted: boolean;
}

export default function MarathonManagePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [marathons, setMarathons] = useState<any[]>([]);
  const [selectedMarathonId, setSelectedMarathonId] = useState<string>('');
  const [selectedMarathon, setSelectedMarathon] = useState<MarathonDetail | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'submissions'>('editor');

  // Form states for creating Question
  const [showAddQModal, setShowAddQModal] = useState(false);
  const [newQSectionId, setNewQSectionId] = useState('');
  const [newQText, setNewQText] = useState('');
  const [newQOptions, setNewQOptions] = useState<string[]>(['', '', '', '']); // 4 default
  const [newQCorrectIdx, setNewQCorrectIdx] = useState<number>(0);
  const [selectedReopenQuestionId, setSelectedReopenQuestionId] = useState<string>('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isUploadingQAttachment, setIsUploadingQAttachment] = useState(false);

  const handleUploadQuestionAttachment = async (file: File) => {
    setIsUploadingQAttachment(true);
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('يرجى تسجيل الدخول');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder_type', 'general');
      formData.append('group_id', String(profile?.group_id || 1));
      formData.append('resource_type', 'GENERAL');
      const res = await phpApi<{ file_url: string; filename: string }>('/storage/upload', {
        formData,
        session
      });
      if (res?.file_url) {
        setNewQText((prev) => (prev ? prev + '\n' : '') + `[مرفق: ${res.filename}](${res.file_url})`);
        setNotice(`تم رفع مرفق السؤال (${res.filename}) إلى Google Drive.`);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'تعذر رفع المرفق');
    } finally {
      setIsUploadingQAttachment(false);
    }
  };

  // Form state for creating Section
  const [showAddSecModal, setShowAddSecModal] = useState(false);
  const [newSecTitle, setNewSecTitle] = useState('');

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        const prof = userProfile as Profile;
        setProfile(prof);

        // Fetch marathons (scoped to group if user is assigned to one, otherwise all)
        let mQuery = supabase.from('marathons').select('*');
        if (prof.group_id) {
          mQuery = mQuery.eq('group_id', prof.group_id);
        }
        const { data: mList } = await mQuery.order('created_at', { ascending: false });

        if (mList && mList.length > 0) {
          setMarathons(mList);
          setSelectedMarathonId(mList[0].id);
        }
      }
      setLoading(false);
    }

    init();
  }, [router]);

  useEffect(() => {
    if (!selectedMarathonId) return;

    async function loadMarathonDetails() {
      const supabase = createClient();

      // 1. Fetch sections
      const { data: sections } = await supabase
        .from('marathon_sections')
        .select('*')
        .eq('marathon_id', selectedMarathonId)
        .eq('status', 'PUBLISHED')
        .order('order_index', { ascending: true });

      // 2. Fetch questions with options
      const { data: questions } = await supabase
        .from('marathon_questions')
        .select('id, marathon_id, section_id, question_text, question_type, score_weight, order_index, status, marathon_answers(id, answer_text, is_correct, order_index)')
        .eq('marathon_id', selectedMarathonId)
        .order('order_index', { ascending: true });

      const mappedQ = (questions || []).map((q: any) => ({
        ...q,
        options: q.marathon_answers || [],
      }));

      setSelectedMarathon({
        id: selectedMarathonId,
        title: marathons.find((m) => m.id === selectedMarathonId)?.title || '',
        group_id: profile?.group_id || 1,
        total_score: 100,
        is_active: true,
        sections: sections || [],
        questions: mappedQ,
      });

      // 3. Fetch submissions
      const { data: subs } = await supabase
        .from('marathon_trainee_submissions')
        .select('*, profiles(full_name, username)')
        .eq('marathon_id', selectedMarathonId)
        .order('total_score', { ascending: false });

      if (subs) {
        const mappedSubs: SubmissionRow[] = subs.map((s: any) => ({
          id: s.id,
          trainee_id: s.trainee_id,
          trainee_name: s.profiles?.full_name || 'متدرب',
          username: s.profiles?.username || '',
          total_score: s.total_score,
          appreciation_grade: s.appreciation_grade,
          is_submitted: s.is_submitted,
        }));
        setSubmissions(mappedSubs);
      }
    }

    loadMarathonDetails();
  }, [selectedMarathonId, marathons, profile]);

  // Handler to add section
  const handleAddSection = async () => {
    if (!newSecTitle.trim() || !selectedMarathonId) return;
    const supabase = createClient();

    const { data: sectionId, error } = await supabase.rpc('create_marathon_section', {
      p_marathon_id: selectedMarathonId,
      p_title: newSecTitle.trim(),
    });
    const { data } = sectionId ? await supabase
      .from('marathon_sections')
      .select('*')
      .eq('id', sectionId)
      .single() : { data: null };

    if (!error && data) {
      setSelectedMarathon((prev) =>
        prev ? { ...prev, sections: [...prev.sections, data] } : prev
      );
      setNewSecTitle('');
      setShowAddSecModal(false);
      setNotice('تم إضافة القسم بنجاح.');
    }
  };

  // Handler to add question
  const handleAddQuestion = async () => {
    if (!newQText.trim() || !selectedMarathonId) return;
    const supabase = createClient();

    // 1. Validate before creating a question. The old handler inserted the
    // question, then ignored option-insert failures, leaving an unusable item.
    const cleanOptions = newQOptions.map((item) => item.trim()).filter(Boolean);
    if (newQCorrectIdx < 0 || newQCorrectIdx >= newQOptions.length || !newQOptions[newQCorrectIdx]?.trim()) {
      setNotice('حدد إجابة صحيحة غير فارغة.');
      return;
    }
    if (cleanOptions.length < 2) {
      setNotice('أدخل خيارين صحيحين على الأقل وحدد إجابة صحيحة واحدة.');
      return;
    }
    const optionsPayload = cleanOptions.map((optText, idx) => ({
      answer_text: optText,
      is_correct: optText === newQOptions[newQCorrectIdx]?.trim(),
      order_index: idx + 1,
    }));
    const { error: qErr } = await supabase.rpc('create_marathon_question', {
      p_marathon_id: selectedMarathonId,
      p_section_id: newQSectionId || null,
      p_question_text: newQText.trim(),
      p_options: optionsPayload,
    });
    if (qErr) {
      setNotice(`فشل إضافة السؤال: ${qErr.message}`);
      return;
    }

    // Refresh questions
    setShowAddQModal(false);
    setNewQText('');
    setNewQOptions(['', '', '', '']);
    setNewQCorrectIdx(0);
    setNotice('تم إضافة السؤال وتوزيع الـ 100 درجة بالتساوي تلقائياً.');
  };

  const handleArchiveQuestion = async (questionId: string) => {
    const supabase = createClient();
    const { error } = await supabase.rpc('archive_marathon_question', { p_question_id: questionId });
    if (error) {
      setNotice(`فشل أرشفة السؤال: ${error.message}`);
      return;
    }
    setSelectedMarathon((prev) => prev ? {
      ...prev,
      questions: prev.questions.filter((question) => question.id !== questionId),
    } : prev);
    setNotice('تمت أرشفة السؤال. المحاولات القديمة محفوظة.');
  };

  const handleSelectiveReopen = async (submissionId: string, questionId: string) => {
    const supabase = createClient();
    const { error } = await supabase.rpc('reopen_marathon_question', {
      p_submission_id: submissionId,
      p_question_id: questionId,
    });

    if (!error) {
      setNotice('تم إعادة فتح السؤال للمتدرب لإعادة المحاولة بنجاح.');
    } else {
      setNotice(`فشل إعادة الفتح: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-content flex flex-col selection:bg-gold selection:text-content" dir="rtl">
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

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6 pb-28 md:pb-12">
        {/* Controls Header */}
        <div className="bg-nav border border-line rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-bold text-content-muted mb-1.5">
              اختر الماراثون للإدارة:
            </label>
            <select
              value={selectedMarathonId}
              onChange={(e) => setSelectedMarathonId(e.target.value)}
              className="bg-nav border border-line text-content text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-warning font-bold"
            >
              {marathons.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex bg-nav p-1 rounded-xl border border-line">
            <button
              onClick={() => setActiveTab('editor')}
              className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'editor'
                  ? 'bg-warning text-content shadow'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              الأسئلة والأقسام ({selectedMarathon?.questions.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'submissions'
                  ? 'bg-warning text-content shadow'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              نتائج المتدربين ({submissions.length})
            </button>
          </div>
        </div>

        {notice && (
          <div className="p-3.5 bg-canvas/60 border border-line-subtle/60 text-info rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-info flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* --- TAB 1: QUESTIONS & SECTIONS EDITOR --- */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-warning font-bold bg-canvas/50 border border-warning/40 px-3 py-1 rounded-lg">
                  القانون: 100 درجة موزعة بالتساوي (
                  {selectedMarathon?.questions.length
                    ? (100 / selectedMarathon.questions.length).toFixed(2)
                    : 0}{' '}
                  درجة/سؤال)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddSecModal(true)}
                  className="bg-nav hover:bg-input text-content px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-line"
                >
                  <FolderPlus className="w-4 h-4 text-warning" />
                  <span>إضافة قسم</span>
                </button>
                <button
                  onClick={() => setShowAddQModal(true)}
                  className="bg-warning hover:bg-warning text-content px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة سؤال</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {selectedMarathon?.questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="bg-nav border border-line rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-nav text-warning text-xs font-bold flex items-center justify-center font-mono">
                        {qIdx + 1}
                      </span>
                      <h4 className="font-bold text-sm text-content">{q.question_text}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-content-muted bg-nav px-2.5 py-0.5 rounded border border-line">
                        {q.score_weight.toFixed(2)} درجة
                      </span>
                      <button type="button" onClick={() => void handleArchiveQuestion(q.id)} className="rounded-lg border border-danger/40 px-2 py-1 text-[10px] font-bold text-danger hover:bg-danger/10">أرشفة</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          opt.is_correct
                            ? 'bg-canvas/40 border-success/60 text-success font-semibold'
                            : 'bg-nav/60 border-line text-content-muted'
                        }`}
                      >
                        <span>
                          {oIdx + 1}. {opt.answer_text}
                        </span>
                        {opt.is_correct && (
                          <span className="text-[10px] bg-canvas/60 text-success px-1.5 py-0.5 rounded">
                            الصحيحة
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 2: SUBMISSIONS & SELECTIVE REOPEN --- */}
        {activeTab === 'submissions' && (
          <div className="bg-nav border border-line rounded-2xl p-5 shadow-md">
            <h3 className="font-bold text-base text-content mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-warning" />
              <span>نتائج ودرجات متدربي الفرقة ({submissions.length})</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-nav/80 text-content-muted border-b border-line font-semibold">
                  <tr>
                    <th className="p-3">اسم المتدرب</th>
                    <th className="p-3">اسم المستخدم</th>
                    <th className="p-3 text-center">الدرجة الرقمية (100)</th>
                    <th className="p-3 text-center">التقدير</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center">إعادة فتح أسئلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle/60">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-nav/40 transition-colors">
                      <td className="p-3 font-bold text-content text-sm">{sub.trainee_name}</td>
                      <td className="p-3 text-content-muted font-mono">@{sub.username}</td>
                      <td className="p-3 text-center font-bold text-base text-content">
                        {sub.total_score}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-canvas/60 text-warning border border-warning/50">
                          {sub.appreciation_grade}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {sub.is_submitted ? (
                          <span className="text-success font-semibold">مكتمل</span>
                        ) : (
                          <span className="text-warning font-semibold">جاري الحل</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <select
                          value={selectedReopenQuestionId}
                          onChange={(e) => setSelectedReopenQuestionId(e.target.value)}
                          className="mb-2 max-w-44 bg-nav border border-line rounded-lg px-2 py-1 text-xs text-content"
                        >
                          <option value="">اختر السؤال</option>
                          {selectedMarathon?.questions.map((question, index) => (
                            <option key={question.id} value={question.id}>السؤال {index + 1}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            if (selectedReopenQuestionId) {
                              handleSelectiveReopen(sub.id, selectedReopenQuestionId);
                            }
                          }}
                          className="p-1.5 bg-nav hover:bg-input text-content-secondary rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          title="إعادة فتح السؤال الأول"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-warning" />
                          <span>إعادة فتح السؤال المحدد</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Question */}
        {showAddQModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-nav border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-content mb-4">إضافة سؤال جديد للماراثون</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-content-secondary mb-1">القسم</label>
                  <select
                    value={newQSectionId}
                    onChange={(e) => setNewQSectionId(e.target.value)}
                    className="w-full bg-nav border border-line rounded-xl px-3.5 py-2 text-sm text-content"
                  >
                    <option value="">بدون قسم</option>
                    {selectedMarathon?.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-content-secondary">نص السؤال</label>
                    <label className="cursor-pointer text-xs text-gold hover:text-warning flex items-center gap-1 font-bold">
                      {isUploadingQAttachment ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Paperclip className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploadingQAttachment ? 'جاري الرفع...' : 'إرفاق ملف / صورة'}</span>
                      <input
                        type="file"
                        className="hidden"
                        disabled={isUploadingQAttachment}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadQuestionAttachment(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={newQText}
                    onChange={(e) => setNewQText(e.target.value)}
                    placeholder="اكتب نص السؤال هنا..."
                    className="w-full bg-nav border border-line rounded-xl p-3 text-sm text-content focus:ring-2 focus:ring-warning"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-content-secondary">
                      الخيارات (اختر الإجابة الصحيحة)
                    </label>
                    {newQOptions.length === 4 && (
                      <button
                        type="button"
                        onClick={() => setNewQOptions([...newQOptions, ''])}
                        className="text-xs text-warning hover:text-warning"
                      >
                        + خيار خامس
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {newQOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct_option"
                          checked={newQCorrectIdx === idx}
                          onChange={() => setNewQCorrectIdx(idx)}
                          className="w-4 h-4 text-warning bg-nav border-line"
                          title="تحديد كإجابة صحيحة"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newQOptions];
                            updated[idx] = e.target.value;
                            setNewQOptions(updated);
                          }}
                          placeholder={`الخيار ${idx + 1}`}
                          className="flex-1 bg-nav border border-line rounded-xl px-3 py-2 text-xs text-content"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddQModal(false)}
                  className="px-4 py-2 rounded-xl bg-nav text-content-muted text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-5 py-2 rounded-xl bg-warning hover:bg-warning text-content text-xs font-bold"
                >
                  حفظ السؤال
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Section */}
        {showAddSecModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-nav border border-line rounded-2xl max-w-sm w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-content mb-3">إضافة قسم جديد</h3>
              <input
                type="text"
                value={newSecTitle}
                onChange={(e) => setNewSecTitle(e.target.value)}
                placeholder="عنوان القسم (مثال: أولاً: أسئلة العهد القديم)"
                className="w-full bg-nav border border-line rounded-xl p-3 text-sm text-content mb-4"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSecModal(false)}
                  className="px-4 py-2 rounded-xl bg-nav text-content-muted text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-5 py-2 rounded-xl bg-warning text-content text-xs font-bold"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Smart Contextual Bottom Navigation */}
      <SmartBottomNav
        profile={profile}
        onOpenProfile={(id) => setSelectedProfileId(id)}
      />
    </div>
  );
}
