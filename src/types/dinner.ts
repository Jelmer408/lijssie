import { Recipe } from './recipe'

export interface Dinner {
  id: string;
  date: string;
  recipe: Recipe;
  created_by: string;
  created_at: string;
  notes?: string;
  servings?: number;
} 