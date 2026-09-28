'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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

  // Form state for creating Section
  const [showAddSecModal, setShowAddSecModal] = useState(false);
  const [newSecTitle, setNewSecTitle] = useState('');

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

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

        // Fetch marathons for group
        const { data: mList } = await supabase
          .from('marathons')
          .select('*')
          .eq('group_id', prof.group_id)
          .order('created_at', { ascending: false });

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
        .order('order_index', { ascending: true });

      // 2. Fetch questions with options
      const { data: questions } = await supabase
        .from('marathon_questions')
        .select('*, marathon_answers(id, answer_text, is_correct)')
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

    const { data, error } = await supabase
      .from('marathon_sections')
      .insert({
        marathon_id: selectedMarathonId,
        title: newSecTitle.trim(),
        order_index: (selectedMarathon?.sections.length || 0) + 1,
      })
      .select()
      .single();

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

    // 1. Insert question (order = total questions + 1)
    const nextOrder = (selectedMarathon?.questions.length || 0) + 1;
    const { data: qData, error: qErr } = await supabase
      .from('marathon_questions')
      .insert({
        marathon_id: selectedMarathonId,
        section_id: newQSectionId || null,
        question_text: newQText.trim(),
        order_index: nextOrder,
      })
      .select()
      .single();

    if (qErr || !qData) {
      setNotice(`فشل إضافة السؤال: ${qErr?.message}`);
      return;
    }

    // 2. Insert options
    const optionsPayload = newQOptions
      .filter((opt) => opt.trim() !== '')
      .map((optText, idx) => ({
        question_id: qData.id,
        answer_text: optText.trim(),
        is_correct: idx === newQCorrectIdx,
        order_index: idx + 1,
      }));

    await supabase.from('marathon_answers').insert(optionsPayload);

    // Refresh questions
    setShowAddQModal(false);
    setNewQText('');
    setNewQOptions(['', '', '', '']);
    setNewQCorrectIdx(0);
    setNotice('تم إضافة السؤال وتوزيع الـ 100 درجة بالتساوي تلقائياً.');
  };

  // Handler for Selective Reopening of Question for Trainee
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/marathon"
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الماراثون</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-base text-karooz-gold">إدارة الماراثون والأسئلة</span>
            <div className="relative w-7 h-7">
              <Image src="/logo.png" alt="شعار مدرسة الكاروز" fill sizes="32px" className="object-contain" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Controls Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">
              اختر الماراثون للإدارة:
            </label>
            <select
              value={selectedMarathonId}
              onChange={(e) => setSelectedMarathonId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
            >
              {marathons.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('editor')}
              className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'editor'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الأسئلة والأقسام ({selectedMarathon?.questions.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'submissions'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              نتائج المتدربين ({submissions.length})
            </button>
          </div>
        </div>

        {notice && (
          <div className="p-3.5 bg-blue-950/60 border border-blue-800/60 text-blue-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* --- TAB 1: QUESTIONS & SECTIONS EDITOR --- */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400 font-bold bg-amber-950/50 border border-amber-800/40 px-3 py-1 rounded-lg">
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
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <FolderPlus className="w-4 h-4 text-amber-400" />
                  <span>إضافة قسم</span>
                </button>
                <button
                  onClick={() => setShowAddQModal(true)}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
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
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center font-mono">
                        {qIdx + 1}
                      </span>
                      <h4 className="font-bold text-sm text-white">{q.question_text}</h4>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                      {q.score_weight.toFixed(2)} درجة
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          opt.is_correct
                            ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span>
                          {oIdx + 1}. {opt.answer_text}
                        </span>
                        {opt.is_correct && (
                          <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded">
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
            <h3 className="font-bold text-base text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>نتائج ودرجات متدربي الفرقة ({submissions.length})</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="p-3">اسم المتدرب</th>
                    <th className="p-3">اسم المستخدم</th>
                    <th className="p-3 text-center">الدرجة الرقمية (100)</th>
                    <th className="p-3 text-center">التقدير</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center">إعادة فتح أسئلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="p-3 font-bold text-white text-sm">{sub.trainee_name}</td>
                      <td className="p-3 text-slate-400 font-mono">@{sub.username}</td>
                      <td className="p-3 text-center font-bold text-base text-white">
                        {sub.total_score}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/50">
                          {sub.appreciation_grade}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {sub.is_submitted ? (
                          <span className="text-emerald-400 font-semibold">مكتمل</span>
                        ) : (
                          <span className="text-amber-400 font-semibold">جاري الحل</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (selectedMarathon?.questions[0]) {
                              handleSelectiveReopen(sub.id, selectedMarathon.questions[0].id);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          title="إعادة فتح سؤال محدد"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>إعادة فتح</span>
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
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-white mb-4">إضافة سؤال جديد للماراثون</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">القسم</label>
                  <select
                    value={newQSectionId}
                    onChange={(e) => setNewQSectionId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">نص السؤال</label>
                  <textarea
                    rows={2}
                    value={newQText}
                    onChange={(e) => setNewQText(e.target.value)}
                    placeholder="اكتب نص السؤال هنا..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300">
                      الخيارات (اختر الإجابة الصحيحة)
                    </label>
                    {newQOptions.length === 4 && (
                      <button
                        type="button"
                        onClick={() => setNewQOptions([...newQOptions, ''])}
                        className="text-xs text-amber-400 hover:text-amber-300"
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
                          className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700"
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
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddQModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold"
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
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-3">إضافة قسم جديد</h3>
              <input
                type="text"
                value={newSecTitle}
                onChange={(e) => setNewSecTitle(e.target.value)}
                placeholder="عنوان القسم (مثال: أولاً: أسئلة العهد القديم)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white mb-4"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSecModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-5 py-2 rounded-xl bg-amber-600 text-slate-950 text-xs font-bold"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
