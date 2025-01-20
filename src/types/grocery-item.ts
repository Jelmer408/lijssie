import { Category } from '@/constants/categories';

// Base interface for common properties
export interface BaseGroceryItem {
  id: string;
  name: string;
  category: Category;
  quantity: string;
  emoji: string;
  priority: boolean;
  completed: boolean;
}

// Full interface for database items
export interface GroceryItem extends BaseGroceryItem {
  household_id: string;
  user_id: string | null;
  user_name: string | null;
  user_avatar: string | null;
  created_at: string;
}

// Interface for predicted items before they're added to the list
export interface PredictedGroceryItem extends BaseGroceryItem {
  household_id: string;
  created_at?: string;
  explanation?: string;
  confidence?: number;
  reason?: 'FREQUENCY' | 'RELATED' | 'SMART_SUGGESTION';
} 