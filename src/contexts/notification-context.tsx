import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';

interface NotificationContextState {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextState>({
  hasPermission: false,
  requestPermission: async () => false,
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [hasPermission, setHasPermission] = useState(false);
  const { user } = useAuth();

  // Connect user data when user changes or Progressier loads
  useEffect(() => {
    const connectUserData = async () => {
      if (!user?.id || !window.progressier) return;

      try {
        // Generate a deterministic secret for the user
        const userSecret = btoa(`${user.id}-${user.email}`).slice(0, 24);
        
        window.progressier.add({
          id: userSecret, // Use deterministic secret instead of raw user ID
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          // Add additional user metadata that might be useful
          metadata: {
            userId: user.id,
            createdAt: user.created_at,
            lastSignIn: user.last_sign_in_at
          }
        });

        console.log('Connected Progressier user data:', userSecret);
        setHasPermission(true);
      } catch (error) {
        console.error('Error connecting Progressier user data:', error);
        setHasPermission(false);
      }
    };

    // Wait for both user and Progressier to be ready
    const waitForProgressier = () => {
      if (window.progressier) {
        connectUserData();
      } else {
        window.addEventListener('progressier-ready', connectUserData, { once: true });
      }
    };

    if (document.readyState === 'complete') {
      waitForProgressier();
    } else {
      window.addEventListener('load', waitForProgressier, { once: true });
    }

    return () => {
      window.removeEventListener('progressier-ready', connectUserData);
      window.removeEventListener('load', waitForProgressier);
    };
  }, [user]);

  const requestPermission = async (): Promise<boolean> => {
    try {
      if (!user?.id) {
        console.log('No user found when requesting permission');
        return false;
      }

      // Wait for Progressier to be ready
      await new Promise<void>(resolve => {
        if (window.progressier) {
          resolve();
        } else {
          window.addEventListener('progressier-ready', () => resolve(), { once: true });
        }
      });

      // Permission will be requested automatically by Progressier
      // We just need to ensure the user data is connected
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('Error requesting permission:', error);
      setHasPermission(false);
      return false;
    }
  };

  return (
    <NotificationContext.Provider value={{ hasPermission, requestPermission }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext); 