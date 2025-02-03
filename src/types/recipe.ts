import { CATEGORIES } from '@/services/cooking-service';

export interface RecipeIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  emoji: string;
  category: keyof typeof CATEGORIES;
}

export interface Recipe {
  id: number;
  title: string;
  dutchTitle: string;
  description?: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  createdAt?: string;
} 