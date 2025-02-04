import { supabase } from '@/lib/supabase';

interface Product {
  id: string;
  title: string;
  image_url: string;
  quantity_info: string;
  category: string;
  subcategory: string;
  main_category: string;
  supermarket_data: Array<{
    name: string;
    logoUrl: string;
    price: string;
    pricePerUnit: string;
    offerText?: string;
    offerEndDate?: string;
  }>;
  last_updated: string;
  url: string;
  created_at: string;
  updated_at: string;
}

interface ProductWithSavings extends Product {
  savingsPercentage: number;
  currentPrice: string;
  originalPrice: string;
  supermarkets: Array<{
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
  }>;
  saleType?: string;
  validUntil?: string;
}

interface SupermarketStore {
  name: string;
  currentPrice: string;
  originalPrice?: string;
  saleType?: string;
  validUntil?: string;
  savingsPercentage: number;
  isRegularPrice?: boolean;
  supermarket_data: {
    name: string;
    price: string;
    offerText?: string;
    offerEndDate?: string;
    pricePerUnit: string;
  };
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

      // Group products by ID and collect all stores with offers
      const productsMap = new Map<string, ProductWithSavings>();

      (data || []).forEach(product => {
        if (!product.supermarket_data) return;

        // Find supermarkets with offers
        const storesWithOffers = product.supermarket_data
          .filter(store => store.offerText)
          .map(store => {
            const currentPrice = store.price.replace('€', '').replace(',', '.').trim();
            const originalPrice = store.pricePerUnit.replace('€', '').replace(',', '.').replace('/stuk', '').trim();

            if (!currentPrice || !originalPrice) return null;

            const current = parseFloat(currentPrice);
            const original = parseFloat(originalPrice);
            const savingsPercentage = Math.round(((original - current) / original) * 100);

            if (savingsPercentage <= 0) return null;

            return {
              name: store.name,
              currentPrice,
              originalPrice,
              saleType: store.offerText,
              validUntil: store.offerEndDate,
              savingsPercentage,
              supermarket_data: {
                name: store.name,
                price: store.price,
                offerText: store.offerText,
                offerEndDate: store.offerEndDate,
                pricePerUnit: store.pricePerUnit
              }
            };
          })
          .filter((store): store is NonNullable<typeof store> => store !== null);

        if (storesWithOffers.length === 0) return;

        // Get the best savings percentage across all stores
        const bestSavings = Math.max(...storesWithOffers.map(store => store.savingsPercentage));
        const bestStore = storesWithOffers.find(store => store.savingsPercentage === bestSavings)!;

        if (productsMap.has(product.id)) {
          // Add stores to existing product
          const existingProduct = productsMap.get(product.id)!;
          existingProduct.supermarkets.push(...storesWithOffers);
        } else {
          // Create new product entry
          productsMap.set(product.id, {
            ...product,
            savingsPercentage: bestSavings,
            currentPrice: bestStore.currentPrice,
            originalPrice: bestStore.originalPrice,
            supermarkets: storesWithOffers,
            saleType: bestStore.saleType,
            validUntil: bestStore.validUntil
          });
        }
      });

      // Convert map to array and sort by best savings
      return Array.from(productsMap.values())
        .sort((a, b) => b.savingsPercentage - a.savingsPercentage);
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

  async searchProductsOnSale(searchTerm: string): Promise<ProductWithSavings[]> {
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
          .filter(store => store.price)
          .map(store => {
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
          .filter((store): store is NonNullable<typeof store> => store !== null);

        if (allStores.length === 0) return;

        // Find the lowest price among all stores
        const lowestPrice = Math.min(...allStores.map(store => parseFloat(store.currentPrice)));

        // Filter stores to include:
        // 1. Stores with active sales (offerText)
        // 2. Stores with regular prices equal to or lower than the lowest sale price
        const relevantStores = allStores.filter(store => {
          const price = parseFloat(store.currentPrice);
          const isCheaperRegularPrice = !store.saleType && price <= lowestPrice;
          return store.saleType || isCheaperRegularPrice;
        }).map(store => ({
          ...store,
          // Mark as regular price if it's not a sale but is one of the cheapest options
          isRegularPrice: !store.saleType
        }));

        if (relevantStores.length === 0) return;

        // Get the best savings percentage across stores with sales
        const storesWithSales = relevantStores.filter(store => store.saleType);
        const bestSavings = storesWithSales.length > 0
          ? Math.max(...storesWithSales.map(store => store.savingsPercentage))
          : 0;
        const bestStore = storesWithSales.length > 0
          ? storesWithSales.find(store => store.savingsPercentage === bestSavings)!
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
}

export const productsService = new ProductsService(); 