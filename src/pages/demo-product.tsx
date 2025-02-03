import { useState, forwardRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { cn } from "@/lib/utils";
import { ChevronDown, Timer, Package, GripVertical, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StoreSettingsButton from '@/components/ui/store-settings-button';
import StoreSettingsModal from '@/components/ui/store-settings-modal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FinanceView } from '@/components/finance';
import { SalesLayout } from '@/components/sales/SalesLayout';
import { SupermarketStories } from '@/components/supermarket-stories/supermarket-stories';
import { ProductSelectionDrawer } from '@/components/products/product-selection-drawer';
import { Header } from '@/components/header/header';
import { Navbar } from '@/components/navigation/navbar';
import type { GroceryItem } from '@/types/grocery';
import type { StorePrice } from '@/types/store';
import { OptimalStoresDisplay } from '@/components/optimal-stores/optimal-stores-display';
import type { Household } from '@/types/household';
import { SavedListsDrawer } from '@/components/saved-lists';
import { AddProductDrawer } from '@/components/add-product-drawer';
import { NewItemState } from '@/types/grocery';
import { groceryService } from '@/services/grocery-service';

interface Store {
  name: string;
  logo: string;
  isSelected: boolean;
}

interface HouseholdSettings {
  household_id: string;
  max_stores: number;
  selected_stores: Array<{ name: string; isSelected: boolean }>;
  show_price_features: boolean;
}


// Add calculateDaysLeft as a standalone function
function calculateDaysLeft(store: StorePrice): number | undefined {
  if (!store.valid_until) return undefined;
  const endDate = new Date(store.valid_until);
  const today = new Date();
  const diffTime = Math.abs(endDate.getTime() - today.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

const SwipeableProductCard = forwardRef<HTMLLIElement, {
  product: GroceryItem;
  onRemove: (id: string) => void;
  onToggle: (id: string, completed: boolean) => void;
  expandedItem: string | null;
  onExpand: (id: string | null) => void;
  showPriceFeatures: boolean;
  selectedStores: Store[];
  maxStores: number;
  currentStore: string | null;
  onOpenProductDrawer: (item: GroceryItem) => void;
}>(({ 
  product, 
  onRemove, 
  onToggle,
  expandedItem,
  onExpand,
  showPriceFeatures,
  selectedStores,
  maxStores,
  currentStore,
  onOpenProductDrawer
}, ref) => {
  const swipeConfidenceThreshold = 10000;
  const swipeThreshold = 50;

  const determineSwipeAction = (offset: number, velocity: number) => {
    const swipe = Math.abs(offset) * velocity;
    return swipe > swipeConfidenceThreshold || Math.abs(offset) > swipeThreshold;
  };

  const normalizeStoreName = (name: string) => {
    name = name.toLowerCase();
    if (name === 'ah' || name.includes('albert heijn')) return 'albert heijn';
    if (name.includes('jumbo')) return 'jumbo';
    if (name.includes('plus')) return 'plus';
    if (name.includes('aldi')) return 'aldi';
    if (name.includes('dirk')) return 'dirk';
    if (name.includes('coop')) return 'coop';
    if (name.includes('deka') || name.includes('dekamarkt')) return 'dekamarkt';
    if (name.includes('vomar')) return 'vomar';
    if (name.includes('poiesz')) return 'poiesz';
    if (name.includes('hoogvliet')) return 'hoogvliet';
    return name;
  };

  // Filter stores based on selected stores
  const filteredStores = product.stores.filter((store: StorePrice) => 
    selectedStores.some(s => s.isSelected && normalizeStoreName(s.name) === normalizeStoreName(store.name))
  );

  // Find the store to display price for
  const displayStore = currentStore && filteredStores.length > 0
    ? filteredStores.find(store => normalizeStoreName(store.name) === normalizeStoreName(currentStore)) ?? filteredStores[0]
    : filteredStores.find(s => s.isBest) ?? filteredStores[0];

  const otherStores = filteredStores.filter(store => 
    normalizeStoreName(store.name) !== normalizeStoreName(displayStore?.name || '')
  );

  const bestPrice = Math.min(...filteredStores.map(store => store.price));
  const isDisplayingBestPrice = displayStore?.price === bestPrice;

  const displayPrice = (store: StorePrice | undefined) => {
    if (!store || typeof store.price !== 'number') return '';
    return `€ ${store.price.toFixed(2)}`;
  };

  const displayOriginalPrice = (store: StorePrice | undefined) => {
    if (!store || !store.original_price) return '';
    const price = parseFloat(store.original_price);
    return `€ ${price.toFixed(2)}`;
  };

  const displaySaleType = (store: StorePrice | undefined) => {
    if (!store || !store.sale_type) return '';
    return store.sale_type;
  };


  return (
    <>
    <motion.li 
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        layout: { duration: 0.3, ease: "easeOut" },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (determineSwipeAction(info.offset.x, info.velocity.x)) {
          onRemove(product.id);
        }
      }}
      className="relative flex flex-col py-3 border-b border-gray-100 last:border-b-0 group hover:bg-gray-50/50 transition-colors duration-200"
    >
      <motion.div 
        className="absolute right-0 top-0 bottom-0 w-full bg-red-500/10 rounded-xl -z-10"
        initial={{ opacity: 0 }}
        whileDrag={{ opacity: 1 }}
      />
      
      {/* Main Product Info */}
      <div 
        className="relative flex items-center justify-between px-4 cursor-pointer z-10" 
        onClick={(e) => {
          e.stopPropagation();
          onToggle(product.id, product.completed || false);
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Checkbox */}
          <div 
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0",
              product.completed 
                ? "bg-blue-500 border-blue-500" 
                : "border-gray-300 hover:border-blue-500"
            )}
          >
            {product.completed && (
              <motion.svg 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 text-white"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </motion.svg>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{product.emoji}</span>
              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-xs text-gray-700 truncate",
                  product.completed && "line-through text-gray-400"
                )}>
                  {product.name}
                  {product.quantity && (
                    <span className="text-[10px] text-gray-400 ml-1">
                    ({product.quantity})
                  </span>
                )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Priority & User */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {product.priority && (
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shadow-sm">
              <span className="text-[8px] font-medium text-white">!</span>
            </div>
          )}
          
          {product.user_avatar ? (
            <img
              src={product.user_avatar}
              alt={product.user_name || ''}
              className="w-4 h-4 rounded-full border border-gray-200 shadow-sm object-cover"
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm">
              <span className="text-[10px] font-medium text-blue-600">
                {product.user_name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Store Comparison Button & Content */}
      <AnimatePresence>
          {showPriceFeatures && !product.completed && (
          <motion.div 
            className="relative z-20 mt-1 mx-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ 
              duration: 0.2,
              ease: "easeOut",
              opacity: { duration: 0.1 }
            }}
          >
              {product.product_id === null ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenProductDrawer(product);
                  }}
                  className="w-full flex items-center justify-between p-1.5 rounded-lg transition-all duration-200 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100/50 hover:border-blue-200 group"
                >
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-medium text-blue-600">
                      Voeg product toe
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-blue-400 -rotate-90 group-hover:translate-x-0.5 transition-transform duration-200" />
                </button>
              ) : product.stores.length === 1 ? (
                // Single store view - show store info directly
                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-white/50 flex items-center justify-center shadow-sm overflow-hidden">
                      <img
                        src={product.stores[0].logo}
                        alt={product.stores[0].name}
                        className="w-3.5 h-3.5 object-contain"
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-700">
                          {product.stores[0].name}
                        </span>
                        <span className="text-xs font-medium text-green-600">
                          €{product.stores[0].price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : filteredStores.length === 1 ? (
                // Single store view
                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-white/50 flex items-center justify-center shadow-sm overflow-hidden">
                      <img
                        src={filteredStores[0].logo}
                        alt={filteredStores[0].name}
                        className="w-3.5 h-3.5 object-contain"
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-700">
                          {filteredStores[0].name}
                        </span>
                        {filteredStores[0].sale ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] line-through text-gray-400">
                              {displayOriginalPrice(filteredStores[0])}
                            </span>
                            <span className="text-xs font-medium text-gray-900">
                              {displayPrice(filteredStores[0])}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-gray-900">
                            {displayPrice(filteredStores[0])}
                          </span>
                        )}
                      </div>
                      {filteredStores[0].sale && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-green-600">
                            {displaySaleType(filteredStores[0])}
                          </span>
                          {calculateDaysLeft(filteredStores[0]) && (
                            <span className="text-[10px] text-orange-600 flex items-center gap-0.5">
                              <Timer className="w-2.5 h-2.5" />
                              {calculateDaysLeft(filteredStores[0])}d
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onExpand(expandedItem === product.id ? null : product.id);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200",
                    maxStores === 1
                      ? "bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-100"
                      : expandedItem === product.id
                      ? "bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100"
                      : "bg-gray-50/50 hover:bg-gray-100/50 border border-gray-100/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-white/50 flex items-center justify-center shadow-sm overflow-hidden">
                      <img
                        src={displayStore?.logo}
                        alt={displayStore?.name}
                        className="w-3.5 h-3.5 object-contain"
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-700">
                          {displayStore?.name}
                        </span>
                        {displayStore?.sale ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] line-through text-gray-400">
                              {displayOriginalPrice(displayStore)}
                            </span>
                            <span className={cn(
                              "text-xs font-medium",
                              isDisplayingBestPrice ? "text-green-600" : "text-gray-900"
                            )}>
                              {displayPrice(displayStore)}
                            </span>
                          </div>
                        ) : (
                          <span className={cn(
                            "text-xs font-medium",
                            isDisplayingBestPrice ? "text-green-600" : "text-gray-900"
                          )}>
                            {displayPrice(displayStore)}
                          </span>
                        )}
                      </div>
                      {displayStore?.sale && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-green-600">
                            {displaySaleType(displayStore)}
                          </span>
                          {calculateDaysLeft(displayStore) && (
                            <span className="text-[10px] text-orange-600 flex items-center gap-0.5">
                              <Timer className="w-2.5 h-2.5" />
                              {calculateDaysLeft(displayStore)}d
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {filteredStores.length > 1 && maxStores > 1 && (
                      <span className="text-[10px] text-gray-400">
                        +{filteredStores.length - 1}
                      </span>
                    )}
                    {(filteredStores.length > 1 && maxStores > 1) && (
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200",
                        "text-gray-400",
                        expandedItem === product.id && "rotate-180"
                      )} />
                    )}
                  </div>
                </button>
              )}

              <AnimatePresence>
                {expandedItem === product.id && otherStores.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, y: -4 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -4 }}
                    transition={{ 
                      duration: 0.2,
                      ease: "easeOut",
                      opacity: { duration: 0.15 }
                    }}
                    className="overflow-hidden mt-1 space-y-1"
                  >
                    {otherStores.map((store, idx) => {
                      const isStoreBestPrice = store.price === bestPrice;
                      return (
                        <div 
                          key={idx} 
                        className="flex items-center justify-between p-2 rounded-lg transition-all duration-200 bg-gray-50/50 hover:bg-gray-100/50 border border-gray-100/50"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-white/50 flex items-center justify-center shadow-sm overflow-hidden">
                              <img
                                src={store.logo}
                                alt={store.name}
                                className="w-3.5 h-3.5 object-contain"
                              />
                            </div>
                            <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-gray-700">
                                {store.name}
                              </span>
                            {store.sale ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] line-through text-gray-400">
                                    {displayOriginalPrice(store)}
                                  </span>
                                  <span className={cn(
                                    "text-xs font-medium",
                                    isStoreBestPrice ? "text-green-600" : "text-gray-900"
                                  )}>
                                    {displayPrice(store)}
                                  </span>
                                </div>
                              ) : (
                                <span className={cn(
                                  "text-xs font-medium",
                                  isStoreBestPrice ? "text-green-600" : "text-gray-900"
                                )}>
                                  {displayPrice(store)}
                                </span>
                              )}
                            </div>
                            {store.sale && (
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-green-600">
                                      {displaySaleType(store)}
                                    </span>
                                  {calculateDaysLeft(store) && (
                                    <span className="text-[10px] text-orange-600 flex items-center gap-0.5">
                                      <Timer className="w-2.5 h-2.5" />
                                      {calculateDaysLeft(store)}d
                                    </span>
                                  )}
                                </div>
                            )}
                          </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
    </>
  );
});

SwipeableProductCard.displayName = 'SwipeableProductCard';

function useUserHousehold() {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchHousehold() {
      if (!user) {
        setHouseholdId(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: householdError } = await supabase
          .from('household_members')
          .select('household_id')
          .eq('user_id', user.id)
          .single();

        if (householdError) throw householdError;
        setHouseholdId(data?.household_id || null);
      } catch (err) {
        console.error('Error fetching household:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch household'));
      } finally {
        setLoading(false);
      }
    }

    fetchHousehold();
  }, [user?.id]); // Only re-run if user.id changes

  return { householdId, loading, error };
}

function useGroceryItems(householdId: string | null) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Helper function to transform grocery data with product information
  const transformGroceryData = async (groceryData: any[]) => {
    // Fetch product data for items with product_id
    const itemsWithProductIds = groceryData.filter(item => item.product_id);
    const productIds = [...new Set(itemsWithProductIds.map(item => item.product_id))];

    let productData: Record<string, any> = {};
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (productsError) throw productsError;

      productData = products.reduce((acc, product) => ({
        ...acc,
        [product.id]: product
      }), {});
    }

    // Transform the data to match our component's expectations
    const transformedData: GroceryItem[] = groceryData.map(item => {
      const product = item.product_id ? productData[item.product_id] : null;
      
      // If we have product data, use its store information
      if (product?.supermarket_data) {
        // Transform the store data
        const transformedStores = product.supermarket_data.map((store: any) => ({
          name: store.name,
          price: parseFloat(store.price.replace('€', '').trim()),
          logo: store.logoUrl || `/supermarkets/${store.name.toLowerCase()}-logo.png`,
          original_price: store.original_price 
            ? parseFloat(store.original_price.replace('€', '').trim())
            : undefined,
          sale_type: store.offerText || undefined,
          valid_until: store.offerEndDate || undefined,
          sale: store.original_price ? true : undefined,
          isBest: false // Will be determined later
        }));

        // If there's only one store, mark it as the best
        if (transformedStores.length === 1) {
          transformedStores[0].isBest = true;
        }

        return {
          ...item,
          name: product.title || item.name,
          stores: transformedStores
        };
      }

      // Fallback to the original item's store data if no product data
      const currentPrice = item.current_price 
        ? parseFloat(item.current_price.replace('€', '').trim()) 
        : 0;
      const originalPrice = item.original_price 
        ? parseFloat(item.original_price.replace('€', '').trim()) 
        : undefined;

      const bestStore = item.supermarket ? {
        name: item.supermarket,
        price: currentPrice,
        isBest: true,
        logo: `/supermarkets/${item.supermarket.toLowerCase()}-logo.png`,
        original_price: originalPrice,
        sale_type: item.sale_type || undefined,
        valid_until: item.valid_until || undefined,
        sale: item.original_price ? true : undefined
      } : undefined;

      return {
        ...item,
        stores: bestStore ? [bestStore] : []
      };
    });

    // Update isBest flag for each store
    return transformedData.map(item => {
      if (item.stores.length === 0) return item;

      const bestPrice = Math.min(...item.stores.map(store => store.price));
      return {
        ...item,
        stores: item.stores.map(store => ({
          ...store,
          isBest: store.price === bestPrice
        }))
      };
    });
  };

  // Function to fetch items
  const fetchItems = async () => {
    if (!householdId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch both active and completed items from today
      const { data: groceryData, error: itemsError } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('is_deleted', false)
        .eq('household_id', householdId)
        .or(`completed.eq.false,and(completed.eq.true,updated_at.gte.${today.toISOString()})`)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      const transformedData = await transformGroceryData(groceryData || []);
      setItems(transformedData);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch items'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Set up real-time subscription
    const subscription = supabase
      .channel(`grocery_items_${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: `household_id=eq.${householdId}`
        },
        async (payload) => {
          console.log('Received grocery item change:', payload);
          try {
            switch (payload.eventType) {
              case 'INSERT':
                // Only add if not deleted
                if (!payload.new.is_deleted) {
                  const newItem = await transformGroceryData([payload.new]);
                  setItems(current => [...newItem, ...current].sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  ));
                }
                break;
              case 'UPDATE':
                // Keep item if it's completed today or not completed
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const updateDate = new Date(payload.new.updated_at);
                const shouldKeep = !payload.new.is_deleted && 
                  (!payload.new.completed || updateDate >= today);

                if (shouldKeep) {
                  const updatedItem = await transformGroceryData([payload.new]);
                  setItems(current => 
                    current.map(item => 
                      item.id === payload.new.id ? updatedItem[0] : item
                    )
                  );
                } else {
                  setItems(current => current.filter(item => item.id !== payload.new.id));
                }
                break;
              case 'DELETE':
                setItems(current => 
                  current.filter(item => item.id !== payload.old.id)
                );
                break;
            }
          } catch (error) {
            console.error('Error processing real-time update:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for grocery items (${householdId}):`, status);
      });

    unsubscribe = () => {
      console.log('Unsubscribing from grocery items changes...');
      supabase.removeChannel(subscription);
    };

    // Initial fetch
    fetchItems();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [householdId]);

  // Update handlers to use optimistic updates
  const handleRemove = async (id: string) => {
    try {
      // Optimistic update
      setItems(current => current.filter(p => p.id !== id));

      const { error } = await supabase
        .from('grocery_items')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error removing item:', err);
      // Revert on error
      if (householdId) {
        fetchItems();
      }
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      // Optimistic update
      setItems(current => 
        current.map(p => 
          p.id === id ? { ...p, completed: !completed } : p
        )
      );

      const { error } = await supabase
        .from('grocery_items')
        .update({ completed: !completed })
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error toggling item:', err);
      // Revert on error
      if (householdId) {
        fetchItems();
      }
    }
  };

  return { 
    items, 
    loading, 
    error,
    handleRemove,
    handleToggle
  };
}

const defaultStores: Store[] = [
  { name: 'Albert Heijn', logo: '/supermarkets/ah-logo.png', isSelected: true },
  { name: 'Jumbo', logo: '/supermarkets/jumbo-logo.png', isSelected: true },
  { name: 'Plus', logo: '/supermarkets/plus-logo.png', isSelected: true },
  { name: 'Aldi', logo: '/supermarkets/aldi-logo.png', isSelected: true },
  { name: 'Dirk', logo: '/supermarkets/dirk-logo.png', isSelected: true },
  { name: 'Coop', logo: '/supermarkets/coop-logo.png', isSelected: true },
  { name: 'DekaMarkt', logo: '/supermarkets/dekamarkt-logo.png', isSelected: true },
  { name: 'Vomar', logo: '/supermarkets/vomar-logo.png', isSelected: true },
  { name: 'Poiesz', logo: '/supermarkets/poiesz-logo.png', isSelected: true },
  { name: 'Hoogvliet', logo: '/supermarkets/hoogvliet-logo.png', isSelected: true }
];

const DemoProductPage = () => {
  // 1. Context hooks
  const { user } = useAuth();
  const navigate = useNavigate();

  // 2. Custom hooks
  const { householdId } = useUserHousehold();
  const { items: groceryItems, handleRemove, handleToggle } = useGroceryItems(householdId);

  // 3. State hooks - move ALL useState calls here
  const [, setIsCheckingMembership] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [products, setProducts] = useState<GroceryItem[]>([]);
  const [isReorderMode] = useState(false);
  const [showPriceFeatures, setShowPriceFeatures] = useState(() => {
    const saved = localStorage.getItem('showPriceFeatures');
    return saved ? JSON.parse(saved) : false;
  });
  const [isStoreSettingsOpen, setIsStoreSettingsOpen] = useState(false);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [currentStore, setCurrentStore] = useState<string | null>(null);
  const [selectedStores, setSelectedStores] = useState<Store[]>(defaultStores);
  const [maxStores, setMaxStores] = useState(3);
  const [optimalStores, setOptimalStores] = useState<string[] | null>(null);
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GroceryItem | null>(null);
  const [isAddProductDrawerOpen, setIsAddProductDrawerOpen] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'meals' | 'koken' | 'trends' | 'finance'>('list');
  const [categories, setCategories] = useState<string[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<Record<string, GroceryItem[]>>({});
  const [storeProductCounts, setStoreProductCounts] = useState<Record<string, number>>({});
  const [isSavedListsOpen, setIsSavedListsOpen] = useState(false);
  const [householdSettings, setHouseholdSettings] = useState<HouseholdSettings | null>(null);

  // Add newItem state and handlers
  const [newItem, setNewItem] = useState<NewItemState>({
    name: '',
    quantity: '',
    unit: '',
    category: 'Overig',
    subcategory: null,
    priority: false,
    emoji: '📦',
    user_id: user?.id || '',
    user_name: user?.user_metadata?.name || null,
    user_avatar: user?.user_metadata?.avatar_url || null,
    household_id: householdId || ''
  });

  const handleItemChange = useCallback((item: NewItemState) => {
    setNewItem({
      ...item,
      user_id: user?.id || '',
      user_name: user?.user_metadata?.name || null,
      user_avatar: user?.user_metadata?.avatar_url || null,
      household_id: householdId || ''
    });
  }, [user, householdId]);

  const handleAddItem = useCallback((item: NewItemState) => {
    if (!householdId) return;
    
    const itemToAdd = {
      ...item,
      user_id: user?.id || '',
      user_name: user?.user_metadata?.name || null,
      user_avatar: user?.user_metadata?.avatar_url || null,
      household_id: householdId
    };

    groceryService.addItem(itemToAdd, householdId);
    setIsAddProductDrawerOpen(false);
  }, [user, householdId]);

  // 4. Callback hooks - move ALL useCallback definitions here
  const normalizeStoreName = useCallback((name: string): string => {
    name = name.toLowerCase();
    if (name === 'ah' || name.includes('albert heijn')) return 'albert heijn';
    if (name.includes('jumbo')) return 'jumbo';
    if (name.includes('plus')) return 'plus';
    if (name.includes('aldi')) return 'aldi';
    if (name.includes('dirk')) return 'dirk';
    if (name.includes('coop')) return 'coop';
    if (name.includes('deka') || name.includes('dekamarkt')) return 'dekamarkt';
    if (name.includes('vomar')) return 'vomar';
    if (name.includes('poiesz')) return 'poiesz';
    if (name.includes('hoogvliet')) return 'hoogvliet';
    return name;
  }, []);

  const handleSettingsSave = useCallback(async (newSelectedStores: Store[], newMaxStores: number) => {
    if (!householdId) return;

    try {
      const updatedSettings = {
        max_stores: newMaxStores,
        selected_stores: newSelectedStores.map(store => ({
          name: store.name,
          isSelected: store.isSelected
        })),
        show_price_features: showPriceFeatures
      };

      const { error } = await supabase
        .from('household_supermarket_settings')
        .update(updatedSettings)
        .eq('household_id', householdId);

      if (error) throw error;

      setSelectedStores(newSelectedStores);
      setMaxStores(newMaxStores);
      setIsStoreSettingsOpen(false);
    } catch (err) {
      console.error('Error saving household settings:', err);
    }
  }, [householdId, showPriceFeatures]);

  const calculateOptimalStores = useCallback(() => {
    if (!showPriceFeatures || !householdSettings) return null;

    const availableStores = householdSettings.selected_stores.filter(s => s.isSelected);
    if (availableStores.length === 0) return null;

    const productsWithPrices = products.filter(product => 
      product.product_id && product.stores && product.stores.length > 0
    );

    if (productsWithPrices.length === 0) return null;

    const allAvailableStoreNames = availableStores.map(store => normalizeStoreName(store.name));
    const storeCombinations = new Map<string[], number>();

    for (let i = 1; i <= Math.min(householdSettings.max_stores, allAvailableStoreNames.length); i++) {
      const combinations = getCombinations(allAvailableStoreNames, i);
      
      combinations.forEach(combination => {
        let totalPrice = 0;
        let canCoverAllProducts = true;

        for (const product of productsWithPrices) {
          const availablePrices = product.stores
            .filter((store: StorePrice) => {
              return combination.some(storeName => 
                normalizeStoreName(store.name) === normalizeStoreName(storeName)
              );
            })
            .map((store: StorePrice) => Number(store.price));

          if (availablePrices.length === 0) {
            canCoverAllProducts = false;
            break;
          }

          totalPrice += Math.min(...availablePrices);
        }

        if (canCoverAllProducts) {
          storeCombinations.set(combination, totalPrice);
        }
      });
    }

    let bestCombination: string[] | null = null;
    let lowestPrice = Infinity;

    storeCombinations.forEach((price, combination) => {
      if (price < lowestPrice) {
        lowestPrice = price;
        bestCombination = combination;
      }
    });

    if (!bestCombination) {
      return allAvailableStoreNames.slice(0, householdSettings.max_stores);
    }

    const normalizedNames = bestCombination as string[];
    return normalizedNames.map((normalizedName: string) => {
      const store = availableStores.find(store => 
        normalizeStoreName(store.name) === normalizeStoreName(normalizedName)
      );
      return store?.name || normalizedName;
    });
  }, [products, householdSettings, showPriceFeatures, normalizeStoreName]);

  const calculateTotalPrice = useCallback((): number => {
    if (!optimalStores || !Array.isArray(optimalStores)) return 0;

    const productsWithPrices = products.filter(product => 
      product.product_id && Array.isArray(product.stores) && product.stores.length > 0
    );

    if (productsWithPrices.length === 0) return 0;

    return productsWithPrices.reduce((total: number, product: GroceryItem) => {
      const storesWithPrices: StorePrice[] = product.stores.filter(store => 
        isStoreInOptimal(store, optimalStores)
      );

      const prices: number[] = storesWithPrices.map(getStorePrice);

      if (prices.length > 0) {
        return total + Math.min(...prices);
      }
      return total;
    }, 0);
  }, [optimalStores, products]);

  const calculateStoreProductCounts = useCallback(() => {
    if (!optimalStores) return {};

    return optimalStores.reduce((counts: Record<string, number>, store: string) => {
      counts[store] = products.filter(product => {
        if (!product.product_id || !product.stores || product.stores.length === 0) return false;

        const storesInOptimal = product.stores.filter((s: StorePrice) => {
          return optimalStores.some(optimalStore => 
            normalizeStoreName(s.name) === normalizeStoreName(optimalStore)
          );
        });

        const optimalPrices = storesInOptimal.map(s => Number(s.price));

        if (optimalPrices.length === 0) return false;
        const bestPrice = Math.min(...optimalPrices);

        return product.stores.some((s: StorePrice) => 
          normalizeStoreName(s.name) === normalizeStoreName(store) && 
          Number(s.price) === bestPrice
        );
      }).length;
      return counts;
    }, {});
  }, [products, optimalStores, normalizeStoreName]);

  const handleOpenProductDrawer = useCallback((product: GroceryItem) => {
    setSelectedItem(product);
    setIsProductDrawerOpen(true);
  }, []);

  const handleProductSelect = useCallback(async (productId: string) => {
    if (!selectedItem) return;
    
    try {
      const { error } = await supabase
        .from('grocery_items')
        .update({ product_id: productId })
        .eq('id', selectedItem.id);

      if (error) throw error;
      
      setIsProductDrawerOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error('Error updating product:', err);
    }
  }, [selectedItem]);

  // Add this new function after the other helper functions and before renderMainContent
  const getProductsForStore = useCallback((store: string | null): GroceryItem[] => {
    if (!store || !optimalStores) return products;

    return products.filter(product => {
      // Include products without store information (generic items)
      if (!product.stores || product.stores.length === 0) {
        return true;
      }

      // Get all stores with optimal prices for this product
      const availablePrices = product.stores
        .filter(s => optimalStores.some(optimalStore => 
          normalizeStoreName(s.name) === normalizeStoreName(optimalStore)
        ))
        .map(s => s.price);

      if (availablePrices.length === 0) return false;

      const bestPrice = Math.min(...availablePrices);

      // Check if this store has the best price for this product
      return product.stores.some(s => 
        normalizeStoreName(s.name) === normalizeStoreName(store) && 
        s.price === bestPrice
      );
    });
  }, [products, optimalStores, normalizeStoreName]);

  // Modify the useEffect for grouping products to use the filtered products
  useEffect(() => {
    if (!products) return;

    const filteredProducts = getProductsForStore(currentStore);
    // Filter out completed items from the normal grocery list
    const activeProducts = filteredProducts.filter(product => !product.completed);
    
    const grouped = activeProducts.reduce((acc, product) => {
      const category = product.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {} as Record<string, GroceryItem[]>);

    setGroupedProducts(grouped);
    setCategories(Object.keys(grouped).sort());
  }, [products, currentStore, getProductsForStore]);

  // 5. Effect hooks - move ALL useEffect calls here
  useEffect(() => {
    if (!products) return;

    const grouped = products.reduce((acc, product) => {
      const category = product.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {} as Record<string, GroceryItem[]>);

    setGroupedProducts(grouped);
    setCategories(Object.keys(grouped).sort());
  }, [products]);

  useEffect(() => {
    if (!optimalStores || !products) return;
    setStoreProductCounts(calculateStoreProductCounts());
  }, [optimalStores, products, calculateStoreProductCounts]);

  useEffect(() => {
    const checkHouseholdMembership = async () => {
      if (!user?.email) {
        setIsCheckingMembership(false);
        return;
      }

      try {
        const { data: memberData } = await supabase
          .from('household_members')
          .select('id')
          .eq('email', user.email)
          .single();

        if (!memberData) {
          navigate('/join-household');
        }
      } catch (error) {
        console.error('Error checking household membership:', error);
        navigate('/join-household');
      } finally {
        setIsCheckingMembership(false);
        const initialSplash = document.getElementById('splash');
        if (initialSplash) {
          initialSplash.style.opacity = '0';
          initialSplash.style.transition = 'opacity 0.5s ease';
          setTimeout(() => {
            initialSplash.remove();
          }, 500);
        }
      }
    };

    checkHouseholdMembership();
  }, [user, navigate]);

  useEffect(() => {
    if (groceryItems) {
      setProducts(groceryItems);
    }
  }, [groceryItems]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (currentStore && optimalStores && !optimalStores.some(store => 
      store.toLowerCase().includes(currentStore.toLowerCase())
    )) {
      setCurrentStore(null);
    }
  }, [optimalStores, currentStore]);

  useEffect(() => {
    localStorage.setItem('showPriceFeatures', JSON.stringify(showPriceFeatures));
  }, [showPriceFeatures]);

  useEffect(() => {
    const newOptimalStores = calculateOptimalStores();
    setOptimalStores(newOptimalStores);
  }, [calculateOptimalStores]);

  useEffect(() => {
    async function fetchHousehold() {
      if (!householdId) return;

      try {
        const { data, error } = await supabase
          .from('households')
          .select('*')
          .eq('id', householdId)
          .single();

        if (error) throw error;
        setHousehold(data);
      } catch (err) {
        console.error('Error fetching household:', err);
      }
    }

    fetchHousehold();
  }, [householdId]);

  useEffect(() => {
    async function loadHouseholdSettings() {
      if (!householdId) return;

      try {
        const { data, error } = await supabase
          .from('household_supermarket_settings')
          .select('*')
          .eq('household_id', householdId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No settings found, create default settings
            const defaultSettings: HouseholdSettings = {
              household_id: householdId,
              max_stores: 3,
              selected_stores: defaultStores.map(store => ({
                name: store.name,
                isSelected: store.isSelected
              })),
              show_price_features: false
            };

            const { data: newSettings, error: insertError } = await supabase
              .from('household_supermarket_settings')
              .insert(defaultSettings)
              .select()
              .single();

            if (insertError) throw insertError;
            const settings = newSettings as HouseholdSettings;
            setHouseholdSettings(settings);
            setShowPriceFeatures(settings.show_price_features);
            setMaxStores(settings.max_stores);
            setSelectedStores(defaultStores.map(store => ({
              ...store,
              isSelected: settings.selected_stores.find(s => s.name === store.name)?.isSelected ?? true
            })));
          } else {
            throw error;
          }
        } else {
          const settings = data as HouseholdSettings;
          setHouseholdSettings(settings);
          setShowPriceFeatures(settings.show_price_features);
          setMaxStores(settings.max_stores);
          setSelectedStores(defaultStores.map(store => ({
            ...store,
            isSelected: settings.selected_stores.find(s => s.name === store.name)?.isSelected ?? true
          })));
        }

        // Update the channel subscription
        const channel = supabase.channel(`household_settings_${householdId}`);
        const subscription = channel
          .on<{ 
            new: HouseholdSettings | null; 
            old: HouseholdSettings | null; 
            eventType: 'INSERT' | 'UPDATE' | 'DELETE';
          }>(
            'postgres_changes' as any,
            {
              event: '*',
              schema: 'public',
              table: 'household_supermarket_settings',
              filter: `household_id=eq.${householdId}`
            },
            (payload: { 
              new: HouseholdSettings | null; 
              old: HouseholdSettings | null; 
              eventType: 'INSERT' | 'UPDATE' | 'DELETE';
            }) => {
              if (payload.eventType === 'DELETE') {
                setHouseholdSettings(null);
                return;
              }

              if (payload.new) {
                const newSettings = payload.new;
                setHouseholdSettings(newSettings);
                setShowPriceFeatures(newSettings.show_price_features);
                setMaxStores(newSettings.max_stores);
                setSelectedStores(defaultStores.map(store => ({
                  ...store,
                  isSelected: newSettings.selected_stores?.find(s => s.name === store.name)?.isSelected ?? true
                })));
              }
            }
          )
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Error loading household settings:', err);
      }
    }

    loadHouseholdSettings();
  }, [householdId]);

  // Helper functions
  const getCombinations = (arr: string[], n: number): string[][] => {
    if (n === 1) return arr.map(val => [val]);
    
    const combinations: string[][] = [];
    
    arr.forEach((val, idx) => {
      const remaining = arr.slice(idx + 1);
      const subCombinations = getCombinations(remaining, n - 1);
      subCombinations.forEach(subComb => {
        combinations.push([val, ...subComb]);
      });
    });
    
    return combinations;
  };

  const getStorePrice = (store: StorePrice): number => Number(store.price);

  const isStoreInOptimal = (store: StorePrice, optimalStoreNames: string[]): boolean => {
    return optimalStoreNames.some(optimalStore => 
      normalizeStoreName(store.name) === normalizeStoreName(optimalStore)
    );
  };

  // Update the mapping function for saved lists to include product_id
  const mapItemsForSavedList = (items: GroceryItem[]) => {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity || '',
      emoji: item.emoji || '',
      priority: Boolean(item.priority),
      product_id: item.product_id === null ? undefined : item.product_id // Convert null to undefined
    }));
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'list':
        return (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between px-4">
              <StoreSettingsButton 
                onClick={() => setIsStoreSettingsOpen(true)} 
                showPriceFeatures={showPriceFeatures}
                householdSettings={householdSettings}
              />
              <motion.button
                onClick={() => setIsSavedListsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm bg-gray-50 text-gray-400 hover:text-gray-600 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>Lijsten</span>
                <List className="h-4 w-4" />
              </motion.button>
            </div>
            <StoreSettingsModal
              isOpen={isStoreSettingsOpen}
              onClose={() => setIsStoreSettingsOpen(false)}
              onSave={handleSettingsSave}
              showPriceFeatures={showPriceFeatures}
              onPriceFeaturesChange={setShowPriceFeatures}
              householdId={householdId || ''}
            />
            {showPriceFeatures && optimalStores && (
              <OptimalStoresDisplay
                optimalStores={optimalStores}
                totalPrice={calculateTotalPrice()}
                selectedStore={currentStore}
                onStoreSelect={setCurrentStore}
                storeProductCounts={storeProductCounts}
              />
            )}
            {categories.map((category: string) => (
              <motion.div
                key={category}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/20 shadow-lg overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <motion.div 
                  className="py-2 px-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50"
                  layout
                >
                  <div className="flex items-center gap-2">
                    {isReorderMode && (
                      <GripVertical className="h-4 w-4 text-gray-400" />
                    )}
                    <motion.h2 layout className="text-base font-semibold text-gray-700">
                      {category}
                    </motion.h2>
                  </div>
                  <motion.span layout className="text-sm text-gray-500">
                    {groupedProducts[category].length} items
                  </motion.span>
                </motion.div>
                <motion.ul 
                  className="divide-y divide-gray-100"
                  layout
                >
                  <AnimatePresence mode="popLayout">
                    {groupedProducts[category].map((product) => (
                      <SwipeableProductCard
                        key={product.id}
                        product={product}
                        onRemove={handleRemove}
                        onToggle={handleToggle}
                        expandedItem={expandedItem}
                        onExpand={setExpandedItem}
                        showPriceFeatures={showPriceFeatures}
                        selectedStores={selectedStores}
                        maxStores={maxStores}
                        currentStore={currentStore}
                        onOpenProductDrawer={handleOpenProductDrawer}
                      />
                    ))}
                  </AnimatePresence>
                </motion.ul>
              </motion.div>
            ))}

            {/* Completed Items Section */}
            {products.filter(item => {
              if (!item.completed || !item.updated_at) return false;
              const itemDate = new Date(item.updated_at);
              const today = new Date();
              return itemDate.toDateString() === today.toDateString();
            }).length > 0 && (
              <motion.div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/20 shadow-lg overflow-hidden mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <motion.div 
                  className="py-2 px-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50"
                  layout
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center">
                      <span className="text-green-600">✓</span>
                    </div>
                    <motion.h2 layout className="text-base font-semibold text-gray-700">
                      Vandaag gekocht
                    </motion.h2>
                  </div>
                  <motion.span layout className="text-sm text-gray-500">
                    {products.filter(item => {
                      if (!item.completed || !item.updated_at) return false;
                      const itemDate = new Date(item.updated_at);
                      const today = new Date();
                      return itemDate.toDateString() === today.toDateString();
                    }).length} items
                  </motion.span>
                </motion.div>
                <motion.ul 
                  className="divide-y divide-gray-100"
                  layout
                >
                  <AnimatePresence mode="popLayout">
                    {products
                      .filter(item => {
                        if (!item.completed || !item.updated_at) return false;
                        const itemDate = new Date(item.updated_at);
                        const today = new Date();
                        return itemDate.toDateString() === today.toDateString();
                      })
                      .map(product => (
                        <SwipeableProductCard
                          key={product.id}
                          product={product}
                          onRemove={handleRemove}
                          onToggle={handleToggle}
                          expandedItem={expandedItem}
                          onExpand={setExpandedItem}
                          showPriceFeatures={showPriceFeatures}
                          selectedStores={selectedStores}
                          maxStores={maxStores}
                          currentStore={currentStore}
                          onOpenProductDrawer={handleOpenProductDrawer}
                        />
                      ))}
                  </AnimatePresence>
                </motion.ul>
              </motion.div>
            )}
          </div>
        );

      case 'trends':
        return (
          <motion.div 
            className="flex-1 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mt-6">
              <SupermarketStories />
              <SalesLayout 
                groceryList={products} 
                householdName={householdId || undefined} 
              />
            </div>
          </motion.div>
        );

      case 'finance':
        return (
          <motion.div 
            className="max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <FinanceView 
              isAddExpenseOpen={isProductDrawerOpen}
              setIsAddExpenseOpen={setIsProductDrawerOpen}
            />
          </motion.div>
        );

      case 'koken':
        return (
          <motion.div 
            className="max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                <span className="text-2xl">👨‍🍳</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Koken Functionaliteit
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Deze functionaliteit is nog in ontwikkeling. Binnenkort kun je hier recepten bekijken en toevoegen aan je boodschappenlijst.
              </p>
            </div>
          </motion.div>
        );

      default:
        return (
          <div className="max-w-2xl mx-auto">
            <p>View not found</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/10 to-white">
      <Header 
        user={user}
        household={household}
        isOnline={true}
        isDialogOpen={isProductDrawerOpen}
        setIsDialogOpen={setIsProductDrawerOpen}
        isHouseholdModalOpen={isHouseholdModalOpen}
        setIsHouseholdModalOpen={setIsHouseholdModalOpen}
        activeView={activeView}
        setIsAddExpenseOpen={setIsProductDrawerOpen}
        items={products}
        optimalStores={optimalStores && optimalStores.length > 0 ? {
          stores: optimalStores,
          totalPrice: calculateTotalPrice()
        } : null}
        isAddProductDrawerOpen={isAddProductDrawerOpen}
        setIsAddProductDrawerOpen={setIsAddProductDrawerOpen}
      />

      <main className="px-4 pb-24 pt-4">
        {renderMainContent()}
      </main>

      <ProductSelectionDrawer
        isOpen={isProductDrawerOpen}
        onClose={() => setIsProductDrawerOpen(false)}
        itemName={selectedItem?.name || ''}
        itemId={selectedItem?.id || ''}
        itemSubcategory={selectedItem?.subcategory || null}
        onProductSelect={handleProductSelect}
        selectedStores={selectedStores}
      />

      <Navbar 
        activeView={activeView}
        setActiveView={setActiveView}
        isDialogOpen={isProductDrawerOpen || isHouseholdModalOpen || isAddProductDrawerOpen}
      />

      <SavedListsDrawer
        isOpen={isSavedListsOpen}
        onClose={() => setIsSavedListsOpen(false)}
        currentItems={mapItemsForSavedList(products)}
      />

      <AddProductDrawer
        isOpen={isAddProductDrawerOpen}
        onClose={() => setIsAddProductDrawerOpen(false)}
        newItem={newItem}
        onItemChange={handleItemChange}
        onAddItem={handleAddItem}
        householdId={householdId || ''}
      />
    </div>
  );
};

export default DemoProductPage; 