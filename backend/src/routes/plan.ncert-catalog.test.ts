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
    OPENAI_API_KEY: 'sk-test',
    EMBEDDING_MODEL: 'text-embedding-3-small',
    EMBEDDING_DIMS: 1536,
  },
}));

jest.mock('../services/claude', () => ({
  solveDoubt: jest.fn(),
  tagWeakness: jest.fn(),
  generateStudyPlan: jest.fn(),
  startLessonTurn: jest.fn(),
  continueLessonTurn: jest.fn(),
}));

const mockGetSignedUrl = jest.fn().mockResolvedValue('https://fake-presigned.url/chapter.pdf');

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

jest.mock('../services/speech', () => ({
  s3Client: {},
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
import { CLASS7_MATHS_CHAPTERS } from './__fixtures__/ncert-class7-maths';
import { CLASS7_SOCSC_CHAPTERS } from './__fixtures__/ncert-class7-socsc';

const JWT_SECRET = 'test-secret-that-is-long-enough-32ch';

function makeJwt(userId = 'user-catalog-test'): string {
  return jwt.sign({ userId, phone: '+919999999999', tier: 'free' }, JWT_SECRET, { expiresIn: '1h' });
}

// ── Seed / teardown helpers ───────────────────────────────────────────────────

const FIXTURE_MAP = {
  Science: CLASS7_SCIENCE_CHAPTERS,
  Mathematics: CLASS7_MATHS_CHAPTERS,
  'Social Science': CLASS7_SOCSC_CHAPTERS,
} as const;

type SubjectKey = keyof typeof FIXTURE_MAP;

// All fixture chapters live in class=7, board=CBSE — delete by natural key so
// orphaned rows from crashed prior runs don't cause unique-constraint failures.
async function cleanChapters() {
  await prisma.chapterContent.deleteMany({
    where: { class: 7, board: 'CBSE', subject: { in: ['Science', 'Mathematics', 'Social Science'] } },
  });
}

async function seedChapters(subjects: SubjectKey[] = ['Science']) {
  const toSeed = subjects.flatMap((s) => FIXTURE_MAP[s]);
  const rows = await Promise.all(
    toSeed.map((ch) =>
      prisma.chapterContent.upsert({
        where: {
          class_board_subject_chapterNumber: {
            class: ch.class,
            board: ch.board,
            subject: ch.subject,
            chapterNumber: ch.chapterNumber,
          },
        },
        update: {
          chapterName: ch.chapterName,
          difficulty: ch.difficulty,
          estimatedMinutes: ch.estimatedMinutes,
          concepts: ch.concepts,
          keyFacts: ch.keyFacts,
          textbookQuestions: ch.textbookQuestions,
          pdfS3Key: ch.pdfS3Key,
        },
        create: {
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
  return rows;
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
  it('returns all 12 Class 7 Science chapters with correct fields', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=7&subject=Science')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('chapters');
    expect(res.body.chapters).toHaveLength(12);

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

// ── GET /api/plan/chapters — Mathematics and Social Science ───────────────────

describe('GET /api/plan/chapters — Mathematics and Social Science', () => {
  beforeAll(async () => {
    await cleanChapters();
    await seedChapters(['Mathematics', 'Social Science']);
  });

  afterAll(async () => {
    await cleanChapters();
  });

  // TC-11
  it('returns 8 Mathematics chapters with correct fields', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=7&subject=Mathematics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.chapters).toHaveLength(8);
    const first = res.body.chapters[0];
    expect(first.chapterName).toBe('Large Numbers Around Us');
    expect(first.estimatedMinutes).toBe(45);
    expect(first.difficulty).toBe('easy');
  });

  // TC-12
  it('returns Mathematics chapters in ascending chapterNumber order', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=7&subject=Mathematics')
      .set('Authorization', `Bearer ${token}`);

    const nums: number[] = res.body.chapters.map((c: { chapterNumber: number }) => c.chapterNumber);
    expect(nums).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  // TC-13
  it('returns 12 Social Science chapters with correct fields', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=7&subject=Social+Science')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.chapters).toHaveLength(12);
    const last = res.body.chapters[11];
    expect(last.chapterName).toBe('Understanding Markets');
    expect(last.difficulty).toBe('medium');
  });

  // TC-14
  it('GET /api/plan/available returns all 3 subjects when all 3 are seeded', async () => {
    await seedChapters(['Science']);
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/available')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const entry = res.body.available.find(
      (a: { classLevel: number; board: string; subjects: string[] }) =>
        a.classLevel === 7 && a.board === 'CBSE'
    );
    expect(entry).toBeDefined();
    expect(entry.subjects).toContain('Mathematics');
    expect(entry.subjects).toContain('Science');
    expect(entry.subjects).toContain('Social Science');
  });

  // TC-15
  it('every Mathematics chapter has a valid difficulty', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=7&subject=Mathematics')
      .set('Authorization', `Bearer ${token}`);

    const valid = new Set(['easy', 'medium', 'hard']);
    for (const ch of res.body.chapters) {
      expect(valid.has(ch.difficulty)).toBe(true);
    }
  });

  // TC-16
  it('every Social Science chapter has a valid difficulty', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters?class=7&subject=Social+Science')
      .set('Authorization', `Bearer ${token}`);

    const valid = new Set(['easy', 'medium', 'hard']);
    for (const ch of res.body.chapters) {
      expect(valid.has(ch.difficulty)).toBe(true);
    }
  });
});

// ── GET /api/plan/chapters/:id/pdf-url ────────────────────────────────────────

describe('GET /api/plan/chapters/:id/pdf-url', () => {
  let seededChapterId: string;

  beforeAll(async () => {
    await cleanChapters();
    const rows = await seedChapters(['Science']);
    seededChapterId = rows[0]!.id;
  });

  afterAll(async () => {
    await cleanChapters();
  });

  beforeEach(() => {
    mockGetSignedUrl.mockClear();
    mockGetSignedUrl.mockResolvedValue('https://fake-presigned.url/chapter.pdf');
  });

  // TC-29: chapter with pdfS3Key = null → 404 PDF_NOT_FOUND
  it('TC-29: returns 404 PDF_NOT_FOUND when chapter has no pdfS3Key', async () => {
    const token = makeJwt();
    // All seeded fixture chapters have pdfS3Key: null
    const res = await request(app)
      .get(`/api/plan/chapters/${seededChapterId}/pdf-url`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PDF_NOT_FOUND');
  });

  // TC-30: chapter with pdfS3Key set → 200 with presigned URL
  it('TC-30: returns presigned URL when pdfS3Key is set', async () => {
    const token = makeJwt();

    // Seed a real S3 key on this chapter
    await prisma.chapterContent.update({
      where: { id: seededChapterId },
      data: { pdfS3Key: 'ncert/class7/science/ch01.pdf' },
    });

    const res = await request(app)
      .get(`/api/plan/chapters/${seededChapterId}/pdf-url`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url', 'https://fake-presigned.url/chapter.pdf');
    expect(res.body).toHaveProperty('expiresIn', 3600);

    // Restore null so other TCs are not affected
    await prisma.chapterContent.update({
      where: { id: seededChapterId },
      data: { pdfS3Key: null },
    });
  });

  // TC-31: no auth token → 401
  it('TC-31: returns 401 without Authorization header', async () => {
    const res = await request(app).get(
      `/api/plan/chapters/${seededChapterId}/pdf-url`
    );
    expect(res.status).toBe(401);
  });

  // TC-32: non-existent UUID → 404 CHAPTER_NOT_FOUND
  it('TC-32: returns 404 CHAPTER_NOT_FOUND for unknown UUID', async () => {
    const token = makeJwt();
    const res = await request(app)
      .get('/api/plan/chapters/00000000-0000-0000-0000-000000000000/pdf-url')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CHAPTER_NOT_FOUND');
  });
});
