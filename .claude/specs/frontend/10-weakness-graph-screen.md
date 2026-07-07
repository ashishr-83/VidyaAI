# Spec 10 — Weakness Graph Screen (Web)

**Status:** `DRAFT`
**Session:** 7
**Depends on:** Spec 07 (web app shell), Spec 05 (progress API)

---

## Goal

Show the student a subject-wise radar chart of their weak concepts in the browser, and surface 3 focus topics for today.

---

## Scope

### In
- `frontend/src/pages/profile/WeaknessPage.tsx`
- Radar chart (subject axes)
- Chapter drill-down on click
- "Focus today" card with top 3 weak concepts
- Minimum-data guard: placeholder if < 5 doubts solved

### Out
- Session-level detail view
- CSV export

---

## Web Chart Library

Use **Recharts** `RadarChart` — already React-native-friendly for later migration to `victory-native`. Avoid Chart.js (canvas-based, harder to port to RN).

---

## Open Questions (resolve before build)

1. Does the weakness graph live under Profile or get its own nav item?
2. Should "Focus today" deep-link to the Plan page and highlight relevant tasks?

---

## Acceptance Criteria (draft)

- [ ] Radar chart renders after ≥5 doubts are solved
- [ ] Clicking a subject axis shows chapter breakdown below the chart
- [ ] "Focus today" card shows 3 concepts with `weaknessScore > 0` and `attemptCount >= 2`
- [ ] < 5 doubts: placeholder "Aur doubts puchho — graph ban jayega!"
- [ ] Recharts radar chart is responsive (fills container width)

---

## Dependencies

- Spec 07 (web app shell)
- Spec 05 (`GET /api/progress/weakness-graph`, `GET /api/progress/streak`)
- `recharts` npm package

## Phase 2 — Mobile

- Replace Recharts `RadarChart` with `victory-native` `VictoryRadar`
- Chart click handler becomes `onPressIn` gesture
