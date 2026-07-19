import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { lessonLimiter } from '../middleware/rateLimit';
import { AppError } from '../middleware/errorHandler';
import { startLessonTurn, continueLessonTurn } from '../services/claude';

const router = Router();
router.use(requireAuth);

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

// ── POST /api/lesson/start ────────────────────────────────────────────────────

const startSchema = z.object({
  chapterId: z.string().uuid(),
  taskIndex: z.number().int().min(0),
  language: z.enum(['hi', 'en', 'ta', 'te', 'kn', 'mr']).default('hi'),
});

router.post(
  '/start',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = startSchema.parse(req.body);
      const userId = req.user!.userId;

      const [user, chapter, studyPlan] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.chapterContent.findUnique({ where: { id: body.chapterId } }),
        prisma.studyPlan.findUnique({ where: { userId } }),
      ]);

      if (!user) return next(new AppError('User not found', 'USER_NOT_FOUND', 404));
      if (!chapter) return next(new AppError('Chapter not found', 'CHAPTER_NOT_FOUND', 404));

      // Pull task details from study plan
      let taskType: 'concept' | 'textbook' | 'practice' | 'revision' = 'concept';
      let conceptName: string | undefined;
      let questionText: string | undefined;

      if (studyPlan) {
        const planData = studyPlan.planData as {
          version?: number;
          generatedPlan?: {
            days?: {
              chapterName: string;
              tasks: {
                type: string;
                title: string;
                conceptExplained?: string | null;
                question?: string | null;
              }[];
            }[];
          };
        };
        const allTasks =
          planData.generatedPlan?.days
            ?.filter((d) => d.chapterName === chapter.chapterName)
            ?.flatMap((d) => d.tasks) ?? [];

        const task = allTasks[body.taskIndex];
        if (task) {
          taskType = task.type as typeof taskType;
          conceptName = task.conceptExplained ?? undefined;
          questionText = task.question ?? undefined;
        }
      }

      const firstTurn = await startLessonTurn({
        chapterName: chapter.chapterName,
        subject: chapter.subject,
        userClass: user.class,
        board: user.board,
        language: body.language,
        concepts: chapter.concepts,
        keyFacts: chapter.keyFacts,
        taskType,
        conceptName,
        questionText,
        conversationHistory: [],
      });

      const initialHistory: ConversationMessage[] = [
        { role: 'assistant', content: firstTurn.message },
      ];

      const session = await prisma.lessonSession.create({
        data: {
          userId,
          chapterId: body.chapterId,
          chapterName: chapter.chapterName,
          subject: chapter.subject,
          currentTaskIndex: body.taskIndex,
          conversationHistory: initialHistory,
        },
      });

      res.json({
        sessionId: session.id,
        message: firstTurn.message,
        taskType,
        conceptName: conceptName ?? null,
        question: questionText ?? null,
        taskComplete: firstTurn.taskComplete,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/lesson/respond ──────────────────────────────────────────────────

const respondSchema = z.object({
  sessionId: z.string().uuid(),
  studentMessage: z.string().min(1).max(2000),
});

router.post(
  '/respond',
  lessonLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = respondSchema.parse(req.body);
      const userId = req.user!.userId;

      const session = await prisma.lessonSession.findUnique({ where: { id: body.sessionId } });
      if (!session) return next(new AppError('Session not found', 'SESSION_NOT_FOUND', 404));
      if (session.userId !== userId) return next(new AppError('Access denied', 'FORBIDDEN', 403));
      if (session.status === 'completed') {
        return next(new AppError('Session already completed', 'SESSION_COMPLETED', 400));
      }

      const chapter = await prisma.chapterContent.findUnique({ where: { id: session.chapterId } });
      if (!chapter) return next(new AppError('Chapter not found', 'CHAPTER_NOT_FOUND', 404));

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return next(new AppError('User not found', 'USER_NOT_FOUND', 404));

      const history = session.conversationHistory as ConversationMessage[];
      const updatedHistory: ConversationMessage[] = [
        ...history,
        { role: 'user', content: body.studentMessage },
      ];

      const turn = await continueLessonTurn({
        chapterName: session.chapterName,
        subject: session.subject,
        userClass: user.class,
        board: user.board,
        language: 'hi',
        concepts: chapter.concepts,
        keyFacts: chapter.keyFacts,
        taskType: 'concept',
        conversationHistory: updatedHistory,
      });

      const finalHistory: ConversationMessage[] = [
        ...updatedHistory,
        { role: 'assistant', content: turn.message },
      ];

      const nextTaskIndex = turn.taskComplete
        ? session.currentTaskIndex + 1
        : session.currentTaskIndex;

      await prisma.lessonSession.update({
        where: { id: session.id },
        data: {
          conversationHistory: finalHistory,
          currentTaskIndex: nextTaskIndex,
        },
      });

      res.json({
        sessionId: session.id,
        message: turn.message,
        taskComplete: turn.taskComplete,
        comprehensionSignal: turn.comprehensionSignal,
        suggestedNextAction: turn.suggestedNextAction,
        nextTaskIndex,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/lesson/complete ─────────────────────────────────────────────────

const completeSchema = z.object({
  sessionId: z.string().uuid(),
});

router.post(
  '/complete',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = completeSchema.parse(req.body);
      const userId = req.user!.userId;

      const session = await prisma.lessonSession.findUnique({ where: { id: body.sessionId } });
      if (!session) return next(new AppError('Session not found', 'SESSION_NOT_FOUND', 404));
      if (session.userId !== userId) return next(new AppError('Access denied', 'FORBIDDEN', 403));

      await prisma.lessonSession.update({
        where: { id: session.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      const history = session.conversationHistory as ConversationMessage[];
      const conceptsLearned = Math.floor(history.filter((m) => m.role === 'assistant').length / 2);
      const questionsAttempted = history.filter((m) => m.role === 'user').length;

      res.json({
        ok: true,
        summary: { conceptsLearned, questionsAttempted },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
