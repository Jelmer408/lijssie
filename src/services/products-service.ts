import { supabase } from '@/lib/supabase';

interface SupermarketData {
  name: string;
  logoUrl: string;
  price: string;
  pricePerUnit: string;
  offerText?: string;
  offerEndDate?: string;
}

interface StoreWithOffer {
  name: string;
  currentPrice: string;
  originalPrice: string;
  saleType?: string;
  validUntil?: string;
  savingsPercentage: number;
  supermarket_data: {
    name: string;
    price: string;
    offerText?: string;
    offerEndDate?: string;
    pricePerUnit: string;
  };
  isRegularPrice?: boolean;
}

export interface Product {
  id: string;
  title: string;
  image_url: string;
  quantity_info: string;
  category: string;
  subcategory: string;
  main_category: string;
  supermarket_data: SupermarketData[];
  last_updated: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface ProductWithSavings extends Product {
  savingsPercentage: number;
  currentPrice: string;
  originalPrice: string;
  supermarkets: Array<StoreWithOffer>;
  saleType?: string;
  validUntil?: string;
}

class ProductsService {
  async getProducts(category?: string): Promise<Product[]> {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .order('title', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .textSearch('title', searchTerm)
        .order('title', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .order('title', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return [];
    }
  }

  async findProductsOnSale(subcategory: string): Promise<ProductWithSavings[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('subcategory', subcategory)
        .order('title', { ascending: true });

      if (error) throw error;

      const productsWithPrices: ProductWithSavings[] = [];

      for (const product of data || []) {
        if (!product.supermarket_data?.length) continue;

        // Get all store prices
        const stores = product.supermarket_data
          .map((store: SupermarketData) => {
            const currentPrice = this.parsePrice(store.price);
            if (!currentPrice) return null;

            const originalPrice = this.parsePrice(store.pricePerUnit);
            const savingsPercentage = originalPrice && currentPrice < originalPrice
              ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
              : 0;

            return {
              name: store.name,
              currentPrice: currentPrice.toFixed(2),
              originalPrice: originalPrice?.toFixed(2),
              saleType: store.offerText,
              validUntil: store.offerEndDate,
              savingsPercentage,
              isRegularPrice: !store.offerText,
              supermarket_data: store
            };
          })
          .filter((store: StoreWithOffer | null): store is StoreWithOffer => store !== null);

        if (!stores.length) continue;

        // Find best price and savings
        const bestStore = stores.reduce((best: StoreWithOffer, current: StoreWithOffer) => {
          if (current.savingsPercentage > best.savingsPercentage) return current;
          if (current.savingsPercentage === best.savingsPercentage) {
            return parseFloat(current.currentPrice) < parseFloat(best.currentPrice) ? current : best;
          }
          return best;
        }, stores[0]);

        productsWithPrices.push({
          ...product,
          savingsPercentage: bestStore.savingsPercentage,
          currentPrice: bestStore.currentPrice,
          originalPrice: bestStore.originalPrice || bestStore.currentPrice,
          supermarkets: stores,
          saleType: bestStore.saleType,
          validUntil: bestStore.validUntil
        });
      }

      // Sort by savings first, then by price
      return productsWithPrices.sort((a, b) => {
        if (b.savingsPercentage !== a.savingsPercentage) {
          return b.savingsPercentage - a.savingsPercentage;
        }
        return parseFloat(a.currentPrice) - parseFloat(b.currentPrice);
      });

    } catch (error) {
      console.error('Error finding products on sale:', error);
      return [];
    }
  }

  // Helper function to parse price strings
  private parsePrice(priceStr: string): number | null {
    try {
      // Remove currency symbol, spaces, and replace comma with dot
      const cleaned = priceStr
        .replace(/[€\s]/g, '')
        .replace(',', '.')
        .replace('/stuk', '')
        .replace('/l', '')
        .replace('/kg', '')
        .trim();

      // Try to find a valid number in the string
      const match = cleaned.match(/(\d+\.?\d*)/);
      if (!match) return null;

      const price = parseFloat(match[1]);
      return isNaN(price) ? null : price;
    } catch {
      return null;
    }
  }

  async searchProductsOnSale(searchTerm: string, onlySales: boolean = true): Promise<ProductWithSavings[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('title', `%${searchTerm}%`)
        .order('title', { ascending: true });

      if (error) throw error;

      const productsMap = new Map<string, ProductWithSavings>();

      (data || []).forEach(product => {
        if (!product.supermarket_data) return;

        // First, process all stores to get their prices
        const allStores = product.supermarket_data
          .filter((store: SupermarketData) => store.price)
          .map((store: SupermarketData) => {
            const currentPrice = this.parsePrice(store.price);
            const originalPrice = this.parsePrice(store.pricePerUnit);
            
            if (!currentPrice) return null;

            // Calculate savings if we have both prices
            let savingsPercentage = 0;
            if (originalPrice && currentPrice < originalPrice) {
              savingsPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
            }

            return {
              name: store.name,
              currentPrice: currentPrice.toFixed(2),
              originalPrice: originalPrice ? originalPrice.toFixed(2) : undefined,
              saleType: store.offerText,
              validUntil: store.offerEndDate,
              savingsPercentage,
              isRegularPrice: !store.offerText,
              supermarket_data: {
                name: store.name,
                price: store.price,
                offerText: store.offerText,
                offerEndDate: store.offerEndDate,
                pricePerUnit: store.pricePerUnit
              }
            };
          })
          .filter((store: StoreWithOffer | null): store is StoreWithOffer => store !== null);

        if (allStores.length === 0) return;

        // Find the lowest price among all stores
        const lowestPrice = Math.min(...allStores.map((store: StoreWithOffer) => parseFloat(store.currentPrice)));

        // Filter stores based on onlySales parameter
        const relevantStores = onlySales
          ? allStores.filter((store: StoreWithOffer) => store.saleType)
          : allStores.map((store: StoreWithOffer) => ({
              ...store,
              isRegularPrice: !store.saleType
            }));

        if (relevantStores.length === 0) return;

        // Get the best savings percentage across stores with sales
        const storesWithSales = relevantStores.filter((store: StoreWithOffer) => store.saleType);
        const bestSavings = storesWithSales.length > 0
          ? Math.max(...storesWithSales.map((store: StoreWithOffer) => store.savingsPercentage))
          : 0;
        const bestStore = storesWithSales.length > 0
          ? storesWithSales.find((store: StoreWithOffer) => store.savingsPercentage === bestSavings)!
          : relevantStores[0];

        if (productsMap.has(product.id)) {
          // Add stores to existing product
          const existingProduct = productsMap.get(product.id)!;
          existingProduct.supermarkets.push(...relevantStores);
        } else {
          // Create new product entry
          productsMap.set(product.id, {
            ...product,
            savingsPercentage: bestSavings,
            currentPrice: bestStore.currentPrice,
            originalPrice: bestStore.originalPrice || bestStore.currentPrice,
            supermarkets: relevantStores,
            saleType: bestStore.saleType,
            validUntil: bestStore.validUntil
          });
        }
      });

      // Convert map to array and sort by best savings, then by lowest price
      return Array.from(productsMap.values())
        .sort((a, b) => {
          // First sort by savings percentage
          const savingsDiff = b.savingsPercentage - a.savingsPercentage;
          if (savingsDiff !== 0) return savingsDiff;
          
          // If savings are equal, sort by lowest price
          return parseFloat(a.currentPrice) - parseFloat(b.currentPrice);
        });
    } catch (error) {
      console.error('Error searching products on sale:', error);
      return [];
    }
  }

  async getAllSubcategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('subcategory')
        .not('subcategory', 'is', null)
        .order('subcategory');

      if (error) throw error;

      // Get unique subcategories
      const uniqueSubcategories = Array.from(new Set(
        data
          .map(item => item.subcategory)
          .filter(Boolean) // Remove null/undefined values
      ));

      return uniqueSubcategories;
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      return [];
    }
  }
}

export const productsService = new ProductsService(); 