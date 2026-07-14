import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/home',    icon: '🏠', label: 'Dashboard' },
  { to: '/doubt',   icon: '🎤', label: 'Doubt Solver', badge: '3' },
  { to: '/plan',    icon: '📅', label: 'Study Plan' },
  { to: '/profile', icon: '👤', label: 'Profile' },
];

interface SidebarProps {
  activePath: string;
}

export function Sidebar({ activePath }: SidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-navy-dark">
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-[18px] py-5 border-b border-white/[0.06] cursor-pointer"
        onClick={() => navigate('/home')}
      >
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-[17px] flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#FF6B00,#FF9800)' }}
        >
          🎓
        </div>
        <span className="font-poppins text-[18px] font-extrabold text-white">
          Vidya<span className="text-orange">AI</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 pt-3">
        {NAV_ITEMS.map((item) => {
          const isActive = activePath === item.to;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-[9px] rounded-[9px] text-[13px] font-medium mb-0.5 transition-all duration-150 ${
                isActive
                  ? 'bg-[rgba(255,107,0,0.15)] text-[#FF8C42] font-semibold'
                  : 'text-white/45 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="bg-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-2.5 pb-5">
        <div className="flex items-center gap-2.5 px-2.5 py-[11px] rounded-[10px] bg-white/5 border border-white/[0.06]">
          <div
            className="w-[33px] h-[33px] rounded-full flex-shrink-0 flex items-center justify-center text-[15px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#FF6B00,#FF9800)' }}
          >
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-white truncate">
              {user?.name || 'Student'}
            </div>
            <div className="text-[10px] text-white/30 mt-0.5">
              Class {user?.class || '—'} · {user?.tier || 'free'} ✨
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
