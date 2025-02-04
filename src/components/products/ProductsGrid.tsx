import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
}

interface ProductsGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

export function ProductsGrid({ products, onProductClick }: ProductsGridProps) {
  const getBestPrice = (product: Product) => {
    if (!product.supermarket_data?.length) return null;
    
    const prices = product.supermarket_data.map(store => {
      const priceStr = store.price.replace('€', '').replace(',', '.').trim();
      return parseFloat(priceStr);
    });
    
    return Math.min(...prices);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
      {products.map((product) => {
        const bestPrice = getBestPrice(product);
        
        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onProductClick(product)}
            className={cn(
              'bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer',
              'border border-gray-100 hover:border-blue-100 transition-colors',
              'flex flex-col'
            )}
          >
            {/* Product Image */}
            <div className="relative aspect-square bg-gray-50">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg
                    className="w-12 h-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-3 flex flex-col flex-grow">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                {product.title}
              </h3>
              {product.quantity_info && (
                <p className="text-xs text-gray-500 mt-1">
                  {product.quantity_info}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                {bestPrice !== null ? (
                  <span className="text-sm font-semibold text-blue-600">
                    € {bestPrice.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">
                    Prijs niet beschikbaar
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {product.supermarket_data?.length || 0} winkels
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
} 