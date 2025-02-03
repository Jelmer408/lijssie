import { Category } from '@/constants/categories';

export interface SavedList {
  id: string;
  name: string;
  description: string;
  household_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface SavedListItem {
  id: string;
  list_id: string;
  name: string;
  category: Category;
  quantity: string;
  emoji: string;
  priority: boolean;
  product_id: string | null;
  created_at: string;
}

export interface CreateSavedListDTO {
  name: string;
  description: string;
  items: Omit<SavedListItem, 'id' | 'list_id' | 'created_at'>[];
  household_id: string;
  user_id: string;
}

export interface UpdateSavedListDTO {
  name?: string;
  description?: string;
} 