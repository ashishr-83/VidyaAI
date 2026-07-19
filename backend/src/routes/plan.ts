import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { prisma } from '../lib/prisma';

// Returns `any` so the value is accepted by Prisma Json fields across all
// @prisma/client versions (InputJsonValue was not in the Prisma namespace until 5.22+).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDbJson(value: unknown): any {
  return JSON.parse(JSON.stringify(value));
}
import { logger } from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generateStudyPlan, type ChapterSummaryInput } from '../services/claude';
import { env } from '../lib/env';

const router = Router();
router.use(requireAuth);

// ── Redis client (lazy init, non-fatal if unavailable) ────────────────────────

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis(env.REDIS_URL, { lazyConnect: true, enableOfflineQueue: false });
    redis.on('error', (err: unknown) => {
      logger.warn('Redis error — plan caching disabled', { err });
      redis = null;
    });
    return redis;
  } catch (err) {
    logger.warn('Redis init failed — plan caching disabled', { err });
    return null;
  }
}

function planCacheKey(chapterIds: string[], dailyMinutes: number, language: string): string {
  const payload = chapterIds.slice().sort().join(',') + `|${dailyMinutes}|${language}`;
  return `plan:v2:${crypto.createHash('sha256').update(payload).digest('hex')}`;
}

// ── GET /api/plan/available ───────────────────────────────────────────────────
// Returns the distinct class/board/subject combos that have been extracted
// into the DB. Frontend uses this to populate class + subject dropdowns.

router.get(
  '/available',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await prisma.chapterContent.findMany({
        distinct: ['class', 'board', 'subject'],
        select: { class: true, board: true, subject: true },
        orderBy: [{ class: 'asc' }, { subject: 'asc' }],
      });

      // Group into { classLevel, board, subjects[] } for easy consumption
      const grouped = new Map<string, { classLevel: number; board: string; subjects: string[] }>();
      for (const row of rows) {
        const key = `${row.class}|${row.board}`;
        if (!grouped.has(key)) {
          grouped.set(key, { classLevel: row.class, board: row.board, subjects: [] });
        }
        grouped.get(key)!.subjects.push(row.subject);
      }

      res.json({ available: Array.from(grouped.values()) });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/plan/chapters ────────────────────────────────────────────────────

const chaptersQuerySchema = z.object({
  class: z.coerce.number().int().min(6).max(13).default(7),
  board: z.string().default('CBSE'),
  subject: z.string().min(1),
});

router.get(
  '/chapters',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = chaptersQuerySchema.parse(req.query);

      const chapters = await prisma.chapterContent.findMany({
        where: {
          class: query.class,
          board: query.board,
          subject: query.subject,
        },
        orderBy: { chapterNumber: 'asc' },
        select: {
          id: true,
          chapterNumber: true,
          chapterName: true,
          estimatedMinutes: true,
          difficulty: true,
        },
      });

      res.json({ chapters });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/plan/regenerate ────────────────────────────────────────────────

const regenerateSchema = z.object({
  subject: z.string().min(1),
  chapterIds: z.array(z.string().uuid()).min(1).max(12),
  dailyMinutes: z.number().int().min(30).max(480).default(120),
  language: z.enum(['hi', 'en', 'ta', 'te', 'kn', 'mr']).default('hi'),
});

router.post(
  '/regenerate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = regenerateSchema.parse(req.body);
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return next(new AppError('User not found', 'USER_NOT_FOUND', 404));

      // Fetch chapter data
      const chapterRows = await prisma.chapterContent.findMany({
        where: { id: { in: body.chapterIds } },
        orderBy: { chapterNumber: 'asc' },
      });

      if (chapterRows.length === 0) {
        return next(new AppError('No chapters found for given IDs', 'CHAPTER_NOT_FOUND', 404));
      }

      const chapters: ChapterSummaryInput[] = chapterRows.map((ch: typeof chapterRows[number]) => ({
        chapterNumber: ch.chapterNumber,
        chapterName: ch.chapterName,
        concepts: ch.concepts,
        textbookQuestions: ch.textbookQuestions as { question: string; answer: string }[],
        keyFacts: ch.keyFacts,
        estimatedMinutes: ch.estimatedMinutes,
        difficulty: ch.difficulty,
      }));

      // Redis cache check
      const cacheKey = planCacheKey(body.chapterIds, body.dailyMinutes, body.language);
      const rc = getRedis();

      if (rc) {
        try {
          const cached = await rc.get(cacheKey);
          if (cached) {
            logger.info('generateStudyPlan cache hit', { cacheKey });
            const generatedPlan = JSON.parse(cached);

            await prisma.studyPlan.upsert({
              where: { userId },
              update: {
                planData: toDbJson({ version: 2, selectedChapterIds: body.chapterIds, subject: body.subject, generatedPlan }),
                weeklyTarget: body.dailyMinutes * 7,
              },
              create: {
                userId,
                planData: toDbJson({ version: 2, selectedChapterIds: body.chapterIds, subject: body.subject, generatedPlan }),
                weeklyTarget: body.dailyMinutes * 7,
              },
            });

            res.json({ plan: generatedPlan, fromCache: true });
            return;
          }
        } catch (redisErr) {
          logger.warn('Redis get failed', { redisErr });
        }
      }

      // Generate plan via Claude
      const generatedPlan = await generateStudyPlan({
        userClass: user.class,
        board: user.board,
        subject: body.subject,
        dailyMinutes: body.dailyMinutes,
        language: body.language,
        chapters,
      });

      // Cache the result
      if (rc) {
        try {
          await rc.set(cacheKey, JSON.stringify(generatedPlan), 'EX', 86400);
        } catch (redisErr) {
          logger.warn('Redis set failed', { redisErr });
        }
      }

      // Upsert StudyPlan in DB
      await prisma.studyPlan.upsert({
        where: { userId },
        update: {
          planData: toDbJson({ version: 2, selectedChapterIds: body.chapterIds, subject: body.subject, generatedPlan }),
          weeklyTarget: body.dailyMinutes * 7,
        },
        create: {
          userId,
          planData: toDbJson({ version: 2, selectedChapterIds: body.chapterIds, subject: body.subject, generatedPlan }),
          weeklyTarget: body.dailyMinutes * 7,
        },
      });

      res.json({ plan: generatedPlan, fromCache: false });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/plan/today ──────────────────────────────────────────────────────

router.get(
  '/today',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const studyPlan = await prisma.studyPlan.findUnique({ where: { userId } });
      if (!studyPlan) return next(new AppError('No study plan found', 'PLAN_NOT_FOUND', 404));

      const planData = studyPlan.planData as {
        version: number;
        generatedPlan?: { days?: { date: string }[] };
      };

      const today = new Date().toISOString().slice(0, 10);
      const todayDay = planData.generatedPlan?.days?.find((d) => d.date === today) ?? null;

      res.json({ today: todayDay, streak: studyPlan.currentStreak });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/plan/complete-task ─────────────────────────────────────────────

const completeTaskSchema = z.object({
  date: z.string().min(1),
  taskIndex: z.number().int().min(0),
});

router.post(
  '/complete-task',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = completeTaskSchema.parse(req.body);
      const userId = req.user!.userId;

      const studyPlan = await prisma.studyPlan.findUnique({ where: { userId } });
      if (!studyPlan) return next(new AppError('No study plan found', 'PLAN_NOT_FOUND', 404));

      res.json({ ok: true, date: body.date, taskIndex: body.taskIndex });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/plan/week ───────────────────────────────────────────────────────

router.get(
  '/week',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const studyPlan = await prisma.studyPlan.findUnique({ where: { userId } });
      if (!studyPlan) return next(new AppError('No study plan found', 'PLAN_NOT_FOUND', 404));

      res.json({ planData: studyPlan.planData, streak: studyPlan.currentStreak });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
