# Spec 08 — Voice Doubt Solver Screen (Web)

**Status:** `DONE`
**Session:** 5
**Completed:** 2026-07-07 (text input); Session 7.5 wiring completed 2026-07-14
**Merged to:** `main`
**Depends on:** Spec 07 (web app shell), Spec 02 (solve API), Spec 03 (voice pipeline)

---

## Goal

The core user-facing feature: student clicks mic in the browser, speaks their doubt, sees and hears the AI answer. Uses the browser MediaRecorder API for recording; Polly TTS for audio playback.

---

## Scope

### In
- `frontend/src/pages/doubt/DoubtPage.tsx` — full doubt page
- `frontend/src/components/VoiceRecorder.tsx` — mic button + recording state UI
- `frontend/src/hooks/useDoubtSolver.ts` — orchestrates upload → transcribe → solve → playback
- HTML5 Audio for Polly TTS playback
- Subject selector dropdown
- Helpful / Not helpful feedback buttons
- Doubt history list (paginated)
- Free-tier quota indicator
- Graceful fallback: if `MediaRecorder` unavailable (old browser), show a text input instead

### Out
- Animated whiteboard diagram (Spec 12)
- Text-only input as primary (it's a fallback only here)

---

## Browser APIs Used

| Need | Web API | Mobile Phase 2 replacement |
|------|---------|---------------------------|
| Microphone access | `navigator.mediaDevices.getUserMedia` | `expo-av` Audio recording |
| Audio recording | `MediaRecorder` (outputs `audio/webm;codecs=opus`) | `expo-av` |
| Audio playback | `new Audio(url)` / `<audio>` element | `expo-av` |
| Permission check | `navigator.permissions.query({ name: 'microphone' })` | `expo-av` permissions |

---

## Component Breakdown

### `VoiceRecorder.tsx`

Props:
```typescript
interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, mimeType: string) => void;
  disabled: boolean;
}
```

Internal states:
- **idle** — mic icon, large circular button, "Apna doubt yahan puchho"
- **permission-denied** — lock icon, "Microphone access do — browser settings mein jaao"
- **recording** — animated pulse ring, red dot, "Bol raha hoon..." label, click to stop
- **processing** — spinner, "Sooch raha hoon..."

Implementation:
```typescript
// Start recording
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
const chunks: BlobPart[] = [];
recorder.ondataavailable = (e) => chunks.push(e.data);
recorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
  onRecordingComplete(blob, 'audio/webm');
  stream.getTracks().forEach(t => t.stop()); // release mic
};
recorder.start();
```

### `useDoubtSolver.ts`

```typescript
interface UseDoubtSolverReturn {
  state: 'idle' | 'uploading' | 'transcribing' | 'solving' | 'playing' | 'done' | 'error';
  errorMessage: string | null;
  transcribedText: string | null;
  answer: string | null;
  doubtId: string | null;
  submitFeedback: (wasHelpful: boolean) => Promise<void>;
  reset: () => void;
  solveByVoice: (blob: Blob, mimeType: string, subject: string) => Promise<void>;
}
```

Flow inside `solveByVoice`:
1. `GET /api/doubt/upload-url?contentType=audio/webm` → presigned S3 URL
2. `PUT blob` to presigned URL via `fetch` (no auth header — S3 presigned handles it)
3. `POST /api/doubt/transcribe` `{ s3Key, language }` → transcribed text
4. `POST /api/doubt/solve` `{ text, subject, language }` → `{ answer, audioUrl, doubtId }`
5. `new Audio(audioUrl).play()` — plays Polly MP3

---

## Page Layout

```
┌──────────────────────────────────────────────────────┐
│  Subject: [Physics ▾]                                │
│                                                      │
│              ●  ← large mic button (80px)            │
│    "Apna doubt yahan puchho"                         │
│                                                      │
│  ── Answer ─────────────────────────────────────────│
│  You asked: "Newton ka teesra niyam kya hota hai?"   │
│                                                      │
│  Newton ka teesra niyam kehta hai ki har action...   │
│                                                      │
│  [▶ Sunna chahte ho?]  [👍 Helpful] [👎 Not helpful] │
│                                                      │
│  ── Pichhle doubts ──────────────────────────────── │
│  Physics · 2 hours ago — "Newton ka teesra..."       │
│  Chemistry · Yesterday — "SN2 reaction kya..."       │
└──────────────────────────────────────────────────────┘
```

---

## Quota Display

Below mic button when on free tier:
```
🎤 3/3 voice doubts used today · Resets at midnight IST
```

- Derived from `GET /api/doubt/history` count
- If quota full: mic button disabled + "Plus plan lo — unlimited doubts" CTA

---

## Text Fallback

If `!window.MediaRecorder` or permission permanently denied:
- Show a `<textarea>` with submit button instead of mic
- Same `POST /api/doubt/solve` endpoint with `{ text }` instead of audio
- Label: "Voice nahi chal raha — yahan type karo"

---

## Error States

| Trigger | UI message |
|---------|-----------|
| Mic permission denied | "Microphone ka permission do — browser ke address bar mein click karo" |
| S3 upload fails | "Upload fail hua — internet check karo aur dobara try karo" |
| Transcription fails | "Awaaz clear nahi aai — dobara try karo" |
| Claude timeout | "Thoda busy hoon — [Retry] button" |
| Free tier quota hit | "Aaj ke 3 doubts khatam — kal subah reset hoga" |

All errors: keep previous answer visible; don't blank the page.

---

## Acceptance Criteria

- [ ] Chrome (latest): click mic → browser asks for mic permission → recording starts
- [ ] Recording indicator (red dot + pulse) visible during recording
- [ ] Stop recording → spinner → answer appears within 8 seconds on a standard connection
- [ ] Polly audio plays automatically after answer appears
- [ ] "👍 Helpful" click calls `POST /feedback`; button stays highlighted
- [ ] History list shows last 10 doubts; paginated "Load more" button works
- [ ] Free tier user with 3 voice doubts today: mic button disabled, quota message visible
- [ ] Old browser without `MediaRecorder`: text input shown instead of mic, still functional
- [ ] Mic permission denied: clear instruction message (not a blank mic button)
- [ ] Network error during S3 upload: error toast shown, state resets to idle
- [ ] Hindi answer text renders correctly in Chrome/Firefox/Safari

---

## Dependencies

- Spec 07 (web app shell, auth, Axios instance)
- Spec 02 (`POST /doubt/solve`, `POST /doubt/feedback`, `GET /doubt/history`)
- Spec 03 (`GET /doubt/upload-url`, `POST /doubt/transcribe`)
- CORS config on S3 bucket to allow `PUT` from `vidyaai.in`

## Implementation Notes (Session 5 + 7.5)

**Scope divergence from spec:** The page was initially built as a static shell (Session 5). In Session 7.5 the text input path was fully wired to the API. The voice recording path (`useDoubtSolver.ts` hook, `VoiceRecorder.tsx` component) was **not built** — `MicButton` toggles a local `isRecording` boolean but does not trigger recording or upload.

**What is working:**
- Text input → `POST /api/doubt/solve` → answer card with concepts + `AudioPlayer`
- Enter key submits (not Shift+Enter)
- Loading / disabled state while request in flight
- `toast.error` on API failures with backend error message forwarded
- `SolveResponseSchema` Zod validation of API response
- Subject chip selection sets `subject` in request payload
- `AudioPlayer` renders when `audioUrl` is non-null (TTS available)

**What is pending:**
- Voice recording: `MediaRecorder` / `getUserMedia` flow not implemented
- `useDoubtSolver.ts` hook not created (inline state in `DoubtPage.tsx` instead)
- Markdown rendering: Claude answers contain `**bold**` and `---` dividers that render as raw symbols — `react-markdown` not yet added
- Doubt history list not loaded from API (static dummy entries shown)
- Quota indicator not fetched from API (static "2/3 free used" shown)
- Feedback buttons (`👍 Helpful`) in `AudioPlayer` call `toast` only, not `POST /feedback`

**Test coverage:**
- `frontend/src/test/pages/DoubtPage.test.tsx` — 28 Vitest tests covering page structure, mic toggle, subject chip, text input, language display, right panel, static history

**Acceptance criteria status:**
- [x] Text input → answer displayed (core submit flow working end-to-end)
- [x] Enter key submits; Shift+Enter does not
- [x] `AudioPlayer` shown when TTS response available
- [x] Error toast displayed on API failure
- [ ] Voice recording not functional
- [ ] History not loaded from API
- [ ] Quota not fetched from API
- [ ] Markdown in answers not rendered

---

## Phase 2 — Mobile

- Replace `MediaRecorder` / `getUserMedia` with `expo-av` recording (in `VoiceRecorder.tsx`)
- Replace `new Audio(url).play()` with `expo-av` sound playback
- `useDoubtSolver` hook logic unchanged (only the recorder and player swap)
