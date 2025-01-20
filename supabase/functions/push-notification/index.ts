import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

interface RequestBody {
  user_id: string;
  title: string;
  arrival_time?: number;
  user_email?: string;
  message?: string;
  data: {
    type: string;
    priority?: boolean;
    item_id?: string;
    household_members: string[];
  };
}

interface SupabaseUser {
  id: string;
  email?: string | null;
}

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // Parse request body
    const { user_id, title, message, data } = await req.json() as RequestBody;
    console.log('Received request with:', { user_id, title, message, data });

    // Validate required fields
    if (!user_id || !title || !data || !data.household_members || data.household_members.length === 0) {
      throw new Error('Missing required fields: user_id, title, or household_members');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    console.log('Sending notifications to household members');

    // Send notification only to users in the household
    const notificationPromises = users.users
      .filter(user => data.household_members.includes(user.id))
      .map(async (user: SupabaseUser) => {
        if (!user.email) return null;

        // Generate deterministic secret for each user
        const userSecret = btoa(`${user.id}-${user.email}`).slice(0, 24);

        try {
          const progressierResponse = await fetch(
            'https://progressier.app/Zd7v7sEzzXTBRy4rDXfI/send',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('PROGRESSIER_API_KEY')}`
              },
              body: JSON.stringify({
                recipients: {
                  id: userSecret
                },
                title: title,
                body: message,
                url: '/',
                badge: 'https://imgur.com/Jgnuj77',
                icon: 'https://imgur.com/Jgnuj77',
                data: {
                  ...data,
                  sender_id: user_id
                }
              })
            }
          );

          if (!progressierResponse.ok) {
            const errorText = await progressierResponse.text();
            console.error(`Progressier API error for user ${user.id}:`, errorText);
            return { userId: user.id, success: false, error: errorText };
          }

          const result = await progressierResponse.json();
          console.log(`Notification sent to user ${user.id}:`, result);
          return { userId: user.id, success: true, result };
        } catch (error) {
          console.error(`Error sending notification to user ${user.id}:`, error);
          return { userId: user.id, success: false, error };
        }
      });

    const results = await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: results.filter(Boolean) 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in push-notification function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});