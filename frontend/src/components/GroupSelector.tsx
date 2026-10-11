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
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-canvas hover:bg-card text-content border border-gold/30 hover:border-gold/60 text-xs sm:text-sm font-bold shadow-md transition-all backdrop-blur-md"
      >
        <Layers className="w-4 h-4 text-gold" />
        <span>{currentGroup ? currentGroup.name : 'اختر الفرقة'}</span>
        <ChevronDown className={`w-4 h-4 text-content-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 rounded-3xl bg-canvas border border-gold/30 shadow-2xl shadow-black/90 p-2 z-50 animate-scale-in">
            {showAllOption && (
              <button
                onClick={() => {
                  onSelectGroup(0);
                  setIsOpen(false);
                }}
                className={`w-full text-right px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-colors mb-1 ${
                  selectedGroupId === 0
                    ? 'bg-gold text-brand-on font-black shadow-sm'
                    : 'text-content-secondary hover:bg-nav/60'
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
                    ? 'bg-gold text-brand-on font-black shadow-sm'
                    : 'text-content-secondary hover:bg-nav/60'
                }`}
              >
                <div>
                  <span className="block text-xs font-bold">{grp.name}</span>
                  <span
                    className={`text-[10px] block mt-0.5 ${
                      selectedGroupId === grp.id ? 'text-content font-semibold' : 'text-content-muted'
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
