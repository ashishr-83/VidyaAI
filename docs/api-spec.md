# VidyaAI API Specification

Base URL: `http://localhost:3000` (dev) | `https://api.vidyaai.in` (prod)

All authenticated routes require: `Authorization: Bearer <firebase-id-token>`

All error responses: `{ "error": "description", "code": "ERROR_CODE" }`

---

## Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/verify-otp` | No | Firebase OTP → returns JWT |
| POST | `/api/auth/onboard` | Yes | Save class, board, exam date, language |
| GET | `/api/auth/profile` | Yes | Get user profile |

## Doubt Solver

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/doubt/transcribe` | Yes | Audio blob → transcribed text |
| POST | `/api/doubt/solve` | Yes | Text → Claude explanation + audio URL |
| POST | `/api/doubt/solve-visual` | Yes | Text → explanation + diagram JSON + audio |
| POST | `/api/doubt/feedback` | Yes | Mark doubt helpful/not helpful |
| GET | `/api/doubt/history` | Yes | Paginated doubt history |
| POST | `/api/doubt/escalate` | Yes | Flag for human expert |

## Study Plan

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/plan/today` | Yes | Today's personalised plan |
| GET | `/api/plan/week` | Yes | Full 7-day view |
| POST | `/api/plan/complete-task` | Yes | Mark task done |
| POST | `/api/plan/regenerate` | Yes | Regenerate plan |

## Progress

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/progress/weakness-graph` | Yes | Subject-wise weakness data |
| GET | `/api/progress/streak` | Yes | Study streak |
| POST | `/api/progress/log-session` | Yes | Log manual session |

## Payments

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/payment/create-order` | Yes | Create Razorpay order |
| POST | `/api/payment/verify` | Yes | Verify payment → upgrade tier |
| GET | `/api/payment/subscription` | Yes | Current subscription |
