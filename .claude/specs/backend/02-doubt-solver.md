# Spec 02 — Claude Doubt Solver API

**Status:** `READY`
**Session:** 2
**Depends on:** Spec 01 (backend foundation)

---

## Goal

Build the core AI doubt-solving endpoint (text input only — voice comes in Session 3).
Claude answers student doubts in their language; the response is stored with weakness tags.

---

## Scope

### In
- `backend/src/services/claude.ts` — Anthropic SDK wrapper
- `backend/src/routes/doubt.ts` — `/api/doubt` route group
- Endpoints: `POST /solve`, `POST /feedback`, `GET /history`, `POST /escalate`
- Weakness tagging as a background step after each solve (writes to `WeaknessMap`)
- Free-tier daily quota enforcement (3 voice + 5 text doubts/day) via DB count
- `doubtLimiter` middleware applied to all doubt routes
- Unit tests for Claude response parsing and weakness tag extraction
- Winston logging of every Claude API call with latency

### Out
- Audio transcription / TTS (Session 3)
- `POST /transcribe` endpoint (Session 3)
- `POST /solve-visual` with diagram script (Session 9)
- Redis caching of Claude responses (can be added later)

---

## File Structure

```
backend/src/
├── services/
│   └── claude.ts          ← Anthropic API wrapper, buildSystemPrompt(), parseTags()
└── routes/
    ├── doubt.ts            ← route handlers
    └── doubt.test.ts       ← unit + integration tests
```

---

## API Contract

### `POST /api/doubt/solve`
Requires auth. Rate-limited (burst guard).

**Request:**
```json
{
  "text": "Newton ka teesra niyam kya hota hai?",
  "subject": "Physics",
  "chapter": "Laws of Motion",
  "language": "hi"
}
```

**Validation (Zod):**
- `text`: string, min 5 chars, max 2000 chars
- `subject`: string, non-empty
- `chapter`: string, optional
- `language`: enum `["hi", "en", "ta", "te", "kn", "mr"]`, default `"hi"`

**Response 200:**
```json
{
  "doubtId": "<uuid>",
  "answer": "Newton ka teesra niyam kehta hai...",
  "conceptsTagged": ["Newton's Third Law", "Action-Reaction"],
  "audioUrl": null
}
```

**Errors:**
- `429 QUOTA_EXCEEDED` — free tier daily limit hit `{ error: "...", code: "QUOTA_EXCEEDED", resetAt: "<ISO date>" }`
- `502 AI_ERROR` — Claude API failed or timed out
- `400` — Zod validation failure

---

### `POST /api/doubt/feedback`
Requires auth.

**Request:**
```json
{ "doubtId": "<uuid>", "wasHelpful": true }
```

**Response 200:**
```json
{ "ok": true }
```

**Errors:**
- `404 DOUBT_NOT_FOUND`
- `403 FORBIDDEN` — doubt belongs to another user

---

### `GET /api/doubt/history`
Requires auth.

**Query params:**
- `page` (int, default 1)
- `limit` (int, default 20, max 50)
- `subject` (string, optional filter)

**Response 200:**
```json
{
  "doubts": [
    {
      "id": "...", "questionText": "...", "subject": "Physics",
      "chapter": "Laws of Motion", "aiResponse": "...",
      "conceptsTagged": ["..."], "wasHelpful": true,
      "createdAt": "..."
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### `POST /api/doubt/escalate`
Requires auth + `plus` or `pro` tier.

**Request:**
```json
{ "doubtId": "<uuid>", "reason": "Samajh nahi aaya" }
```

**Response 200:**
```json
{ "ok": true, "message": "Expert ko bheja gaya — 24 ghante mein reply milega" }
```

**Errors:**
- `403 TIER_REQUIRED` — free tier users
- `404 DOUBT_NOT_FOUND`

---

## Claude Integration (`claude.ts`)

### System Prompt Template
```
You are VidyaAI, a friendly and encouraging AI tutor for Indian students.
You are helping a Class {CLASS} student studying {BOARD} curriculum.
The student asked this doubt in {LANGUAGE}.

RULES:
1. Always respond in {LANGUAGE} (use simple, conversational language — not textbook language)
2. Break your explanation into 3 parts:
   - First: acknowledge what the student is asking in one line
   - Second: explain the concept step-by-step with a real-world Indian example
   - Third: give one practice question to verify understanding
3. If the question involves a formula, write it clearly with each term explained
4. End with: "Kya yeh clear ho gaya? Aur kuch poochna hai toh puchho!" (in student's language)
5. If the question is unclear, ask ONE clarifying question
6. Keep tone warm — like a kind older sibling who is good at studies
7. Maximum response length: 250 words

Subject context: {SUBJECT}
Student's known weak concepts: {WEAK_CONCEPTS}
```

### Weakness Tagging Prompt (separate call, background)
```
Given this student doubt: "{QUESTION}"
And this explanation: "{EXPLANATION}"

Identify which concepts from NCERT/JEE/NEET curriculum this question tests.
Return JSON only:
{
  "subject": "Physics",
  "chapter": "Laws of Motion",
  "concepts": ["Newton's Third Law", "Action-Reaction pairs"],
  "difficulty": "medium",
  "gradeLevel": 11
}
```

### `claude.ts` exports
```typescript
export async function solveDoubt(params: {
  question: string;
  subject: string;
  language: string;
  userClass: number;
  board: string;
  weakConcepts: string[];
}): Promise<{ answer: string; latencyMs: number }>

export async function tagWeakness(params: {
  question: string;
  explanation: string;
}): Promise<{ subject: string; chapter: string; concepts: string[]; difficulty: string; gradeLevel: number } | null>
```

### Claude API Config
- Model: `claude-sonnet-4-6`
- `max_tokens`: 600
- Timeout: 15 seconds (fail with `AI_ERROR` if exceeded)
- Log every call: `{ userId, latencyMs, subject, tokenCount }`
- Never pass student `name` or `phone` to Claude — use `userId` in logs only

---

## Quota Logic

```typescript
// Free tier: 3 voice + 5 text doubts per calendar day (UTC)
// Count today's doubts from DB. If limit reached, return 429.
const todayCount = await prisma.doubt.count({
  where: {
    userId,
    questionAudio: isVoice ? { not: null } : null,
    createdAt: { gte: startOfDay(new Date()) }
  }
});
const limit = isVoice ? 3 : 5;
if (tier === 'free' && todayCount >= limit) throw quotaError;
```

---

## Weakness Map Update Logic

After each solve, in the background (do not await in route handler):
1. Call `tagWeakness()` with question + answer
2. For each tagged concept, upsert `WeaknessMap`:
   - Increment `attemptCount`
   - If the student asked about it (implies confusion): increment `wrongCount`
   - Recalculate `weaknessScore = wrongCount / attemptCount`
   - Update `lastAttempted`

---

## Acceptance Criteria

- [ ] `POST /solve` with valid JWT + text returns a Hindi answer within 8 seconds on 4G (test with throttle)
- [ ] `POST /solve` for a free user who has used 5 text doubts today returns `429 QUOTA_EXCEEDED`
- [ ] `POST /solve` stores the doubt in DB with `conceptsTagged` populated (may be async, check after 2s)
- [ ] `POST /feedback` with wrong userId returns `403`
- [ ] `GET /history` pagination works: page 2 with limit 5 returns correct slice
- [ ] `POST /escalate` by free user returns `403 TIER_REQUIRED`
- [ ] Claude timeout (>15s) returns `502 AI_ERROR` — mock a slow API in tests
- [ ] Every Claude call logs `{ latencyMs, subject }` to Winston at `info` level
- [ ] Zod rejects `text` shorter than 5 chars with `400`

---

## Dependencies

- Spec 01 (backend foundation, auth middleware, Prisma)
- `@anthropic-ai/sdk` npm package
- `ANTHROPIC_API_KEY` env var
