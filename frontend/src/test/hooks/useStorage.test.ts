/**
 * useStorage — localStorage abstraction
 *
 * Happy path: get/set/remove work against jsdom localStorage
 * Failure cases:
 *   1. get() on missing key returns null (not undefined or throw)
 *   2. remove() on missing key does not throw
 *   3. Values persist within the same test (same storage instance)
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useStorage } from '@/hooks/useStorage';

describe('useStorage', () => {
  beforeEach(() => localStorage.clear());

  it('set() stores a value and get() retrieves it', () => {
    const { result } = renderHook(() => useStorage());
    result.current.set('test_key', 'hello');
    expect(result.current.get('test_key')).toBe('hello');
  });

  it('get() returns null for a key that was never set', () => {
    const { result } = renderHook(() => useStorage());
    expect(result.current.get('nonexistent')).toBeNull();
  });

  it('remove() deletes the key so get() returns null afterwards', () => {
    const { result } = renderHook(() => useStorage());
    result.current.set('delete_me', 'value');
    result.current.remove('delete_me');
    expect(result.current.get('delete_me')).toBeNull();
  });

  it('remove() on a missing key does not throw', () => {
    const { result } = renderHook(() => useStorage());
    expect(() => result.current.remove('missing')).not.toThrow();
  });

  it('overwrites a value when set() is called twice with the same key', () => {
    const { result } = renderHook(() => useStorage());
    result.current.set('key', 'first');
    result.current.set('key', 'second');
    expect(result.current.get('key')).toBe('second');
  });
});
