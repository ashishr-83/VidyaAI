import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { planStrings, type SupportedLang } from '../../constants/plan.i18n';
import type { SubjectChapterSelection } from '../../types/plan';
import { apiClient } from '../../lib/axios';

interface Chapter {
  id: string;
  chapterNumber: number;
  chapterName: string;
  estimatedMinutes: number;
  difficulty: string;
}

interface GenerateParams {
  subjectSelections: SubjectChapterSelection[];
  dailyMinutes: number;
  language: string;
}

interface Props {
  language: string;
  onGenerate: (params: GenerateParams) => void;
  generating: boolean;
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Mathematics:      { bg: '#FCEEE0', text: '#D9720F', border: '#D9720F' },
  Science:          { bg: '#E6F5EE', text: '#1E9463', border: '#1E9463' },
  'Social Science': { bg: '#E3F5F3', text: '#0F766E', border: '#0F766E' },
};

const HOURS_OPTIONS = [
  { label: 'Under 1 hour', value: 45 },
  { label: '1–2 hours',    value: 90 },
  { label: '2–3 hours',    value: 150 },
  { label: '3–4 hours',    value: 210 },
  { label: '4+ hours',     value: 270 },
];

const SUBJECTS = ['Mathematics', 'Science', 'Social Science'];

export function ChapterPicker({ language, onGenerate, generating }: Props) {
  const t = planStrings[language as SupportedLang] ?? planStrings['en'];

  const [activeSubject, setActiveSubject] = useState<string>(SUBJECTS[0]!);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  // selectedBySubject[subject] = selected chapter IDs
  const [selectedBySubject, setSelectedBySubject] = useState<Record<string, string[]>>({});
  // weakBySubject[subject] = weak chapter IDs
  const [weakBySubject, setWeakBySubject] = useState<Record<string, string[]>>({});

  const [dailyMinutes, setDailyMinutes] = useState(90);

  // Fetch chapters from API whenever active subject changes
  useEffect(() => {
    setChaptersLoading(true);
    apiClient
      .get<{ chapters: Chapter[] }>('/api/plan/chapters', {
        params: { class: 7, board: 'CBSE', subject: activeSubject },
      })
      .then((res) => setChapters(res.data.chapters))
      .catch(() => {
        toast.error('Failed to load chapters');
        setChapters([]);
      })
      .finally(() => setChaptersLoading(false));
  }, [activeSubject]);

  const toggleChapter = (subject: string, id: string) => {
    setSelectedBySubject((prev) => {
      const cur = prev[subject] ?? [];
      if (cur.includes(id)) return { ...prev, [subject]: cur.filter((x) => x !== id) };
      if (cur.length >= 12) return prev;
      return { ...prev, [subject]: [...cur, id] };
    });
  };

  const toggleWeak = (subject: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWeakBySubject((prev) => {
      const cur = prev[subject] ?? [];
      if (cur.includes(id)) return { ...prev, [subject]: cur.filter((x) => x !== id) };
      return { ...prev, [subject]: [...cur, id] };
    });
  };

  const totalSelected = Object.values(selectedBySubject).reduce((s, ids) => s + ids.length, 0);
  const totalWeak = Object.values(weakBySubject).reduce((s, ids) => s + ids.length, 0);
  const subjectsWithSelection = Object.keys(selectedBySubject).filter(
    (s) => (selectedBySubject[s]?.length ?? 0) > 0
  );

  const handleGenerate = () => {
    const subjectSelections: SubjectChapterSelection[] = subjectsWithSelection.map((subj) => ({
      subject: subj,
      chapterIds: selectedBySubject[subj] ?? [],
      weakChapterIds: weakBySubject[subj] ?? [],
    }));
    onGenerate({ subjectSelections, dailyMinutes, language });
  };

  const handlePdfOpen = async (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiClient.get<{ url: string }>(`/api/plan/chapters/${chapterId}/pdf-url`);
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('PDF not available');
    }
  };

  const currentChapters = chapters;
  const currentSelected = selectedBySubject[activeSubject] ?? [];
  const currentWeak     = weakBySubject[activeSubject] ?? [];

  return (
    <CardShell>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '18px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Hours selector */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={labelStyle}>{t.hoursPerDayLabel}</label>
          <select
            value={dailyMinutes}
            onChange={(e) => setDailyMinutes(Number(e.target.value))}
            style={selectStyle}
          >
            {HOURS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
            Defaults from your profile — adjust anytime
          </div>
        </div>

        {/* Chapter library chip — read-only */}
        <div style={{ flexShrink: 0 }}>
          <label style={labelStyle}>{t.chapterLibraryLabel}</label>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '999px',
              border: '1.5px solid #0D1B3E',
              background: '#0D1B3E',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            📚 {t.chapterLibraryMine}
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
            Chapters from NCERT Class 7 · CBSE
          </div>
        </div>
      </div>

      {/* Subject tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {SUBJECTS.map((subj) => {
          const isActive = activeSubject === subj;
          const selCount = selectedBySubject[subj]?.length ?? 0;
          const colors = SUBJECT_COLORS[subj] ?? { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
          return (
            <button
              key={subj}
              onClick={() => { setActiveSubject(subj); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: `1.5px solid ${isActive ? colors.border : '#E5E7EB'}`,
                background: isActive ? colors.bg : '#FAFAFA',
                color: isActive ? colors.text : '#6B7280',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {subj}
              <span
                style={{
                  background: isActive ? colors.border : '#E5E7EB',
                  color: isActive ? '#fff' : '#374151',
                  fontSize: '10px',
                  padding: '1px 7px',
                  borderRadius: '999px',
                  fontWeight: 700,
                }}
              >
                {selCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chapter list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingBottom: totalSelected > 0 ? '80px' : '0',
        }}
      >
        {chaptersLoading && (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '13px' }}>
            Loading chapters…
          </div>
        )}
        {!chaptersLoading && currentChapters.map((ch) => {
          const isSelected = currentSelected.includes(ch.id);
          const isWeak = currentWeak.includes(ch.id);
          const colors = SUBJECT_COLORS[activeSubject] ?? { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };

          return (
            <div
              key={ch.id}
              role="button"
              tabIndex={0}
              data-testid="chapter-row"
              onClick={() => toggleChapter(activeSubject, ch.id)}
              onKeyDown={(e) => e.key === 'Enter' && toggleChapter(activeSubject, ch.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '11px 14px',
                borderRadius: '10px',
                border: `1.5px solid ${isSelected ? colors.border : '#E5E7EB'}`,
                background: isSelected ? colors.bg : '#FAFAFA',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {/* Custom checkbox */}
              <div
                style={{
                  width: '17px',
                  height: '17px',
                  borderRadius: '4px',
                  flexShrink: 0,
                  border: `2px solid ${isSelected ? colors.border : '#D1D5DB'}`,
                  background: isSelected ? colors.border : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path
                      d="M1 3.5L3 5.5L8 1"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              {/* Chapter name */}
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#0D1B3E' }}>
                {ch.chapterName}
              </span>

              {/* Duration */}
              <span style={{ fontSize: '11px', color: '#6B7280', flexShrink: 0 }}>
                {ch.estimatedMinutes} min
              </span>

              {/* Difficulty badge */}
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  flexShrink: 0,
                  textTransform: 'capitalize',
                  background:
                    ch.difficulty === 'easy'
                      ? '#D1FAE5'
                      : ch.difficulty === 'hard'
                      ? '#FEE2E2'
                      : '#FEF3C7',
                  color:
                    ch.difficulty === 'easy'
                      ? '#065F46'
                      : ch.difficulty === 'hard'
                      ? '#991B1B'
                      : '#92400E',
                }}
              >
                {ch.difficulty}
              </span>

              {/* Weak area toggle */}
              <button
                onClick={(e) => toggleWeak(activeSubject, ch.id, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: '999px',
                  border: `1.5px solid ${isWeak ? '#F3B7BD' : '#E5E7EB'}`,
                  background: isWeak ? '#FDEDEE' : 'transparent',
                  color: isWeak ? '#C0303F' : '#9CA3AF',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ opacity: isWeak ? 1 : 0.4 }}>🔥</span>
                {t.weakAreaLabel}
              </button>

              {/* PDF button — fetches presigned S3 URL on click */}
              <button
                data-testid="pdf-btn"
                onClick={(e) => handlePdfOpen(ch.id, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0D1B3E',
                  padding: '5px 9px',
                  borderRadius: '7px',
                  border: '1px solid #E5E7EB',
                  background: '#fff',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                📄 PDF
              </button>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom bar */}
      {totalSelected > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: '#0D1B3E',
            color: '#fff',
            borderRadius: '14px',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            boxShadow: '0 -6px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ fontSize: '13px', color: '#cfd3e6' }}>
            <b style={{ color: '#FF6B00' }}>{totalSelected} chapters</b> selected across{' '}
            <b style={{ color: '#FF6B00' }}>{subjectsWithSelection.length} subjects</b>
            {totalWeak > 0 && ` · ${totalWeak} weak areas`}
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '10px 22px',
              border: 'none',
              borderRadius: '10px',
              background: generating ? '#6B7280' : '#FF6B00',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: generating ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {generating ? '⏳ Generating...' : t.generateWeeklyPlan}
          </button>
        </div>
      )}
    </CardShell>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1.5px solid #E5E7EB',
        padding: '24px',
        marginBottom: '20px',
      }}
    >
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#374151',
  display: 'block',
  marginBottom: '6px',
};

const selectStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: '9px',
  border: '1.5px solid #E5E7EB',
  fontSize: '13px',
  color: '#0D1B3E',
  background: '#FAFAFA',
  width: '100%',
};
