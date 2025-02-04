import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { productsService } from '@/services/products-service';
import { useToast } from '@/components/ui/use-toast';
import { ProductsGrid } from './ProductsGrid';
import { useHousehold } from '@/contexts/household-context';
import { SalesLayout } from '../sales/SalesLayout';

export function ProductsScreen() {
  const { toast } = useToast();
  const { household } = useHousehold();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setIsLoading(true);
      const data = await productsService.getProducts();
      setProducts(data);
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

  const handleProductClick = (product) => {
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
        groceryList={products} 
        householdName={household?.name}
      />

      <ProductsGrid
        products={products}
        onProductClick={handleProductClick}
      />
    </motion.div>
  );
} 