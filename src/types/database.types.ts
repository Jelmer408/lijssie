export interface Database {
  public: {
    Tables: {
      supermarket_offers: {
        Row: {
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
        };
      };
      recommendations: {
        Row: {
          id: string;
          grocery_item_id: string;
          sale_item_id: string;
          reason: string;
          created_at: string;
        };
      };
    };
    Enums: {};
  };
}
