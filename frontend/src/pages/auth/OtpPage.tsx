import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

const OTP_LENGTH = 6;

export function OtpPage() {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp } = useAuth();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phone = sessionStorage.getItem('vidyaai_otp_phone') ?? '';
  const phoneRaw = sessionStorage.getItem('vidyaai_otp_phone_raw') ?? '';

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = digits.join('');
    if (otp.length !== OTP_LENGTH) {
      toast.error('Enter all 6 digits');
      return;
    }
    if (!phoneRaw) {
      toast.error('Session expired — please request OTP again');
      navigate('/auth/phone');
      return;
    }

    setIsLoading(true);
    try {
      const { isOnboarded } = await verifyOtp(phoneRaw, otp);
      navigate(isOnboarded ? '/home' : '/auth/onboard', { replace: true });
    } catch {
      // toast shown by verifyOtp
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phoneRaw) {
      navigate('/auth/phone');
      return;
    }
    try {
      await sendOtp(phoneRaw);
      setCountdown(30);
      setDigits(Array(OTP_LENGTH).fill(''));
      toast.success('OTP resent');
    } catch {
      // toast shown by sendOtp
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-indigo-700">VidyaAI</h1>
          <p className="mt-2 text-sm text-gray-600">
            OTP sent to <span className="font-medium">{phone}</span>
          </p>
        </div>

        {/* 6-box OTP input */}
        <div className="flex justify-center gap-2">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-12 w-10 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ))}
        </div>

        <button
          onClick={() => void handleVerify()}
          disabled={isLoading}
          className="mt-6 w-full rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isLoading ? 'Verifying...' : 'Verify OTP'}
        </button>

        <p className="mt-4 text-center text-xs text-gray-500">
          {countdown > 0 ? (
            <>Resend OTP in {String(countdown).padStart(2, '0')}s</>
          ) : (
            <button
              onClick={() => { void handleResend(); }}
              className="text-indigo-600 underline"
            >
              Resend OTP
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
