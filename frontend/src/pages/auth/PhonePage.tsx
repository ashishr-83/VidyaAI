import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

export function PhonePage() {
  const navigate = useNavigate();
  const { sendOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.match(/^\d{10}$/)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      await sendOtp(phone);
      sessionStorage.setItem('vidyaai_otp_phone', `+91${phone}`);
      sessionStorage.setItem('vidyaai_otp_phone_raw', phone);
      navigate('/auth/otp');
    } catch {
      // toast shown by sendOtp
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-indigo-700">VidyaAI</h1>
          <p className="mt-1 text-sm text-gray-500">AI-powered Learning</p>
        </div>

        <form onSubmit={(e) => void handleSendOtp(e)}>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Mobile Number
          </label>
          <div className="flex overflow-hidden rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="flex items-center bg-gray-50 px-3 text-sm text-gray-600">
              🇮🇳 +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="98765 43210"
              className="flex-1 bg-white px-3 py-3 text-sm outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 w-full rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {isLoading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
