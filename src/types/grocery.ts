import { Category } from '@/constants/categories';
import { StorePrice } from './store';

// Add NewItemState interface
export interface NewItemState {
  name: string;
  quantity: string;
  unit: string;
  category: Category;
  subcategory: string | null;
  priority: boolean;
  emoji: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  household_id: string;
}

// Base type for common fields
interface BaseGroceryItem {
  name: string;
  quantity: string;
  unit?: string;
  category: Category;
  subcategory: string | null;
  priority: boolean;
  completed: boolean;
  emoji: string | null;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  household_id: string | null;
}

// Full GroceryItem type with all fields
export interface GroceryItem extends BaseGroceryItem {
  id: string;
  created_at: string;
  unit: string;
  updated_at: string | null;
  supermarket: string | null;
  current_price: string | null;
  original_price: string | null;
  sale_type: string | null;
  valid_until: string | null;
  image_url: string | null;
  is_deleted: boolean;
  product_url: string | null;
  product_id?: string | null;
  stores: StorePrice[];
}

// Type for creating a new grocery item
export interface CreateGroceryItem {
  name: string;
  category: Category;
  subcategory: string | null;
  quantity: string;
  unit: string;
  priority: boolean;
  emoji: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  household_id: string;
  completed?: boolean;
  product_id?: string | null;
}

// Type for saved list items
export interface SavedListItem {
  id: string;
  name: string;
  category: Category;
  quantity: string;
  emoji: string;
  priority: boolean;
} 