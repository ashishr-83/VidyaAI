import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LANGUAGES } from '@/constants/languages';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-6 text-xl font-semibold text-gray-800">Profile</h2>

      {/* User card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-2xl">
            👤
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">
              Class {user.class} · {user.board} ·{' '}
              <span className="capitalize">{user.tier} tier</span>
            </p>
            <p className="text-sm text-gray-400">{user.phone}</p>
          </div>
        </div>
      </div>

      {/* Language picker */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.nativeLabel} ({l.label})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          Persists across sessions
        </p>
      </div>

      {/* Logout */}
      <div className="mt-6">
        <button
          onClick={logout}
          className="w-full rounded-lg border border-red-300 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
