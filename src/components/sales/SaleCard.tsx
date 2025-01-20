import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { SaleItem } from '@/types/sales';
import { supermarkets } from '@/constants/supermarkets';

interface SaleCardProps {
  sale: SaleItem;
  onClick?: (sale: SaleItem) => void;
}

const supermarketMapping: Record<string, string> = {
  'Albert Heijn': 'ah',
  'Jumbo': 'jumbo',
  'Dirk': 'dirk',
  'Lidl': 'lidl',
  'Aldi': 'aldi',
  'Plus': 'plus',
};

function formatPrice(price: string | null | undefined): string {
  if (!price) return '0.00';
  
  // Remove any whitespace and split by dash
  const prices = price.trim().split('-');
  // Take the first price
  const firstPrice = prices[0].trim();
  
  // Clean up the price string:
  // 1. Replace comma with dot for decimal
  // 2. Remove any non-numeric characters except dot
  const cleanPrice = firstPrice
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  
  // Parse and format to 2 decimal places
  const numPrice = parseFloat(cleanPrice);
  return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
}

export function SaleCard({ sale, onClick }: SaleCardProps) {
  const formattedDate = format(sale.validUntil, 'dd MMM');
  const supermarketKey = supermarketMapping[sale.supermarket] || sale.supermarket.toLowerCase();
  const supermarket = supermarkets[supermarketKey];

  if (!supermarket) {
    console.error(`Supermarket not found: ${sale.supermarket} (key: ${supermarketKey})`);
    return null;
  }

  const currentPrice = formatPrice(sale.currentPrice);
  const originalPrice = formatPrice(sale.originalPrice);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer"
      onClick={() => onClick?.(sale)}
    >
      {/* Discount Badge */}
      {sale.discountPercentage > 0 && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
          {sale.discountPercentage}%
        </div>
      )}

      {/* Product Image */}
      <div className="relative w-full pt-[100%]">
        <img
          src={sale.imageUrl}
          alt={sale.productName}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Supermarket Logo */}
        <div className="flex items-center gap-2 mb-2">
          <img
            src={supermarket.logo}
            alt={supermarket.name}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm text-gray-600">{supermarket.name}</span>
        </div>

        {/* Product Name */}
        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
          {sale.productName}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-lg font-bold text-gray-900">
            €{currentPrice}
          </span>
          {originalPrice !== '0.00' && (
            <span className="text-sm text-gray-500 line-through">
              €{originalPrice}
            </span>
          )}
        </div>

        {/* Sale Type */}
        {sale.saleType && (
          <div className="text-sm text-gray-600 mb-1">{sale.saleType}</div>
        )}

        {/* Valid Until */}
        <div className="text-xs text-gray-500">
          Geldig t/m {formattedDate}
        </div>
      </div>
    </motion.div>
  );
} 