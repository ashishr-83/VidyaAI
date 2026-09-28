# Spec: Study Plan — Chapter Deep-Dive Screen

**Status:** Ready to build (depends on RAG pipeline from `spec-rag-pipeline.md`)  
**Surfaces:** Weekly plan → DayDetailModal "Start learning" button → this screen  
**Route:** `/lesson/:chapterId` (reuses existing `/lesson` route, extend it)

---

## 1. Feature Summary

When a student taps **▶ Start learning** on a day's task, they land on a full-screen chapter deep-dive. This is not a summary — it is the complete chapter content in simple English, grounded in the NCERT PDF via RAG, with diagrams where applicable, sample Q&A, and an optional practice test generator at the bottom.

---

## 2. Weekly Plan Gate (PlanPage changes)

### 2a. Disabled state when no plan exists
- Step 2 tab in the stepper must be **non-clickable** when `plan === null`.
- Visual: tab rendered at 40% opacity, cursor `not-allowed`, tooltip on hover: "Generate your plan first".
- Currently the tab is always clickable — this is the bug to fix in `PlanPage.tsx`.

### 2b. Today-only active days in WeekGrid
- In `DayColumn`, add a `locked` prop.
- A day is **locked** when `day.date !== today AND !day.manuallyUnlocked`.
- Locked day: greyed out (opacity 0.45), no click handler, shows a 🔒 icon.
- **"Unlock more days" toggle** — a single chip button above the week grid:
  - Label: `Unlock all days` / `Lock to today`
  - When toggled ON: all days in current week become unlocked (set `manuallyUnlocked = true` on all `DayPlan` objects in local state).
  - This is purely client-side state — no API call. Resets to locked on page reload.
  - Placement: top-right of WeekGrid header row, next to the Export PDF button.

---

## 3. Chapter Deep-Dive Screen

### 3a. Route & Navigation
- Route: `/lesson/:chapterId`  
- Entry point: `DayDetailModal` "Start learning" button → `navigate('/lesson/' + task.chapterId)`
- `task.chapterId` must be added to the `Task` type and populated from the plan's chapter IDs.

### 3b. Screen Layout (top to bottom)

```
┌─────────────────────────────────────────────────────────┐
│  ← Back    [Subject badge]   Chapter 3 · Science        │
│            The World of Metals and Non-Metals           │
│            Estimated: 60 min · Difficulty: Easy         │
├─────────────────────────────────────────────────────────┤
│  📄 Download PDF                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Section tabs: Explanation | Sample Q&A | Practice Test]│
│                                                         │
│  ── EXPLANATION TAB ──────────────────────────────────  │
│                                                         │
│  Section 1: Properties of Metals                       │
│  [AI-generated explanation in simple English]          │
│  [Diagram if applicable]                               │
│                                                         │
│  Section 2: Properties of Non-Metals                   │
│  [AI-generated explanation]                            │
│  [Diagram if applicable]                               │
│                                                         │
│  ... (all concepts from ChapterContent.concepts[])     │
│                                                         │
│  ── SAMPLE Q&A TAB ───────────────────────────────────  │
│  Long Answer (3), Short Answer (4), Fill in Blanks (3) │
│  Each Q shows answer on tap/click (accordion)          │
│                                                         │
│  ── PRACTICE TEST TAB ────────────────────────────────  │
│  [See §3e]                                             │
└─────────────────────────────────────────────────────────┘
```

### 3c. Explanation Tab

**What it is:** Every concept listed in `ChapterContent.concepts[]` explained in simple English (Class 7 reading level), grounded in the chapter PDF via RAG.

**Backend call:** `POST /api/plan/chapters/:id/explain`  
**Generates:** `ExplanationResponse` (see §5 API contracts)

**Claude prompt pattern:**
```
You are a friendly Class 7 Science teacher explaining to a 12-year-old student.
Use the following excerpts from the NCERT textbook as your source:

<context>
{retrieved_chunks}  ← top-20 chunks from RAG retrieval
</context>

Generate a structured explanation of Chapter: "{chapterName}".
Cover every concept in this list: {concepts[]}

For each concept:
1. Give a heading (the concept name)
2. Explain in 3–5 simple English sentences. No jargon. Use everyday Indian examples.
3. If this concept involves a physical process, chemical reaction, or geometry,
   return a diagramScript JSON (same schema as Visual Explanation Engine in CLAUDE.md).
   Otherwise omit diagramScript.

Return JSON:
{
  "sections": [
    {
      "heading": "Properties of Metals",
      "explanation": "...",
      "diagramScript": { ... } | null
    }
  ]
}
```

**Frontend rendering:**
- Each section rendered as a card with heading + explanation text.
- If `diagramScript` is non-null, render `WhiteboardCanvas` (already exists at `frontend/src/components/WhiteboardCanvas.tsx`) below the text — static, no audio sync needed here.
- Lazy-load: fetch explanation only when Explanation tab is first opened. Show skeleton cards while loading.
- Cache result in component state — don't re-fetch on tab switch.

### 3d. Sample Q&A Tab

**Backend call:** `POST /api/plan/chapters/:id/qa`  
**Returns:** `QAResponse` with 10 questions: 3 long-answer, 4 short-answer, 3 fill-in-the-blanks.

**Claude prompt pattern:**
```
Based on the following NCERT chapter excerpts:
<context>{retrieved_chunks}</context>

Generate 10 exam-style questions for Chapter: "{chapterName}" (Class 7 CBSE).

Return JSON:
{
  "questions": [
    {
      "type": "long" | "short" | "fill",
      "question": "...",
      "answer": "...",
      "marks": 5 | 2 | 1
    }
  ]
}

Distribution: 3 long (5 marks each), 4 short (2 marks each), 3 fill-in-the-blanks (1 mark each).
Base all questions strictly on the provided context. No questions from outside the chapter.
```

**Frontend rendering:**
- Questions in an accordion list — question visible, answer hidden behind "Show Answer" toggle.
- Type badge on each question: `Long Answer · 5 marks`, `Short Answer · 2 marks`, `Fill in the blank · 1 mark`.

### 3e. Practice Test Tab

**Entry state:** Shows a CTA card:
```
┌────────────────────────────────────┐
│  📝 Generate Practice Test         │
│  30-mark exam paper • ~40 min      │
│  MCQ + Short + Long + Fill blanks  │
│                                    │
│  [Generate Test]                   │
└────────────────────────────────────┘
```

On click: calls `POST /api/plan/chapters/:id/practice-test`

**Returns:** `PracticeTestResponse` — a 30-mark paper:

| Section | Type | Count | Marks each | Total |
|---------|------|-------|------------|-------|
| A | MCQ (4 options) | 5 | 1 | 5 |
| B | Fill in the blanks | 5 | 1 | 5 |
| C | Short answer | 5 | 2 | 10 |
| D | Long answer | 2 | 5 | 10 |
| **Total** | | | | **30** |

**Frontend rendering after generation:**
- Display as a proper exam paper with section headers.
- Each question has a "Show Answer" button — hidden by default (student attempts first).
- "Download as PDF" button (browser `window.print()` on a print-styled div — no server-side PDF needed).

---

## 4. PDF Download

The "📄 Download PDF" button in ChapterPicker currently uses a hardcoded local path. It must:

1. Call `GET /api/plan/chapters/:id/pdf-url` (returns a pre-signed S3 URL with 1-hour expiry).
2. Open the URL in a new tab (`window.open(url, '_blank')`).
3. Show a loading spinner on the button while the URL is being fetched.
4. Show `toast.error('PDF not available yet')` if the endpoint returns 404 (i.e., `pdfS3Key` is null).

Same button must also appear at the top of the deep-dive screen.

---

## 5. API Contracts

### GET /api/plan/chapters/:id/pdf-url
**Auth:** Required  
**Response 200:**
```json
{ "url": "https://s3.amazonaws.com/...", "expiresIn": 3600 }
```
**Response 404:** `{ "error": "PDF not available", "code": "PDF_NOT_FOUND" }`

---

### POST /api/plan/chapters/:id/explain
**Auth:** Required  
**Request body:** `{}` (no body — chapter ID in path is enough)  
**Response 200:**
```json
{
  "chapterId": "uuid",
  "chapterName": "The World of Metals and Non-Metals",
  "sections": [
    {
      "heading": "Properties of Metals",
      "explanation": "Metals are shiny materials...",
      "diagramScript": null
    },
    {
      "heading": "Reactivity Series",
      "explanation": "Some metals are more reactive...",
      "diagramScript": { "diagramType": "chemistry_reaction", "steps": [...] }
    }
  ]
}
```
**Response 404:** Chapter not found  
**Response 503:** `{ "error": "Chapter PDF not ingested yet", "code": "RAG_NOT_READY" }`

**Caching:** Cache response in Redis with key `explain:{chapterId}`, TTL 24 hours. Invalidate when chapter PDF is re-ingested.

---

### POST /api/plan/chapters/:id/qa
**Auth:** Required  
**Request body:** `{}`  
**Response 200:**
```json
{
  "chapterId": "uuid",
  "questions": [
    { "type": "long", "question": "...", "answer": "...", "marks": 5 },
    { "type": "short", "question": "...", "answer": "...", "marks": 2 },
    { "type": "fill", "question": "The hardest natural substance is ___.", "answer": "Diamond", "marks": 1 }
  ]
}
```
**Caching:** Redis key `qa:{chapterId}`, TTL 24 hours.

---

### POST /api/plan/chapters/:id/practice-test
**Auth:** Required  
**Request body:** `{}`  
**Response 200:**
```json
{
  "chapterId": "uuid",
  "totalMarks": 30,
  "sections": [
    {
      "label": "Section A — Multiple Choice Questions",
      "type": "mcq",
      "questions": [
        {
          "question": "Which of the following is a metal?",
          "options": ["Sulphur", "Iron", "Carbon", "Oxygen"],
          "answer": "Iron",
          "marks": 1
        }
      ]
    },
    {
      "label": "Section B — Fill in the Blanks",
      "type": "fill",
      "questions": [
        { "question": "Metals are ___ conductors of electricity.", "answer": "good", "marks": 1 }
      ]
    },
    {
      "label": "Section C — Short Answer",
      "type": "short",
      "questions": [
        { "question": "Name two properties of non-metals.", "answer": "...", "marks": 2 }
      ]
    },
    {
      "label": "Section D — Long Answer",
      "type": "long",
      "questions": [
        { "question": "Explain the reactivity series with examples.", "answer": "...", "marks": 5 }
      ]
    }
  ]
}
```
**Not cached** — each generation produces a fresh paper (prevents memorisation).

---

## 6. Frontend Components Required

| Component | File | Status |
|-----------|------|--------|
| Deep-dive screen (tabs shell) | `frontend/src/pages/lesson/LessonPage.tsx` | Extend existing |
| ExplanationPanel | `frontend/src/components/plan/ExplanationPanel.tsx` | New |
| QAAccordion | `frontend/src/components/plan/QAAccordion.tsx` | New |
| PracticeTestPanel | `frontend/src/components/plan/PracticeTestPanel.tsx` | New |
| WeekGrid (locked days) | `frontend/src/components/plan/WeekGrid.tsx` | Modify |
| DayColumn (locked prop) | `frontend/src/components/plan/DayColumn.tsx` | Modify |
| ChapterPicker (PDF button fix) | `frontend/src/components/plan/ChapterPicker.tsx` | Modify |
| PlanPage (step 2 gate) | `frontend/src/pages/plan/PlanPage.tsx` | Modify |

---

## 7. Backend Files Required

| File | Status |
|------|--------|
| `backend/src/routes/plan.ts` — add 4 new endpoints | Modify |
| `backend/src/services/rag.ts` — retrieval service | New |
| `backend/src/workers/ingestChapter.ts` — ingestion worker | New |
| `backend/src/services/claude.ts` — add `explainChapter`, `generateQA`, `generatePracticeTest` functions | Modify |
| `backend/prisma/schema.prisma` — add `ChapterChunk` model | Modify |

---

## 8. Build Sequence

Build in this exact order — each step is independently testable:

1. **Schema + migration** — add `ChapterChunk`, enable pgvector, run migration.
2. **Ingestion worker** — ingest one test chapter, verify chunks in DB.
3. **Retrieval service** — unit test: retrieve top-8 chunks for a known query.
4. **`/explain` endpoint** — hardcode one chapter, verify Claude returns valid `sections[]` JSON.
5. **ExplanationPanel frontend** — render sections + diagrams. No Q&A yet.
6. **`/qa` endpoint + QAAccordion** — add sample Q&A tab.
7. **`/practice-test` endpoint + PracticeTestPanel** — add practice test tab.
8. **PDF download** — wire PDF button to `/pdf-url` endpoint.
9. **WeekGrid locked days + PlanPage gate** — gate Step 2 and lock non-today days.

---

## 9. Acceptance Criteria

### Weekly plan gate
- [ ] Step 2 tab is non-clickable and visually disabled when `plan === null`
- [ ] Non-today days in WeekGrid are locked (greyed, no click) by default
- [ ] "Unlock all days" toggle unlocks all days in current week
- [ ] Unlock state resets on page reload

### Chapter deep-dive
- [ ] "Start learning" navigates to `/lesson/:chapterId`
- [ ] Explanation tab loads sections for all concepts in `ChapterContent.concepts[]`
- [ ] Diagram renders via `WhiteboardCanvas` when `diagramScript` is non-null
- [ ] Q&A tab shows 10 questions in correct type distribution
- [ ] Answers are hidden by default, revealed on "Show Answer" click
- [ ] Practice test shows 30-mark paper in 4 sections with correct mark totals
- [ ] "Show Answer" hidden by default on each practice test question
- [ ] PDF button fetches pre-signed URL and opens in new tab
- [ ] PDF button shows toast error when `pdfS3Key` is null
- [ ] All three endpoints return `RAG_NOT_READY` (503) if chapter has no chunks ingested
- [ ] Explanation and Q&A responses are cached — second call returns in < 200ms
