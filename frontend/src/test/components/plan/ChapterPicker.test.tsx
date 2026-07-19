/**
 * ChapterPicker — Component Tests (TC-11 to TC-28)
 * Layer 1: Syllabus navigation (Subject → Chapter selection)
 *
 * ChapterPicker is an inline component (no modal).
 * Props: { language, onGenerate, generating }
 *
 * DOM reality (from reading the component):
 *   - Chapters are <button> elements containing chapter name + difficulty badge
 *   - The "checkbox" is a styled <div> inside each chapter button — NOT <input>
 *   - "Sab chunein" and "Clear" are <button> elements
 *   - Generate button "🎯 Study Plan Banao" only renders when selectedIds.length > 0
 *   - Auto-loads chapters on mount (catalog → auto-select first class/subject → chapters)
 *
 * Timing: two sequential async calls on mount — needs 3s timeout for chapter load.
 *
 * Mock: MSW for /api/plan/available and /api/plan/chapters
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

// Helper: wait until chapter buttons appear (auto-loaded after two sequential API calls)
// Timeout is 3s because: GET /available → setState → GET /chapters chain takes ~1.5s in tests
async function waitForChapters() {
  await waitFor(
    () => {
      // Chapter buttons have chapter names as text content
      // We identify them by the presence of chapter name text
      expect(screen.getByText(/the ever-evolving world of science/i)).toBeInTheDocument();
    },
    { timeout: 3000 }
  );
}

// Helper: get all chapter row buttons (excludes Sab chunein, Clear, ←)
function getChapterButtons() {
  return screen.getAllByRole('button').filter((b) =>
    b.textContent !== null &&
    !['Sab chunein', 'Clear', '←', '🎯 Study Plan Banao', '⏳ Plan ban raha hai...'].includes(b.textContent.trim()) &&
    b.textContent.trim().length > 0
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  server.use(...planHandlers);
});

// ── TC-11: Component always mounts ───────────────────────────────────────────

describe('TC-11: component renders its shell when mounted', () => {
  it('renders NCERT Chapters heading or loading text immediately', async () => {
    renderChapterPicker();
    const el = await screen.findByText(/ncert chapters|load ho/i);
    expect(el).toBeInTheDocument();
  });
});

// ── TC-12: Core labels render ─────────────────────────────────────────────────

describe('TC-12: renders Class and Subject labels after catalog loads', () => {
  it('shows Class and Subject labels', async () => {
    renderChapterPicker();
    await waitFor(() => {
      expect(screen.getByText('Class')).toBeInTheDocument();
      expect(screen.getByText('Subject')).toBeInTheDocument();
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

// ── TC-14: Class dropdown populated ──────────────────────────────────────────

describe('TC-14: class dropdown populates from API response', () => {
  it('shows "Class 7" option after catalog loads', async () => {
    renderChapterPicker();
    await waitFor(() => {
      expect(screen.getByText(/class 7/i)).toBeInTheDocument();
    });
  });
});

// ── TC-15: Subject dropdown populated ────────────────────────────────────────

describe('TC-15: subject dropdown shows subjects after catalog loads', () => {
  it('shows Science option in subject dropdown', async () => {
    renderChapterPicker();
    await waitFor(() => {
      expect(screen.getByText('Science')).toBeInTheDocument();
    });
  });
});

// ── TC-16 & TC-17: Chapter buttons with required fields ──────────────────────

describe('TC-16 + TC-17: chapter list renders with expected fields', () => {
  it('shows chapter names and estimated minutes after auto-load', async () => {
    renderChapterPicker();
    await waitForChapters();

    expect(screen.getByText(/the ever-evolving world of science/i)).toBeInTheDocument();
    // Estimated minutes shown as "~60 min" — multiple chapters have 60 min
    expect(screen.getAllByText(/~60 min/i).length).toBeGreaterThan(0);
  });
});

// ── TC-18: Difficulty badges present ─────────────────────────────────────────

describe('TC-18: difficulty badges show correct labels', () => {
  it('shows easy and hard difficulty text in the chapter list', async () => {
    renderChapterPicker();
    await waitForChapters();

    expect(screen.getAllByText(/^easy$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^hard$/i).length).toBeGreaterThan(0);
  });
});

// ── TC-19: Clicking a chapter button selects it ───────────────────────────────

describe('TC-19: clicking a chapter button selects it', () => {
  it('shows chapter count indicator after clicking a chapter', async () => {
    const user = userEvent.setup();
    renderChapterPicker();
    await waitForChapters();

    const chapterBtns = getChapterButtons();
    await user.click(chapterBtns[0]);

    await waitFor(() => {
      // After selecting 1 chapter, the stats line appears: "1 chapters · ~X min total · ~Y din"
      expect(screen.getByText(/1 chapters/i)).toBeInTheDocument();
    });
  });
});

// ── TC-20: "Sab chunein" selects all ─────────────────────────────────────────

describe('TC-20: "Sab chunein" selects all chapters', () => {
  it('shows multi-chapter stats after clicking Sab chunein', async () => {
    const user = userEvent.setup();
    renderChapterPicker();
    await waitForChapters();

    await user.click(screen.getByText('Sab chunein'));

    await waitFor(() => {
      // All 12 chapters selected → shows stats: "12 chapters · ..."
      expect(screen.getByText(/12 chapters/i)).toBeInTheDocument();
    });
  });
});

// ── TC-21: "Clear" deselects all ─────────────────────────────────────────────

describe('TC-21: Clear button deselects all chapters', () => {
  it('removes the stats line after Clear is clicked', async () => {
    const user = userEvent.setup();
    renderChapterPicker();
    await waitForChapters();

    await user.click(screen.getByText('Sab chunein'));
    await waitFor(() => screen.getByText(/12 chapters/i));

    await user.click(screen.getByText('Clear'));

    await waitFor(() => {
      expect(screen.queryByText(/\d+ chapters/i)).not.toBeInTheDocument();
    });
  });
});

// ── TC-22 & TC-23: Chapter count shown ───────────────────────────────────────

describe('TC-22 + TC-23: selected chapter count shown in stats', () => {
  it('shows count in stats line after selecting chapters with Sab chunein', async () => {
    const user = userEvent.setup();
    renderChapterPicker();
    await waitForChapters();

    await user.click(screen.getByText('Sab chunein'));

    await waitFor(() => {
      const statsText = screen.getByText(/\d+ chapters/i).textContent ?? '';
      const match = statsText.match(/(\d+) chapters/);
      const count = match ? parseInt(match[1], 10) : 0;
      expect(count).toBeGreaterThan(0);
    });
  });
});

// ── TC-24: Estimated days shows after selection ───────────────────────────────

describe('TC-24: estimated days appears after chapters are selected', () => {
  it('shows "din" estimate after selecting chapters', async () => {
    const user = userEvent.setup();
    renderChapterPicker();
    await waitForChapters();

    const chapterBtns = getChapterButtons();
    await user.click(chapterBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/din/i)).toBeInTheDocument();
    });
  });
});

// ── TC-25: Empty state ────────────────────────────────────────────────────────

describe('TC-25: shows empty-state when API returns no chapters', () => {
  it('shows empty-state message when chapters array is []', async () => {
    server.use(
      http.get('http://localhost:3000/api/plan/chapters', () =>
        HttpResponse.json({ chapters: [] })
      )
    );

    renderChapterPicker();

    await waitFor(
      () => {
        const emptyEl =
          screen.queryByText(/nahi hain/i) ??
          screen.queryByText(/extract karo/i) ??
          screen.queryByText(/koi chapter/i);
        expect(emptyEl).not.toBeNull();
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

    // Button only renders when selectedIds.length > 0
    expect(screen.queryByText(/study plan banao/i)).not.toBeInTheDocument();
  });

  it('generate button appears after a chapter is selected', async () => {
    const user = userEvent.setup();
    renderChapterPicker();
    await waitForChapters();

    const chapterBtns = getChapterButtons();
    await user.click(chapterBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/study plan banao/i)).toBeInTheDocument();
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
