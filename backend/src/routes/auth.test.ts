import request from 'supertest';
import app from '../index';

// These tests mock Firebase and Prisma — no real DB or Firebase needed in CI.

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
    $queryRaw: jest.fn().mockResolvedValue([]),
    $disconnect: jest.fn(),
    $on: jest.fn(),
  },
}));

jest.mock('../lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    JWT_SECRET: 'test-secret-that-is-long-enough-32ch',
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_SERVICE_ACCOUNT_KEY: '{}',
    ANTHROPIC_API_KEY: 'sk-ant-test',
    AWS_REGION: 'ap-south-1',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_TRANSCRIBE_LANGUAGE_CODE: 'hi-IN',
    REDIS_URL: 'redis://localhost:6379',
  },
}));

const admin = require('firebase-admin');
const { prisma } = require('../lib/prisma');

describe('POST /api/auth/verify-otp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when idToken is missing', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when Firebase rejects the token', async () => {
    (admin.auth().verifyIdToken as jest.Mock).mockRejectedValueOnce(new Error('invalid'));

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ idToken: 'bad-token' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_FIREBASE_TOKEN');
  });

  it('returns JWT and isOnboarded=false for a new user', async () => {
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({
      phone_number: '+919876543210',
    });
    (prisma.user.upsert as jest.Mock).mockResolvedValueOnce({
      id: 'user-123',
      phone: '+919876543210',
      tier: 'free',
      name: '',
      class: 0,
    });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ idToken: 'valid-firebase-token' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.isOnboarded).toBe(false);
    expect(res.body.userId).toBe('user-123');
  });

  it('returns isOnboarded=true for an existing user with class set', async () => {
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({
      phone_number: '+919876543210',
    });
    (prisma.user.upsert as jest.Mock).mockResolvedValueOnce({
      id: 'user-123',
      phone: '+919876543210',
      tier: 'free',
      name: 'Rahul',
      class: 11,
    });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ idToken: 'valid-firebase-token' });

    expect(res.status).toBe(200);
    expect(res.body.isOnboarded).toBe(true);
  });
});

describe('GET /health', () => {
  it('returns 200 ok when DB responds', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ '?column?': 1 }]);
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
