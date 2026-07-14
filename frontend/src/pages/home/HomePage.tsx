import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { StatCard } from '@/components/StatCard';
import { SubjectBadge } from '@/components/SubjectBadge';
import { PlanItem } from '@/components/PlanItem';
import { WeaknessBar } from '@/components/WeaknessBar';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

const RECENT_DOUBTS = [
  { subject: 'Physics' as const, q: 'What is the difference between momentum and impulse?', when: '2 hrs ago', wb: true },
  { subject: 'Chemistry' as const, q: 'Difference between SN1 and SN2 reactions?', when: 'Yesterday', wb: false },
  { subject: 'Maths' as const, q: 'When do we use integration by parts?', when: '2 days ago', wb: true },
];

const PLAN_ITEMS = [
  { subject: 'Physics', topic: 'Thermodynamics Laws', duration: '45 min', type: 'Lecture' as const, done: true },
  { subject: 'Chemistry', topic: 'Organic Reactions', duration: '40 min', type: 'Revision' as const, done: false },
  { subject: 'Maths', topic: '20 MCQs — Calculus', duration: '30 min', type: 'Practice' as const, done: false },
];

const WEAKNESSES = [
  { concept: 'Impulse & Momentum', score: 78, label: 'Weak' },
  { concept: 'Organic Reactions',  score: 54, label: 'Medium' },
  { concept: 'Integration',        score: 41, label: 'Medium' },
  { concept: 'Kinematics',         score: 18, label: 'Strong' },
];

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="p-7">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-poppins text-[22px] font-extrabold text-navy-dark tracking-tight">
            {greeting()}, {user?.name?.split(' ')[0] ?? 'Student'}! 👋
          </h2>
          <p className="text-[13px] text-gray-400 mt-0.5">{todayLabel()} — 3 topics to cover today</p>
        </div>
        <div className="flex gap-2.5 flex-shrink-0">
          <button className="px-4 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            📊 Weekly Report
          </button>
          <button
            onClick={() => navigate('/doubt')}
            className="px-4 py-2.5 rounded-[10px] text-[13px] font-bold text-white flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#FF6B00,#FF9800)', boxShadow: '0 4px 14px rgba(255,107,0,0.3)' }}
          >
            🎤 Ask a Doubt
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <StatCard icon="🔥" iconBg="bg-[rgba(255,107,0,0.1)]" value="12" label="Day Streak" trend="↑ 2 days" trendUp />
        <StatCard icon="🎤" iconBg="bg-[rgba(57,73,171,0.1)]" value="247" label="Doubts Solved" trend="+8 today" trendUp />
        <StatCard icon="⏱" iconBg="bg-[rgba(27,138,78,0.1)]" value="4.2h" label="Studied Today" trend="On track" trendUp />
        <StatCard icon="🎯" iconBg="bg-[rgba(107,0,255,0.1)]" value="68%" label="Syllabus Done" trend="180 days left" trendUp={false} />
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-[18px]">

        {/* LEFT */}
        <div>
          {/* Doubt Hero */}
          <div className="rounded-[14px] p-5 mb-[18px] relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#0D1B3E 0%,#1a237e 100%)' }}>
            <div className="absolute right-[-10px] top-[-15px] text-[100px] opacity-[0.06] pointer-events-none select-none">🎤</div>
            <div className="text-[10px] font-bold tracking-[1px] uppercase text-white/35 mb-1.5">Quick Action</div>
            <div className="font-poppins text-[19px] font-extrabold text-white mb-1">Got a doubt? Ask it now</div>
            <div className="text-[12px] text-white/45 mb-4">Hindi, English, Tamil, Telugu, Kannada, Marathi — any language works</div>
            <div className="flex gap-2.5">
              <button onClick={() => navigate('/doubt')}
                className="flex items-center gap-2 px-[18px] py-[11px] rounded-[10px] text-[13px] font-bold text-white border-0 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg,#FF6B00,#FF9800)', boxShadow: '0 4px 14px rgba(255,107,0,0.4)' }}>
                🎤 Voice Doubt
              </button>
              <button onClick={() => navigate('/doubt')}
                className="flex items-center gap-2 px-4 py-[11px] rounded-[10px] text-[13px] font-semibold text-white/65 hover:text-white/85 transition-colors cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                ⌨ Type Doubt
              </button>
            </div>
          </div>

          {/* Recent Doubts */}
          <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-gray-100">
              <span className="font-poppins text-[14px] font-bold text-navy-dark">Recent Doubts</span>
              <span className="text-[12px] font-semibold text-orange cursor-pointer hover:underline">View All →</span>
            </div>
            <div className="px-[18px] py-3">
              {RECENT_DOUBTS.map((d, i) => (
                <div key={i} className={`flex items-start gap-3 py-[11px] ${i < RECENT_DOUBTS.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <SubjectBadge subject={d.subject} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-gray-700 leading-[1.4]">{d.q}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {d.when}{d.wb && ' · ✨ Whiteboard generated'}
                    </div>
                  </div>
                  <span className="text-gray-400 text-[14px] pt-0.5">›</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          {/* Streak banner */}
          <div className="rounded-[14px] p-[18px] flex items-center gap-3.5 mb-4"
            style={{ background: 'linear-gradient(135deg,#1B8A4E,#15803D)' }}>
            <div className="font-poppins text-[44px] font-black text-white leading-none">12</div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-white">🔥 Day Streak!</div>
              <div className="text-[11px] text-white/55 mt-0.5">Study tomorrow — unlock the 13-day badge</div>
            </div>
            <div className="text-[36px]">🏆</div>
          </div>

          {/* Today's Plan */}
          <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm overflow-hidden mb-[18px]">
            <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-gray-100">
              <span className="font-poppins text-[14px] font-bold text-navy-dark">Today&apos;s Plan</span>
              <span className="text-[12px] font-semibold text-orange cursor-pointer">Edit</span>
            </div>
            <div className="px-3.5 py-3">
              <div className="flex items-center gap-2 mb-3.5">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[rgba(255,107,0,0.1)] text-orange">Today</span>
                <span className="text-[12px] text-gray-400">{todayLabel()}</span>
              </div>
              {PLAN_ITEMS.map((item, i) => <PlanItem key={i} {...item} />)}
            </div>
          </div>

          {/* Weakness Map */}
          <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-gray-100">
              <span className="font-poppins text-[14px] font-bold text-navy-dark">Concept Weakness Map</span>
              <span className="text-[12px] font-semibold text-orange cursor-pointer">Full Map →</span>
            </div>
            <div className="px-[18px] py-4 flex flex-col gap-[11px]">
              {WEAKNESSES.map((w) => <WeaknessBar key={w.concept} {...w} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
