import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface GroceryItem {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  created_at: string;
  updated_at: string;
}

const GroceryList: React.FC = () => {
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);

  // Initial fetch of items
  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('grocery_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching items:', error);
        return;
      }

      setGroceryItems(data || []);
    };

    fetchItems();
  }, []);

  useEffect(() => {
    // Set up real-time subscription for grocery items
    const subscription = supabase
      .channel('grocery_list_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items'
        },
        (payload: any) => {
          // Handle different types of changes
          switch (payload.eventType) {
            case 'UPDATE':
              setGroceryItems((current: GroceryItem[]) => 
                current.map((item: GroceryItem) => 
                  item.id === payload.new.id ? { ...item, ...payload.new } : item
                )
              );
              break;
            case 'INSERT':
              setGroceryItems((current: GroceryItem[]) => [...current, payload.new as GroceryItem]);
              break;
            case 'DELETE':
              setGroceryItems((current: GroceryItem[]) => 
                current.filter((item: GroceryItem) => item.id !== payload.old.id)
              );
              break;
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Boodschappenlijst</h2>
      {groceryItems.length === 0 ? (
        <p className="text-gray-500">Geen items in je boodschappenlijst.</p>
      ) : (
        <ul className="space-y-2">
          {groceryItems.map((item) => (
            <li 
              key={item.id}
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-100"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  {item.category && (
                    <p className="text-sm text-gray-500">{item.category}</p>
                  )}
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GroceryList; 