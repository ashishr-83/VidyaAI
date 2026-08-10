import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useStudyPlan } from '../../hooks/useStudyPlan';
import { useLanguage } from '../../hooks/useLanguage';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';
import type { DayPlan, SubjectChapterSelection } from '../../types/plan';
import CountdownBar from '../../components/plan/CountdownBar';
import WeekGrid from '../../components/plan/WeekGrid';
import TodayTaskList from '../../components/plan/TodayTaskList';
import StreakCard from '../../components/plan/StreakCard';
import MiniStats from '../../components/plan/MiniStats';
import WeaknessMap from '../../components/plan/WeaknessMap';
import WhatsAppPreview from '../../components/plan/WhatsAppPreview';
import { ChapterPicker } from '../../components/plan/ChapterPicker';
import GeneratingOverlay from '../../components/plan/GeneratingOverlay';
import DayDetailModal from '../../components/plan/DayDetailModal';

const DEFAULT_STATS = {
  totalStudiedMinutes: 0,
  totalTargetMinutes: 0,
  tasksCompleted: 0,
  totalTasks: 0,
  doubtsSolved: 0,
  mockScore: null as string | null,
};

type PlanStep = 1 | 2; // 1 = subjects & chapters, 2 = weekly plan

export function PlanPage() {
  const { plan, loading, completeTask, regenerate, regenerating } = useStudyPlan();
  const { language } = useLanguage();
  const t = planStrings[language as SupportedLang] ?? planStrings['en'];

  const [activeStep, setActiveStep] = useState<PlanStep>(() => (plan ? 2 : 1));
  const [overlayStep, setOverlayStep] = useState(0); // 0 = hidden, 1–4 = animating
  const [showModal, setShowModal] = useState<DayPlan | null>(null);

  // Animate overlay when regenerating kicks off
  const overlayTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearOverlayTimers = () => {
    overlayTimers.current.forEach(clearTimeout);
    overlayTimers.current = [];
  };

  const runOverlayAnimation = () => {
    clearOverlayTimers();
    setOverlayStep(1);
    [2, 3, 4].forEach((step, i) => {
      const id = setTimeout(() => setOverlayStep(step), (i + 1) * 480);
      overlayTimers.current.push(id);
    });
    // Hide overlay and advance to step 2 after animation completes
    const doneId = setTimeout(() => {
      setOverlayStep(0);
      setActiveStep(2);
    }, 4 * 480 + 400);
    overlayTimers.current.push(doneId);
  };

  // When regenerating finishes, move to step 2 (in case animation already done)
  const prevRegenerating = useRef(false);
  useEffect(() => {
    if (prevRegenerating.current && !regenerating) {
      // Ensure we land on step 2 after plan is ready
      clearOverlayTimers();
      setOverlayStep(0);
      setActiveStep(2);
    }
    prevRegenerating.current = regenerating;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regenerating]);

  // Move to step 2 when a plan becomes available (e.g. after first generate)
  useEffect(() => {
    if (plan && !loading && activeStep === 1) setActiveStep(2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const handleGenerate = async (
    subjectSelections: SubjectChapterSelection[],
    dailyMinutes: number,
    lang: string,
  ) => {
    runOverlayAnimation();
    // Fire regenerate for each subject selection sequentially (first one wins for MVP)
    if (subjectSelections.length > 0) {
      const first = subjectSelections[0];
      await regenerate(first.chapterIds, dailyMinutes, lang, first.subject);
    } else {
      await regenerate();
    }
  };

  const steps: { id: PlanStep; label: string }[] = [
    { id: 1, label: t.stepSubjectsChapters },
    { id: 2, label: t.stepWeeklyPlan },
  ];

  return (
    <div style={{ background: '#F1F3FB', minHeight: '100vh', padding: '24px 32px', fontFamily: 'Inter, sans-serif' }}>

      {/* Generating overlay */}
      <GeneratingOverlay visible={overlayStep > 0} activeStep={overlayStep} lang={language} />

      {/* Day detail modal */}
      <DayDetailModal
        day={showModal}
        onClose={() => setShowModal(null)}
        onComplete={(date, taskIndex) => void completeTask(date, taskIndex)}
        lang={language}
      />

      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '26px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255,107,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            📋
          </div>
          <div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#0D1B3E',
                fontFamily: 'Poppins, sans-serif',
                margin: 0,
              }}
            >
              {t.pageTitle}
            </h1>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>
              Three quick steps — your plan updates itself as you go
            </p>
          </div>
        </div>

        {/* 2-step stepper */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: '#fff',
            padding: '6px',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
          }}
        >
          {steps.map((step) => {
            const isActive = activeStep === step.id;
            const isDone = activeStep > step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: isActive ? '#0D1B3E' : 'transparent',
                  color: isActive ? '#fff' : '#9CA3AF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: isActive ? '#FF6B00' : isDone ? '#1B8A4E' : '#E5E7EB',
                    color: isActive || isDone ? '#fff' : '#9CA3AF',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isDone ? '✓' : step.id}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step 1: Subjects & Chapters ───────────────────────────────────────── */}
      {activeStep === 1 && (
        <ChapterPicker
          language={language}
          onGenerate={({ subjectSelections, dailyMinutes, language: lang }) => {
            void handleGenerate(subjectSelections, dailyMinutes, lang);
          }}
          generating={regenerating}
        />
      )}

      {/* ── Step 2: Weekly Plan ────────────────────────────────────────────────── */}
      {activeStep === 2 && (
        <>
          {/* Syllabus progress banner */}
          {plan && (
            <div
              style={{
                background: 'linear-gradient(120deg, #0D1B3E, #1a2352)',
                borderRadius: '16px',
                padding: '22px 28px',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px',
                marginBottom: '24px',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: '#9aa0c2' }}>{t.studyFocus}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '2px', fontFamily: 'Poppins, sans-serif' }}>
                  {plan.examTarget || 'Class 7 · CBSE · Daily plan'}
                </div>
              </div>
              <div style={{ minWidth: '220px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9aa0c2', marginBottom: '8px' }}>
                  <span>{t.syllabusProgress}</span>
                  <b style={{ color: '#FF6B00' }}>{plan.syllabusProgressPercent}%</b>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '99px' }}>
                  <div
                    style={{
                      height: '8px',
                      background: '#FF6B00',
                      borderRadius: '99px',
                      width: `${plan.syllabusProgressPercent}%`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              <div style={{ color: '#6B7280', fontSize: '13px' }}>Loading your study plan...</div>
            </div>
          )}

          {!plan && !loading && (
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '48px',
                textAlign: 'center',
                marginBottom: '20px',
                border: '1.5px dashed #E5E7EB',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0D1B3E', fontFamily: 'Poppins, sans-serif', marginBottom: '6px' }}>
                No plan yet
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
                Go back to step 1 to select chapters and generate your weekly plan.
              </div>
              <button
                onClick={() => setActiveStep(1)}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '10px',
                  background: '#FF6B00',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ← Select Chapters
              </button>
            </div>
          )}

          {plan && (
            <>
              <WeekGrid plan={plan} lang={language} onDayClick={(day) => setShowModal(day)} />

              <div
                style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}
                className="flex-col xl:flex-row"
              >
                <TodayTaskList plan={plan} onComplete={completeTask} lang={language} />

                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', flexShrink: 0 }}
                  className="xl:w-80"
                >
                  <StreakCard streak={plan.currentStreak} lang={language} />
                  <MiniStats stats={plan.weeklyStats ?? DEFAULT_STATS} lang={language} />
                  <WeaknessMap weaknesses={plan.weaknesses} lang={language} />
                  <WhatsAppPreview reminder={plan.whatsappReminder} lang={language} />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
