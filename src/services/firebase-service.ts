import { supabase } from "@/lib/supabase";
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate config before initialization
const validateConfig = () => {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ] as const;

  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missingFields.join(', ')}. Check your .env file.`);
  }
};

validateConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const firebaseService = {
  async requestNotificationPermission(): Promise<string | null> {
    try {
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return null;
      }

      // First register service worker
      if (!('serviceWorker' in navigator)) {
        console.log('Service workers are not supported');
        return null;
      }

      try {
        // Check for existing Firebase messaging service worker
        const registrations = await navigator.serviceWorker.getRegistrations();
        const existingFirebaseWorker = registrations.find(
          registration => registration.scope.includes('firebase-cloud-messaging')
        );

        // Only register if we don't have a Firebase worker
        if (!existingFirebaseWorker) {
          // Register new service worker with a specific scope
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/firebase-cloud-messaging/'
          });
          await registration.update();
          
          // Wait for the service worker to be ready
          await navigator.serviceWorker.ready;
        }

        // Now request notification permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          try {
            // Get FCM token using the existing or new registration
            const registration = (await navigator.serviceWorker.ready);
            const token = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
              serviceWorkerRegistration: registration
            });
          
            if (!token) {
              console.error('No registration token available');
              return null;
            }
            
            return token;
          } catch (err) {
            console.error('Error getting FCM token:', err);
            return null;
          }
        }
      } catch (err) {
        console.error('Error registering service worker:', err);
        return null;
      }
      return null;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return null;
    }
  },

  async saveFCMToken(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_fcm_tokens')
        .upsert(
          {
            user_id: userId,
            fcm_token: token,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false
          }
        );

      if (error) {
        console.error('Error saving FCM token:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveFCMToken:', error);
      throw error;
    }
  },

  setupMessageListener(callback: (payload: MessagePayload) => void) {
    return onMessage(messaging, (payload) => {
      callback(payload);
    });
  }
}; 