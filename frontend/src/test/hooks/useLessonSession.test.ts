/**
 * useLessonSession — Hook Tests (TC-77 to TC-89)
 * Layer 3: Interactive learning session state management
 *
 * Hook returns: { sessionId, messages, taskComplete, currentTaskIndex,
 *                 loading, error, startSession, sendMessage, completeSession, resetSession }
 *
 * completeSession() posts to /api/lesson/complete but does NOT reset state —
 *   use resetSession() to clear state (separate call).
 *
 * Toast is the default export: toast.error(), toast.success()
 *
 * Mock: MSW for lesson endpoints
 * Real: Hook rendering via renderHook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { useLessonSession } from '@/hooks/useLessonSession';
import {
  lessonHandlers,
  MOCK_LESSON_START,
  MOCK_LESSON_RESPOND,
  MOCK_LESSON_COMPLETE,
} from '../msw/plan-handlers';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), loading: vi.fn() },
}));

import toast from 'react-hot-toast';

beforeEach(() => {
  vi.clearAllMocks();
  server.use(...lessonHandlers);
  localStorage.setItem('vidyaai_jwt', 'test-jwt-token');
});

const CHAPTER_ID = 'ch-id-01';

// ═════════════════════════════════════════════════════════════════════════════
// startSession
// ═════════════════════════════════════════════════════════════════════════════

describe('startSession()', () => {
  // TC-77
  it('TC-77: sets sessionId and pushes first assistant message', async () => {
    const { result } = renderHook(() => useLessonSession());

    await act(async () => {
      await result.current.startSession(CHAPTER_ID, 0, 'hi');
    });

    expect(result.current.sessionId).toBe(MOCK_LESSON_START.sessionId);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('assistant');
    expect(result.current.messages[0].content).toBe(MOCK_LESSON_START.message);
  });

  // TC-78
  it('TC-78: loading is true during request and false after', async () => {
    let resolveRequest: (() => void) | null = null;
    const requestReached = new Promise<void>((outerResolve) => {
      server.use(
        http.post('http://localhost:3000/api/lesson/start', async () => {
          await new Promise<void>((inner) => {
            resolveRequest = inner;
            outerResolve();
          });
          return HttpResponse.json(MOCK_LESSON_START);
        })
      );
    });

    const { result } = renderHook(() => useLessonSession());
    expect(result.current.loading).toBe(false);

    let startPromise: Promise<string | null>;
    act(() => {
      startPromise = result.current.startSession(CHAPTER_ID, 0, 'hi');
    });

    // Wait until the handler has started
    await requestReached;
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveRequest!();
      await startPromise!;
    });

    expect(result.current.loading).toBe(false);
  });

  // TC-79
  it('TC-79: taskComplete is false after a fresh session start', async () => {
    const { result } = renderHook(() => useLessonSession());

    await act(async () => {
      await result.current.startSession(CHAPTER_ID, 0, 'hi');
    });

    expect(result.current.taskComplete).toBe(false);
  });

  // TC-80
  it('TC-80: on API failure, shows error toast and sessionId remains null', async () => {
    server.use(
      http.post('http://localhost:3000/api/lesson/start', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useLessonSession());

    await act(async () => {
      await result.current.startSession(CHAPTER_ID, 0, 'hi');
    });

    expect(toast.error).toHaveBeenCalled();
    expect(result.current.sessionId).toBeNull();
  });

  // TC-81
  it('TC-81: calling startSession again clears previous messages', async () => {
    const { result } = renderHook(() => useLessonSession());

    await act(async () => {
      await result.current.startSession(CHAPTER_ID, 0, 'hi');
    });
    expect(result.current.messages).toHaveLength(1);

    await act(async () => {
      await result.current.startSession(CHAPTER_ID, 1, 'hi');
    });
    // Resets messages — new session starts fresh with 1 message
    expect(result.current.messages).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// sendMessage
// ═════════════════════════════════════════════════════════════════════════════

describe('sendMessage()', () => {
  async function startedHook() {
    const hookResult = renderHook(() => useLessonSession());
    await act(async () => {
      await hookResult.result.current.startSession(CHAPTER_ID, 0, 'hi');
    });
    return hookResult;
  }

  // TC-82
  it('TC-82: appends user message optimistically before AI replies', async () => {
    let resolveRequest: (() => void) | null = null;
    const requestReached = new Promise<void>((outerResolve) => {
      server.use(
        http.post('http://localhost:3000/api/lesson/respond', async () => {
          await new Promise<void>((inner) => {
            resolveRequest = inner;
            outerResolve();
          });
          return HttpResponse.json(MOCK_LESSON_RESPOND);
        })
      );
    });

    const { result } = await startedHook();

    act(() => {
      void result.current.sendMessage('Mera jawab hai');
    });

    await requestReached;

    // Optimistic update: user message should be in messages
    await waitFor(() => {
      const userMsg = result.current.messages.find((m) => m.role === 'user');
      expect(userMsg).toBeDefined();
      expect(userMsg!.content).toBe('Mera jawab hai');
    });

    await act(async () => { resolveRequest!(); });
  });

  // TC-83
  it('TC-83: appends AI reply after response; loading resets to false', async () => {
    const { result } = await startedHook();

    await act(async () => {
      await result.current.sendMessage('Samajh aa gaya');
    });

    // Start assistant + user + AI reply = 3 messages
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[2].role).toBe('assistant');
    expect(result.current.loading).toBe(false);
  });

  // TC-84
  it('TC-84: taskComplete updates to true when API returns taskComplete=true', async () => {
    server.use(
      http.post('http://localhost:3000/api/lesson/respond', () =>
        HttpResponse.json({ ...MOCK_LESSON_RESPOND, taskComplete: true, nextTaskIndex: 1 })
      )
    );

    const { result } = await startedHook();

    await act(async () => {
      await result.current.sendMessage('Sab samajh gaya!');
    });

    expect(result.current.taskComplete).toBe(true);
  });

  // TC-85
  it('TC-85: currentTaskIndex increments when taskComplete=true', async () => {
    server.use(
      http.post('http://localhost:3000/api/lesson/respond', () =>
        HttpResponse.json({ ...MOCK_LESSON_RESPOND, taskComplete: true, nextTaskIndex: 1 })
      )
    );

    const { result } = await startedHook();
    expect(result.current.currentTaskIndex).toBe(0);

    await act(async () => {
      await result.current.sendMessage('Done!');
    });

    expect(result.current.currentTaskIndex).toBe(1);
  });

  // TC-86
  it('TC-86: sendMessage does nothing when sessionId is null', async () => {
    let apiCalled = false;
    server.use(
      http.post('http://localhost:3000/api/lesson/respond', () => {
        apiCalled = true;
        return HttpResponse.json(MOCK_LESSON_RESPOND);
      })
    );

    // No startSession — sessionId is null
    const { result } = renderHook(() => useLessonSession());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(apiCalled).toBe(false);
  });

  // TC-87
  it('TC-87: on API failure, shows error toast and loading resets to false', async () => {
    server.use(
      http.post('http://localhost:3000/api/lesson/respond', () =>
        HttpResponse.json({ error: 'Claude down' }, { status: 502 })
      )
    );

    const { result } = await startedHook();

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(toast.error).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// completeSession
// ═════════════════════════════════════════════════════════════════════════════

describe('completeSession()', () => {
  async function startedHook() {
    const hookResult = renderHook(() => useLessonSession());
    await act(async () => {
      await hookResult.result.current.startSession(CHAPTER_ID, 0, 'hi');
    });
    return hookResult;
  }

  // TC-88
  it('TC-88: calls POST /api/lesson/complete with the current sessionId', async () => {
    let capturedBody: unknown;
    server.use(
      http.post('http://localhost:3000/api/lesson/complete', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(MOCK_LESSON_COMPLETE);
      })
    );

    const { result } = await startedHook();

    await act(async () => {
      await result.current.completeSession();
    });

    expect((capturedBody as { sessionId: string }).sessionId).toBe(MOCK_LESSON_START.sessionId);
  });

  // TC-89: completeSession does NOT reset state — call resetSession() for that.
  it('TC-89: resetSession clears state after completeSession', async () => {
    const { result } = await startedHook();

    await act(async () => {
      await result.current.sendMessage('Test message');
    });
    expect(result.current.messages.length).toBeGreaterThan(1);

    await act(async () => {
      await result.current.completeSession();
      result.current.resetSession();
    });

    expect(result.current.sessionId).toBeNull();
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.taskComplete).toBe(false);
  });
});
