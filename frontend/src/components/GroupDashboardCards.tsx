'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Briefcase,
  Shield,
  TrendingUp,
  Clock,
  ArrowLeft,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface GroupSummary {
  group_id: 1 | 2 | 3;
  group_name: string;
  trainees_count: number;
  servants_count: number;
  secretariat_count: number;
  attendance_rate: number;
  latest_session_date: string | null;
  latest_present: number;
  latest_absent: number;
  latest_late: number;
}

interface GroupDashboardCardsProps {
  onSelectGroup?: (groupId: number) => void;
}

export default function GroupDashboardCards({ onSelectGroup }: GroupDashboardCardsProps) {
  const router = useRouter();
  const [summaries, setSummaries] = useState<Record<number, GroupSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroupsData() {
      setLoading(true);
      const supabase = createClient();

      try {
        const results: Record<number, GroupSummary> = {};
        for (let gId = 1; gId <= 3; gId++) {
          const { data, error } = await supabase.rpc('get_group_operational_summary', {
            p_group_id: gId,
          });

          if (data && !error) {
            results[gId] = data as GroupSummary;
          } else {
            results[gId] = {
              group_id: gId as any,
              group_name: gId === 1 ? 'الفرقة الأولى' : gId === 2 ? 'الفرقة الثانية' : 'الفرقة الثالثة',
              trainees_count: 0,
              servants_count: 0,
              secretariat_count: 0,
              attendance_rate: 100,
              latest_session_date: null,
              latest_present: 0,
              latest_absent: 0,
              latest_late: 0,
            };
          }
        }
        setSummaries(results);
      } catch (e) {
        console.error('Error fetching group operational summaries', e);
      }
      setLoading(false);
    }

    fetchGroupsData();
  }, []);

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (rate >= 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const groups = [
    { id: 1, name: 'الفرقة الأولى', desc: 'مرحلة التأسيس الأكاديمي والروحي', accent: 'from-amber-500/20 to-karooz-gold/10' },
    { id: 2, name: 'الفرقة الثانية', desc: 'مرحلة التعمق في العهدين والدراسات الكنسية', accent: 'from-blue-500/20 to-indigo-500/10' },
    { id: 3, name: 'الفرقة الثالثة', desc: 'مرحلة التخرج والبحث المتقدم والخدمة', accent: 'from-emerald-500/20 to-teal-500/10' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-karooz-gold" />
            <span>إدارة الفرق الدراسية (Operational Groups)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            متابعة شاملة وفورية لكافة بيانات الخدام، السكرتارية، الطلبة، ونسب الحضور لكل فرقة
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {groups.map((grp) => {
          const summary = summaries[grp.id];

          return (
            <div
              key={grp.id}
              onClick={() => {
                if (onSelectGroup) {
                  onSelectGroup(grp.id);
                } else {
                  router.push(`/groups/${grp.id}`);
                }
              }}
              className="group cursor-pointer bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-karooz-gold/50 rounded-2xl p-5 transition-all duration-300 shadow-lg hover:shadow-karooz-gold/5 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm"
            >
              {/* Background Glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${grp.accent} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`} />

              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
                      <h4 className="font-bold text-base text-slate-100 group-hover:text-karooz-gold transition-colors">
                        {grp.name}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{grp.desc}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    نشطة
                  </span>
                </div>

                {/* Main Stats Grid */}
                {loading ? (
                  <div className="py-8 flex items-center justify-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin text-karooz-gold" />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {/* People Counts */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-center">
                      <div>
                        <span className="block text-slate-400 text-[11px]">الطلبة</span>
                        <span className="text-sm font-bold text-slate-100 flex items-center justify-center gap-1 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-karooz-gold" />
                          <span>{summary?.trainees_count || 0}</span>
                        </span>
                      </div>
                      <div className="border-x border-slate-800">
                        <span className="block text-slate-400 text-[11px]">الخدام</span>
                        <span className="text-sm font-bold text-slate-100 flex items-center justify-center gap-1 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                          <span>{summary?.servants_count || 0}</span>
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[11px]">السكرتارية</span>
                        <span className="text-sm font-bold text-slate-100 flex items-center justify-center gap-1 mt-0.5">
                          <Shield className="w-3.5 h-3.5 text-purple-400" />
                          <span>{summary?.secretariat_count || 0}</span>
                        </span>
                      </div>
                    </div>

                    {/* Attendance KPI */}
                    <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">نسبة الحضور</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-300">
                            الغياب: <strong className="text-rose-400">{summary?.latest_absent ?? 0}</strong>
                          </span>
                          <span>•</span>
                          <span className="text-xs text-slate-300">
                            التأخير: <strong className="text-amber-400">{summary?.latest_late ?? 0}</strong>
                          </span>
                        </div>
                      </div>
                      <div
                        className={`text-sm font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 ${getAttendanceRateColor(
                          summary?.attendance_rate || 100
                        )}`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{summary?.attendance_rate ?? 100}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom CTA Button */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-karooz-gold font-bold group-hover:text-karooz-gold-light">
                <span className="flex items-center gap-1">
                  <span>عرض تفاصيل وإدارة الفرقة</span>
                </span>
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
