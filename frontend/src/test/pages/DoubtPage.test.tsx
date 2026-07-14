/**
 * DoubtPage — Component Tests
 * Tests the doubt solver UI: text input, subject selection, mic button,
 * language display, and static content rendering.
 *
 * Happy path: renders with subject chips, text input, mic button visible;
 *   subject chip toggles active state; text input accepts user typing.
 *
 * 3 critical failure cases:
 *   1. No subject selected → placeholder text reflects "doubt" (not subject-specific)
 *   2. Mic button toggles recording state on click
 *   3. Language label reflects the stored language (via useLanguage hook)
 *
 * Mock: useLanguage (controls displayed language label)
 * Real: React rendering, DOM interactions via userEvent, MemoryRouter
 *
 * Note: DoubtPage currently renders the UI shell only — API calls are not
 * yet wired to the submit button. Tests cover what IS implemented so that
 * future API integration doesn't break the UI contract.
 */

import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DoubtPage } from '@/pages/doubt/DoubtPage';
import { renderWithProviders, setJwt } from '../helpers';

// ── Extend the global react-hot-toast mock to include Toaster component ──────
// setup.ts mocks only `default`/`error`/`success`/`loading`. helpers.tsx renders
// <Toaster /> so we must add it here to prevent "no export" errors.
vi.mock('react-hot-toast', async () => {
  const actual = await vi.importActual<typeof import('react-hot-toast')>('react-hot-toast');
  return {
    ...actual,
    default: { error: vi.fn(), success: vi.fn(), loading: vi.fn() },
    Toaster: () => null,
  };
});

// ── Mock useLanguage — controls what language label renders in the top bar ────
vi.mock('@/hooks/useLanguage');
import { useLanguage } from '@/hooks/useLanguage';

function setupLanguage(code: string = 'hi') {
  vi.mocked(useLanguage).mockReturnValue({
    language: code,
    setLanguage: vi.fn(),
  });
}

// ── Render helper ─────────────────────────────────────────────────────────────
function renderDoubtPage() {
  setJwt();
  return renderWithProviders(<DoubtPage />, { initialEntries: ['/doubt'] });
}

// ── TC-FE-01 — Page structure renders ────────────────────────────────────────

describe('TC-FE-01 — DoubtPage renders core UI structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupLanguage('hi');
  });

  it('renders page title "Voice Doubt Solver"', () => {
    // Arrange + Act
    renderDoubtPage();

    // Assert
    expect(screen.getByText('Voice Doubt Solver')).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    renderDoubtPage();
    expect(screen.getByText(/select subject & tap mic/i)).toBeInTheDocument();
  });

  it('renders all 4 subject chips (Physics, Chemistry, Maths, Biology)', () => {
    renderDoubtPage();
    // Physics appears twice (subject chip + doubt history badge) — use getAllBy
    expect(screen.getAllByText('Physics').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Chemistry').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Maths')).toBeInTheDocument();
    expect(screen.getByText('Biology')).toBeInTheDocument();
  });

  it('renders text input with correct placeholder (no subject selected)', () => {
    renderDoubtPage();
    const input = screen.getByPlaceholderText(/type your doubt here/i);
    expect(input).toBeInTheDocument();
  });

  it('renders the OR divider between mic and text input', () => {
    renderDoubtPage();
    expect(screen.getByText(/or type your doubt/i)).toBeInTheDocument();
  });

  it('renders Submit and Upload Photo buttons', () => {
    renderDoubtPage();
    expect(screen.getByText(/submit/i)).toBeInTheDocument();
    expect(screen.getByText(/upload photo/i)).toBeInTheDocument();
  });
});

// ── TC-FE-02 — Mic button toggles recording state ────────────────────────────

describe('TC-FE-02 — Mic button toggles recording state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupLanguage('hi');
  });

  it('shows mic emoji when not recording', () => {
    renderDoubtPage();
    expect(screen.getByText('🎤')).toBeInTheDocument();
  });

  it('shows "Tap the mic to ask your doubt" when idle', () => {
    renderDoubtPage();
    expect(screen.getByText(/tap the mic to ask your doubt/i)).toBeInTheDocument();
  });

  it('shows "Listening…" after mic button is clicked', async () => {
    renderDoubtPage();
    const micButton = screen.getByText('🎤').closest('button')!;

    // Act
    await userEvent.click(micButton);

    // Assert — recording state is active
    expect(screen.getByText('Listening…')).toBeInTheDocument();
    expect(screen.queryByText(/tap the mic to ask your doubt/i)).not.toBeInTheDocument();
  });

  it('shows "● REC" indicator while recording', async () => {
    renderDoubtPage();
    const micButton = screen.getByText('🎤').closest('button')!;
    await userEvent.click(micButton);
    expect(screen.getByText(/● REC/)).toBeInTheDocument();
  });

  it('returns to idle state after second click (toggle off)', async () => {
    renderDoubtPage();
    const micButton = screen.getByText('🎤').closest('button')!;

    await userEvent.click(micButton); // start recording
    expect(screen.getByText('Listening…')).toBeInTheDocument();

    const recButton = screen.getByText(/● REC/).closest('button')!;
    await userEvent.click(recButton); // stop recording

    expect(screen.getByText(/tap the mic to ask your doubt/i)).toBeInTheDocument();
  });
});

// ── TC-FE-03 — Subject chip selection ────────────────────────────────────────

describe('TC-FE-03 — Subject chip selection behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupLanguage('hi');
  });

  it('clicking Physics chip updates input placeholder to include Physics', async () => {
    renderDoubtPage();
    // Physics chip is inside a <button> — get the chip buttons in the subject chip row
    // The subject chip row is the first group of 4 subject buttons
    const physicsButtons = screen.getAllByText('Physics');
    // The chip button is the first occurrence (chip area is before history)
    const physicsChipButton = physicsButtons[0].closest('button')!;

    // Act
    await userEvent.click(physicsChipButton);

    // Assert — placeholder now mentions Physics
    expect(
      screen.getByPlaceholderText(/type your physics doubt here/i)
    ).toBeInTheDocument();
  });

  it('clicking active subject chip again deselects it (placeholder reverts)', async () => {
    renderDoubtPage();
    const physicsButtons = screen.getAllByText('Physics');
    const physicsChipButton = physicsButtons[0].closest('button')!;

    await userEvent.click(physicsChipButton); // select
    await userEvent.click(physicsChipButton); // deselect

    expect(screen.getByPlaceholderText(/type your doubt here/i)).toBeInTheDocument();
  });

  it('clicking a subject also updates the mic subtitle text', async () => {
    renderDoubtPage();
    // Chemistry only appears once (no Chemistry history entry in left panel chip row context)
    const chemButtons = screen.getAllByText('Chemistry');
    const chemChipButton = chemButtons[0].closest('button')!;
    await userEvent.click(chemChipButton);
    expect(screen.getByText(/speak clearly about chemistry/i)).toBeInTheDocument();
  });

  it('only one subject can be active at a time', async () => {
    renderDoubtPage();
    const physicsChipButton = screen.getAllByText('Physics')[0].closest('button')!;
    const biologyButton = screen.getByText('Biology').closest('button')!;

    await userEvent.click(physicsChipButton);
    await userEvent.click(biologyButton);

    // Physics placeholder should be gone, Biology should be active
    expect(screen.queryByPlaceholderText(/type your physics doubt here/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type your biology doubt here/i)).toBeInTheDocument();
  });
});

// ── TC-FE-04 — Text input accepts student typing ─────────────────────────────

describe('TC-FE-04 — Text input accepts student typing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupLanguage('hi');
  });

  it('typing a question updates the input value', async () => {
    renderDoubtPage();
    const input = screen.getByPlaceholderText(/type your doubt here/i) as HTMLInputElement;

    // Act
    await userEvent.type(input, 'Newton ka teen kanoon kya hai?');

    // Assert
    expect(input.value).toBe('Newton ka teen kanoon kya hai?');
  });

  it('accepts Hindi Devanagari text', async () => {
    renderDoubtPage();
    const input = screen.getByPlaceholderText(/type your doubt here/i) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'न्यूटन के तीन नियम क्या हैं?' } });

    expect(input.value).toBe('न्यूटन के तीन नियम क्या हैं?');
  });

  it('accepts Tamil script text', async () => {
    renderDoubtPage();
    const input = screen.getByPlaceholderText(/type your doubt here/i) as HTMLInputElement;

    fireEvent.change(input, {
      target: { value: 'ஒளிச்சேர்க்கை என்றால் என்ன?' },
    });

    expect(input.value).toBe('ஒளிச்சேர்க்கை என்றால் என்ன?');
  });
});

// ── TC-FE-05 — Language label in top bar ─────────────────────────────────────

describe('TC-FE-05 — Language label reflects stored language', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "Hindi" when language is "hi"', () => {
    setupLanguage('hi');
    renderDoubtPage();
    expect(screen.getByText(/🇮🇳 Hindi/)).toBeInTheDocument();
  });

  it('shows "Tamil" when language is "ta"', () => {
    setupLanguage('ta');
    renderDoubtPage();
    expect(screen.getByText(/🇮🇳 Tamil/)).toBeInTheDocument();
  });

  it('shows "English" when language is "en"', () => {
    setupLanguage('en');
    renderDoubtPage();
    expect(screen.getByText(/🇮🇳 English/)).toBeInTheDocument();
  });
});

// ── TC-FE-06 — Right panel content ───────────────────────────────────────────

describe('TC-FE-06 — Right panel renders correctly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupLanguage('hi');
  });

  it('renders "How to Ask Better Doubts" tip card', () => {
    renderDoubtPage();
    expect(screen.getByText(/how to ask better doubts/i)).toBeInTheDocument();
  });

  it('renders Today\'s Doubts section', () => {
    renderDoubtPage();
    expect(screen.getByText(/today's doubts/i)).toBeInTheDocument();
  });

  it('shows free tier usage count "2/3 free used"', () => {
    renderDoubtPage();
    expect(screen.getByText(/2\/3 free used/i)).toBeInTheDocument();
  });

  it('renders Upgrade to Plus CTA', () => {
    renderDoubtPage();
    expect(screen.getByText(/upgrade to plus/i)).toBeInTheDocument();
    expect(screen.getByText(/₹199\/month/i)).toBeInTheDocument();
  });

  it('shows animated whiteboard hint in tip card', () => {
    renderDoubtPage();
    expect(screen.getByText(/animated whiteboards/i)).toBeInTheDocument();
  });
});

// ── TC-FE-07 — Static doubt history renders ───────────────────────────────────

describe('TC-FE-07 — Static doubt history in right panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupLanguage('hi');
  });

  it('renders both static doubt history entries', () => {
    renderDoubtPage();
    expect(screen.getByText("Newton's third law?")).toBeInTheDocument();
    expect(screen.getByText('How does a covalent bond form?')).toBeInTheDocument();
  });

  it('renders whiteboard indicator for qualifying doubt', () => {
    renderDoubtPage();
    // The whiteboard indicator is "· ✨ Whiteboard" — rendered as text node alongside time
    // Use getByText with a substring match on the container
    expect(screen.getByText(/✨ Whiteboard/)).toBeInTheDocument();
  });
});
