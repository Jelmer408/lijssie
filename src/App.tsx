import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { OfflineProvider } from '@/contexts/offline-context';
import { AuthProvider } from '@/lib/auth';
import { HouseholdProvider } from '@/contexts/household-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { NotificationPrompt } from '@/components/NotificationPrompt';
import { LandingPage } from '@/components/auth/LandingPage';
import { LoginPage } from '@/components/auth/LoginPage';
import { HouseholdPage } from '@/components/pages/HouseholdPage';
import { KokenPage } from '@/components/pages/KokenPage';
import MainPage from '@/pages/index';
import { useAuth } from '@/lib/auth';

// Check if app is running as PWA
const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
              (window.navigator as any).standalone || 
              document.referrer.includes('android-app://');

function App() {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <OfflineProvider>
          <NotificationProvider>
            <AnimatePresence mode="wait">
              <Routes>
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <MainPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route 
                  path="/join-household" 
                  element={
                    <ProtectedRoute>
                      <HouseholdPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/koken" 
                  element={
                    <ProtectedRoute>
                      <KokenPage />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
            <NotificationPrompt />
            <Toaster />
          </NotificationProvider>
        </OfflineProvider>
      </HouseholdProvider>
    </AuthProvider>
  );
}

// Add ProtectedRoute component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return isPWA ? <Navigate to="/login" replace /> : <LandingPage />;
  }

  return <>{children}</>;
}

export default App; 