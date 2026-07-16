import { useState, useEffect } from 'react';
import type { WeekPlan } from '../../types/plan';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';

interface CountdownBarProps {
  plan: WeekPlan | null;
  lang: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  mins: number;
}

function calcTimeLeft(examDate: string | null): TimeLeft {
  if (!examDate) return { days: 0, hours: 0, mins: 0 };
  const diff = new Date(examDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0 };
  const totalMins = Math.floor(diff / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  return { days, hours, mins };
}

export default function CountdownBar({ plan, lang }: CountdownBarProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];
  const [time, setTime] = useState<TimeLeft>(() => calcTimeLeft(plan?.examDate ?? null));

  useEffect(() => {
    setTime(calcTimeLeft(plan?.examDate ?? null));
    const id = setInterval(() => setTime(calcTimeLeft(plan?.examDate ?? null)), 1000);
    return () => clearInterval(id);
  }, [plan?.examDate]);

  const progress = plan?.syllabusProgressPercent ?? 0;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0D1B3E 0%, #1a237e 100%)',
        borderRadius: '16px',
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}
    >
      {/* Countdown digits */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {[
          { value: time.days, label: t.daysLabel },
          { value: time.hours, label: t.hoursLabel },
          { value: time.mins, label: t.minsLabel },
        ].map((unit, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '42px',
                fontWeight: 800,
                color: '#fff',
                fontFamily: 'Poppins, sans-serif',
                lineHeight: 1,
              }}
            >
              {String(unit.value).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', letterSpacing: '0.5px' }}>
              {unit.label}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '60px', background: 'rgba(255,255,255,0.15)' }} />

      {/* Exam target */}
      <div style={{ flex: 1, minWidth: '180px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', letterSpacing: '0.5px' }}>
          {t.examTargetLabel}
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: 'Poppins, sans-serif' }}>
          {plan?.examTarget ?? '—'}
        </div>
      </div>

      {/* Syllabus progress */}
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '8px',
          }}
        >
          <span>{t.syllabusProgressLabel}</span>
          <span style={{ color: '#FF6B00', fontWeight: 700 }}>{progress}%</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #FF6B00, #FF9800)',
              borderRadius: '4px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
