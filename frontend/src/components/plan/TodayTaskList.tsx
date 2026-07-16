import toast from 'react-hot-toast';
import type { WeekPlan } from '../../types/plan';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';
import TaskRow from './TaskRow';

interface TodayTaskListProps {
  plan: WeekPlan | null;
  onComplete: (date: string, index: number) => void;
  lang: string;
}

export default function TodayTaskList({ plan, onComplete, lang }: TodayTaskListProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPlan = plan?.week.find((d) => d.date === todayStr) ?? plan?.week.find((d) => d.isToday);

  const tasks = todayPlan?.tasks ?? [];
  const completedCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const circumference = 126;
  const offset = circumference - (circumference * progressPct) / 100;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        flex: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      {/* Card header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0D1B3E 0%, #1a237e 100%)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff', fontFamily: 'Poppins, sans-serif' }}>
            {t.todaysPlan}
          </div>
        </div>

        {/* Progress ring */}
        <div style={{ position: 'relative', width: '52px', height: '52px' }}>
          <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
            <circle
              cx="26"
              cy="26"
              r="20"
              fill="none"
              stroke="#FF6B00"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {completedCount}/{totalCount}
          </div>
        </div>
      </div>

      {/* Task rows */}
      <div style={{ display: 'flex', flexDirection: 'column', divideY: '1px solid #F3F4F6' }}>
        {tasks.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
            No tasks for today 🎉
          </div>
        ) : (
          tasks.map((task, idx) => (
            <div key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
              <TaskRow
                task={task}
                date={todayPlan?.date ?? todayStr}
                index={idx}
                onComplete={onComplete}
                lang={lang}
              />
            </div>
          ))
        )}
      </div>

      {/* Add task row */}
      <div
        onClick={() => toast(t.toastAddTask)}
        style={{
          padding: '12px 20px',
          borderTop: '1px dashed #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          color: '#9CA3AF',
          fontSize: '12px',
          fontWeight: 500,
          transition: 'color 0.15s',
        }}
        className="hover:text-orange-500"
      >
        {t.addTask}
      </div>
    </div>
  );
}
