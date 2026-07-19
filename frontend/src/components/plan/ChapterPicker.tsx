import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/axios';
import type { ChapterListItem } from '../../types/plan';

// Shape returned by GET /api/plan/available
interface AvailableGroup {
  classLevel: number;
  board: string;
  subjects: string[];
}

interface GenerateParams {
  chapterIds: string[];
  dailyMinutes: number;
  language: string;
  subject: string;
  classLevel: number;
}

interface Props {
  language: string;
  onGenerate: (params: GenerateParams) => void;
  generating: boolean;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: '#10B981',
  medium: '#F59E0B',
  hard: '#EF4444',
};

export function ChapterPicker({ language, onGenerate, generating }: Props) {
  // ── Available class/subject catalog ─────────────────────────────────────────
  const [catalog, setCatalog] = useState<AvailableGroup[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // ── User selections ──────────────────────────────────────────────────────────
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dailyMinutes, setDailyMinutes] = useState(120);

  // ── Chapter list for current class/subject ───────────────────────────────────
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersError, setChaptersError] = useState<string | null>(null);

  // Load available catalog on mount
  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const res = await apiClient.get<{ available: AvailableGroup[] }>('/api/plan/available');
      const groups = res.data.available;
      setCatalog(groups);

      // Auto-select the first class/subject if nothing chosen yet
      if (groups.length > 0 && !selectedClass) {
        const first = groups[0];
        setSelectedClass(first.classLevel);
        setSelectedSubject(first.subjects[0] ?? null);
      }
    } catch {
      setCatalogError('Catalog load nahi hua — dobara try karo');
    } finally {
      setCatalogLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { void fetchCatalog(); }, [fetchCatalog]);

  // Load chapters whenever class/subject changes
  const fetchChapters = useCallback(async (classLevel: number, subject: string) => {
    setChaptersLoading(true);
    setChaptersError(null);
    setSelectedIds([]);
    setChapters([]);
    try {
      const res = await apiClient.get<{ chapters: ChapterListItem[] }>('/api/plan/chapters', {
        params: { class: classLevel, board: 'CBSE', subject },
      });
      setChapters(res.data.chapters);
    } catch {
      setChaptersError('Chapters load nahi hue — dobara try karo');
    } finally {
      setChaptersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClass !== null && selectedSubject !== null) {
      void fetchChapters(selectedClass, selectedSubject);
    }
  }, [selectedClass, selectedSubject, fetchChapters]);

  // Available subjects for currently selected class
  const availableSubjects =
    catalog.find((g) => g.classLevel === selectedClass)?.subjects ?? [];

  const toggleChapter = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else if (selectedIds.length < 12) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const totalEstimatedMinutes = chapters
    .filter((c) => selectedIds.includes(c.id))
    .reduce((sum, c) => sum + c.estimatedMinutes, 0);
  const estimatedDays =
    dailyMinutes > 0 ? Math.ceil(totalEstimatedMinutes / dailyMinutes) : 0;

  const handleGenerate = () => {
    if (!selectedClass || !selectedSubject) return;
    onGenerate({ chapterIds: selectedIds, dailyMinutes, language, subject: selectedSubject, classLevel: selectedClass });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (catalogLoading) {
    return (
      <CardShell>
        <div style={{ textAlign: 'center', padding: '32px', color: '#6B7280', fontSize: '13px' }}>
          Available classes load ho rahi hain...
        </div>
      </CardShell>
    );
  }

  if (catalogError) {
    return (
      <CardShell>
        <div style={{ textAlign: 'center', padding: '32px', color: '#EF4444', fontSize: '13px' }}>
          {catalogError}
          <button onClick={fetchCatalog} style={linkBtnStyle}>Retry</button>
        </div>
      </CardShell>
    );
  }

  if (catalog.length === 0) {
    return (
      <CardShell>
        <div style={{ textAlign: 'center', padding: '32px', color: '#6B7280', fontSize: '13px' }}>
          Koi chapter nahi mila. Pehle <code>npm run extract:chapters</code> chalao.
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0D1B3E', margin: 0 }}>
          NCERT Chapters
        </h2>
        <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0' }}>
          Class aur subject chuniye, phir chapters select karo
        </p>
      </div>

      {/* Class + Subject selectors */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <label style={labelStyle}>Class</label>
          <select
            value={selectedClass ?? ''}
            onChange={(e) => {
              const cls = Number(e.target.value);
              setSelectedClass(cls);
              const grp = catalog.find((g) => g.classLevel === cls);
              setSelectedSubject(grp?.subjects[0] ?? null);
            }}
            style={selectStyle}
          >
            {catalog.map((g) => (
              <option key={g.classLevel} value={g.classLevel}>
                Class {g.classLevel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Subject</label>
          <select
            value={selectedSubject ?? ''}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={selectStyle}
            disabled={availableSubjects.length === 0}
          >
            {availableSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <button onClick={() => setSelectedIds(chapters.map((c) => c.id))} style={chipBtn('#F3F4F6', '#374151')}>
            Sab chunein
          </button>
          <button onClick={() => setSelectedIds([])} style={chipBtn('#F3F4F6', '#374151')}>
            Clear
          </button>
        </div>
      </div>

      {/* Chapter list */}
      {chaptersLoading && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#6B7280', fontSize: '13px' }}>
          Chapters load ho rahe hain...
        </div>
      )}

      {chaptersError && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#EF4444', fontSize: '13px' }}>
          {chaptersError}
          <button
            onClick={() => selectedClass && selectedSubject && void fetchChapters(selectedClass, selectedSubject)}
            style={linkBtnStyle}
          >
            Retry
          </button>
        </div>
      )}

      {!chaptersLoading && !chaptersError && chapters.length === 0 && selectedSubject && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#6B7280', fontSize: '13px' }}>
          Is class/subject ke chapters DB mein nahi hain. Extract karo pehle.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {chapters.map((ch) => {
          const isSelected = selectedIds.includes(ch.id);
          return (
            <button
              key={ch.id}
              onClick={() => toggleChapter(ch.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                border: `1.5px solid ${isSelected ? '#FF6B00' : '#E5E7EB'}`,
                borderRadius: '10px',
                background: isSelected ? '#FFF7F0' : '#FAFAFA',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                width: '100%',
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                border: `2px solid ${isSelected ? '#FF6B00' : '#D1D5DB'}`,
                background: isSelected ? '#FF6B00' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Chapter number badge */}
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                background: isSelected ? '#FF6B00' : '#F3F4F6',
                color: isSelected ? '#fff' : '#6B7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
              }}>
                {ch.chapterNumber}
              </div>

              {/* Name + time */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0D1B3E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ch.chapterName}
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                  ~{ch.estimatedMinutes} min
                </div>
              </div>

              {/* Difficulty badge */}
              <div style={{
                padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                flexShrink: 0, textTransform: 'capitalize',
                background: `${DIFFICULTY_COLOR[ch.difficulty] ?? '#9CA3AF'}20`,
                color: DIFFICULTY_COLOR[ch.difficulty] ?? '#9CA3AF',
              }}>
                {ch.difficulty}
              </div>
            </button>
          );
        })}
      </div>

      {/* Daily minutes + Generate */}
      {selectedIds.length > 0 && (
        <div style={{
          marginTop: '20px', padding: '16px',
          background: '#F9FAFB', borderRadius: '12px', border: '1.5px solid #E5E7EB',
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={labelStyle}>Roz kitne minute?</label>
              <select
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                style={selectStyle}
              >
                {[60, 90, 120, 180, 240].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, fontSize: '12px', color: '#6B7280' }}>
              {selectedIds.length} chapters · ~{totalEstimatedMinutes} min total · ~{estimatedDays} din
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || selectedIds.length === 0}
              style={{
                padding: '10px 20px', border: 'none', borderRadius: '10px',
                background: generating ? '#9CA3AF' : '#FF6B00',
                color: '#fff', fontSize: '13px', fontWeight: 700,
                cursor: generating ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
              }}
            >
              {generating ? '⏳ Plan ban raha hai...' : '🎯 Study Plan Banao'}
            </button>
          </div>
        </div>
      )}
    </CardShell>
  );
}

// ── Shared style helpers ──────────────────────────────────────────────────────

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '16px',
      border: '1.5px solid #E5E7EB', padding: '24px', marginBottom: '20px',
    }}>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#6B7280',
  display: 'block', marginBottom: '4px',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: '8px',
  border: '1.5px solid #E5E7EB', fontSize: '13px',
  color: '#0D1B3E', background: '#fff',
};

const linkBtnStyle: React.CSSProperties = {
  marginLeft: '8px', color: '#FF6B00', cursor: 'pointer',
  background: 'none', border: 'none', fontSize: '13px', fontWeight: 600,
};

function chipBtn(bg: string, color: string): React.CSSProperties {
  return { padding: '6px 12px', background: bg, color, border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' };
}
