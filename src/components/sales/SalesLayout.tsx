import { GroceryItem } from '@/types/grocery';
import { SaleRecommendations } from './SaleRecommendations';

interface SalesLayoutProps {
  groceryList: GroceryItem[];
  householdName?: string;
}

export function SalesLayout({ groceryList, householdName }: SalesLayoutProps) {
  return (
    <div className="flex flex-col w-full">
      <SaleRecommendations 
        groceryList={groceryList} 
        householdName={householdName} 
      />
    </div>
  );
} 