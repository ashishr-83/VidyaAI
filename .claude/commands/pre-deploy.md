Run the VidyaAI pre-deploy checklist. Check each item and report PASS or FAIL:

1. **TypeScript** — run `cd backend && npx tsc --noEmit`. PASS if zero errors.
2. **Tests** — run `cd backend && npm test`. PASS if all tests pass.
3. **No hardcoded secrets** — grep source files for common patterns (sk-ant-, AKIA, password=, secret=). PASS if none found outside .env files.
4. **Rate limiting** — check that `express-rate-limit` middleware is applied to `/api/doubt/solve` and `/api/doubt/transcribe` routes.
5. **Claude timeout handling** — check that the Claude service has a timeout and returns a structured error (not a crash) when it exceeds 8 seconds.
6. **Env vars documented** — check that every key used in code exists in `backend/.env.example`.
7. **S3 lifecycle policy** — remind to verify the 7-day delete policy is set on the `vidyaai-audio` bucket.

At the end: overall PASS (all 7 green) or list which items need fixing before deploy.
