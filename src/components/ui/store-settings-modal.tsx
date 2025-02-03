import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, AlertCircle, Sparkles } from 'lucide-react';
import StarToggle from './star-toggle';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
} from '@/components/ui/drawer';
import { supabase } from '@/lib/supabase';
import { groceryService } from '@/services/grocery-service';
import { toast } from "@/components/ui/use-toast";
import { GroceryItem } from '@/types/grocery';

interface Store {
  name: string;
  logo: string;
  isSelected: boolean;
}

interface StoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedStores: Store[], maxStores: number) => void;
  showPriceFeatures: boolean;
  onPriceFeaturesChange: (enabled: boolean) => void;
  subscriptionStatus?: 'free' | 'premium';
  householdId: string;
}

// Add helper function to normalize store names
const normalizeStoreName = (name: string): string => {
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

const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  showPriceFeatures, 
  onPriceFeaturesChange,
  subscriptionStatus = 'free',
  householdId
}) => {
  const defaultStores = [
    { name: 'Albert Heijn', logo: '/supermarkets/ah-logo.png', isSelected: true },
    { name: 'Jumbo', logo: '/supermarkets/jumbo-logo.png', isSelected: true },
    { name: 'Plus', logo: '/supermarkets/plus-logo.png', isSelected: true },
    { name: 'Aldi', logo: '/supermarkets/aldi-logo.png', isSelected: true },
    { name: 'Dirk', logo: '/supermarkets/dirk-logo.png', isSelected: true },
    { name: 'Coop', logo: '/supermarkets/coop-logo.png', isSelected: true },
    { name: 'DekaMarkt', logo: '/supermarkets/dekamarkt-logo.png', isSelected: true },
    { name: 'Vomar', logo: '/supermarkets/vomar-logo.png', isSelected: true },
    { name: 'Poiesz', logo: '/supermarkets/poiesz-logo.png', isSelected: true },
    { name: 'Hoogvliet', logo: '/supermarkets/hoogvliet-logo.png', isSelected: true },
  ];

  const [stores, setStores] = useState<Store[]>(defaultStores);
  const [maxStores, setMaxStores] = useState(3);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [errorIndex] = useState<number | null>(null);
  const [showErrorMessage] = useState(false);
  const [, setIsLoading] = useState(true);
  const [, setError] = useState<Error | null>(null);
  const [items, setItems] = useState<GroceryItem[]>([]);

  useEffect(() => {
    async function loadSettings() {
      if (!isOpen || !householdId) return;

      try {
        setIsLoading(true);
        const { data: settings, error: fetchError } = await supabase
          .from('household_supermarket_settings')
          .select('*')
          .eq('household_id', householdId)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No settings found, create default settings
            const defaultSettings = {
              household_id: householdId,
              max_stores: 3,
              selected_stores: defaultStores.map(store => ({
                name: store.name,
                isSelected: true
              })),
              show_price_features: false
            };

            const { error: upsertError } = await supabase
              .from('household_supermarket_settings')
              .upsert(defaultSettings);

            if (upsertError) throw upsertError;

            setStores(defaultStores);
            setMaxStores(3);
            onPriceFeaturesChange(false);
          } else {
            throw fetchError;
          }
        } else if (settings) {
          // Merge saved selected stores with the default store list
          const mergedStores = defaultStores.map(defaultStore => {
            const savedStore = settings.selected_stores.find(
              (s: Store) => normalizeStoreName(s.name) === normalizeStoreName(defaultStore.name)
            );
            return savedStore ? { ...defaultStore, isSelected: savedStore.isSelected } : defaultStore;
          });
          
          setStores(mergedStores);
          setMaxStores(settings.max_stores);
          onPriceFeaturesChange(settings.show_price_features);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        setError(err instanceof Error ? err : new Error('Failed to load settings'));
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [isOpen, householdId, onPriceFeaturesChange]);

  useEffect(() => {
    async function loadItems() {
      if (!householdId) return;
      try {
        const activeItems = await groceryService.getActiveItems(householdId);
        setItems(activeItems);
      } catch (error) {
        console.error('Error loading items:', error);
      }
    }
    loadItems();
  }, [householdId]);

  // Function to update settings in the database
  const updateSettings = async (newStores: Store[], newMaxStores: number) => {
    try {
      const selectedStores = newStores.filter(store => store.isSelected);
      
      const { error: updateError } = await supabase
        .from('household_supermarket_settings')
        .upsert(
          {
            household_id: householdId,
            max_stores: newMaxStores,
            selected_stores: selectedStores,
            show_price_features: showPriceFeatures
          },
          { 
            onConflict: 'household_id',
            ignoreDuplicates: false 
          }
        );

      if (updateError) {
        console.error('Error updating settings:', updateError);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error updating settings:', err);
      return false;
    }
  };

  const canDeselectStore = (storeName: string): { allowed: boolean; items: string[] } => {
    const itemsOnlyInStore: string[] = [];
    
    items.forEach(item => {
      // Skip items without product data or stores
      if (!item.product_id || !item.stores || item.stores.length === 0) return;

      // Check if this item is available in the store we're trying to deselect
      const isInStore = item.stores.some(store => 
        normalizeStoreName(store.name) === normalizeStoreName(storeName)
      );

      // If item is not in this store, we don't need to check further
      if (!isInStore) return;

      // Check if this item is available in any other selected store
      const isAvailableInOtherSelectedStores = item.stores.some(store => {
        const normalizedStoreName = normalizeStoreName(store.name);
        // Check if it's available in another store that:
        // 1. Is not the one we're trying to deselect
        // 2. Is currently selected
        return normalizedStoreName !== normalizeStoreName(storeName) &&
               stores.some(s => s.isSelected && normalizeStoreName(s.name) === normalizedStoreName);
      });

      // If the item is in this store but not available in any other selected store
      if (!isAvailableInOtherSelectedStores) {
        itemsOnlyInStore.push(item.name);
      }
    });

    return {
      allowed: itemsOnlyInStore.length === 0,
      items: itemsOnlyInStore
    };
  };

  const handleStoreToggle = async (index: number) => {
    const newStores = [...stores];
    const isDeselecting = newStores[index].isSelected;
    
    if (isDeselecting) {
      // Check if store can be deselected
      const { allowed, items: exclusiveItems } = canDeselectStore(newStores[index].name);
      if (!allowed) {
        toast({
          title: "Kan supermarkt niet uitschakelen",
          description: `Deze supermarkt kan niet worden uitgeschakeld omdat het de enige winkel is die de volgende producten verkoopt: ${exclusiveItems.join(', ')}`,
          variant: "destructive"
        });
      return;
      }
    }
    
    newStores[index].isSelected = !newStores[index].isSelected;
    
    // Update database first
    const success = await updateSettings(newStores, maxStores);
    
    if (success) {
      setStores(newStores);
    // Adjust maxStores if needed
    const selectedCount = newStores.filter(s => s.isSelected).length;
    if (maxStores > selectedCount) {
      setMaxStores(selectedCount);
      }
    } else {
      // Show error message or handle the error appropriately
      console.error('Failed to update store selection');
      toast({
        title: "Fout bij opslaan",
        description: "Kon de wijzigingen niet opslaan. Probeer het opnieuw.",
        variant: "destructive"
      });
    }
  };

  const handleMaxStoresChange = async (newMaxStores: number) => {
    // Update database first
    const success = await updateSettings(stores, newMaxStores);
    
    if (success) {
      setMaxStores(newMaxStores);
      setIsDropdownOpen(false);
    } else {
      // Show error message or handle the error appropriately
      console.error('Failed to update max stores');
    }
  };

  const selectedStoresCount = stores.filter(s => s.isSelected).length;
  const maxStoreOptions = Array.from(
    { length: selectedStoresCount }, 
    (_, i) => i + 1
  );

  const handleSave = async () => {
    try {
      onSave(stores, maxStores);
      onClose();
    } catch (err) {
      console.error('Error in save handler:', err);
    }
  };

  // For demo product page, always show the premium version
  if (window.location.pathname === '/demo-product') {
    return (
      <Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground>
        <DrawerContent className="h-[95vh]">
          <div className="mx-auto w-full max-w-md h-full">
            <div className="flex flex-col h-full p-6">
              <div className="flex-1 overflow-y-auto">
              <div className="space-y-5">
                <div className="flex items-center justify-between bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Prijsvergelijking</div>
                    <p className="text-xs text-gray-500">Toon prijzen en aanbiedingen in je lijst</p>
                  </div>
                  <StarToggle 
                    checked={showPriceFeatures}
                    onChange={onPriceFeaturesChange}
                  />
                </div>

                <div className="relative">
                  <div className={`space-y-5 transition-opacity duration-200 ${!showPriceFeatures ? 'opacity-30 pointer-events-none select-none' : ''}`}>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Selecteer je favoriete supermarkten
                      </label>
                      <AnimatePresence>
                        {showErrorMessage && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-2 bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 flex items-center gap-2"
                          >
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <span className="text-sm text-gray-700">Selecteer minimaal één supermarkt</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="grid grid-cols-2 gap-2">
                        {stores.map((store, index) => (
                          <motion.button
                            key={store.name}
                            onClick={() => handleStoreToggle(index)}
                            className={`flex items-center gap-2 p-2 rounded-xl border ${
                              store.isSelected
                                ? 'border-blue-500 bg-blue-50/50'
                                : 'border-gray-200'
                            } transition-colors duration-200`}
                            animate={errorIndex === index ? {
                              x: [0, -4, 4, -4, 4, 0],
                              transition: { duration: 0.4 }
                            } : {}}
                            style={{
                              boxShadow: errorIndex === index ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                            }}
                          >
                            <div className="w-5 h-5 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
                              <img
                                src={store.logo}
                                alt={store.name}
                                className="w-3.5 h-3.5 object-contain"
                              />
                            </div>
                            <span className="flex-1 text-left text-sm text-gray-700 truncate">{store.name}</span>
                            <div
                              className={`w-4 h-4 rounded-full border shrink-0 ${
                                store.isSelected
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300'
                              } flex items-center justify-center`}
                            >
                              {store.isSelected && (
                                <motion.svg
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-2.5 h-2.5 text-white"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </motion.svg>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block">
                          Hoeveel supermarkten wil je bezoeken?
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          We zoeken de beste prijzen binnen dit aantal supermarkten
                        </p>
                      </div>
                      <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Aantal supermarkten:</span>
                          <div className="relative">
                            <button
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 flex items-center gap-1.5"
                            >
                              <span>{maxStores} {maxStores === 1 ? 'supermarkt' : 'supermarkten'}</span>
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            </button>

                            <AnimatePresence>
                              {isDropdownOpen && (
                                <>
                                  <motion.div
                                    className="fixed inset-0"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsDropdownOpen(false)}
                                  />
                                  <motion.div
                                    className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                  >
                                    {maxStoreOptions.map((num) => (
                                      <button
                                        key={num}
                                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                                        onClick={() => handleMaxStoresChange(num)}
                                      >
                                        <span>{num} {num === 1 ? 'supermarkt' : 'supermarkten'}</span>
                                        {maxStores === num && (
                                          <Check className="w-3.5 h-3.5 text-blue-500" />
                                        )}
                                      </button>
                                    ))}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">
                          {maxStores === 1 ? (
                            "We zoeken de beste prijs bij één supermarkt"
                          ) : maxStores === 2 ? (
                            "We verdelen je boodschappen over maximaal 2 supermarkten voor de beste prijzen"
                          ) : maxStores === 3 ? (
                            "We optimaliseren je boodschappen over maximaal 3 supermarkten voor de laagste totaalprijs"
                          ) : maxStores === 4 ? (
                            "We verdelen je boodschappen over maximaal 4 supermarkten voor maximale besparingen"
                          ) : (
                            "We zoeken de absolute laagste prijzen bij alle geselecteerde supermarkten"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!showPriceFeatures && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center"
                      onClick={() => onPriceFeaturesChange(true)}
                    >
                      <div className="flex flex-col items-center gap-2 p-4 text-center">
                        <div className="bg-gradient-to-br from-blue-500/5 to-blue-600/5 backdrop-blur-sm border border-blue-100 shadow-sm px-4 py-3 rounded-2xl cursor-pointer hover:from-blue-500/10 hover:to-blue-600/10 transition-all duration-200">
                          <div className="text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                            Zet prijsvergelijking aan
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            om supermarkten te selecteren
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
              <DrawerFooter>
                <button
                  onClick={handleSave}
                  className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200 text-sm"
                >
                  Opslaan
                </button>
              </DrawerFooter>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // For authenticated pages, check subscription status
  if (subscriptionStatus !== 'premium') {
    return (
      <Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground>
        <DrawerContent className="h-[95vh]">
          <div className="mx-auto w-full max-w-md h-full">
            <div className="flex flex-col h-full p-6">
              <div className="flex-1 overflow-y-auto">
                <div className="py-6">
                  <div className="max-w-md mx-auto space-y-8">
                    {/* Premium Feature Illustration */}
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500/5 via-blue-600/5 to-blue-700/10 flex items-center justify-center">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.1, 1],
                              rotate: [0, 5, 0, -5, 0]
                            }}
                            transition={{ 
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <Sparkles className="w-8 h-8 text-blue-500" />
                          </motion.div>
                        </div>
                        <motion.div
                          className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-medium shadow-lg shadow-blue-500/20"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          Premium
                        </motion.div>
                      </div>
                    </div>

                    {/* Feature Description */}
                    <div className="text-center space-y-2.5">
                      <h3 className="text-2xl font-semibold text-gray-900">
                        Vind de Beste Deals
                      </h3>
                      <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                        Laat ons je boodschappenlijst automatisch vergelijken tussen supermarkten. Wij vinden de beste prijzen en besparen je tijd en geld.
                      </p>
                    </div>

                    {/* Feature Benefits */}
                    <div className="space-y-3">
                      {[
                        {
                          title: 'Slimme Prijsvergelijking',
                          description: 'Zie direct waar jouw producten het goedkoopst zijn, inclusief alle actuele aanbiedingen'
                        },
                        {
                          title: 'Optimale Boodschappenlijst',
                          description: 'Wij verdelen je boodschappen automatisch over supermarkten voor de laagste totaalprijs'
                        },
                        {
                          title: 'Persoonlijke Voorkeuren',
                          description: 'Kies zelf welke supermarkten je wilt vergelijken voor jouw boodschappen'
                        }
                      ].map((benefit, index) => (
                        <motion.div
                          key={benefit.title}
                          className="flex items-start gap-3 bg-gradient-to-br from-blue-50/50 via-blue-50/30 to-transparent rounded-2xl p-3.5"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-blue-600" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-sm font-medium text-gray-900">{benefit.title}</span>
                            <p className="text-xs text-gray-500 leading-relaxed">{benefit.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DrawerFooter className="border-t border-gray-100 bg-white pb-8">
                  <div className="max-w-md mx-auto space-y-4">
                    <button
                      onClick={onClose}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl transition-all duration-200 text-sm shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Upgrade naar Premium
                    </button>
                  <p className="text-xs text-center text-gray-500">
                      Probeer 14 dagen gratis, annuleer wanneer je wilt
                    </p>
                </div>
              </DrawerFooter>
              </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground>
      <DrawerContent className="h-[95vh]">
        <div className="mx-auto w-full max-w-md h-full">
          <div className="flex flex-col h-full p-6">
            <div className="flex-1 overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                <div>
                  <div className="text-sm font-medium text-gray-700">Prijsvergelijking</div>
                  <p className="text-xs text-gray-500">Toon prijzen en aanbiedingen in je lijst</p>
                </div>
                <StarToggle 
                  checked={showPriceFeatures}
                  onChange={onPriceFeaturesChange}
                />
              </div>

              <div className="relative">
                <div className={`space-y-5 transition-opacity duration-200 ${!showPriceFeatures ? 'opacity-30 pointer-events-none select-none' : ''}`}>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Selecteer je favoriete supermarkten
                    </label>
                    <AnimatePresence>
                      {showErrorMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mb-2 bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 flex items-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          <span className="text-sm text-gray-700">Selecteer minimaal één supermarkt</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="grid grid-cols-2 gap-2">
                      {stores.map((store, index) => (
                        <motion.button
                          key={store.name}
                          onClick={() => handleStoreToggle(index)}
                          className={`flex items-center gap-2 p-2 rounded-xl border ${
                            store.isSelected
                              ? 'border-blue-500 bg-blue-50/50'
                              : 'border-gray-200'
                          } transition-colors duration-200`}
                          animate={errorIndex === index ? {
                            x: [0, -4, 4, -4, 4, 0],
                            transition: { duration: 0.4 }
                          } : {}}
                          style={{
                            boxShadow: errorIndex === index ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                          }}
                        >
                          <div className="w-5 h-5 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
                            <img
                              src={store.logo}
                              alt={store.name}
                              className="w-3.5 h-3.5 object-contain"
                            />
                          </div>
                          <span className="flex-1 text-left text-sm text-gray-700 truncate">{store.name}</span>
                          <div
                            className={`w-4 h-4 rounded-full border shrink-0 ${
                              store.isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            } flex items-center justify-center`}
                          >
                            {store.isSelected && (
                              <motion.svg
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2.5 h-2.5 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </motion.svg>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block">
                        Hoeveel supermarkten wil je bezoeken?
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        We zoeken de beste prijzen binnen dit aantal supermarkten
                      </p>
                    </div>
                    <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Aantal supermarkten:</span>
                        <div className="relative">
                          <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 flex items-center gap-1.5"
                          >
                            <span>{maxStores} {maxStores === 1 ? 'supermarkt' : 'supermarkten'}</span>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          </button>

                          <AnimatePresence>
                            {isDropdownOpen && (
                              <>
                                <motion.div
                                  className="fixed inset-0"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onClick={() => setIsDropdownOpen(false)}
                                />
                                <motion.div
                                  className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50"
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                >
                                  {maxStoreOptions.map((num) => (
                                    <button
                                      key={num}
                                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                                      onClick={() => {
                                        setMaxStores(num);
                                        setIsDropdownOpen(false);
                                      }}
                                    >
                                      <span>{num} {num === 1 ? 'supermarkt' : 'supermarkten'}</span>
                                      {maxStores === num && (
                                        <Check className="w-3.5 h-3.5 text-blue-500" />
                                      )}
                                    </button>
                                  ))}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        {maxStores === 1 ? (
                          "We zoeken de beste prijs bij één supermarkt"
                        ) : maxStores === 2 ? (
                          "We verdelen je boodschappen over maximaal 2 supermarkten voor de beste prijzen"
                        ) : maxStores === 3 ? (
                          "We optimaliseren je boodschappen over maximaal 3 supermarkten voor de laagste totaalprijs"
                        ) : maxStores === 4 ? (
                          "We verdelen je boodschappen over maximaal 4 supermarkten voor maximale besparingen"
                        ) : (
                          "We zoeken de absolute laagste prijzen bij alle geselecteerde supermarkten"
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {!showPriceFeatures && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    onClick={() => onPriceFeaturesChange(true)}
                  >
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <div className="bg-gradient-to-br from-blue-500/5 to-blue-600/5 backdrop-blur-sm border border-blue-100 shadow-sm px-4 py-3 rounded-2xl cursor-pointer hover:from-blue-500/10 hover:to-blue-600/10 transition-all duration-200">
                        <div className="text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                          Zet prijsvergelijking aan
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          om supermarkten te selecteren
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>

            <DrawerFooter>
              <button
                onClick={handleSave}
                className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200 text-sm"
              >
                Opslaan
              </button>
            </DrawerFooter>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default StoreSettingsModal; 