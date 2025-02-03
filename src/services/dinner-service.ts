import { supabase } from '@/lib/supabase';
import { Dinner } from '@/types/dinner';
import { MealProposal } from '@/types/meal';
import { Recipe } from '@/types/recipe';

export const dinnerService = {
  async getDinners() {
    const { data, error } = await supabase
      .from('dinners')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;
    return data as Dinner[];
  },

  async addDinner(recipe: Recipe | undefined, householdId: string): Promise<void> {
    if (!recipe) {
      throw new Error('No recipe provided');
    }

    try {
      const { error } = await supabase
        .from('dinners')
        .insert({
          household_id: householdId,
          recipe: recipe,
          planned_for: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error adding dinner:', error);
      throw error;
    }
  },

  async updateDinner(id: string, updates: Partial<Dinner>) {
    const { data, error } = await supabase
      .from('dinners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Dinner;
  },

  async deleteDinner(id: string) {
    const { error } = await supabase
      .from('dinners')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async convertProposalToDinner(proposal: MealProposal) {
    if (!proposal.recipe) {
      throw new Error('No recipe provided in the proposal');
    }

    const dinner: Omit<Dinner, 'id' | 'created_at'> = {
      date: proposal.date,
      recipe: proposal.recipe as Recipe,
      created_by: proposal.created_by,
      notes: proposal.description,
      servings: proposal.recipe.servings
    };

    return this.addDinner(dinner.recipe, proposal.household_id);
  }
}; 