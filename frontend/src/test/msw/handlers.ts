import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3000';

// ── Fixture data ──────────────────────────────────────────────────────────────

export const MOCK_USER_ONBOARDED = {
  id: 'user-123',
  phone: '+919876543210',
  name: 'Arjun Sharma',
  class: 11,
  board: 'CBSE',
  language: 'hi',
  tier: 'free',
  examDate: null,
  studyHoursPerDay: 5,
  createdAt: '2025-01-01T00:00:00.000Z',
};

export const MOCK_USER_NOT_ONBOARDED = {
  ...MOCK_USER_ONBOARDED,
  name: '',
  class: 0,
  board: '',
};

// ── Default handlers (happy path) ─────────────────────────────────────────────

export const handlers = [
  // GET /api/auth/profile — returns onboarded user
  http.get(`${BASE}/api/auth/profile`, () =>
    HttpResponse.json({ user: MOCK_USER_ONBOARDED })
  ),

  // POST /api/auth/verify-otp — success, user onboarded
  http.post(`${BASE}/api/auth/verify-otp`, () =>
    HttpResponse.json({
      token: 'mock-jwt-token',
      isOnboarded: true,
      userId: 'user-123',
    })
  ),

  // POST /api/auth/onboard — success
  http.post(`${BASE}/api/auth/onboard`, () =>
    HttpResponse.json({ user: MOCK_USER_ONBOARDED })
  ),
];
