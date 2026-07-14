/**
 * axios interceptors — JWT attachment and 401 auto-redirect
 *
 * Happy path: request goes out with Authorization header when JWT present
 * Failure cases:
 *   1. No JWT in localStorage → no Authorization header
 *   2. 401 response → localStorage JWT cleared + window.location.replace called
 *   3. Non-401 error → JWT not cleared, error propagates
 *   4. JWT present → Authorization: Bearer <token> header sent
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { apiClient, JWT_KEY } from '@/lib/axios';

const BASE = 'http://localhost:3000';

// jsdom does not allow spying on window.location.replace directly — delete + redefine
const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');

describe('apiClient interceptors', () => {
  let replaceMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    replaceMock = vi.fn();
    // Replace window.location with a writable object so we can mock replace
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...window.location, replace: replaceMock },
    });
  });

  afterEach(() => {
    // Restore original location
    if (locationDescriptor) {
      Object.defineProperty(window, 'location', locationDescriptor);
    }
  });

  // ── TC-AXIOS-01 ────────────────────────────────────────────────────────────
  it('TC-AXIOS-01: sends Authorization header when JWT in localStorage', async () => {
    localStorage.setItem(JWT_KEY, 'test-token-123');
    let capturedAuth = '';

    server.use(
      http.get(`${BASE}/api/test`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization') ?? '';
        return HttpResponse.json({ ok: true });
      })
    );

    await apiClient.get('/api/test');
    expect(capturedAuth).toBe('Bearer test-token-123');
  });

  // ── TC-AXIOS-02 ────────────────────────────────────────────────────────────
  it('TC-AXIOS-02: no Authorization header when localStorage has no JWT', async () => {
    let capturedAuth: string | null = 'was-set';

    server.use(
      http.get(`${BASE}/api/test`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      })
    );

    await apiClient.get('/api/test');
    expect(capturedAuth).toBeNull();
  });

  // ── TC-AXIOS-03 ────────────────────────────────────────────────────────────
  it('TC-AXIOS-03: 401 response → clears JWT and calls window.location.replace', async () => {
    localStorage.setItem(JWT_KEY, 'expired-token');
    server.use(
      http.get(`${BASE}/api/test`, () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )
    );

    await expect(apiClient.get('/api/test')).rejects.toThrow();
    expect(localStorage.getItem(JWT_KEY)).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/auth/login');
  });

  // ── TC-AXIOS-04 ────────────────────────────────────────────────────────────
  it('TC-AXIOS-04: 500 response → JWT is NOT cleared, error propagates', async () => {
    localStorage.setItem(JWT_KEY, 'valid-token');
    server.use(
      http.get(`${BASE}/api/test`, () =>
        HttpResponse.json({ error: 'Server Error' }, { status: 500 })
      )
    );

    await expect(apiClient.get('/api/test')).rejects.toThrow();
    expect(localStorage.getItem(JWT_KEY)).toBe('valid-token');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // ── TC-AXIOS-05 ────────────────────────────────────────────────────────────
  it('TC-AXIOS-05: 403 response → JWT is NOT cleared', async () => {
    localStorage.setItem(JWT_KEY, 'valid-token');
    server.use(
      http.get(`${BASE}/api/test`, () =>
        HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
      )
    );

    await expect(apiClient.get('/api/test')).rejects.toThrow();
    expect(localStorage.getItem(JWT_KEY)).toBe('valid-token');
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
