import { createClient } from '@supabase/supabase-js';

// Create a new Supabase client for the Edge Function
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface NotificationPayload {
  item: {
    user_id: string;
    user_name: string;
    name: string;
  };
  action: string;
  notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
  };
}

export async function sendNotification(notification: PushNotification, user: any, accessToken: string) {
  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.SUPABASE_ANON_KEY || '',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          item: {
            user_id: user.id,
            user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            name: notification.title
          },
          action: 'manual',
          notification: {
            title: notification.title,
            body: notification.body,
            data: notification.data
          }
        } as NotificationPayload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response status:', response.status);
      console.error('Response text:', errorText);
      throw new Error(`Failed to send notification: ${errorText}`);
    }

    const result = await response.json();
    console.log('Notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

export const notificationService = {
  sendNotification
}; 