import { useState } from 'react';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';

interface SubjectGridProps {
  selected: string[];
  onToggle: (subj: string) => void;
  lang: string;
}

const SUBJECTS = [
  { id: 'Physics', icon: '⚡', color: '#3949AB', bg: 'rgba(57,73,171,0.08)' },
  { id: 'Chemistry', icon: '🧪', color: '#1B8A4E', bg: 'rgba(27,138,78,0.08)' },
  { id: 'Maths', icon: '📐', color: '#FF6B00', bg: 'rgba(255,107,0,0.08)' },
  { id: 'Biology', icon: '🌿', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  { id: 'English', icon: '📖', color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  { id: 'Social Science', icon: '🗺️', color: '#0891B2', bg: 'rgba(8,145,178,0.08)' },
];

export default function SubjectGrid({ selected, onToggle, lang }: SubjectGridProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];
  const [priorities, setPriorities] = useState<Record<string, number>>({});

  const cyclePriority = (e: React.MouseEvent, subj: string, dotIdx: number) => {
    e.stopPropagation();
    setPriorities((prev) => ({ ...prev, [subj]: dotIdx + 1 }));
  };

  const priorityLabels = ['', t.weaknessWeak, t.weaknessMedium, t.weaknessStrong];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
      {SUBJECTS.map((subj) => {
        const isSelected = selected.includes(subj.id);
        const priority = priorities[subj.id] ?? 0;

        return (
          <div
            key={subj.id}
            onClick={() => onToggle(subj.id)}
            style={{
              border: `2px solid ${isSelected ? subj.color : '#E5E7EB'}`,
              background: isSelected ? subj.bg : '#fff',
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>{subj.icon}</span>
              {isSelected && (
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: subj.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5 3.5-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0D1B3E', marginBottom: '6px' }}>
              {subj.id}
            </div>
            {isSelected && (
              <>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      onClick={(e) => cyclePriority(e, subj.id, i)}
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: i < priority ? '#FF6B00' : '#E5E7EB',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '9px', color: '#6B7280' }}>
                  {priorityLabels[priority] ?? ''}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
