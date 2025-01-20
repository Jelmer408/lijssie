import { Category } from '@/constants/categories';

export interface BaseGroceryItem {
  id: string;
  name: string;
  emoji: string;
  category: Category;
  quantity: string;
  priority: boolean;
  completed: boolean;
} 