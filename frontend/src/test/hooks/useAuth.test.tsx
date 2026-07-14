/**
 * useAuth — JWT management, profile fetch, verifyOtp, onboard, logout
 *
 * Happy path: JWT in localStorage → profile fetch → isAuthenticated = true
 * Failure cases:
 *   1. No JWT → isAuthenticated = false without any API call
 *   2. Profile returns 401 → JWT cleared, isAuthenticated = false
 *   3. verifyOtp backend 400 → toast.error called, error re-thrown
 *   4. onboard backend 422 → toast.error called, error re-thrown
 *   5. logout → clears JWT, resets state
 *
 * Mock: apiClient (via MSW), window.location.replace, Firebase
 * Real: localStorage (jsdom), Zod parsing, React state
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import { server } from '../msw/server';
import { MOCK_USER_ONBOARDED, MOCK_USER_NOT_ONBOARDED } from '../msw/handlers';
import { useAuth } from '@/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const BASE = 'http://localhost:3000';
const JWT_KEY = 'vidyaai_jwt';

// jsdom does not allow spying on window.location.replace directly — delete + redefine
const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAuth', () => {
  let replaceMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    replaceMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...window.location, replace: replaceMock },
    });
  });

  afterEach(() => {
    if (locationDescriptor) {
      Object.defineProperty(window, 'location', locationDescriptor);
    }
  });

  // ── TC-AUTH-01 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-01: no JWT → isLoading false, isAuthenticated false, no API call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── TC-AUTH-02 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-02: valid JWT → fetches profile → isAuthenticated true, user populated', async () => {
    localStorage.setItem(JWT_KEY, 'valid-token');
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('Arjun Sharma');
    expect(result.current.user?.class).toBe(11);
  });

  // ── TC-AUTH-03 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-03: profile returns 401 → JWT cleared, isAuthenticated false', async () => {
    localStorage.setItem(JWT_KEY, 'expired-token');
    server.use(
      http.get(`${BASE}/api/auth/profile`, () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem(JWT_KEY)).toBeNull();
  });

  // ── TC-AUTH-04 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-04: profile returns 500 → isAuthenticated false, JWT not cleared', async () => {
    localStorage.setItem(JWT_KEY, 'valid-token');
    server.use(
      http.get(`${BASE}/api/auth/profile`, () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    // JWT preserved — 500 is not an auth failure, user should retry
    expect(localStorage.getItem(JWT_KEY)).toBe('valid-token');
  });

  // ── TC-AUTH-05 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-05: verifyOtp success (isOnboarded:true) → JWT stored, user loaded', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.verifyOtp('firebase-id-token');

    expect(localStorage.getItem(JWT_KEY)).toBe('mock-jwt-token');
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
  });

  // ── TC-AUTH-06 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-06: verifyOtp success (isOnboarded:false) → JWT stored, profile NOT fetched', async () => {
    server.use(
      http.post(`${BASE}/api/auth/verify-otp`, () =>
        HttpResponse.json({
          token: 'new-jwt',
          isOnboarded: false,
          userId: 'user-456',
        })
      )
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const { isOnboarded } = await result.current.verifyOtp('firebase-id-token');

    expect(isOnboarded).toBe(false);
    expect(localStorage.getItem(JWT_KEY)).toBe('new-jwt');
    // user should still be null — they haven't onboarded yet
    expect(result.current.user).toBeNull();
  });

  // ── TC-AUTH-07 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-07: verifyOtp backend 400 → toast.error called, error re-thrown', async () => {
    server.use(
      http.post(`${BASE}/api/auth/verify-otp`, () =>
        HttpResponse.json({ error: 'Invalid Firebase ID token', code: 'INVALID_FIREBASE_TOKEN' }, { status: 401 })
      )
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.verifyOtp('bad-token')).rejects.toThrow();
    expect(toast.error).toHaveBeenCalledWith('Invalid Firebase ID token');
  });

  // ── TC-AUTH-08 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-08: onboard success → user state updated, isAuthenticated true', async () => {
    localStorage.setItem(JWT_KEY, 'valid-token');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.onboard({
      name: 'Arjun Sharma',
      class: 11,
      board: 'CBSE',
      language: 'hi',
      studyHoursPerDay: 5,
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('Arjun Sharma');
  });

  // ── TC-AUTH-09 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-09: onboard backend 422 → toast.error called, error re-thrown', async () => {
    server.use(
      http.post(`${BASE}/api/auth/onboard`, () =>
        HttpResponse.json({ error: 'Validation error', code: 'VALIDATION_ERROR' }, { status: 422 })
      )
    );

    localStorage.setItem(JWT_KEY, 'valid-token');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      result.current.onboard({ name: '', class: 11, board: 'CBSE', language: 'hi', studyHoursPerDay: 5 })
    ).rejects.toThrow();
    expect(toast.error).toHaveBeenCalled();
  });

  // ── TC-AUTH-10 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-10: logout → clears JWT, resets state', async () => {
    localStorage.setItem(JWT_KEY, 'valid-token');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    result.current.logout();

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
    expect(localStorage.getItem(JWT_KEY)).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/auth/phone');
  });

  // ── TC-AUTH-11 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-11: Zod rejects malformed profile response → isAuthenticated false', async () => {
    localStorage.setItem(JWT_KEY, 'valid-token');
    server.use(
      http.get(`${BASE}/api/auth/profile`, () =>
        // missing required fields
        HttpResponse.json({ user: { id: 'x' } })
      )
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
  });

  // ── TC-AUTH-12 ──────────────────────────────────────────────────────────────
  it('TC-AUTH-12: user with class=0 (not onboarded) has isAuthenticated true but class=0', async () => {
    localStorage.setItem(JWT_KEY, 'valid-token');
    server.use(
      http.get(`${BASE}/api/auth/profile`, () =>
        HttpResponse.json({ user: MOCK_USER_NOT_ONBOARDED })
      )
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.class).toBe(0);
  });
});
