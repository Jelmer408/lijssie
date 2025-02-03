import type { Recipe } from './recipe';

export interface MealProposal {
  id: string;
  name: string;
  description: string;
  emoji: string;
  created_by: string;
  date: string;
  created_at: string;
  votes: string[];
  is_recipe?: boolean;
  recipe?: Recipe;
  household_id: string;
}

export interface DayScheduleItem {
  id: string;
  user_id: string;
  is_present: boolean;
  date: string;
  created_at: string;
  user_name: string | null;
  user_avatar: string | null;
} 