import { GroceryItem } from '@/types/grocery';
import { SaleRecommendations } from './SaleRecommendations';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SalesLayoutProps {
  groceryList: GroceryItem[];
  householdName?: string;
}

export function SalesLayout({ groceryList, householdName: propHouseholdName }: SalesLayoutProps) {
  const [householdName, setHouseholdName] = useState<string | undefined>(propHouseholdName);

  useEffect(() => {
    async function fetchHouseholdName() {
      if (propHouseholdName) {
        setHouseholdName(propHouseholdName);
        return;
      }

      // Get the first grocery item's household_id
      const householdId = groceryList[0]?.household_id;
      if (!householdId) return;

      try {
        const { data, error } = await supabase
          .from('households')
          .select('name')
          .eq('id', householdId)
          .single();

        if (error) throw error;
        setHouseholdName(data?.name);
      } catch (error) {
        console.error('Error fetching household name:', error);
      }
    }

    fetchHouseholdName();
  }, [groceryList, propHouseholdName]);

  return (
    <div className="flex flex-col w-full">
      <SaleRecommendations 
        groceryList={groceryList} 
        householdName={householdName} 
      />
    </div>
  );
} 