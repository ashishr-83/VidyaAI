import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { requireAuth, requireTier } from '../middleware/auth';
import { doubtLimiter } from '../middleware/rateLimit';
import { AppError } from '../middleware/errorHandler';
import { solveDoubt, tagWeakness } from '../services/claude';
import { getUploadPresignedUrl, transcribeAudio, synthesiseSpeech } from '../services/speech';

const router = Router();

router.use(requireAuth);
router.use(doubtLimiter);

// ── GET /api/doubt/upload-url ─────────────────────────────────────────────────

const uploadUrlQuerySchema = z.object({
  contentType: z.enum(['audio/webm', 'audio/mp4', 'audio/ogg']),
});

router.get(
  '/upload-url',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = uploadUrlQuerySchema.parse(req.query);
      const userId = req.user!.userId;

      const { uploadUrl, s3Key } = await getUploadPresignedUrl({ userId, contentType: query.contentType });

      res.json({ uploadUrl, s3Key, expiresIn: 300 });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/doubt/transcribe ────────────────────────────────────────────────

const transcribeSchema = z.object({
  s3Key: z.string().min(1),
  language: z.enum(['hi', 'en', 'ta', 'te', 'kn', 'mr']).default('hi'),
});

router.post(
  '/transcribe',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = transcribeSchema.parse(req.body);
      const userId = req.user!.userId;

      if (!body.s3Key.startsWith(`audio/uploads/${userId}/`)) {
        return next(new AppError('Invalid S3 key', 'INVALID_S3_KEY', 400));
      }

      const transcribedText = await transcribeAudio({ s3Key: body.s3Key, languageCode: body.language });

      res.json({ transcribedText });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/doubt/solve ──────────────────────────────────────────────────

const solveSchema = z.union([
  z.object({
    text: z.string().min(5).max(2000),
    audioUrl: z.undefined().optional(),
    subject: z.string().min(1),
    chapter: z.string().optional(),
    language: z.enum(['hi', 'en', 'ta', 'te', 'kn', 'mr']).default('hi'),
  }),
  z.object({
    audioUrl: z.string().min(1),
    text: z.undefined().optional(),
    subject: z.string().min(1),
    chapter: z.string().optional(),
    language: z.enum(['hi', 'en', 'ta', 'te', 'kn', 'mr']).default('hi'),
  }),
]);

router.post(
  '/solve',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = solveSchema.parse(req.body);
      const userId = req.user!.userId;
      const isVoice = Boolean(body.audioUrl);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return next(new AppError('User not found', 'USER_NOT_FOUND', 404));
      }

      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      if (isVoice) {
        // Security: audioUrl must belong to requesting user
        if (!body.audioUrl!.includes(`audio/uploads/${userId}/`)) {
          return next(new AppError('Invalid S3 key', 'INVALID_S3_KEY', 400));
        }

        // Quota check — voice doubts for free tier (3/day)
        const voiceCount = await prisma.doubt.count({
          where: { userId, questionAudio: { not: null }, createdAt: { gte: todayStart } },
        });
        if (user.tier === 'free' && voiceCount >= 3) {
          return next(
            new AppError(
              'Daily voice doubt limit reached. Upgrade to Plus for unlimited doubts.',
              'QUOTA_EXCEEDED',
              429
            )
          );
        }
      } else {
        // Quota check — text doubts for free tier (5/day)
        const todayCount = await prisma.doubt.count({
          where: { userId, questionAudio: null, createdAt: { gte: todayStart } },
        });
        if (user.tier === 'free' && todayCount >= 5) {
          return next(
            new AppError(
              'Daily doubt limit reached. Upgrade to Plus for unlimited doubts.',
              'QUOTA_EXCEEDED',
              429
            )
          );
        }
      }

      // Transcribe audio if voice input
      let questionText: string;
      if (isVoice) {
        // Extract S3 key from the audioUrl (may be full s3:// URI or just the key)
        const s3KeyMatch = body.audioUrl!.match(/audio\/uploads\/.+/);
        const s3Key = s3KeyMatch ? s3KeyMatch[0] : body.audioUrl!;
        questionText = await transcribeAudio({ s3Key, languageCode: body.language });
      } else {
        questionText = body.text!;
      }

      // Fetch top 3 weak concepts for this subject
      const weakMaps = await prisma.weaknessMap.findMany({
        where: { userId, subject: body.subject },
        orderBy: { weaknessScore: 'desc' },
        take: 3,
        select: { concept: true },
      });
      const weakConcepts = weakMaps.map((w: { concept: string }) => w.concept);

      // Call Claude
      const { answer } = await solveDoubt({
        question: questionText,
        subject: body.subject,
        language: body.language,
        userClass: user.class,
        board: user.board,
        weakConcepts,
      });

      // Generate TTS audio response — non-fatal: if Polly/S3 fails (e.g. no AWS creds in dev),
      // return the text answer without audio rather than a 500.
      let responseAudioUrl: string | null = null;
      try {
        responseAudioUrl = await synthesiseSpeech({ text: answer, languageCode: body.language });
      } catch (ttsErr) {
        logger.warn('TTS synthesis failed — returning text-only response', { err: ttsErr });
      }

      // Store doubt in DB
      const doubt = await prisma.doubt.create({
        data: {
          userId,
          questionText,
          questionAudio: isVoice ? body.audioUrl! : null,
          subject: body.subject,
          chapter: body.chapter,
          aiResponse: answer,
          audioResponse: responseAudioUrl ?? undefined,
          conceptsTagged: [],
        },
      });

      // Background: tag weakness + update WeaknessMap + update doubt
      tagWeakness({ question: questionText, explanation: answer })
        .then(async (tag) => {
          if (!tag) return;

          for (const concept of tag.concepts) {
            await prisma.weaknessMap.upsert({
              where: {
                userId_subject_chapter_concept: {
                  userId,
                  subject: tag.subject,
                  chapter: tag.chapter,
                  concept,
                },
              },
              update: {
                attemptCount: { increment: 1 },
                wrongCount: { increment: 1 },
                lastAttempted: new Date(),
              },
              create: {
                userId,
                subject: tag.subject,
                chapter: tag.chapter,
                concept,
                weaknessScore: 1.0,
                attemptCount: 1,
                wrongCount: 1,
                lastAttempted: new Date(),
              },
            });
          }

          // Recalculate weaknessScore = wrongCount / attemptCount
          const maps = await prisma.weaknessMap.findMany({
            where: { userId, subject: tag.subject, chapter: tag.chapter, concept: { in: tag.concepts } },
          });
          for (const map of maps) {
            const score = map.attemptCount > 0 ? map.wrongCount / map.attemptCount : 0;
            await prisma.weaknessMap.update({
              where: { id: map.id },
              data: { weaknessScore: score },
            });
          }

          await prisma.doubt.update({
            where: { id: doubt.id },
            data: { conceptsTagged: tag.concepts },
          });
        })
        .catch((err: unknown) => logger.error('Weakness tagging failed', { err }));

      res.json({
        doubtId: doubt.id,
        answer,
        conceptsTagged: [],
        audioUrl: responseAudioUrl ?? null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/doubt/feedback ───────────────────────────────────────────────

const feedbackSchema = z.object({
  doubtId: z.string().uuid(),
  wasHelpful: z.boolean(),
});

router.post(
  '/feedback',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = feedbackSchema.parse(req.body);
      const userId = req.user!.userId;

      const doubt = await prisma.doubt.findUnique({ where: { id: body.doubtId } });
      if (!doubt) {
        return next(new AppError('Doubt not found', 'DOUBT_NOT_FOUND', 404));
      }
      if (doubt.userId !== userId) {
        return next(new AppError('Access denied', 'FORBIDDEN', 403));
      }

      await prisma.doubt.update({
        where: { id: body.doubtId },
        data: { wasHelpful: body.wasHelpful },
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/doubt/history ─────────────────────────────────────────────────

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  subject: z.string().optional(),
});

router.get(
  '/history',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = historyQuerySchema.parse(req.query);
      const userId = req.user!.userId;

      const where = {
        userId,
        ...(query.subject ? { subject: query.subject } : {}),
      };

      const [doubts, total] = await Promise.all([
        prisma.doubt.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          select: {
            id: true,
            questionText: true,
            subject: true,
            chapter: true,
            aiResponse: true,
            conceptsTagged: true,
            wasHelpful: true,
            createdAt: true,
          },
        }),
        prisma.doubt.count({ where }),
      ]);

      res.json({ doubts, total, page: query.page, limit: query.limit });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/doubt/escalate ───────────────────────────────────────────────

const escalateSchema = z.object({
  doubtId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

router.post(
  '/escalate',
  requireTier('plus', 'pro'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = escalateSchema.parse(req.body);
      const userId = req.user!.userId;

      const doubt = await prisma.doubt.findUnique({ where: { id: body.doubtId } });
      if (!doubt) {
        return next(new AppError('Doubt not found', 'DOUBT_NOT_FOUND', 404));
      }
      if (doubt.userId !== userId) {
        return next(new AppError('Access denied', 'FORBIDDEN', 403));
      }

      await prisma.doubt.update({
        where: { id: body.doubtId },
        data: { escalatedToHuman: true },
      });

      res.json({
        ok: true,
        message: 'Expert ko bheja gaya — 24 ghante mein reply milega',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
