import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-xl font-semibold text-gray-800">
        {greeting()}, {name}! 👋
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Plan card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-indigo-600">
            <span className="text-2xl">📅</span>
            <span className="font-semibold">Today's Plan</span>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Your personalised study schedule is ready.
          </p>
          <button
            onClick={() => navigate('/plan')}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            View Plan →
          </button>
        </div>

        {/* Doubt card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-indigo-600">
            <span className="text-2xl">🎤</span>
            <span className="font-semibold">Ask a Doubt</span>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Voice or text — get instant AI-powered answers.
          </p>
          <button
            onClick={() => navigate('/doubt')}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Start →
          </button>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-gray-400">
        More features coming soon — Weakness Graph, Mock Tests &amp; more.
      </p>
    </div>
  );
}
