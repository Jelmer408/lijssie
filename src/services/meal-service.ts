import { supabase } from '@/lib/supabase';
import type { MealProposal } from '../types/meal';

// Export the Recipe interface
export interface Recipe {
  id: string;
  title: string;
  name?: string;
  description?: string;
  emoji?: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  ingredients: Array<{
    id: string;
    name: string;
    amount: number;
    unit: string;
    // Add other ingredient fields
  }>;
  instructions: Array<{
    step: number;
    text: string;
    // Add other instruction fields
  }>;
  source?: string;
  sourceUrl?: string;
  servingSize?: string;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    // Add other nutrition fields
  };
  // Add any other fields your recipe might have
}

interface DaySchedule {
  id: string;
  user_id: string;
  date: string;
  is_present: boolean;
  household_id: string;
  user_name?: string;
  user_avatar?: string;
}

export const mealService = {
  async getProposals(householdId: string): Promise<MealProposal[]> {
    if (!householdId) return [];

    const { data, error } = await supabase
      .from('meal_proposals')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addProposal(proposal: Omit<MealProposal, 'id' | 'created_at' | 'votes'>, householdId: string): Promise<MealProposal> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('No user found');
    if (!householdId) throw new Error('No household found');

    const { data, error } = await supabase
      .from('meal_proposals')
      .insert({
        name: proposal.name,
        description: proposal.description,
        emoji: proposal.emoji,
        created_by: user.id,
        date: proposal.date,
        recipe: proposal.recipe,
        is_recipe: proposal.is_recipe || false,
        household_id: householdId
      })
      .select()
      .single();

    if (error) throw error;

    // Send notification about new meal proposal
    try {
      const dayName = new Date(proposal.date).toLocaleDateString('nl-NL', { weekday: 'long' });
      const notificationTitle = '🍽️ Nieuw maaltijdvoorstel';
      const notificationMessage = `${user.user_metadata?.full_name || 'Iemand'} heeft ${proposal.name} voorgesteld voor ${dayName}`;

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          title: notificationTitle,
          message: notificationMessage,
          data: {
            type: 'meal_proposal',
            proposalId: data.id,
            householdId
          }
        })
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    return data;
  },

  subscribeToProposals(householdId: string, callback: (proposals: MealProposal[]) => void) {
    if (!householdId) return () => {};

    const channel = supabase
      .channel('meal_proposals_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_proposals',
          filter: `household_id=eq.${householdId}`
        },
        async (payload) => {
          console.log('Received meal proposal change:', payload);
          
          // Fetch all proposals for this household
          const { data } = await supabase
            .from('meal_proposals')
            .select('*')
            .eq('household_id', householdId)
            .order('created_at', { ascending: false });
          
          callback(data || []);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },

  async addRecipeProposal(recipe: Recipe, date: string, userId: string, householdId: string) {
    if (!householdId) throw new Error('No household found');

    const { data, error } = await supabase
      .from('meal_proposals')
      .insert({
        name: recipe.title,
        description: recipe.description || '',
        emoji: recipe.emoji || '🍽️',
        created_by: userId,
        date,
        household_id: householdId,
        votes: [],
        is_recipe: true,
        recipe: {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          readyInMinutes: recipe.readyInMinutes,
          servings: recipe.servings,
          image: recipe.image,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          source: recipe.source,
          sourceUrl: recipe.sourceUrl,
          servingSize: recipe.servingSize,
          nutrition: recipe.nutrition,
          // Include any other recipe fields from your Recipe type
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePresence(date: string, isPresent: boolean, householdId: string): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No user found');
      if (!householdId) throw new Error('No household found');

      // First, try to update existing record
      const { data: existingRecord, error: fetchError } = await supabase
        .from('day_schedule')
        .select()
        .eq('user_id', user.id)
        .eq('date', date)
        .eq('household_id', householdId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw fetchError;
      }

      if (existingRecord) {
        // Update existing record - removed updated_at field
        const { error: updateError } = await supabase
          .from('day_schedule')
          .update({
            is_present: isPresent
          })
          .match({ 
            id: existingRecord.id,
            user_id: user.id,
            household_id: householdId 
          });

        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('day_schedule')
          .insert({
            user_id: user.id,
            date,
            is_present: isPresent,
            household_id: householdId,
            user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            user_avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture
          });

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error updating presence:', error);
      throw error;
    }
  },

  async getPresence(date: string, householdId: string): Promise<DaySchedule[]> {
    if (!householdId) return [];

    const { data, error } = await supabase
      .from('day_schedule')
      .select('*')
      .eq('date', date)
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  subscribeToPresence(date: string, householdId: string, callback: (presence: DaySchedule[]) => void) {
    if (!householdId) return () => {};

    const channel = supabase
      .channel(`presence_changes_${householdId}_${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'day_schedule',
          filter: `date=eq.${date}:text,household_id=eq.${householdId}:uuid`
        },
        async (payload) => {
          console.log('Presence change detected:', payload);
          
          // Fetch fresh presence data after any change
          const { data, error } = await supabase
            .from('day_schedule')
            .select('*')
            .eq('date', date)
            .eq('household_id', householdId)
            .order('created_at', { ascending: true });

          if (error) {
            console.error('Error fetching presence data:', error);
            return;
          }

          callback(data || []);
        }
      )
      .subscribe();

    // Initial fetch
    supabase
      .from('day_schedule')
      .select('*')
      .eq('date', date)
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching initial presence data:', error);
          return;
        }
        callback(data || []);
      });

    return () => {
      channel.unsubscribe();
    };
  },

  async updateVotes(proposalId: string, userId: string, householdId: string): Promise<void> {
    if (!householdId) throw new Error('No household found');

    const { data: proposal, error: fetchError } = await supabase
      .from('meal_proposals')
      .select('votes')
      .eq('id', proposalId)
      .single();

    if (fetchError) throw fetchError;

    const currentVotes = proposal.votes || [];
    const hasVoted = currentVotes.includes(userId);
    const newVotes = hasVoted 
      ? currentVotes.filter((id: string) => id !== userId)
      : [...currentVotes, userId];

    const { error: updateError } = await supabase
      .from('meal_proposals')
      .update({ votes: newVotes })
      .eq('id', proposalId)
      .eq('household_id', householdId);

    if (updateError) throw updateError;
  }
}; 