/**
 * LanguagePicker — 6 language dropdown, persists to localStorage
 *
 * Happy path: renders all 6 options, default 'hi' selected
 * Failure cases:
 *   1. Selecting a new language updates localStorage immediately
 *   2. Pre-existing localStorage value is shown as selected on mount
 *   3. All 6 languages render with both native + English label
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { LanguagePicker } from '@/components/LanguagePicker';
import { LANGUAGES } from '@/constants/languages';

const LANGUAGE_KEY = 'vidyaai_language';

describe('LanguagePicker', () => {
  beforeEach(() => localStorage.clear());

  // ── TC-LANG-01 ─────────────────────────────────────────────────────────────
  it('TC-LANG-01: renders a select element with 6 language options', () => {
    render(<LanguagePicker />);
    const select = screen.getByRole('combobox', { name: /select language/i });
    expect(select).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(6);
  });

  // ── TC-LANG-02 ─────────────────────────────────────────────────────────────
  it('TC-LANG-02: default selected value is Hindi (hi) when nothing stored', () => {
    render(<LanguagePicker />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('hi');
  });

  // ── TC-LANG-03 ─────────────────────────────────────────────────────────────
  it('TC-LANG-03: all 6 languages display native label + English label', () => {
    render(<LanguagePicker />);
    LANGUAGES.forEach((lang) => {
      expect(screen.getByText(`${lang.nativeLabel} (${lang.label})`)).toBeInTheDocument();
    });
  });

  // ── TC-LANG-04 ─────────────────────────────────────────────────────────────
  it('TC-LANG-04: selecting Tamil persists "ta" to localStorage', async () => {
    render(<LanguagePicker />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ta');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('ta');
  });

  // ── TC-LANG-05 ─────────────────────────────────────────────────────────────
  it('TC-LANG-05: initialises from localStorage — pre-stored "mr" shown as selected', () => {
    localStorage.setItem(LANGUAGE_KEY, 'mr');
    render(<LanguagePicker />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('mr');
  });

  // ── TC-LANG-06 ─────────────────────────────────────────────────────────────
  it('TC-LANG-06: changing language twice only stores the last value', async () => {
    render(<LanguagePicker />);
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'te');
    await userEvent.selectOptions(select, 'kn');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('kn');
    expect((select as HTMLSelectElement).value).toBe('kn');
  });

  // ── TC-LANG-07 ─────────────────────────────────────────────────────────────
  it('TC-LANG-07: Devanagari Hindi label renders correctly (Unicode check)', () => {
    render(<LanguagePicker />);
    expect(screen.getByText(/हिन्दी/)).toBeInTheDocument();
  });
});
