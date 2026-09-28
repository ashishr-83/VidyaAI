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
| GET | `/api/plan/available` | Yes | Distinct class/board/subject combos in ChapterContent |
| GET | `/api/plan/chapters?class=7&subject=Science` | Yes | Ordered chapter list for picker |

## Chapter Deep-Dive (RAG-powered)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/plan/chapters/:id/pdf-url` | Yes | Pre-signed S3 URL for chapter PDF (1-hour expiry) |
| POST | `/api/plan/chapters/:id/explain` | Yes | RAG + Claude: full chapter explanation with optional diagram scripts |
| POST | `/api/plan/chapters/:id/qa` | Yes | RAG + Claude: 10 sample Q&A (long/short/fill) |
| POST | `/api/plan/chapters/:id/practice-test` | Yes | RAG + Claude: fresh 30-mark exam paper (MCQ/fill/short/long) |

## Admin / Ingestion

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/admin/ingest/:chapterId` | Admin JWT | Trigger PDF ingestion → chunk → embed → store in pgvector |

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
