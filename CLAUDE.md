# VidyaAI — Project Specification for Claude Code

## Project Overview

VidyaAI is an AI-powered personalised learning companion for Indian students in Class 6–12 and JEE/NEET aspirants. The platform provides voice-first doubt solving, adaptive study planning, concept weakness mapping, and answer writing coaching — all in Hindi and regional Indian languages.

**Core Philosophy:** Every other platform sells content. VidyaAI sells outcomes.

**Tech Stack:**
- Frontend: React Native (Expo) — single codebase for Android (Google Play) + Web (AWS)
- Backend: Node.js + Express on AWS EC2 / AWS Lambda (serverless functions)
- Database: PostgreSQL on AWS RDS + S3 for audio/image storage
- AI Engine: Anthropic Claude API (claude-sonnet-4-6) for all AI features
- Speech: AWS Transcribe (STT) + AWS Polly (TTS) for voice features
- Visuals: react-native-svg (animated diagram rendering, synced to audio)
- Payments: Razorpay (UPI, cards, wallets)
- Notifications: Twilio WhatsApp API + Firebase Push Notifications
- Auth: Firebase Authentication (phone OTP — primary for Indian users)
- Hosting: AWS EC2 (ap-south-1 Mumbai region) + CloudFront CDN

---

## Feature: Visual Explanation Engine (Phase 3)

**What it does:** While Claude's audio explanation plays, the screen shows an animated whiteboard-style diagram that builds up in sync with what's being said — like a teacher solving on a board, generated live for whatever the student asked.

**Why it matters:** No existing platform (Byju's, Unacademy, PhysicsWallah) generates a custom diagram per individual doubt. Their animations are pre-recorded for fixed topics. This is dynamic, per-question, and works for anything a student asks.

**How it works (architecture):**

1. Claude is NOT asked to draw. Claude is asked to return a **structured JSON diagram script** alongside its spoken explanation — a sequence of shapes, labels, and arrows with timing cues.
2. The frontend renders this JSON as animated SVG using `react-native-svg`, with each "step" in the script triggered at the matching audio timestamp (from Polly's speech marks / timing metadata).
3. Only certain subjects/chapters get visual treatment — Physics mechanics, Chemistry molecular structures, and Maths graphs benefit most. Pure theory subjects (History, Civics, etc.) stay audio + text only.

**Diagram JSON Schema (Claude output):**
```json
{
  "diagramType": "physics_mechanics",
  "canvasSize": { "width": 400, "height": 300 },
  "steps": [
    {
      "stepId": 1,
      "triggerAtMs": 0,
      "durationMs": 2000,
      "elements": [
        { "type": "circle", "id": "ball", "x": 80, "y": 150, "radius": 15, "fill": "#FF6B00", "label": "Ball" },
        { "type": "arrow", "id": "velocity_arrow", "from": [95, 150], "to": [180, 150], "color": "#3949AB", "label": "v" }
      ],
      "narrationSnippet": "Momentum kisi object ki motion ka quantity hai"
    },
    {
      "stepId": 2,
      "triggerAtMs": 2000,
      "durationMs": 1800,
      "elements": [
        { "type": "text", "id": "mass_label", "x": 80, "y": 120, "text": "m = 2kg", "fontSize": 14 },
        { "type": "formula", "id": "momentum_formula", "x": 200, "y": 220, "latex": "p = m \\times v", "animateIn": "fade" }
      ],
      "narrationSnippet": "Iska formula hai p equals m into v"
    },
    {
      "stepId": 3,
      "triggerAtMs": 3800,
      "durationMs": 2200,
      "elements": [
        { "type": "image_ref", "id": "bat_ball_scene", "asset": "cricket_bat_hit", "x": 50, "y": 50 },
        { "type": "arrow", "id": "force_arrow", "from": [120, 100], "to": [160, 100], "color": "#C62828", "label": "F" },
        { "type": "icon", "id": "timer", "asset": "clock", "x": 180, "y": 80, "label": "Δt" }
      ],
      "narrationSnippet": "Bat se ball hit karte ho, thode time ke liye force lagti hai"
    }
  ],
  "finalState": {
    "summaryFormula": "Impulse = Change in Momentum",
    "highlightElements": ["momentum_formula"]
  }
}
```

**Supported element types (v1):** `circle`, `rectangle`, `arrow`, `text`, `formula` (LaTeX via KaTeX-to-SVG), `image_ref` (pre-built asset library for common scenes — cricket, vehicles, everyday objects), `icon`.

**Diagram-type asset libraries to pre-build:**
| Subject | Diagram types |
|---|---|
| Physics | Force/motion diagrams, circuit diagrams, ray optics, wave diagrams |
| Chemistry | Molecular structures, reaction arrows, periodic table highlights, lab apparatus |
| Maths | Coordinate graphs, geometric shapes, function plots, number lines |

**Claude prompt addition (appended to existing doubt-solving system prompt):**
```
If this question is in Physics (mechanics/optics/waves), Chemistry (molecular structure/reactions), 
or Maths (graphs/geometry), ALSO return a diagramScript JSON object following the schema below, 
broken into 2-4 steps that build up progressively, each matched to a snippet of your spoken explanation.
Keep diagrams simple — maximum 6 elements per step. Use only the supported element types: circle, 
rectangle, arrow, text, formula, image_ref, icon. For image_ref, only use assets from this approved 
list: {ASSET_LIBRARY_LIST}. If the question doesn't suit a visual (e.g. History, Civics, pure 
definitions), omit diagramScript entirely.
```

**Audio-diagram sync mechanism:**
- AWS Polly returns speech marks (word/sentence-level timestamps) alongside the audio file
- Backend matches each diagram step's `narrationSnippet` to the closest speech-mark timestamp
- Frontend animation timer is driven by actual audio playback position, not a fixed timer — so it stays in sync even if the student pauses or scrubs the audio

**New API endpoint:**
```
POST /api/doubt/solve-visual   — Same as /api/doubt/solve but returns { audioUrl, diagramScript, speechMarks }
```

**New component:**
```
mobile/components/WhiteboardCanvas.tsx   — SVG renderer, step animator, syncs to audio position
mobile/hooks/useDiagramSync.ts           — links audio playback time to active diagram step
```

**Build effort estimate:** 3-4 weeks (asset library + renderer + sync logic) — sequence this as a **Phase 3** feature, after the core voice doubt loop (Phase 1) is validated with real daily users. Don't build this before you know the basic product works.

---

## Repository Structure

```
vidyaai/
├── CLAUDE.md                    ← this file
├── mobile/                      ← React Native (Expo) app
│   ├── app/
│   │   ├── (auth)/              ← login, OTP, onboarding screens
│   │   ├── (tabs)/              ← main tab navigation
│   │   │   ├── home/            ← dashboard
│   │   │   ├── doubt/           ← voice doubt solver
│   │   │   ├── plan/            ← daily study plan
│   │   │   ├── battle/          ← concept battles
│   │   │   └── profile/         ← settings, progress
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── VoiceRecorder.tsx    ← mic UI + recording logic
│   │   ├── ConceptCard.tsx      ← weakness graph display
│   │   ├── StudyTimer.tsx       ← Pomodoro-style timer
│   │   └── LanguagePicker.tsx   ← Hindi/regional language selector
│   ├── hooks/
│   │   ├── useDoubtSolver.ts    ← Claude API integration
│   │   ├── useStudyPlan.ts      ← adaptive plan logic
│   │   └── useVoice.ts          ← STT/TTS hooks
│   └── constants/
│       ├── subjects.ts          ← CBSE/ICSE/JEE/NEET subject maps
│       └── languages.ts         ← supported languages config
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          ← Firebase token verification
│   │   │   ├── doubt.ts         ← /api/doubt endpoints
│   │   │   ├── plan.ts          ← /api/plan endpoints
│   │   │   ├── battle.ts        ← /api/battle endpoints
│   │   │   └── progress.ts      ← /api/progress endpoints
│   │   ├── services/
│   │   │   ├── claude.ts        ← Anthropic API wrapper
│   │   │   ├── speech.ts        ← AWS Transcribe + Polly
│   │   │   ├── whatsapp.ts      ← Twilio WhatsApp service
│   │   │   └── razorpay.ts      ← payment service
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Doubt.ts
│   │   │   ├── StudyPlan.ts
│   │   │   └── WeaknessGraph.ts
│   │   └── middleware/
│   │       ├── auth.ts          ← JWT/Firebase middleware
│   │       └── rateLimit.ts     ← free tier limits
│   └── prisma/
│       └── schema.prisma        ← DB schema
└── docs/
    ├── api-spec.md
    └── ux-flows/

```

---

## Database Schema (Prisma)

```prisma
model User {
  id              String   @id @default(uuid())
  phone           String   @unique
  name            String
  class           Int      // 6-12 or 13 for JEE/NEET
  board           String   // CBSE, ICSE, STATE, JEE, NEET
  language        String   @default("hi") // hi, ta, te, kn, mr
  tier            String   @default("free") // free, plus, pro
  examDate        DateTime?
  studyHoursPerDay Int     @default(4)
  createdAt       DateTime @default(now())
  
  doubts          Doubt[]
  studyPlan       StudyPlan?
  weaknesses      WeaknessMap[]
  sessions        StudySession[]
}

model Doubt {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  questionText    String   // transcribed text
  questionAudio   String?  // S3 URL
  subject         String
  chapter         String?
  aiResponse      String   // Claude's explanation
  audioResponse   String?  // S3 URL of TTS response
  conceptsTagged  String[] // array of concept IDs
  wasHelpful      Boolean?
  escalatedToHuman Boolean @default(false)
  createdAt       DateTime @default(now())
}

model WeaknessMap {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  subject         String
  chapter         String
  concept         String
  weaknessScore   Float    // 0.0 (strong) to 1.0 (very weak)
  lastAttempted   DateTime
  attemptCount    Int      @default(0)
  wrongCount      Int      @default(0)
  updatedAt       DateTime @updatedAt
}

model StudyPlan {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  planData        Json     // day-wise schedule as JSON
  weeklyTarget    Int      // hours per week
  currentStreak   Int      @default(0)
  lastUpdated     DateTime @updatedAt
}

model StudySession {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  subject         String
  durationMinutes Int
  topicsCovered   String[]
  date            DateTime @default(now())
}
```

---

## API Endpoints

### Authentication
```
POST /api/auth/verify-otp     — Firebase phone OTP verification, returns JWT
POST /api/auth/onboard        — Save class, board, exam date, language
GET  /api/auth/profile        — Get user profile
```

### Doubt Solver (Core Feature)
```
POST /api/doubt/transcribe    — Upload audio blob → returns transcribed text
POST /api/doubt/solve         — { text, subject, language } → Claude response + audio URL
POST /api/doubt/feedback      — { doubtId, wasHelpful } → update DB
GET  /api/doubt/history       — Paginated doubt history for user
POST /api/doubt/escalate      — Flag doubt for human expert review
```

### Study Plan
```
GET  /api/plan/today          — Today's personalised plan
POST /api/plan/complete-task  — Mark a task done, recalculate plan
GET  /api/plan/week           — Full week view
POST /api/plan/regenerate     — Regenerate plan (after exam date change etc.)
```

### Progress & Weakness
```
GET  /api/progress/weakness-graph  — Subject-wise weakness data
GET  /api/progress/streak          — Study streak info
POST /api/progress/log-session     — Log manual study session
```

### Payments
```
POST /api/payment/create-order     — Razorpay order creation
POST /api/payment/verify           — Payment signature verification → upgrade tier
GET  /api/payment/subscription     — Current subscription status
```

---

## Claude API Integration Patterns

### Doubt Solver System Prompt
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
3. If the question involves a formula or equation, write it clearly with each term explained
4. End with: "Kya yeh clear ho gaya? Aur kuch poochna hai toh puchho!" (in the student's language)
5. If the question is unclear or too vague, ask ONE clarifying question
6. Keep tone warm and encouraging — like a kind older sibling who is good at studies
7. Maximum response length: 250 words

Current subject context: {SUBJECT}
Student's known weak concepts: {WEAK_CONCEPTS}
```

### Weakness Tagging Prompt
```
Given this student doubt question: "{QUESTION}"
And this Claude explanation: "{EXPLANATION}"

Identify which concepts from the NCERT/JEE/NEET curriculum this question tests.
Return JSON only:
{
  "subject": "Physics",
  "chapter": "Laws of Motion",
  "concepts": ["Newton's Third Law", "Action-Reaction pairs"],
  "difficulty": "medium",
  "gradeLevel": 11
}
```

### Study Plan Generation Prompt
```
Generate a personalised daily study plan for this student:
- Class: {CLASS}, Board: {BOARD}
- Exam date: {EXAM_DATE} ({DAYS_LEFT} days left)
- Available study hours per day: {HOURS}
- Weak subjects (by weakness score): {WEAK_SUBJECTS}
- Strong subjects: {STRONG_SUBJECTS}
- Subjects to cover: {SUBJECTS_LIST}

Return a 7-day JSON plan:
{
  "week": [
    {
      "day": "Monday",
      "date": "2025-07-01",
      "tasks": [
        { "subject": "Physics", "topic": "Thermodynamics", "duration": 45, "type": "learn" },
        { "subject": "Chemistry", "topic": "Organic revision", "duration": 30, "type": "revise" },
        { "mcqs": 20, "subject": "Physics", "duration": 20, "type": "practice" }
      ],
      "totalMinutes": 95
    }
  ]
}
Prioritise weak subjects. Include spaced repetition for previously covered topics.
```

---

## Environment Variables

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=vidyaai-audio
AWS_TRANSCRIBE_LANGUAGE_CODE=hi-IN

# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT_KEY=...

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Razorpay
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# Database
DATABASE_URL=postgresql://...

# App
JWT_SECRET=...
NODE_ENV=production
PORT=3000
```

---

## Supported Languages (Phase 1)

| Code | Language | AWS Transcribe Code | Polly Voice |
|------|----------|---------------------|-------------|
| hi   | Hindi    | hi-IN               | Aditi       |
| en   | English  | en-IN               | Raveena     |
| ta   | Tamil    | ta-IN               | (neural)    |
| te   | Telugu   | te-IN               | (neural)    |
| kn   | Kannada  | kn-IN               | (neural)    |
| mr   | Marathi  | mr-IN               | (neural)    |

---

## Subscription Tiers & Rate Limits

| Feature                  | Free       | Plus (₹199/mo) | Pro (₹399/mo) |
|--------------------------|------------|----------------|----------------|
| Voice doubts/day         | 3          | Unlimited       | Unlimited       |
| Text doubts/day          | 5          | Unlimited       | Unlimited       |
| Languages                | Hindi only | All 6           | All 6           |
| Daily study plan         | Basic      | Personalised    | Personalised    |
| WhatsApp reminders       | ✗          | ✓               | ✓               |
| Parent dashboard         | ✗          | ✓               | ✓               |
| Answer writing coach     | ✗          | 10/month        | Unlimited       |
| Mock tests               | ✗          | ✗               | ✓               |
| Human expert escalation  | ✗          | ✗               | 2/week          |

---

## Build Order (Claude Code Sessions)

### ✅ Session 1 — Backend Foundation (DONE)
1. ~~Init Node.js + Express + TypeScript project~~
2. ~~Set up Prisma with PostgreSQL schema above~~
3. ~~Implement Firebase auth middleware~~
4. ~~Create `/api/auth` routes~~

**Artefacts:** `backend/src/routes/auth.ts`, `backend/src/middleware/auth.ts`, `backend/src/lib/firebase.ts`, `backend/src/lib/prisma.ts`, `backend/prisma/schema.prisma`, `backend/src/lib/env.ts`, `backend/src/lib/logger.ts`, `backend/src/middleware/errorHandler.ts`

### ✅ Session 2 — Claude Doubt Solver API (DONE)
1. ~~Build `claude.ts` service with the system prompt template~~
2. ~~Create `/api/doubt/solve` endpoint (text input first)~~
3. ~~Add weakness tagging (post-response background job)~~
4. ~~Write unit tests for Claude response parsing~~

**Artefacts:** `backend/src/services/claude.ts`, `backend/src/routes/doubt.ts`, unit tests for both

### ✅ Session 3 — Voice Pipeline (DONE)
1. ~~Integrate AWS Transcribe for audio → text~~
2. ~~Integrate AWS Polly for text → audio~~
3. ~~Create `/api/doubt/transcribe` endpoint~~
4. ~~S3 upload/download helpers~~

**Artefacts:** `backend/src/services/speech.ts`, S3 presigned URL helpers, Transcribe + Polly integration

### ✅ Session 4 — Web Frontend App Shell (DONE — React web, not React Native)
> **Note:** Frontend was built as a React web app (`frontend/`) instead of React Native. Mobile (`mobile/`) remains a placeholder. Pivot to web-first was intentional.

1. ~~Auth flow: Phone → OTP → Onboard screens~~
2. ~~Bottom tab navigation (Home, Doubt, Plan, Profile)~~
3. ~~Language selection~~
4. ~~Docker + docker-compose setup~~

**Artefacts:** `frontend/src/pages/` (PhonePage, OtpPage, LoginPage, RegisterPage, OnboardPage, HomePage, DoubtPage, PlanPage, ProfilePage, WhiteboardPage), `frontend/src/components/` (AudioPlayer, MicButton, WeaknessBar, StatCard, PlanItem, WhiteboardCanvas, LanguagePicker), `frontend/src/hooks/` (useAuth, useLanguage, useNetworkStatus, useStorage), `docker-compose.yml`, `backend/Dockerfile`

### ✅ Session 5 — Voice Doubt Solver Screen (DONE)
1. ~~`MicButton` component — mic UI + recording~~
2. ~~Response display with `AudioPlayer`~~
3. ~~Doubt page UI shell built~~

> **Note:** DoubtPage was originally built as a static shell — text input and submit button had no API wiring. Wired up in Session 7.5 below.

**Artefacts:** `frontend/src/components/MicButton.tsx`, `frontend/src/components/AudioPlayer.tsx`, `frontend/src/pages/DoubtPage.tsx`

### ✅ Session 6 — Study Plan (DONE)
1. ~~Plan page with task view~~
2. ~~`PlanItem` component with checkboxes~~
3. ~~Streak tracker~~

**Artefacts:** `frontend/src/pages/PlanPage.tsx`, `frontend/src/components/PlanItem.tsx`

### ✅ Session 7 — Weakness Graph (DONE)
1. ~~Weakness data display after doubts~~
2. ~~`WeaknessBar` component (subject-wise)~~
3. ~~Profile page with weakness summary~~

**Artefacts:** `frontend/src/components/WeaknessBar.tsx`, `frontend/src/pages/ProfilePage.tsx`

### ✅ Session 7.5 — QA, Doubt Solver Wiring & Infra Bugfixes (DONE)

#### QA & Test Coverage
1. ~~Priya wrote test prompt matrix for doubt solver (`docs/doubt-solver-test-prompts.md`) — 10 test cases covering Hindi/English/Tamil, quota limits, vague questions, validation~~
2. ~~Meera executed tests — 48 backend + 98 frontend tests all passing~~
3. ~~New backend test file: `backend/src/routes/doubt.solve.extended.test.ts` (16 tests covering TC-01 through TC-09)~~
4. ~~New frontend test file: `frontend/src/test/pages/DoubtPage.test.tsx` (28 tests covering UI structure, mic toggle, subject chips, text input, language label)~~

#### Doubt Solver — Text Input Wiring (was broken)
5. ~~`DoubtPage.tsx` text input now calls `POST /api/doubt/solve` on Enter key and Submit button click~~
6. ~~Answer renders below input — Claude response text + concept tags + `AudioPlayer`~~
7. ~~Submit button disabled while loading; shows "⏳ Thinking…" during request~~
8. ~~Input cleared after successful response; `toast.error` on API failure~~
9. ~~Response validated with Zod before rendering — `SolveResponseSchema`~~

#### Backend — TTS Graceful Degradation
10. ~~AWS Polly `synthesiseSpeech` failure no longer crashes the request — wrapped in try/catch, returns `audioUrl: null` on failure, logs warning~~
11. ~~Frontend `audioUrl` schema updated to `z.string().nullable()` — `AudioPlayer` only mounts when URL is non-null~~

#### Infrastructure Bugfixes
12. ~~`DATABASE_URL` interpolation was broken — `${POSTGRES_PASSWORD}` in `docker-compose.yml` `environment:` block was resolving to empty string because `env_file:` vars are not available for Compose-level interpolation. Fixed by adding `.env` at project root with `POSTGRES_PASSWORD=callmeVidya123`~~
13. ~~Prisma schema (`email`, `passwordHash` columns) was out of sync with live database — ran `prisma db push` to add missing columns; all User queries now work~~
14. ~~Identified invalid `ANTHROPIC_API_KEY` placeholder in `.env.docker` — requires real key from console.anthropic.com~~

**Known issues:**
- Claude API responses contain markdown (`**`, `---`) rendered as raw text — `react-markdown` not yet added to answer card
- `auth.ts` has TypeScript errors (`email`/`passwordHash` fields) that block `tsc --noEmit` — does not affect runtime
- Redis prompt caching (5. in Key Constraints) not yet implemented

**Artefacts:** `frontend/src/pages/doubt/DoubtPage.tsx` (wired), `backend/src/routes/doubt.ts` (TTS non-fatal), `docs/doubt-solver-test-prompts.md`, `backend/src/routes/doubt.solve.extended.test.ts`, `frontend/src/test/pages/DoubtPage.test.tsx`, `.env` (project root)

### ⬜ Session 8 — Payments (NOT STARTED)
1. Razorpay order creation + UPI deep link
2. Subscription status check middleware
3. Tier upgrade flow in app

### ⬜ Session 9 — React Native Mobile App (NOT STARTED)
> Originally Session 4. Deferred because web frontend was built first. Do this after web MVP is validated.
1. Expo project setup in `mobile/` with file-based routing
2. Auth flow: phone input → OTP → onboarding
3. Bottom tab navigation (Home, Doubt, Plan, Battle, Profile)
4. Port web components to React Native equivalents
5. Language selection persisted in AsyncStorage

### ⬜ Session 10 — Visual Explanation Engine (Phase 3, after MVP validation)
1. Build `WhiteboardCanvas.tsx` SVG renderer supporting circle/rectangle/arrow/text/formula/image_ref/icon element types
2. Pre-build a starter asset library (10-15 common scenes: cricket, vehicles, lab apparatus, coordinate grid)
3. Extend Claude prompt to conditionally return `diagramScript` JSON for Physics/Chemistry/Maths doubts
4. Integrate AWS Polly speech marks for word-level timing
5. Build `useDiagramSync.ts` hook to drive animation off actual audio playback position
6. Add `/api/doubt/solve-visual` endpoint
7. Test sync accuracy across slow/fast network conditions (animation must not drift from audio)

---

## Code Conventions

- **TypeScript strict mode** everywhere
- **Zod** for all API request validation
- **No any types** — define interfaces for all Claude API responses
- **Error handling:** all async routes wrapped in try/catch, errors return `{ error: string, code: string }`
- **Logging:** use Winston, log all Claude API calls with latency
- **Claude responses:** always parse and validate before sending to client — never pass raw Claude output directly
- **Audio files:** delete from S3 after 7 days (lifecycle policy) to control storage costs
- **Hindi text:** use Unicode — never transliterate in DB, always store Devanagari

---

## Key Constraints

1. **Latency target:** Doubt solve end-to-end (voice in → audio out) must be < 8 seconds on 4G
2. **Offline graceful degradation:** Show cached last study plan if no internet
3. **Data privacy:** Never send student name + phone together to Claude API — use userId only
4. **COPPA equivalent:** Students under 13 require parental consent flow (show at onboarding)
5. **Cost control:** Cache Claude responses for identical questions (Redis) — saves ~30% API cost

---

## Testing Checklist Before Each Deploy

- [ ] Voice recording works on Android 10, 11, 12, 13
- [ ] Hindi Devanagari text renders correctly on all screens  
- [ ] Razorpay UPI payment completes end-to-end in test mode
- [ ] Rate limiting kicks in correctly for free tier users
- [ ] WhatsApp message delivered within 2 minutes of schedule time
- [ ] Claude API timeout handled gracefully (show retry button)
- [ ] App works on 3G (throttle in Chrome DevTools mobile emulator)
