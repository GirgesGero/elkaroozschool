'use client';

import { useState } from 'react';
import { ChevronDown, Layers, Check } from 'lucide-react';

interface GroupSelectorProps {
  selectedGroupId: number;
  onSelectGroup: (groupId: number) => void;
  showAllOption?: boolean;
}

export default function GroupSelector({
  selectedGroupId,
  onSelectGroup,
  showAllOption = false,
}: GroupSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const groups = [
    { id: 1, name: 'الفرقة الأولى', desc: 'مرحلة التأسيس' },
    { id: 2, name: 'الفرقة الثانية', desc: 'مرحلة التعمق' },
    { id: 3, name: 'الفرقة الثالثة', desc: 'مرحلة التخرج والبحث' },
  ];

  const currentGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="relative inline-block text-right" dir="rtl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0c1322] hover:bg-[#111a2e] text-slate-100 border border-[#c29938]/30 hover:border-[#c29938]/60 text-xs sm:text-sm font-bold shadow-md transition-all backdrop-blur-md"
      >
        <Layers className="w-4 h-4 text-[#c29938]" />
        <span>{currentGroup ? currentGroup.name : 'اختر الفرقة'}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 rounded-3xl bg-[#070b14] border border-[#c29938]/30 shadow-2xl shadow-black/90 p-2 z-50 animate-scale-in">
            {showAllOption && (
              <button
                onClick={() => {
                  onSelectGroup(0);
                  setIsOpen(false);
                }}
                className={`w-full text-right px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-colors mb-1 ${
                  selectedGroupId === 0
                    ? 'bg-karooz-gold text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>جميع الفرق (نظرة شاملة)</span>
                {selectedGroupId === 0 && <Check className="w-4 h-4" />}
              </button>
            )}

            {groups.map((grp) => (
              <button
                key={grp.id}
                onClick={() => {
                  onSelectGroup(grp.id);
                  setIsOpen(false);
                }}
                className={`w-full text-right px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-colors mb-1 ${
                  selectedGroupId === grp.id
                    ? 'bg-karooz-gold text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div>
                  <span className="block text-xs font-bold">{grp.name}</span>
                  <span
                    className={`text-[10px] block mt-0.5 ${
                      selectedGroupId === grp.id ? 'text-slate-900 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {grp.desc}
                  </span>
                </div>
                {selectedGroupId === grp.id && <Check className="w-4 h-4 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
