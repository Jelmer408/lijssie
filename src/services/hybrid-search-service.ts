import { GroceryItem } from '@/types/grocery';
import { productsService } from './products-service';

interface SearchResult {
  groceryItem: GroceryItem;
  recommendations: Array<{
    saleItem: {
      id: string;
      productName: string;
      supermarkets: Array<{
        name: string;
        currentPrice: string;
        originalPrice: string;
        saleType?: string;
        validUntil?: string;
        savingsPercentage: number;
      }>;
      currentPrice: string;
      originalPrice: string;
      saleType?: string;
      validUntil?: string;
      imageUrl?: string;
    };
    reason: string;
    savingsPercentage: number;
  }>;
}

class HybridSearchService {
  async searchSaleItems(groceryItems: GroceryItem[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const item of groceryItems) {
      // Find products on sale in the same subcategory
      const productsOnSale = await productsService.findProductsOnSale(item.subcategory || '');

      // Map products to recommendations format
      const recommendations = productsOnSale.map(product => ({
        saleItem: {
          id: product.id,
          productName: product.title,
          supermarkets: product.supermarkets,
          currentPrice: product.currentPrice,
          originalPrice: product.originalPrice,
          saleType: product.saleType,
          validUntil: product.validUntil,
          imageUrl: product.image_url
        },
        reason: `${product.savingsPercentage}% korting op ${product.title}`,
        savingsPercentage: product.savingsPercentage
      }));

      if (recommendations.length > 0) {
        results.push({
          groceryItem: item,
          recommendations
        });
      }
    }

    return results;
  }

  async searchSingleItem(searchTerm: string): Promise<SearchResult[]> {
    // Search for products on sale that match the search term
    const productsOnSale = await productsService.searchProductsOnSale(searchTerm);

    // Map products to recommendations format
    const recommendations = productsOnSale.map(product => ({
      saleItem: {
        id: product.id,
        productName: product.title,
        supermarkets: product.supermarkets,
        currentPrice: product.currentPrice,
        originalPrice: product.originalPrice,
        saleType: product.saleType,
        validUntil: product.validUntil,
        imageUrl: product.image_url
      },
      reason: `${product.savingsPercentage}% korting op ${product.title}`,
      savingsPercentage: product.savingsPercentage
    }));

    if (recommendations.length > 0) {
      return [{
        groceryItem: {
          id: 'search',
          name: searchTerm,
          emoji: '🔍',
          completed: false,
          category: 'Overig',
          subcategory: '',
          quantity: '',
          priority: false,
          household_id: '',
          user_id: '',
          user_name: '',
          user_avatar: '',
          created_at: new Date().toISOString(),
          updated_at: '',
          supermarket: '',
          unit: '',
          current_price: '',
          original_price: '',
          sale_type: '',
          valid_until: '',
          image_url: '',
          is_deleted: false,
          product_url: '',
          product_id: '',
          stores: []
        },
        recommendations
      }];
    }

    return [];
  }
}

export const hybridSearchService = new HybridSearchService(); 