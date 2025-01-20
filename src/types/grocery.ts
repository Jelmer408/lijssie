import { Category } from '@/constants/categories';

export interface GroceryItem {
  id: string;
  name: string;
  emoji: string;
  completed: boolean;
  category: Category;
  quantity?: string;
  priority?: boolean;
  user_id?: string;
  user_name?: string | null;
  user_avatar?: string | null;
  household_id?: string;
  created_at?: string;
  supermarket?: string;
  current_price?: string;
  original_price?: string;
  sale_type?: string;
  valid_until?: string;
  image_url?: string;
}

export interface CreateGroceryItem {
  name: string;
  quantity: string;
  category: Category;
} 