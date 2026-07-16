import { useState } from 'react';
import toast from 'react-hot-toast';
import type { WeekPlan } from '../../types/plan';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';
import DayColumn from './DayColumn';

interface WeekGridProps {
  plan: WeekPlan | null;
  lang: string;
}

export default function WeekGrid({ plan, lang }: WeekGridProps) {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1.5px solid #E5E7EB',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ‹
          </button>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0D1B3E', margin: 0, fontFamily: 'Poppins, sans-serif' }}>
            {getWeekLabel()}
          </h3>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1.5px solid #E5E7EB',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ›
          </button>
        </div>
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

      {/* 7-column grid */}
      <div
        style={{
          display: 'grid',
          gap: '8px',
        }}
        className="grid-cols-4 sm:grid-cols-4 lg:grid-cols-7"
      >
        {plan.week.map((day) => (
          <DayColumn key={day.date} day={day} lang={lang} />
        ))}
      </div>
    </div>
  );
}
