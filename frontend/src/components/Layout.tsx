import { NavLink, Outlet } from 'react-router-dom';
import { LanguagePicker } from './LanguagePicker';
import { OfflineBanner } from './OfflineBanner';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/home', label: 'Home', icon: '🏠' },
  { to: '/doubt', label: 'Doubt', icon: '🎤' },
  { to: '/plan', label: 'Plan', icon: '📅' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

const activeClass =
  'border-l-4 border-indigo-600 bg-indigo-50 text-indigo-700 font-medium';
const inactiveClass =
  'border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900';

const mobileActiveClass = 'text-indigo-600 font-medium';
const mobileInactiveClass = 'text-gray-500 hover:text-gray-700';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Top nav bar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-lg font-bold text-indigo-700">VidyaAI</span>
        <div className="flex items-center gap-3">
          <LanguagePicker />
          {user && (
            <span className="hidden text-sm text-gray-600 sm:block">
              {user.name}
            </span>
          )}
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Logout
          </button>
        </div>
      </header>

      <OfflineBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
          <nav className="flex-1 py-4">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isActive ? activeClass : inactiveClass
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-gray-200 bg-white md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center py-2 text-xs transition-colors ${
                isActive ? mobileActiveClass : mobileInactiveClass
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
