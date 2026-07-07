# Spec 04 — Study Plan API

**Status:** `READY`
**Session:** 6
**Depends on:** Spec 02 (Claude service), Spec 05 (weakness data)

---

## Goal

Generate and serve a personalised 7-day study plan for each student using Claude, weighted by exam date proximity and weakness scores. Include WhatsApp morning reminders via Twilio.

---

## Scope

### In
- `backend/src/services/whatsapp.ts` — Twilio WhatsApp wrapper
- `backend/src/routes/plan.ts` — `/api/plan` route group
- Endpoints: `GET /today`, `POST /complete-task`, `GET /week`, `POST /regenerate`
- Plan generation via Claude on onboarding completion (triggered after `/api/auth/onboard`)
- Daily morning WhatsApp reminder (scheduled via `node-cron`)
- Streak tracking on `StudyPlan.currentStreak`

### Out
- Push notifications via Firebase (add in a later polish session)
- Plan gamification / badges
- Offline plan caching (handled mobile-side)

---

## API Contract

### `GET /api/plan/today`
Requires auth.

**Response 200:**
```json
{
  "date": "2026-07-03",
  "tasks": [
    { "id": "task-1", "subject": "Physics", "topic": "Thermodynamics", "duration": 45, "type": "learn", "done": false },
    { "id": "task-2", "subject": "Chemistry", "topic": "Organic revision", "duration": 30, "type": "revise", "done": true },
    { "id": "task-3", "subject": "Physics", "mcqs": 20, "duration": 20, "type": "practice", "done": false }
  ],
  "totalMinutes": 95,
  "streak": 4,
  "planId": "<uuid>"
}
```

**Errors:**
- `404 NO_PLAN` — user hasn't onboarded yet or plan not generated

---

### `POST /api/plan/complete-task`
Requires auth.

**Request:**
```json
{ "planId": "<uuid>", "taskId": "task-1" }
```

**Response 200:**
```json
{ "ok": true, "streak": 5, "allTasksDone": false }
```

- Marks task done in `planData` JSON
- If all tasks for today are done, increments `currentStreak`

---

### `GET /api/plan/week`
Requires auth.

**Response 200:**
```json
{
  "week": [
    {
      "day": "Thursday", "date": "2026-07-03",
      "tasks": [...],
      "totalMinutes": 95,
      "isToday": true
    }
  ]
}
```

---

### `POST /api/plan/regenerate`
Requires auth.

Triggers a new plan generation (e.g., after exam date changes). Rate-limited to once per 24h per user.

**Response 200:**
```json
{ "ok": true, "message": "New plan will be ready in a few seconds" }
```

Plan generation is async — client polls `GET /today` until the new plan appears.

---

## Plan Generation (Claude)

Called after `POST /api/auth/onboard` and `POST /api/plan/regenerate`.

**Inputs assembled before calling Claude:**
- User: `class`, `board`, `examDate`, `studyHoursPerDay`, `language`
- Weakness data: top 5 weak concepts per subject from `WeaknessMap`
- Days left until exam

**Claude prompt:**
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
      "day": "Monday", "date": "2026-07-06",
      "tasks": [
        { "id": "task-1", "subject": "Physics", "topic": "Thermodynamics", "duration": 45, "type": "learn" },
        { "id": "task-2", "subject": "Chemistry", "topic": "Organic revision", "duration": 30, "type": "revise" },
        { "id": "task-3", "subject": "Physics", "mcqs": 20, "duration": 20, "type": "practice" }
      ],
      "totalMinutes": 95
    }
  ]
}

Rules:
- Prioritise weak subjects
- Include spaced repetition for previously covered topics
- Never exceed {HOURS * 60} minutes per day
- task.id must be unique across all days (use "day-N-task-M" format)
```

**Validation:** Parse and validate Claude JSON before saving — reject if schema invalid and retry once.

---

## WhatsApp Reminder

`node-cron` job runs at 7:00 AM IST every day:
1. Fetch all users with `StudyPlan` and `notificationEnabled` (add field to `StudyPlan`)
2. Get today's tasks for each user
3. Send WhatsApp via Twilio:

```
🌅 Subah ki padhai ka time!

Aaj ka plan:
• Physics — Thermodynamics (45 min)
• Chemistry — Organic revision (30 min)
• 20 MCQs Physics

📚 App kholo aur shuru karo: https://vidyaai.in
```

---

## `whatsapp.ts` Service

```typescript
export async function sendStudyReminder(params: {
  phone: string;        // E.164 format: +91...
  tasks: PlanTask[];
  language: string;
}): Promise<void>

export async function sendBudgetAlert(params: {
  phone: string;
  message: string;
}): Promise<void>
```

---

## Acceptance Criteria

- [ ] `GET /plan/today` returns tasks on the first call after onboarding
- [ ] `POST /plan/complete-task` toggles `done: true` and is reflected in next `GET /today`
- [ ] Completing all tasks for today increments streak by 1
- [ ] `POST /plan/regenerate` called twice within 24h returns `429`
- [ ] WhatsApp message sent to test number by 7:05 AM IST (cron tolerance)
- [ ] Claude plan JSON with missing `task.id` is rejected and retried
- [ ] Plan respects `studyHoursPerDay`: no day exceeds that many minutes

---

## Dependencies

- Spec 02 (Claude service)
- Spec 05 (WeaknessMap data for plan weighting)
- `twilio` npm package
- `node-cron` npm package
- Env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
