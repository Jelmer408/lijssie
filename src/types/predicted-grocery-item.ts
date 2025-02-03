import { Category } from '@/constants/categories';

export type PredictionReason = 'SMART_SUGGESTION' | 'FREQUENCY' | 'RELATED';

export interface PredictedGroceryItem {
  id: string;
  name: string;
  emoji: string;
  category: Category;
  quantity: string;
  priority: boolean;
  completed: boolean;
  household_id: string;
  explanation: string;
  confidence: number;
  reason?: PredictionReason;
  created_at?: string;
} 