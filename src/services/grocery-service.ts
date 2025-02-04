import { supabase } from '@/lib/supabase';
import { GroceryItem, CreateGroceryItem } from '@/types/grocery';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { categorizeGroceryItem } from '@/utils/categorize';
import { Category } from '@/constants/categories';

interface HouseholdSettings {
  max_stores: number;
  selected_stores: Array<{ name: string; isSelected: boolean }>;
  show_price_features: boolean;
}

type GroceryItemChange = {
  id: string;
  household_id: string;
  [key: string]: any;
};

class GroceryService {
  // Get all non-completed items
  async getActiveItems(householdId: string): Promise<GroceryItem[]> {
    const { data, error } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('completed', false)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Add empty stores array to each item
    return (data || []).map(item => ({ ...item, stores: [] }));
  }

  // Get completed items from today
  async getCompletedItemsFromToday(householdId: string): Promise<GroceryItem[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('completed', true)
      .eq('is_deleted', false)
      .gte('updated_at', today.toISOString())
      .order('updated_at', { ascending: false });

    if (error) throw error;
    // Add empty stores array to each item
    return (data || []).map(item => ({ ...item, stores: [] }));
  }

  async addItem(item: CreateGroceryItem, householdId: string): Promise<GroceryItem> {
    try {
      // Get AI categorization if not provided
      let category = item.category;
      let subcategory = item.subcategory;

      if (!subcategory) {
        const categories = await categorizeGroceryItem(item.name);
        category = categories.mainCategory as Category;
        subcategory = categories.subCategory;
      }

      // Destructure stores out of the item to avoid sending it to Supabase
      const { stores, ...itemWithoutStores } = item;

      // Prepare the item data
      const itemData = {
        ...itemWithoutStores,
        household_id: householdId,
        category,
        subcategory,
        unit: item.unit ?? 'st',
        is_deleted: false,
        current_price: item.current_price ?? null,
        original_price: item.original_price ?? null,
        sale_type: item.sale_type ?? null,
        valid_until: item.valid_until ?? null,
        image_url: item.image_url ?? null,
        product_url: item.product_url ?? null,
        supermarket: item.supermarket ?? null,
        updated_at: new Date().toISOString()
      };

      console.log('Adding item with data:', itemData);

      const { data, error } = await supabase
        .from('grocery_items')
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;
      
      // Add empty stores array to the returned data
      return { ...data, stores: [] };
    } catch (error) {
      console.error('Error adding grocery item:', error);
      throw error;
    }
  }

  async updateItem(id: string, updates: Partial<CreateGroceryItem>): Promise<void> {
    // Destructure stores out of the updates to avoid sending it to Supabase
    const { stores, ...updatesWithoutStores } = updates;

    const { error } = await supabase
      .from('grocery_items')
      .update({
        ...updatesWithoutStores,
        updated_at: new Date().toISOString(),
        unit: updates.unit ?? 'st',
        subcategory: updates.subcategory ?? null,
        supermarket: updates.supermarket ?? null,
        current_price: updates.current_price ?? null,
        original_price: updates.original_price ?? null,
        sale_type: updates.sale_type ?? null,
        valid_until: updates.valid_until ?? null,
        image_url: updates.image_url ?? null,
        product_url: updates.product_url ?? null
      })
      .eq('id', id)
      .eq('is_deleted', false);

    if (error) throw error;
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('grocery_items')
      .update({ 
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }

  subscribeToChanges(callback: () => void, householdId?: string) {
    console.log('Setting up grocery items subscription for household:', householdId);
    
    const channel = supabase
      .channel(`grocery_items_${householdId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: householdId ? `household_id=eq.${householdId}` : undefined
        },
        (payload: RealtimePostgresChangesPayload<GroceryItemChange>) => {
          console.log('Received grocery item change:', {
            eventType: payload.eventType,
            itemId: payload.eventType === 'DELETE' 
              ? (payload.old as GroceryItemChange | null)?.id 
              : (payload.new as GroceryItemChange | null)?.id,
            householdId: payload.eventType === 'DELETE'
              ? (payload.old as GroceryItemChange | null)?.household_id
              : (payload.new as GroceryItemChange | null)?.household_id,
            isDeleted: (payload.new as GroceryItemChange | null)?.is_deleted
          });
          
          // Always trigger callback for any change
          callback();
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for grocery items (${householdId || 'all'}):`, status);
      });

    return {
      unsubscribe: () => {
        console.log('Unsubscribing from grocery items changes...');
        supabase.removeChannel(channel);
      }
    };
  }

  // Get household settings
  async getHouseholdSettings(householdId: string): Promise<HouseholdSettings | null> {
    try {
      const { data, error } = await supabase
        .from('household_supermarket_settings')
        .select('*')
        .eq('household_id', householdId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching household settings:', error);
      throw error;
    }
  }

  // Calculate optimal store combination based on household settings
  async calculateOptimalStores(
    items: GroceryItem[], 
    householdId: string
  ): Promise<{ stores: string[]; totalPrice: number } | null> {
    try {
      const settings = await this.getHouseholdSettings(householdId);
      if (!settings || !settings.show_price_features) {
        return null;
      }

      const availableStores = settings.selected_stores.filter(s => s.isSelected);
      if (availableStores.length === 0) {
        return null;
      }

      // Get all products with their prices
      const productsWithPrices = items.filter(product => 
        product.product_id && product.stores && product.stores.length > 0
      );

      if (productsWithPrices.length === 0) {
        return null;
      }

      // Separate products into single-store and multi-store products
      const singleStoreProducts: GroceryItem[] = [];
      const multiStoreProducts: GroceryItem[] = [];

      productsWithPrices.forEach(product => {
        const availableStoresForProduct = product.stores.filter(store =>
          availableStores.some(s => this.normalizeStoreName(s.name) === this.normalizeStoreName(store.name))
        );
        if (availableStoresForProduct.length === 1) {
          singleStoreProducts.push(product);
        } else if (availableStoresForProduct.length > 1) {
          multiStoreProducts.push(product);
        }
      });

      // Get unique stores from single-store products
      const requiredStores = new Set<string>();
      singleStoreProducts.forEach(product => {
        const store = product.stores[0];
        if (store) {
          requiredStores.add(this.normalizeStoreName(store.name));
        }
      });

      // Calculate combinations for multi-store products
      const storeCombinations = new Map<string[], number>();
      const storesWithMultiProducts = new Set<string>();
      
      multiStoreProducts.forEach(product => {
        product.stores.forEach(store => {
          const normalizedName = this.normalizeStoreName(store.name);
          if (availableStores.some(s => this.normalizeStoreName(s.name) === normalizedName)) {
            storesWithMultiProducts.add(normalizedName);
          }
        });
      });

      const multiStoresList = Array.from(storesWithMultiProducts);

      // Calculate combinations within max_stores limit
      if (multiStoreProducts.length > 0) {
        for (let i = 1; i <= Math.min(settings.max_stores, multiStoresList.length); i++) {
          const combinations = this.getCombinations(multiStoresList, i);
          combinations.forEach(combination => {
            let totalPrice = 0;
            let coveredProducts = 0;

            multiStoreProducts.forEach(product => {
              const availablePrices = product.stores
                .filter(store => 
                  combination.some(storeName => 
                    this.normalizeStoreName(store.name) === this.normalizeStoreName(storeName)
                  )
                )
                .map(store => store.price);

              if (availablePrices.length > 0) {
                totalPrice += Math.min(...availablePrices);
                coveredProducts++;
              }
            });

            if (coveredProducts === multiStoreProducts.length) {
              storeCombinations.set(combination, totalPrice);
            }
          });
        }
      }

      // Find best combination
      let bestCombination: string[] | null = null;
      let lowestPrice = Infinity;

      storeCombinations.forEach((price, combination) => {
        if (price < lowestPrice) {
          lowestPrice = price;
          bestCombination = combination;
        }
      });

      // Add required stores from single-store products
      const finalStores = new Set<string>(bestCombination || []);
      requiredStores.forEach(store => finalStores.add(store));

      // Calculate total price including single-store products
      let totalPrice = lowestPrice;
      singleStoreProducts.forEach(product => {
        const store = product.stores[0];
        if (store) {
          totalPrice += store.price;
        }
      });

      // Map normalized names back to display names
      const finalStoresList = Array.from(finalStores).map(normalizedName => 
        availableStores.find(store => 
          this.normalizeStoreName(store.name) === normalizedName
        )?.name || normalizedName
      );

      return {
        stores: finalStoresList,
        totalPrice
      };
    } catch (error) {
      console.error('Error calculating optimal stores:', error);
      return null;
    }
  }

  private normalizeStoreName(name: string): string {
    name = name.toLowerCase();
    if (name === 'ah' || name.includes('albert heijn')) return 'albert heijn';
    if (name.includes('jumbo')) return 'jumbo';
    if (name.includes('plus')) return 'plus';
    if (name.includes('aldi')) return 'aldi';
    if (name.includes('dirk')) return 'dirk';
    if (name.includes('coop')) return 'coop';
    if (name.includes('deka') || name.includes('dekamarkt')) return 'dekamarkt';
    if (name.includes('vomar')) return 'vomar';
    if (name.includes('poiesz')) return 'poiesz';
    if (name.includes('hoogvliet')) return 'hoogvliet';
    return name;
  }

  private getCombinations(arr: string[], n: number): string[][] {
    if (n === 1) return arr.map(val => [val]);
    
    const combinations: string[][] = [];
    
    arr.forEach((val, idx) => {
      const remaining = arr.slice(idx + 1);
      const subCombinations = this.getCombinations(remaining, n - 1);
      subCombinations.forEach(subComb => {
        combinations.push([val, ...subComb]);
      });
    });
    
    return combinations;
  }

  async addGroceryItem(item: Partial<GroceryItem>): Promise<GroceryItem> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const newItem = {
        ...item,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email,
        user_avatar: user.user_metadata?.avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('grocery_items')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding grocery item:', error);
      throw error;
    }
  }
}

export const groceryService = new GroceryService(); 