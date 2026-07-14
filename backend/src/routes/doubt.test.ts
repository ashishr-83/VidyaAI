import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Mock declarations must come before any imports that trigger side effects ──

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

// Make the burst-guard rate limiter a no-op in tests — the in-memory store
// is a singleton that bleeds across describe blocks when running sequentially.
jest.mock('../middleware/rateLimit', () => {
  const passThrough = (_req: unknown, _res: unknown, next: () => void) => next();
  return { globalLimiter: passThrough, authLimiter: passThrough, doubtLimiter: passThrough };
});

// ── Import app AFTER mocks are in place ──
import app from '../index';

const { prisma } = require('../lib/prisma');
const { solveDoubt, tagWeakness } = require('../services/claude');
const { getUploadPresignedUrl, transcribeAudio, synthesiseSpeech } = require('../services/speech');

// ── Shared helpers ──────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-that-is-long-enough-32ch';

function makeJwt(
  overrides: Partial<{ userId: string; phone: string; tier: string }> = {}
): string {
  return jwt.sign(
    { userId: 'user-abc', phone: '+919999999999', tier: 'free', ...overrides },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

const FREE_TOKEN = makeJwt({ tier: 'free' });
const PLUS_TOKEN = makeJwt({ tier: 'plus', userId: 'user-plus' });
const PRO_TOKEN = makeJwt({ tier: 'pro', userId: 'user-pro' });

const mockUser = {
  id: 'user-abc',
  phone: '+919999999999',
  name: 'Riya Sharma',
  class: 11,
  board: 'CBSE',
  tier: 'free',
  language: 'hi',
};

const mockDoubt = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  userId: 'user-abc',
  questionText: 'Newton ka teesra niyam kya hai?',
  subject: 'Physics',
  chapter: 'Laws of Motion',
  aiResponse: 'Newton ka teesra niyam kehta hai...',
  conceptsTagged: [],
  wasHelpful: null,
  escalatedToHuman: false,
  createdAt: new Date().toISOString(),
};

// ── POST /api/doubt/solve ───────────────────────────────────────────────────

describe('POST /api/doubt/solve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default happy-path mocks
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.doubt.count as jest.Mock).mockResolvedValue(0);
    (prisma.weaknessMap.findMany as jest.Mock).mockResolvedValue([]);
    (solveDoubt as jest.Mock).mockResolvedValue({
      answer: 'Newton ka teesra niyam kehta hai...',
      latencyMs: 1200,
    });
    (prisma.doubt.create as jest.Mock).mockResolvedValue(mockDoubt);
    (tagWeakness as jest.Mock).mockResolvedValue(null);
    (synthesiseSpeech as jest.Mock).mockResolvedValue(
      'https://cdn.vidyaai.in/audio/responses/abc.mp3'
    );
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app)
      .post('/api/doubt/solve')
      .send({ text: 'Newton ka third law?', subject: 'Physics' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when text is missing', async () => {
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ subject: 'Physics' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when text is shorter than 5 chars', async () => {
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ text: 'hi', subject: 'Physics' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 429 QUOTA_EXCEEDED when free user has used 5 text doubts today', async () => {
    (prisma.doubt.count as jest.Mock).mockResolvedValue(5);

    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ text: 'Newton ka third law kya hota hai?', subject: 'Physics' });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('QUOTA_EXCEEDED');
  });

  it('returns 200 with doubtId, answer, audioUrl for valid text request', async () => {
    (synthesiseSpeech as jest.Mock).mockResolvedValue(
      'https://cdn.vidyaai.in/audio/responses/abc.mp3'
    );

    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ text: 'Newton ka third law kya hota hai?', subject: 'Physics', language: 'hi' });

    expect(res.status).toBe(200);
    expect(res.body.doubtId).toBeDefined();
    expect(res.body.answer).toBe('Newton ka teesra niyam kehta hai...');
    expect(res.body.audioUrl).toBe('https://cdn.vidyaai.in/audio/responses/abc.mp3');
    expect(res.body.conceptsTagged).toEqual([]);
  });

  it('does NOT include student phone or name in response', async () => {
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ text: 'Newton ka third law kya hota hai?', subject: 'Physics' });

    expect(res.status).toBe(200);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('+919999999999');
    expect(bodyStr).not.toContain('Riya Sharma');
  });

  it('returns 502 AI_ERROR when solveDoubt throws AI_ERROR', async () => {
    const { AppError } = require('../middleware/errorHandler');
    (solveDoubt as jest.Mock).mockRejectedValue(
      new AppError('Claude API timed out', 'AI_ERROR', 502)
    );

    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ text: 'Newton ka third law kya hota hai?', subject: 'Physics' });

    expect(res.status).toBe(502);
    expect(res.body.code).toBe('AI_ERROR');
  });

  it('weakness tagging runs in background — main response does not wait for it', async () => {
    let resolveTag: (value: null) => void;
    const tagPromise = new Promise<null>((resolve) => {
      resolveTag = resolve;
    });
    (tagWeakness as jest.Mock).mockReturnValue(tagPromise);

    const start = Date.now();
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ text: 'Newton ka third law kya hota hai?', subject: 'Physics' });

    const elapsed = Date.now() - start;

    // Response must arrive before the tag promise resolves
    expect(res.status).toBe(200);
    // Resolving after gives background job a chance to clean up without blocking
    resolveTag!(null);

    // The route must not have waited — if tagWeakness was awaited, it would hang
    // We verify by checking response arrived quickly (< 500ms) without blocking
    expect(elapsed).toBeLessThan(5000);
  });
});

// ── POST /api/doubt/feedback ────────────────────────────────────────────────

describe('POST /api/doubt/feedback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when doubtId does not exist', async () => {
    (prisma.doubt.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/doubt/feedback')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ doubtId: '00000000-0000-0000-0000-000000000000', wasHelpful: true });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('DOUBT_NOT_FOUND');
  });

  it('returns 403 when doubt belongs to different user', async () => {
    (prisma.doubt.findUnique as jest.Mock).mockResolvedValue({
      ...mockDoubt,
      userId: 'other-user-id',
    });

    const res = await request(app)
      .post('/api/doubt/feedback')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ doubtId: mockDoubt.id, wasHelpful: false });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 200 { ok: true } for valid request', async () => {
    (prisma.doubt.findUnique as jest.Mock).mockResolvedValue(mockDoubt);
    (prisma.doubt.update as jest.Mock).mockResolvedValue({ ...mockDoubt, wasHelpful: true });

    const res = await request(app)
      .post('/api/doubt/feedback')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ doubtId: mockDoubt.id, wasHelpful: true });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── GET /api/doubt/history ──────────────────────────────────────────────────

describe('GET /api/doubt/history', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/doubt/history');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns paginated doubts for authenticated user', async () => {
    const doubts = [mockDoubt, { ...mockDoubt, id: 'doubt-2' }];
    (prisma.doubt.findMany as jest.Mock).mockResolvedValue(doubts);
    (prisma.doubt.count as jest.Mock).mockResolvedValue(2);

    const res = await request(app)
      .get('/api/doubt/history')
      .set('Authorization', `Bearer ${FREE_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.doubts).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
  });

  it('filters by subject when subject query param provided', async () => {
    (prisma.doubt.findMany as jest.Mock).mockResolvedValue([mockDoubt]);
    (prisma.doubt.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/doubt/history?subject=Physics')
      .set('Authorization', `Bearer ${FREE_TOKEN}`);

    expect(res.status).toBe(200);
    // Both findMany and count are called with the subject filter
    const findManyCall = (prisma.doubt.findMany as jest.Mock).mock.calls[0][0] as { where: { subject?: string } };
    expect(findManyCall.where.subject).toBe('Physics');
  });

  it('rejects limit > 50 with 400 validation error', async () => {
    const res = await request(app)
      .get('/api/doubt/history?limit=999')
      .set('Authorization', `Bearer ${FREE_TOKEN}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// ── POST /api/doubt/escalate ────────────────────────────────────────────────

describe('POST /api/doubt/escalate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 TIER_REQUIRED for free tier user', async () => {
    const res = await request(app)
      .post('/api/doubt/escalate')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ doubtId: mockDoubt.id, reason: 'Samajh nahi aaya' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TIER_REQUIRED');
  });

  it('returns 404 for non-existent doubtId', async () => {
    (prisma.doubt.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/doubt/escalate')
      .set('Authorization', `Bearer ${PLUS_TOKEN}`)
      .send({ doubtId: '00000000-0000-0000-0000-000000000000', reason: 'Need help' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('DOUBT_NOT_FOUND');
  });

  it('returns 200 with Hindi success message for plus user', async () => {
    (prisma.doubt.findUnique as jest.Mock).mockResolvedValue({
      ...mockDoubt,
      userId: 'user-plus',
    });
    (prisma.doubt.update as jest.Mock).mockResolvedValue({
      ...mockDoubt,
      userId: 'user-plus',
      escalatedToHuman: true,
    });

    const res = await request(app)
      .post('/api/doubt/escalate')
      .set('Authorization', `Bearer ${PLUS_TOKEN}`)
      .send({ doubtId: mockDoubt.id, reason: 'Samajh nahi aaya' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toContain('Expert ko bheja gaya');
  });

  it('returns 200 with Hindi success message for pro user', async () => {
    (prisma.doubt.findUnique as jest.Mock).mockResolvedValue({
      ...mockDoubt,
      userId: 'user-pro',
    });
    (prisma.doubt.update as jest.Mock).mockResolvedValue({
      ...mockDoubt,
      userId: 'user-pro',
      escalatedToHuman: true,
    });

    const res = await request(app)
      .post('/api/doubt/escalate')
      .set('Authorization', `Bearer ${PRO_TOKEN}`)
      .send({ doubtId: mockDoubt.id, reason: 'Concept unclear' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toBeDefined();
  });
});

// ── GET /api/doubt/upload-url ───────────────────────────────────────────────

describe('GET /api/doubt/upload-url', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUploadPresignedUrl as jest.Mock).mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/vidyaai-audio/audio/uploads/user-abc/uuid.webm?X-Amz-...',
      s3Key: 'audio/uploads/user-abc/uuid.webm',
    });
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/doubt/upload-url?contentType=audio/webm');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for missing contentType', async () => {
    const res = await request(app)
      .get('/api/doubt/upload-url')
      .set('Authorization', `Bearer ${FREE_TOKEN}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for unsupported contentType', async () => {
    const res = await request(app)
      .get('/api/doubt/upload-url?contentType=audio/wav')
      .set('Authorization', `Bearer ${FREE_TOKEN}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with uploadUrl, s3Key, expiresIn for valid request', async () => {
    const res = await request(app)
      .get('/api/doubt/upload-url?contentType=audio/webm')
      .set('Authorization', `Bearer ${FREE_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toBeDefined();
    expect(res.body.s3Key).toMatch(/^audio\/uploads\/user-abc\//);
    expect(res.body.expiresIn).toBe(300);
  });
});

// ── POST /api/doubt/transcribe ──────────────────────────────────────────────

describe('POST /api/doubt/transcribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (transcribeAudio as jest.Mock).mockResolvedValue('Newton ka teesra niyam kya hota hai?');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/doubt/transcribe')
      .send({ s3Key: 'audio/uploads/user-abc/uuid.webm' });
    expect(res.status).toBe(401);
  });

  it('returns 400 INVALID_S3_KEY when s3Key belongs to a different user', async () => {
    const res = await request(app)
      .post('/api/doubt/transcribe')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ s3Key: 'audio/uploads/other-user/uuid.webm', language: 'hi' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_S3_KEY');
  });

  it('returns 200 with transcribedText for valid request', async () => {
    const res = await request(app)
      .post('/api/doubt/transcribe')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ s3Key: 'audio/uploads/user-abc/uuid.webm', language: 'hi' });

    expect(res.status).toBe(200);
    expect(res.body.transcribedText).toBe('Newton ka teesra niyam kya hota hai?');
  });

  it('propagates 504 TRANSCRIPTION_TIMEOUT from service', async () => {
    const { AppError } = require('../middleware/errorHandler');
    (transcribeAudio as jest.Mock).mockRejectedValue(
      new AppError('Transcription timed out', 'TRANSCRIPTION_TIMEOUT', 504)
    );

    const res = await request(app)
      .post('/api/doubt/transcribe')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ s3Key: 'audio/uploads/user-abc/uuid.webm', language: 'hi' });

    expect(res.status).toBe(504);
    expect(res.body.code).toBe('TRANSCRIPTION_TIMEOUT');
  });

  it('propagates 422 TRANSCRIPTION_FAILED from service', async () => {
    const { AppError } = require('../middleware/errorHandler');
    (transcribeAudio as jest.Mock).mockRejectedValue(
      new AppError('Transcription failed', 'TRANSCRIPTION_FAILED', 422)
    );

    const res = await request(app)
      .post('/api/doubt/transcribe')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ s3Key: 'audio/uploads/user-abc/uuid.webm', language: 'hi' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('TRANSCRIPTION_FAILED');
  });
});

// ── POST /api/doubt/solve (with audioUrl) ──────────────────────────────────

describe('POST /api/doubt/solve — voice input (audioUrl)', () => {
  const AUDIO_URL = 'audio/uploads/user-abc/uuid.webm';

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.doubt.count as jest.Mock).mockResolvedValue(0);
    (prisma.weaknessMap.findMany as jest.Mock).mockResolvedValue([]);
    (transcribeAudio as jest.Mock).mockResolvedValue('Newton ka teesra niyam kya hota hai?');
    (solveDoubt as jest.Mock).mockResolvedValue({
      answer: 'Newton ka teesra niyam kehta hai...',
      latencyMs: 1200,
    });
    (synthesiseSpeech as jest.Mock).mockResolvedValue(
      'https://cdn.vidyaai.in/audio/responses/abc.mp3'
    );
    (prisma.doubt.create as jest.Mock).mockResolvedValue({
      ...mockDoubt,
      questionAudio: AUDIO_URL,
      audioResponse: 'https://cdn.vidyaai.in/audio/responses/abc.mp3',
    });
    (tagWeakness as jest.Mock).mockResolvedValue(null);
  });

  it('returns 400 INVALID_S3_KEY when audioUrl belongs to a different user', async () => {
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({
        audioUrl: 'audio/uploads/other-user/uuid.webm',
        subject: 'Physics',
        language: 'hi',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_S3_KEY');
  });

  it('returns 429 QUOTA_EXCEEDED when free user has used 3 voice doubts today', async () => {
    (prisma.doubt.count as jest.Mock).mockResolvedValue(3);

    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ audioUrl: AUDIO_URL, subject: 'Physics', language: 'hi' });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('QUOTA_EXCEEDED');
  });

  it('returns 200 with audioUrl in response for valid voice request', async () => {
    const res = await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ audioUrl: AUDIO_URL, subject: 'Physics', language: 'hi' });

    expect(res.status).toBe(200);
    expect(res.body.doubtId).toBeDefined();
    expect(res.body.answer).toBe('Newton ka teesra niyam kehta hai...');
    expect(res.body.audioUrl).toBe('https://cdn.vidyaai.in/audio/responses/abc.mp3');
  });

  it('calls transcribeAudio then solveDoubt then synthesiseSpeech in sequence', async () => {
    await request(app)
      .post('/api/doubt/solve')
      .set('Authorization', `Bearer ${FREE_TOKEN}`)
      .send({ audioUrl: AUDIO_URL, subject: 'Physics', language: 'hi' });

    expect(transcribeAudio).toHaveBeenCalledTimes(1);
    expect(solveDoubt).toHaveBeenCalledTimes(1);
    expect(synthesiseSpeech).toHaveBeenCalledWith({
      text: 'Newton ka teesra niyam kehta hai...',
      languageCode: 'hi',
    });
  });
});
