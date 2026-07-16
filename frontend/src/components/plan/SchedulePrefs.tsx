import { useState } from 'react';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';

interface SchedulePrefsProps {
  hours: number;
  onHoursChange: (h: number) => void;
  lang: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_PREFS = [
  { id: 'morning', icon: '🌅', name: 'Morning', time: '6 AM – 12 PM' },
  { id: 'afternoon', icon: '☀️', name: 'Afternoon', time: '12 PM – 6 PM' },
  { id: 'evening', icon: '🌙', name: 'Evening', time: '6 PM – 11 PM' },
];

export default function SchedulePrefs({ hours, onHoursChange, lang }: SchedulePrefsProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];
  const [activeDays, setActiveDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [timePref, setTimePref] = useState('morning');

  const toggleDay = (day: string) =>
    setActiveDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hours Slider */}
      <div>
        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>{t.studyHoursLabel}</div>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#0D1B3E', fontFamily: 'Poppins, sans-serif' }}>
            {hours}
          </span>
          <span style={{ fontSize: '13px', color: '#6B7280', marginLeft: '4px' }}>hours / day</span>
        </div>
        <input
          type="range"
          min={2}
          max={12}
          value={hours}
          onChange={(e) => onHoursChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#FF6B00' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>
          <span>2h min</span>
          <span>6h ideal</span>
          <span>12h max</span>
        </div>
      </div>

      {/* Day Selector */}
      <div>
        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>{t.studyDaysLabel}</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {DAYS.map((day) => {
            const isOn = activeDays.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: `2px solid ${isOn ? '#FF6B00' : '#E5E7EB'}`,
                  background: isOn ? '#FF6B00' : '#fff',
                  color: isOn ? '#fff' : '#374151',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: isOn ? '0 2px 8px rgba(255,107,0,0.3)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Preference */}
      <div>
        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Preferred study time</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {TIME_PREFS.map((tp) => {
            const isSelected = timePref === tp.id;
            return (
              <div
                key={tp.id}
                onClick={() => setTimePref(tp.id)}
                style={{
                  border: `2px solid ${isSelected ? '#FF6B00' : '#E5E7EB'}`,
                  background: isSelected ? 'rgba(255,107,0,0.06)' : '#fff',
                  borderRadius: '10px',
                  padding: '10px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{tp.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0D1B3E' }}>{tp.name}</div>
                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>{tp.time}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selects Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
            {t.breakDurationLabel}
          </label>
          <select style={{ width: '100%', height: '36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '0 8px', fontSize: '12px' }}>
            <option>5 min</option>
            <option selected>10 min</option>
            <option>15 min</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
            {t.sessionLengthLabel}
          </label>
          <select style={{ width: '100%', height: '36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '0 8px', fontSize: '12px' }}>
            <option>30 min</option>
            <option selected>45 min Pomodoro</option>
            <option>60 min</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
            {t.mockFrequencyLabel}
          </label>
          <select style={{ width: '100%', height: '36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '0 8px', fontSize: '12px' }}>
            <option>Daily</option>
            <option selected>Weekly</option>
            <option>Fortnightly</option>
          </select>
        </div>
      </div>
    </div>
  );
}
