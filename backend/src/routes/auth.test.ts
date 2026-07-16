import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Mock declarations must come before any imports that trigger side effects ──

jest.mock('twilio', () => {
  const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM-test-sid' });
  return jest.fn().mockReturnValue({
    messages: { create: mockCreate },
  });
});

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    otpRecord: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
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

// ── Import app AFTER mocks are in place ──
import app from '../index';

const { prisma } = require('../lib/prisma');

// ── Shared test constants ───────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-that-is-long-enough-32ch';

interface JwtPayload {
  userId: string;
  phone?: string;
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

const newUserMock = {
  id: 'user-123',
  phone: '+919876543210',
  tier: 'free',
  name: '',
  class: 0,
};

const onboardedUserMock = {
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
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ '?column?': 1 }]);
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(res.body.service).toBe('vidyaai-backend');
  });

  it('should return 503 with db unreachable when Prisma throws', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.db).toBe('unreachable');
  });

  it('should not expose stack traces or internal error details in the response', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('password=supersecret'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('supersecret');
  });
});

// ── POST /api/auth/send-otp ─────────────────────────────────────────────────

describe('POST /api/auth/send-otp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 VALIDATION_ERROR when phone is missing', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 VALIDATION_ERROR when phone is not 10 digits', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({ phone: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 200 with success message on valid 10-digit phone', async () => {
    (prisma.otpRecord.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (prisma.otpRecord.create as jest.Mock).mockResolvedValueOnce({ id: 'otp-1' });

    const res = await request(app).post('/api/auth/send-otp').send({ phone: '9876543210' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('OTP sent successfully');
  });

  it('should delete any previous OTP records before creating a new one', async () => {
    (prisma.otpRecord.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    (prisma.otpRecord.create as jest.Mock).mockResolvedValueOnce({ id: 'otp-2' });

    await request(app).post('/api/auth/send-otp').send({ phone: '9876543210' });
    expect(prisma.otpRecord.deleteMany).toHaveBeenCalledWith({ where: { phone: '9876543210' } });
  });
});

// ── POST /api/auth/verify-otp ───────────────────────────────────────────────

describe('POST /api/auth/verify-otp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 VALIDATION_ERROR when phone is missing', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({ otp: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 VALIDATION_ERROR when otp is not 6 digits', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({ phone: '9876543210', otp: '123' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 OTP_NOT_FOUND when no valid OTP record exists', async () => {
    (prisma.otpRecord.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(app).post('/api/auth/verify-otp').send({ phone: '9876543210', otp: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OTP_NOT_FOUND');
  });

  it('should return 401 OTP_INVALID when OTP does not match the stored hash', async () => {
    // bcrypt hash of '999999' — won't match '123456'
    const bcrypt = require('bcryptjs');
    const wrongHash = await bcrypt.hash('999999', 10);
    (prisma.otpRecord.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'otp-1',
      phone: '9876543210',
      otp: wrongHash,
      expiresAt: new Date(Date.now() + 600_000),
    });

    const res = await request(app).post('/api/auth/verify-otp').send({ phone: '9876543210', otp: '123456' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('OTP_INVALID');
  });

  it('should return 200 with token, isOnboarded=false, and userId for a new user', async () => {
    const bcrypt = require('bcryptjs');
    const otpHash = await bcrypt.hash('123456', 10);
    (prisma.otpRecord.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'otp-1',
      phone: '9876543210',
      otp: otpHash,
      expiresAt: new Date(Date.now() + 600_000),
    });
    (prisma.otpRecord.delete as jest.Mock).mockResolvedValueOnce({});
    (prisma.user.upsert as jest.Mock).mockResolvedValueOnce(newUserMock);

    const res = await request(app).post('/api/auth/verify-otp').send({ phone: '9876543210', otp: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.isOnboarded).toBe(false);
    expect(res.body.userId).toBe('user-123');
  });

  it('should return isOnboarded=true when class > 0', async () => {
    const bcrypt = require('bcryptjs');
    const otpHash = await bcrypt.hash('654321', 10);
    (prisma.otpRecord.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'otp-2',
      phone: '9876543210',
      otp: otpHash,
      expiresAt: new Date(Date.now() + 600_000),
    });
    (prisma.otpRecord.delete as jest.Mock).mockResolvedValueOnce({});
    (prisma.user.upsert as jest.Mock).mockResolvedValueOnce(onboardedUserMock);

    const res = await request(app).post('/api/auth/verify-otp').send({ phone: '9876543210', otp: '654321' });
    expect(res.status).toBe(200);
    expect(res.body.isOnboarded).toBe(true);
  });

  it('should consume the OTP record after successful verification', async () => {
    const bcrypt = require('bcryptjs');
    const otpHash = await bcrypt.hash('111111', 10);
    (prisma.otpRecord.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'otp-consume',
      phone: '9876543210',
      otp: otpHash,
      expiresAt: new Date(Date.now() + 600_000),
    });
    (prisma.otpRecord.delete as jest.Mock).mockResolvedValueOnce({});
    (prisma.user.upsert as jest.Mock).mockResolvedValueOnce(newUserMock);

    await request(app).post('/api/auth/verify-otp').send({ phone: '9876543210', otp: '111111' });
    expect(prisma.otpRecord.delete).toHaveBeenCalledWith({ where: { id: 'otp-consume' } });
  });

  it('JWT token should decode to payload with userId, phone, and tier', async () => {
    const bcrypt = require('bcryptjs');
    const otpHash = await bcrypt.hash('222222', 10);
    (prisma.otpRecord.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'otp-jwt',
      phone: '9876543210',
      otp: otpHash,
      expiresAt: new Date(Date.now() + 600_000),
    });
    (prisma.otpRecord.delete as jest.Mock).mockResolvedValueOnce({});
    (prisma.user.upsert as jest.Mock).mockResolvedValueOnce(newUserMock);

    const res = await request(app).post('/api/auth/verify-otp').send({ phone: '9876543210', otp: '222222' });
    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, JWT_SECRET) as JwtPayload;
    expect(decoded.userId).toBe('user-123');
    expect(decoded.phone).toBe('+919876543210');
    expect(decoded.tier).toBe('free');
    expect((decoded as unknown as Record<string, unknown>).name).toBeUndefined();
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

  const updatedUserMock = {
    id: 'user-123',
    tier: 'free',
    name: 'Rohan Sharma',
    class: 11,
    board: 'CBSE',
    language: 'hi',
  };

  it('should return 401 when Authorization header is absent', async () => {
    const res = await request(app).post('/api/auth/onboard').send(validOnboardBody);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 INVALID_TOKEN when JWT is expired', async () => {
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${makeExpiredJwt()}`)
      .send(validOnboardBody);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('should return 400 VALIDATION_ERROR when name is missing', async () => {
    const token = makeValidJwt();
    const { name: _name, ...bodyWithoutName } = validOnboardBody;
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyWithoutName);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 VALIDATION_ERROR when class is out of range', async () => {
    const token = makeValidJwt();
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validOnboardBody, class: 5 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 VALIDATION_ERROR when board is invalid', async () => {
    const token = makeValidJwt();
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validOnboardBody, board: 'UNKNOWN' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 200 with user object on valid JWT + full body', async () => {
    const token = makeValidJwt();
    (prisma.user.update as jest.Mock).mockResolvedValueOnce(updatedUserMock);
    const res = await request(app)
      .post('/api/auth/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send(validOnboardBody);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('user-123');
    expect(res.body.user.name).toBe('Rohan Sharma');
    expect(res.body.user.class).toBe(11);
    expect(res.body.user.board).toBe('CBSE');
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
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 INVALID_TOKEN when JWT is expired', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${makeExpiredJwt()}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('should return 200 with all profile fields for a valid JWT', async () => {
    const token = makeValidJwt();
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(fullProfileMock);
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('user-123');
    expect(res.body.user.phone).toBe('+919876543210');
    expect(res.body.user.name).toBe('Rohan Sharma');
  });

  it('should return 404 USER_NOT_FOUND when user no longer exists in DB', async () => {
    const token = makeValidJwt({ userId: 'deleted-user-id' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  it('should query DB using userId from JWT', async () => {
    const token = makeValidJwt({ userId: 'specific-user-abc' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...fullProfileMock, id: 'specific-user-abc' });
    await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'specific-user-abc' } })
    );
  });
});

// ── Middleware: requireTier ─────────────────────────────────────────────────

describe('requireTier middleware', () => {
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
    const mockNext = jest.fn();
    middleware(mockReq, {} as any, mockNext);
    const error = mockNext.mock.calls[0][0];
    expect(error.code).toBe('TIER_REQUIRED');
    expect(error.statusCode).toBe(403);
  });

  it('should call next() with no args when user tier matches', () => {
    const { requireTier } = require('../middleware/auth');
    const middleware = requireTier('free', 'plus');
    const mockReq = { user: { userId: 'u1', phone: '+91', tier: 'free' } } as any;
    const mockNext = jest.fn();
    middleware(mockReq, {} as any, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
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
    const res = await request(app).get('/api/auth/profile');
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toMatch(/at Object\./);
    expect(bodyStr).not.toContain('stack');
  });
});
