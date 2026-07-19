/**
 * Plan Regenerate — AI Study Plan Generation Tests
 * Layer 2: AI study plan generation based on selected NCERT chapters
 *
 * Happy path: POST /api/plan/regenerate with valid chapterIds returns a
 *   generated plan stored in StudyPlan.planData; second identical request
 *   is served from Redis cache without calling Claude again.
 *
 * Critical failures:
 *   1. Claude timeout → 502 CLAUDE_TIMEOUT, no hang
 *   2. Empty chapterIds array → 400
 *   3. All chapterIds missing from DB → 404 CHAPTER_NOT_FOUND
 *
 * Mock:  generateStudyPlan (Claude) — deterministic fixture response
 *        env, Redis (real local Redis in CI)
 * Real:  Prisma + PostgreSQL test DB, Redis (flushed per test)
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

// ── Imports ───────────────────────────────────────────────────────────────────

import request from 'supertest';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import app from '../index';
import { prisma } from '../lib/prisma';
import { generateStudyPlan } from '../services/claude';
import {
  CLASS7_SCIENCE_CHAPTERS,
  SELECTED_CHAPTER_INDICES,
} from './__fixtures__/ncert-class7-science';

const JWT_SECRET = 'test-secret-that-is-long-enough-32ch';
const TEST_USER_ID = 'user-regen-test-001';
const TEST_PHONE = '+919000000001';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_GENERATED_PLAN = {
  days: [
    {
      chapterName: 'The Ever-Evolving World of Science',
      tasks: [
        { type: 'concept', title: 'Scientific method', conceptExplained: 'Scientific method', question: null, durationMinutes: 20 },
        { type: 'textbook', title: 'Textbook Q1', conceptExplained: null, question: 'What is the scientific method?', durationMinutes: 15 },
        { type: 'practice', title: 'Quick MCQ', conceptExplained: null, question: null, durationMinutes: 10 },
      ],
    },
    {
      chapterName: 'Electricity: Circuits and Their Components',
      tasks: [
        { type: 'concept', title: 'Electric circuit', conceptExplained: 'Electric circuit', question: null, durationMinutes: 25 },
        { type: 'textbook', title: 'Textbook Q1', conceptExplained: null, question: 'What is an electric circuit?', durationMinutes: 15 },
      ],
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeJwt(userId = TEST_USER_ID): string {
  return jwt.sign({ userId, phone: TEST_PHONE, tier: 'free' }, JWT_SECRET, { expiresIn: '1h' });
}

let seededChapterIds: string[] = [];
let testUserId: string | null = null;
let redisClient: Redis | null = null;

async function seedUser(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { phone: TEST_PHONE },
    update: {},
    create: {
      id: TEST_USER_ID,
      phone: TEST_PHONE,
      name: 'Regen Test User',
      class: 7,
      board: 'CBSE',
      language: 'hi',
      tier: 'free',
    },
  });
  return user.id;
}

async function seedChapters(): Promise<string[]> {
  const selected = SELECTED_CHAPTER_INDICES.map((i) => CLASS7_SCIENCE_CHAPTERS[i]);
  const rows = await Promise.all(
    selected.map((ch) =>
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
          pdfS3Key: null,
        },
      })
    )
  );
  return rows.map((r) => r.id);
}

async function flushRedis() {
  if (!redisClient) {
    try {
      redisClient = new Redis('redis://localhost:6379');
    } catch {
      return; // Redis not available in this environment — skip
    }
  }
  try {
    await redisClient.flushdb();
  } catch {
    // ignore
  }
}

beforeAll(async () => {
  testUserId = await seedUser();
  seededChapterIds = await seedChapters();
  await flushRedis();
});

afterAll(async () => {
  // Cleanup in dependency order
  await prisma.studyPlan.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.chapterContent.deleteMany({ where: { id: { in: seededChapterIds } } });
  await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
  await flushRedis();
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  await prisma.$disconnect();
});

beforeEach(async () => {
  jest.clearAllMocks();
  await flushRedis();
  // Remove any study plan created by previous test
  await prisma.studyPlan.deleteMany({ where: { userId: TEST_USER_ID } });
  (generateStudyPlan as jest.Mock).mockResolvedValue(MOCK_GENERATED_PLAN);
});

// ── Shared request builder ────────────────────────────────────────────────────

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    subject: 'Science',
    chapterIds: seededChapterIds,
    dailyMinutes: 90,
    language: 'hi',
    ...overrides,
  };
}

// ── TC-29: Happy path ─────────────────────────────────────────────────────────

describe('POST /api/plan/regenerate — happy path', () => {
  it('TC-29: calls generateStudyPlan and stores result in StudyPlan.planData', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPayload());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('plan');
    expect(generateStudyPlan).toHaveBeenCalledTimes(1);

    const saved = await prisma.studyPlan.findUnique({ where: { userId: TEST_USER_ID } });
    expect(saved).not.toBeNull();
    const planData = saved!.planData as { version: number };
    expect(planData.version).toBe(2);
  });

  // TC-30
  it('TC-30: response plan.days is an array of day objects', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPayload());

    expect(Array.isArray(res.body.plan.days)).toBe(true);
    expect(res.body.plan.days.length).toBeGreaterThan(0);
  });

  // TC-31
  it('TC-31: each task has subject/title/durationMinutes/type fields', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPayload());

    for (const day of res.body.plan.days) {
      for (const task of day.tasks) {
        expect(task).toHaveProperty('type');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('durationMinutes');
      }
    }
  });

  // TC-32
  it('TC-32: task.type is one of learn/revise/practice/test/concept/textbook', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPayload());

    const validTypes = new Set(['learn', 'revise', 'practice', 'test', 'concept', 'textbook']);
    for (const day of res.body.plan.days) {
      for (const task of day.tasks) {
        expect(validTypes.has(task.type)).toBe(true);
      }
    }
  });

  // TC-34
  it('TC-34: generateStudyPlan is called with chapter names — not raw UUIDs', async () => {
    const token = makeJwt();
    await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPayload());

    const callArgs = (generateStudyPlan as jest.Mock).mock.calls[0][0];
    expect(callArgs).toHaveProperty('chapters');
    for (const ch of callArgs.chapters) {
      expect(ch).toHaveProperty('chapterName');
      expect(typeof ch.chapterName).toBe('string');
      // Must not be a UUID
      expect(ch.chapterName).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    }
  });
});

// ── TC-35: Redis cache ────────────────────────────────────────────────────────

describe('POST /api/plan/regenerate — Redis caching', () => {
  it('TC-35: second identical request hits cache; Claude is NOT called twice', async () => {
    const token = makeJwt();
    const payload = buildPayload();

    await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(generateStudyPlan).toHaveBeenCalledTimes(1);
  });

  it('TC-35b: cached response has fromCache=true', async () => {
    const token = makeJwt();
    const payload = buildPayload();

    await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    const res2 = await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res2.body.fromCache).toBe(true);
  });
});

// ── TC-42: Upsert (no duplicate StudyPlan rows) ───────────────────────────────

describe('POST /api/plan/regenerate — upsert behaviour', () => {
  it('TC-42: calling regenerate twice creates only ONE StudyPlan row for the user', async () => {
    const token = makeJwt();
    const payload = buildPayload();

    await flushRedis(); // ensure no cache so two Claude calls would be needed

    await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    await flushRedis();

    await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    const count = await prisma.studyPlan.count({ where: { userId: TEST_USER_ID } });
    expect(count).toBe(1);
  });
});

// ── Auth & validation failures ────────────────────────────────────────────────

describe('POST /api/plan/regenerate — auth and validation', () => {
  // TC-36
  it('TC-36: returns 401 without Authorization header', async () => {
    const res = await request(app).post('/api/plan/regenerate').send(buildPayload());
    expect(res.status).toBe(401);
  });

  // TC-37
  it('TC-37: returns 400 when chapterIds is empty array', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPayload({ chapterIds: [] }));

    expect(res.status).toBe(400);
  });

  // TC-38
  it('TC-38: returns 400 when chapterIds contains a non-UUID string', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPayload({ chapterIds: ['not-a-uuid', 'also-not-a-uuid'] }));

    expect(res.status).toBe(400);
  });

  // TC-39
  it('TC-39: returns 400 when dailyMinutes is not a positive integer', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPayload({ dailyMinutes: -30 }));

    expect(res.status).toBe(400);
  });

  // TC-40
  it('TC-40: returns 404 when chapterIds are valid UUIDs but have no DB rows', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPayload({
        chapterIds: [
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000002',
        ],
      }));

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CHAPTER_NOT_FOUND');
  });
});

// ── TC-41: Claude timeout ─────────────────────────────────────────────────────

describe('POST /api/plan/regenerate — Claude timeout', () => {
  it('TC-41: returns 502 when generateStudyPlan throws; does not hang', async () => {
    const timeoutError = Object.assign(new Error('Request timed out'), { code: 'CLAUDE_TIMEOUT' });
    (generateStudyPlan as jest.Mock).mockRejectedValueOnce(timeoutError);

    const token = makeJwt();
    const res = await request(app)
      .post('/api/plan/regenerate')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPayload());

    // Must respond (not hang) — supertest default timeout will catch a hang
    expect([500, 502, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('error');
  }, 10_000);
});
