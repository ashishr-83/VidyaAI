# Spec 01 — Backend Foundation

**Status:** `DONE`
**Session:** 1
**Branch:** `session/01-backend-foundation`

---

## Goal

Establish the Node.js/Express/TypeScript backend skeleton that all future sessions build on.
No feature logic — only infrastructure, auth, and health.

---

## Scope

### In
- Node.js + Express + TypeScript project with strict mode
- Prisma ORM connected to PostgreSQL with full schema
- Firebase Admin SDK initialised for phone OTP verification
- `/api/auth` routes: `POST /verify-otp`, `POST /onboard`, `GET /profile`
- JWT middleware (`requireAuth`) and tier gate (`requireTier`)
- Rate limiting: global (200 req/15 min) + auth limiter (20 req/15 min) + doubt burst guard
- Winston logger
- Central error handler with `AppError` class
- Env validation with Zod at startup (fail fast if vars missing)
- `GET /health` endpoint (DB ping)
- Jest test setup; auth route integration tests

### Out
- Doubt, plan, payment, progress routes (later sessions)
- AWS SDK (Session 3)
- Anthropic SDK (Session 2)

---

## What Was Built

```
backend/
├── src/
│   ├── index.ts                  ← Express app, graceful shutdown
│   ├── lib/
│   │   ├── env.ts                ← Zod env schema, validated at import
│   │   ├── firebase.ts           ← Firebase Admin init (singleton)
│   │   ├── logger.ts             ← Winston instance
│   │   └── prisma.ts             ← PrismaClient singleton
│   ├── middleware/
│   │   ├── auth.ts               ← requireAuth, requireTier, JwtPayload type
│   │   ├── errorHandler.ts       ← AppError class, central handler
│   │   └── rateLimit.ts          ← globalLimiter, authLimiter, doubtLimiter
│   └── routes/
│       ├── auth.ts               ← verify-otp, onboard, profile
│       └── auth.test.ts          ← Jest integration tests
└── prisma/
    └── schema.prisma             ← User, Doubt, WeaknessMap, StudyPlan, StudySession
```

---

## API Contract

### `POST /api/auth/verify-otp`
Rate-limited (20/15 min).

**Request:**
```json
{ "idToken": "<firebase-id-token>" }
```

**Response 200:**
```json
{ "token": "<jwt>", "isOnboarded": false, "userId": "<uuid>" }
```

**Errors:**
- `401 INVALID_FIREBASE_TOKEN` — token rejected by Firebase
- `400 NO_PHONE_IN_TOKEN` — phone_number missing in decoded token

---

### `POST /api/auth/onboard`
Requires `Authorization: Bearer <jwt>`.

**Request:**
```json
{
  "name": "Rohan Sharma",
  "class": 11,
  "board": "CBSE",
  "language": "hi",
  "examDate": "2026-05-15T00:00:00Z",
  "studyHoursPerDay": 6
}
```

**Response 200:**
```json
{ "user": { "id": "...", "name": "...", "class": 11, "board": "CBSE", "language": "hi", "tier": "free" } }
```

---

### `GET /api/auth/profile`
Requires `Authorization: Bearer <jwt>`.

**Response 200:**
```json
{
  "user": {
    "id": "...", "phone": "+91...", "name": "...", "class": 11,
    "board": "CBSE", "language": "hi", "tier": "free",
    "examDate": "...", "studyHoursPerDay": 6, "createdAt": "..."
  }
}
```

---

## Database Schema (implemented)

See `prisma/schema.prisma`. Models: `User`, `Doubt`, `WeaknessMap`, `StudyPlan`, `StudySession`.

Key constraints:
- `WeaknessMap` has composite unique on `(userId, subject, chapter, concept)`
- `StudyPlan` is 1-to-1 with User
- JWT payload carries `userId`, `phone`, `tier` — never name

---

## Acceptance Criteria (all met)

- [x] `GET /health` returns `{ status: "ok", db: "connected" }` when DB is reachable
- [x] `POST /api/auth/verify-otp` with a valid Firebase token creates/returns user + JWT
- [x] `POST /api/auth/onboard` updates user fields; repeated calls are idempotent
- [x] `GET /api/auth/profile` with expired token returns `401 INVALID_TOKEN`
- [x] Missing required env var at startup causes process to exit with error message
- [x] Auth routes reject >20 requests per 15 min from same IP
- [x] Prisma schema migrates cleanly on fresh PostgreSQL instance

---

## Dependencies

- None (first session)

## Known Decisions

- JWT expiry: 30 days (long-lived — no refresh token flow needed for Phase 1)
- `class: 0` is sentinel for un-onboarded users; `isOnboarded` derived from `class > 0`
- Firebase Admin initialised once at startup via side-effectful import of `lib/firebase.ts`
