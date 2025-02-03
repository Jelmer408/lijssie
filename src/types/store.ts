export interface StorePrice {
  name: string;
  price: number;
  isBest?: boolean;
  logo?: string;
  distance?: string;
  sale?: {
    originalPrice: number;
    type: string;
    daysLeft?: number;
  };
  current_price?: string;
  original_price?: string;
  sale_type?: string;
  valid_until?: string;
} 