'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Loader2,
  Lock,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface AnswerOption {
  id: string;
  answer_text: string;
  is_correct?: boolean;
}

interface QuestionItem {
  id: string;
  section_id: string;
  question_text: string;
  order_index: number;
  section_title?: string;
  options: AnswerOption[];
}

export default function MarathonPlayerPage() {
  const params = useParams();
  const marathonId = params.id as string;
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [marathonTitle, setMarathonTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answersMap, setAnswersMap] = useState<Map<string, any>>(new Map());
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadMarathon() {
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
        setProfile(userProfile as Profile);

        // Fetch marathon info
        const { data: mData } = await supabase
          .from('marathons')
          .select('title')
          .eq('id', marathonId)
          .single();

        if (mData) setMarathonTitle(mData.title);

        // Fetch sections & questions
        const { data: qData } = await supabase
          .from('marathon_questions')
          .select('*, marathon_sections(title), marathon_answers(id, answer_text, is_correct)')
          .eq('marathon_id', marathonId)
          .order('order_index', { ascending: true });

        if (qData) {
          const mappedQ: QuestionItem[] = qData.map((q: any) => ({
            id: q.id,
            section_id: q.section_id,
            question_text: q.question_text,
            order_index: q.order_index,
            section_title: q.marathon_sections?.title,
            options: q.marathon_answers || [],
          }));
          setQuestions(mappedQ);

          // Fetch Trainee state & answers
          const { data: state } = await supabase.rpc('get_trainee_marathon_state', {
            p_marathon_id: marathonId,
            p_trainee_id: user.id,
          });

          if (state) {
            setIsCompleted(state.is_completed || false);
            const ansMap = new Map();
            if (state.answers) {
              state.answers.forEach((a: any) => ansMap.set(a.question_id, a));
            }
            setAnswersMap(ansMap);

            // Set current question index to next unanswered question
            if (!state.is_completed) {
              const firstUnanswered = mappedQ.findIndex((q) => !ansMap.has(q.id) || ansMap.get(q.id).is_reopened);
              if (firstUnanswered !== -1) {
                setCurrentQIndex(firstUnanswered);
              }
            }
          }
        }
      }
      setLoading(false);
    }

    loadMarathon();
  }, [marathonId, router]);

  const currentQ = questions[currentQIndex];
  const currentAnswer = currentQ ? answersMap.get(currentQ.id) : null;
  const isQuestionAnswered = !!currentAnswer && !currentAnswer.is_reopened;
  const progressPercentage = questions.length > 0 ? Math.round((answersMap.size / questions.length) * 100) : 0;

  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || !currentQ) return;
    setSubmitting(true);
    setErrorMsg(null);
    const supabase = createClient();

    const { data: res, error } = await supabase.rpc('submit_marathon_answer', {
      p_marathon_id: marathonId,
      p_question_id: currentQ.id,
      p_selected_answer_id: selectedOptionId,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      // Update answers map
      setAnswersMap((prev) => {
        const next = new Map(prev);
        next.set(currentQ.id, {
          question_id: currentQ.id,
          selected_answer_id: selectedOptionId,
          is_reopened: false,
        });
        return next;
      });

      setSelectedOptionId(null);

      // Check if marathon completed
      if (res?.is_completed || currentQIndex + 1 >= questions.length) {
        setIsCompleted(true);
      } else {
        setCurrentQIndex((prev) => prev + 1);
      }
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/marathon"
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>قائمة الماراثون</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-amber-400 truncate max-w-xs">{marathonTitle}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Progress Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>التقدم الإجمالي: {progressPercentage}%</span>
            </div>
            <span className="text-xs text-slate-400">
              {answersMap.size} من {questions.length} أسئلة مجابة
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mb-4">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Question Step Indicators */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {questions.map((q, idx) => {
              const isAnswered = answersMap.has(q.id) && !answersMap.get(q.id).is_reopened;
              const isCurrent = idx === currentQIndex;
              return (
                <button
                  key={q.id}
                  disabled={!isCompleted && !isAnswered && idx > answersMap.size}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center ${
                    isCurrent
                      ? 'ring-2 ring-amber-400 bg-amber-500 text-slate-950 shadow'
                      : isAnswered
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-500 opacity-60'
                  }`}
                  title={`سؤال ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-950/70 border border-rose-800/60 text-rose-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* --- QUESTION CARD --- */}
        {currentQ && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between flex-1">
            <div>
              {/* Section Header */}
              {currentQ.section_title && (
                <div className="inline-block px-3 py-1 bg-amber-950/50 border border-amber-800/40 text-amber-300 rounded-lg text-xs font-bold mb-3">
                  {currentQ.section_title}
                </div>
              )}

              {/* Question Text */}
              <div className="flex items-start gap-3 mb-6">
                <span className="w-8 h-8 rounded-xl bg-slate-800 text-amber-400 font-mono font-bold flex items-center justify-center flex-shrink-0 text-sm border border-slate-700">
                  {currentQIndex + 1}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                  {currentQ.question_text}
                </h2>
              </div>

              {/* Options List (4 or 5 options) */}
              <div className="space-y-3 mb-6">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = selectedOptionId === opt.id || (isQuestionAnswered && currentAnswer?.selected_answer_id === opt.id);
                  const isCorrectOption = isCompleted && opt.is_correct;

                  return (
                    <label
                      key={opt.id}
                      className={`w-full p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isQuestionAnswered
                          ? isSelected
                            ? isCompleted && opt.is_correct
                              ? 'bg-emerald-950/50 border-emerald-600 text-white'
                              : isCompleted && !opt.is_correct
                              ? 'bg-rose-950/40 border-rose-600 text-white'
                              : 'bg-slate-800/80 border-slate-600 text-white'
                            : isCorrectOption
                            ? 'bg-emerald-950/30 border-emerald-500/80 text-emerald-300'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 opacity-80 cursor-not-allowed'
                          : isSelected
                          ? 'bg-amber-950/40 border-amber-500 text-white ring-1 ring-amber-500 shadow-md'
                          : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`question_${currentQ.id}`}
                          value={opt.id}
                          disabled={isQuestionAnswered || submitting}
                          checked={isSelected}
                          onChange={() => setSelectedOptionId(opt.id)}
                          className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
                        />
                        <span className="text-sm font-medium">{opt.answer_text}</span>
                      </div>

                      {isCompleted && (
                        <div>
                          {isCorrectOption && (
                            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>الإجابة الصحيحة</span>
                            </span>
                          )}
                          {isSelected && !opt.is_correct && (
                            <span className="text-xs text-rose-400 font-bold flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              <span>إجابتك</span>
                            </span>
                          )}
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bottom Navigation & Submit Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
              <button
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex((prev) => prev - 1)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold disabled:opacity-30 transition-colors flex items-center gap-1"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <div>
                {!isQuestionAnswered ? (
                  <button
                    disabled={!selectedOptionId || submitting}
                    onClick={handleSubmitAnswer}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/40 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>تثبيت الإجابة والانتقال</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>الإجابة مثبتة</span>
                    </span>
                    {currentQIndex + 1 < questions.length && (
                      <button
                        onClick={() => setCurrentQIndex((prev) => prev + 1)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <span>التالي</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {isCompleted && (
          <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-800/50 rounded-2xl p-5 text-center shadow-lg">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white mb-1">تم إكمال الماراثون بنجاح (100%)</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              يمكنك مراجعة جميع إجاباتك والإجابات الصحيحة في أي وقت عبر النقر على أرقام الأسئلة أعلاه.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
