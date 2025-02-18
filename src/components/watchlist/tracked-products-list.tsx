import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Loader2, Package, Plus, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { groceryService } from '@/services/grocery-service';

interface TrackedProduct {
  id: string;
  product: {
    id: string;
    title: string;
    image_url: string | null;
    quantity_info: string | null;
    category: string | null;
    subcategory: string | null;
    supermarket_data?: {
      name: string;
      price: string;
      offerText?: string;
      offerEndDate?: string;
      pricePerUnit: string;
    }[];
  };
  created_at: string;
  sale_info?: {
    supermarket: string;
    currentPrice: string;
    originalPrice?: string;
    saleType?: string;
    validUntil?: string;
    savingsPercentage?: number;
    isRegularPrice?: boolean;
    offerText?: string;
    supermarket_data: {
      name: string;
      price: string;
      offerText?: string;
      offerEndDate?: string;
      pricePerUnit: string;
    };
  };
}

interface TrackedProductsListProps {
  householdId: string;
  className?: string;
}

export function TrackedProductsList({ householdId, className }: TrackedProductsListProps) {
  const [trackedProducts, setTrackedProducts] = useState<TrackedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingProducts, setDeletingProducts] = useState<Set<string>>(new Set());
  const [isAddingItem, setIsAddingItem] = useState<Set<string>>(new Set());
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTrackedProducts();

    // Set up real-time subscription
    const subscription = supabase
      .channel('product_watchlist_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'product_watchlist',
          filter: `household_id=eq.${householdId}`
        },
        (payload) => {
          console.log('Real-time update:', payload);
          // Refresh the list when changes occur
          fetchTrackedProducts();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [householdId]);

  async function fetchTrackedProducts() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('product_watchlist')
        .select(`
          id,
          created_at,
          product:products (
            id,
            title,
            image_url,
            quantity_info,
            category,
            subcategory,
            supermarket_data
          )
        `)
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process products and their sale information
      const productsWithSales = (data || []).map((item) => {
        // Initialize the base product without sales
        const baseProduct = {
          ...item,
          sale_info: null
        };

        // Check if product has supermarket data with offers
        if (!item.product.supermarket_data || !Array.isArray(item.product.supermarket_data)) {
          return baseProduct;
        }

        // Find sales with actual offers
        const salesWithOffers = item.product.supermarket_data.filter(store => 
          store?.offerText && 
          store.offerText.trim() !== '' &&
          store?.price
        );

        // If no actual offers, return the base product
        if (salesWithOffers.length === 0) {
          return baseProduct;
        }

        // Find the best sale (lowest price) among offers
        const bestSale = salesWithOffers.reduce((best, current) => {
          const currentPrice = parseFloat(current.price.replace('€', '').trim());
          const bestPrice = best ? parseFloat(best.price.replace('€', '').trim()) : Infinity;
          return currentPrice < bestPrice ? current : best;
        });

        // If we found a valid sale, return the product with sale info
        if (bestSale) {
          return {
            ...item,
            sale_info: {
              supermarket: bestSale.name,
              currentPrice: bestSale.price.replace('€', '').trim(),
              offerText: bestSale.offerText,
              validUntil: bestSale.offerEndDate,
              isRegularPrice: false,
              supermarket_data: bestSale
            }
          };
        }

        return baseProduct;
      });

      setTrackedProducts(productsWithSales);
    } catch (err) {
      console.error('Error fetching tracked products:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUntrack(productId: string) {
    try {
      setDeletingProducts(prev => new Set([...prev, productId]));
      
      const { error } = await supabase
        .from('product_watchlist')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setTrackedProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.error('Error untracking product:', err);
    } finally {
      setDeletingProducts(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }

  async function handleAddToGroceryList(item: TrackedProduct) {
    const itemKey = `tracked-${item.id}`;
    
    if (isAddingItem.has(itemKey)) return;

    try {
      setIsAddingItem(prev => new Set([...prev, itemKey]));

      // Create a new grocery item
      const newGroceryItem = {
        name: item.product.title,
        emoji: '🛍️',
        household_id: householdId,
        completed: false,
        priority: false,
        product_id: item.product.id,
        category: item.product.category || 'Overig',
        subcategory: item.product.subcategory || '',
        quantity: '1',
        unit: 'st'
      };

      await groceryService.addGroceryItem(newGroceryItem);

      // Show success state
      setIsAddingItem(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
      setAddedItems(prev => new Set([...prev, itemKey]));

      // Clear after a delay
      setTimeout(() => {
        setAddedItems(prev => {
          const next = new Set(prev);
          next.delete(itemKey);
          return next;
        });
      }, 2000);

    } catch (error) {
      console.error('Error adding item to grocery list:', error);
      setIsAddingItem(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  }

  function handleAddProduct() {
    // Find the search input
    const searchInput = document.querySelector('input[placeholder*="Zoek in alle aanbiedingen"]') as HTMLInputElement;
    if (searchInput) {
      // Scroll to the search input smoothly
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add highlight classes
      searchInput.classList.add('ring-4', 'ring-blue-500/30', 'bg-gradient-to-r', 'from-blue-50/50', 'to-blue-100/50');
      
      // Focus the input
      setTimeout(() => {
        searchInput.focus();
      }, 500);

      // Remove highlight classes after animation
      setTimeout(() => {
        searchInput.classList.remove('ring-4', 'ring-blue-500/30', 'bg-gradient-to-r', 'from-blue-50/50', 'to-blue-100/50');
      }, 2000);
    }
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50">
            <span className="text-xl">🔔</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 text-lg">
              Getrackte producten
            </h2>
          </div>
        </div>
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
          {trackedProducts.length} items
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {trackedProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-4"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <BellOff className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-0.5">
                      Geen getrackte producten
                    </h3>
                    <p className="text-xs text-gray-500">
                      Je krijgt een melding zodra een product in de aanbieding is
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAddProduct}
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-xl transition-colors duration-200 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Product toevoegen
                </button>
              </div>
            </motion.div>
          ) : (
            trackedProducts.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-2.5"
              >
                <div className="flex items-center gap-2">
                  {item.product.image_url && (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white">
                      <img
                        src={item.product.image_url}
                        alt={item.product.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 py-0.5">
                    <h3 className="font-medium text-[13px] text-gray-900 leading-tight mb-1">
                      {item.product.title}
                    </h3>
                    
                    {/* Sale Information */}
                    {item.sale_info ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={`/supermarkets/${item.sale_info.supermarket.toLowerCase()}-logo.png`}
                            alt={item.sale_info.supermarket}
                            className="w-4 h-4 object-contain"
                          />
                          <span className="font-medium text-[13px] text-green-700">
                            €{item.sale_info.currentPrice}
                          </span>
                          <span className="text-[11px] text-green-600 font-medium">
                            {item.sale_info.offerText}
                          </span>
                        </div>
                        {item.sale_info.validUntil && item.sale_info.validUntil.includes('t/m') ? (
                          <span className="text-[11px] text-gray-500">
                            {item.sale_info.validUntil}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-500">
                        Nog niet in de aanbieding
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center self-center gap-1.5">
                    <button
                      onClick={() => handleAddToGroceryList(item)}
                      disabled={isAddingItem.has(`tracked-${item.id}`)}
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                        isAddingItem.has(`tracked-${item.id}`)
                          ? "bg-gray-100 text-gray-400"
                          : addedItems.has(`tracked-${item.id}`)
                          ? "bg-green-100 hover:bg-green-200 text-green-700"
                          : "bg-blue-50 hover:bg-blue-100 text-blue-600"
                      )}
                    >
                      <AnimatePresence mode="wait">
                        {isAddingItem.has(`tracked-${item.id}`) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : addedItems.has(`tracked-${item.id}`) ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Check className="w-4 h-4" />
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Plus className="w-4 h-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                    
                    <button
                      onClick={() => handleUntrack(item.id)}
                      disabled={deletingProducts.has(item.id)}
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                        deletingProducts.has(item.id)
                          ? "bg-gray-100 text-gray-400"
                          : "bg-red-50 hover:bg-red-100 text-red-600"
                      )}
                    >
                      <AnimatePresence mode="wait">
                        {deletingProducts.has(item.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <X className="w-4 h-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 