import type { TaskItem } from '../../types/plan';

interface TaskBlockProps {
  task: TaskItem;
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string; pill: string }> = {
  Mathematics:      { bg: '#FCEEE0', text: '#D9720F', pill: '#f8dfc0' },
  Science:          { bg: '#E6F5EE', text: '#1E9463', pill: '#cdeee0' },
  'Social Science': { bg: '#E3F5F3', text: '#0F766E', pill: '#b3e5de' },
  Mixed:            { bg: '#FDF3E3', text: '#B45309', pill: '#f6e3bd' },
  // Legacy aliases kept for backwards-compat with any existing plan data
  Physics:          { bg: '#EEEDFC', text: '#5B57E0', pill: '#dedafc' },
  Chemistry:        { bg: '#E6F5EE', text: '#1E9463', pill: '#cdeee0' },
  Maths:            { bg: '#FCEEE0', text: '#D9720F', pill: '#f8dfc0' },
};

const DEFAULT_COLOR = { bg: '#F3F4F6', text: '#374151', pill: '#E5E7EB' };

export default function TaskBlock({ task }: TaskBlockProps) {
  const color = SUBJECT_COLORS[task.subject] ?? DEFAULT_COLOR;

  return (
    <div
      style={{
        background: color.bg,
        borderRadius: '9px',
        padding: '8px 10px',
        opacity: task.done ? 0.5 : 1,
      }}
    >
      <div
        style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 800,
          color: color.text,
          marginBottom: '2px',
        }}
      >
        {task.subject}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: '#0D1B3E',
          fontWeight: 600,
          lineHeight: 1.3,
          textDecoration: task.done ? 'line-through' : 'none',
          marginBottom: '2px',
        }}
      >
        {task.topic}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: '#6B7280' }}>{task.duration} min</span>
        {task.reason && (
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '999px',
              background: color.pill,
              color: color.text,
            }}
          >
            {task.reason}
          </span>
        )}
      </div>
    </div>
  );
}
