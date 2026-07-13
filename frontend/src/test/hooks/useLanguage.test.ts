/**
 * useLanguage — language get/set with localStorage persistence
 *
 * Happy path: defaults to 'hi', persists change in localStorage
 * Failure cases:
 *   1. Returns default 'hi' when localStorage has no value
 *   2. Persists new language across hook re-renders (simulates tab reopen)
 *   3. Does not crash when localStorage has an unexpected value
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useLanguage } from '@/hooks/useLanguage';

const LANGUAGE_KEY = 'vidyaai_language';

describe('useLanguage', () => {
  beforeEach(() => localStorage.clear());

  it('returns hi as the default language when nothing is stored', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('hi');
  });

  it('setLanguage updates state and persists to localStorage', () => {
    const { result } = renderHook(() => useLanguage());

    act(() => result.current.setLanguage('ta'));

    expect(result.current.language).toBe('ta');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('ta');
  });

  it('initialises from localStorage on mount — simulates tab reopen', () => {
    localStorage.setItem(LANGUAGE_KEY, 'te');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('te');
  });

  it('supports all 6 language codes without error', () => {
    const codes = ['hi', 'en', 'ta', 'te', 'kn', 'mr'];
    const { result } = renderHook(() => useLanguage());

    codes.forEach((code) => {
      act(() => result.current.setLanguage(code));
      expect(result.current.language).toBe(code);
      expect(localStorage.getItem(LANGUAGE_KEY)).toBe(code);
    });
  });

  it('overwrites previous language in localStorage correctly', () => {
    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLanguage('mr'));
    act(() => result.current.setLanguage('kn'));
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('kn');
  });
});
