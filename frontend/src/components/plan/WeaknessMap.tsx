import type { WeekPlan } from '../../types/plan';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';

interface WeaknessMapProps {
  weaknesses: WeekPlan['weaknesses'];
  lang: string;
}

function levelColor(level: string) {
  if (level === 'weak') return { bar: '#DC2626', text: '#DC2626' };
  if (level === 'medium') return { bar: '#D97706', text: '#D97706' };
  return { bar: '#1B8A4E', text: '#1B8A4E' };
}

export default function WeaknessMap({ weaknesses, lang }: WeaknessMapProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];

  const levelLabel: Record<string, string> = {
    weak: t.weaknessWeak,
    medium: t.weaknessMedium,
    strong: t.weaknessStrong,
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F3F4F6',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0D1B3E' }}>{t.weaknessMapTitle}</span>
        <span style={{ fontSize: '11px', color: '#FF6B00', cursor: 'pointer', fontWeight: 500 }}>
          {t.fullMap}
        </span>
      </div>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {weaknesses.map((w) => {
          const color = levelColor(w.level);
          return (
            <div key={w.concept}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '12px', color: '#1F2937', fontWeight: 500 }}>{w.concept}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: color.text }}>
                  {levelLabel[w.level]}
                </span>
              </div>
              <div
                style={{
                  height: '5px',
                  background: '#F3F4F6',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${w.score}%`,
                    background: color.bar,
                    borderRadius: '3px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
