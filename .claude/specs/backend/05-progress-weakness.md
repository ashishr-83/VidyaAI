# Spec 05 — Progress & Weakness API

**Status:** `READY`
**Session:** 7
**Depends on:** Spec 02 (weakness tagging writes WeaknessMap)

---

## Goal

Expose the accumulated weakness data and study session history so the mobile app can render a subject-wise radar chart and streak summary. Also provide a manual session logging endpoint.

---

## Scope

### In
- `backend/src/routes/progress.ts`
- Endpoints: `GET /weakness-graph`, `GET /streak`, `POST /log-session`
- Aggregate weakness data by subject for radar chart
- "Focus today" recommendation: top 3 most-weak concepts

### Out
- Admin-level reports across all users
- Export to CSV (not needed for MVP)

---

## API Contract

### `GET /api/progress/weakness-graph`
Requires auth.

**Response 200:**
```json
{
  "subjects": [
    {
      "subject": "Physics",
      "overallScore": 0.72,
      "chapters": [
        { "chapter": "Laws of Motion", "score": 0.85, "concepts": ["Newton's Third Law"] },
        { "chapter": "Thermodynamics", "score": 0.40, "concepts": ["Carnot Cycle", "Entropy"] }
      ]
    },
    {
      "subject": "Chemistry",
      "overallScore": 0.45,
      "chapters": [...]
    }
  ],
  "focusToday": [
    { "subject": "Chemistry", "chapter": "Organic", "concept": "SN2 Reactions", "score": 0.92 },
    { "subject": "Physics", "chapter": "Thermodynamics", "concept": "Entropy", "score": 0.88 }
  ]
}
```

`overallScore` = mean of `weaknessScore` across all concepts in that subject. Higher = weaker.

**`focusToday`**: top 3 concepts by `weaknessScore` across all subjects, minimum 2 attempts.

---

### `GET /api/progress/streak`
Requires auth.

**Response 200:**
```json
{
  "currentStreak": 4,
  "longestStreak": 12,
  "lastStudyDate": "2026-07-02",
  "totalSessionsThisMonth": 18,
  "totalMinutesThisMonth": 1440
}
```

`longestStreak` — store on `StudyPlan` model (add field in migration).

---

### `POST /api/progress/log-session`
Requires auth. For manually logging offline study.

**Request:**
```json
{
  "subject": "Mathematics",
  "durationMinutes": 60,
  "topicsCovered": ["Integration", "Differentiation"],
  "date": "2026-07-03"
}
```

**Validation:**
- `durationMinutes`: int, 1–600
- `topicsCovered`: array of strings, max 10 items
- `date`: ISO date string, cannot be in the future

**Response 200:**
```json
{ "sessionId": "<uuid>", "ok": true }
```

---

## Streak Calculation Logic

On each `POST /plan/complete-task` (all tasks done) or `POST /progress/log-session`:
1. Check if `lastStudyDate` is yesterday → increment streak
2. If `lastStudyDate` is today → no change (already counted)
3. If gap > 1 day → reset streak to 1
4. Update `longestStreak` if `currentStreak > longestStreak`

---

## Acceptance Criteria

- [ ] `GET /weakness-graph` returns data after at least 2 doubts have been solved
- [ ] `focusToday` never includes concepts with fewer than 2 attempts
- [ ] `overallScore` correctly aggregates chapter-level scores (spot check: 2 chapters at 0.4 and 0.8 = 0.6)
- [ ] `GET /streak` correctly resets to 1 after a 2-day gap in sessions
- [ ] `POST /log-session` with a future date returns `400`
- [ ] `POST /log-session` with `durationMinutes: 0` returns `400`

---

## Dependencies

- Spec 01 (Prisma, auth)
- Spec 02 (WeaknessMap populated by doubt solver)
- Prisma migration: add `longestStreak Int @default(0)` and `lastStudyDate DateTime?` to `StudyPlan`
