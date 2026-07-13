/**
 * useNetworkStatus — online/offline detection
 *
 * Happy path: returns true when navigator.onLine is true
 * Failure cases:
 *   1. Returns false when navigator.onLine is false at mount
 *   2. Updates to false when 'offline' event fires
 *   3. Updates back to true when 'online' event fires after going offline
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

describe('useNetworkStatus', () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');

  function setOnline(value: boolean) {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value,
    });
  }

  afterEach(() => {
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine);
    }
  });

  it('returns true when navigator.onLine is true at mount', () => {
    setOnline(true);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true);
  });

  it('returns false when navigator.onLine is false at mount', () => {
    setOnline(false);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(false);
  });

  it('switches to false when the offline window event fires', () => {
    setOnline(true);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true);

    act(() => window.dispatchEvent(new Event('offline')));
    expect(result.current).toBe(false);
  });

  it('switches back to true when the online window event fires after going offline', () => {
    setOnline(false);
    const { result } = renderHook(() => useNetworkStatus());

    act(() => window.dispatchEvent(new Event('online')));
    expect(result.current).toBe(true);
  });

  it('cleans up event listeners on unmount — no memory leak', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNetworkStatus());
    const addCalls = addSpy.mock.calls.filter(
      ([event]) => event === 'online' || event === 'offline'
    );
    unmount();
    const removeCalls = removeSpy.mock.calls.filter(
      ([event]) => event === 'online' || event === 'offline'
    );

    expect(addCalls).toHaveLength(2);
    expect(removeCalls).toHaveLength(2);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
