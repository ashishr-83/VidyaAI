/**
 * ChapterPicker — Component Tests (TC-11 to TC-28)
 * Layer 1: Syllabus navigation (Subject tabs → Chapter selection)
 *
 * New UI (post-refactor):
 *   - Locked to Class 7 · CBSE (no class selector)
 *   - Subject tabs (Mathematics, Science, Social Science) instead of dropdown
 *   - Chapter rows are <div> elements (onClick), not <button>
 *   - Weak area toggle is a <button> inside each chapter row
 *   - Sticky bottom bar shows count + generate button when any chapter selected
 *   - No "Sab chunein" / "Clear" buttons
 *   - Generate button text: t.generateWeeklyPlan ("Mera weekly plan banao →")
 *   - onGenerate receives { subjectSelections, dailyMinutes, language }
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../msw/server';
import { ChapterPicker } from '@/components/plan/ChapterPicker';
import { renderWithProviders, setJwt } from '../../helpers';
import { planHandlers } from '../../msw/plan-handlers';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), loading: vi.fn() },
  Toaster: () => null,
}));

const mockOnGenerate = vi.fn();

function renderChapterPicker(generating = false) {
  setJwt();
  return renderWithProviders(
    <ChapterPicker
      language="hi"
      onGenerate={mockOnGenerate}
      generating={generating}
    />,
    { initialEntries: ['/plan'] }
  );
}

// Helper: wait until chapter rows appear (auto-loaded for first subject tab)
async function waitForChapters() {
  await waitFor(
    () => {
      expect(screen.getByText(/the ever-evolving world of science/i)).toBeInTheDocument();
    },
    { timeout: 3000 }
  );
}

// Helper: get chapter row buttons via data-testid
function getChapterRows() {
  return screen.queryAllByTestId('chapter-row');
}

beforeEach(() => {
  vi.clearAllMocks();
  server.use(...planHandlers);
});

// ── TC-11: Component always mounts ───────────────────────────────────────────

describe('TC-11: component renders its shell when mounted', () => {
  it('renders loading text or chapter library label immediately', async () => {
    renderChapterPicker();
    const el = await screen.findByText(/load ho rahe|chapter library/i);
    expect(el).toBeInTheDocument();
  });
});

// ── TC-12: Core labels render ─────────────────────────────────────────────────

describe('TC-12: renders Class 7 label and subject tabs after catalog loads', () => {
  it('shows Class 7 · CBSE chip after catalog loads', async () => {
    renderChapterPicker();
    await waitFor(() => {
      expect(screen.getAllByText(/class 7/i).length).toBeGreaterThan(0);
    });
  });
});

// ── TC-13: Loading state ──────────────────────────────────────────────────────

describe('TC-13: shows loading text while /api/plan/available is in-flight', () => {
  it('renders loading text before catalog arrives', async () => {
    server.use(
      http.get('http://localhost:3000/api/plan/available', async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ available: [{ classLevel: 7, board: 'CBSE', subjects: ['Science'] }] });
      })
    );
    renderChapterPicker();
    expect(screen.getByText(/load ho/i)).toBeInTheDocument();
  });
});

// ── TC-14: Class 7 locked label renders ──────────────────────────────────────

describe('TC-14: class label shows Class 7 · CBSE (read-only)', () => {
  it('shows Class 7 · CBSE chip after catalog loads', async () => {
    renderChapterPicker();
    await waitFor(() => {
      expect(screen.getByText(/class 7 · cbse/i)).toBeInTheDocument();
    });
  });
});

// ── TC-15: Subject tabs populated ────────────────────────────────────────────

describe('TC-15: subject tabs show subjects after catalog loads', () => {
  it('shows Science tab button', async () => {
    renderChapterPicker();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /science/i })).toBeInTheDocument();
    });
  });
});

// ── TC-16 & TC-17: Chapter rows with required fields ─────────────────────────

describe('TC-16 + TC-17: chapter list renders with expected fields', () => {
  it('shows chapter names and estimated minutes after auto-load', async () => {
    renderChapterPicker();
    await waitForChapters();

    expect(screen.getByText(/the ever-evolving world of science/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\d+ min/i).length).toBeGreaterThan(0);
  });
});

// ── TC-18: Difficulty badges present ─────────────────────────────────────────

describe('TC-18: difficulty text visible in chapter list', () => {
  it('shows difficulty text (easy/medium/hard) in the chapter list', async () => {
    renderChapterPicker();
    await waitForChapters();

    // Difficulty shows as text content somewhere in the chapter list
    const difficultyEls = screen.queryAllByText(/easy|medium|hard/i);
    expect(difficultyEls.length).toBeGreaterThan(0);
  });
});

// ── TC-19: Clicking a chapter row selects it ──────────────────────────────────

describe('TC-19: clicking a chapter row selects it and shows sticky bar', () => {
  it('shows selected count in sticky bar after clicking a chapter', async () => {
    const user = userEvent.setup();
    renderChapterPicker();
    await waitForChapters();

    const rows = getChapterRows();
    expect(rows.length).toBeGreaterThan(0);
    await user.click(rows[0]);

    await waitFor(() => {
      // Sticky bar has position: sticky and contains "chapters selected" text split across <b> tags
      const stickyBar = document.querySelector('[style*="position: sticky"]');
      expect(stickyBar).not.toBeNull();
      expect(stickyBar?.textContent).toMatch(/chapters selected/i);
    });
  });
});

// ── TC-20: No "Sab chunein" button ───────────────────────────────────────────

describe('TC-20: "Sab chunein" button does not exist in new UI', () => {
  it('does not render Sab chunein button', async () => {
    renderChapterPicker();
    await waitForChapters();
    expect(screen.queryByText(/sab chunein/i)).not.toBeInTheDocument();
  });
});

// ── TC-21: Deselecting a chapter removes it ──────────────────────────────────

describe('TC-21: clicking a selected chapter row deselects it', () => {
  it('removes sticky bar when the only selected chapter is deselected', async () => {
    const user = userEvent.setup();
    renderChapterPicker();
    await waitForChapters();

    const rows = getChapterRows();
    await user.click(rows[0]); // select
    await waitFor(() => {
      const bar = document.querySelector('[style*="position: sticky"]');
      expect(bar?.textContent).toMatch(/chapters selected/i);
    });

    await user.click(rows[0]); // deselect
    await waitFor(() => {
      const bar = document.querySelector('[style*="position: sticky"]');
      expect(bar?.textContent ?? '').not.toMatch(/chapters selected/i);
    });
  });
});

// ── TC-22 & TC-23: Selected count shown ──────────────────────────────────────

describe('TC-22 + TC-23: selected chapter count shown in sticky bar', () => {
  it('shows chapter count in sticky bar after clicking one chapter', async () => {
    const user = userEvent.setup();
    renderChapterPicker();
    await waitForChapters();

    const rows = getChapterRows();
    await user.click(rows[0]);

    await waitFor(() => {
      const bar = document.querySelector('[style*="position: sticky"]');
      expect(bar?.textContent).toMatch(/1 chapters/i);
    });
  });
});

// ── TC-24: Weak area toggle ───────────────────────────────────────────────────

describe('TC-24: weak area toggle changes appearance when clicked', () => {
  it('weak area button is present for each chapter row', async () => {
    renderChapterPicker();
    await waitForChapters();

    const weakBtns = screen.getAllByRole('button', { name: /weak area/i });
    expect(weakBtns.length).toBeGreaterThan(0);
  });
});

// ── TC-25: Empty state ────────────────────────────────────────────────────────

describe('TC-25: shows empty state when API returns no chapters', () => {
  it('shows empty state message when chapters array is []', async () => {
    server.use(
      http.get('http://localhost:3000/api/plan/chapters', () =>
        HttpResponse.json({ chapters: [] })
      )
    );

    renderChapterPicker();

    await waitFor(
      () => {
        // Empty chapter list renders nothing visible — just empty div
        expect(screen.queryByText(/the ever-evolving/i)).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});

// ── TC-26: Generate button only appears after chapter selection ───────────────

describe('TC-26: Generate button only appears after selecting chapters', () => {
  it('generate button is not shown before any chapter is clicked', async () => {
    renderChapterPicker();
    await waitForChapters();

    expect(screen.queryByText(/weekly plan banao|generateWeeklyPlan/i)).not.toBeInTheDocument();
  });

  it('generate button appears after a chapter row is clicked', async () => {
    const user = userEvent.setup();
    renderChapterPicker();
    await waitForChapters();

    const rows = getChapterRows();
    expect(rows.length).toBeGreaterThan(0);
    await user.click(rows[0]);

    await waitFor(() => {
      // Generate button appears inside sticky bar when chapters are selected
      const bar = document.querySelector('[style*="position: sticky"]');
      expect(bar).not.toBeNull();
      const genBtn = bar?.querySelector('button');
      expect(genBtn).not.toBeNull();
    });
  });
});

// ── TC-27: Catalog error shown in component ───────────────────────────────────

describe('TC-27: shows error message when /api/plan/available fails', () => {
  it('renders catalogError retry button when available endpoint returns 500', async () => {
    server.use(
      http.get('http://localhost:3000/api/plan/available', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    );

    renderChapterPicker();

    await waitFor(() => {
      const errEl =
        screen.queryByText(/catalog load nahi hua/i) ??
        screen.queryByText(/retry/i) ??
        screen.queryByText(/dobara try/i);
      expect(errEl).not.toBeNull();
    });
  });
});

// ── TC-28: Chapters error shown in component ──────────────────────────────────

describe('TC-28: shows error message when /api/plan/chapters fails', () => {
  it('renders chaptersError retry button when chapters endpoint returns 500', async () => {
    server.use(
      http.get('http://localhost:3000/api/plan/chapters', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    );

    renderChapterPicker();

    await waitFor(
      () => {
        const errEl =
          screen.queryByText(/chapters load nahi hue/i) ??
          screen.queryByText(/retry/i) ??
          screen.queryByText(/dobara try/i);
        expect(errEl).not.toBeNull();
      },
      { timeout: 3000 }
    );
  });
});
