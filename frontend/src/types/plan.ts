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
