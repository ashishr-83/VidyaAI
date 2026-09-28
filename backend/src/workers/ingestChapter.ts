import { randomUUID } from 'crypto';
import { GetObjectCommand } from '@aws-sdk/client-s3';
// pdf-parse ships as CommonJS; use require-style import for compatibility
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer, opts?: Record<string, unknown>) => Promise<{ text: string; numpages: number }>;
import OpenAI from 'openai';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { s3Client } from '../services/speech';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHUNK_TARGET_CHARS = 1600; // ~400 tokens (1 token ≈ 4 chars)
const CHUNK_OVERLAP_CHARS = 320; // ~80 tokens
const CHUNK_MIN_CHARS = 240;     // ~60 tokens — discard shorter fragments
const EMBED_BATCH_SIZE = 100;

const HEADER_RE = /^\s*(\d+|Page \d+|NCERT|Chapter \d+|www\.ncert\.nic\.in)\s*$/i;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RawChunk {
  pageNumber: number;
  chunkIndex: number;
  text: string;
}

export interface EmbeddedChunk extends RawChunk {
  embedding: number[];
}

export interface IngestResult {
  chunksUpserted: number;
}

// ── chunkText — pure function (exported for unit tests) ───────────────────────

export function chunkText(pages: string[]): RawChunk[] {
  const result: RawChunk[] = [];
  let chunkIndex = 0;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageNumber = pageIdx + 1;
    const pageText = pages[pageIdx] ?? '';

    // Split into paragraphs; filter noise
    const paragraphs = pageText
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= CHUNK_MIN_CHARS && !HEADER_RE.test(p));

    let currentChunk = '';

    for (const para of paragraphs) {
      if (currentChunk.length === 0) {
        currentChunk = para;
        continue;
      }

      if (currentChunk.length + 1 + para.length > CHUNK_TARGET_CHARS) {
        // Emit current chunk
        result.push({ pageNumber, chunkIndex, text: currentChunk });
        chunkIndex++;

        // Seed next chunk with overlap tail of the emitted chunk
        const overlapStart = Math.max(0, currentChunk.length - CHUNK_OVERLAP_CHARS);
        currentChunk = currentChunk.slice(overlapStart) + '\n\n' + para;
      } else {
        currentChunk += '\n\n' + para;
      }
    }

    // Emit any remaining text above the minimum threshold
    if (currentChunk.length >= CHUNK_MIN_CHARS) {
      result.push({ pageNumber, chunkIndex, text: currentChunk });
      chunkIndex++;
    }
  }

  return result;
}

// ── ingestChapter ─────────────────────────────────────────────────────────────

export async function ingestChapter(chapterId: string): Promise<IngestResult> {
  const start = Date.now();

  // 1. Load chapter
  const chapter = await prisma.chapterContent.findUnique({ where: { id: chapterId } });
  if (!chapter) throw new AppError('Chapter not found', 'CHAPTER_NOT_FOUND', 404);
  if (!chapter.pdfS3Key) throw new AppError('PDF not available for this chapter', 'MISSING_PDF', 422);

  logger.info('ingestChapter: start', { chapterId, pdfS3Key: chapter.pdfS3Key });

  // 2. Download PDF buffer from S3
  const s3Response = await s3Client.send(
    new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: chapter.pdfS3Key })
  );
  if (!s3Response.Body) {
    throw new AppError('S3 returned empty body for PDF', 'PDF_DOWNLOAD_FAILED', 502);
  }
  const pdfBuffer = Buffer.from(await s3Response.Body.transformToByteArray());
  logger.info('ingestChapter: PDF downloaded', { chapterId, bytes: pdfBuffer.length });

  // 3. Extract text per page
  const pages: string[] = [];
  await pdfParse(pdfBuffer, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pagerender: (pageData: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pageData.getTextContent().then((tc: { items: { str: string }[] }) => {
        pages.push(tc.items.map((i) => i.str).join(' '));
        return '';
      }),
  });
  logger.info('ingestChapter: text extracted', { chapterId, pages: pages.length });

  // 4. Chunk text
  const rawChunks = chunkText(pages);
  logger.info('ingestChapter: chunks created', { chapterId, chunks: rawChunks.length });

  if (rawChunks.length === 0) {
    logger.warn('ingestChapter: no usable chunks extracted', { chapterId });
    return { chunksUpserted: 0 };
  }

  // 5. Embed in batches of 100
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const embeddedChunks: EmbeddedChunk[] = [];

  for (let i = 0; i < rawChunks.length; i += EMBED_BATCH_SIZE) {
    const batch = rawChunks.slice(i, i + EMBED_BATCH_SIZE);
    const batchTexts = batch.map((c) => c.text);

    logger.info('ingestChapter: embedding batch', {
      chapterId,
      batchStart: i,
      batchSize: batch.length,
    });

    const res = await openai.embeddings.create({
      model: env.EMBEDDING_MODEL,
      input: batchTexts,
      dimensions: env.EMBEDDING_DIMS,
    });

    for (let j = 0; j < batch.length; j++) {
      embeddedChunks.push({
        ...batch[j]!,
        embedding: res.data[j]!.embedding,
      });
    }
  }

  // 6. Upsert via raw SQL (Prisma cannot handle vector columns)
  // Delete existing chunks first so re-ingest is idempotent
  await prisma.$executeRawUnsafe(
    `DELETE FROM "ChapterChunk" WHERE "chapterId" = $1`,
    chapterId
  );

  for (const chunk of embeddedChunks) {
    const vectorLiteral = `[${chunk.embedding.join(',')}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ChapterChunk" ("id","chapterId","pageNumber","chunkIndex","text","embedding")
       VALUES ($1,$2,$3,$4,$5,$6::vector)`,
      randomUUID(),
      chapterId,
      chunk.pageNumber,
      chunk.chunkIndex,
      chunk.text,
      vectorLiteral
    );
  }

  // 7. Mark chapter as processed
  await prisma.chapterContent.update({
    where: { id: chapterId },
    data: { processedAt: new Date() },
  });

  logger.info('ingestChapter: complete', {
    chapterId,
    chunksUpserted: embeddedChunks.length,
    latencyMs: Date.now() - start,
  });

  return { chunksUpserted: embeddedChunks.length };
}
