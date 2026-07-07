# Spec 03 — Voice Pipeline

**Status:** `READY`
**Session:** 3
**Depends on:** Spec 02 (doubt solver)

---

## Goal

Add audio in/out to the doubt solver. Student speaks → AWS Transcribe converts to text → Claude answers → AWS Polly speaks the answer back. Audio files live in S3 with a 7-day lifecycle.

---

## Scope

### In
- `backend/src/services/speech.ts` — AWS Transcribe + Polly wrappers
- S3 upload/download helpers
- `POST /api/doubt/transcribe` — audio blob → transcribed text
- Extend `POST /api/doubt/solve` to accept `audioUrl` as alternative to `text`
- Return `audioUrl` (Polly TTS) in `/solve` response
- S3 presigned URLs for audio upload from mobile (avoid server-side multipart)
- 7-day S3 lifecycle policy (configured via AWS Console or Terraform, documented here)

### Out
- Speech marks / timing metadata (needed only for Session 9 visual sync)
- Real-time streaming (polling-based is fine for Phase 1)

---

## File Structure

```
backend/src/
└── services/
    └── speech.ts     ← uploadAudio(), transcribeAudio(), synthesiseSpeech()
```

---

## API Contract

### `POST /api/doubt/transcribe`
Requires auth.

**Flow:** Client uploads audio directly to S3 via presigned URL, then calls this endpoint with the S3 key. Backend triggers Transcribe job, polls until complete, returns text.

**Request:**
```json
{ "s3Key": "audio/uploads/<userId>/<uuid>.webm", "language": "hi" }
```

**Validation:**
- `s3Key`: string, must match pattern `audio/uploads/<userId>/...`
- `language`: enum `["hi", "en", "ta", "te", "kn", "mr"]`

**Response 200:**
```json
{ "transcribedText": "Newton ka teesra niyam kya hota hai?" }
```

**Errors:**
- `400 INVALID_S3_KEY` — path doesn't belong to requesting user
- `422 TRANSCRIPTION_FAILED` — Transcribe returned no results
- `504 TRANSCRIPTION_TIMEOUT` — job didn't complete in 30 seconds

---

### `GET /api/doubt/upload-url`
Requires auth. Returns a presigned S3 PUT URL for audio upload.

**Query params:**
- `contentType`: `audio/webm` | `audio/mp4` | `audio/ogg`

**Response 200:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...?X-Amz-...",
  "s3Key": "audio/uploads/<userId>/<uuid>.webm",
  "expiresIn": 300
}
```

---

### `POST /api/doubt/solve` (extended)

Adds optional `audioUrl` param (mutually exclusive with `text`):

```json
{
  "audioUrl": "s3://vidyaai-audio/audio/uploads/<userId>/<uuid>.webm",
  "subject": "Physics",
  "language": "hi"
}
```

Response gains `audioUrl` field when solve is successful:
```json
{
  "doubtId": "...",
  "answer": "...",
  "conceptsTagged": ["..."],
  "audioUrl": "https://cloudfront.net/audio/responses/<uuid>.mp3"
}
```

---

## `speech.ts` Service API

```typescript
// Returns a presigned PUT URL + S3 key
export async function getUploadPresignedUrl(params: {
  userId: string;
  contentType: string;
}): Promise<{ uploadUrl: string; s3Key: string }>

// Transcribes audio at given S3 key; polls until done (max 30s)
export async function transcribeAudio(params: {
  s3Key: string;
  languageCode: string; // e.g. "hi-IN"
}): Promise<string>  // returns transcribed text

// Synthesises speech; uploads to S3; returns CloudFront URL
export async function synthesiseSpeech(params: {
  text: string;
  languageCode: string;
  voiceId: string;    // e.g. "Aditi" for Hindi
}): Promise<string>  // returns CDN URL of MP3
```

### Language → Polly Voice Map
```typescript
const POLLY_VOICES: Record<string, { voice: string; engine: 'neural' | 'standard' }> = {
  'hi': { voice: 'Aditi', engine: 'standard' },
  'en': { voice: 'Raveena', engine: 'standard' },
  'ta': { voice: 'Kajal', engine: 'neural' },
  'te': { voice: 'Kajal', engine: 'neural' },
  'kn': { voice: 'Kajal', engine: 'neural' },
  'mr': { voice: 'Kajal', engine: 'neural' },
};
```

---

## S3 Structure

```
vidyaai-audio/
├── audio/
│   ├── uploads/         ← student recordings (7-day lifecycle)
│   │   └── <userId>/
│   │       └── <uuid>.webm
│   └── responses/       ← Polly TTS output (7-day lifecycle)
│       └── <uuid>.mp3
```

- Lifecycle: both prefixes expire after 7 days
- Access: private bucket; responses served via CloudFront CDN

---

## Acceptance Criteria

- [ ] Student uploads Hindi audio → `POST /transcribe` returns correct Hindi text
- [ ] `POST /solve` with `audioUrl` returns `audioUrl` in response (Polly MP3 via CDN)
- [ ] Presigned URL from `GET /upload-url` rejects uploads to another user's prefix
- [ ] Transcription timeout (>30s) returns `504 TRANSCRIPTION_TIMEOUT`
- [ ] Audio files appear in S3 under correct prefix after upload
- [ ] End-to-end (voice in → voice answer) completes in < 8 seconds on simulated 4G
- [ ] S3 key in `/transcribe` request belonging to a different userId returns `400 INVALID_S3_KEY`

---

## Dependencies

- Spec 02 (doubt solver, Claude service)
- AWS SDK v3: `@aws-sdk/client-transcribe`, `@aws-sdk/client-polly`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- Env vars: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`
- CloudFront distribution pointing to `vidyaai-audio` bucket
