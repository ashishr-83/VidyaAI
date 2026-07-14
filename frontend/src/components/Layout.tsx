import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { OfflineBanner } from './OfflineBanner';

const MOBILE_NAV = [
  { to: '/home',    label: 'Home',    icon: '🏠' },
  { to: '/doubt',   label: 'Doubt',   icon: '🎤' },
  { to: '/plan',    label: 'Plan',    icon: '📅' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar activePath={location.pathname} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        <main className="flex-1 overflow-auto bg-[#F5F7FF] pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t border-gray-200 bg-white z-50">
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center py-2 text-xs transition-colors ${
                  isActive ? 'text-orange font-semibold' : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
