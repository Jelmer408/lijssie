import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { productsService } from '@/services/products-service';
import { useToast } from '@/components/ui/use-toast';
import { ProductsGrid } from './ProductsGrid';
import { useHousehold } from '@/contexts/household-context';
import { SalesLayout } from '../sales/SalesLayout';
import { Product } from '@/services/products-service';
import { GroceryItem } from '@/types/grocery';
import { Category } from '@/constants/categories';
import { StorePrice } from '@/types/store';

export function ProductsScreen() {
  const { toast } = useToast();
  const { household } = useHousehold();
  const [products, setProducts] = useState<Product[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  // Map Product to GroceryItem
  const mapProductToGroceryItem = (product: Product): GroceryItem => {
    const stores: StorePrice[] = product.supermarket_data.map(store => {
      const priceStr = store.price.replace('€', '').replace(',', '.').trim();
      const price = parseFloat(priceStr);
      
      return {
        name: store.name,
        price: isNaN(price) ? 0 : price,
        current_price: store.price,
        original_price: store.pricePerUnit,
        sale_type: store.offerText,
        valid_until: store.offerEndDate
      };
    });

    return {
      id: product.id,
      name: product.title,
      quantity: product.quantity_info || '1',
      unit: 'stuk',
      category: product.main_category as Category,
      subcategory: product.subcategory,
      priority: false,
      completed: false,
      emoji: '🛒',
      user_id: household?.id || '',
      user_name: null,
      user_avatar: null,
      household_id: household?.id || null,
      created_at: product.created_at,
      updated_at: product.updated_at,
      supermarket: product.supermarket_data?.[0]?.name || null,
      current_price: product.supermarket_data?.[0]?.price || null,
      original_price: product.supermarket_data?.[0]?.pricePerUnit || null,
      sale_type: product.supermarket_data?.[0]?.offerText || null,
      valid_until: product.supermarket_data?.[0]?.offerEndDate || null,
      image_url: product.image_url,
      is_deleted: false,
      product_url: product.url,
      product_id: product.id,
      stores
    };
  };

  async function loadProducts() {
    try {
      setIsLoading(true);
      const data = await productsService.getProducts();
      setProducts(data);
      // Map products to grocery items
      const mappedItems = data.map(mapProductToGroceryItem);
      setGroceryItems(mappedItems);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: 'Fout bij laden producten',
        description: 'Er ging iets mis bij het laden van de producten.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleProductClick = (product: Product) => {
    // TODO: Implement product click handler
    console.log('Product clicked:', product);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Producten laden...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="px-4 pt-2">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Producten
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Bekijk alle beschikbare producten
        </p>
      </div>

      <SalesLayout 
        groceryList={groceryItems} 
        householdName={household?.name}
      />

      <ProductsGrid
        products={products}
        onProductClick={handleProductClick}
      />
    </motion.div>
  );
} 