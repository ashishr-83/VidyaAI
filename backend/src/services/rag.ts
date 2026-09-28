import { createHash } from 'crypto';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { logger } from '../lib/logger';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RetrievedChunk {
  id: string;
  chapterId: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  similarity: number;
}

export type RetrievalMode = 'explanation' | 'qa' | 'practice';

// ── Constants ─────────────────────────────────────────────────────────────────

const TOP_K: Record<RetrievalMode, number> = {
  explanation: 20,
  qa: 8,
  practice: 15,
};

const DEFAULT_MODE: RetrievalMode = 'qa';
const EMBEDDING_CACHE_TTL = 3600; // 1 hour

// ── Singletons ────────────────────────────────────────────────────────────────

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis(env.REDIS_URL, { lazyConnect: true, enableOfflineQueue: false });
    redis.on('error', (err: unknown) => {
      logger.warn('RAG Redis error — embedding cache disabled', { err });
      redis = null;
    });
    return redis;
  } catch (err) {
    logger.warn('RAG Redis init failed', { err });
    return null;
  }
}

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// ── getQueryEmbedding — with Redis cache ──────────────────────────────────────

async function getQueryEmbedding(query: string): Promise<number[]> {
  const cacheKey = `emb:${createHash('sha256').update(query).digest('hex')}`;
  const rc = getRedis();

  if (rc) {
    try {
      const cached = await rc.get(cacheKey);
      if (cached) {
        logger.info('RAG: embedding cache hit', { cacheKey: cacheKey.slice(0, 20) });
        return JSON.parse(cached) as number[];
      }
    } catch (err) {
      logger.warn('RAG: Redis get failed', { err });
    }
  }

  const res = await getOpenAI().embeddings.create({
    model: env.EMBEDDING_MODEL,
    input: [query],
    dimensions: env.EMBEDDING_DIMS,
  });
  const embedding = res.data[0]!.embedding;

  if (rc) {
    try {
      await rc.set(cacheKey, JSON.stringify(embedding), 'EX', EMBEDDING_CACHE_TTL);
    } catch (err) {
      logger.warn('RAG: Redis set failed', { err });
    }
  }

  return embedding;
}

// ── retrieveChunks ────────────────────────────────────────────────────────────

export async function retrieveChunks(
  chapterId: string,
  query: string,
  mode: RetrievalMode = DEFAULT_MODE
): Promise<RetrievedChunk[]> {
  const start = Date.now();
  const topK = TOP_K[mode];

  const embedding = await getQueryEmbedding(query);
  const vectorLiteral = `[${embedding.join(',')}]`;

  const rows = await prisma.$queryRawUnsafe<RetrievedChunk[]>(
    `SELECT id, "chapterId", "pageNumber", "chunkIndex", text,
            1 - (embedding <=> $1::vector) AS similarity
     FROM "ChapterChunk"
     WHERE "chapterId" = $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    vectorLiteral,
    chapterId,
    topK
  );

  logger.info('RAG: retrieval complete', {
    chapterId,
    mode,
    topK,
    returned: rows.length,
    latencyMs: Date.now() - start,
  });

  return rows;
}
