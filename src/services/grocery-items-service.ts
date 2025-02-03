import { supabase } from '@/lib/supabase';
import { CreateGroceryItem } from '@/types/grocery';

export async function addGroceryItem(item: CreateGroceryItem) {
  const { data, error } = await supabase
    .from('grocery_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGroceryItem(id: string, updates: Partial<CreateGroceryItem>) {
  const { data, error } = await supabase
    .from('grocery_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
} 