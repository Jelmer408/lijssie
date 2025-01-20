import { supabase } from '@/lib/supabase';
import { GroceryItem } from '../types/grocery-item';
import { CreateSavedListDTO, SavedList, SavedListItem, UpdateSavedListDTO } from '@/types/saved-list';

class SavedListsService {
  private readonly LISTS_TABLE = 'saved_lists';
  private readonly ITEMS_TABLE = 'saved_list_items';

  async createList(data: CreateSavedListDTO): Promise<SavedList> {
    const { data: list, error: listError } = await supabase
      .from(this.LISTS_TABLE)
      .insert({
        name: data.name,
        description: data.description,
        household_id: data.household_id,
        user_id: data.user_id
      })
      .select()
      .single();

    if (listError) throw new Error(`Failed to create saved list: ${listError.message}`);

    const items = data.items.map(item => ({
      ...item,
      list_id: list.id,
    }));

    const { error: itemsError } = await supabase
      .from(this.ITEMS_TABLE)
      .insert(items);

    if (itemsError) {
      // Rollback list creation if items insertion fails
      await supabase.from(this.LISTS_TABLE).delete().eq('id', list.id);
      throw new Error(`Failed to add items to saved list: ${itemsError.message}`);
    }

    return list;
  }

  async getLists(household_id: string): Promise<SavedList[]> {
    const { data, error } = await supabase
      .from(this.LISTS_TABLE)
      .select('*')
      .eq('household_id', household_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch saved lists: ${error.message}`);
    return data;
  }

  async getListItems(listId: string): Promise<SavedListItem[]> {
    const { data, error } = await supabase
      .from(this.ITEMS_TABLE)
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch list items: ${error.message}`);
    return data;
  }

  async updateList(listId: string, updates: UpdateSavedListDTO): Promise<SavedList> {
    const { data, error } = await supabase
      .from(this.LISTS_TABLE)
      .update(updates)
      .eq('id', listId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update saved list: ${error.message}`);
    return data;
  }

  async deleteList(listId: string): Promise<void> {
    const { error } = await supabase
      .from(this.LISTS_TABLE)
      .delete()
      .eq('id', listId);

    if (error) throw new Error(`Failed to delete saved list: ${error.message}`);
  }

  async addItemsToGroceryList(listId: string): Promise<GroceryItem[]> {
    const items = await this.getListItems(listId);
    
    const groceryItems = items.map(item => ({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      emoji: item.emoji,
      priority: item.priority,
      completed: false,
    }));

    const { data, error } = await supabase
      .from('grocery_items')
      .insert(groceryItems)
      .select();

    if (error) throw new Error(`Failed to add items to grocery list: ${error.message}`);
    return data;
  }
}

export const savedListsService = new SavedListsService(); 