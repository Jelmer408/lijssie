import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GroceryListAppComponent } from '@/components/grocery-list-app';
import { useAuth } from '@/contexts/auth-context';
import { LandingPage } from '@/components/auth/LandingPage';
import { HouseholdPage } from '@/components/pages/HouseholdPage';
import { KokenPage } from '@/components/pages/KokenPage';
import { AnimatePresence } from 'framer-motion';
import { HouseholdProvider } from '@/contexts/household-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { NotificationPrompt } from '@/components/NotificationPrompt';
import { Toaster } from "@/components/ui/toaster";
import { OfflineProvider } from '@/contexts/offline-context';

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Only remove the splash screen when auth is ready AND membership is checked
    if (!loading) {
      // We'll let the GroceryListAppComponent handle the splash screen removal
      // when membership check is complete
      if (!user) {
        const initialSplash = document.getElementById('splash');
        if (initialSplash) {
          initialSplash.style.opacity = '0';
          initialSplash.style.transition = 'opacity 0.5s ease';
          setTimeout(() => {
            initialSplash.remove();
          }, 500);
        }
      }
    }
  }, [loading, user]);

  // Keep showing the initial HTML splash screen while loading
  if (loading) {
    return null;
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