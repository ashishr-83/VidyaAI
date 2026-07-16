import type { WeekPlan } from '../../types/plan';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';

interface MiniStatsProps {
  stats: WeekPlan['weeklyStats'];
  lang: string;
}

function fmtMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

interface StatRowProps {
  icon: string;
  iconBg: string;
  label: string;
  value: string;
}

function StatRow({ icon, iconBg, label, value }: StatRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '11px', color: '#6B7280' }}>{label}</div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0D1B3E', fontFamily: 'Poppins, sans-serif' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

export default function MiniStats({ stats, lang }: MiniStatsProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0D1B3E', marginBottom: '14px' }}>
        {t.weeklyReport}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <StatRow
          icon="⏱"
          iconBg="rgba(57,73,171,0.1)"
          label={t.totalStudyTime}
          value={fmtMinutes(stats.totalStudiedMinutes)}
        />
        <StatRow
          icon="✅"
          iconBg="rgba(27,138,78,0.1)"
          label={t.tasksCompleted}
          value={`${stats.tasksCompleted}/${stats.totalTasks}`}
        />
        <StatRow
          icon="🎤"
          iconBg="rgba(255,107,0,0.1)"
          label={t.doubtsSolved}
          value={String(stats.doubtsSolved)}
        />
        {stats.mockScore && (
          <StatRow
            icon="📝"
            iconBg="rgba(124,58,237,0.1)"
            label={t.mockScore}
            value={stats.mockScore}
          />
        )}
      </div>
    </div>
  );
}
