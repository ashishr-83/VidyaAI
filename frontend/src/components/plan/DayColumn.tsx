import { useState } from 'react';
import type { DayPlan } from '../../types/plan';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';
import TaskBlock from './TaskBlock';

interface DayColumnProps {
  day: DayPlan;
  lang: string;
  onClick?: (day: DayPlan) => void;
}

function fmtMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
}

export default function DayColumn({ day, lang, onClick }: DayColumnProps) {
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

  const shortDay = day.day.slice(0, 3).toUpperCase();
  const dateNum = new Date(day.date).getDate();

  return (
    <div
      onClick={() => onClick?.(day)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FAFAFA',
        borderRadius: '14px',
        border: `1.5px solid ${day.isToday ? '#FF6B00' : hovered ? '#FF6B00' : '#E5E7EB'}`,
        boxShadow: day.isToday
          ? '0 0 0 3px rgba(255,107,0,0.12)'
          : hovered
          ? '0 4px 12px rgba(255,107,0,0.1)'
          : '0 1px 4px rgba(0,0,0,0.04)',
        opacity: day.isPast && !day.isToday ? 0.65 : 1,
        transform: hovered && !day.isPast ? 'translateY(-2px)' : 'none',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '250px',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Day header */}
      <div style={{ padding: '14px 10px 6px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', marginBottom: '2px' }}>
          {shortDay}
        </div>
        <div
          style={{
            fontSize: '18px',
            fontWeight: 800,
            fontFamily: 'Poppins, sans-serif',
            color: '#0D1B3E',
            lineHeight: 1.1,
          }}
        >
          {dateNum}
        </div>
        {day.isToday && (
          <div
            style={{
              display: 'inline-block',
              background: '#FF6B00',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: '999px',
              marginTop: '6px',
            }}
          >
            Today
          </div>
        )}
      </div>

      {/* Spacer when no today pill */}
      {!day.isToday && <div style={{ height: '10px' }} />}

      {/* Task blocks */}
      <div style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {day.isRestDay ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#6B7280', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>🌙</div>
            <div style={{ fontSize: '11px', fontWeight: 600 }}>{t.restDay}</div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>{t.restDaySub}</div>
          </div>
        ) : (
          day.tasks.map((task, i) => <TaskBlock key={i} task={task} />)
        )}
      </div>

      {/* Footer */}
      {!day.isRestDay && (
        <div
          style={{
            padding: '8px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px dashed #E5E7EB',
            marginTop: '8px',
          }}
        >
          <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 500 }}>
            {fmtMinutes(day.totalMinutes)}
          </span>
          <span
            style={{
              fontSize: '10px',
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
