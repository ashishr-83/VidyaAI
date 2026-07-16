import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import axios from 'axios';
import toast from 'react-hot-toast';
import { apiClient, JWT_KEY } from '@/lib/axios';
import { useStorage } from './useStorage';

// ── Zod schemas ───────────────────────────────────────────────────────────────

const UserSchema = z.object({
  id: z.string(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  name: z.string(),
  class: z.number(),
  board: z.string(),
  language: z.string(),
  tier: z.string(),
  examDate: z.string().nullable(),
  studyHoursPerDay: z.number(),
  createdAt: z.string(),
});

const ProfileResponseSchema = z.object({ user: UserSchema });

const SendOtpResponseSchema = z.object({
  message: z.string(),
});

const VerifyOtpResponseSchema = z.object({
  token: z.string(),
  isOnboarded: z.boolean(),
  userId: z.string(),
});

const EmailAuthResponseSchema = z.object({
  token: z.string(),
  isOnboarded: z.boolean(),
  userId: z.string(),
});

const OnboardResponseSchema = z.object({ user: UserSchema });

export type User = z.infer<typeof UserSchema>;

// ── Hook ──────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const storage = useStorage();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchProfile = useCallback(async (): Promise<User | null> => {
    try {
      const res = await apiClient.get('/api/auth/profile');
      const parsed = ProfileResponseSchema.parse(res.data);
      return parsed.user;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        storage.remove(JWT_KEY);
      }
      return null;
    }
  }, [storage]);

  // On mount: check JWT → fetch profile
  useEffect(() => {
    const token = storage.get(JWT_KEY);
    if (!token) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    void fetchProfile().then((user) => {
      setState({
        user,
        isLoading: false,
        isAuthenticated: user !== null,
      });
    });
  }, [fetchProfile, storage]);

  const saveToken = useCallback(
    (token: string) => storage.set(JWT_KEY, token),
    [storage]
  );

  const sendOtp = useCallback(
    async (phone: string): Promise<void> => {
      try {
        const res = await apiClient.post('/api/auth/send-otp', { phone });
        SendOtpResponseSchema.parse(res.data);
      } catch (err) {
        const msg = axios.isAxiosError(err)
          ? (err.response?.data as { error?: string })?.error ?? 'Failed to send OTP'
          : 'Failed to send OTP';
        toast.error(msg);
        throw err;
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (phone: string, otp: string): Promise<{ isOnboarded: boolean }> => {
      try {
        const res = await apiClient.post('/api/auth/verify-otp', { phone, otp });
        const parsed = VerifyOtpResponseSchema.parse(res.data);
        saveToken(parsed.token);
        if (parsed.isOnboarded) {
          const user = await fetchProfile();
          setState({ user, isLoading: false, isAuthenticated: user !== null });
        }
        return { isOnboarded: parsed.isOnboarded };
      } catch (err) {
        const msg = axios.isAxiosError(err)
          ? (err.response?.data as { error?: string })?.error ?? 'OTP verification failed'
          : 'OTP verification failed';
        toast.error(msg);
        throw err;
      }
    },
    [fetchProfile, saveToken]
  );

  const onboard = useCallback(
    async (data: {
      name: string;
      class: number;
      board: string;
      language: string;
      examDate?: string;
      studyHoursPerDay: number;
    }): Promise<void> => {
      try {
        const res = await apiClient.post('/api/auth/onboard', data);
        const parsed = OnboardResponseSchema.parse(res.data);
        setState({ user: parsed.user, isLoading: false, isAuthenticated: true });
      } catch (err) {
        const msg = axios.isAxiosError(err)
          ? (err.response?.data as { error?: string })?.error ?? 'Onboarding failed'
          : 'Onboarding failed';
        toast.error(msg);
        throw err;
      }
    },
    []
  );

  const logout = useCallback(() => {
    storage.remove(JWT_KEY);
    setState({ user: null, isLoading: false, isAuthenticated: false });
    window.location.replace('/auth/phone');
  }, [storage]);

  const emailLogin = useCallback(
    async (email: string, password: string): Promise<{ isOnboarded: boolean }> => {
      try {
        const res = await apiClient.post('/api/auth/login', { email, password });
        const parsed = EmailAuthResponseSchema.parse(res.data);
        saveToken(parsed.token);
        if (parsed.isOnboarded) {
          const user = await fetchProfile();
          setState({ user, isLoading: false, isAuthenticated: user !== null });
        }
        return { isOnboarded: parsed.isOnboarded };
      } catch (err) {
        const msg = axios.isAxiosError(err)
          ? (err.response?.data as { error?: string })?.error ?? 'Login failed'
          : 'Login failed';
        toast.error(msg);
        throw err;
      }
    },
    [fetchProfile, saveToken]
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<{ isOnboarded: boolean }> => {
      try {
        const res = await apiClient.post('/api/auth/register', { name, email, password });
        const parsed = EmailAuthResponseSchema.parse(res.data);
        saveToken(parsed.token);
        return { isOnboarded: parsed.isOnboarded };
      } catch (err) {
        const msg = axios.isAxiosError(err)
          ? (err.response?.data as { error?: string })?.error ?? 'Registration failed'
          : 'Registration failed';
        toast.error(msg);
        throw err;
      }
    },
    [saveToken]
  );

  return { ...state, sendOtp, verifyOtp, onboard, logout, emailLogin, register };
}
