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
              setGroceryItems(current => 
                current.map(item => 
                  item.id === payload.new.id ? { ...item, ...payload.new } : item
                )
              );
              break;
            case 'INSERT':
              setGroceryItems(current => [...current, payload.new as GroceryItem]);
              break;
            case 'DELETE':
              setGroceryItems(current => 
                current.filter(item => item.id !== payload.old.id)
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
    <div>
      {/* Render your grocery items here */}
    </div>
  );
};

export default GroceryList; 