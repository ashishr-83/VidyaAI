/**
 * Doubt Solver — Extended API Tests
 * Covers gaps identified in Priya's test matrix (TC-01 through TC-09) that
 * are not already covered by doubt.test.ts.
 *
 * Happy path: POST /api/doubt/solve with valid text+subject+language returns
 *   { doubtId, answer, conceptsTagged, audioUrl } — HTTP 200.
 *
 * 3 critical failure cases:
 *   1. Text < 5 chars → Zod rejects before Claude is called (400, no API cost)
 *   2. Free tier at 5 daily text doubts → 429 QUOTA_EXCEEDED
 *   3. Claude API timeout → 502 AI_ERROR (student sees retry button)
 *
 * Mock: Anthropic Claude, AWS Polly, AWS Transcribe, Firebase, Prisma
 * Real: Express routing, Zod validation, JWT auth middleware
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Mock declarations — must precede all side-effectful imports ───────────────

jest.mock('twilio', () => {
  const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM-test' });
  return jest.fn().mockReturnValue({ messages: { create: mockCreate } });
});

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    doubt: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    weaknessMap: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
  },
}));

jest.mock('../lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgresql://test',
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
}));

jest.mock('../services/speech', () => ({
  getUploadPresignedUrl: jest.fn(),
  transcribeAudio: jest.fn(),
  synthesiseSpeech: jest.fn(),
}));

jest.mock('../middleware/rateLimit', () => {
  const passThrough = (_req: unknown, _res: unknown, next: () => void) => next();
  return { globalLimiter: passThrough, authLimiter: passThrough, doubtLimiter: passThrough };
});

// ── Import app AFTER all mocks ────────────────────────────────────────────────
import app from '../index';

const { prisma } = require('../lib/prisma');
const { solveDoubt, tagWeakness } = require('../services/claude');
const { synthesiseSpeech } = require('../services/speech');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-that-is-long-enough-32ch';

function makeToken(overrides: Partial<{ userId: string; tier: string }> = {}): string {
  return jwt.sign(
    { userId: 'user-abc', phone: '+919999999999', tier: 'free', ...overrides },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

const FREE_TOKEN = makeToken({ tier: 'free' });
const PLUS_TOKEN = makeToken({ tier: 'plus', userId: 'user-plus' });

const BASE_USER = {
  id: 'user-abc',
  phone: '+919999999999',
  name: 'Priya Nair',
  class: 11,
  board: 'CBSE',
  tier: 'free',
  language: 'hi',
};

const HINDI_ANSWER =
  'Newton ke teen niyam hote hain. Pehla niyam kehta hai ki koi bhi wstu apni avasta mein tab tak badlav nahi karta jab tak koi baahri bal na lage. Doosra niyam: F = ma. Teesra niyam: har kriya ki pratikriya hoti hai. Cricket mein jab bat se gend lagti hai, usi se yeh example samajh sakte ho. Kya yeh clear ho gaya? Aur kuch poochna hai toh puchho!';

const MOCK_DOUBT_CREATED = {
  id: 'a1b2c3d4-0000-0000-0000-ef1234567890',
  userId: 'user-abc',
  questionText: 'Newton ka teen kanoon kya hote hain?',
  subject: 'Physics',
  chapter: 'Laws of Motion',
  aiResponse: HINDI_ANSWER,
  audioResponse: 'https://cdn.vidyaai.in/audio/responses/reply.mp3',
  conceptsTagged: [],
  wasHelpful: null,
  createdAt: new Date().toISOString(),
};

// Default mocks used by most tests — individual tests override where needed
function setupHappyPathMocks(overrides: { tier?: string } = {}) {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({
    ...BASE_USER,
    tier: overrides.tier ?? 'free',
  });
  (prisma.doubt.count as jest.Mock).mockResolvedValue(0);
  (prisma.weaknessMap.findMany as jest.Mock).mockResolvedValue([]);
  (solveDoubt as jest.Mock).mockResolvedValue({ answer: HINDI_ANSWER, latencyMs: 1100 });
  (prisma.doubt.create as jest.Mock).mockResolvedValue(MOCK_DOUBT_CREATED);
  (tagWeakness as jest.Mock).mockResolvedValue(null);
  (synthesiseSpeech as jest.Mock).mockResolvedValue(
    'https://cdn.vidyaai.in/audio/responses/reply.mp3'
  );
}

// ── TC-01 — Hindi Physics happy path ─────────────────────────────────────────

describe('TC-01 — Hindi Physics happy path (Newton laws)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHappyPathMocks();
  });

  it('returns 200 with doubtId, answer, audioUrl, conceptsTagged', async () => {
    // Arrange — TC-01 request
    const payload = {
      text: 'Newton ka teen kanoon kya hote hain? Simple language mein samjhao',
      subject: 'Physics',
      chapter: 'Laws of Motion',
      language: 'hi',
    };

    // Act
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send(payload);

    // Assert — response shape
    expect(res.status).toBe(200);
    expect(res.body.doubtId).toBeDefined();
    expect(res.body.answer).toBe(HINDI_ANSWER);
    expect(res.body.audioUrl).toBe('https://cdn.vidyaai.in/audio/responses/reply.mp3');
    expect(Array.isArray(res.body.conceptsTagged)).toBe(true);
  });

  it('calls solveDoubt with correct Hindi parameters (class, board, language)', async () => {
    await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({
        text: 'Newton ka teen kanoon kya hote hain? Simple language mein samjhao',
        subject: 'Physics',
        language: 'hi',
      });

    expect(solveDoubt).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Physics',
        language: 'hi',
        userClass: 11,
        board: 'CBSE',
      })
    );
  });

  it('calls synthesiseSpeech with the answer text and Hindi language code', async () => {
    await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({
        text: 'Newton ka teen kanoon kya hote hain? Simple language mein samjhao',
        subject: 'Physics',
        language: 'hi',
      });

    expect(synthesiseSpeech).toHaveBeenCalledWith({ text: HINDI_ANSWER, languageCode: 'hi' });
  });

  it('does NOT include student phone or personal identifiers in response body', async () => {
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({
        text: 'Newton ka teen kanoon kya hote hain?',
        subject: 'Physics',
        language: 'hi',
      });

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('+919999999999');
    expect(bodyStr).not.toContain('Priya Nair');
  });
});

// ── TC-02 — English Maths language switch ────────────────────────────────────

describe('TC-02 — English Maths language switch (quadratic formula)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...BASE_USER,
      class: 10,
      board: 'CBSE',
    });
    (prisma.doubt.count as jest.Mock).mockResolvedValue(0);
    (prisma.weaknessMap.findMany as jest.Mock).mockResolvedValue([]);
    (solveDoubt as jest.Mock).mockResolvedValue({
      answer:
        'Great question! The quadratic formula is x = (-b ± √(b²-4ac)) / 2a. Here "a", "b", "c" are the coefficients of your equation. Try: solve x²-5x+6=0. Is this clear? Feel free to ask more!',
      latencyMs: 900,
    });
    (prisma.doubt.create as jest.Mock).mockResolvedValue({
      ...MOCK_DOUBT_CREATED,
      subject: 'Mathematics',
      aiResponse: 'The quadratic formula...',
    });
    (tagWeakness as jest.Mock).mockResolvedValue(null);
    (synthesiseSpeech as jest.Mock).mockResolvedValue(
      'https://cdn.vidyaai.in/audio/responses/quad.mp3'
    );
  });

  it('returns 200 and passes English language code to solveDoubt', async () => {
    // Arrange
    const payload = {
      text: 'What is the quadratic formula and how do I use it to solve equations?',
      subject: 'Mathematics',
      chapter: 'Quadratic Equations',
      language: 'en',
    };

    // Act
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send(payload);

    // Assert
    expect(res.status).toBe(200);
    expect(solveDoubt).toHaveBeenCalledWith(expect.objectContaining({ language: 'en' }));
    expect(synthesiseSpeech).toHaveBeenCalledWith(
      expect.objectContaining({ languageCode: 'en' })
    );
  });
});

// ── TC-04 — Vague question still returns 200 (Claude handles clarification) ──

describe('TC-04 — Vague question (clarification behaviour)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(BASE_USER);
    (prisma.doubt.count as jest.Mock).mockResolvedValue(0);
    (prisma.weaknessMap.findMany as jest.Mock).mockResolvedValue([]);
    (solveDoubt as jest.Mock).mockResolvedValue({
      answer:
        'Haan, main madad karunga! Par pehle bataao — kaunsa chapter ya topic samajh nahi aaya? Physics mein bohot saare topics hote hain.',
      latencyMs: 800,
    });
    (prisma.doubt.create as jest.Mock).mockResolvedValue({
      ...MOCK_DOUBT_CREATED,
      questionText: 'Physics mein kuch nahi samajh aata',
    });
    (tagWeakness as jest.Mock).mockResolvedValue(null);
    (synthesiseSpeech as jest.Mock).mockResolvedValue(
      'https://cdn.vidyaai.in/audio/responses/clarify.mp3'
    );
  });

  it('returns 200 — vague question is valid input, Claude handles clarification', async () => {
    // Arrange — meets the 5-char min (24 chars), passes Zod
    const payload = {
      text: 'Physics mein kuch nahi samajh aata',
      subject: 'Physics',
      language: 'hi',
    };

    // Act
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send(payload);

    // Assert — route still completes, Claude mock returns clarifying question
    expect(res.status).toBe(200);
    expect(res.body.doubtId).toBeDefined();
    expect(res.body.answer).toContain('kaunsa chapter');
  });
});

// ── TC-05 — Validation rejection (text too short) ────────────────────────────

describe('TC-05 — Short text validation rejection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects "help" (4 chars) with 400 VALIDATION_ERROR', async () => {
    // Arrange
    const payload = { text: 'help', subject: 'Physics', language: 'hi' };

    // Act
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send(payload);

    // Assert — Zod rejects before Claude is called
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(solveDoubt).not.toHaveBeenCalled();
    expect(synthesiseSpeech).not.toHaveBeenCalled();
  });

  it('rejects empty text string with 400', async () => {
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ text: '', subject: 'Physics', language: 'hi' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(solveDoubt).not.toHaveBeenCalled();
  });

  it('accepts text exactly 5 chars — boundary is inclusive', async () => {
    setupHappyPathMocks();
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ text: 'kya h', subject: 'Physics', language: 'hi' });

    expect(res.status).toBe(200);
  });
});

// ── TC-07 — Chapter field is optional ────────────────────────────────────────

describe('TC-07 — Optional chapter field', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHappyPathMocks();
  });

  it('returns 200 when chapter is omitted entirely', async () => {
    // Arrange — no chapter field
    const payload = {
      text: 'Integration aur differentiation mein kya fark hai?',
      subject: 'Mathematics',
      language: 'hi',
    };

    // Act
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send(payload);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.doubtId).toBeDefined();
    expect(res.body.audioUrl).toBeDefined();
  });
});

// ── TC-08 — Free tier quota exhaustion ───────────────────────────────────────

describe('TC-08 — Free tier quota exhaustion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 429 QUOTA_EXCEEDED when free user submits 6th text doubt today', async () => {
    // Arrange — DB reports 5 text doubts already made today
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(BASE_USER);
    (prisma.doubt.count as jest.Mock).mockResolvedValue(5);

    // Act — 6th attempt
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({
        text: 'Photosynthesis kya hota hai?',
        subject: 'Biology',
        language: 'hi',
      });

    // Assert
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('QUOTA_EXCEEDED');
    expect(res.body.error).toMatch(/upgrade|Plus/i);
    expect(solveDoubt).not.toHaveBeenCalled();
  });

  it('plus tier user is NOT quota-blocked at 5 text doubts', async () => {
    // Arrange — plus user, 5 doubts already
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...BASE_USER,
      id: 'user-plus',
      tier: 'plus',
    });
    (prisma.doubt.count as jest.Mock).mockResolvedValue(5);
    (prisma.weaknessMap.findMany as jest.Mock).mockResolvedValue([]);
    (solveDoubt as jest.Mock).mockResolvedValue({ answer: HINDI_ANSWER, latencyMs: 900 });
    (prisma.doubt.create as jest.Mock).mockResolvedValue(MOCK_DOUBT_CREATED);
    (tagWeakness as jest.Mock).mockResolvedValue(null);
    (synthesiseSpeech as jest.Mock).mockResolvedValue(
      'https://cdn.vidyaai.in/audio/responses/reply.mp3'
    );

    // Act
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${PLUS_TOKEN}`)
      .send({
        text: 'Photosynthesis kya hota hai? Samjhao',
        subject: 'Biology',
        language: 'hi',
      });

    // Assert — plus users have no text doubt cap
    expect(res.status).toBe(200);
  });
});

// ── TC-09 — Tamil language code accepted ─────────────────────────────────────

describe('TC-09 — Tamil language accepted by validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(BASE_USER);
    (prisma.doubt.count as jest.Mock).mockResolvedValue(0);
    (prisma.weaknessMap.findMany as jest.Mock).mockResolvedValue([]);
    (solveDoubt as jest.Mock).mockResolvedValue({
      answer: 'ஒளிச்சேர்க்கை என்பது தாவரங்கள் சூரிய ஒளியை உணவாக மாற்றும் செயல்முறை.',
      latencyMs: 1050,
    });
    (prisma.doubt.create as jest.Mock).mockResolvedValue({
      ...MOCK_DOUBT_CREATED,
      subject: 'Biology',
    });
    (tagWeakness as jest.Mock).mockResolvedValue(null);
    (synthesiseSpeech as jest.Mock).mockResolvedValue(
      'https://cdn.vidyaai.in/audio/responses/tamil.mp3'
    );
  });

  it('returns 200 and passes Tamil language code to services', async () => {
    // Arrange
    const payload = {
      text: 'ஒளிச்சேர்க்கை என்றால் என்ன? எளிமையான முறையில் விளக்கவும்',
      subject: 'Biology',
      chapter: 'Photosynthesis',
      language: 'ta',
    };

    // Act
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send(payload);

    // Assert
    expect(res.status).toBe(200);
    expect(solveDoubt).toHaveBeenCalledWith(expect.objectContaining({ language: 'ta' }));
    expect(synthesiseSpeech).toHaveBeenCalledWith(
      expect.objectContaining({ languageCode: 'ta' })
    );
  });

  it('rejects unsupported language code with 400', async () => {
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({
        text: 'What is photosynthesis?',
        subject: 'Biology',
        language: 'fr', // French — not in allowed enum
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// ── TC-ALL — Claude timeout handled gracefully ────────────────────────────────

describe('Claude API timeout — 502 AI_ERROR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(BASE_USER);
    (prisma.doubt.count as jest.Mock).mockResolvedValue(0);
    (prisma.weaknessMap.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('returns 502 AI_ERROR when Claude times out', async () => {
    // Arrange
    const { AppError } = require('../middleware/errorHandler');
    (solveDoubt as jest.Mock).mockRejectedValue(
      new AppError('Claude API timed out', 'AI_ERROR', 502)
    );

    // Act
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({
        text: 'Newton ka teen kanoon samjhao please',
        subject: 'Physics',
        language: 'hi',
      });

    // Assert — student sees a retryable error, not a 500
    expect(res.status).toBe(502);
    expect(res.body.code).toBe('AI_ERROR');
    expect(synthesiseSpeech).not.toHaveBeenCalled();
  });
});

// ── TC-ALL — Missing subject field ───────────────────────────────────────────

describe('Missing required fields — subject', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 VALIDATION_ERROR when subject is missing', async () => {
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ text: 'Newton ka teen kanoon kya hain?', language: 'hi' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(solveDoubt).not.toHaveBeenCalled();
  });
});
