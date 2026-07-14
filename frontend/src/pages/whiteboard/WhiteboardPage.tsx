import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WhiteboardCanvas } from '@/components/WhiteboardCanvas';
import { AudioPlayer } from '@/components/AudioPlayer';

export function WhiteboardPage() {
  const navigate = useNavigate();
  const [helpful, setHelpful] = useState<boolean | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FF]">
      {/* Dark top bar */}
      <div className="flex items-center gap-3.5 px-7 py-3.5 flex-shrink-0" style={{ background: '#0D1B3E' }}>
        <button
          onClick={() => navigate(-1)}
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[14px] text-white cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          ←
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold tracking-[0.8px] uppercase text-white/35 mb-0.5">
            📚 Physics — Laws of Motion · Class 11 · JEE
          </div>
          <div className="text-[14px] font-bold text-white truncate">
            "What is the difference between momentum and impulse? They seem the same."
          </div>
        </div>

        {/* Live badge */}
        <div
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#FF6B00,#FF9800)', boxShadow: '0 4px 12px rgba(255,107,0,0.4)' }}
        >
          <div className="w-[7px] h-[7px] rounded-full bg-white" style={{ animation: 'blink 1s infinite' }} />
          Live Whiteboard ✨
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <WhiteboardCanvas currentStep={2} />

        {/* Right panel */}
        <div className="w-[360px] flex-shrink-0 flex flex-col bg-white border-l border-gray-200">
          {/* Transcript */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="text-[10px] font-bold tracking-[1px] uppercase text-gray-400 mb-3.5">
              🎙 AI Explanation — English
            </div>
            <div className="text-[13px] text-gray-700 leading-[1.85]">
              Great question, {' '}
              <span className="bg-[rgba(255,107,0,0.1)] text-[#C2410C] font-semibold rounded px-0.5">momentum (p)</span>
              {' '}and{' '}
              <span className="bg-[rgba(255,107,0,0.1)] text-[#C2410C] font-semibold rounded px-0.5">impulse (J)</span>
              {' '}are related but different things!
              <br /><br />
              <span className="bg-[rgba(255,107,0,0.1)] text-[#C2410C] font-semibold rounded px-0.5">Momentum (p)</span>
              {' '}is the "quantity of motion" of an object. Think of a heavy truck moving at 100 km/h vs a cycle — the truck has more momentum, so it&apos;s harder to stop. Formula:{' '}
              <span className="bg-[rgba(255,107,0,0.1)] text-[#C2410C] font-semibold rounded px-0.5">p = m × v</span>.
              <br /><br />
              Now look here — the{' '}
              <span className="bg-[rgba(255,107,0,0.1)] text-[#C2410C] font-semibold rounded px-0.5">bat</span>
              {' '}hits the ball. A{' '}
              <span className="bg-[rgba(255,107,0,0.1)] text-[#C2410C] font-semibold rounded px-0.5">force (F)</span>
              {' '}acts on the ball for a short time{' '}
              <span className="bg-[rgba(255,107,0,0.1)] text-[#C2410C] font-semibold rounded px-0.5">Δt</span>.
              That&apos;s{' '}
              <span className="bg-[rgba(255,107,0,0.1)] text-[#C2410C] font-semibold rounded px-0.5">Impulse (J) = F × Δt</span>.
              <br /><br />
              The key insight:{' '}
              <span className="bg-[rgba(255,107,0,0.1)] text-[#C2410C] font-semibold rounded px-0.5">Impulse = Change in Momentum</span>.
              That&apos;s why they share the same unit (N·s). But impulse is the <em>action</em> (bat hitting), momentum is the <em>result</em> (ball&apos;s motion)! 💡
            </div>
          </div>

          {/* Audio player */}
          <AudioPlayer
            src=""
            language={helpful === null ? 'Hindi · Aditi' : helpful ? 'Hindi · Aditi' : 'Hindi · Aditi'}
            onHelpful={() => setHelpful(true)}
            onNotHelpful={() => setHelpful(false)}
          />

          {helpful !== null && (
            <div className={`px-5 py-2.5 text-[12px] font-semibold text-center border-t ${helpful ? 'bg-green/5 text-green border-green/20' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
              {helpful ? '✅ Glad it helped! Moving to next step…' : '🔄 Generating a simpler explanation…'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
