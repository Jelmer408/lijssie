import { motion, AnimatePresence } from 'framer-motion';
import { SaleItem } from '@/types/sales';
import { SaleCard } from './SaleCard';

interface SalesGridProps {
  sales: SaleItem[];
  onSaleClick?: (sale: SaleItem) => void;
}

export function SalesGrid({ sales, onSaleClick }: SalesGridProps) {
  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">🛍️</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Geen aanbiedingen gevonden
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-md">
          Er zijn momenteel geen aanbiedingen beschikbaar. Kom later terug voor nieuwe deals!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
      <AnimatePresence mode="popLayout">
        {sales.map((sale) => (
          <motion.div
            key={sale.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              opacity: { duration: 0.2 },
              layout: { duration: 0.2 },
            }}
          >
            <SaleCard
              sale={sale}
              onClick={() => onSaleClick?.(sale)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
} 