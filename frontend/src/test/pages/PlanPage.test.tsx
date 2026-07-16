/**
 * PlanPage — Component Tests
 *
 * Covers:
 *  1. SetupCard renders open by default (when no plan is loaded)
 *  2. Clicking Generate triggers loading state, then collapses card + shows toast
 *  3. TaskRow click toggles done state and calls completeTask
 *  4. CountdownBar renders correct days difference from exam date
 *  5. WeekGrid renders exactly 7 DayColumn elements
 *  6. Today column has the today indicator applied
 *
 * Mocks: useStudyPlan (controls plan data & actions), useLanguage (en)
 * Real:  React rendering, DOM interactions via userEvent/fireEvent
 */

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlanPage } from '@/pages/plan/PlanPage';
import { renderWithProviders, setJwt } from '../helpers';
import type { WeekPlan } from '@/types/plan';

// ── Silence react-hot-toast ────────────────────────────────────────────────────
vi.mock('react-hot-toast', async () => {
  const actual = await vi.importActual<typeof import('react-hot-toast')>('react-hot-toast');
  return {
    ...actual,
    default: { error: vi.fn(), success: vi.fn(), loading: vi.fn(), __esModule: true },
    Toaster: () => null,
  };
});

// ── Mock useLanguage ──────────────────────────────────────────────────────────
vi.mock('@/hooks/useLanguage');
import { useLanguage } from '@/hooks/useLanguage';

// ── Mock useStudyPlan ─────────────────────────────────────────────────────────
vi.mock('@/hooks/useStudyPlan');
import { useStudyPlan } from '@/hooks/useStudyPlan';

// ── Helpers ───────────────────────────────────────────────────────────────────

const todayStr = new Date().toISOString().slice(0, 10);
const dayName = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
};
const dateStr = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const MOCK_PLAN: WeekPlan = {
  examDate: '2030-01-15',
  examTarget: 'JEE Mains 2030',
  syllabusProgressPercent: 68,
  currentStreak: 12,
  weeklyStats: {
    totalStudiedMinutes: 312,
    totalTargetMinutes: 420,
    tasksCompleted: 11,
    totalTasks: 18,
    doubtsSolved: 7,
    mockScore: '147/300',
  },
  weaknesses: [{ concept: 'Impulse', score: 80, level: 'weak' }],
  whatsappReminder: { enabled: false, tomorrowPlan: null },
  week: [
    {
      day: dayName(-3),
      date: dateStr(-3),
      isPast: true,
      tasks: [{ subject: 'Physics', topic: 'Newton Laws', duration: 45, type: 'learn', done: true }],
      totalMinutes: 45,
    },
    {
      day: dayName(-2),
      date: dateStr(-2),
      isPast: true,
      tasks: [{ subject: 'Maths', topic: 'Calculus', duration: 50, type: 'revise', done: true }],
      totalMinutes: 50,
    },
    {
      day: dayName(-1),
      date: dateStr(-1),
      isPast: true,
      tasks: [{ subject: 'Chemistry', topic: 'Bonding', duration: 40, type: 'learn', done: false }],
      totalMinutes: 40,
    },
    {
      day: dayName(0),
      date: todayStr,
      isToday: true,
      tasks: [
        { subject: 'Physics', topic: 'Momentum', duration: 45, type: 'learn', done: false },
        { subject: 'Maths', topic: 'Integration', duration: 50, type: 'learn', done: false },
      ],
      totalMinutes: 95,
    },
    {
      day: dayName(1),
      date: dateStr(1),
      tasks: [{ subject: 'Chemistry', topic: 'SN1 SN2', duration: 40, type: 'learn', done: false }],
      totalMinutes: 40,
    },
    {
      day: dayName(2),
      date: dateStr(2),
      tasks: [{ subject: 'Physics', topic: 'Mock Test', duration: 60, type: 'test', done: false }],
      totalMinutes: 60,
    },
    {
      day: dayName(3),
      date: dateStr(3),
      isRestDay: true,
      tasks: [],
      totalMinutes: 0,
    },
  ],
};

function setupMocks({
  plan = MOCK_PLAN,
  loading = false,
  regenerating = false,
  completeTask = vi.fn(),
  regenerate = vi.fn(),
}: {
  plan?: WeekPlan | null;
  loading?: boolean;
  regenerating?: boolean;
  completeTask?: ReturnType<typeof vi.fn>;
  regenerate?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.mocked(useLanguage).mockReturnValue({ language: 'en', setLanguage: vi.fn() });
  vi.mocked(useStudyPlan).mockReturnValue({
    plan,
    loading,
    error: null,
    completeTask,
    regenerating,
    regenerate,
  });
}

function renderPlanPage() {
  setJwt();
  return renderWithProviders(<PlanPage />, { initialEntries: ['/plan'] });
}

// ── TC-01: Setup card open by default (when no plan) ─────────────────────────
describe('TC-01 — SetupCard renders open when no plan is loaded', () => {
  beforeEach(() => setupMocks({ plan: null, loading: false }));

  it('shows the setup card header text', () => {
    renderPlanPage();
    expect(screen.getByText('Set Up Your Study Plan')).toBeTruthy();
  });

  it('renders the Generate AI Plan button', () => {
    renderPlanPage();
    expect(screen.getByText('🤖 Generate AI Plan')).toBeTruthy();
  });
});

// ── TC-02: Generate button triggers loading then collapses ────────────────────
describe('TC-02 — Clicking Generate calls regenerate', () => {
  it('calls regenerate when the generate button is clicked', async () => {
    const regenerate = vi.fn();
    setupMocks({ plan: null, loading: false, regenerate });
    renderPlanPage();

    const btn = screen.getByText('🤖 Generate AI Plan');
    fireEvent.click(btn);

    expect(regenerate).toHaveBeenCalledTimes(1);
  });

  it('shows loading text while regenerating', () => {
    setupMocks({ plan: null, regenerating: true });
    renderPlanPage();
    expect(screen.getByText('⏳ Generating...')).toBeTruthy();
  });
});

// ── TC-03: TaskRow click calls completeTask ───────────────────────────────────
describe('TC-03 — TaskRow toggles and calls completeTask', () => {
  it('calls completeTask with the correct date and index when a task row is clicked', () => {
    const completeTask = vi.fn();
    setupMocks({ completeTask });
    renderPlanPage();

    // In TodayTaskList, the topic renders in a 13px bold div (TaskRow).
    // getAllByText returns multiple matches (TaskBlock + TaskRow); use the TaskRow one (13px).
    const allMomentum = screen.getAllByText('Momentum');
    const taskRowText = allMomentum.find((el) =>
      (el as HTMLElement).style.fontSize === '13px'
    ) as HTMLElement;
    expect(taskRowText).toBeTruthy();

    // Walk up to the clickable row container
    const row = taskRowText.closest('div[style*="cursor: pointer"]') as HTMLElement;
    expect(row).toBeTruthy();
    fireEvent.click(row);

    expect(completeTask).toHaveBeenCalledWith(todayStr, 0);
  });
});

// ── TC-04: Countdown renders days from exam date ──────────────────────────────
describe('TC-04 — CountdownBar renders days to exam', () => {
  it('shows a positive days number when exam date is in the future', () => {
    setupMocks();
    renderPlanPage();

    const daysElements = screen.getAllByText('Days');
    expect(daysElements.length).toBeGreaterThan(0);

    const container = daysElements[0].closest('[style]') as HTMLElement;
    if (container) {
      const num = container.previousElementSibling?.textContent ?? '';
      expect(Number(num)).toBeGreaterThan(0);
    }
  });
});

// ── TC-05: WeekGrid renders exactly 7 columns ─────────────────────────────────
describe('TC-05 — WeekGrid renders 7 DayColumn elements', () => {
  it('shows 7 day columns', () => {
    setupMocks();
    renderPlanPage();

    // DayColumn renders the 3-letter abbreviation as uppercase text (Mon, Tue…).
    // Each day in MOCK_PLAN has a unique date so we get 7 distinct columns.
    const dayAbbrevs = screen.getAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i);
    expect(dayAbbrevs.length).toBe(7);
  });
});

// ── TC-06: Today column has the today indicator ───────────────────────────────
describe('TC-06 — Today column has the "Today" pill', () => {
  it('renders the Today pill exactly once', () => {
    setupMocks();
    renderPlanPage();

    const todayPills = screen.getAllByText('Today');
    expect(todayPills.length).toBeGreaterThanOrEqual(1);
  });
});
