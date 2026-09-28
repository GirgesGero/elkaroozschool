'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  FileCheck,
  GraduationCap,
  Save,
  Trophy,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface ExamItem {
  id: string;
  term_id: string;
  group_id: number;
  title: string;
  max_score: number;
  exam_date: string;
}

interface TraineeGradeRow {
  trainee_id: string;
  full_name: string;
  username: string;
  numeric_score: number | string;
  appreciation_grade: string | null;
}

export default function ExamsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [exam, setExam] = useState<ExamItem | null>(null);
  const [traineeGrades, setTraineeGrades] = useState<TraineeGradeRow[]>([]);
  const [personalGrade, setPersonalGrade] = useState<any>(null);
  const [canGrade, setCanGrade] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

        // Check if servant has GRADE_EXAMS or is Admin/Super User
        let hasGradePerm = ['admin', 'super_user'].includes(prof.role_id);
        if (prof.role_id === 'servant') {
          const { data: perm } = await supabase
            .from('servant_permissions')
            .select('*')
            .eq('profile_id', prof.id)
            .eq('permission_id', 'GRADE_EXAMS')
            .single();
          if (perm) hasGradePerm = true;
        }
        setCanGrade(hasGradePerm);

        // Fetch Exam for user's group
        const { data: examsList } = await supabase
          .from('exams')
          .select('*')
          .eq('group_id', prof.group_id)
          .single();

        if (examsList) {
          setExam(examsList);

          if (prof.role_id === 'trainee') {
            // Fetch personal grade
            const { data: grade } = await supabase
              .from('exam_grades')
              .select('*')
              .eq('exam_id', examsList.id)
              .eq('trainee_id', prof.id)
              .single();
            if (grade) setPersonalGrade(grade);
          } else if (hasGradePerm) {
            // Load all trainees and their grades for staff
            const { data: trainees } = await supabase
              .from('profiles')
              .select('id, full_name, username')
              .eq('group_id', prof.group_id)
              .eq('role_id', 'trainee')
              .eq('is_active', true)
              .order('full_name', { ascending: true });

            const { data: grades } = await supabase
              .from('exam_grades')
              .select('trainee_id, numeric_score, appreciation_grade')
              .eq('exam_id', examsList.id);

            const gradeMap = new Map();
            if (grades) {
              grades.forEach((g: any) =>
                gradeMap.set(g.trainee_id, {
                  score: g.numeric_score,
                  appreciation: g.appreciation_grade,
                })
              );
            }

            if (trainees) {
              const rows: TraineeGradeRow[] = trainees.map((t: any) => ({
                trainee_id: t.id,
                full_name: t.full_name,
                username: t.username,
                numeric_score: gradeMap.get(t.id)?.score ?? '',
                appreciation_grade: gradeMap.get(t.id)?.appreciation ?? null,
              }));
              setTraineeGrades(rows);
            }
          }
        }
      }
      setLoading(false);
    }

    init();
  }, [router]);

  const handleScoreChange = (traineeId: string, scoreStr: string) => {
    setTraineeGrades((prev) =>
      prev.map((r) => (r.trainee_id === traineeId ? { ...r, numeric_score: scoreStr } : r))
    );
  };

  const handleSaveGrade = async (traineeId: string, score: number) => {
    if (!exam) return;
    setSaving(true);
    setNotice(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('exam_grades')
      .upsert(
        {
          exam_id: exam.id,
          group_id: profile!.group_id,
          trainee_id: traineeId,
          numeric_score: score,
          appreciation_grade: 'ضعيف', // Calculated server-side by trigger
        },
        { onConflict: 'exam_id,trainee_id' }
      )
      .select('appreciation_grade')
      .single();

    if (error) {
      setNotice(`فشل حفظ الدرجة: ${error.message}`);
    } else {
      setTraineeGrades((prev) =>
        prev.map((r) =>
          r.trainee_id === traineeId
            ? { ...r, numeric_score: score, appreciation_grade: data?.appreciation_grade || 'جيد' }
            : r
        )
      );
      setNotice('تم رصد وتحديث الدرجة وحساب التقدير بنجاح.');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-base text-karooz-gold">امتحانات التيرم والدرجات</span>
            <div className="relative w-7 h-7">
              <Image src="/logo.png" alt="شعار مدرسة الكاروز" fill sizes="32px" className="object-contain" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-900/40 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-1 text-xs font-semibold">
              <GraduationCap className="w-4 h-4" />
              <span>
                {profile?.group_id === 1 && 'الفرقة الأولى'}
                {profile?.group_id === 2 && 'الفرقة الثانية'}
                {profile?.group_id === 3 && 'الفرقة الثالثة'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">التقييم الأكاديمي وامتحان التيرم</h1>
            <p className="text-xs text-slate-400 mt-1">
              امتحان واحد لكل تيرم دراسي، مع احتساب التقدير اللفظي آلياً على الخادم.
            </p>
          </div>
        </div>

        {notice && (
          <div className="p-3.5 bg-blue-950/60 border border-blue-800/60 text-blue-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* --- VIEW 1: TRAINEE PERSONAL EXAM RESULT --- */}
        {profile?.role_id === 'trainee' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-karooz-gold" />
              <span>نتيجة امتحان التيرم الأول</span>
            </h3>

            {!personalGrade ? (
              <div className="text-center py-8 text-slate-500 text-xs bg-slate-950/50 rounded-xl border border-slate-800/60">
                لم يتم رصد نتيجة الامتحان حتى الآن.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block mb-1">الدرجة المحصلة</span>
                  <span className="text-3xl font-bold text-white">
                    {personalGrade.numeric_score} / {exam?.max_score || 100}
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block mb-1">النسبة المئوية</span>
                  <span className="text-3xl font-bold text-amber-400">
                    {Math.round((personalGrade.numeric_score / (exam?.max_score || 100)) * 100)}%
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block mb-1">التقدير المعتمد</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {personalGrade.appreciation_grade}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW 2: STAFF GRADE ENTRY TABLE --- */}
        {profile?.role_id !== 'trainee' && canGrade && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>رصد وتصحيح درجات الامتحان (الدرجة العظمى: {exam?.max_score || 100})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="p-3">اسم المتدرب</th>
                    <th className="p-3">اسم المستخدم</th>
                    <th className="p-3 text-center">الدرجة الرقمية</th>
                    <th className="p-3 text-center">التقدير المحسوب</th>
                    <th className="p-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {traineeGrades.map((t) => (
                    <tr key={t.trainee_id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="p-3 font-bold text-white text-sm">{t.full_name}</td>
                      <td className="p-3 text-slate-400 font-mono">@{t.username}</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={exam?.max_score || 100}
                          value={t.numeric_score}
                          onChange={(e) => handleScoreChange(t.trainee_id, e.target.value)}
                          placeholder="0"
                          className="w-20 bg-slate-950 border border-slate-700 text-center text-white py-1.5 px-2 rounded-lg font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-400 text-sm">
                        {t.appreciation_grade || '—'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          disabled={saving || t.numeric_score === ''}
                          onClick={() => handleSaveGrade(t.trainee_id, Number(t.numeric_score))}
                          className="p-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition-colors inline-flex items-center gap-1 text-xs disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>حفظ</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
