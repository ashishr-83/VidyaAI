import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/lib/firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';

type Tab = 'email' | 'phone';
type PhoneStep = 'enter' | 'otp';

export function LoginPage() {
  const navigate = useNavigate();
  const { emailLogin, verifyOtp } = useAuth();

  // Tab state
  const [tab, setTab] = useState<Tab>('email');

  // Email form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Phone OTP
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerId = 'recaptcha-container';

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const { isOnboarded } = await emailLogin(email, password);
      navigate(isOnboarded ? '/home' : '/auth/onboard', { replace: true });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) return;
    setPhoneLoading(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' });
      }
      const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const result = await signInWithPhoneNumber(auth, fullPhone, recaptchaRef.current);
      confirmationRef.current = result;
      setPhoneStep('otp');
      setCountdown(30);
    } catch {
      // toast shown by firebase errors
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationRef.current || otp.length !== 6) return;
    setPhoneLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();
      const { isOnboarded } = await verifyOtp(idToken);
      navigate(isOnboarded ? '/home' : '/auth/onboard', { replace: true });
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0D1B3E 0%,#1a0a3e 100%)' }}
    >
      {/* Glow orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background:'#FF6B00', opacity:0.05, filter:'blur(100px)', top:'-200px', left:'-100px' }} />
      <div className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background:'#6B00FF', opacity:0.06, filter:'blur(100px)', bottom:'-200px', right:'-100px' }} />
      <div className="absolute w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background:'#00C4FF', opacity:0.04, filter:'blur(100px)', top:'50%', left:'40%' }} />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1fr_460px]">

        {/* ── LEFT: Branding ── */}
        <div className="hidden lg:flex flex-col justify-center px-16 py-14 relative">
          {/* Animated background SVG */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
            viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
            {/* Physics: moving ball + velocity arrow */}
            <circle cx="120" cy="220" r="20" fill="none" stroke="#fff" strokeWidth="2"
              strokeDasharray="126" strokeDashoffset="126">
              <animate attributeName="stroke-dashoffset" from="126" to="0" dur="1.8s" fill="freeze" begin="0.3s"/>
            </circle>
            <line x1="144" y1="220" x2="230" y2="220" stroke="#fff" strokeWidth="2"
              strokeDasharray="100" strokeDashoffset="100">
              <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1.2s" fill="freeze" begin="1.5s"/>
            </line>
            <text x="178" y="210" fontSize="14" fill="#FF9800" opacity="0">
              <animate attributeName="opacity" from="0" to="0.9" dur="0.5s" fill="freeze" begin="2.5s"/>v →</text>
            <text x="76" y="294" fontFamily="serif" fontSize="18" fill="#FF6B00" opacity="0">
              <animate attributeName="opacity" from="0" to="0.85" dur="0.8s" fill="freeze" begin="2.8s"/>p = m × v</text>
            {/* Chemistry: H2O */}
            <g transform="translate(580,520)">
              <circle cx="50" cy="60" r="26" fill="none" stroke="#fff" strokeWidth="2"
                strokeDasharray="165" strokeDashoffset="165">
                <animate attributeName="stroke-dashoffset" from="165" to="0" dur="1.5s" fill="freeze" begin="1s"/>
              </circle>
              <circle cx="6" cy="22" r="17" fill="none" stroke="#FF9800" strokeWidth="2"
                strokeDasharray="108" strokeDashoffset="108">
                <animate attributeName="stroke-dashoffset" from="108" to="0" dur="1.2s" fill="freeze" begin="2s"/>
              </circle>
              <circle cx="94" cy="22" r="17" fill="none" stroke="#FF9800" strokeWidth="2"
                strokeDasharray="108" strokeDashoffset="108">
                <animate attributeName="stroke-dashoffset" from="108" to="0" dur="1.2s" fill="freeze" begin="2.2s"/>
              </circle>
              <text x="50" y="68" textAnchor="middle" fontSize="15" fill="#fff" fontWeight="700" opacity="0">
                <animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" begin="3.2s"/>O</text>
              <text x="4" y="24" fontSize="14" fill="#FF9800" fontWeight="700" opacity="0">
                <animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" begin="3.2s"/>H</text>
              <text x="92" y="24" fontSize="14" fill="#FF9800" fontWeight="700" opacity="0">
                <animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" begin="3.2s"/>H</text>
            </g>
            {/* Maths: coordinate + sine wave */}
            <g transform="translate(870,60)">
              <line x1="0" y1="200" x2="0" y2="0" stroke="#fff" strokeWidth="2"
                strokeDasharray="200" strokeDashoffset="200">
                <animate attributeName="stroke-dashoffset" from="200" to="0" dur="1.2s" fill="freeze" begin="1s"/>
              </line>
              <line x1="0" y1="200" x2="220" y2="200" stroke="#fff" strokeWidth="2"
                strokeDasharray="220" strokeDashoffset="220">
                <animate attributeName="stroke-dashoffset" from="220" to="0" dur="1.2s" fill="freeze" begin="1s"/>
              </line>
              <path d="M10,150 Q40,80 70,150 Q100,220 130,150 Q160,80 190,150"
                fill="none" stroke="#FF9800" strokeWidth="2.5"
                strokeDasharray="350" strokeDashoffset="350">
                <animate attributeName="stroke-dashoffset" from="350" to="0" dur="2s" fill="freeze" begin="2s"/>
              </path>
              <text x="100" y="230" textAnchor="middle" fontSize="13" fill="#fff" opacity="0">
                <animate attributeName="opacity" from="0" to="0.9" dur="0.5s" fill="freeze" begin="3.5s"/>y = sin(x)</text>
            </g>
            {/* Geometry triangle */}
            <g transform="translate(300,500)">
              <path d="M0,120 L100,120 L50,20 Z" fill="none" stroke="#fff" strokeWidth="2"
                strokeDasharray="360" strokeDashoffset="360">
                <animate attributeName="stroke-dashoffset" from="360" to="0" dur="2s" fill="freeze" begin="1.5s"/>
              </path>
              <text x="50" y="142" textAnchor="middle" fontSize="12" fill="#fff" opacity="0">
                <animate attributeName="opacity" from="0" to="0.8" dur="0.5s" fill="freeze" begin="3.2s"/>Base = a</text>
            </g>
          </svg>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-[52px]">
            <div className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center text-2xl"
              style={{ background:'linear-gradient(135deg,#FF6B00,#FF9800)', boxShadow:'0 8px 24px rgba(255,107,0,0.45)' }}>
              🎓
            </div>
            <span className="font-poppins text-2xl font-extrabold text-white">
              Vidya<span className="text-orange">AI</span>
            </span>
          </div>

          {/* Tagline */}
          <div className="font-poppins font-black text-white leading-[1.08] tracking-tight mb-4"
            style={{ fontSize:'clamp(30px,3.5vw,52px)', letterSpacing:'-1.5px' }}>
            Your personal<br />
            <span style={{ background:'linear-gradient(90deg,#FF6B00,#FFD600)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              AI tutor
            </span>
            <br />in your pocket.
          </div>

          <p className="text-[15px] text-white/50 leading-[1.75] max-w-[420px] mb-11">
            Ask doubts by voice, understand with animated whiteboards — in Hindi or your language. Class 6 to NEET/JEE, available 24/7.
          </p>

          {/* Stats */}
          <div className="flex gap-10 mb-11">
            {[
              { num: '50K+', lbl: 'Active Students' },
              { num: '2M+',  lbl: 'Doubts Solved' },
              { num: '6+',   lbl: 'Languages' },
            ].map(({ num, lbl }) => (
              <div key={lbl}>
                <div className="font-poppins text-[30px] font-black text-white leading-none">
                  {num.replace(/\+/, '')}<span className="text-orange">+</span>
                </div>
                <div className="text-[11px] text-white/35 font-medium mt-1">{lbl}</div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="flex gap-3.5 max-w-[420px] glass rounded-2xl p-4">
            <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-xl"
              style={{ background:'linear-gradient(135deg,#1B8A4E,#43A047)' }}>😊</div>
            <div>
              <div className="text-[12px] font-bold text-white mb-0.5">Rahul S. — JEE Aspirant, Lucknow</div>
              <div className="text-[12px] text-white/50 leading-[1.5]">
                "I used to stay up all night with physics doubts. Now VidyaAI explains everything in 5 seconds — on a whiteboard!"
              </div>
              <div className="text-orange text-[11px] mt-1.5">★★★★★</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Form panel ── */}
        <div className="flex items-center justify-center px-11 py-12 glass-strong relative z-10">
          <div className="w-full max-w-[340px]">
            <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-orange mb-2">
              Student Portal
            </div>
            <div className="font-poppins text-[26px] font-extrabold text-white tracking-tight mb-1">
              Welcome Back
            </div>
            <div className="text-[13px] text-white/38 mb-6 leading-[1.5]">
              Continue your learning journey 📚
            </div>

            {/* Tab switcher */}
            <div className="flex gap-0 mb-6 bg-white/5 rounded-[10px] p-1">
              {(['email', 'phone'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-[8px] text-[12px] font-semibold transition-all ${
                    tab === t
                      ? 'bg-orange text-white shadow'
                      : 'text-white/45 hover:text-white/70'
                  }`}
                >
                  {t === 'email' ? '✉ Email Login' : '📱 Phone OTP'}
                </button>
              ))}
            </div>

            {/* ── EMAIL TAB ── */}
            {tab === 'email' && (
              <form onSubmit={(e) => { void handleEmailLogin(e); }}>
                {/* Email */}
                <div className="mb-3.5">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.5px] text-white/35 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] opacity-35">✉</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full h-[50px] rounded-[12px] pl-[44px] pr-3.5 text-[14px] text-white font-inter outline-none transition-all"
                      style={{
                        background:'rgba(255,255,255,0.05)',
                        border:'1.5px solid rgba(255,255,255,0.09)',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor='#FF6B00'; e.currentTarget.style.background='rgba(255,107,0,0.07)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.5px] text-white/35 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] opacity-35">🔒</span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      required
                      className="w-full h-[50px] rounded-[12px] pl-[44px] pr-10 text-[14px] text-white font-inter outline-none transition-all"
                      style={{
                        background:'rgba(255,255,255,0.05)',
                        border:'1.5px solid rgba(255,255,255,0.09)',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor='#FF6B00'; e.currentTarget.style.background='rgba(255,107,0,0.07)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] opacity-30 cursor-pointer">
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-5">
                  <label className="flex items-center gap-2 text-[12px] text-white/40 cursor-pointer">
                    <div className="w-[17px] h-[17px] rounded-[4px] border-[1.5px] border-white/18 bg-white/4 flex items-center justify-center text-[9px] text-orange">✓</div>
                    Remember me
                  </label>
                  <span className="text-[12px] text-orange font-semibold cursor-pointer hover:underline">
                    Forgot password?
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full h-[50px] rounded-[12px] font-poppins text-[15px] font-bold text-white mb-4 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background:'linear-gradient(135deg,#FF6B00,#FF9800)', boxShadow:'0 6px 24px rgba(255,107,0,0.35)' }}
                >
                  {emailLoading ? 'Signing in…' : '🚀 Sign In'}
                </button>

                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex-1 h-px bg-white/7" />
                  <span className="text-[11px] text-white/20">or continue with</span>
                  <div className="flex-1 h-px bg-white/7" />
                </div>

                <button type="button"
                  className="w-full h-[46px] rounded-[11px] border-[1.5px] border-white/9 bg-white/3 text-white/60 text-[13px] font-semibold font-inter flex items-center justify-center gap-2.5 hover:bg-white/7 hover:text-white/85 transition-all mb-3"
                  style={{ border:'1.5px solid rgba(255,255,255,0.09)', background:'rgba(255,255,255,0.03)' }}>
                  🌐 Continue with Google
                </button>

                <div className="text-center text-[12px] text-white/30 mt-4">
                  New student?{' '}
                  <button type="button" onClick={() => navigate('/auth/register')}
                    className="text-orange font-bold hover:underline">
                    Register free →
                  </button>
                </div>
              </form>
            )}

            {/* ── PHONE OTP TAB ── */}
            {tab === 'phone' && (
              <div>
                {phoneStep === 'enter' ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-[10px] font-bold uppercase tracking-[0.5px] text-white/35 mb-1.5">
                        Phone Number
                      </label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 rounded-[12px] text-[14px] text-white/50 font-inter flex-shrink-0"
                          style={{ background:'rgba(255,255,255,0.05)', border:'1.5px solid rgba(255,255,255,0.09)', height:50 }}>
                          🇮🇳 +91
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10-digit number"
                          className="flex-1 h-[50px] rounded-[12px] px-3.5 text-[14px] text-white font-inter outline-none transition-all"
                          style={{ background:'rgba(255,255,255,0.05)', border:'1.5px solid rgba(255,255,255,0.09)' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor='#FF6B00'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'; }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => { void handleSendOtp(); }}
                      disabled={phoneLoading || phone.length < 10}
                      className="w-full h-[50px] rounded-[12px] font-poppins text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                      style={{ background:'linear-gradient(135deg,#FF6B00,#FF9800)', boxShadow:'0 6px 24px rgba(255,107,0,0.35)' }}
                    >
                      {phoneLoading ? 'Sending…' : '📱 Send OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-[10px] font-bold uppercase tracking-[0.5px] text-white/35 mb-1.5">
                        Enter 6-digit OTP
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="______"
                        maxLength={6}
                        className="w-full h-[50px] rounded-[12px] px-4 text-[18px] text-white text-center tracking-[0.5rem] font-inter outline-none"
                        style={{ background:'rgba(255,255,255,0.05)', border:'1.5px solid rgba(255,255,255,0.09)' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor='#FF6B00'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'; }}
                      />
                    </div>
                    <button
                      onClick={() => { void handleVerifyOtp(); }}
                      disabled={phoneLoading || otp.length !== 6}
                      className="w-full h-[50px] rounded-[12px] font-poppins text-[15px] font-bold text-white mb-3 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                      style={{ background:'linear-gradient(135deg,#FF6B00,#FF9800)', boxShadow:'0 6px 24px rgba(255,107,0,0.35)' }}
                    >
                      {phoneLoading ? 'Verifying…' : '✅ Verify & Login'}
                    </button>
                    <div className="text-center text-[12px] text-white/35">
                      {countdown > 0 ? (
                        `Resend in ${countdown}s`
                      ) : (
                        <button onClick={() => { setPhoneStep('enter'); setOtp(''); }}
                          className="text-orange font-semibold hover:underline">
                          ← Change number
                        </button>
                      )}
                    </div>
                  </>
                )}

                <div className="text-center text-[12px] text-white/30 mt-5">
                  New student?{' '}
                  <button onClick={() => navigate('/auth/register')}
                    className="text-orange font-bold hover:underline">
                    Register free →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invisible reCAPTCHA container */}
      <div id={recaptchaContainerId} />
    </div>
  );
}
