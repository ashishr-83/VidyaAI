# Spec 12 — Visual Explanation Engine (Phase 3)

**Status:** `DRAFT`
**Session:** 9
**Depends on:** Spec 02 (Claude service), Spec 03 (voice pipeline + speech marks), Spec 08 (doubt screen)

---

## Goal

While Claude's audio explanation plays in the browser, the screen shows an animated whiteboard diagram that builds up in sync with the narration — like a teacher drawing on a board, generated live per doubt.

**Build only after MVP (Specs 01–11) is live on AWS and validated with real daily users.**

---

## Scope

### In
- `frontend/src/components/WhiteboardCanvas.tsx` — SVG renderer + step animator (web, using inline SVG)
- `frontend/src/hooks/useDiagramSync.ts` — links `<audio>` playback position to active diagram step
- Extend `backend/src/services/speech.ts` to return Polly speech marks alongside audio
- New endpoint: `POST /api/doubt/solve-visual`
- Starter asset library (10–15 SVG scenes, pre-built)
- Claude prompt extension for `diagramScript` JSON

### Out
- LaTeX formula rendering (use `<text>` SVG element with plain text for Phase 3; KaTeX for Phase 4)
- Chemistry molecular structures (too complex for v1)

---

## Web Implementation Notes

On web, diagrams render as inline SVG animated with CSS transitions and JS timing:
- No external renderer needed — browser SVG is first-class
- `useDiagramSync` polls `audioElement.currentTime` via `requestAnimationFrame`
- Each step triggers when `currentTime * 1000 >= step.triggerAtMs`

```typescript
// useDiagramSync.ts
useEffect(() => {
  let rafId: number;
  const tick = () => {
    if (!audioRef.current) return;
    const posMs = audioRef.current.currentTime * 1000;
    const activeStep = steps.findLast(s => posMs >= s.triggerAtMs);
    setActiveStepId(activeStep?.stepId ?? null);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}, [steps]);
```

---

## Diagram JSON Schema (Claude output)

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
        { "type": "arrow", "id": "v", "from": [95, 150], "to": [180, 150], "color": "#3949AB", "label": "v" }
      ],
      "narrationSnippet": "Momentum kisi object ki motion ka quantity hai"
    }
  ],
  "finalState": {
    "summaryFormula": "Impulse = Change in Momentum",
    "highlightElements": ["ball"]
  }
}
```

**Supported element types (v1):** `circle`, `rectangle`, `arrow`, `text`, `formula`, `image_ref`, `icon`

---

## New API Endpoint

### `POST /api/doubt/solve-visual`
Same request as `POST /api/doubt/solve`. Returns:
```json
{
  "doubtId": "...",
  "answer": "...",
  "audioUrl": "...",
  "diagramScript": { ... },
  "speechMarks": [
    { "time": 0, "type": "sentence", "start": 0, "end": 45, "value": "Momentum kisi..." }
  ]
}
```
`diagramScript` is `null` for non-visual subjects (History, Civics, definitions).

---

## Acceptance Criteria (draft)

- [ ] Physics diagram renders in browser in sync with audio (drift < 300ms on standard broadband)
- [ ] Pausing `<audio>` pauses diagram animation; scrubbing seeks diagram to correct step
- [ ] History/Civics subject: `diagramScript` is `null`; doubt page shows audio + text only (no canvas)
- [ ] Unknown `image_ref` asset (not in approved list) causes Claude to omit that element — no render error
- [ ] Canvas is responsive: fills container width while preserving `canvasSize` aspect ratio
- [ ] Old browser without `requestAnimationFrame` degrades gracefully (diagram shows final state static)

---

## Dependencies

- All of Specs 01–11 in production and validated
- Polly speech marks enabled (same AWS Polly call, `SpeechMarkTypes: ["sentence"]`)
- Inline SVG (native browser support — no extra package)

## Phase 2 — Mobile

- Replace inline SVG with `react-native-svg`
- Replace `requestAnimationFrame` + `audio.currentTime` with `expo-av` `onPlaybackStatusUpdate`
- `useDiagramSync` hook swaps the audio source; canvas rendering logic stays the same
