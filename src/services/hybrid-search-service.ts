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
        offerText?: string;
        supermarket_data?: {
          name: string;
          price: string;
          offerText?: string;
          offerEndDate?: string;
          pricePerUnit: string;
        };
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
      if (!item.subcategory) continue;

      // Get all products in the same subcategory
      const productsInSubcategory = await productsService.findProductsOnSale(item.subcategory);

      // Filter to only include products that have at least one store with an offer text
      const productsOnSale = productsInSubcategory.filter(product => 
        product.supermarkets.some(store => 
          store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
        )
      );

      // Map products to recommendations format, only including stores with offer text
      const recommendations = productsOnSale.map(product => {
        // Get the first store with an offer text
        const storeWithOffer = product.supermarkets.find(store => 
          store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
        );

        return {
          saleItem: {
            id: product.id,
            productName: product.title,
            supermarkets: product.supermarkets.filter(store => 
              store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
            ),
            currentPrice: product.currentPrice,
            originalPrice: product.originalPrice,
            saleType: product.saleType,
            validUntil: product.validUntil,
            imageUrl: product.image_url
          },
          reason: storeWithOffer?.supermarket_data.offerText 
            ? `${storeWithOffer.supermarket_data.offerText} voor ${product.title}`
            : `Aanbieding voor ${product.title}`,
          savingsPercentage: product.savingsPercentage
        };
      }).filter(rec => rec.saleItem.supermarkets.length > 0); // Only include if there are stores with offer text

      // Add to results if we have recommendations with offer text
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

    // Filter to only include products that have at least one store with an offer text
    const filteredProducts = productsOnSale.filter(product => 
      product.supermarkets.some(store => 
        store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
      )
    );

    // Map products to recommendations format, only including stores with offer text
    const recommendations = filteredProducts.map(product => {
      // Get the first store with an offer text
      const storeWithOffer = product.supermarkets.find(store => 
        store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
      );

      return {
        saleItem: {
          id: product.id,
          productName: product.title,
          supermarkets: product.supermarkets.filter(store => 
            store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
          ),
          currentPrice: product.currentPrice,
          originalPrice: product.originalPrice,
          saleType: product.saleType,
          validUntil: product.validUntil,
          imageUrl: product.image_url
        },
        reason: storeWithOffer?.supermarket_data.offerText 
          ? `${storeWithOffer.supermarket_data.offerText} voor ${product.title}`
          : `Aanbieding voor ${product.title}`,
        savingsPercentage: product.savingsPercentage
      };
    }).filter(rec => rec.saleItem.supermarkets.length > 0); // Only include if there are stores with offer text

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