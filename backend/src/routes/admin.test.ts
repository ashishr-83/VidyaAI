/**
 * Admin Routes — Ingest Endpoint Tests
 * POST /api/admin/ingest/:chapterId
 *
 * ingestChapter worker is fully mocked — these tests verify the HTTP layer only.
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

const mockIngestChapter = jest.fn();
jest.mock('../workers/ingestChapter', () => ({
  ingestChapter: (...args: unknown[]) => mockIngestChapter(...args),
}));

jest.mock('../services/claude', () => ({
  solveDoubt: jest.fn(),
  tagWeakness: jest.fn(),
  generateStudyPlan: jest.fn(),
  startLessonTurn: jest.fn(),
  continueLessonTurn: jest.fn(),
}));

jest.mock('../services/speech', () => ({
  s3Client: {},
  getUploadPresignedUrl: jest.fn(),
  transcribeAudio: jest.fn(),
  synthesiseSpeech: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://fake-presigned.url'),
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
import { AppError } from '../middleware/errorHandler';
import app from '../index';

const JWT_SECRET = 'test-secret-that-is-long-enough-32ch';
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

function makeJwt(userId = 'user-admin-test'): string {
  return jwt.sign({ userId, phone: '+919999999999', tier: 'free' }, JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => {
  mockIngestChapter.mockClear();
});

// ── POST /api/admin/ingest/:chapterId ─────────────────────────────────────────

describe('POST /api/admin/ingest/:chapterId', () => {
  it('returns 200 with chunksUpserted when ingestChapter succeeds', async () => {
    mockIngestChapter.mockResolvedValue({ chunksUpserted: 42 });
    const token = makeJwt();

    const res = await request(app)
      .post(`/api/admin/ingest/${VALID_UUID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, chapterId: VALID_UUID, chunksUpserted: 42 });
    expect(mockIngestChapter).toHaveBeenCalledWith(VALID_UUID);
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).post(`/api/admin/ingest/${VALID_UUID}`);
    expect(res.status).toBe(401);
    expect(mockIngestChapter).not.toHaveBeenCalled();
  });

  it('propagates AppError from ingestChapter (MISSING_PDF → 422)', async () => {
    mockIngestChapter.mockRejectedValue(
      new AppError('PDF not available for this chapter', 'MISSING_PDF', 422)
    );
    const token = makeJwt();

    const res = await request(app)
      .post(`/api/admin/ingest/${VALID_UUID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('MISSING_PDF');
  });

  it('returns 400 when chapterId is not a valid UUID', async () => {
    const token = makeJwt();

    const res = await request(app)
      .post('/api/admin/ingest/not-a-uuid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(mockIngestChapter).not.toHaveBeenCalled();
  });
});
