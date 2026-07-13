/**
 * OfflineBanner — shown when navigator.onLine is false
 *
 * Happy path: online → banner not rendered
 * Failure cases:
 *   1. Offline at mount → banner renders with warning text
 *   2. Goes offline after mount → banner appears
 *   3. Returns online after being offline → banner disappears
 *   4. Retry button triggers window.location.reload
 */
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OfflineBanner } from '@/components/OfflineBanner';

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    configurable: true,
    value,
  });
}

describe('OfflineBanner', () => {
  afterEach(() => setNavigatorOnline(true));

  // ── TC-OFFLINE-01 ──────────────────────────────────────────────────────────
  it('TC-OFFLINE-01: renders nothing when online', () => {
    setNavigatorOnline(true);
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  // ── TC-OFFLINE-02 ──────────────────────────────────────────────────────────
  it('TC-OFFLINE-02: renders warning banner when offline at mount', () => {
    setNavigatorOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByText(/No internet connection/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  // ── TC-OFFLINE-03 ──────────────────────────────────────────────────────────
  it('TC-OFFLINE-03: banner appears when offline event fires after mount', () => {
    setNavigatorOnline(true);
    render(<OfflineBanner />);
    expect(screen.queryByText(/No internet connection/i)).not.toBeInTheDocument();

    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByText(/No internet connection/i)).toBeInTheDocument();
  });

  // ── TC-OFFLINE-04 ──────────────────────────────────────────────────────────
  it('TC-OFFLINE-04: banner disappears when online event fires after going offline', () => {
    setNavigatorOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByText(/No internet connection/i)).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.queryByText(/No internet connection/i)).not.toBeInTheDocument();
  });

  // ── TC-OFFLINE-05 ──────────────────────────────────────────────────────────
  it('TC-OFFLINE-05: Retry button calls window.location.reload', async () => {
    setNavigatorOnline(false);
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...window.location, reload: reloadMock },
    });

    render(<OfflineBanner />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(reloadMock).toHaveBeenCalledOnce();
  });
});
