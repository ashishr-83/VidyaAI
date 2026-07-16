import { useState } from 'react';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';

interface ReminderSetupProps {
  lang: string;
}

export default function ReminderSetup({ lang }: ReminderSetupProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];
  const [waEnabled, setWaEnabled] = useState(true);
  const [parentReport, setParentReport] = useState(false);
  const [dnd, setDnd] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* WhatsApp toggle row */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(37,211,102,0.1) 0%, rgba(37,211,102,0.05) 100%)',
          border: '1.5px solid rgba(37,211,102,0.25)',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '24px' }}>📱</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B8A4E' }}>{t.whatsappToggleTitle}</div>
          <div style={{ fontSize: '11px', color: '#1B8A4E', opacity: 0.7, marginTop: '2px' }}>{t.whatsappToggleSub}</div>
        </div>
        <button
          onClick={() => setWaEnabled((v) => !v)}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            background: waEnabled ? '#25D366' : '#D1D5DB',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '3px',
              left: waEnabled ? '23px' : '3px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
        </button>
      </div>

      {/* Phone + time inputs */}
      {waEnabled && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
              {t.whatsappNumberLabel}
            </label>
            <input
              type="tel"
              defaultValue="+91 "
              style={{
                width: '100%',
                height: '40px',
                border: '1.5px solid #E5E7EB',
                borderRadius: '8px',
                padding: '0 10px',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
              {t.reminderTimeLabel}
            </label>
            <input
              type="time"
              defaultValue="07:00"
              style={{
                width: '100%',
                height: '40px',
                border: '1.5px solid #E5E7EB',
                borderRadius: '8px',
                padding: '0 10px',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* Compact toggles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { label: t.weeklyParentReport, sub: t.weeklyParentSub, value: parentReport, set: setParentReport },
          { label: t.dndTitle, sub: t.dndSub, value: dnd, set: setDnd },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              border: '1.5px solid #E5E7EB',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0D1B3E' }}>{item.label}</div>
              <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>{item.sub}</div>
            </div>
            <button
              onClick={() => item.set((v) => !v)}
              style={{
                width: '36px',
                height: '20px',
                borderRadius: '10px',
                background: item.value ? '#FF6B00' : '#D1D5DB',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: item.value ? '18px' : '2px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
