import { supabase } from '@/lib/supabase';
import { GroceryItem } from '@/types/grocery';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface SaleItem {
  id: string;
  supermarket: 'ah' | 'jumbo' | 'dirk';
  product_name: string;
  description: string | null;
  original_price: number | null;
  offer_price: number;
  discount_percentage: number | null;
  sale_type: string | null;
  valid_from: string;
  valid_until: string;
  image_url: string | null;
  similarity: number;
}

interface HybridSearchResult {
  groceryItem: GroceryItem;
  recommendations: Array<{
    saleItem: {
      id: string;
      supermarket: 'ah' | 'jumbo' | 'dirk';
      productName: string;
      description: string | null;
      originalPrice: number | null;
      currentPrice: number;
      discountPercentage: number | null;
      saleType: string | null;
      validFrom: string;
      validUntil: string;
      imageUrl: string | null;
    };
    reason: string;
    savingsPercentage: number;
  }>;
}

export const hybridSearchService = {
  async searchSaleItems(groceryItems: GroceryItem[]): Promise<HybridSearchResult[]> {
    const results: HybridSearchResult[] = [];

    for (const item of groceryItems) {
      try {
        // Generate embedding for the grocery item
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: item.name,
          dimensions: 384,
        });

        const [{ embedding }] = embeddingResponse.data;

        // Perform hybrid search using Supabase with adjusted weights
        const { data: saleItems, error } = await supabase.rpc('hybrid_search', {
          query_text: item.name,
          query_embedding: embedding,
          match_count: 30,
          full_text_weight: 0.7,
          semantic_weight: 1.3
        });

        if (error) throw error;

        // Transform and filter results with a lower similarity threshold
        const recommendations = (saleItems as SaleItem[])
          .filter(sale => sale.similarity > 0.3)
          .map(sale => ({
            saleItem: {
              id: sale.id,
              supermarket: sale.supermarket,
              productName: sale.product_name,
              description: sale.description,
              originalPrice: sale.original_price,
              currentPrice: sale.offer_price,
              discountPercentage: sale.discount_percentage,
              saleType: sale.sale_type,
              validFrom: sale.valid_from,
              validUntil: sale.valid_until,
              imageUrl: sale.image_url
            },
            reason: `Found matching sale at ${sale.supermarket}`,
            savingsPercentage: sale.discount_percentage || Math.round(
              ((sale.original_price! - sale.offer_price) / sale.original_price!) * 100
            )
          }));

        if (recommendations.length > 0) {
          results.push({
            groceryItem: item,
            recommendations
          });
        }
      } catch (error) {
        console.error(`Error searching for ${item.name}:`, error);
      }
    }

    return results;
  }
}; 