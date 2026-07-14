import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { MicButton } from '@/components/MicButton';
import { AudioPlayer } from '@/components/AudioPlayer';
import { SubjectBadge } from '@/components/SubjectBadge';
import { useLanguage } from '@/hooks/useLanguage';
import { apiClient } from '@/lib/axios';

type Subject = 'Physics' | 'Chemistry' | 'Maths' | 'Biology';
const SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Maths', 'Biology'];

const TODAY_DOUBTS = [
  { subject: 'Physics' as Subject, q: "Newton's third law?", time: '10:23 AM', wb: true },
  { subject: 'Chemistry' as Subject, q: 'How does a covalent bond form?', time: '9:45 AM', wb: false },
];

const LANGUAGE_LABELS: Record<string, string> = {
  hi: 'Hindi', en: 'English', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', mr: 'Marathi',
};

const SolveResponseSchema = z.object({
  doubtId: z.string(),
  answer: z.string(),
  conceptsTagged: z.array(z.string()),
  audioUrl: z.string().nullable(),
});

type SolveResponse = z.infer<typeof SolveResponseSchema>;

export function DoubtPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SolveResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submitDoubt() {
    const question = textInput.trim();
    if (question.length < 5) {
      toast.error('Please type at least 5 characters before submitting.');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const res = await apiClient.post('/api/doubt/solve', {
        text: question,
        subject: activeSubject ?? 'General',
        language,
      });
      const parsed = SolveResponseSchema.parse(res.data);
      setResult(parsed);
      setTextInput('');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? 'Something went wrong. Please try again.'
        : 'Something went wrong. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitDoubt();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-7 py-3.5 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-[34px] h-[34px] rounded-full border-[1.5px] border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ←
        </button>
        <div>
          <div className="font-poppins text-[18px] font-extrabold text-navy-dark">Voice Doubt Solver</div>
          <div className="text-[12px] text-gray-400 mt-0.5">Select subject & tap mic to ask</div>
        </div>
        <div className="ml-auto px-3.5 py-1.5 rounded-full border-[1.5px] border-gray-200 bg-white text-[12px] font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 transition-colors">
          🇮🇳 {LANGUAGE_LABELS[language] ?? 'Hindi'} ▾
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-7">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 max-w-[1100px] mx-auto">

          {/* Center record card */}
          <div className="bg-white rounded-[18px] border border-gray-200 flex flex-col items-center px-9 py-10 text-center">
            {/* Subject chips */}
            <div className="flex gap-2 flex-wrap justify-center mb-8">
              {SUBJECTS.map((s) => (
                <button key={s} onClick={() => setActiveSubject(activeSubject === s ? null : s)}>
                  <SubjectBadge subject={s} size="md" active={activeSubject === s} />
                </button>
              ))}
            </div>

            {/* Mic */}
            <MicButton
              isRecording={isRecording}
              onClick={() => setIsRecording(!isRecording)}
            />

            <div className="font-poppins text-[20px] font-extrabold text-navy-dark mt-6 mb-1.5">
              {isRecording ? 'Listening…' : 'Tap the mic to ask your doubt'}
            </div>
            <div className="text-[13px] text-gray-400 mb-7 leading-[1.6]">
              Speak clearly{activeSubject ? ` about ${activeSubject}` : ''}<br />
              Average response: 5 seconds ⚡
            </div>

            {/* OR divider */}
            <div className="flex items-center gap-3 w-full mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400">or type your doubt</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type your${activeSubject ? ` ${activeSubject}` : ''} doubt here…`}
              disabled={isLoading}
              className="w-full px-4 py-3.5 rounded-[12px] border-[1.5px] border-gray-200 bg-gray-50 text-[14px] text-gray-700 outline-none focus:border-orange focus:bg-white transition-all font-inter disabled:opacity-50"
            />

            <div className="flex gap-2.5 mt-3.5 w-full">
              <button
                onClick={() => void submitDoubt()}
                disabled={isLoading || textInput.trim().length < 5}
                className="flex-1 py-3 rounded-[11px] text-[13px] font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#FF6B00,#FF9800)', boxShadow: '0 4px 14px rgba(255,107,0,0.3)' }}
              >
                {isLoading ? '⏳ Thinking…' : '✉️ Submit'}
              </button>
              <button className="flex-1 py-3 rounded-[11px] border-[1.5px] border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                📷 Upload Photo
              </button>
            </div>

            {/* Answer card */}
            {result && (
              <div className="mt-5 w-full rounded-[14px] border border-gray-200 bg-white overflow-hidden text-left">
                <div className="px-5 py-4">
                  <div className="text-[12px] font-bold text-orange mb-2 uppercase tracking-wide">VidyaAI Answer</div>
                  <p className="text-[14px] text-gray-700 leading-[1.7] whitespace-pre-wrap">{result.answer}</p>
                  {result.conceptsTagged.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {result.conceptsTagged.map((c) => (
                        <span key={c} className="text-[10px] px-2 py-1 rounded-full bg-orange/10 text-orange font-semibold">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                {result.audioUrl && (
                  <AudioPlayer
                    src={result.audioUrl}
                    language={LANGUAGE_LABELS[language] ?? 'Hindi'}
                    onHelpful={() => toast.success('Glad it helped!')}
                    onNotHelpful={() => toast('Ask a follow-up question below')}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-3.5">
            {/* Tip box */}
            <div className="rounded-[14px] p-5 text-white"
              style={{ background: 'linear-gradient(135deg,#0D1B3E,#1a237e)' }}>
              <div className="text-[26px] mb-2">💡</div>
              <div className="font-poppins text-[14px] font-bold mb-1.5">How to Ask Better Doubts</div>
              <div className="text-[12px] text-white/50 leading-[1.65]">
                Mention subject + chapter:<br />
                <em className="text-white/70 not-italic">"In Physics, Laws of Motion — what is the difference between momentum and impulse?"</em>
                <br /><br />
                Physics, Chemistry and Maths get animated whiteboards! ✨
              </div>
            </div>

            {/* Today's doubts */}
            <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-3.5 border-b border-gray-100">
                <span className="font-poppins text-[14px] font-bold text-navy-dark">Today&apos;s Doubts</span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-[8px] bg-amber-50 text-amber-600">2/3 free used</span>
              </div>
              <div className="px-3.5 py-2.5">
                {TODAY_DOUBTS.map((d, i) => (
                  <div key={i} className={`flex items-start gap-3 py-2.5 ${i < TODAY_DOUBTS.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <SubjectBadge subject={d.subject} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-gray-700">{d.q}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{d.time}{d.wb && ' · ✨ Whiteboard'}</div>
                    </div>
                    <span className="text-[11px] text-green font-semibold">✓</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade CTA */}
            <div className="rounded-[12px] p-4 border-[1.5px] border-green/20 bg-green/5">
              <div className="text-[12px] font-bold text-green mb-1">🚀 Upgrade to Plus</div>
              <div className="text-[11px] text-[#166534] leading-[1.55]">
                Unlimited doubts + animated whiteboard + parent dashboard — only{' '}
                <strong>₹199/month</strong>
              </div>
              <button className="mt-2.5 w-full py-2.5 rounded-[9px] bg-green text-white text-[12px] font-bold hover:opacity-90 transition-opacity">
                Upgrade Now →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
