/**
 * ChapterPicker — Component Tests (TC-11 to TC-29)
 * Layer 1: Syllabus navigation (Subject tabs → Chapter selection)
 *
 * UI (API-backed version):
 *   - Fetches chapters from GET /api/plan/chapters on tab switch
 *   - Three subject tabs: Mathematics, Science, Social Science
 *   - Chapter rows are <div> elements (onClick), not <button>
 *   - Weak area toggle is a <button> inside each chapter row
 *   - PDF pill is a <button data-testid="pdf-btn"> that calls the presigned URL API
 *   - Sticky bottom bar shows count + generate button when any chapter selected
 *   - Generate button text: t.generateWeeklyPlan ("Mera weekly plan banao →")
 *   - onGenerate receives { subjectSelections, dailyMinutes, language }
 */

import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChapterPicker } from '@/components/plan/ChapterPicker';
import { renderWithProviders, setJwt } from '../../helpers';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), loading: vi.fn() },
  Toaster: () => null,
}));

// ── apiClient mock ────────────────────────────────────────────────────────────

const MOCK_MATHS_CHAPTERS = [
  { id: 'uuid-maths-1', chapterNumber: 1, chapterName: 'Large Numbers Around Us', estimatedMinutes: 45, difficulty: 'easy' },
  { id: 'uuid-maths-2', chapterNumber: 2, chapterName: 'Squares and Square Roots', estimatedMinutes: 50, difficulty: 'medium' },
];

const MOCK_SCIENCE_CHAPTERS = [
  { id: 'uuid-sci-1', chapterNumber: 1, chapterName: 'The Ever-Evolving World of Science', estimatedMinutes: 40, difficulty: 'easy' },
  { id: 'uuid-sci-2', chapterNumber: 2, chapterName: 'Nutrition in Plants', estimatedMinutes: 35, difficulty: 'easy' },
];

const MOCK_SOCSC_CHAPTERS = [
  { id: 'uuid-ss-1', chapterNumber: 1, chapterName: 'Geographical Diversity of India', estimatedMinutes: 45, difficulty: 'medium' },
];

const mockApiGet = vi.fn();

vi.mock('@/lib/axios', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

function chapterResponse(chapters: typeof MOCK_MATHS_CHAPTERS) {
  return Promise.resolve({ data: { chapters } });
}

// Default: Mathematics chapters on initial load, others on subsequent tabs
function setupDefaultMocks() {
  mockApiGet.mockImplementation((url: string, opts?: { params?: { subject?: string } }) => {
    const subject = opts?.params?.subject ?? 'Mathematics';
    if (url === '/api/plan/chapters') {
      if (subject === 'Science') return chapterResponse(MOCK_SCIENCE_CHAPTERS);
      if (subject === 'Social Science') return chapterResponse(MOCK_SOCSC_CHAPTERS);
      return chapterResponse(MOCK_MATHS_CHAPTERS);
    }
    if (typeof url === 'string' && url.includes('/pdf-url')) {
      return Promise.resolve({ data: { url: 'https://test-presigned.url/ch01.pdf' } });
    }
    return Promise.reject(new Error('Unknown URL'));
  });
}

const mockOnGenerate = vi.fn();

async function renderChapterPicker(generating = false) {
  setJwt();
  renderWithProviders(
    <ChapterPicker
      language="hi"
      onGenerate={mockOnGenerate}
      generating={generating}
    />,
    { initialEntries: ['/plan'] }
  );
  // Wait for initial Mathematics chapters to load
  await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
}

function getChapterRows() {
  return screen.queryAllByTestId('chapter-row');
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks();
});

// ── TC-11: Component renders immediately (shell before chapters load) ──────────

describe('TC-11: component renders its shell immediately', () => {
  it('renders the chapter library label on mount', async () => {
    await renderChapterPicker();
    expect(screen.getAllByText(/class 7 · cbse/i).length).toBeGreaterThan(0);
  });
});

// ── TC-12: Core labels render ─────────────────────────────────────────────────

describe('TC-12: renders Class 7 label and subject tabs immediately', () => {
  it('shows Class 7 · CBSE chip on mount', async () => {
    await renderChapterPicker();
    expect(screen.getAllByText(/class 7/i).length).toBeGreaterThan(0);
  });
});

// ── TC-13: All three subject tabs present ────────────────────────────────────

describe('TC-13: all three subject tabs appear on mount', () => {
  it('shows Mathematics, Science, and Social Science tabs', async () => {
    await renderChapterPicker();
    expect(screen.getByRole('button', { name: /mathematics/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /science/i }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: /social science/i })).toBeInTheDocument();
  });
});

// ── TC-14: Class 7 locked label renders ──────────────────────────────────────

describe('TC-14: class label shows Class 7 · CBSE (read-only)', () => {
  it('shows Class 7 · CBSE chip', async () => {
    await renderChapterPicker();
    const matches = screen.getAllByText(/class 7 · cbse/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});

// ── TC-15: Mathematics tab is active by default ───────────────────────────────

describe('TC-15: first subject tab (Mathematics) active by default', () => {
  it('shows Mathematics chapter rows after API loads', async () => {
    await renderChapterPicker();
    await waitFor(() =>
      expect(screen.getByText(/large numbers around us/i)).toBeInTheDocument()
    );
  });
});

// ── TC-16 & TC-17: Chapter rows with required fields ─────────────────────────

describe('TC-16 + TC-17: chapter list renders with expected fields', () => {
  it('shows chapter names and estimated minutes after API loads', async () => {
    await renderChapterPicker();
    await waitFor(() =>
      expect(screen.getByText(/large numbers around us/i)).toBeInTheDocument()
    );
    expect(screen.getAllByText(/\d+ min/i).length).toBeGreaterThan(0);
  });
});

// ── TC-18: Difficulty badges present ─────────────────────────────────────────

describe('TC-18: difficulty text visible in chapter list', () => {
  it('shows difficulty text (easy/medium/hard) in the chapter list', async () => {
    await renderChapterPicker();
    await waitFor(() => expect(getChapterRows().length).toBeGreaterThan(0));
    const difficultyEls = screen.queryAllByText(/easy|medium|hard/i);
    expect(difficultyEls.length).toBeGreaterThan(0);
  });
});

// ── TC-19: Clicking a chapter row selects it ──────────────────────────────────

describe('TC-19: clicking a chapter row selects it and shows sticky bar', () => {
  it('shows selected count in sticky bar after clicking a chapter', async () => {
    const user = userEvent.setup();
    await renderChapterPicker();
    await waitFor(() => expect(getChapterRows().length).toBeGreaterThan(0));

    await user.click(getChapterRows()[0]!);

    const stickyBar = document.querySelector('[style*="position: sticky"]');
    expect(stickyBar).not.toBeNull();
    expect(stickyBar?.textContent).toMatch(/chapters selected/i);
  });
});

// ── TC-20: No "Sab chunein" button ───────────────────────────────────────────

describe('TC-20: "Sab chunein" button does not exist in new UI', () => {
  it('does not render Sab chunein button', async () => {
    await renderChapterPicker();
    expect(screen.queryByText(/sab chunein/i)).not.toBeInTheDocument();
  });
});

// ── TC-21: Deselecting a chapter removes it ──────────────────────────────────

describe('TC-21: clicking a selected chapter row deselects it', () => {
  it('removes sticky bar when the only selected chapter is deselected', async () => {
    const user = userEvent.setup();
    await renderChapterPicker();
    await waitFor(() => expect(getChapterRows().length).toBeGreaterThan(0));

    await user.click(getChapterRows()[0]!); // select
    expect(document.querySelector('[style*="position: sticky"]')?.textContent).toMatch(
      /chapters selected/i
    );

    await user.click(getChapterRows()[0]!); // deselect
    expect(
      document.querySelector('[style*="position: sticky"]')?.textContent ?? ''
    ).not.toMatch(/chapters selected/i);
  });
});

// ── TC-22 & TC-23: Selected count shown ──────────────────────────────────────

describe('TC-22 + TC-23: selected chapter count shown in sticky bar', () => {
  it('shows "1 chapters" in sticky bar after clicking one chapter', async () => {
    const user = userEvent.setup();
    await renderChapterPicker();
    await waitFor(() => expect(getChapterRows().length).toBeGreaterThan(0));

    await user.click(getChapterRows()[0]!);

    const bar = document.querySelector('[style*="position: sticky"]');
    expect(bar?.textContent).toMatch(/1 chapters/i);
  });
});

// ── TC-24: Weak area toggle ───────────────────────────────────────────────────

describe('TC-24: weak area toggle is present for each chapter row', () => {
  it('renders weak area buttons in Mathematics chapters', async () => {
    await renderChapterPicker();
    await waitFor(() => expect(getChapterRows().length).toBeGreaterThan(0));
    const weakBtns = screen.getAllByRole('button', { name: /weak area/i });
    expect(weakBtns.length).toBeGreaterThan(0);
  });
});

// ── TC-25: Switching tabs shows correct subject chapters ──────────────────────

describe('TC-25: switching subject tabs shows that subject\'s chapters', () => {
  it('shows Science chapters after clicking the Science tab', async () => {
    const user = userEvent.setup();
    await renderChapterPicker();
    await waitFor(() =>
      expect(screen.getByText(/large numbers around us/i)).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /^science/i }));
    await waitFor(() =>
      expect(screen.getByText(/the ever-evolving world of science/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/large numbers around us/i)).not.toBeInTheDocument();
  });

  it('shows Social Science chapters after clicking that tab', async () => {
    const user = userEvent.setup();
    await renderChapterPicker();

    await user.click(screen.getByRole('button', { name: /social science/i }));
    await waitFor(() =>
      expect(screen.getByText(/geographical diversity of india/i)).toBeInTheDocument()
    );
  });
});

// ── TC-26: Generate button only appears after chapter selection ───────────────

describe('TC-26: Generate button only appears after selecting chapters', () => {
  it('generate button is not shown before any chapter is clicked', async () => {
    await renderChapterPicker();
    expect(screen.queryByText(/weekly plan banao|generateWeeklyPlan/i)).not.toBeInTheDocument();
  });

  it('generate button appears after a chapter row is clicked', async () => {
    const user = userEvent.setup();
    await renderChapterPicker();
    await waitFor(() => expect(getChapterRows().length).toBeGreaterThan(0));

    await user.click(getChapterRows()[0]!);

    const bar = document.querySelector('[style*="position: sticky"]');
    expect(bar).not.toBeNull();
    const genBtn = bar?.querySelector('button');
    expect(genBtn).not.toBeNull();
  });
});

// ── TC-27: Chapter counts match API mock data ─────────────────────────────────

describe('TC-27: each subject has the correct number of chapter rows', () => {
  it('Mathematics tab shows 2 chapter rows (mock data)', async () => {
    await renderChapterPicker();
    await waitFor(() => expect(getChapterRows()).toHaveLength(MOCK_MATHS_CHAPTERS.length));
  });

  it('Science tab shows 2 chapter rows (mock data)', async () => {
    const user = userEvent.setup();
    await renderChapterPicker();
    await user.click(screen.getByRole('button', { name: /^science/i }));
    await waitFor(() => expect(getChapterRows()).toHaveLength(MOCK_SCIENCE_CHAPTERS.length));
  });

  it('Social Science tab shows 1 chapter row (mock data)', async () => {
    const user = userEvent.setup();
    await renderChapterPicker();
    await user.click(screen.getByRole('button', { name: /social science/i }));
    await waitFor(() => expect(getChapterRows()).toHaveLength(MOCK_SOCSC_CHAPTERS.length));
  });
});

// ── TC-28: PDF button rendered per chapter row ────────────────────────────────

describe('TC-28: each chapter row has a PDF button', () => {
  it('renders a PDF button (not anchor) for every chapter row visible', async () => {
    await renderChapterPicker();
    await waitFor(() => expect(getChapterRows().length).toBeGreaterThan(0));

    const rows = getChapterRows();
    rows.forEach((row) => {
      const pdfBtn = within(row).getByTestId('pdf-btn');
      expect(pdfBtn).toBeInTheDocument();
      expect(pdfBtn.tagName).toBe('BUTTON');
    });
  });
});

// ── TC-29: PDF button calls API and opens presigned URL ───────────────────────

describe('TC-29: PDF button fetches presigned URL and opens it', () => {
  it('calls pdf-url API and opens window.open with the presigned URL', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    await renderChapterPicker();
    await waitFor(() => expect(getChapterRows().length).toBeGreaterThan(0));

    const rows = getChapterRows();
    const pdfBtn = within(rows[0]!).getByTestId('pdf-btn');
    await user.click(pdfBtn);

    await waitFor(() =>
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining('/pdf-url')
      )
    );

    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        'https://test-presigned.url/ch01.pdf',
        '_blank',
        'noopener,noreferrer'
      )
    );

    openSpy.mockRestore();
  });
});
