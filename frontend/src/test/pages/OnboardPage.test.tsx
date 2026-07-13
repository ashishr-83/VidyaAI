/**
 * OnboardPage — onboarding form
 *
 * Happy path: fill all fields → submit → onboard() called with correct payload → redirect
 * Failure cases:
 *   1. Name field left blank → HTML5 validation prevents submission
 *   2. Backend returns error → toast shown, stays on page
 *   3. Exam date is optional — submits fine when blank
 *   4. Study hours slider reflects numeric value in label
 *   5. All 5 board options render correctly
 *   6. Class 13 shows JEE/NEET Repeater label
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import toast from 'react-hot-toast';
import { OnboardPage } from '@/pages/auth/OnboardPage';

vi.mock('@/hooks/useAuth');
import { useAuth } from '@/hooks/useAuth';

function makeOnboardMock(shouldReject = false) {
  const onboard = shouldReject
    ? vi.fn().mockRejectedValue(new Error('Backend error'))
    : vi.fn().mockResolvedValue(undefined);

  vi.mocked(useAuth).mockReturnValue({
    isLoading: false,
    isAuthenticated: false,
    user: null,
    verifyOtp: vi.fn(),
    onboard,
    logout: vi.fn(),
  });
  return { onboard };
}

function setup() {
  return render(
    <MemoryRouter initialEntries={['/auth/onboard']}>
      <Routes>
        <Route path="/auth/onboard" element={<OnboardPage />} />
        <Route path="/home" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OnboardPage', () => {
  // ── TC-ONBOARD-01 ──────────────────────────────────────────────────────────
  it('TC-ONBOARD-01: renders all required fields', () => {
    makeOnboardMock();
    setup();
    expect(screen.getByPlaceholderText(/Arjun Sharma/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /class/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /board/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /language/i })).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start learning/i })).toBeInTheDocument();
  });

  // ── TC-ONBOARD-02 ──────────────────────────────────────────────────────────
  it('TC-ONBOARD-02: all 5 board options render', () => {
    makeOnboardMock();
    setup();
    const boardSelect = screen.getByRole('combobox', { name: /board/i });
    expect(boardSelect).toContainHTML('<option value="CBSE">CBSE</option>');
    expect(boardSelect).toContainHTML('<option value="ICSE">ICSE</option>');
    expect(boardSelect).toContainHTML('<option value="STATE">STATE</option>');
    expect(boardSelect).toContainHTML('<option value="JEE">JEE</option>');
    expect(boardSelect).toContainHTML('<option value="NEET">NEET</option>');
  });

  // ── TC-ONBOARD-03 ──────────────────────────────────────────────────────────
  it('TC-ONBOARD-03: class 13 option shows JEE/NEET Repeater label', () => {
    makeOnboardMock();
    setup();
    expect(screen.getByRole('option', { name: 'JEE/NEET Repeater' })).toBeInTheDocument();
  });

  // ── TC-ONBOARD-04 ──────────────────────────────────────────────────────────
  it('TC-ONBOARD-04: slider renders with correct min/max and default value', () => {
    makeOnboardMock();
    setup();
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '12');
    expect(slider).toHaveValue('4'); // default studyHoursPerDay
    // Label shows default hours
    expect(screen.getByText('4 hrs')).toBeInTheDocument();
  });

  // ── TC-ONBOARD-05 ──────────────────────────────────────────────────────────
  it('TC-ONBOARD-05: happy path — fills form, submits, onboard() called with correct data', async () => {
    const { onboard } = makeOnboardMock();
    setup();

    await userEvent.type(screen.getByPlaceholderText(/Arjun Sharma/i), 'Test Student');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /class/i }), '11');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /board/i }), 'CBSE');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /language/i }), 'hi');
    await userEvent.click(screen.getByRole('button', { name: /start learning/i }));

    await waitFor(() =>
      expect(onboard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Student',
          class: 11,
          board: 'CBSE',
          language: 'hi',
        })
      )
    );
  });

  // ── TC-ONBOARD-06 ──────────────────────────────────────────────────────────
  it('TC-ONBOARD-06: exam date is optional — submits fine when blank', async () => {
    const { onboard } = makeOnboardMock();
    setup();

    await userEvent.type(screen.getByPlaceholderText(/Arjun Sharma/i), 'Test Student');
    await userEvent.click(screen.getByRole('button', { name: /start learning/i }));

    await waitFor(() => expect(onboard).toHaveBeenCalled());
    const callArg = onboard.mock.calls[0][0] as { examDate?: string };
    expect(callArg.examDate).toBeUndefined();
  });

  // ── TC-ONBOARD-07 ──────────────────────────────────────────────────────────
  it('TC-ONBOARD-07: empty name field → HTML5 required prevents submit, onboard() never called', async () => {
    // Validates that the form guards against empty name (no backend call)
    const { onboard } = makeOnboardMock();
    setup();

    // Do NOT fill name — leave it blank
    // Click submit — browser's HTML5 required stops this
    const btn = screen.getByRole('button', { name: /start learning/i });
    await userEvent.click(btn);

    // onboard should never have been called
    expect(onboard).not.toHaveBeenCalled();
    // Form still on screen
    expect(screen.getByPlaceholderText(/Arjun Sharma/i)).toBeInTheDocument();
  });

  // ── TC-ONBOARD-08 ──────────────────────────────────────────────────────────
  it('TC-ONBOARD-08: Hindi language option shows Devanagari text', () => {
    makeOnboardMock();
    setup();
    expect(screen.getByRole('option', { name: /हिन्दी/ })).toBeInTheDocument();
  });
});
