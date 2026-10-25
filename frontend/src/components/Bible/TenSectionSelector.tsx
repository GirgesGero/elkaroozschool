'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, Search, Sparkles } from 'lucide-react';
import type { BibleCategory, BibleSection } from '@/lib/api/bible';
import { ENCYCLOPEDIA_SECTIONS } from '@/lib/bible/encyclopedia-sections';

interface Props {
  categories: BibleCategory[];
  stats?: { total_articles: number; daily_verse: { text: string; ref?: string; reference?: string } };
  onOpenReader?: () => void;
  onOpenSearch?: () => void;
  onSelectCategory?: (categoryCode: string) => void;
}

export default function TenSectionSelector({ categories, stats, onOpenReader, onOpenSearch, onSelectCategory }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(Object.fromEntries(ENCYCLOPEDIA_SECTIONS.map(({ id }) => [id, true])));
  const [search, setSearch] = useState('');
  const allSections = useMemo(() => new Map(categories.flatMap((category) => category.sections ?? []).map((section) => [section.code, section])), [categories]);
  const query = search.trim().toLocaleLowerCase();
  const groups = useMemo(() => ENCYCLOPEDIA_SECTIONS.map((group) => {
    const sections = group.sectionCodes.map((code) => allSections.get(code)).filter((section): section is BibleSection => Boolean(section));
    const matching = query ? sections.filter((section) => `${section.title} ${section.code} ${section.description}`.toLocaleLowerCase().includes(query)) : sections;
    return { ...group, sections: query && group.title.toLocaleLowerCase().includes(query) ? sections : matching };
  }).filter((group) => !query || group.title.toLocaleLowerCase().includes(query) || group.sections.length), [allSections, query]);
  const totalSections = categories.reduce((count, category) => count + (category.sections?.length ?? 0), 0);
  const totalDocs = stats?.total_articles || categories.reduce((count, category) => count + (category.sections?.reduce((sum, section) => sum + (section.doc_count || 0), 0) ?? 0), 0);
  const dailyRef = stats?.daily_verse?.ref || stats?.daily_verse?.reference || 'سفر المزامير';
  const toggleGroup = (id: string) => setExpandedGroups((current) => ({ ...current, [id]: !current[id] }));
  const setAll = (value: boolean) => setExpandedGroups(Object.fromEntries(ENCYCLOPEDIA_SECTIONS.map(({ id }) => [id, value])));

  return <div className="space-y-8 select-text" dir="rtl">
    <section className="relative overflow-hidden rounded-3xl border-2 border-gold/40 bg-gradient-to-br from-nav via-card to-nav p-6 shadow-2xl shadow-black/80 sm:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-2xl space-y-3"><div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/15 px-3 py-1 text-xs font-bold text-gold"><Sparkles className="h-3.5 w-3.5" /><span>الآية اليومية المختارة</span></div>
          {stats?.daily_verse ? <div><p className="font-serif text-xl font-black leading-relaxed text-content sm:text-2xl">«{stats.daily_verse.text}»</p><p className="mt-1.5 text-xs font-bold text-gold">— {dailyRef}</p></div> : <p className="text-lg font-bold leading-relaxed text-content">«سِرَاجٌ لِرِجْلِي كَلاَمُكَ وَنُورٌ لِسَبِيلِي» <span className="mr-2 text-xs font-bold text-gold">— مزمور 119: 105</span></p>}
        </div>
        <div className="grid w-full shrink-0 grid-cols-2 gap-3 border-t border-line/60 pt-4 sm:grid-cols-3 md:w-auto md:border-r md:border-t-0 md:pr-6 md:pt-0"><div className="rounded-2xl border border-line bg-canvas/70 p-3 text-center"><span className="block text-[11px] text-content-muted">الأقسام الرئيسية</span><span className="mt-0.5 block text-lg font-black text-gold">10 أقسام</span></div><div className="rounded-2xl border border-line bg-canvas/70 p-3 text-center"><span className="block text-[11px] text-content-muted">الأقسام الفرعية</span><span className="mt-0.5 block text-lg font-black text-content">{totalSections} قسماً</span></div><div className="col-span-2 rounded-2xl border border-line bg-canvas/70 p-3 text-center sm:col-span-1"><span className="block text-[11px] text-content-muted">إجمالي الوثائق</span><span className="mt-0.5 block text-lg font-black text-emerald-400">{totalDocs.toLocaleString()}</span></div></div>
      </div>
    </section>
    <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-line/90 bg-nav/90 p-4 shadow-md md:flex-row"><div className="flex w-full items-center gap-2 md:w-auto"><div className="relative flex-1 sm:w-72"><Search aria-hidden="true" className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-muted" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="البحث في الأقسام العشرة" placeholder="ابحث في الأقسام والموضوعات..." className="w-full rounded-xl border border-line bg-canvas py-2 pl-3 pr-9 text-[16px] text-content placeholder:text-content-muted focus:border-gold focus:outline-none md:text-xs" /></div><button type="button" onClick={() => setAll(true)} className="min-h-[44px] rounded-xl border border-line bg-canvas px-3 text-xs font-bold text-content-secondary hover:border-gold/50 hover:text-gold">توسيع الكل</button><button type="button" onClick={() => setAll(false)} className="min-h-[44px] rounded-xl border border-line bg-canvas px-3 text-xs font-bold text-content-secondary hover:border-gold/50 hover:text-gold">طي الكل</button></div>{onOpenSearch && <button type="button" onClick={onOpenSearch} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold/40 bg-nav px-3.5 py-2 text-xs font-bold text-gold transition-all hover:bg-gold hover:text-brand-on"><Search aria-hidden="true" className="h-3.5 w-3.5" /><span>بحث في النصوص</span></button>}</div>
    {groups.length === 0 ? <div className="rounded-3xl border border-line bg-nav p-12 text-center text-xs text-content-muted">لا توجد أقسام مطابقة لكلمة البحث «{search}»</div> : <div className="space-y-4">{groups.map((group) => {
      const expanded = query.length > 0 || Boolean(expandedGroups[group.id]);
      const docs = group.sections.reduce((sum, section) => sum + (section.doc_count || 0), 0);
      return <section key={group.id} data-encyclopedia-group={group.id} className="overflow-hidden rounded-3xl border border-line bg-nav/80 shadow-lg transition-colors hover:border-gold/50"><button type="button" aria-expanded={expanded} onClick={() => { toggleGroup(group.id); onSelectCategory?.(group.id); }} className="flex w-full items-center justify-between gap-4 bg-gradient-to-l from-gold/10 via-transparent to-transparent p-4 text-right transition-colors hover:bg-gold/5 sm:p-5"><span className="flex min-w-0 items-center gap-3.5"><span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line/80 bg-canvas text-2xl shadow-md">{group.icon}</span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="text-base font-black tracking-tight text-content sm:text-lg">{group.title}</span><span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[10px] font-bold text-gold">{group.sections.length} قسم فرعي</span></span><span className="mt-1 block text-xs text-content-muted">{group.sections.length ? `${group.sections.length} قسمًا فرعيًا · ${docs.toLocaleString()} وثيقة` : 'لا توجد مواد مضافة بعد'}</span></span></span><ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-gold transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} /></button>
        {expanded && <div className="space-y-3 border-t border-line/80 bg-canvas/60 p-4 sm:p-6">{!group.sections.length && <p className="rounded-2xl border border-dashed border-line bg-nav/70 p-6 text-center text-sm text-content-muted">لا توجد مواد مضافة بعد</p>}{group.sections.length > 0 && <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">{group.sections.map((section) => <article key={section.code} className="group relative flex flex-col justify-between gap-3 rounded-2xl border border-line bg-nav p-4 text-right transition-all hover:border-gold/60 hover:shadow-lg"><div><div className="mb-2 flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="shrink-0 rounded-xl border border-line bg-canvas p-1.5 text-base">{section.icon || '📜'}</span><h3 className="truncate text-xs font-black text-content transition-colors group-hover:text-gold">{section.title}</h3></div><span className="shrink-0 rounded-md border border-line bg-canvas px-2 py-0.5 font-mono text-[10px] font-bold text-content-secondary">{section.doc_count.toLocaleString()}</span></div>{section.description && <p className="line-clamp-2 text-[11px] leading-relaxed text-content-muted">{section.description}</p>}</div><div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2 text-xs"><Link href={`/bible/section/${section.code}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-gold hover:underline"><span>تصفح وثائق القسم</span><ChevronLeft aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" /></Link>{section.code === 'sec-holy-bible-complete' && onOpenReader && <button type="button" onClick={onOpenReader} className="rounded-lg border border-gold/40 bg-gold/15 px-2 py-1 text-[10px] font-bold text-gold transition-colors hover:bg-gold hover:text-brand-on">فتح القارئ</button>}</div></article>)}</div>}{group.route && <Link href={group.route} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-bold text-gold transition-colors hover:bg-gold hover:text-brand-on">الانتقال إلى الماراثون<ChevronLeft aria-hidden="true" className="h-4 w-4" /></Link>}</div>}
      </section>;
    })}</div>}
  </div>;
}
