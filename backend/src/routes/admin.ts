import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { logger } from '../lib/logger';
import { ingestChapter } from '../workers/ingestChapter';

const router = Router();
router.use(requireAuth);

// ── POST /api/admin/ingest/:chapterId ────────────────────────────────────────
// Triggers PDF ingestion for a chapter. Call after uploading a PDF to S3
// and setting ChapterContent.pdfS3Key. Safe to re-run — upserts cleanly.

const ingestParamsSchema = z.object({
  chapterId: z.string().uuid(),
});

router.post(
  '/ingest/:chapterId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { chapterId } = ingestParamsSchema.parse(req.params);
      const userId = req.user!.userId;

      logger.info('Admin: ingest triggered', { chapterId, triggeredBy: userId });
      const start = Date.now();

      const result = await ingestChapter(chapterId);

      logger.info('Admin: ingest complete', {
        chapterId,
        chunksUpserted: result.chunksUpserted,
        latencyMs: Date.now() - start,
      });

      res.json({ ok: true, chapterId, chunksUpserted: result.chunksUpserted });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
