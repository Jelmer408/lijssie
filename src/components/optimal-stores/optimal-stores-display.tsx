import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GroceryItem } from '@/types/grocery';

interface OptimalStoresDisplayProps {
  optimalStores: string[] | null;
  totalPrice: number;
  selectedStore: string | null;
  onStoreSelect: (store: string | null) => void;
  storeProductCounts: Record<string, number>;
}

export function OptimalStoresDisplay({ 
  optimalStores, 
  totalPrice,
  selectedStore,
  onStoreSelect,
  storeProductCounts
}: OptimalStoresDisplayProps) {
  if (!optimalStores || optimalStores.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/20 shadow-lg overflow-hidden"
    >
      <div className="p-3 border-b border-gray-100 bg-gradient-to-br from-blue-500/5 to-blue-600/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Goedkoopste combinatie
          </h3>
          <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            €{totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex overflow-x-auto scrollbar-hide">
        <div className="flex p-2 gap-1.5">
          <button
            onClick={() => onStoreSelect(null)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all whitespace-nowrap",
              !selectedStore
                ? "bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 shadow-sm"
                : "border-gray-100 hover:bg-gray-50"
            )}
          >
            <span className="text-sm text-gray-700">Alle winkels</span>
          </button>
          {optimalStores.map((store) => (
            <button
              key={store}
              onClick={() => onStoreSelect(store)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all whitespace-nowrap",
                selectedStore === store
                  ? "bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 shadow-sm"
                  : "border-gray-100 hover:bg-gray-50"
              )}
            >
              <div className="w-5 h-5 rounded-lg bg-white border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
                <img
                  src={`/supermarkets/${store.toLowerCase()}-logo.png`}
                  alt={store}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm text-gray-700">{store}</span>
              {storeProductCounts[store] > 0 && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                  {storeProductCounts[store]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
} 