import { Database } from './database.types';

export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];

export interface SupermarketOffer {
  id: string;
  product_name: string;
  supermarket: string;
  offer_price: string;
  original_price: string | null;
  discount_percentage: number | null;
  sale_type: string | null;
  valid_from: string;
  valid_until: string;
  image_url: string | null;
  description: string | null;
  embedding: number[] | null;
}

export interface Recommendation {
  id: string;
  grocery_item_id: string;
  sale_item_id: string;
  reason: string;
  created_at: string;
} 