import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/constants/categories';

interface CategoryOrder {
  id: string;
  order: string[];
  updated_at: string;
  household_id: string;
}

// Move default order outside the service object and make it mutable
const getDefaultOrder = (): string[] => [...CATEGORIES];

export const categoryService = {
  async getCategoryOrder(): Promise<string[]> {
    try {
      // Get the user's current household_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: householdMember, error: householdError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

      if (householdError || !householdMember) {
        console.error('Error fetching household:', householdError?.message);
        return getDefaultOrder();
      }

      const { data, error } = await supabase
        .from('category_order')
        .select('*')
        .eq('household_id', householdMember.household_id)
        .single() as { data: CategoryOrder | null, error: any };

      if (error) {
        console.error('Error fetching category order:', error.message);
        return getDefaultOrder();
      }

      // Ensure all categories are present by merging with default order
      const savedOrder = data?.order || [];
      const missingCategories = CATEGORIES.filter(cat => !savedOrder.includes(cat));
      
      // Add missing categories to the beginning of the list
      const updatedOrder = [...missingCategories, ...savedOrder];

      // If there were missing categories, update the database
      if (missingCategories.length > 0) {
        console.log('Adding missing categories:', missingCategories);
        await this.updateCategoryOrder(updatedOrder);
      }

      return updatedOrder;
    } catch (error) {
      console.error('Error in getCategoryOrder:', error instanceof Error ? error.message : 'Unknown error');
      return getDefaultOrder();
    }
  },

  async updateCategoryOrder(newOrder: string[]) {
    try {
      // Get the user's current household_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: householdMember, error: householdError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

      if (householdError || !householdMember) {
        console.error('Error fetching household:', householdError?.message);
        return;
      }

      // Ensure all categories are present
      const missingCategories = CATEGORIES.filter(cat => !newOrder.includes(cat));
      const completeOrder = [...missingCategories, ...newOrder];

      const { data: existingOrder, error: fetchError } = await supabase
        .from('category_order')
        .select('id')
        .eq('household_id', householdMember.household_id)
        .single() as { data: CategoryOrder | null, error: any };

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing order:', fetchError.message);
        return;
      }

      const updateData = {
        order: completeOrder,
        household_id: householdMember.household_id,
        updated_at: new Date().toISOString()
      };

      if (existingOrder?.id) {
        const { error: updateError } = await supabase
          .from('category_order')
          .update(updateData)
          .eq('id', existingOrder.id);

        if (updateError) {
          console.error('Error updating category order:', updateError.message);
        }
      } else {
        const { error: insertError } = await supabase
          .from('category_order')
          .insert(updateData);

        if (insertError) {
          console.error('Error inserting category order:', insertError.message);
        }
      }
    } catch (error) {
      console.error('Error in updateCategoryOrder:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}; 