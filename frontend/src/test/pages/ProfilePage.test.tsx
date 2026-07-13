/**
 * ProfilePage — user profile display + language switcher + logout
 *
 * Happy path: user data shown, language picker functional, logout works
 * Failure cases:
 *   1. Displays phone, name, class, board, tier
 *   2. Selecting new language persists to localStorage
 *   3. Logout button calls logout()
 *   4. Returns null when user is null (guard should prevent this, but safe)
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import type { User } from '@/hooks/useAuth';

vi.mock('@/hooks/useAuth');
import { useAuth } from '@/hooks/useAuth';

const MOCK_USER: User = {
  id: 'user-123',
  phone: '+919876543210',
  name: 'Arjun Sharma',
  class: 11,
  board: 'CBSE',
  language: 'hi',
  tier: 'free',
  examDate: null,
  studyHoursPerDay: 5,
  createdAt: '2025-01-01T00:00:00.000Z',
};

function setup(user: User | null = MOCK_USER) {
  const logout = vi.fn();
  vi.mocked(useAuth).mockReturnValue({
    isLoading: false,
    isAuthenticated: user !== null,
    user,
    verifyOtp: vi.fn(),
    onboard: vi.fn(),
    logout,
  });

  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );

  return { logout };
}

describe('ProfilePage', () => {
  beforeEach(() => localStorage.clear());

  // ── TC-PROFILE-01 ──────────────────────────────────────────────────────────
  it('TC-PROFILE-01: renders user name, class, board and tier', () => {
    setup();
    expect(screen.getByText('Arjun Sharma')).toBeInTheDocument();
    expect(screen.getByText(/Class 11/)).toBeInTheDocument();
    expect(screen.getByText(/CBSE/)).toBeInTheDocument();
    expect(screen.getByText(/free tier/i)).toBeInTheDocument();
  });

  // ── TC-PROFILE-02 ──────────────────────────────────────────────────────────
  it('TC-PROFILE-02: renders phone number', () => {
    setup();
    expect(screen.getByText('+919876543210')).toBeInTheDocument();
  });

  // ── TC-PROFILE-03 ──────────────────────────────────────────────────────────
  it('TC-PROFILE-03: language picker shows all 6 options', () => {
    setup();
    expect(screen.getAllByRole('option')).toHaveLength(6);
  });

  // ── TC-PROFILE-04 ──────────────────────────────────────────────────────────
  it('TC-PROFILE-04: selecting Tamil updates localStorage to "ta"', async () => {
    setup();
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'ta');
    expect(localStorage.getItem('vidyaai_language')).toBe('ta');
  });

  // ── TC-PROFILE-05 ──────────────────────────────────────────────────────────
  it('TC-PROFILE-05: logout button calls logout()', async () => {
    const { logout } = setup();
    await userEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(logout).toHaveBeenCalledOnce();
  });

  // ── TC-PROFILE-06 ──────────────────────────────────────────────────────────
  it('TC-PROFILE-06: returns null / empty when user is null', () => {
    // Set mock BEFORE rendering so the component sees null user
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false, isAuthenticated: false, user: null,
      verifyOtp: vi.fn(), onboard: vi.fn(), logout: vi.fn(),
    });
    const { container } = render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  // ── TC-PROFILE-07 ──────────────────────────────────────────────────────────
  it('TC-PROFILE-07: "Persists across sessions" hint text is visible', () => {
    setup();
    expect(screen.getByText(/persists across sessions/i)).toBeInTheDocument();
  });
});
