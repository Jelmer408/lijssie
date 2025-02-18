import { GroceryItem } from '@/types/grocery';
import { productsService, type ProductWithSavings } from './products-service';
import Fuse from 'fuse.js';
import { expandDutchSearchTerms, getSynonymCategories } from '@/utils/dutch-product-synonyms';
import { Category } from '@/constants/categories';

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

interface StoreData {
  supermarket_data?: {
    offerText?: string;
  };
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
    // Expand search terms with Dutch synonyms
    const expandedTerms = expandDutchSearchTerms(searchTerm);
    const { category, subcategory } = getSynonymCategories(searchTerm);

    // Search for products on sale that match any of the expanded terms
    const searchPromises = expandedTerms.map(term => 
      productsService.searchProductsOnSale(term)
    );

    const searchResults = await Promise.all(searchPromises);
    const productsOnSale = searchResults.flat();

    // If we have category/subcategory info from synonyms, search those as well
    let categoryProducts: ProductWithSavings[] = [];
    if (subcategory) {
      categoryProducts = await productsService.findProductsOnSale(subcategory);
    }

    // Create a Fuse instance for fuzzy matching subcategories
    const allSubcategories = await productsService.getAllSubcategories();
    const fuseOptions = {
      includeScore: true,
      threshold: 0.4, // Lower threshold means stricter matching
      keys: ['name']
    };

    interface SubcategoryItem {
      name: string;
    }

    const fuse = new Fuse<SubcategoryItem>(
      allSubcategories.map((s: string) => ({ name: s })), 
      fuseOptions
    );

    // Get fuzzy matched subcategories (excluding the one we already searched)
    const matchedSubcategories = fuse.search(searchTerm)
      .map((result) => (result.item as SubcategoryItem).name)
      .filter(subcat => subcat !== subcategory); // Exclude already searched subcategory

    // Get products from matched subcategories
    const subcategoryProducts = matchedSubcategories.length > 0 
      ? await Promise.all(matchedSubcategories.map(subcat => 
          productsService.findProductsOnSale(subcat)
        )).then(results => results.flat())
      : [];

    // Combine all results
    const combinedProducts = [
      ...productsOnSale,
      ...categoryProducts,
      ...subcategoryProducts
    ];

    // Remove duplicates based on product ID
    const uniqueProducts = Array.from(
      new Map(combinedProducts.map(item => [item.id, item])).values()
    );

    // Filter to only include products that have at least one store with an offer text
    const filteredProducts = uniqueProducts.filter(product => 
      product.supermarkets.some((store: StoreData) => 
        store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
      )
    );

    // Map products to recommendations format, only including stores with offer text
    const recommendations = filteredProducts.map(product => {
      // Get the first store with an offer text
      const storeWithOffer = product.supermarkets.find((store: StoreData) => 
        store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
      );

      return {
        saleItem: {
          id: product.id,
          productName: product.title,
          supermarkets: product.supermarkets.filter((store: StoreData) => 
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
    }).filter(rec => rec.saleItem.supermarkets.length > 0) // Only include if there are stores with offer text
      .sort((a, b) => b.savingsPercentage - a.savingsPercentage); // Sort by highest savings first

    if (recommendations.length > 0) {
      // Map synonym categories to app categories
      const categoryMapping: Record<string, Category> = {
        'Huishouden': 'Huishouden',
        'Verzorging': 'Drogisterij',
        'Tussendoor': 'Tussendoortjes',
        'Dranken': 'Frisdrank en sappen',
        'Groente & Fruit': 'Aardappel, groente en fruit',
        'Brood & Banket': 'Broden, bakkerij en banket',
        'Zuivel & Eieren': 'Zuivel, boter en eieren'
      };

      // Get emoji based on category
      const getEmoji = (cat: string): string => {
        switch (cat) {
          case 'Huishouden': return '��';
          case 'Verzorging': return '🧴';
          case 'Tussendoor': return '🍪';
          case 'Dranken': return '🥤';
          case 'Groente & Fruit': return '🥬';
          case 'Brood & Banket': return '🥖';
          case 'Zuivel & Eieren': return '🥛';
          default: return '🔍';
        }
      };

      return [{
        groceryItem: {
          id: 'search',
          name: searchTerm,
          emoji: category ? getEmoji(category) : '🔍',
          completed: false,
          category: category ? (categoryMapping[category] || 'Overig') : 'Overig',
          subcategory: subcategory || '',
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