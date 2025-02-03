import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroceryItem } from '@/types/grocery';
import { Loader2, ChevronDown, ArrowRightLeft, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { hybridSearchService } from '@/services/hybrid-search-service';

interface SaleRecommendationsProps {
  groceryList: GroceryItem[];
  householdName?: string;
}

interface GroupedRecommendations {
  [key: string]: {
    groceryItem: GroceryItem;
    recommendations: Array<{
      saleItem: any;
      reason: string;
      savingsPercentage: number;
    }>;
  };
}

interface SearchResult {
  saleItem: any;
  reason: string;
  savingsPercentage: number;
}

export function SaleRecommendations({ groceryList, householdName }: SaleRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<GroupedRecommendations>({});
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [lastProcessedIds, setLastProcessedIds] = useState<Set<string>>(new Set());
  const [switchingItems, setSwitchingItems] = useState<Set<string>>(new Set());
  const [switchedItems, setSwitchedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const loadRecommendations = async () => {
      // Filter out completed items
      const activeItems = groceryList.filter(item => !item.completed);
      
      if (activeItems.length === 0) {
        setRecommendations({});
        return;
      }

      setIsLoading(true);
      try {
        // Get current active item IDs
        const currentIds = new Set(activeItems.map(item => item.id));
        const newItems = activeItems.filter(item => !lastProcessedIds.has(item.id));
        
        // If there are no new items and we have recommendations, use existing ones
        if (newItems.length === 0 && Object.keys(recommendations).length > 0) {
          // Filter out recommendations for items no longer in the list
          const filteredRecs = Object.entries(recommendations).reduce((acc, [key, value]) => {
            if (currentIds.has(key)) {
              acc[key] = value;
            }
            return acc;
          }, {} as GroupedRecommendations);
          
          setRecommendations(filteredRecs);
          setIsLoading(false);
          return;
        }

        // Try to get cached recommendations first
        const { data: cachedData } = await supabase
          .from('sale_recommendations')
          .select('*')
          .in('grocery_item_id', activeItems.map(item => item.id));

        let groupedRecs: GroupedRecommendations = {};

        // Process cached recommendations
        if (cachedData && cachedData.length > 0) {
          const cachedMap = new Map(cachedData.map(item => [item.grocery_item_id, item]));
          
          for (const item of activeItems) {
            const cached = cachedMap.get(item.id);
            if (cached && cached.recommendations.length > 0) {
              groupedRecs[item.id] = {
                groceryItem: item,
                recommendations: cached.recommendations
              };
            }
          }
        }

        // Generate new recommendations only for items not in cache
        const itemsNeedingRecs = activeItems.filter(item => !groupedRecs[item.id]);
        if (itemsNeedingRecs.length > 0) {
          // Use hybrid search for recommendations
          const newRecs = await hybridSearchService.searchSaleItems(itemsNeedingRecs);
            
          // Group new recommendations
          newRecs.forEach(rec => {
            const key = rec.groceryItem.id;
            groupedRecs[key] = {
              groceryItem: rec.groceryItem,
              recommendations: rec.recommendations
            };

            // Cache recommendations
            supabase
              .from('sale_recommendations')
              .upsert({
                grocery_item_id: key,
                recommendations: rec.recommendations,
                created_at: new Date().toISOString()
              })
              .then(({ error }) => {
                if (error) console.error('Error caching recommendations:', error);
              });
          });
        }

        setRecommendations(groupedRecs);
        setLastProcessedIds(currentIds);
        
        // Only expand the first product that has recommendations
        const firstItemWithRecs = Object.keys(groupedRecs)[0];
        if (firstItemWithRecs) {
          setExpandedItems(new Set([firstItemWithRecs]));
        }
      } catch (error) {
        console.error('Error loading recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, [groceryList]);

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

  const handleSwitch = async (groceryItem: GroceryItem, saleItem: any) => {
    const switchId = `${groceryItem.id}-${saleItem.id}`;
    setSwitchingItems(prev => new Set([...prev, switchId]));

    try {
      // Update the grocery item with sale information
      const { error } = await supabase
        .from('grocery_items')
        .update({
          name: saleItem.productName,
          supermarket: saleItem.supermarket,
          current_price: saleItem.currentPrice,
          original_price: saleItem.originalPrice,
          sale_type: saleItem.saleType,
          valid_until: saleItem.validUntil,
          image_url: saleItem.imageUrl || null
        })
        .eq('id', groceryItem.id);

      if (error) throw error;

      // Mark the item as switched instead of removing it
      setSwitchedItems(prev => new Set([...prev, switchId]));
    } catch (error) {
      console.error('Error switching item:', error);
    } finally {
      setSwitchingItems(prev => {
        const next = new Set(prev);
        next.delete(switchId);
        return next;
      });
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await hybridSearchService.searchSaleItems([{
        id: 'search',
        name: query,
        emoji: '🔍',
        completed: false,
        category: 'Overig',
      }]);
      
      // Filter out irrelevant matches based on similarity
      if (results.length > 0) {
        const relevantResults = results[0].recommendations.filter(result => {
          // Convert both strings to lowercase for comparison
          const searchTerm = query.toLowerCase();
          const productName = result.saleItem.productName.toLowerCase();
          
          // Check if the product name contains the search term
          // or if the search term contains the product name
          return productName.includes(searchTerm) || searchTerm.includes(productName);
        });
        
        setSearchResults(relevantResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching offers:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

    return (
    <div className="w-full max-w-md mx-auto px-4">
      {/* Search Bar - Always visible */}
          <div className="mb-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-gray-600 transition-colors duration-300" strokeWidth={2} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="Zoek in alle aanbiedingen..."
                className="w-full pl-12 pr-12 py-3.5 bg-white/80 hover:bg-white/90 focus:bg-white backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-sm text-[15px] text-gray-900 placeholder-gray-500 outline-none ring-0 focus:ring-2 ring-offset-0 ring-blue-500/20 transition-all duration-300"
              />
              {searchQuery && (
                <div className="absolute inset-y-0 right-4 flex items-center">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="p-1.5 rounded-full hover:bg-gray-100/80 transition-colors duration-200"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                  </button>
                </div>
              )}
              <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
          </div>

      {/* Search Results - Show when there are search results */}
          {searchQuery && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Zoekresultaten</h3>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                  <span className="text-xs text-gray-500">{searchResults.length} resultaten</span>
                )}
              </div>
              <div className="space-y-2.5">
                <AnimatePresence>
                  {searchResults.map((result, index) => (
                    <motion.div
                      key={`search-${result.saleItem.id}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100/50">
                          {result.saleItem.imageUrl ? (
                            <img
                              src={result.saleItem.imageUrl}
                              alt={result.saleItem.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                              <span className="text-base">🛍️</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-medium text-[13px] text-gray-900 leading-tight">
                              {result.saleItem.productName}
                            </h4>
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100/80 flex-shrink-0 flex items-center justify-center">
                              <img
                                src={`/supermarkets/${result.saleItem.supermarket.toLowerCase()}-logo.png`}
                                alt={result.saleItem.supermarket}
                                className="w-4 h-4 object-contain"
                              />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              €{result.saleItem.currentPrice}
                            </span>
                            {result.saleItem.originalPrice && (
                              <span className="text-xs text-gray-500 line-through">
                                €{result.saleItem.originalPrice}
                              </span>
                            )}
                            <span className="ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                              {result.savingsPercentage}% korting
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {result.saleItem.saleType && (
                              <span className="text-[11px] font-medium text-gray-600 bg-gray-100/80 px-1.5 py-0.5 rounded-md">
                                {result.saleItem.saleType}
                              </span>
                            )}
                            {result.saleItem.validUntil && (
                              <span className="text-[11px] text-gray-500">
                                t/m {new Date(result.saleItem.validUntil).toLocaleDateString('nl-NL')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

      {isLoading ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50">
                <span className="text-xl">🏷️</span>
              </div>
              <div className="min-w-0 max-w-[calc(100%-2.5rem)]">
                <h2 className={cn(
                  "font-semibold text-gray-900 truncate",
                  (householdName?.length ?? 0) > 20 ? "text-base" : "text-lg"
                )}>
                  Aanbiedingen
                </h2>
                <p className={cn(
                  "text-gray-500 font-medium truncate",
                  (householdName?.length ?? 0) > 30 ? "text-[11px]" : 
                  (householdName?.length ?? 0) > 20 ? "text-xs" : 
                  "text-sm"
                )}>
                  {householdName || 'Matches met jouw lijssie'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-1" />
                    <div className="h-3 w-16 bg-gray-50 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : Object.keys(recommendations).length === 0 ? (
      <div className="text-center p-4 text-gray-500 text-sm">
        {groceryList.length === 0 ? (
          "Voeg items toe aan je boodschappenlijst om aanbiedingen te zien."
        ) : (
          "Geen aanbiedingen gevonden voor je boodschappenlijst."
        )}
      </div>
      ) : (
        <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50">
            <span className="text-xl">🏷️</span>
          </div>
          <div className="min-w-0 max-w-[calc(100%-2.5rem)]">
            <h2 className={cn(
              "font-semibold text-gray-900 truncate",
              (householdName?.length ?? 0) > 20 ? "text-base" : "text-lg"
            )}>
              Aanbiedingen
            </h2>
            <p className={cn(
              "text-gray-500 font-medium truncate",
              (householdName?.length ?? 0) > 30 ? "text-[11px]" : 
              (householdName?.length ?? 0) > 20 ? "text-xs" : 
              "text-sm"
            )}>
                  {householdName || 'Matches met jouw lijssie'}
            </p>
          </div>
        </div>
        {recommendations && Object.keys(recommendations).length > 0 && (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            {Object.values(recommendations).reduce((total, group) => total + (group.recommendations?.length || 0), 0)} items
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        <AnimatePresence>
          {Object.entries(recommendations || {}).map(([itemId, group]) => (
            <motion.div
              key={itemId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden"
            >
              {/* Grocery Item Header */}
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50/50 transition-colors duration-200"
                onClick={() => toggleExpanded(itemId)}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 flex-shrink-0">
                  <span className="text-base">{group.groceryItem.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[13px] text-gray-900 truncate">
                    {group.groceryItem.name}
                  </h3>
                  <p className="text-[11px] font-medium text-gray-500">
                    {group.recommendations?.length || 0} aanbieding{(group.recommendations?.length || 0) !== 1 ? 'en' : ''}
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: expandedItems.has(itemId) ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="mr-1"
                >
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </motion.div>
              </div>

              {/* Sale Items */}
              <AnimatePresence>
                {expandedItems.has(itemId) && group.recommendations && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-100/50"
                  >
                    {group.recommendations.map((rec, index) => (
                      <motion.div
                        key={`${itemId}-${rec.saleItem.id}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "flex items-start gap-3 p-3 hover:bg-gray-50/50 transition-colors duration-200",
                          index !== group.recommendations.length - 1 && "border-b border-gray-100/50"
                        )}
                      >
                        {/* Sale Item Image */}
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100/50">
                          {rec.saleItem.imageUrl ? (
                            <img
                              src={rec.saleItem.imageUrl}
                              alt={rec.saleItem.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                              <span className="text-base">🛍️</span>
                            </div>
                          )}
                        </div>

                        {/* Sale Item Info */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-medium text-[13px] text-gray-900 leading-tight">
                              {rec.saleItem.productName}
                            </h4>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSwitch(group.groceryItem, rec.saleItem);
                                }}
                                disabled={switchingItems.has(`${group.groceryItem.id}-${rec.saleItem.id}`)}
                                className={cn(
                                  "group relative flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200",
                                  switchedItems.has(`${group.groceryItem.id}-${rec.saleItem.id}`)
                                    ? "bg-green-100 hover:bg-green-200"
                                    : "bg-blue-50 hover:bg-blue-100"
                                )}
                              >
                                <AnimatePresence mode="wait">
                                  {switchingItems.has(`${group.groceryItem.id}-${rec.saleItem.id}`) ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                  ) : switchedItems.has(`${group.groceryItem.id}-${rec.saleItem.id}`) ? (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      exit={{ scale: 0 }}
                                    >
                                      <Check className="h-3 w-3 text-green-600" />
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      exit={{ scale: 0 }}
                                    >
                                      <ArrowRightLeft className="h-3 w-3 text-blue-600" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                                  {switchedItems.has(`${group.groceryItem.id}-${rec.saleItem.id}`)
                                    ? "Aanbieding toegepast"
                                    : "Wissel naar deze aanbieding"}
                                </span>
                              </button>
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100/80 flex-shrink-0 flex items-center justify-center">
                                <img
                                  src={`/supermarkets/${rec.saleItem.supermarket.toLowerCase()}-logo.png`}
                                  alt={rec.saleItem.supermarket}
                                  className="w-4 h-4 object-contain"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              €{rec.saleItem.currentPrice}
                            </span>
                            {rec.saleItem.originalPrice && (
                              <span className="text-xs text-gray-500 line-through">
                                €{rec.saleItem.originalPrice}
                              </span>
                            )}
                            <span className="ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                              {rec.savingsPercentage}% korting
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {rec.saleItem.saleType && (
                              <span className="text-[11px] font-medium text-gray-600 bg-gray-100/80 px-1.5 py-0.5 rounded-md">
                                {rec.saleItem.saleType}
                              </span>
                            )}
                            {rec.saleItem.validUntil && (
                              <span className="text-[11px] text-gray-500">
                                t/m {new Date(rec.saleItem.validUntil).toLocaleDateString('nl-NL')}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
        </>
      )}
    </div>
  );
} 