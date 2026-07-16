import type { WeekPlan } from '../../types/plan';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';

interface WhatsAppPreviewProps {
  reminder: WeekPlan['whatsappReminder'];
  lang: string;
}

export default function WhatsAppPreview({ reminder, lang }: WhatsAppPreviewProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];

  if (!reminder.enabled || !reminder.tomorrowPlan) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(37,211,102,0.08) 0%, rgba(37,211,102,0.04) 100%)',
        border: '1.5px solid rgba(37,211,102,0.3)',
        borderRadius: '16px',
        padding: '16px',
      }}
    >
      <div
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#1B8A4E',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '4px',
        }}
      >
        {t.whatsappReminderTitle}
      </div>
      <div style={{ fontSize: '11px', color: '#1B8A4E', opacity: 0.7, marginBottom: '10px' }}>
        {t.whatsappReminderSub}
      </div>
      <div
        style={{
          background: '#E7FEF0',
          borderRadius: '8px',
          padding: '10px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#1B8A4E', marginBottom: '6px' }}>
          🤖 VidyaAI
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#1F2937',
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
          }}
        >
          {reminder.tomorrowPlan}
        </div>
        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '6px', opacity: 0.6 }}>
          Delivered via WhatsApp · 7:00 AM
        </div>
      </div>
    </div>
  );
}
