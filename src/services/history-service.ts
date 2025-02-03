import { supabase } from '@/lib/supabase';
import { GroceryHistory } from '@/types/history';
import { RealtimeChannel } from '@supabase/supabase-js';

export const historyService = {
  async getHistory(): Promise<GroceryHistory[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('grocery_history')
      .select('*')
      .eq('user_id', user.id)
      .order('purchase_count', { ascending: false })
      .order('last_purchased', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addToHistory(item: Partial<GroceryHistory>, householdId: string): Promise<GroceryHistory> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No user found');

      const insertData = {
        name: item.name,
        category: item.category,
        emoji: item.emoji,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        user_avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        created_at: new Date().toISOString(),
        household_id: householdId
      };

      const { data, error } = await supabase
        .from('grocery_history')
        .insert(insertData)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from insert');

      return data;
    } catch (error) {
      console.error('Error adding to history:', error);
      throw error;
    }
  },

  async clearHistory(): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user found');

    const { error } = await supabase
      .from('grocery_history')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  },

  subscribeToChanges(callback: (history: GroceryHistory[]) => void): () => void {
    const channel: RealtimeChannel = supabase
      .channel('history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_history'
        },
        async () => {
          const user = (await supabase.auth.getUser()).data.user;
          if (!user) return;

          const { data } = await supabase
            .from('grocery_history')
            .select('*')
            .eq('user_id', user.id)
            .order('purchase_count', { ascending: false })
            .order('last_purchased', { ascending: false });
          
          callback(data || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}; 