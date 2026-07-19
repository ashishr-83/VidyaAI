/**
 * Plan Catalog — NCERT Chapter Navigation Tests
 * Layer 1: Syllabus navigation (Subject → Chapter selection)
 *
 * Happy path: GET /api/plan/available returns class/subject combos;
 *   GET /api/plan/chapters returns ordered chapter list with correct fields.
 *
 * Critical failures:
 *   1. Empty ChapterContent table → returns [] not 500
 *   2. Missing required query param (subject) → 400
 *   3. No auth token → 401
 *
 * Mock:  Firebase auth middleware (inject req.user directly)
 *        env, logger
 * Real:  Prisma + PostgreSQL (test DB) — seeded per-test, torn down after
 */

// ── Mock declarations ─────────────────────────────────────────────────────────

jest.mock('../lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:callmeVidya123@localhost:5432/vidyaai_test',
    JWT_SECRET: 'test-secret-that-is-long-enough-32ch',
    ANTHROPIC_API_KEY: 'dummy-test-key',
    AWS_REGION: 'ap-south-1',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_TRANSCRIBE_LANGUAGE_CODE: 'hi-IN',
    REDIS_URL: 'redis://localhost:6379',
    TWILIO_ACCOUNT_SID: 'ACtest',
    TWILIO_AUTH_TOKEN: 'test-auth-token',
    TWILIO_SMS_FROM: '+15005550006',
  },
}));

jest.mock('../services/claude', () => ({
  solveDoubt: jest.fn(),
  tagWeakness: jest.fn(),
  generateStudyPlan: jest.fn(),
  startLessonTurn: jest.fn(),
  continueLessonTurn: jest.fn(),
}));

jest.mock('../services/speech', () => ({
  getUploadPresignedUrl: jest.fn(),
  transcribeAudio: jest.fn(),
  synthesiseSpeech: jest.fn(),
}));

jest.mock('twilio', () => {
  const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM-test' });
  return jest.fn().mockReturnValue({ messages: { create: mockCreate } });
});

jest.mock('../middleware/rateLimit', () => {
  const passThrough = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    globalLimiter: passThrough,
    authLimiter: passThrough,
    doubtLimiter: passThrough,
    lessonLimiter: passThrough,
  };
});

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { prisma } from '../lib/prisma';
import { CLASS7_SCIENCE_CHAPTERS } from './__fixtures__/ncert-class7-science';

const JWT_SECRET = 'test-secret-that-is-long-enough-32ch';

function makeJwt(userId = 'user-catalog-test'): string {
  return jwt.sign({ userId, phone: '+919999999999', tier: 'free' }, JWT_SECRET, { expiresIn: '1h' });
}

// ── Seed / teardown helpers ───────────────────────────────────────────────────

let seededIds: string[] = [];

async function seedChapters() {
  const rows = await Promise.all(
    CLASS7_SCIENCE_CHAPTERS.map((ch) =>
      prisma.chapterContent.create({
        data: {
          class: ch.class,
          board: ch.board,
          subject: ch.subject,
          chapterNumber: ch.chapterNumber,
          chapterName: ch.chapterName,
          difficulty: ch.difficulty,
          estimatedMinutes: ch.estimatedMinutes,
          concepts: ch.concepts,
          keyFacts: ch.keyFacts,
          textbookQuestions: ch.textbookQuestions,
          pdfS3Key: ch.pdfS3Key,
        },
      })
    )
  );
  seededIds = rows.map((r) => r.id);
  return rows;
}

async function cleanChapters() {
  if (seededIds.length > 0) {
    await prisma.chapterContent.deleteMany({ where: { id: { in: seededIds } } });
    seededIds = [];
  }
}

afterAll(async () => {
  await cleanChapters();
  await prisma.$disconnect();
});

// ── GET /api/plan/available ───────────────────────────────────────────────────

describe('GET /api/plan/available', () => {
  beforeEach(async () => {
    await cleanChapters();
  });

  // TC-01
  it('returns distinct class/subject combos from seeded ChapterContent rows', async () => {
    await seedChapters();
    const token = makeJwt();

    const res = await request(app)
      .get('/api/plan/available')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('available');
    expect(Array.isArray(res.body.available)).toBe(true);

    const entry = res.body.available.find(
      (a: { classLevel: number; board: string; subjects: string[] }) =>
        a.classLevel === 7 && a.board === 'CBSE'
    );
    expect(entry).toBeDefined();
    expect(entry.subjects).toContain('Science');
  });

  // TC-02
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/plan/available');
    expect(res.status).toBe(401);
  });

  // TC-03
  it('returns empty available array when ChapterContent table has no rows', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/available')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.available).toEqual([]);
  });
});

// ── GET /api/plan/chapters ────────────────────────────────────────────────────

describe('GET /api/plan/chapters', () => {
  beforeAll(async () => {
    await cleanChapters();
    await seedChapters();
  });

  afterAll(async () => {
    await cleanChapters();
  });

  // TC-04
  it('returns all 13 Class 7 Science chapters with correct fields', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=7&subject=Science')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('chapters');
    expect(res.body.chapters).toHaveLength(13);

    const first = res.body.chapters[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('chapterNumber');
    expect(first).toHaveProperty('chapterName');
    expect(first).toHaveProperty('estimatedMinutes');
    expect(first).toHaveProperty('difficulty');
  });

  // TC-05
  it('returns chapters in ascending chapterNumber order', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=7&subject=Science')
      .set('Authorization', `Bearer ${token}`);

    const nums: number[] = res.body.chapters.map((c: { chapterNumber: number }) => c.chapterNumber);
    const sorted = [...nums].sort((a, b) => a - b);
    expect(nums).toEqual(sorted);
  });

  // TC-06
  it('every chapter has a valid difficulty value', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=7&subject=Science')
      .set('Authorization', `Bearer ${token}`);

    const validDifficulties = new Set(['easy', 'medium', 'hard']);
    for (const ch of res.body.chapters) {
      expect(validDifficulties.has(ch.difficulty)).toBe(true);
    }
  });

  // TC-07
  it('returns empty chapters array (not 404) for class/subject with no rows', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=9&subject=History')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.chapters).toEqual([]);
  });

  // TC-08
  it('returns 400 when subject query param is missing', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=7')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  // TC-09
  it('returns 400 when class param is a non-integer string', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=abc&subject=Science')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  // TC-10
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/plan/chapters?class=7&subject=Science');
    expect(res.status).toBe(401);
  });
});
