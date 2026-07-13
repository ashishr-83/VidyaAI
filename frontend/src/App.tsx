import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { Layout } from '@/components/Layout';
import { PhonePage } from '@/pages/auth/PhonePage';
import { OtpPage } from '@/pages/auth/OtpPage';
import { OnboardPage } from '@/pages/auth/OnboardPage';
import { HomePage } from '@/pages/home/HomePage';
import { DoubtPage } from '@/pages/doubt/DoubtPage';
import { PlanPage } from '@/pages/plan/PlanPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';

export function App() {
  return (
    <Routes>
      {/* Auth routes — no guard */}
      <Route path="/auth/phone" element={<PhonePage />} />
      <Route path="/auth/otp" element={<OtpPage />} />
      <Route path="/auth/onboard" element={<OnboardPage />} />

      {/* Protected app routes */}
      <Route
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/home" element={<HomePage />} />
        <Route path="/doubt" element={<DoubtPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/auth/phone" replace />} />
    </Routes>
  );
}
