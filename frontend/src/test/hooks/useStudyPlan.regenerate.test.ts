/**
 * useStudyPlan.regenerate — Hook Tests (TC-43 to TC-48)
 * Layer 2: AI study plan generation from selected chapters
 *
 * Hook state: { plan, loading, error, regenerating, regenerate, completeTask, fetchPlan }
 *   - plan: current WeekPlan (null initially)
 *   - regenerating: true while POST is in-flight (not `loading`)
 *   - toast is the default export with .error()/.success()
 *
 * Happy path: regenerate() POSTs correct body; plan updates after fetchPlan() re-runs.
 *
 * Critical failures:
 *   1. 502 → toast.error called; regenerating resets to false
 *   2. Network failure → fallback MOCK_PLAN applied; regenerating resets
 *   3. Error → regenerating is false (button re-enabled)
 *
 * Mock: MSW for /api/plan/regenerate and /api/plan/week
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { useStudyPlan } from '@/hooks/useStudyPlan';
import { planHandlers, MOCK_GENERATED_PLAN } from '../msw/plan-handlers';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), loading: vi.fn() },
}));

// Import toast AFTER mock so we get the mocked instance
import toast from 'react-hot-toast';

beforeEach(() => {
  vi.clearAllMocks();
  server.use(...planHandlers);
  localStorage.setItem('vidyaai_jwt', 'test-jwt-token');
});

const CHAPTER_IDS = ['ch-id-01', 'ch-id-03', 'ch-id-07'];

// ── TC-43: Correct body shape ─────────────────────────────────────────────────

describe('TC-43: regenerate() sends correct request body', () => {
  it('POSTs chapterIds, dailyMinutes, language, and subject', async () => {
    let capturedBody: unknown;

    server.use(
      http.post('http://localhost:3000/api/plan/regenerate', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ plan: MOCK_GENERATED_PLAN, fromCache: false });
      })
    );

    const { result } = renderHook(() => useStudyPlan());

    await act(async () => {
      await result.current.regenerate(CHAPTER_IDS, 90, 'hi', 'Science');
    });

    expect(capturedBody).toMatchObject({
      chapterIds: CHAPTER_IDS,
      dailyMinutes: 90,
      language: 'hi',
      subject: 'Science',
    });
  });
});

// ── TC-44: Plan state updates on success ─────────────────────────────────────
// After regenerate(), hook calls fetchPlan() which GETs /api/plan/week.
// The plan state updates from null to a WeekPlan object.

describe('TC-44: plan state updates after successful regenerate', () => {
  it('plan is non-null after regenerate and fetchPlan resolve', async () => {
    const { result } = renderHook(() => useStudyPlan());

    // Wait for initial fetchPlan to settle
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.regenerate(CHAPTER_IDS, 90, 'hi', 'Science');
    });

    await waitFor(() => {
      expect(result.current.plan).not.toBeNull();
    });
  });
});

// ── TC-45: Regenerating flag lifecycle ────────────────────────────────────────

describe('TC-45: regenerating becomes true during request and false on completion', () => {
  it('regenerating is false before and false after; true during', async () => {
    let resolveRequest!: () => void;
    const requestStarted = new Promise<void>((r) => {
      server.use(
        http.post('http://localhost:3000/api/plan/regenerate', async () => {
          r();
          await new Promise<void>((res) => { resolveRequest = res; });
          return HttpResponse.json({ plan: MOCK_GENERATED_PLAN, fromCache: false });
        })
      );
    });

    const { result } = renderHook(() => useStudyPlan());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.regenerating).toBe(false);

    act(() => {
      void result.current.regenerate(CHAPTER_IDS, 90, 'hi', 'Science');
    });

    await requestStarted;
    expect(result.current.regenerating).toBe(true);

    await act(async () => { resolveRequest(); });

    await waitFor(() => {
      expect(result.current.regenerating).toBe(false);
    });
  });
});

// ── TC-46: Error response → toast.error ──────────────────────────────────────

describe('TC-46: error response shows toast.error', () => {
  it('calls toast.error when endpoint returns 502', async () => {
    server.use(
      http.post('http://localhost:3000/api/plan/regenerate', () =>
        HttpResponse.json({ error: 'AI busy', code: 'CLAUDE_TIMEOUT' }, { status: 502 })
      )
    );

    const { result } = renderHook(() => useStudyPlan());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.regenerate(CHAPTER_IDS, 90, 'hi', 'Science');
    });

    expect(toast.error).toHaveBeenCalled();
  });
});

// ── TC-47: Network failure → fallback ────────────────────────────────────────

describe('TC-47: hook recovers gracefully on network failure', () => {
  it('regenerating resets to false even after network error', async () => {
    server.use(
      http.post('http://localhost:3000/api/plan/regenerate', () => {
        throw new Error('Network error');
      })
    );

    const { result } = renderHook(() => useStudyPlan());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.regenerate(CHAPTER_IDS, 90, 'hi', 'Science');
    });

    expect(result.current.regenerating).toBe(false);
  });
});

// ── TC-48: regenerating resets after 500 ─────────────────────────────────────

describe('TC-48: regenerating resets to false after a 500 error', () => {
  it('hook is not stuck in regenerating=true', async () => {
    server.use(
      http.post('http://localhost:3000/api/plan/regenerate', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useStudyPlan());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.regenerate(CHAPTER_IDS, 90, 'hi', 'Science');
    });

    expect(result.current.regenerating).toBe(false);
  });
});
