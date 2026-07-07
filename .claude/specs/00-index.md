# VidyaAI — Spec Index

Spec-driven development: each session works from a spec. Specs are the source of truth.
PRs must reference the spec they implement.

## Deployment Strategy

**Phase 1 (current):** Web app deployed on AWS — accessible via browser at `vidyaai.in`.
**Phase 2:** React Native mobile app built from the same frontend codebase (Expo).
All frontend specs target the **web browser first**. Mobile-specific adjustments are noted within each spec under a "Mobile Phase 2" section.

## Status Legend
- `DONE` — implemented, tested, merged
- `IN PROGRESS` — active session
- `READY` — spec written, implementation not started
- `DRAFT` — spec being written, not yet ready to build

---

## Infrastructure

| # | Spec | Status |
|---|------|--------|
| 00 | [AWS Deployment](infrastructure/00-aws-deployment.md) | `READY` |

## Backend Specs

| # | Spec | Session | Status |
|---|------|---------|--------|
| 01 | [Backend Foundation](backend/01-backend-foundation.md) | Session 1 | `DONE` |
| 02 | [Claude Doubt Solver API](backend/02-doubt-solver.md) | Session 2 | `READY` |
| 03 | [Voice Pipeline](backend/03-voice-pipeline.md) | Session 3 | `READY` |
| 04 | [Study Plan API](backend/04-study-plan.md) | Session 6 | `READY` |
| 05 | [Progress & Weakness API](backend/05-progress-weakness.md) | Session 7 | `READY` |
| 06 | [Payments API](backend/06-payments.md) | Session 8 | `DRAFT` |

## Frontend Specs (Web-first, then React Native)

| # | Spec | Session | Status |
|---|------|---------|--------|
| 07 | [React Web App Shell](frontend/07-app-shell.md) | Session 4 | `READY` |
| 08 | [Voice Doubt Solver Screen](frontend/08-voice-doubt-screen.md) | Session 5 | `READY` |
| 09 | [Study Plan Screen](frontend/09-study-plan-screen.md) | Session 6 | `READY` |
| 10 | [Weakness Graph Screen](frontend/10-weakness-graph-screen.md) | Session 7 | `DRAFT` |
| 11 | [Payments & Subscription Flow](frontend/11-payments-screen.md) | Session 8 | `DRAFT` |

## Features (Post-MVP)

| # | Spec | Session | Status |
|---|------|---------|--------|
| 12 | [Visual Explanation Engine](features/12-visual-engine.md) | Session 9 | `DRAFT` |

---

## Conventions

- Each spec has: **Goal**, **Scope** (in/out), **API contract**, **Acceptance criteria**, **Dependencies**
- Acceptance criteria must be verifiable — no vague requirements
- Any scope change requires updating the spec before coding starts
- Web deployment is the gate for every frontend spec — the feature must work in Chrome before it ships
