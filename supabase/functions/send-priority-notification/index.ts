import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PROGRESSIER_API_KEY = Deno.env.get('PROGRESSIER_API_KEY')!

interface NotificationPayload {
  householdId: string;
  itemName: string;
  quantity: string;
  addedBy: string;
  emoji: string;
}

serve(async (req) => {
  try {
    const payload = await req.json() as NotificationPayload;
    const { householdId, itemName, quantity, addedBy, emoji } = payload;
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get all household members' push subscriptions
    const { data: members, error: membersError } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', householdId)
    
    if (membersError) throw membersError
    
    // Get push subscriptions for all members
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('subscription_id')
      .in('user_id', members.map(m => m.user_id))
    
    if (subsError) throw subsError
    
    // Send push notification to all subscribers
    const notificationPromises = subscriptions.map(async (sub) => {
      const response = await fetch('https://api.progressier.com/pushnotifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': PROGRESSIER_API_KEY,
        },
        body: JSON.stringify({
          subscriberId: sub.subscription_id,
          title: `Prioriteit: ${emoji} ${itemName}`,
          text: `${addedBy} heeft ${quantity} ${itemName} met prioriteit toegevoegd aan de boodschappenlijst`,
          icon: 'https://yourdomain.com/icon.png', // Update with your app icon
          data: {
            type: 'priority_item',
            itemName,
            householdId
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.statusText}`)
      }
    })
    
    await Promise.all(notificationPromises)
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error sending priority notification:', error)
    
    // Properly type the error response
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 