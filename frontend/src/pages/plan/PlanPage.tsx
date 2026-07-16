import { useState } from 'react';
import toast from 'react-hot-toast';
import { useStudyPlan } from '../../hooks/useStudyPlan';
import { useLanguage } from '../../hooks/useLanguage';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';
import SetupCard from '../../components/plan/SetupCard';
import CountdownBar from '../../components/plan/CountdownBar';
import WeekGrid from '../../components/plan/WeekGrid';
import TodayTaskList from '../../components/plan/TodayTaskList';
import StreakCard from '../../components/plan/StreakCard';
import MiniStats from '../../components/plan/MiniStats';
import WeaknessMap from '../../components/plan/WeaknessMap';
import WhatsAppPreview from '../../components/plan/WhatsAppPreview';

const DEFAULT_STATS = {
  totalStudiedMinutes: 0,
  totalTargetMinutes: 0,
  tasksCompleted: 0,
  totalTasks: 0,
  doubtsSolved: 0,
  mockScore: null as string | null,
};

type TabId = 'week' | 'month' | 'syllabus';

export function PlanPage() {
  const { plan, loading, completeTask, regenerate, regenerating } = useStudyPlan();
  const { language } = useLanguage();
  const t = planStrings[language as SupportedLang] ?? planStrings['en'];

  const [activeTab, setActiveTab] = useState<TabId>('week');
  const [setupOpen, setSetupOpen] = useState(false);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'week', label: t.tabWeek },
    { id: 'month', label: t.tabMonth },
    { id: 'syllabus', label: t.tabSyllabus },
  ];

  const handleTabClick = (tab: TabId) => {
    if (tab === 'week') {
      setActiveTab('week');
    } else {
      toast(t.toastComingSoon.replace('{tab}', tab === 'month' ? t.tabMonth : t.tabSyllabus));
    }
  };

  return (
    <div style={{ background: '#F1F3FB', minHeight: '100vh', padding: '24px 32px', fontFamily: 'Inter, sans-serif' }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
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
          <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>{t.pageSubtitle}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#fff',
              borderRadius: '10px',
              border: '1.5px solid #E5E7EB',
              overflow: 'hidden',
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: activeTab === tab.id ? '#FF6B00' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#6B7280',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSetupOpen((o) => !o)}
            style={{
              padding: '8px 16px',
              border: '1.5px solid #E5E7EB',
              borderRadius: '10px',
              background: '#fff',
              color: '#374151',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.editPlan}
          </button>

          <button
            onClick={regenerate}
            disabled={regenerating}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '10px',
              background: regenerating ? '#9CA3AF' : '#FF6B00',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: regenerating ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {regenerating ? '⏳' : t.regenerate}
          </button>
        </div>
      </div>

      {/* Setup card — visible when open or no plan yet */}
      {(setupOpen || (!plan && !loading)) && (
        <SetupCard
          onGenerate={regenerate}
          generating={regenerating}
          lang={language}
          onPlanReady={() => setSetupOpen(false)}
        />
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

      {plan && (
        <>
          <CountdownBar plan={plan} lang={language} />
          <WeekGrid plan={plan} lang={language} />

          <div
            style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'flex-start',
            }}
            className="flex-col xl:flex-row"
          >
            <TodayTaskList plan={plan} onComplete={completeTask} lang={language} />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                width: '100%',
                flexShrink: 0,
              }}
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
    </div>
  );
}
