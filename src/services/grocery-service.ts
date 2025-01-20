import { supabase } from '@/lib/supabase';
import { GroceryItem } from '@/types/grocery';
import * as offlineStore from '@/lib/offline-store';
import { v4 as uuidv4 } from 'uuid';

// Helper to check if we're online
async function isOnline(): Promise<boolean> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export const groceryService = {
  async getItems(householdId: string): Promise<GroceryItem[]> {
    try {
      // Try to get items from Supabase first
      if (await isOnline()) {
        const { data, error } = await supabase
          .from('grocery_items')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Store items locally for offline access
        await offlineStore.storeItemsLocally(data || []);
        return data || [];
      }

      // If offline, get items from local store
      return await offlineStore.getLocalItems(householdId);
    } catch (error) {
      console.error('Error getting items:', error);
      // Fallback to local items if there's an error
      return await offlineStore.getLocalItems(householdId);
    }
  },

  async addItem(item: Omit<GroceryItem, 'id' | 'created_at'>, householdId: string): Promise<GroceryItem> {
    const newItem: GroceryItem = {
      ...item,
      id: uuidv4(), // Generate a temporary ID for offline use
      created_at: new Date().toISOString(),
      household_id: householdId,
    };

    try {
      if (await isOnline()) {
        const { data, error } = await supabase
          .from('grocery_items')
          .insert([newItem])
          .select()
          .single();

        if (error) throw error;
        await offlineStore.addLocalItem(data);
        return data;
      }

      // If offline, store locally and queue for sync
      await offlineStore.addLocalItem(newItem);
      await offlineStore.queueOfflineChange('add', newItem);
      return newItem;
    } catch (error) {
      console.error('Error adding item:', error);
      // Fallback to offline storage
      await offlineStore.addLocalItem(newItem);
      await offlineStore.queueOfflineChange('add', newItem);
      return newItem;
    }
  },

  async updateItem(id: string, updates: Partial<GroceryItem>): Promise<void> {
    try {
      // Get the current item from local store first
      const currentItems = await offlineStore.getLocalItems(updates.household_id || '');
      const currentItem = currentItems.find(item => item.id === id);
      
      if (!currentItem) {
        throw new Error('Item not found');
      }

      const updatedItem = { ...currentItem, ...updates };

      // Always update local store first for immediate feedback
      await offlineStore.updateLocalItem(updatedItem);

      // Try to update Supabase if online
      if (await isOnline()) {
        const { error } = await supabase
          .from('grocery_items')
          .update(updates)
          .eq('id', id);

        if (error) {
          // If Supabase update fails, queue the change for later sync
          await offlineStore.queueOfflineChange('update', updatedItem);
          throw error;
        }
      } else {
        // If offline, queue the change for later sync
        await offlineStore.queueOfflineChange('update', updatedItem);
      }
    } catch (error) {
      console.error('Error updating item:', error);
      // Ensure the change is queued if there was an error
      const currentItems = await offlineStore.getLocalItems(updates.household_id || '');
      const currentItem = currentItems.find(item => item.id === id);
      if (currentItem) {
        const updatedItem = { ...currentItem, ...updates };
        await offlineStore.updateLocalItem(updatedItem);
        await offlineStore.queueOfflineChange('update', updatedItem);
      }
    }
  },

  async deleteItem(id: string): Promise<void> {
    try {
      // Get the item before deleting for offline queue
      const currentItems = await offlineStore.getLocalItems('');
      const itemToDelete = currentItems.find(item => item.id === id);

      if (await isOnline()) {
        const { error } = await supabase
          .from('grocery_items')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      // Delete from local store and queue change
      if (itemToDelete) {
        await offlineStore.deleteLocalItem(id);
        await offlineStore.queueOfflineChange('delete', itemToDelete);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      // Ensure local delete still happens on error
      await offlineStore.deleteLocalItem(id);
      const currentItems = await offlineStore.getLocalItems('');
      const itemToDelete = currentItems.find(item => item.id === id);
      if (itemToDelete) {
        await offlineStore.queueOfflineChange('delete', itemToDelete);
      }
    }
  },

  subscribeToChanges(callback: () => void) {
    return supabase
      .channel('grocery_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
        },
        callback
      )
      .subscribe();
  },
}; 