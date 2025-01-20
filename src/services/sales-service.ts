import { supabase } from '@/lib/supabase';
import { SaleItem } from '@/types/sales';

class SalesService {
  async getCurrentSales(): Promise<SaleItem[]> {
    try {
      const { data, error } = await supabase
        .from('supermarket_offers')
        .select('*')
        .gte('valid_until', new Date().toISOString())
        .order('discount_percentage', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        productName: item.product_name,
        supermarket: this.mapSupermarketName(item.supermarket),
        currentPrice: item.offer_price,
        originalPrice: item.original_price || item.offer_price,
        discountPercentage: item.discount_percentage || 0,
        saleType: item.sale_type || '',
        validFrom: new Date(item.valid_from),
        validUntil: new Date(item.valid_until),
        imageUrl: item.image_url || '',
        category: item.description || 'Overig'
      }));
    } catch (error) {
      console.error('Error fetching sales:', error);
      return [];
    }
  }

  async getSalesBySupermarket(supermarket: string): Promise<SaleItem[]> {
    try {
      const { data, error } = await supabase
        .from('supermarket_offers')
        .select('*')
        .eq('supermarket', this.mapSupermarketId(supermarket))
        .gte('valid_until', new Date().toISOString())
        .order('discount_percentage', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        productName: item.product_name,
        supermarket: this.mapSupermarketName(item.supermarket),
        currentPrice: item.offer_price,
        originalPrice: item.original_price || item.offer_price,
        discountPercentage: item.discount_percentage || 0,
        saleType: item.sale_type || '',
        validFrom: new Date(item.valid_from),
        validUntil: new Date(item.valid_until),
        imageUrl: item.image_url || '',
        category: item.description || 'Overig'
      }));
    } catch (error) {
      console.error('Error fetching sales by supermarket:', error);
      return [];
    }
  }

  async searchSales(query: string): Promise<SaleItem[]> {
    try {
      const { data, error } = await supabase
        .from('supermarket_offers')
        .select('*')
        .textSearch('product_name', query)
        .gte('valid_until', new Date().toISOString())
        .order('discount_percentage', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        productName: item.product_name,
        supermarket: this.mapSupermarketName(item.supermarket),
        currentPrice: item.offer_price,
        originalPrice: item.original_price || item.offer_price,
        discountPercentage: item.discount_percentage || 0,
        saleType: item.sale_type || '',
        validFrom: new Date(item.valid_from),
        validUntil: new Date(item.valid_until),
        imageUrl: item.image_url || '',
        category: item.description || 'Overig'
      }));
    } catch (error) {
      console.error('Error searching sales:', error);
      return [];
    }
  }

  private mapSupermarketName(id: string): string {
    const map: Record<string, string> = {
      'ah': 'Albert Heijn',
      'jumbo': 'Jumbo',
      'dirk': 'Dirk'
    };
    return map[id] || id;
  }

  private mapSupermarketId(name: string): string {
    const map: Record<string, string> = {
      'Albert Heijn': 'ah',
      'Jumbo': 'jumbo',
      'Dirk': 'dirk'
    };
    return map[name] || name.toLowerCase();
  }
}

export const salesService = new SalesService(); 