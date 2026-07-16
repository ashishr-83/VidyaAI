import toast from 'react-hot-toast';
import type { TaskItem } from '../../types/plan';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';

interface TaskRowProps {
  task: TaskItem;
  date: string;
  index: number;
  onComplete: (date: string, index: number) => void;
  lang: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  Physics: '#3949AB',
  Chemistry: '#1B8A4E',
  Maths: '#FF6B00',
  Mathematics: '#FF6B00',
  Biology: '#7C3AED',
  English: '#D97706',
  Mixed: '#D97706',
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  learn: { bg: 'rgba(57,73,171,0.1)', text: '#3949AB' },
  revise: { bg: 'rgba(217,119,6,0.1)', text: '#D97706' },
  practice: { bg: 'rgba(255,107,0,0.1)', text: '#FF6B00' },
  test: { bg: 'rgba(220,38,38,0.1)', text: '#DC2626' },
};

export default function TaskRow({ task, date, index, onComplete, lang }: TaskRowProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];
  const subjColor = SUBJECT_COLORS[task.subject] ?? '#6B7280';
  const typeColor = TYPE_COLORS[task.type] ?? { bg: 'rgba(107,114,128,0.1)', text: '#6B7280' };

  const typeLabel: Record<string, string> = {
    learn: t.typeLearn,
    revise: t.typeRevise,
    practice: t.typePractice,
    test: t.typeTest,
  };

  const handleDoubt = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast(t.toastDoubtOpen);
  };

  return (
    <div
      onClick={() => onComplete(date, index)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '14px 20px',
        cursor: 'pointer',
        background: task.done ? 'transparent' : '#FFFBF5',
        borderLeft: task.done ? '3px solid transparent' : '3px solid #FF6B00',
        opacity: task.done ? 0.55 : 1,
        transition: 'all 0.15s',
      }}
      className="hover:bg-gray-50"
    >
      {/* Checkbox */}
      <div
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          border: task.done ? 'none' : '2px solid #D1D5DB',
          background: task.done ? '#1B8A4E' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        {task.done && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <span
            style={{
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 700,
              color: subjColor,
            }}
          >
            {task.subject}
          </span>
          <span
            style={{
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              fontWeight: 600,
              background: typeColor.bg,
              color: typeColor.text,
              padding: '1px 6px',
              borderRadius: '4px',
            }}
          >
            {typeLabel[task.type]}
          </span>
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#0D1B3E',
            textDecoration: task.done ? 'line-through' : 'none',
            marginBottom: '2px',
          }}
        >
          {task.topic}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1F2937' }}>⏱ {task.duration} min</span>
        {!task.done && (
          <button
            onClick={handleDoubt}
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#FF6B00',
              background: 'rgba(255,107,0,0.08)',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.doubtBtn}
          </button>
        )}
      </div>
    </div>
  );
}
