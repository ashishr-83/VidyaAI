import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DayPlan } from '../../types/plan';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';

const SUBJECT_COLORS: Record<string, { bg: string; text: string; pill: string }> = {
  Mathematics:      { bg: '#FCEEE0', text: '#D9720F', pill: '#f8dfc0' },
  Science:          { bg: '#E6F5EE', text: '#1E9463', pill: '#cdeee0' },
  'Social Science': { bg: '#E3F5F3', text: '#0F766E', pill: '#b3e5de' },
  Mixed:            { bg: '#FDF3E3', text: '#B45309', pill: '#f6e3bd' },
};

function subjectColor(subject: string) {
  return SUBJECT_COLORS[subject] ?? { bg: '#F3F4F6', text: '#374151', pill: '#E5E7EB' };
}

interface DayDetailModalProps {
  day: DayPlan | null;
  onClose: () => void;
  onComplete: (date: string, taskIndex: number) => void;
  lang: string;
}

function fmtMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
}

export default function DayDetailModal({ day, onClose, onComplete, lang }: DayDetailModalProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (!day) return null;

  const dateLabel = (() => {
    try {
      return new Date(day.date).toLocaleDateString('en-IN', {
        weekday: 'long', month: 'short', day: 'numeric',
      });
    } catch {
      return day.day;
    }
  })();

  const toggleCheck = (i: number) => {
    const next = new Set(checked);
    if (next.has(i)) {
      next.delete(i);
    } else {
      next.add(i);
      onComplete(day.date, i);
    }
    setChecked(next);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13,27,62,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '18px',
          padding: '26px 28px',
          width: '460px',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0D1B3E', fontFamily: 'Poppins, sans-serif' }}>
              {dateLabel}
            </h3>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              {fmtMinutes(day.totalMinutes)} planned
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F1F3FB',
              border: 'none',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              fontSize: '14px',
              cursor: 'pointer',
              color: '#6B7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Task list */}
        {day.isRestDay ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#6B7280' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌙</div>
            <div style={{ fontWeight: 600 }}>{t.restDay}</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>{t.restDaySub}</div>
          </div>
        ) : (
          day.tasks.map((task, i) => {
            const colors = subjectColor(task.subject);
            const isChecked = checked.has(i) || task.done;
            const reason = task.reason ?? (task.isWeakArea ? t.weakAreaPriority : t.newChapter);

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '13px 0',
                  borderBottom: i < day.tasks.length - 1 ? '1px solid #E5E7EB' : 'none',
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCheck(i)}
                  style={{ width: '19px', height: '19px', marginTop: '2px', accentColor: '#1B8A4E', cursor: 'pointer', flexShrink: 0 }}
                />

                <div style={{ flex: 1 }}>
                  {/* Subject tag */}
                  <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em', color: colors.text, marginBottom: '2px' }}>
                    {task.subject.toUpperCase()}
                  </div>

                  {/* Chapter/topic name */}
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0D1B3E',
                      textDecoration: isChecked ? 'line-through' : 'none',
                      opacity: isChecked ? 0.5 : 1,
                      marginBottom: '4px',
                    }}
                  >
                    {task.topic}
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>{task.duration} min</span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: '999px',
                        background: colors.pill,
                        color: colors.text,
                      }}
                    >
                      {reason}
                    </span>
                  </div>

                  {/* Actions */}
                  {!isChecked && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        onClick={() => void navigate('/lesson')}
                        style={{
                          background: '#0D1B3E',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 13px',
                          borderRadius: '7px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ▶ Start learning
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
