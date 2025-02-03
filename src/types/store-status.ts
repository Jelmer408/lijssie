export interface StoreStatus {
  id: string;
  user_id: string;
  user_name: string;
  status: 'walking' | 'in_store' | 'inactive';
  arrival_time: number;
  created_at: string;
} 