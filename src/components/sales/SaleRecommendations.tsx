import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroceryItem } from '@/types/grocery';
import { Loader2, ChevronDown, ArrowRightLeft, Check, Search, X, MessageSquareWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { hybridSearchService } from '@/services/hybrid-search-service';
import Fuse from 'fuse.js';

// Fuse.js options for fuzzy matching
const fuseOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: ['saleItem.productName']
};

interface SupermarketStore {
  name: string;
  currentPrice: string;
  originalPrice?: string;
  saleType?: string;
  validUntil?: string;
  savingsPercentage: number;
  isRegularPrice?: boolean;
  offerText?: string;
  supermarket_data: {
    name: string;
    price: string;
    offerText?: string;
    offerEndDate?: string;
    pricePerUnit: string;
  };
}

interface SaleItem {
  id: string;
  productName: string;
  supermarkets?: SupermarketStore[];
  currentPrice: string;
  originalPrice?: string;
  saleType?: string;
  validUntil?: string;
  imageUrl?: string;
}

interface SaleRecommendationsProps {
  groceryList: GroceryItem[];
  householdName?: string;
  onPopupChange?: (isOpen: boolean) => void;
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
  saleItem: SaleItem;
  reason: string;
  savingsPercentage: number;
}

export function SaleRecommendations({ groceryList, householdName, onPopupChange }: SaleRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<GroupedRecommendations>({});
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [lastProcessedIds, setLastProcessedIds] = useState<Set<string>>(new Set());
  const [switchingItems, setSwitchingItems] = useState<Set<string>>(new Set());
  const [switchedItems, setSwitchedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [, setHasSeenWelcome] = useState(false);

  const filterRecommendationsByFuzzyMatch = (groceryItemName: string, recommendations: Array<any>) => {
    const fuse = new Fuse(recommendations, fuseOptions);
    const results = fuse.search(groceryItemName);
    
    // Only keep matches with a reasonable score (lower is better)
    return results
      .filter(result => result.score && result.score < 0.6)
      .map(result => result.item);
  };

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

        // Process cached recommendations with fuzzy matching
        if (cachedData && cachedData.length > 0) {
          const cachedMap = new Map(cachedData.map(item => [item.grocery_item_id, item]));
          
          for (const item of activeItems) {
            const cached = cachedMap.get(item.id);
            if (cached && cached.recommendations.length > 0) {
              // Apply fuzzy matching to cached recommendations
              const filteredRecommendations = filterRecommendationsByFuzzyMatch(
                item.name,
                cached.recommendations
              );

              if (filteredRecommendations.length > 0) {
                groupedRecs[item.id] = {
                  groceryItem: item,
                  recommendations: filteredRecommendations
                };
              }
            }
          }
        }

        // Generate new recommendations only for items not in cache
        const itemsNeedingRecs = activeItems.filter(item => !groupedRecs[item.id]);
        if (itemsNeedingRecs.length > 0) {
          // Use hybrid search for recommendations
          const newRecs = await hybridSearchService.searchSaleItems(itemsNeedingRecs);
            
          // Group new recommendations with fuzzy matching
          newRecs.forEach(rec => {
            const key = rec.groceryItem.id;
            
            // Apply fuzzy matching to filter recommendations
            const filteredRecommendations = filterRecommendationsByFuzzyMatch(
              rec.groceryItem.name,
              rec.recommendations
            );

            if (filteredRecommendations.length > 0) {
              groupedRecs[key] = {
                groceryItem: rec.groceryItem,
                recommendations: filteredRecommendations
              };

              // Cache recommendations
              supabase
                .from('sale_recommendations')
                .upsert({
                  grocery_item_id: key,
                  recommendations: filteredRecommendations.map(r => ({
                    ...r,
                    saleItem: {
                      ...r.saleItem,
                      supermarkets: r.saleItem.supermarkets?.map((store: SupermarketStore) => ({
                        ...store,
                        supermarket_data: store.supermarket_data || {
                          name: store.name,
                          price: `€ ${store.currentPrice}`,
                          offerText: store.offerText || `${store.savingsPercentage}% korting`,
                          offerEndDate: store.validUntil
                        }
                      }))
                    }
                  })),
                  created_at: new Date().toISOString()
                })
                .then(({ error }) => {
                  if (error) console.error('Error caching recommendations:', error);
                });
            }
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

  useEffect(() => {
    // Check if user has seen the welcome message
    const checkWelcomeStatus = () => {
      const hasSeenWelcome = localStorage.getItem('has_seen_sale_welcome') === 'true';
      if (!hasSeenWelcome) {
        setShowWelcomePopup(true);
        onPopupChange?.(true);
      } else {
        setHasSeenWelcome(true);
      }
    };

    checkWelcomeStatus();
  }, [onPopupChange]);

  const handleCloseWelcome = () => {
    setShowWelcomePopup(false);
    setHasSeenWelcome(true);
    onPopupChange?.(false);

    // Store that user has seen the welcome message
    localStorage.setItem('has_seen_sale_welcome', 'true');
  };

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

  const handleSwitch = async (groceryItem: GroceryItem, saleItem: any, store: any) => {
    const switchId = `${groceryItem.id}-${saleItem.id}-${store.name}`;
    setSwitchingItems(prev => new Set([...prev, switchId]));

    try {
      // Update only the product_id of the grocery item
      const { error } = await supabase
        .from('grocery_items')
        .update({
          product_id: saleItem.id
        })
        .eq('id', groceryItem.id);

      if (error) throw error;

      // Mark the item as switched
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
      const results = await hybridSearchService.searchSingleItem(query);
      if (results.length > 0) {
        // Apply fuzzy matching to search results
        const filteredResults = filterRecommendationsByFuzzyMatch(
          query,
          results[0].recommendations
        );
        setSearchResults(filteredResults);
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
      <AnimatePresence>
        {showWelcomePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ touchAction: 'none' }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-lg px-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-50 mb-6">
                  <MessageSquareWarning className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                  Beta: Aanbiedingen Matcher
                </h2>
                <p className="text-gray-600 mb-8 text-base">
                   Ik ben nog hard bezig met alle producten te importeren in Lijssie, dit zal in Februari afgerond zijn.
                  Hierdoor kunnen sommige matches nog niet helemaal accuraat zijn.
                </p>
                <div className="space-y-4 text-left w-full mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-medium text-blue-700">1</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Slimme Matches</h3>
                      <p className="text-sm text-gray-600">
                        We matchen je boodschappen automatisch met actuele aanbiedingen van verschillende supermarkten
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-medium text-blue-700">2</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Continue Verbetering</h3>
                      <p className="text-sm text-gray-600">
                        De matches worden steeds beter naarmate we meer data verzamelen en ons systeem verbeteren
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-medium text-blue-700">3</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Jouw Feedback</h3>
                      <p className="text-sm text-gray-600">
                        Feedback is zeer welkom! Help ons de feature te verbeteren door je ervaringen te delen
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCloseWelcome}
                  className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors duration-200 text-base"
                >
                  Begrepen, laat zien!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                      <div className="flex items-start gap-2.5 p-2.5">
                        {result.saleItem.imageUrl && (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100/50">
                            <img
                              src={result.saleItem.imageUrl}
                              alt={result.saleItem.productName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[13px] text-gray-900 leading-tight mb-1.5">
                            {result.saleItem.productName}
                          </h4>
                          
                          <div className="space-y-1">
                            {result.saleItem.supermarkets?.map((store: SupermarketStore) => (
                              <div key={store.name} className="flex items-center justify-between bg-gray-50/80 rounded-lg py-1.5 px-2">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={`/supermarkets/${store.name.toLowerCase()}-logo.png`}
                                    alt={store.name}
                                    className="w-4 h-4 object-contain"
                                  />
                                  <div className="flex items-baseline gap-1.5">
                                    <span className={cn(
                                      "font-medium text-[13px]",
                                      store.isRegularPrice ? "text-gray-900" : "text-green-700"
                                    )}>
                                      €{store.currentPrice}
                                    </span>
                                    {store.isRegularPrice ? (
                                      <span className="text-[11px] text-gray-600 font-medium">
                                        Reguliere prijs
                                      </span>
                                    ) : store.supermarket_data?.offerText && (
                                      <span className="text-[11px] text-green-600 font-medium">
                                        {store.supermarket_data.offerText}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Create a temporary grocery item for the search result
                                    const searchGroceryItem: GroceryItem = {
                                      id: 'search-' + Date.now(),
                                      name: searchQuery,
                                      emoji: '🔍',
                                      completed: false,
                                      category: 'Overig',
                                      subcategory: '',
                                      quantity: '',
                                      priority: false,
                                      household_id: '',
                                      user_id: '',
                                      user_name: '',
                                      user_avatar: '',
                                      created_at: new Date().toISOString(),
                                      updated_at: '',
                                      supermarket: '',
                                      unit: '',
                                      current_price: '',
                                      original_price: '',
                                      sale_type: '',
                                      valid_until: '',
                                      image_url: '',
                                      is_deleted: false,
                                      product_url: '',
                                      product_id: '',
                                      stores: []
                                    };
                                    handleSwitch(searchGroceryItem, result.saleItem, store);
                                  }}
                                  disabled={switchingItems.has(`search-${result.saleItem.id}-${store.name}`)}
                                  className={cn(
                                    "group relative flex h-6 px-2 items-center justify-center rounded-md text-[11px] font-medium transition-all duration-200",
                                    switchedItems.has(`search-${result.saleItem.id}-${store.name}`)
                                      ? "bg-green-100 hover:bg-green-200 text-green-700"
                                      : "bg-blue-50 hover:bg-blue-100 text-blue-700"
                                  )}
                                >
                                  <AnimatePresence mode="wait">
                                    {switchingItems.has(`search-${result.saleItem.id}-${store.name}`) ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : switchedItems.has(`search-${result.saleItem.id}-${store.name}`) ? (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className="flex items-center gap-1"
                                      >
                                        <Check className="h-3 w-3" />
                                        <span>OK</span>
                                      </motion.div>
                                    ) : (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className="flex items-center gap-1"
                                      >
                                        <ArrowRightLeft className="h-3 w-3" />
                                        <span>Wissel</span>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </button>
                              </div>
                            ))}
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
                          "flex items-start gap-2.5 p-2.5 hover:bg-gray-50/50 transition-colors duration-200",
                          index !== group.recommendations.length - 1 && "border-b border-gray-100/50"
                        )}
                      >
                        {/* Sale Item Image */}
                        {rec.saleItem.imageUrl && (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100/50">
                            <img
                              src={rec.saleItem.imageUrl}
                              alt={rec.saleItem.productName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Sale Item Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[13px] text-gray-900 leading-tight mb-1.5">
                            {rec.saleItem.productName}
                          </h4>
                          
                          <div className="space-y-1">
                            {rec.saleItem.supermarkets?.map((store: SupermarketStore) => (
                              <div key={store.name} className="flex items-center justify-between bg-gray-50/80 rounded-lg py-1.5 px-2">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={`/supermarkets/${store.name.toLowerCase()}-logo.png`}
                                    alt={store.name}
                                    className="w-4 h-4 object-contain"
                                  />
                                  <div className="flex items-baseline gap-1.5">
                                    <span className={cn(
                                      "font-medium text-[13px]",
                                      store.isRegularPrice ? "text-gray-900" : "text-green-700"
                                    )}>
                                      €{store.currentPrice}
                                    </span>
                                    {store.isRegularPrice ? (
                                      <span className="text-[11px] text-gray-600 font-medium">
                                        Reguliere prijs
                                      </span>
                                    ) : store.supermarket_data?.offerText && (
                                      <span className="text-[11px] text-green-600 font-medium">
                                        {store.supermarket_data.offerText}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSwitch(group.groceryItem, rec.saleItem, store);
                                  }}
                                  disabled={switchingItems.has(`${itemId}-${rec.saleItem.id}-${store.name}`)}
                                  className={cn(
                                    "group relative flex h-6 px-2 items-center justify-center rounded-md text-[11px] font-medium transition-all duration-200",
                                    switchedItems.has(`${itemId}-${rec.saleItem.id}-${store.name}`)
                                      ? "bg-green-100 hover:bg-green-200 text-green-700"
                                      : store.isRegularPrice
                                        ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                        : "bg-blue-50 hover:bg-blue-100 text-blue-700"
                                  )}
                                >
                                  <AnimatePresence mode="wait">
                                    {switchingItems.has(`${itemId}-${rec.saleItem.id}-${store.name}`) ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : switchedItems.has(`${itemId}-${rec.saleItem.id}-${store.name}`) ? (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className="flex items-center gap-1"
                                      >
                                        <Check className="h-3 w-3" />
                                        <span>OK</span>
                                      </motion.div>
                                    ) : (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className="flex items-center gap-1"
                                      >
                                        <ArrowRightLeft className="h-3 w-3" />
                                        <span>Wissel</span>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </button>
                              </div>
                            ))}
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