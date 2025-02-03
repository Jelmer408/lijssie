import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SaleItem } from '@/types/sales';
import { salesService } from '@/services/sales-service';
import { SalesGrid } from './SalesGrid';
import { useToast } from '@/components/ui/use-toast';

export function SalesScreen() {
  const { toast } = useToast();
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    try {
      setIsLoading(true);
      const data = await salesService.getCurrentSales();
      setSales(data);
    } catch (error) {
      console.error('Error loading sales:', error);
      toast({
        title: 'Fout bij laden aanbiedingen',
        description: 'Er ging iets mis bij het laden van de aanbiedingen.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaleClick = (sale: SaleItem) => {
    // TODO: Implement sale click handler
    console.log('Sale clicked:', sale);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Aanbiedingen laden...</p>
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
          Aanbiedingen
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Bekijk de beste deals van deze week
        </p>
      </div>

      <SalesGrid
        sales={sales}
        onSaleClick={handleSaleClick}
      />
    </motion.div>
  );
} 