import { planStrings, type SupportedLang } from '../../constants/plan.i18n';

interface StreakCardProps {
  streak: number;
  lang: string;
}

export default function StreakCard({ streak, lang }: StreakCardProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];
  const sub = t.streakSub.replace('{n}', String(streak + 1));

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1B8A4E 0%, #166534 100%)',
        borderRadius: '16px',
        padding: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <div
        style={{
          fontSize: '46px',
          fontWeight: 800,
          color: '#fff',
          fontFamily: 'Poppins, sans-serif',
          lineHeight: 1,
        }}
      >
        {streak}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
          {t.streakTitle}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{sub}</div>
      </div>
      <div style={{ fontSize: '38px', marginLeft: 'auto' }}>🏆</div>
    </div>
  );
}
