/**
 * AuthGuard — route protection wrapper
 *
 * Happy path: authenticated + onboarded → renders children
 * Failure cases:
 *   1. Loading state → spinner shown, no redirect
 *   2. Not authenticated → redirects to /auth/login
 *   3. Authenticated but class=0 (not onboarded) → redirects to /auth/onboard
 *   4. Authenticated + onboarded → children rendered, no redirect
 *
 * Mock: useAuth hook
 * Real: React Router MemoryRouter
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AuthGuard } from '@/components/AuthGuard';
import type { User } from '@/hooks/useAuth';

// Mock useAuth so we control its output without any API calls
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

function setup(initialPath = '/home') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/home"
          element={
            <AuthGuard>
              <div>Protected content</div>
            </AuthGuard>
          }
        />
        <Route path="/auth/login" element={<div>Login page</div>} />
        <Route path="/auth/onboard" element={<div>Onboard page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthGuard', () => {
  // ── TC-GUARD-01 ────────────────────────────────────────────────────────────
  it('TC-GUARD-01: isLoading=true → renders loading spinner, no redirect', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      verifyOtp: vi.fn(),
      onboard: vi.fn(),
      logout: vi.fn(),
    });

    setup();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('Phone page')).not.toBeInTheDocument();
  });

  // ── TC-GUARD-02 ────────────────────────────────────────────────────────────
  it('TC-GUARD-02: not authenticated → redirects to /auth/login', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      verifyOtp: vi.fn(),
      onboard: vi.fn(),
      logout: vi.fn(),
    });

    setup();
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  // ── TC-GUARD-03 ────────────────────────────────────────────────────────────
  it('TC-GUARD-03: authenticated but class=0 → redirects to /auth/onboard', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { ...MOCK_USER, class: 0, name: '', board: '' },
      verifyOtp: vi.fn(),
      onboard: vi.fn(),
      logout: vi.fn(),
    });

    setup();
    expect(screen.getByText('Onboard page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  // ── TC-GUARD-04 ────────────────────────────────────────────────────────────
  it('TC-GUARD-04: authenticated and onboarded → children rendered', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: MOCK_USER,
      verifyOtp: vi.fn(),
      onboard: vi.fn(),
      logout: vi.fn(),
    });

    setup();
    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    expect(screen.queryByText('Onboard page')).not.toBeInTheDocument();
  });
});
