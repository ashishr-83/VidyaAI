import type { TaskItem } from '../../types/plan';

interface TaskBlockProps {
  task: TaskItem;
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  Physics: { bg: 'rgba(57,73,171,0.12)', text: '#3949AB' },
  Chemistry: { bg: 'rgba(27,138,78,0.12)', text: '#1B8A4E' },
  Maths: { bg: 'rgba(255,107,0,0.12)', text: '#CC5500' },
  Mathematics: { bg: 'rgba(255,107,0,0.12)', text: '#CC5500' },
  Biology: { bg: 'rgba(124,58,237,0.12)', text: '#7C3AED' },
  English: { bg: 'rgba(217,119,6,0.12)', text: '#D97706' },
  Mixed: { bg: 'rgba(217,119,6,0.12)', text: '#D97706' },
};

const DEFAULT_COLOR = { bg: 'rgba(107,114,128,0.12)', text: '#374151' };

export default function TaskBlock({ task }: TaskBlockProps) {
  const color = SUBJECT_COLORS[task.subject] ?? DEFAULT_COLOR;

  return (
    <div
      style={{
        background: color.bg,
        borderRadius: '7px',
        padding: '5px 7px',
        opacity: task.done ? 0.5 : 1,
      }}
    >
      <div
        style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: 600,
          color: color.text,
          marginBottom: '2px',
        }}
      >
        {task.subject}
      </div>
      <div
        style={{
          fontSize: '10px',
          color: '#1F2937',
          fontWeight: 500,
          lineHeight: 1.3,
          textDecoration: task.done ? 'line-through' : 'none',
        }}
      >
        {task.topic}
      </div>
      <div style={{ fontSize: '9px', color: '#6B7280', marginTop: '2px' }}>
        {task.duration} min
      </div>
    </div>
  );
}
