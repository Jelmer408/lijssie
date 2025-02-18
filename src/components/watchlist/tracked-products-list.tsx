import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellOff, Loader2, Plus, Check, X, Search, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { groceryService } from '@/services/grocery-service';
import { Category } from '@/constants/categories';
import { hybridSearchService } from '@/services/hybrid-search-service';
import Fuse from 'fuse.js';

interface SupermarketData {
  name: string;
  price: string;
  offerText?: string;
  offerEndDate?: string;
  pricePerUnit: string;
}

interface ProductData {
  id: string;
  title: string;
  image_url: string | null;
  quantity_info: string | null;
  category: string | null;
  subcategory: string | null;
  supermarket_data?: SupermarketData[];
}

interface DatabaseProduct {
  id: string;
  created_at: string;
  product?: ProductData;
  search_term?: string | null;
}

interface SearchMatchResult {
  saleItem: {
    id: string;
    productName: string;
    supermarkets: Array<{
      name: string;
      currentPrice: string;
      originalPrice?: string;
      saleType?: string;
      validUntil?: string;
      savingsPercentage: number;
      offerText?: string;
      supermarket_data?: {
        name: string;
        price: string;
        offerText?: string;
        offerEndDate?: string;
        pricePerUnit: string;
      };
    }>;
    currentPrice: string;
    originalPrice?: string;
    saleType?: string;
    validUntil?: string;
    imageUrl?: string;
  };
  reason: string;
  savingsPercentage: number;
}

interface TrackedProduct {
  id: string;
  created_at: string;
  product?: ProductData;
  search_term?: string;
  sale_info: {
    supermarket: string;
    currentPrice: string;
    originalPrice?: string;
    saleType?: string;
    validUntil?: string;
    savingsPercentage?: number;
    isRegularPrice?: boolean;
    offerText?: string;
    supermarket_data: SupermarketData;
  } | null;
  search_matches?: SearchMatchResult[];
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTrackedProducts();

    // Set up real-time subscription
    const subscription = supabase
      .channel('product_watchlist_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_watchlist',
          filter: `household_id=eq.${householdId}`
        },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchTrackedProducts();
        }
      )
      .subscribe();

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
          search_term,
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

      // Process products and fetch search results for search terms
      const processedProducts = await Promise.all(((data as unknown) as DatabaseProduct[]).map(async (item: DatabaseProduct) => {
        // Initialize the base product without sales
        const baseProduct: TrackedProduct = {
          id: item.id,
          created_at: item.created_at,
          product: item.product,
          search_term: item.search_term ? item.search_term : undefined,
          sale_info: null
        };

        // If it's a search term tracking, fetch matching products
        if (item.search_term) {
          const searchResults = await hybridSearchService.searchSingleItem(item.search_term);
          if (searchResults.length > 0) {
            // Create Fuse instance for fuzzy matching
            const fuse = new Fuse(searchResults[0].recommendations, {
              keys: ['saleItem.productName'],
              includeScore: true,
              threshold: 0.4, // Lower threshold means stricter matching
              minMatchCharLength: 3
            });

            // Perform fuzzy search and filter results
            const fuzzyResults = fuse.search(item.search_term);
            const filteredMatches = fuzzyResults
              .filter(result => result.score && result.score < 0.4) // Only keep good matches
              .map(result => result.item);

            // Sort by savings percentage
            const sortedMatches = filteredMatches.sort((a, b) => b.savingsPercentage - a.savingsPercentage);

            baseProduct.search_matches = sortedMatches;
          }
          return baseProduct;
        }

        // Handle product tracking as before
        if (!item.product?.supermarket_data || !Array.isArray(item.product.supermarket_data)) {
          return baseProduct;
        }

        const salesWithOffers = item.product?.supermarket_data.filter((store: SupermarketData) => 
          store?.offerText && 
          store.offerText.trim() !== '' &&
          store?.price
        );

        if (salesWithOffers.length === 0) {
          return baseProduct;
        }

        const bestSale = salesWithOffers.reduce((best: SupermarketData, current: SupermarketData) => {
          const currentPrice = parseFloat(current.price.replace('€', '').trim());
          const bestPrice = best ? parseFloat(best.price.replace('€', '').trim()) : Infinity;
          return currentPrice < bestPrice ? current : best;
        });

        if (bestSale) {
          return {
            ...baseProduct,
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
      }));

      setTrackedProducts(processedProducts);
    } catch (err) {
      console.error('Error fetching tracked products:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

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
        name: item.product?.title,
        emoji: '🛍️',
        household_id: householdId,
        completed: false,
        priority: false,
        product_id: item.product?.id,
        category: (item.product?.category || 'Overig') as Category,
        subcategory: item.product?.subcategory || '',
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
                <div className="flex items-start gap-2">
                  {item.search_term ? (
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 flex-shrink-0">
                      <Search className="w-5 h-5 text-blue-500" />
                    </div>
                  ) : item.product?.image_url ? (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-gray-100 flex items-center justify-center">
                      <img
                        src={item.product.image_url}
                        alt={item.product.title}
                        className="w-full h-full object-contain bg-white"
                      />
                    </div>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-[13px] text-gray-900 leading-tight truncate">
                        {item.search_term ? `Zoekterm: "${item.search_term}"` : item.product?.title}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        {!item.search_term && item.product && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToGroceryList(item);
                            }}
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
                        )}
                        
                        {item.search_term && item.search_matches?.length ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(item.id);
                            }}
                            className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            <motion.div
                              animate={{ rotate: expandedItems.has(item.id) ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            </motion.div>
                          </div>
                        ) : null}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUntrack(item.id);
                          }}
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
                    
                    {/* Sale Information */}
                    {item.sale_info ? (
                      <div className="flex-1 min-w-0">
                        <div 
                          className="flex items-center justify-between bg-gray-50/80 rounded-lg py-1 px-2 cursor-pointer hover:bg-gray-100/80 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(`price-${item.id}`);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={`/supermarkets/${item.sale_info.supermarket.toLowerCase()}-logo.png`}
                              alt={item.sale_info.supermarket}
                              className="w-4 h-4 object-contain"
                            />
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[11px] font-medium text-gray-600">
                                {item.sale_info.supermarket}
                              </span>
                              <span className="font-medium text-[13px] text-green-700">
                                €{item.sale_info.currentPrice}
                              </span>
                              {item.sale_info.offerText && (
                                <span className="text-[11px] text-green-600 font-medium">
                                  {item.sale_info.offerText}
                                </span>
                              )}
                            </div>
                          </div>
                          {item.product?.supermarket_data && item.product.supermarket_data.length > 1 && (
                            <motion.div
                              animate={{ rotate: expandedItems.has(`price-${item.id}`) ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            </motion.div>
                          )}
                        </div>

                        {/* Price Dropdown */}
                        {item.product?.supermarket_data && item.product.supermarket_data.length > 1 && (
                          <AnimatePresence>
                            {expandedItems.has(`price-${item.id}`) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-1 mt-1 overflow-hidden"
                              >
                                {item.product.supermarket_data
                                  .filter(store => store.name !== item.sale_info?.supermarket)
                                  .map((store) => (
                                    <div
                                      key={`${item.id}-${store.name}`}
                                      className="flex items-center justify-between bg-gray-50/80 rounded-lg py-1 px-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={`/supermarkets/${store.name.toLowerCase()}-logo.png`}
                                          alt={store.name}
                                          className="w-4 h-4 object-contain"
                                        />
                                        <div className="flex items-baseline gap-1.5">
                                          <span className="text-[11px] font-medium text-gray-600">
                                            {store.name}
                                          </span>
                                          <span className="font-medium text-[13px] text-gray-700">
                                            €{store.price.replace('€', '').trim()}
                                          </span>
                                          {store.offerText && (
                                            <span className="text-[11px] text-green-600 font-medium">
                                              {store.offerText}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">
                          {item.search_term ? (
                            item.search_matches?.length ? 
                              `${item.search_matches.length} aanbieding${item.search_matches.length !== 1 ? 'en' : ''} gevonden` : 
                              'Zoekterm wordt getrackt'
                          ) : 'Nog niet in de aanbieding'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Search Matches Expansion Panel */}
                {item.search_term && item.search_matches && item.search_matches.length > 0 && (
                  <AnimatePresence>
                    {expandedItems.has(item.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2 border-t border-gray-100/50 pt-2 space-y-2"
                      >
                        {item.search_matches.map((match, index) => (
                          <motion.div
                            key={`${item.id}-match-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-2.5 bg-gray-50/80 rounded-xl p-2"
                          >
                            {match.saleItem.imageUrl && (
                              <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-gray-100 flex items-center justify-center">
                                <img
                                  src={match.saleItem.imageUrl}
                                  alt={match.saleItem.productName}
                                  className="w-full h-full object-contain bg-white"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium text-[13px] text-gray-900 leading-tight truncate">
                                  {match.saleItem.productName}
                                </h4>
                                <button
                                  onClick={() => handleAddToGroceryList({
                                    ...item,
                                    product: {
                                      id: match.saleItem.id,
                                      title: match.saleItem.productName,
                                      image_url: match.saleItem.imageUrl || null,
                                      quantity_info: null,
                                      category: null,
                                      subcategory: null,
                                      supermarket_data: match.saleItem.supermarkets.map(store => ({
                                        name: store.name,
                                        logoUrl: `/supermarkets/${store.name.toLowerCase()}-logo.png`,
                                        price: store.currentPrice,
                                        pricePerUnit: store.supermarket_data?.pricePerUnit || store.currentPrice,
                                        offerText: store.supermarket_data?.offerText,
                                        offerEndDate: store.supermarket_data?.offerEndDate
                                      } as SupermarketData))
                                    }
                                  })}
                                  disabled={isAddingItem.has(`match-${match.saleItem.id}`)}
                                  className={cn(
                                    "flex items-center justify-center w-7 h-7 rounded-lg transition-colors ml-2 flex-shrink-0",
                                    isAddingItem.has(`match-${match.saleItem.id}`)
                                      ? "bg-gray-100 text-gray-400"
                                      : addedItems.has(`match-${match.saleItem.id}`)
                                      ? "bg-green-100 hover:bg-green-200 text-green-700"
                                      : "bg-blue-50 hover:bg-blue-100 text-blue-600"
                                  )}
                                >
                                  <AnimatePresence mode="wait">
                                    {isAddingItem.has(`match-${match.saleItem.id}`) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : addedItems.has(`match-${match.saleItem.id}`) ? (
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
                              </div>
                              
                              <div className="space-y-1">
                                {/* First store (best price) */}
                                {match.saleItem.supermarkets?.length > 0 && (
                                  <div 
                                    className="flex items-center justify-between bg-white rounded-lg py-1 px-2 cursor-pointer hover:bg-gray-50/80 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpanded(`match-${item.id}-${match.saleItem.id}`);
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={`/supermarkets/${match.saleItem.supermarkets[0].name.toLowerCase()}-logo.png`}
                                        alt={match.saleItem.supermarkets[0].name}
                                        className="w-4 h-4 object-contain"
                                      />
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-[11px] font-medium text-gray-600">
                                          {match.saleItem.supermarkets[0].name}
                                        </span>
                                        <span className="font-medium text-[13px] text-green-700">
                                          €{match.saleItem.supermarkets[0].currentPrice}
                                        </span>
                                        {match.saleItem.supermarkets[0].supermarket_data?.offerText && (
                                          <span className="text-[11px] text-green-600 font-medium">
                                            {match.saleItem.supermarkets[0].supermarket_data.offerText}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {match.saleItem.supermarkets.length > 1 && (
                                      <motion.div
                                        animate={{ rotate: expandedItems.has(`match-${item.id}-${match.saleItem.id}`) ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                      </motion.div>
                                    )}
                                  </div>
                                )}

                                {/* Other stores dropdown */}
                                {match.saleItem.supermarkets.length > 1 && (
                                  <AnimatePresence>
                                    {expandedItems.has(`match-${item.id}-${match.saleItem.id}`) && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-1 mt-1 overflow-hidden"
                                      >
                                        {match.saleItem.supermarkets.slice(1).map((store, storeIndex) => (
                                          <div
                                            key={`${item.id}-${match.saleItem.id}-${storeIndex}`}
                                            className="flex items-center justify-between bg-white rounded-lg py-1 px-2"
                                          >
                                            <div className="flex items-center gap-2">
                                              <img
                                                src={`/supermarkets/${store.name.toLowerCase()}-logo.png`}
                                                alt={store.name}
                                                className="w-4 h-4 object-contain"
                                              />
                                              <div className="flex items-baseline gap-1.5">
                                                <span className="text-[11px] font-medium text-gray-600">
                                                  {store.name}
                                                </span>
                                                <span className="font-medium text-[13px] text-gray-700">
                                                  €{store.currentPrice}
                                                </span>
                                                {store.supermarket_data?.offerText && (
                                                  <span className="text-[11px] text-green-600 font-medium">
                                                    {store.supermarket_data.offerText}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 