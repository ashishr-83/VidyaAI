# Spec 09 — Study Plan Screen (Web)

**Status:** `READY`
**Session:** 6
**Depends on:** Spec 07 (web app shell), Spec 04 (plan API)

---

## Goal

Show the student their personalised daily plan in the browser with checkboxes, a week-view strip, and a streak counter. Deployed to AWS and accessible without a mobile app.

---

## Scope

### In
- `frontend/src/pages/plan/PlanPage.tsx`
- `frontend/src/hooks/useStudyPlan.ts`
- Today's tasks with checkboxes
- Horizontal week-strip (7 days)
- Streak display
- Pull-to-refresh (manual refresh button on web)
- Optimistic task completion

### Out
- WhatsApp reminder toggle (shown as disabled "coming soon" UI)
- Plan regeneration UI (later session)

---

## Page Layout

```
┌──────────────────────────────────────────────────────┐
│  🔥 4 din ki streak!                                  │
│  [Mo] [Tu] [We] [Th✓] [Fr] [Sa] [Su]                │
│                                                      │
│  Aaj ka plan — Guruwar, 3 July                       │
│  95 minutes total          [🔄 Refresh]              │
│                                                      │
│  ☐  Physics — Thermodynamics          45 min  Learn  │
│  ☑  Chemistry — Organic revision      30 min  Revise │
│  ☐  Physics MCQs (20 questions)       20 min  Practice│
│                                                      │
│  ── Kal ka plan ──────────────────────── (collapsed) │
└──────────────────────────────────────────────────────┘
```

---

## `useStudyPlan.ts`

```typescript
interface UseStudyPlanReturn {
  todayTasks: PlanTask[];
  weekPlan: DayPlan[];
  streak: number;
  loading: boolean;
  completeTask: (taskId: string) => Promise<void>;
  refresh: () => Promise<void>;
}
```

Optimistic update: mark done immediately in local state, call `POST /plan/complete-task`, revert on error.

---

## Acceptance Criteria

- [ ] Plan page shows today's tasks on first open after onboarding
- [ ] Checking a task marks it done (one-way, no uncheck)
- [ ] Completing all tasks shows a celebration message ("Sab tasks complete! 🎉")
- [ ] Streak increments after all tasks done (reflected on next refresh)
- [ ] Week strip shows past day completion status (green tick)
- [ ] Refresh button fetches latest plan from API
- [ ] No plan yet (still generating): skeleton loader shown, auto-retries every 3s

---

## Dependencies

- Spec 07 (web app shell)
- Spec 04 (`GET /plan/today`, `POST /plan/complete-task`, `GET /plan/week`)

## Phase 2 — Mobile

- Replace refresh button with pull-to-refresh gesture (`FlatList` `onRefresh`)
- Week strip becomes a `ScrollView` horizontal strip
- Celebration: use `react-native-confetti-cannon` instead of CSS animation
