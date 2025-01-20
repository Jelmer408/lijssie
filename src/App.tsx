import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GroceryListAppComponent } from '@/components/grocery-list-app';
import { useAuth } from '@/contexts/auth-context';
import { LandingPage } from '@/components/auth/LandingPage';
import { HouseholdPage } from '@/components/pages/HouseholdPage';
import { KokenPage } from '@/components/pages/KokenPage';
import { AnimatePresence } from 'framer-motion';
import { SplashScreen } from './components/splash-screen';
import { HouseholdProvider } from '@/contexts/household-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { NotificationPrompt } from '@/components/NotificationPrompt';
import { Toaster } from "@/components/ui/toaster";
import { OfflineProvider } from '@/contexts/offline-context';

function App() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide splash screen after 2 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading || showSplash) {
    return <SplashScreen />;
  }

  return (
    <HouseholdProvider>
      <OfflineProvider>
        <NotificationProvider>
          <AnimatePresence mode="wait">
            <Routes>
              <Route
                path="/"
                element={
                  user ? <GroceryListAppComponent /> : <Navigate to="/landing" replace />
                }
              />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/join-household" element={<HouseholdPage />} />
              <Route path="/koken" element={<KokenPage />} />
            </Routes>
          </AnimatePresence>
          <NotificationPrompt />
          <Toaster />
        </NotificationProvider>
      </OfflineProvider>
    </HouseholdProvider>
  );
}

export default App; 