# Spec 07 — React Web App Shell

**Status:** `DONE`
**Session:** 4
**Completed:** 2026-07-07
**Merged to:** `main`
**Depends on:** Spec 01 (auth API live), Spec 00-infra (AWS deployment ready)

---

## Goal

Bootstrap the React web application with Firebase phone auth, JWT session management, routing, and the main navigation layout. This is the scaffolding all frontend screens live inside, deployed to S3/CloudFront on AWS.

**Phase 2 note:** The same codebase will be wrapped in Expo for Android/iOS. All components must avoid browser-only APIs that have no React Native equivalent — use abstraction hooks (`useStorage`, `useNetworkStatus`) to keep platform differences isolated.

---

## Scope

### In
- Vite + React 18 + TypeScript project (strict mode)
- Firebase Web SDK v9 — phone OTP auth
- React Router v6 — client-side routing
- JWT stored in `localStorage` (web); wrapped in `useStorage` hook so mobile can swap to SecureStore later
- Axios instance with JWT interceptor
- Auth flow: phone input → OTP → onboarding form → main app
- Sidebar / top nav layout with sections: Home, Doubt, Plan, Profile
- Language selection persisted in localStorage
- Offline detection banner
- Tailwind CSS for styling (works on web; will be replaced by NativeWind for mobile phase)
- Deployed to S3 via GitHub Actions (see Spec 00-infra)

### Out
- React Native / Expo wrapper (Phase 2)
- Push notifications (later session)
- PWA service worker / offline caching (post-MVP)

---

## File Structure

```
frontend/
├── index.html
├── vite.config.ts
├── src/
│   ├── main.tsx                     ← React root, Firebase init
│   ├── App.tsx                      ← Router, auth gate
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── PhonePage.tsx        ← phone number input
│   │   │   ├── OtpPage.tsx          ← OTP entry
│   │   │   └── OnboardPage.tsx      ← class, board, language, exam date
│   │   ├── home/HomePage.tsx        ← dashboard stub
│   │   ├── doubt/DoubtPage.tsx      ← stub (Spec 08)
│   │   ├── plan/PlanPage.tsx        ← stub (Spec 09)
│   │   └── profile/ProfilePage.tsx  ← language switcher, logout
│   ├── hooks/
│   │   ├── useAuth.ts               ← JWT read/write, login/logout, profile fetch
│   │   ├── useLanguage.ts           ← language get/set (localStorage)
│   │   ├── useStorage.ts            ← abstraction: localStorage on web, SecureStore on mobile
│   │   └── useNetworkStatus.ts      ← online/offline detection
│   ├── lib/
│   │   ├── firebase.ts              ← Firebase app init (singleton)
│   │   ├── axios.ts                 ← Axios instance, JWT interceptor, base URL from env
│   │   └── queryClient.ts           ← TanStack Query client
│   ├── components/
│   │   ├── Layout.tsx               ← sidebar + main content shell
│   │   ├── OfflineBanner.tsx        ← shown when navigator.onLine === false
│   │   └── LanguagePicker.tsx       ← language selector dropdown
│   └── constants/
│       ├── subjects.ts              ← CBSE/ICSE/JEE/NEET subject lists
│       └── languages.ts            ← { code, label, nativeLabel } for 6 languages
```

---

## Auth Flow

```
App start
  └─ JWT in localStorage?
       ├─ No  → /auth/phone
       └─ Yes → GET /api/auth/profile
                  ├─ 401 → /auth/phone  (token expired)
                  └─ OK  → user.class > 0?
                              ├─ No  → /auth/onboard
                              └─ Yes → /home
```

Route guard: `<AuthGuard>` wraps all non-auth routes. Redirects to `/auth/phone` if unauthenticated.

---

## Onboarding Form

| Field | Element | Options |
|-------|---------|---------|
| Name | `<input type="text">` | — |
| Class | `<select>` | 6–12, JEE/NEET repeater (13) |
| Board | `<select>` | CBSE, ICSE, State Board, JEE, NEET |
| Language | `<select>` | Hindi, English, Tamil, Telugu, Kannada, Marathi |
| Exam date | `<input type="date">` | optional |
| Study hours/day | `<input type="range" min=1 max=12>` | — |

Calls `POST /api/auth/onboard`. On success, redirects to `/home`.

---

## Navigation Layout (web)

```
┌─────────────────────────────────────────────────────┐
│  VidyaAI               [Hindi ▾]  [User name]  [⚙]  │  ← top nav bar
├───────────┬─────────────────────────────────────────┤
│           │                                         │
│  🏠 Home  │          Page content area              │
│  🎤 Doubt │                                         │
│  📅 Plan  │                                         │
│  👤 Profile│                                        │
│           │                                         │
└───────────┴─────────────────────────────────────────┘
```

Responsive: sidebar collapses to a bottom nav bar on screens < 768px width (mobile web).

---

## Key Libraries

| Library | Purpose |
|---------|---------|
| `vite` | Build tool |
| `react-router-dom` v6 | Client-side routing (SPA) |
| `firebase` (Web SDK v9) | Phone OTP auth |
| `axios` | HTTP client |
| `@tanstack/react-query` | Server state, caching, loading states |
| `tailwindcss` | Styling |
| `react-hot-toast` | Toast notifications |

---

## Environment Variables (frontend)

```env
VITE_API_URL=https://api.vidyaai.in        # or http://localhost:3000 for dev
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

All `VITE_*` — baked into the static build. No secrets here.

---

## Acceptance Criteria

- [ ] `npm run build` produces a static `dist/` folder deployable to S3
- [ ] Fresh user: phone input → OTP entry → onboarding form → home page (end-to-end in browser)
- [ ] Refreshing the browser on `/plan` stays on `/plan` (CloudFront 404→index.html rewrite)
- [ ] Expired JWT: automatic redirect to `/auth/phone` without crash or white screen
- [ ] Language changed on Profile: persists after browser tab is closed and reopened
- [ ] No internet: offline banner visible; app doesn't crash or show blank errors
- [ ] Hindi text in onboarding form renders correctly in Chrome (Devanagari)
- [ ] Responsive layout: sidebar becomes bottom bar on 375px viewport width
- [ ] GitHub Actions deploy runs cleanly; `https://vidyaai.in` serves the new build within 5 min

---

## Dependencies

- Spec 01 (`POST /verify-otp`, `POST /onboard`, `GET /profile`)
- Spec 00-infra (S3 bucket + CloudFront distribution + domain)
- Firebase project with phone auth enabled (web app config)
- `VITE_API_URL` pointing to deployed backend

## Implementation Notes

**Pivot:** Built as React web app (`frontend/`) using Vite + React 18 + TypeScript, not React Native. `mobile/` remains a placeholder stub. This was an intentional pivot (web-first MVP before mobile).

**Files created:** All pages (`PhonePage`, `OtpPage`, `OnboardPage`, `HomePage`, `DoubtPage`, `PlanPage`, `ProfilePage`, `WhiteboardPage`), all hooks (`useAuth`, `useLanguage`, `useStorage`, `useNetworkStatus`), all shared components (`Layout`, `AudioPlayer`, `MicButton`, `WeaknessBar`, `StatCard`, `PlanItem`, `SubjectBadge`), `lib/firebase.ts`, `lib/axios.ts`.

**Docker:** `docker-compose.yml` with `frontend`, `backend`, `postgres`, `minio` services. `backend/Dockerfile` uses multi-stage build.

**Auth flow:** Firebase phone OTP → backend `/api/auth/verify-otp` → JWT stored in `localStorage` via `useStorage` hook. `AuthGuard` wraps all protected routes.

**Acceptance criteria status:**
- [x] App shell boots; routing works; auth guard redirects unauthenticated users
- [x] Language selection persisted via `useLanguage` / localStorage
- [ ] S3/CloudFront deployment (AWS infra not yet provisioned — running locally via Docker)
- [ ] Responsive sidebar → bottom bar at 375px (layout present but not fully tested at breakpoints)

---

## Phase 2 — Mobile (React Native / Expo)

When mobile build starts:
- Replace `localStorage` with `expo-secure-store` via `useStorage` hook
- Replace Firebase Web SDK with `@react-native-firebase/auth`
- Replace Tailwind with NativeWind
- Replace `react-router-dom` with `expo-router`
- `useNetworkStatus` swaps `navigator.onLine` for `@react-native-community/netinfo`
- All business logic in hooks is untouched
