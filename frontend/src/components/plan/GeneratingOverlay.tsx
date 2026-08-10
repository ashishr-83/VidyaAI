import { planStrings, type SupportedLang } from '../../constants/plan.i18n';

interface GeneratingOverlayProps {
  visible: boolean;
  activeStep: number; // 0 = none active, 1–4 = step animating, 5 = all done
  lang: string;
}

export default function GeneratingOverlay({ visible, activeStep, lang }: GeneratingOverlayProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];

  const steps = [
    t.generatingStep1,
    t.generatingStep2,
    t.generatingStep3,
    t.generatingStep4,
  ];

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13,27,62,0.88)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '18px',
          padding: '36px 42px',
          width: '380px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Spinner */}
        <div
          style={{
            width: '46px',
            height: '46px',
            border: '4px solid #E5E7EB',
            borderTopColor: '#FF6B00',
            borderRadius: '50%',
            margin: '0 auto 18px',
            animation: 'vidya-spin 0.9s linear infinite',
          }}
        />
        <style>{`@keyframes vidya-spin { to { transform: rotate(360deg); } }`}</style>

        <h3
          style={{
            margin: '0 0 6px',
            fontSize: '17px',
            fontWeight: 700,
            color: '#0D1B3E',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          {t.buildingPlan}
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6B7280' }}>
          {t.aiGeneratedPlan}
        </p>

        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {steps.map((label, i) => {
            const stepNum = i + 1;
            const isDone = activeStep > stepNum;
            const isActive = activeStep === stepNum;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: isDone ? '#1B8A4E' : isActive ? '#0D1B3E' : '#9CA3AF',
                  fontWeight: isDone || isActive ? 600 : 400,
                  opacity: isDone || isActive ? 1 : 0.4,
                  transition: 'all 0.25s',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${isDone ? '#1B8A4E' : isActive ? '#FF6B00' : '#E5E7EB'}`,
                    background: isDone ? '#1B8A4E' : 'transparent',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: isDone ? '#fff' : 'transparent',
                    transition: 'all 0.25s',
                  }}
                >
                  {isDone ? '✓' : ''}
                </div>
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
