import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';
import ExamGrid from './ExamGrid';
import SubjectGrid from './SubjectGrid';
import SchedulePrefs from './SchedulePrefs';
import ReminderSetup from './ReminderSetup';

interface SetupCardProps {
  onGenerate: () => void;
  generating: boolean;
  lang: string;
  onPlanReady?: () => void;
}

const STEPS = ['stepExamTarget', 'stepSubjects', 'stepSchedule', 'stepReminders'] as const;

export default function SetupCard({ onGenerate, generating, lang, onPlanReady }: SetupCardProps) {
  const t = planStrings[lang as SupportedLang] ?? planStrings['en'];
  const [open, setOpen] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [examTarget, setExamTarget] = useState('JEE Mains 2026');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Physics', 'Chemistry', 'Maths']);
  const [hours, setHours] = useState(6);
  const [planReady, setPlanReady] = useState(false);

  const prevGenerating = useState(generating)[0];

  useEffect(() => {
    if (prevGenerating && !generating && open) {
      setOpen(false);
      setPlanReady(true);
      toast.success(t.toastGenerated);
      onPlanReady?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating]);

  const toggleSubject = (subj: string) =>
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );

  const stepLabels: string[] = [t.stepExamTarget, t.stepSubjects, t.stepSchedule, t.stepReminders];

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div
        onClick={() => !generating && setOpen((o) => !o)}
        style={{
          background: 'linear-gradient(135deg, #0D1B3E 0%, #1a237e 100%)',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#FF6B00',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
          }}
        >
          📅
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: 'Poppins, sans-serif' }}>
            {t.setupTitle}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
            {t.setupSubtitle}
          </div>
        </div>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '14px',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          ▾
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: '24px' }}>
          {/* Progress steps */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
            {STEPS.map((_, i) => {
              const isDone = i < activeStep;
              const isActive = i === activeStep;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'unset' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div
                      onClick={() => setActiveStep(i)}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: isDone ? '#1B8A4E' : isActive ? '#FF6B00' : '#fff',
                        border: `2px solid ${isDone ? '#1B8A4E' : isActive ? '#FF6B00' : '#E5E7EB'}`,
                        color: isDone || isActive ? '#fff' : '#9CA3AF',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 2px 8px rgba(255,107,0,0.3)' : 'none',
                        transition: 'all 0.15s',
                        flexShrink: 0,
                      }}
                    >
                      {isDone ? '✓' : i + 1}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        color: isDone ? '#1B8A4E' : isActive ? '#FF6B00' : '#9CA3AF',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {stepLabels[i]}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: '2px',
                        background: isDone ? '#1B8A4E' : '#E5E7EB',
                        margin: '0 4px',
                        marginBottom: '20px',
                        transition: 'background 0.2s',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content */}
          <div style={{ marginBottom: '24px' }}>
            {activeStep === 0 && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0D1B3E', marginBottom: '12px', fontFamily: 'Poppins, sans-serif' }}>
                  {t.stepExamTarget}
                </div>
                <ExamGrid selected={examTarget} onSelect={setExamTarget} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
                  {[t.examDateLabel, t.classLabel, t.targetScoreLabel].map((label) => (
                    <div key={label}>
                      <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>{label}</label>
                      <input
                        type={label === t.examDateLabel ? 'date' : 'text'}
                        defaultValue={label === t.examDateLabel ? '2026-01-15' : ''}
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
                  ))}
                </div>
              </div>
            )}

            {activeStep === 1 && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0D1B3E', marginBottom: '6px', fontFamily: 'Poppins, sans-serif' }}>
                  {t.subjectsTitle}
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '12px' }}>{t.priorityHint}</div>
                <SubjectGrid selected={selectedSubjects} onToggle={toggleSubject} lang={lang} />
              </div>
            )}

            {activeStep === 2 && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0D1B3E', marginBottom: '16px', fontFamily: 'Poppins, sans-serif' }}>
                  {t.scheduleTitle}
                </div>
                <SchedulePrefs hours={hours} onHoursChange={setHours} lang={lang} />
              </div>
            )}

            {activeStep === 3 && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0D1B3E', marginBottom: '16px', fontFamily: 'Poppins, sans-serif' }}>
                  {t.remindersTitle}
                </div>
                <ReminderSetup lang={lang} />
              </div>
            )}
          </div>

          {/* Step navigation */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            {activeStep > 0 && (
              <button
                onClick={() => setActiveStep((s) => s - 1)}
                style={{
                  padding: '10px 20px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '8px',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
            )}
            {activeStep < STEPS.length - 1 && (
              <button
                onClick={() => setActiveStep((s) => s + 1)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#FF6B00',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Next →
              </button>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={onGenerate}
            disabled={generating}
            style={{
              width: '100%',
              height: '52px',
              background: generating
                ? 'linear-gradient(135deg, #9CA3AF, #6B7280)'
                : 'linear-gradient(135deg, #FF6B00 0%, #FF9800 100%)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 800,
              fontFamily: 'Poppins, sans-serif',
              cursor: generating ? 'not-allowed' : 'pointer',
              boxShadow: generating ? 'none' : '0 4px 14px rgba(255,107,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            {planReady ? t.planReadyBtn : generating ? t.generatingBtn : t.generateBtn}
          </button>
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#9CA3AF', marginTop: '8px' }}>
            {t.generateNote}
          </div>
        </div>
      )}
    </div>
  );
}
