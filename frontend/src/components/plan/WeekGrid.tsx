import { useState } from 'react';
import toast from 'react-hot-toast';
import type { WeekPlan, DayPlan } from '../../types/plan';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';
import DayColumn from './DayColumn';

interface WeekGridProps {
  plan: WeekPlan | null;
  lang: string;
  onDayClick?: (day: DayPlan) => void;
}

const LEGEND = [
  { label: 'Mathematics',      color: '#D9720F' },
  { label: 'Science',          color: '#1E9463' },
  { label: 'Social Science',   color: '#0F766E' },
  { label: 'Mixed / Revision', color: '#B45309' },
];

export default function WeekGrid({ plan, lang, onDayClick }: WeekGridProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];
  const [weekOffset, setWeekOffset] = useState(0);

  const getWeekLabel = () => {
    if (weekOffset === 0) return t.thisWeeksPlan;
    if (weekOffset > 0) return `+${weekOffset} week${weekOffset > 1 ? 's' : ''}`;
    return `${weekOffset} week${weekOffset < -1 ? 's' : ''}`;
  };

  const handleExportPdf = () => toast('Export PDF — coming soon!');

  if (!plan) {
    return (
      <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
        <div style={{ color: '#6B7280', fontSize: '13px' }}>Loading plan...</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            style={navBtnStyle}
          >
            ‹
          </button>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0D1B3E', margin: 0, fontFamily: 'Poppins, sans-serif' }}>
            {getWeekLabel()}
          </h3>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            style={navBtnStyle}
          >
            ›
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            {t.planRebalances.replace('{n}', String(plan.week.reduce((s, d) => s + d.tasks.length, 0)))}
          </span>
          <button
            onClick={handleExportPdf}
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#6B7280',
              background: '#F9FAFB',
              border: '1.5px solid #E5E7EB',
              borderRadius: '8px',
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            {t.exportPdf}
          </button>
        </div>
      </div>

      {/* 7-column grid */}
      <div
        style={{ display: 'grid', gap: '12px' }}
        className="grid-cols-4 sm:grid-cols-4 lg:grid-cols-7"
      >
        {plan.week.map((day) => (
          <DayColumn key={day.date} day={day} lang={lang} onClick={onDayClick} />
        ))}
      </div>

      {/* Subject color legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '18px', flexWrap: 'wrap' }}>
        {LEGEND.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6B7280' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '3px', background: item.color, flexShrink: 0 }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: '1.5px solid #E5E7EB',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#374151',
};
