import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/home', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-[50px] rounded-[12px] pl-[44px] pr-3.5 text-[14px] text-white font-inter outline-none transition-all";
  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1.5px solid rgba(255,255,255,0.09)',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg,#0D1B3E 0%,#1a0a3e 100%)' }}
    >
      {/* Glow */}
      <div className="fixed w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background:'#FF6B00', opacity:0.05, filter:'blur(80px)', top:'-100px', right:'-100px' }} />

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8 cursor-pointer"
          onClick={() => navigate('/auth/login')}>
          <div className="w-10 h-10 rounded-[11px] flex items-center justify-center text-xl"
            style={{ background:'linear-gradient(135deg,#FF6B00,#FF9800)' }}>🎓</div>
          <span className="font-poppins text-[22px] font-extrabold text-white">
            Vidya<span className="text-orange">AI</span>
          </span>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-[18px] p-8">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-orange mb-2">
            Get Started
          </div>
          <div className="font-poppins text-[24px] font-extrabold text-white tracking-tight mb-1">
            Create Account
          </div>
          <div className="text-[13px] text-white/38 mb-6">Join 50,000+ students learning smarter</div>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-[10px] bg-red-500/10 border border-red-500/20 text-[13px] text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-3.5">
            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.5px] text-white/35 mb-1.5">Full Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] opacity-35">👤</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name" required className={inputClass} style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor='#FF6B00'; e.currentTarget.style.background='rgba(255,107,0,0.07)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.5px] text-white/35 mb-1.5">Email</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] opacity-35">✉</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required className={inputClass} style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor='#FF6B00'; e.currentTarget.style.background='rgba(255,107,0,0.07)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.5px] text-white/35 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] opacity-35">🔒</span>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters" required className={inputClass} style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor='#FF6B00'; e.currentTarget.style.background='rgba(255,107,0,0.07)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] opacity-30 cursor-pointer">
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.5px] text-white/35 mb-1.5">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] opacity-35">🔒</span>
                <input type={showPass ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password" required className={inputClass} style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor='#FF6B00'; e.currentTarget.style.background='rgba(255,107,0,0.07)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[50px] rounded-[12px] font-poppins text-[15px] font-bold text-white mt-2 transition-all hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background:'linear-gradient(135deg,#FF6B00,#FF9800)', boxShadow:'0 6px 24px rgba(255,107,0,0.35)' }}
            >
              {loading ? 'Creating account…' : '🎓 Create Account'}
            </button>
          </form>

          <div className="text-center text-[12px] text-white/30 mt-5">
            Already have an account?{' '}
            <button onClick={() => navigate('/auth/login')}
              className="text-orange font-bold hover:underline">
              Sign In →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
