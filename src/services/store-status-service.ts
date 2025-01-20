import { supabase } from '@/lib/supabase';

export interface StoreStatus {
  id: string;
  user_id: string;
  user_name: string;
  status: 'walking' | 'in_store' | 'inactive';
  arrival_time: number;
  created_at: string;
  household_id: string;
}

interface UpdateStatusParams {
  user_id: string;
  user_name: string;
  status: 'walking' | 'in_store' | 'inactive';
  arrival_time: number;
}

export const storeStatusService = {
  async updateStatus(params: UpdateStatusParams, householdId: string) {
    if (!householdId) throw new Error('No household ID provided');

    const { error } = await supabase
      .from('store_status')
      .upsert({
        user_id: params.user_id,
        user_name: params.user_name,
        status: params.status,
        arrival_time: params.arrival_time,
        household_id: householdId,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      });

    if (error) throw error;

    // Send push notification for status changes
    try {
      let notificationTitle = '';
      let notificationMessage = '';

      switch (params.status) {
        case 'walking':
          notificationTitle = '🚶 Onderweg naar winkel';
          notificationMessage = `${params.user_name} is onderweg naar de winkel en arriveert over ${params.arrival_time} minuten`;
          break;
        case 'in_store':
          notificationTitle = '🛒 In de winkel';
          notificationMessage = `${params.user_name} is nu in de winkel`;
          break;
        case 'inactive':
          // Don't send notification for inactive status
          return;
      }

      if (notificationTitle && notificationMessage) {
        // Get all users in the household
        const { data: householdMembers, error: membersError } = await supabase
          .from('household_members')
          .select('user_id')
          .eq('household_id', householdId);

        if (membersError) throw membersError;

        // Only send notification if we found household members
        if (householdMembers && householdMembers.length > 0) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              user_id: params.user_id,
              title: notificationTitle,
              message: notificationMessage,
              data: {
                type: 'store_status',
                status: params.status,
                user_id: params.user_id,
                household_id: householdId,
                household_members: householdMembers.map(member => member.user_id) // Pass list of household member IDs
              }
            })
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't throw here as the status was successfully updated
    }
  },

  subscribeToStatus(householdId: string, callback: (statuses: StoreStatus[]) => void) {
    try {
      // Initial fetch
      this.getCurrentStatus(householdId).then((initialStatuses) => {
        callback(initialStatuses);
      });

      const channel = supabase.channel('store_status_changes', {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      });
      
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'store_status'
          },
          async (payload) => {
            console.log('Received store status change:', payload);
            const currentStatuses = await this.getCurrentStatus(householdId);
            callback(currentStatuses);
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });

      return () => {
        console.log('Cleaning up subscription...');
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error setting up subscription:', error);
      throw error;
    }
  },

  async getCurrentStatus(householdId: string) {
    if (!householdId) return [];

    const { data, error } = await supabase
      .from('store_status')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter out inactive statuses and keep only the latest status for each user
    const latestStatusByUser = data?.reduce((acc: StoreStatus[], status) => {
      const existingUserIndex = acc.findIndex(s => s.user_id === status.user_id);
      if (existingUserIndex === -1 && status.status !== 'inactive') {
        acc.push(status);
      } else if (existingUserIndex !== -1 && status.status !== 'inactive') {
        // Replace existing status if the new one is more recent
        if (new Date(status.created_at) > new Date(acc[existingUserIndex].created_at)) {
          acc[existingUserIndex] = status;
        }
      }
      return acc;
    }, []);
    
    return latestStatusByUser || [];
  }
}; 