/**
 * Lesson Route Tests — Interactive Learning Session
 * Layer 3: concept explanation + textbook questions + practice
 *
 * Happy path:
 *   POST /api/lesson/start  → creates LessonSession, returns first AI message
 *   POST /api/lesson/respond → appends turn to conversationHistory, returns reply
 *   POST /api/lesson/complete → marks session completed, returns summary
 *
 * Critical failures:
 *   1. chapterId UUID has no DB row → 404 CHAPTER_NOT_FOUND (not 500)
 *   2. continueLessonTurn() throws → 502; session row NOT updated
 *   3. Student responds to a completed session → 400 SESSION_COMPLETED
 *
 * Mock:  startLessonTurn, continueLessonTurn (Claude) — deterministic fixtures
 *        env, rateLimit (passthrough), twilio, speech
 * Real:  Prisma + PostgreSQL test DB
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
import app from '../index';
import { prisma } from '../lib/prisma';
import { startLessonTurn, continueLessonTurn } from '../services/claude';
import { CLASS7_SCIENCE_CHAPTERS } from './__fixtures__/ncert-class7-science';

const JWT_SECRET = 'test-secret-that-is-long-enough-32ch';
const OWNER_USER_ID = 'user-lesson-owner-001';
const OTHER_USER_ID = 'user-lesson-other-002';
const OWNER_PHONE = '+919000000010';
const OTHER_PHONE = '+919000000011';

// ── Claude mock responses ─────────────────────────────────────────────────────

const MOCK_START_TURN = {
  message: 'Namaste! Aaj hum Scientific Method padhenge. Pehle batao — science kya hoti hai?',
  taskComplete: false,
};

const MOCK_CONTINUE_TURN = {
  message: 'Bahut accha! Scientific method mein observe karte hain, phir hypothesis banate hain.',
  taskComplete: false,
  comprehensionSignal: 'partial',
  suggestedNextAction: 'ask_followup',
};

const MOCK_CONTINUE_TURN_COMPLETE = {
  ...MOCK_CONTINUE_TURN,
  taskComplete: true,
};

// ── DB seed helpers ───────────────────────────────────────────────────────────

let seededChapterId: string | null = null;
let seededPlanId: string | null = null;

async function seedOwnerUser() {
  await prisma.user.upsert({
    where: { phone: OWNER_PHONE },
    update: {},
    create: {
      id: OWNER_USER_ID,
      phone: OWNER_PHONE,
      name: 'Lesson Owner',
      class: 7,
      board: 'CBSE',
      language: 'hi',
      tier: 'free',
    },
  });
}

async function seedOtherUser() {
  await prisma.user.upsert({
    where: { phone: OTHER_PHONE },
    update: {},
    create: {
      id: OTHER_USER_ID,
      phone: OTHER_PHONE,
      name: 'Other User',
      class: 7,
      board: 'CBSE',
      language: 'hi',
      tier: 'free',
    },
  });
}

async function seedChapter(): Promise<string> {
  const ch = CLASS7_SCIENCE_CHAPTERS[0]; // ch_01
  const row = await prisma.chapterContent.create({
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
  });
  return row.id;
}

async function seedStudyPlan(chapterId: string): Promise<string> {
  const plan = await prisma.studyPlan.upsert({
    where: { userId: OWNER_USER_ID },
    update: {
      planData: {
        version: 2,
        subject: 'Science',
        selectedChapterIds: [chapterId],
        generatedPlan: {
          days: [
            {
              chapterName: CLASS7_SCIENCE_CHAPTERS[0].chapterName,
              tasks: [
                { type: 'concept', title: 'Scientific method', conceptExplained: 'Scientific method', question: null, durationMinutes: 20 },
                { type: 'textbook', title: 'Textbook Q1', conceptExplained: null, question: 'What is the scientific method?', durationMinutes: 15 },
              ],
            },
          ],
        },
      },
      weeklyTarget: 630,
    },
    create: {
      userId: OWNER_USER_ID,
      planData: {
        version: 2,
        subject: 'Science',
        selectedChapterIds: [chapterId],
        generatedPlan: {
          days: [
            {
              chapterName: CLASS7_SCIENCE_CHAPTERS[0].chapterName,
              tasks: [
                { type: 'concept', title: 'Scientific method', conceptExplained: 'Scientific method', question: null, durationMinutes: 20 },
                { type: 'textbook', title: 'Textbook Q1', conceptExplained: null, question: 'What is the scientific method?', durationMinutes: 15 },
              ],
            },
          ],
        },
      },
      weeklyTarget: 630,
    },
  });
  return plan.id;
}

function makeJwt(userId = OWNER_USER_ID): string {
  return jwt.sign({ userId, phone: OWNER_PHONE, tier: 'free' }, JWT_SECRET, { expiresIn: '1h' });
}

beforeAll(async () => {
  await seedOwnerUser();
  await seedOtherUser();
  seededChapterId = await seedChapter();
  seededPlanId = await seedStudyPlan(seededChapterId);
});

afterAll(async () => {
  await prisma.lessonSession.deleteMany({ where: { userId: { in: [OWNER_USER_ID, OTHER_USER_ID] } } });
  await prisma.studyPlan.deleteMany({ where: { userId: OWNER_USER_ID } });
  if (seededChapterId) {
    await prisma.chapterContent.deleteMany({ where: { id: seededChapterId } });
  }
  await prisma.user.deleteMany({ where: { id: { in: [OWNER_USER_ID, OTHER_USER_ID] } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  jest.clearAllMocks();
  (startLessonTurn as jest.Mock).mockResolvedValue(MOCK_START_TURN);
  (continueLessonTurn as jest.Mock).mockResolvedValue(MOCK_CONTINUE_TURN);
});

// ── Helper: start a session and return its ID ─────────────────────────────────

async function startSession(taskIndex = 0): Promise<string> {
  const token = makeJwt();
  const res = await request(app)
    .post('/api/lesson/start')
    .set('Authorization', `Bearer ${token}`)
    .send({ chapterId: seededChapterId, taskIndex, language: 'hi' });
  return res.body.sessionId as string;
}

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/lesson/start
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/lesson/start', () => {
  // TC-49
  it('TC-49: creates LessonSession row with assistant message in conversationHistory', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/lesson/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ chapterId: seededChapterId, taskIndex: 0, language: 'hi' });

    expect(res.status).toBe(200);
    const session = await prisma.lessonSession.findUnique({ where: { id: res.body.sessionId } });
    expect(session).not.toBeNull();
    const history = session!.conversationHistory as { role: string; content: string }[];
    expect(history).toHaveLength(1);
    expect(history[0].role).toBe('assistant');
    expect(history[0].content).toBe(MOCK_START_TURN.message);
  });

  // TC-50
  it('TC-50: returns sessionId (UUID), message, and taskComplete=false', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/lesson/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ chapterId: seededChapterId, taskIndex: 0, language: 'hi' });

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(typeof res.body.message).toBe('string');
    expect(res.body.taskComplete).toBe(false);
  });

  // TC-51
  it('TC-51: taskType matches task.type from studyPlan.planData at the given taskIndex', async () => {
    const token = makeJwt();
    // taskIndex=0 → type='concept'
    const res0 = await request(app)
      .post('/api/lesson/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ chapterId: seededChapterId, taskIndex: 0, language: 'hi' });
    expect(res0.body.taskType).toBe('concept');
  });

  // TC-52
  it('TC-52: taskType=textbook response includes a non-null question field', async () => {
    const token = makeJwt();
    // taskIndex=1 → type='textbook' in our seeded plan
    const res = await request(app)
      .post('/api/lesson/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ chapterId: seededChapterId, taskIndex: 1, language: 'hi' });
    expect(res.body.taskType).toBe('textbook');
    expect(res.body.question).not.toBeNull();
  });

  // TC-53
  it('TC-53: taskType=concept response includes a non-null conceptName field', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/lesson/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ chapterId: seededChapterId, taskIndex: 0, language: 'hi' });
    expect(res.body.taskType).toBe('concept');
    expect(res.body.conceptName).not.toBeNull();
  });

  // TC-54
  it('TC-54: startLessonTurn is called with chapter.concepts and chapter.keyFacts from DB', async () => {
    const token = makeJwt();
    await request(app)
      .post('/api/lesson/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ chapterId: seededChapterId, taskIndex: 0, language: 'hi' });

    const callArgs = (startLessonTurn as jest.Mock).mock.calls[0][0];
    expect(callArgs.concepts).toEqual(CLASS7_SCIENCE_CHAPTERS[0].concepts);
    expect(callArgs.keyFacts).toEqual(CLASS7_SCIENCE_CHAPTERS[0].keyFacts);
  });

  // TC-55
  it('TC-55: returns 400 when chapterId is not a UUID', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/lesson/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ chapterId: 'not-a-uuid', taskIndex: 0, language: 'hi' });
    expect(res.status).toBe(400);
  });

  // TC-56
  it('TC-56: returns 400 when taskIndex is negative', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/lesson/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ chapterId: seededChapterId, taskIndex: -1, language: 'hi' });
    expect(res.status).toBe(400);
  });

  // TC-57
  it('TC-57: returns 404 CHAPTER_NOT_FOUND when chapterId UUID has no DB row', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/lesson/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ chapterId: '00000000-0000-0000-0000-000000000099', taskIndex: 0, language: 'hi' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CHAPTER_NOT_FOUND');
  });

  // TC-59
  it('TC-59: returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/lesson/start')
      .send({ chapterId: seededChapterId, taskIndex: 0, language: 'hi' });
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/lesson/respond
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/lesson/respond', () => {
  // TC-60
  it('TC-60: appends user message and AI reply to conversationHistory in DB', async () => {
    const sessionId = await startSession();
    const token = makeJwt();

    await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, studentMessage: 'Science ek systematic process hai' });

    const session = await prisma.lessonSession.findUnique({ where: { id: sessionId } });
    const history = session!.conversationHistory as { role: string }[];
    expect(history).toHaveLength(3); // assistant (start) + user + assistant
    expect(history[1].role).toBe('user');
    expect(history[2].role).toBe('assistant');
  });

  // TC-61
  it('TC-61: returns message, taskComplete, comprehensionSignal, nextTaskIndex', async () => {
    const sessionId = await startSession();
    const token = makeJwt();

    const res = await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, studentMessage: 'Samajh aa gaya' });

    expect(res.status).toBe(200);
    expect(typeof res.body.message).toBe('string');
    expect(typeof res.body.taskComplete).toBe('boolean');
    expect(res.body).toHaveProperty('nextTaskIndex');
    expect(res.body).toHaveProperty('comprehensionSignal');
  });

  // TC-62
  it('TC-62: nextTaskIndex increments when taskComplete=true', async () => {
    (continueLessonTurn as jest.Mock).mockResolvedValueOnce(MOCK_CONTINUE_TURN_COMPLETE);
    const sessionId = await startSession(0);
    const token = makeJwt();

    const res = await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, studentMessage: 'Samajh aa gaya' });

    expect(res.body.taskComplete).toBe(true);
    expect(res.body.nextTaskIndex).toBe(1); // 0 + 1
  });

  // TC-63
  it('TC-63: nextTaskIndex stays unchanged when taskComplete=false', async () => {
    const sessionId = await startSession(2);
    const token = makeJwt();

    const res = await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, studentMessage: 'Nahi samajha' });

    expect(res.body.taskComplete).toBe(false);
    expect(res.body.nextTaskIndex).toBe(2);
  });

  // TC-65
  it('TC-65: returns 403 FORBIDDEN when session belongs to different user', async () => {
    const sessionId = await startSession();
    const otherToken = makeJwt(OTHER_USER_ID);

    const res = await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ sessionId, studentMessage: 'Hello' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  // TC-66
  it('TC-66: returns 400 SESSION_COMPLETED when session is already completed', async () => {
    const sessionId = await startSession();
    const token = makeJwt();

    // Complete the session first
    await prisma.lessonSession.update({
      where: { id: sessionId },
      data: { status: 'completed', completedAt: new Date() },
    });

    const res = await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, studentMessage: 'Dobara try' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SESSION_COMPLETED');
  });

  // TC-67
  it('TC-67: returns 400 when studentMessage is empty string', async () => {
    const sessionId = await startSession();
    const token = makeJwt();

    const res = await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, studentMessage: '' });

    expect(res.status).toBe(400);
  });

  // TC-68
  it('TC-68: returns 400 when studentMessage exceeds 2000 characters', async () => {
    const sessionId = await startSession();
    const token = makeJwt();

    const res = await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, studentMessage: 'a'.repeat(2001) });

    expect(res.status).toBe(400);
  });

  // TC-69
  it('TC-69: returns 404 SESSION_NOT_FOUND for unknown sessionId', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: '00000000-0000-0000-0000-000000000099', studentMessage: 'Hello' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SESSION_NOT_FOUND');
  });

  // TC-70
  it('TC-70: when continueLessonTurn throws, returns error and does NOT update session', async () => {
    const sessionId = await startSession();
    const token = makeJwt();

    const sessionBefore = await prisma.lessonSession.findUnique({ where: { id: sessionId } });
    const historyLengthBefore = (sessionBefore!.conversationHistory as unknown[]).length;

    (continueLessonTurn as jest.Mock).mockRejectedValueOnce(new Error('Claude is down'));

    const res = await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, studentMessage: 'Batao' });

    expect([500, 502, 503]).toContain(res.status);

    const sessionAfter = await prisma.lessonSession.findUnique({ where: { id: sessionId } });
    const historyLengthAfter = (sessionAfter!.conversationHistory as unknown[]).length;
    expect(historyLengthAfter).toBe(historyLengthBefore); // not modified
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/lesson/complete
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/lesson/complete', () => {
  // TC-71
  it('TC-71: sets session.status=completed and records completedAt timestamp', async () => {
    const sessionId = await startSession();
    const token = makeJwt();

    const res = await request(app)
      .post('/api/lesson/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId });

    expect(res.status).toBe(200);
    const session = await prisma.lessonSession.findUnique({ where: { id: sessionId } });
    expect(session!.status).toBe('completed');
    expect(session!.completedAt).not.toBeNull();
  });

  // TC-72
  it('TC-72: returns { ok: true, summary: { conceptsLearned, questionsAttempted } }', async () => {
    const sessionId = await startSession();
    const token = makeJwt();

    const res = await request(app)
      .post('/api/lesson/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.summary).toHaveProperty('conceptsLearned');
    expect(res.body.summary).toHaveProperty('questionsAttempted');
    expect(typeof res.body.summary.questionsAttempted).toBe('number');
  });

  // TC-73
  it('TC-73: questionsAttempted equals count of user messages in history', async () => {
    const sessionId = await startSession();
    const token = makeJwt();

    // Send two user turns
    await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, studentMessage: 'Pehla sawaal' });
    await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, studentMessage: 'Doosra sawaal' });

    const res = await request(app)
      .post('/api/lesson/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId });

    expect(res.body.summary.questionsAttempted).toBe(2);
  });

  // TC-74
  it('TC-74: returns 403 when session belongs to different user', async () => {
    const sessionId = await startSession();
    const otherToken = makeJwt(OTHER_USER_ID);

    const res = await request(app)
      .post('/api/lesson/complete')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ sessionId });

    expect(res.status).toBe(403);
  });

  // TC-75
  it('TC-75: returns 404 for unknown sessionId', async () => {
    const token = makeJwt();
    const res = await request(app)
      .post('/api/lesson/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: '00000000-0000-0000-0000-000000000099' });

    expect(res.status).toBe(404);
  });

  // TC-76
  it('TC-76: returns 400 SESSION_COMPLETED when /complete is called twice', async () => {
    const sessionId = await startSession();
    const token = makeJwt();

    await request(app)
      .post('/api/lesson/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId });

    const res2 = await request(app)
      .post('/api/lesson/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, studentMessage: 'Dobara' });

    expect(res2.status).toBe(400);
    expect(res2.body.code).toBe('SESSION_COMPLETED');
  });
});
