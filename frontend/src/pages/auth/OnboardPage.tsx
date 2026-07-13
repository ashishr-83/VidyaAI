import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BOARDS, CLASS_LABELS, CLASSES } from '@/constants/subjects';
import { LANGUAGES } from '@/constants/languages';

export function OnboardPage() {
  const navigate = useNavigate();
  const { onboard } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    class: 11,
    board: 'CBSE',
    language: 'hi',
    examDate: '',
    studyHoursPerDay: 4,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onboard({
        name: form.name,
        class: form.class,
        board: form.board,
        language: form.language,
        examDate: form.examDate ? new Date(form.examDate).toISOString() : undefined,
        studyHoursPerDay: form.studyHoursPerDay,
      });
      navigate('/home', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-indigo-700">VidyaAI</h1>
          <p className="mt-1 text-sm text-gray-500">Tell us about yourself</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Your Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Arjun Sharma"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Class + Board */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ob-class" className="mb-1 block text-sm font-medium text-gray-700">Class</label>
              <select
                id="ob-class"
                value={form.class}
                onChange={(e) => set('class', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CLASSES.map((c) => (
                  <option key={c} value={c}>{CLASS_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ob-board" className="mb-1 block text-sm font-medium text-gray-700">Board</label>
              <select
                id="ob-board"
                value={form.board}
                onChange={(e) => set('board', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {BOARDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Language */}
          <div>
            <label htmlFor="ob-language" className="mb-1 block text-sm font-medium text-gray-700">Language</label>
            <select
              id="ob-language"
              value={form.language}
              onChange={(e) => set('language', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeLabel} ({l.label})
                </option>
              ))}
            </select>
          </div>

          {/* Exam Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Exam Date{' '}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="date"
              value={form.examDate}
              onChange={(e) => set('examDate', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Study hours */}
          <div>
            <label className="mb-2 flex justify-between text-sm font-medium text-gray-700">
              <span>Study hours/day</span>
              <span className="text-indigo-600">{form.studyHoursPerDay} hrs</span>
            </label>
            <input
              type="range"
              min={1}
              max={12}
              value={form.studyHoursPerDay}
              onChange={(e) => set('studyHoursPerDay', Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>1 hr</span><span>12 hrs</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isLoading ? 'Saving...' : 'Start Learning'}
          </button>
        </form>
      </div>
    </div>
  );
}
