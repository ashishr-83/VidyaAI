import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Mock declarations must come before any imports that trigger side effects ──

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn().mockReturnValue({}),
  credential: { cert: jest.fn() },
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn(),
  }),
}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
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
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_SERVICE_ACCOUNT_KEY: '{}',
    ANTHROPIC_API_KEY: 'dummy-test-key',
    AWS_REGION: 'ap-south-1',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_TRANSCRIBE_LANGUAGE_CODE: 'hi-IN',
    REDIS_URL: 'redis://localhost:6379',
  },
}));

// ── Import app AFTER mocks are in place ──
import app from '../index';

const admin = require('firebase-admin');
const { prisma } = require('../lib/prisma');

// ── Shared test constants ───────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-that-is-long-enough-32ch';

interface MockUser {
  id: string;
  phone: string;
  tier: string;
  name: string;
  class: number;
  board?: string;
  language?: string;
  examDate?: Date | null;
  studyHoursPerDay?: number;
  createdAt?: Date;
}

interface JwtPayload {
  userId: string;
  phone: string;
  tier: string;
  iat: number;
  exp: number;
}

function makeValidJwt(overrides: Partial<{ userId: string; phone: string; tier: string }> = {}): string {
  return jwt.sign(
    { userId: 'user-123', phone: '+919876543210', tier: 'free', ...overrides },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function makeExpiredJwt(): string {
  return jwt.sign(
    { userId: 'user-123', phone: '+919876543210', tier: 'free' },
    JWT_SECRET,
    { expiresIn: '-1s' }
  );
}

const newUserMock: MockUser = {
  id: 'user-123',
  phone: '+919876543210',
  tier: 'free',
  name: '',
  class: 0,
};

const onboardedUserMock: MockUser = {
  id: 'user-123',
  phone: '+919876543210',
  tier: 'free',
  name: 'Rohan Sharma',
  class: 11,
};

// ── GET /health ─────────────────────────────────────────────────────────────

describe('GET /health', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 with status ok and db connected when DB responds', async () => {
    // Arrange
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ '?column?': 1 }]);

    // Act
    const res = await request(app).get('/health');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(res.body.service).toBe('vidyaai-backend');
  });

  it('should return 503 with db unreachable when Prisma throws', async () => {
    // Arrange
    (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

    // Act
    const res = await request(app).get('/health');

    // Assert
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.db).toBe('unreachable');
  });

  it('should not expose stack traces or internal error details in the response', async () => {
    // Arrange
    (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('password=supersecret'));

    // Act
    const res = await request(app).get('/health');

    // Assert
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('supersecret');
  });
});

// ── POST /api/auth/verify-otp ───────────────────────────────────────────────

describe('POST /api/auth/verify-otp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 VALIDATION_ERROR when idToken is missing', async () => {
    // Arrange — no body

    // Act
    const res = await request(app).post('/api/auth/verify-otp').send({});

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.fields).toBeDefined();
  });

  it('should return 400 VALIDATION_ERROR when idToken is an empty string', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({ idToken: '' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 INVALID_FIREBASE_TOKEN when Firebase rejects the token', async () => {
    // Arrange
    (admin.auth().verifyIdToken as jest.Mock).mockRejectedValueOnce(
      new Error('Firebase ID token has expired')
    );

    // Act
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ idToken: 'expired-firebase-token' });

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_FIREBASE_TOKEN');
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 NO_PHONE_IN_TOKEN when decoded token has no phone_number', async () => {
    // Arrange — email-only Firebase token (no phone claim)
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({
      uid: 'firebase-uid-999',
      email: 'student@email.com',
      // phone_number intentionally absent
    });

    // Act
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ idToken: 'email-only-token' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_PHONE_IN_TOKEN');
  });

  it('should return 200 with token, isOnboarded=false, and userId for a new user', async () => {
    // Arrange
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({
      phone_number: '+919876543210',
    });
    (prisma.user.upsert as jest.Mock).mockResolvedValueOnce(newUserMock);

    // Act
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ idToken: 'valid-new-user-token' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.isOnboarded).toBe(false);
    expect(res.body.userId).toBe('user-123');
  });

  it('should return isOnboarded=true when class > 0 (onboarded user)', async () => {
    // Arrange
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({
      phone_number: '+919876543210',
    });
    (prisma.user.upsert as jest.Mock).mockResolvedValueOnce(onboardedUserMock);

    // Act
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ idToken: 'valid-returning-user-token' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.isOnboarded).toBe(true);
  });

  it('JWT token should decode to payload containing userId, phone, and tier', async () => {
    // Arrange
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({
      phone_number: '+919876543210',
    });
    (prisma.user.upsert as jest.Mock).mockResolvedValueOnce(newUserMock);

    // Act
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ idToken: 'valid-firebase-token' });

    // Assert
    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, JWT_SECRET) as JwtPayload;
    expect(decoded.userId).toBe('user-123');
    expect(decoded.phone).toBe('+919876543210');
    expect(decoded.tier).toBe('free');
    // JWT must not carry name — privacy rule from spec
    expect((decoded as unknown as Record<string, unknown>).name).toBeUndefined();
  });

  it('JWT token should have 30-day expiry', async () => {
    // Arrange
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({
      phone_number: '+919876543210',
    });
    (prisma.user.upsert as jest.Mock).mockResolvedValueOnce(newUserMock);

    // Act
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ idToken: 'valid-firebase-token' });

    // Assert
    const decoded = jwt.verify(res.body.token, JWT_SECRET) as JwtPayload;
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    const actualTtl = decoded.exp - decoded.iat;
    // Allow ±5 seconds drift for test execution time
    expect(actualTtl).toBeGreaterThanOrEqual(thirtyDaysInSeconds - 5);
    expect(actualTtl).toBeLessThanOrEqual(thirtyDaysInSeconds + 5);
  });

  it('should return 429 after exceeding 20 requests from the same IP', async () => {
    // Arrange — exhaust the auth rate limit (20 req window)
    // Note: rate limiter is in-memory per express-rate-limit default store.
    // We fire 21 requests; the 21st must be rate-limited.
    // Firebase mock rejects all so they return fast 401s (not 200s).
    (admin.auth().verifyIdToken as jest.Mock).mockRejectedValue(new Error('bad token'));

    const requests = Array.from({ length: 21 }, () =>
      request(app).post('/api/auth/verify-otp').send({ idToken: 'x' })
    );

    // Act — run sequentially to guarantee order with in-band Jest runner
    const responses: { status: number }[] = [];
    for (const req of requests) {
      responses.push(await req);
    }

    // Assert — last response must be 429
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(429);
  });
});

// ── POST /api/auth/onboard ──────────────────────────────────────────────────

describe('POST /api/auth/onboard', () => {
  beforeEach(() => jest.clearAllMocks());

  const validOnboardBody = {
    name: 'Rohan Sharma',
    class: 11,
    board: 'CBSE',
    language: 'hi',
    examDate: '2026-05-15T00:00:00Z',
    studyHoursPerDay: 6,
  };

  // Matches the Prisma select in auth.ts /onboard: id, name, class, board, language, tier — no phone
  const updatedUserMock = {
    id: 'user-123',
    tier: 'free',
    name: 'Rohan Sharma',
    class: 11,
    board: 'CBSE',
    language: 'hi',
  };

  it('should return 401 when Authorization header is absent', async () => {
    // Arrange — no auth header

    // Act
    const res = await request(app)
      .post('/api/auth/onboard')
      .send(validOnboardBody);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 INVALID_TOKEN when JWT is expired', async () => {
    // Arrange
    const expiredToken = makeExpiredJwt();

    // Act
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send(validOnboardBody);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('should return 401 INVALID_TOKEN when JWT is malformed', async () => {
    // Act
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', 'Bearer this.is.not.a.jwt')
      .send(validOnboardBody);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('should return 400 VALIDATION_ERROR when name is missing', async () => {
    // Arrange
    const token = makeValidJwt();
    const { name: _name, ...bodyWithoutName } = validOnboardBody;

    // Act
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyWithoutName);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.fields?.name).toBeDefined();
  });

  it('should return 400 VALIDATION_ERROR when class is out of range', async () => {
    // Arrange — class 5 is below minimum (6)
    const token = makeValidJwt();

    // Act
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validOnboardBody, class: 5 });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 VALIDATION_ERROR when board is not an allowed enum value', async () => {
    // Arrange
    const token = makeValidJwt();

    // Act
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validOnboardBody, board: 'UNKNOWN_BOARD' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 200 with user object on valid JWT + full body', async () => {
    // Arrange
    const token = makeValidJwt();
    (prisma.user.update as jest.Mock).mockResolvedValueOnce(updatedUserMock);

    // Act
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send(validOnboardBody);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe('user-123');
    expect(res.body.user.name).toBe('Rohan Sharma');
    expect(res.body.user.class).toBe(11);
    expect(res.body.user.board).toBe('CBSE');
    expect(res.body.user.language).toBe('hi');
    expect(res.body.user.tier).toBe('free');
    // phone must NOT be in the onboard response (spec: select returns id, name, class, board, language, tier)
    expect(res.body.user.phone).toBeUndefined();
  });

  it('should be idempotent — second call with same data returns 200 and same shape', async () => {
    // Arrange — simulate calling /onboard twice
    const token = makeValidJwt();
    (prisma.user.update as jest.Mock)
      .mockResolvedValueOnce(updatedUserMock)
      .mockResolvedValueOnce(updatedUserMock);

    // Act
    const first = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send(validOnboardBody);

    const second = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send(validOnboardBody);

    // Assert — both calls succeed with same shape
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);
    // Prisma update called exactly twice — no extra DB writes
    expect(prisma.user.update).toHaveBeenCalledTimes(2);
  });

  it('should accept optional examDate being absent (field is optional)', async () => {
    // Arrange
    const token = makeValidJwt();
    const { examDate: _examDate, ...bodyWithoutExamDate } = validOnboardBody;
    (prisma.user.update as jest.Mock).mockResolvedValueOnce(updatedUserMock);

    // Act
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyWithoutExamDate);

    // Assert
    expect(res.status).toBe(200);
  });
});

// ── GET /api/auth/profile ───────────────────────────────────────────────────

describe('GET /api/auth/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  const fullProfileMock = {
    id: 'user-123',
    phone: '+919876543210',
    name: 'Rohan Sharma',
    class: 11,
    board: 'CBSE',
    language: 'hi',
    tier: 'free',
    examDate: '2026-05-15T00:00:00.000Z',
    studyHoursPerDay: 6,
    createdAt: '2025-07-01T00:00:00.000Z',
  };

  it('should return 401 UNAUTHORIZED when Authorization header is missing', async () => {
    // Act
    const res = await request(app).get('/api/auth/profile');

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 INVALID_TOKEN when JWT is expired', async () => {
    // Arrange
    const expiredToken = makeExpiredJwt();

    // Act
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${expiredToken}`);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('should return 401 INVALID_TOKEN when JWT is malformed', async () => {
    // Act
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer not.a.real.jwt.at.all');

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('should return 401 INVALID_TOKEN when JWT is signed with wrong secret', async () => {
    // Arrange — signed with a different secret
    const wrongSecretToken = jwt.sign(
      { userId: 'user-123', phone: '+919876543210', tier: 'free' },
      'completely-different-secret-key-xyz',
      { expiresIn: '30d' }
    );

    // Act
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${wrongSecretToken}`);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('should return 200 with all profile fields for a valid JWT', async () => {
    // Arrange
    const token = makeValidJwt();
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(fullProfileMock);

    // Act
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();

    const { user } = res.body;
    expect(user.id).toBe('user-123');
    expect(user.phone).toBe('+919876543210');
    expect(user.name).toBe('Rohan Sharma');
    expect(user.class).toBe(11);
    expect(user.board).toBe('CBSE');
    expect(user.language).toBe('hi');
    expect(user.tier).toBe('free');
    expect(user.examDate).toBeDefined();
    expect(user.studyHoursPerDay).toBe(6);
    expect(user.createdAt).toBeDefined();
  });

  it('should return 404 USER_NOT_FOUND when userId in JWT does not exist in DB', async () => {
    // Arrange — token is valid but user was deleted from DB
    const token = makeValidJwt({ userId: 'deleted-user-id' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

    // Act
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  it('should query DB using userId from JWT, not from request params', async () => {
    // Arrange — verifies the middleware extracts userId from token correctly
    const token = makeValidJwt({ userId: 'specific-user-abc' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...fullProfileMock, id: 'specific-user-abc' });

    // Act
    await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    // Assert — Prisma called with correct userId from token
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'specific-user-abc' },
      })
    );
  });
});

// ── Middleware: requireTier ─────────────────────────────────────────────────

describe('requireTier middleware', () => {
  // requireTier is not yet applied to any auth routes in Session 1.
  // This suite tests the middleware in isolation using the actual implementation.

  it('should be importable and return a function', () => {
    const { requireTier } = require('../middleware/auth');
    expect(typeof requireTier).toBe('function');
    const handler = requireTier('plus', 'pro');
    expect(typeof handler).toBe('function');
  });

  it('should call next with TIER_REQUIRED error when user tier is not in allowed list', () => {
    const { requireTier } = require('../middleware/auth');
    const middleware = requireTier('plus', 'pro');

    const mockReq = { user: { userId: 'u1', phone: '+91', tier: 'free' } } as any;
    const mockRes = {} as any;
    const mockNext = jest.fn();

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = mockNext.mock.calls[0][0];
    expect(error.code).toBe('TIER_REQUIRED');
    expect(error.statusCode).toBe(403);
  });

  it('should call next() with no args when user tier matches', () => {
    const { requireTier } = require('../middleware/auth');
    const middleware = requireTier('free', 'plus');

    const mockReq = { user: { userId: 'u1', phone: '+91', tier: 'free' } } as any;
    const mockRes = {} as any;
    const mockNext = jest.fn();

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(); // no args = pass-through
  });

  it('should call next with UNAUTHORIZED when req.user is absent', () => {
    const { requireTier } = require('../middleware/auth');
    const middleware = requireTier('plus');

    const mockReq = {} as any; // no user set
    const mockRes = {} as any;
    const mockNext = jest.fn();

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = mockNext.mock.calls[0][0];
    expect(error.code).toBe('UNAUTHORIZED');
  });
});

// ── Error handler ───────────────────────────────────────────────────────────

describe('errorHandler middleware', () => {
  it('should return 404 with NOT_FOUND code for unknown routes', async () => {
    const res = await request(app).get('/api/route/that/does/not/exist');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('should not expose stack traces in error responses', async () => {
    // Arrange — trigger a real 401 (no auth header)
    const res = await request(app).get('/api/auth/profile');

    // Assert — response body must not contain stack trace artifacts
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toMatch(/at Object\./);
    expect(bodyStr).not.toContain('stack');
  });
});

// ── Env validation ──────────────────────────────────────────────────────────

describe('Env validation (lib/env.ts)', () => {
  // env.ts calls process.exit(1) synchronously when validation fails.
  // We use jest.isolateModules so re-importing env.ts does NOT re-evaluate
  // index.ts (which would try to call app.listen again and hit EADDRINUSE).
  // The isolateModules block gets its own fresh module registry that is
  // discarded after the callback — the outer module cache is untouched.

  function loadEnvModule(): void {
    jest.isolateModules(() => {
      require('../lib/env');
    });
  }

  it('should call process.exit(1) when required env vars are missing', () => {
    const originalEnv = { ...process.env };
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code}) called`);
    });

    try {
      delete process.env.JWT_SECRET;
      delete process.env.DATABASE_URL;
      // Un-mock only inside this test so the real Zod validation runs
      jest.unmock('../lib/env');

      expect(loadEnvModule).toThrow(/process\.exit\(1\)/);
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      process.env = originalEnv;
      exitSpy.mockRestore();
      // Restore the mock so subsequent test suites see the mocked env
      jest.mock('../lib/env', () => ({
        env: {
          NODE_ENV: 'test',
          PORT: 3000,
          DATABASE_URL: 'postgresql://test',
          JWT_SECRET: 'test-secret-that-is-long-enough-32ch',
          FIREBASE_PROJECT_ID: 'test-project',
          FIREBASE_SERVICE_ACCOUNT_KEY: '{}',
          ANTHROPIC_API_KEY: 'dummy-test-key',
          AWS_REGION: 'ap-south-1',
          AWS_S3_BUCKET: 'test-bucket',
          AWS_TRANSCRIBE_LANGUAGE_CODE: 'hi-IN',
          REDIS_URL: 'redis://localhost:6379',
        },
      }));
    }
  });

  it('should call process.exit(1) when JWT_SECRET is shorter than 32 characters', () => {
    const originalEnv = { ...process.env };
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code}) called`);
    });

    try {
      process.env.JWT_SECRET = 'tooshort';
      process.env.DATABASE_URL = 'postgresql://valid-url';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{}';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-valid';

      jest.unmock('../lib/env');

      expect(loadEnvModule).toThrow(/process\.exit\(1\)/);
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      process.env = originalEnv;
      exitSpy.mockRestore();
      jest.mock('../lib/env', () => ({
        env: {
          NODE_ENV: 'test',
          PORT: 3000,
          DATABASE_URL: 'postgresql://test',
          JWT_SECRET: 'test-secret-that-is-long-enough-32ch',
          FIREBASE_PROJECT_ID: 'test-project',
          FIREBASE_SERVICE_ACCOUNT_KEY: '{}',
          ANTHROPIC_API_KEY: 'dummy-test-key',
          AWS_REGION: 'ap-south-1',
          AWS_S3_BUCKET: 'test-bucket',
          AWS_TRANSCRIBE_LANGUAGE_CODE: 'hi-IN',
          REDIS_URL: 'redis://localhost:6379',
        },
      }));
    }
  });
});
