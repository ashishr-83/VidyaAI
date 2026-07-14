import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { Layout } from '@/components/Layout';
import { PhonePage } from '@/pages/auth/PhonePage';
import { OtpPage } from '@/pages/auth/OtpPage';
import { OnboardPage } from '@/pages/auth/OnboardPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { HomePage } from '@/pages/home/HomePage';
import { DoubtPage } from '@/pages/doubt/DoubtPage';
import { PlanPage } from '@/pages/plan/PlanPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { WhiteboardPage } from '@/pages/whiteboard/WhiteboardPage';

export function App() {
  return (
    <Routes>
      {/* Auth routes — no guard */}
      <Route path="/auth/login"    element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/phone"    element={<PhonePage />} />
      <Route path="/auth/otp"      element={<OtpPage />} />
      <Route path="/auth/onboard"  element={<OnboardPage />} />

      {/* Protected app routes */}
      <Route
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/home"        element={<HomePage />} />
        <Route path="/doubt"       element={<DoubtPage />} />
        <Route path="/plan"        element={<PlanPage />} />
        <Route path="/profile"     element={<ProfilePage />} />
      </Route>

      {/* Whiteboard — protected but uses its own layout (no sidebar) */}
      <Route
        path="/whiteboard"
        element={
          <AuthGuard>
            <WhiteboardPage />
          </AuthGuard>
        }
      />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}
