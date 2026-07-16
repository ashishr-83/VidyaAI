import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { apiClient } from '../lib/axios';
import { WeekPlanSchema, type WeekPlan } from '../types/plan';

const today = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const dayName = (d: Date) =>
  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];

function makeDate(offset: number) {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d;
}

const MOCK_PLAN: WeekPlan = {
  examDate: '2026-01-15',
  examTarget: 'JEE Mains 2026',
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
  weaknesses: [
    { concept: 'Impulse & Momentum', score: 82, level: 'weak' },
    { concept: 'Integration', score: 65, level: 'medium' },
    { concept: 'SN1 vs SN2', score: 58, level: 'medium' },
  ],
  whatsappReminder: {
    enabled: true,
    tomorrowPlan:
      '📚 Kal ka plan:\n• Physics — Work-Energy Theorem (45 min)\n• Maths — Definite Integrals (50 min)\n• Chemistry — Electrochemistry (40 min)\n• 20 MCQs Mixed (25 min)\n\nTotal: 2h 40min 🎯\nAll the best! — VidyaAI',
  },
  week: [
    {
      day: dayName(makeDate(-3)),
      date: fmt(makeDate(-3)),
      isPast: true,
      tasks: [
        { subject: 'Physics', topic: 'Newton\'s Laws', duration: 45, type: 'learn', done: true },
        { subject: 'Maths', topic: 'Differentiation', duration: 50, type: 'revise', done: true },
        { subject: 'Chemistry', topic: 'Periodic Table', duration: 40, type: 'revise', done: true },
      ],
      totalMinutes: 135,
    },
    {
      day: dayName(makeDate(-2)),
      date: fmt(makeDate(-2)),
      isPast: true,
      tasks: [
        { subject: 'Physics', topic: 'Work & Energy', duration: 45, type: 'learn', done: true },
        { subject: 'Maths', topic: 'Integration Basics', duration: 50, type: 'learn', done: true },
        { subject: 'Mixed', topic: '25 MCQs Practice', duration: 30, type: 'practice', done: true },
      ],
      totalMinutes: 125,
    },
    {
      day: dayName(makeDate(-1)),
      date: fmt(makeDate(-1)),
      isPast: true,
      tasks: [
        { subject: 'Physics', topic: 'Impulse & Momentum', duration: 45, type: 'learn', done: true },
        { subject: 'Maths', topic: 'Integration by Parts', duration: 50, type: 'learn', done: false },
        { subject: 'Chemistry', topic: 'SN1 vs SN2', duration: 40, type: 'learn', done: false },
        { subject: 'Mixed', topic: '25 MCQs', duration: 30, type: 'practice', done: false },
      ],
      totalMinutes: 165,
    },
    {
      day: dayName(makeDate(0)),
      date: fmt(makeDate(0)),
      isToday: true,
      tasks: [
        { subject: 'Physics', topic: 'Impulse & Momentum', duration: 45, type: 'learn', done: true },
        { subject: 'Maths', topic: 'Integration by Parts', duration: 50, type: 'learn', done: false },
        { subject: 'Chemistry', topic: 'SN1 vs SN2 Reactions', duration: 40, type: 'learn', done: false },
        { subject: 'Mixed', topic: '25 MCQs Practice', duration: 30, type: 'practice', done: false },
      ],
      totalMinutes: 165,
    },
    {
      day: dayName(makeDate(1)),
      date: fmt(makeDate(1)),
      tasks: [
        { subject: 'Physics', topic: 'Work-Energy Theorem', duration: 45, type: 'learn', done: false },
        { subject: 'Maths', topic: 'Definite Integrals', duration: 50, type: 'revise', done: false },
        { subject: 'Chemistry', topic: 'Electrochemistry', duration: 40, type: 'learn', done: false },
      ],
      totalMinutes: 135,
    },
    {
      day: dayName(makeDate(2)),
      date: fmt(makeDate(2)),
      tasks: [
        { subject: 'Physics', topic: 'Mock Test — Mechanics', duration: 60, type: 'test', done: false },
        { subject: 'Maths', topic: 'Coordinate Geometry', duration: 45, type: 'revise', done: false },
      ],
      totalMinutes: 105,
    },
    {
      day: dayName(makeDate(3)),
      date: fmt(makeDate(3)),
      isRestDay: true,
      tasks: [],
      totalMinutes: 0,
    },
  ],
};

export function useStudyPlan() {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/plan/week');
      setPlan(WeekPlanSchema.parse(res.data));
    } catch {
      setPlan(MOCK_PLAN);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const completeTask = useCallback((date: string, taskIndex: number) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        week: prev.week.map((day) => {
          if (day.date !== date) return day;
          return {
            ...day,
            tasks: day.tasks.map((task, idx) =>
              idx === taskIndex ? { ...task, done: !task.done } : task
            ),
          };
        }),
      };
    });

    apiClient
      .post('/api/plan/complete-task', { date, taskIndex })
      .catch((err) => console.warn('complete-task failed:', err));
  }, []);

  const regenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      await apiClient.post('/api/plan/regenerate');
      await fetchPlan();
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { error?: string })?.error ?? 'Regeneration failed')
        : 'Regeneration failed';
      toast.error(msg);
    } finally {
      setRegenerating(false);
    }
  }, [fetchPlan]);

  return { plan, loading, error, completeTask, regenerating, regenerate };
}
