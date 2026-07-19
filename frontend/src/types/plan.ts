import { z } from 'zod';

export const TaskItemSchema = z.object({
  subject: z.string(),
  topic: z.string(),
  duration: z.number(),
  type: z.enum(['learn', 'revise', 'practice', 'test']),
  done: z.boolean().default(false),
});

export const DayPlanSchema = z.object({
  day: z.string(),
  date: z.string(),
  tasks: z.array(TaskItemSchema),
  totalMinutes: z.number(),
  isToday: z.boolean().optional(),
  isPast: z.boolean().optional(),
  isRestDay: z.boolean().optional(),
});

export const WeekPlanSchema = z.object({
  week: z.array(DayPlanSchema),
  examDate: z.string().nullable(),
  examTarget: z.string(),
  syllabusProgressPercent: z.number(),
  currentStreak: z.number(),
  weeklyStats: z.object({
    totalStudiedMinutes: z.number(),
    totalTargetMinutes: z.number(),
    tasksCompleted: z.number(),
    totalTasks: z.number(),
    doubtsSolved: z.number(),
    mockScore: z.string().nullable(),
  }),
  weaknesses: z.array(
    z.object({
      concept: z.string(),
      score: z.number(),
      level: z.enum(['weak', 'medium', 'strong']),
    })
  ),
  whatsappReminder: z.object({
    enabled: z.boolean(),
    tomorrowPlan: z.string().nullable(),
  }),
});

export type TaskItem = z.infer<typeof TaskItemSchema>;
export type DayPlan = z.infer<typeof DayPlanSchema>;
export type WeekPlan = z.infer<typeof WeekPlanSchema>;

// ── NCERT Chapter types ───────────────────────────────────────────────────────

export interface ChapterListItem {
  id: string;
  chapterNumber: number;
  chapterName: string;
  estimatedMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ── Study Plan Output (v2 — chapter-based) ───────────────────────────────────

export const StudyPlanTaskSchema = z.object({
  type: z.enum(['concept', 'textbook', 'practice', 'revision']),
  title: z.string(),
  durationMinutes: z.number(),
  conceptExplained: z.string().nullable(),
  question: z.string().nullable(),
  hint: z.string().nullable(),
});

export const StudyPlanDaySchema = z.object({
  day: z.number(),
  date: z.string(),
  chapterName: z.string(),
  tasks: z.array(StudyPlanTaskSchema),
  totalMinutes: z.number(),
  dayGoal: z.string(),
});

export const StudyPlanOutputSchema = z.object({
  totalDays: z.number(),
  subject: z.string(),
  selectedChapters: z.array(z.string()),
  days: z.array(StudyPlanDaySchema),
  weeklyRevisionDays: z.array(z.number()),
  estimatedCompletionDate: z.string(),
});

export type StudyPlanTask = z.infer<typeof StudyPlanTaskSchema>;
export type StudyPlanDay = z.infer<typeof StudyPlanDaySchema>;
export type StudyPlanOutput = z.infer<typeof StudyPlanOutputSchema>;

// ── Lesson Session types ──────────────────────────────────────────────────────

export const LessonTurnSchema = z.object({
  message: z.string(),
  taskComplete: z.boolean(),
  comprehensionSignal: z.enum(['understood', 'partial', 'confused', 'no_response']),
  suggestedNextAction: z.enum(['continue', 'repeat_concept', 'give_hint', 'move_on']),
});

export type LessonTurn = z.infer<typeof LessonTurnSchema>;

export interface LessonMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface LessonStartResponse {
  sessionId: string;
  message: string;
  taskType: string;
  conceptName: string | null;
  question: string | null;
  taskComplete: boolean;
}

export interface LessonRespondResponse {
  sessionId: string;
  message: string;
  taskComplete: boolean;
  comprehensionSignal: string;
  suggestedNextAction: string;
  nextTaskIndex: number;
}
