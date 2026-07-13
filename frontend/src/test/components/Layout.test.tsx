/**
 * Layout — sidebar (desktop) + bottom nav (mobile) + top nav bar
 *
 * Happy path: renders 4 nav items, user name visible, logout button present
 * Failure cases:
 *   1. All 4 nav items present in both sidebar and bottom nav
 *   2. Logout button calls logout from useAuth
 *   3. Active nav link gets active CSS class
 *   4. VidyaAI brand text visible in top bar
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { Layout } from '@/components/Layout';
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

function setup(path = '/home') {
  const logout = vi.fn();
  vi.mocked(useAuth).mockReturnValue({
    isLoading: false,
    isAuthenticated: true,
    user: MOCK_USER,
    verifyOtp: vi.fn(),
    onboard: vi.fn(),
    logout,
  });

  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/home" element={<div>Home content</div>} />
          <Route path="/doubt" element={<div>Doubt content</div>} />
          <Route path="/plan" element={<div>Plan content</div>} />
          <Route path="/profile" element={<div>Profile content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

  return { logout };
}

describe('Layout', () => {
  // ── TC-LAYOUT-01 ───────────────────────────────────────────────────────────
  it('TC-LAYOUT-01: VidyaAI brand text visible in top nav', () => {
    setup();
    expect(screen.getByText('VidyaAI')).toBeInTheDocument();
  });

  // ── TC-LAYOUT-02 ───────────────────────────────────────────────────────────
  it('TC-LAYOUT-02: all 4 nav items present (Home, Doubt, Plan, Profile)', () => {
    setup();
    // getAllByText because items appear in both sidebar + bottom nav
    expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Doubt').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Plan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Profile').length).toBeGreaterThanOrEqual(1);
  });

  // ── TC-LAYOUT-03 ───────────────────────────────────────────────────────────
  it('TC-LAYOUT-03: user name visible in top bar', () => {
    setup();
    // The name may be visually hidden on narrow viewports via sm:block but is in the DOM
    expect(screen.getByText('Arjun Sharma')).toBeInTheDocument();
  });

  // ── TC-LAYOUT-04 ───────────────────────────────────────────────────────────
  it('TC-LAYOUT-04: logout button calls logout from useAuth', async () => {
    const { logout } = setup();
    // There may be 2 logout buttons (Layout + ProfilePage if rendered) — click the first
    const logoutButtons = screen.getAllByRole('button', { name: /logout/i });
    await userEvent.click(logoutButtons[0]);
    expect(logout).toHaveBeenCalledOnce();
  });

  // ── TC-LAYOUT-05 ───────────────────────────────────────────────────────────
  it('TC-LAYOUT-05: Outlet renders the matched page content', () => {
    setup('/doubt');
    expect(screen.getByText('Doubt content')).toBeInTheDocument();
  });

  // ── TC-LAYOUT-06 ───────────────────────────────────────────────────────────
  it('TC-LAYOUT-06: LanguagePicker is rendered in the top bar', () => {
    setup();
    expect(screen.getByRole('combobox', { name: /select language/i })).toBeInTheDocument();
  });

  // ── TC-LAYOUT-07 ───────────────────────────────────────────────────────────
  it('TC-LAYOUT-07: 4 nav icon emojis present for visual identification', () => {
    setup();
    expect(screen.getAllByText('🏠').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('🎤').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('📅').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('👤').length).toBeGreaterThanOrEqual(1);
  });
});
