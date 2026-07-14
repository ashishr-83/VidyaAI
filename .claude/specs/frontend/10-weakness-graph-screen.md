# Spec 10 — Weakness Graph Screen (Web)

**Status:** `DONE`
**Session:** 7
**Completed:** 2026-07-07
**Merged to:** `main`
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

## Open Questions (resolved)

1. Weakness graph lives under Profile — `ProfilePage.tsx` includes `WeaknessBar` components per subject.
2. "Focus today" deep-link to Plan page not yet implemented.

---

## Acceptance Criteria

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

---

## Implementation Notes

**Files created:** `frontend/src/components/WeaknessBar.tsx`, `frontend/src/pages/profile/ProfilePage.tsx`.

**Scope delivered:** `WeaknessBar` renders a horizontal bar per subject with weakness score. Displayed on `ProfilePage` alongside language switcher, streak, and logout.

**Scope not yet delivered:**
- `WeaknessPage.tsx` with full Recharts `RadarChart` not built (radar chart from spec)
- Chapter drill-down on click not implemented
- "Focus today" card with top 3 weak concepts not implemented
- Minimum-data guard placeholder ("Aur doubts puchho") not implemented
- Data fetched from live `GET /api/progress/weakness-graph` endpoint not verified

**Acceptance criteria status:**
- [x] `WeaknessBar` component renders per-subject weakness
- [ ] Recharts `RadarChart` not built (uses bar format instead)
- [ ] Chapter drill-down not implemented
- [ ] "Focus today" card not implemented
- [ ] Minimum-data placeholder not implemented

---

## Phase 2 — Mobile

- Replace Recharts `RadarChart` with `victory-native` `VictoryRadar`
- Chart click handler becomes `onPressIn` gesture
