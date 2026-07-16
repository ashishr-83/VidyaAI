import { useState } from 'react';
import type { DayPlan } from '../../types/plan';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';
import TaskBlock from './TaskBlock';

interface DayColumnProps {
  day: DayPlan;
  lang: string;
}

function fmtMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
}

export default function DayColumn({ day, lang }: DayColumnProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];
  const [hovered, setHovered] = useState(false);

  const completedCount = day.tasks.filter((t) => t.done).length;
  const totalCount = day.tasks.length;

  let statusText = t.upcoming;
  if (day.isRestDay) statusText = t.rest;
  else if (day.isPast && completedCount === totalCount && totalCount > 0) statusText = t.done;
  else if (day.isPast) statusText = `${completedCount}/${totalCount} done`;
  else if (day.isToday && completedCount === totalCount && totalCount > 0) statusText = t.done;
  else if (day.isToday) statusText = `${completedCount}/${totalCount} done`;

  const shortDay = day.day.slice(0, 3);
  const dateNum = new Date(day.date).getDate();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: '14px',
        border: `2px solid ${day.isToday ? '#FF6B00' : hovered ? '#FF6B00' : '#E5E7EB'}`,
        boxShadow: day.isToday
          ? '0 4px 16px rgba(255,107,0,0.18)'
          : hovered
          ? '0 4px 12px rgba(255,107,0,0.1)'
          : '0 2px 6px rgba(0,0,0,0.04)',
        opacity: day.isPast ? 0.6 : 1,
        transform: hovered && !day.isPast ? 'translateY(-2px)' : 'none',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '160px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '10px 10px 6px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.5px', marginBottom: '4px' }}>
          {shortDay}
        </div>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: day.isToday ? '#FF6B00' : 'transparent',
            color: day.isToday ? '#fff' : '#0D1B3E',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          {dateNum}
        </div>
        {day.isToday && (
          <div
            style={{
              fontSize: '9px',
              fontWeight: 600,
              color: '#FF6B00',
              background: 'rgba(255,107,0,0.1)',
              borderRadius: '4px',
              padding: '1px 6px',
              marginTop: '4px',
              display: 'inline-block',
            }}
          >
            Today
          </div>
        )}
      </div>

      {/* Task blocks */}
      <div style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {day.isRestDay ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>😴</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#D97706' }}>{t.restDay}</div>
            <div style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '2px' }}>{t.restDaySub}</div>
          </div>
        ) : (
          day.tasks.map((task, i) => <TaskBlock key={i} task={task} />)
        )}
      </div>

      {/* Footer */}
      {!day.isRestDay && (
        <div
          style={{
            padding: '6px 10px 8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #F3F4F6',
            marginTop: '6px',
          }}
        >
          <span style={{ fontSize: '9px', color: '#6B7280', fontWeight: 500 }}>
            {fmtMinutes(day.totalMinutes)}
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              color: statusText === t.done ? '#1B8A4E' : '#6B7280',
            }}
          >
            {statusText}
          </span>
        </div>
      )}
    </div>
  );
}
