import { useState, useEffect, useMemo } from 'react';
import { Package, Search, Loader2, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import Fuse from 'fuse.js';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { CATEGORIES, categoryEmojis } from '@/constants/categories';
import { motion, AnimatePresence } from 'framer-motion';

interface Store {
  name: string;
  logo: string;
  isSelected: boolean;
}

interface SupermarketPrice {
  name: string;
  price: string;
  logoUrl: string;
  pricePerUnit: string;
  offerText?: string;
  offerEndDate?: string;
}

interface Product {
  id: string;
  title: string;
  quantity_info: string | null;
  last_updated: string | null;
  image_url: string | null;
  category: string | null;
  subcategory: string | null;
  main_category: string | null;
  supermarket_data: SupermarketPrice[] | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  itemId: string;
  itemSubcategory: string | null;
  onProductSelect: (productId: string) => Promise<void>;
  selectedStores: Store[];
}

interface CategoryGroup {
  main_category: string;
  categories: {
    category: string;
    subcategories: string[];
  }[];
}


export function ProductSelectionDrawer({
  isOpen,
  onClose,
  itemName,
  itemId,
  itemSubcategory,
  onProductSelect,
  selectedStores
}: ProductSelectionDrawerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  const [, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [showCategorySelection, setShowCategorySelection] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        // Transform CATEGORIES into our hierarchical structure
        const categoriesMap = CATEGORIES.reduce((acc: Record<string, CategoryGroup>, mainCategory) => {
          if (!acc[mainCategory]) {
            acc[mainCategory] = {
              main_category: mainCategory,
              categories: []
            };
          }

          // Get subcategories for this main category from the switch statement in add-product-drawer.tsx
          const subcategories = getSubcategoriesForMainCategory(mainCategory);
          
          // Group subcategories by their parent category
          subcategories.forEach(subcategory => {
            const category = getParentCategory(subcategory, mainCategory);
            
            const existingCategory = acc[mainCategory].categories.find(
              c => c.category === category
            );

            if (existingCategory) {
              if (!existingCategory.subcategories.includes(subcategory)) {
                existingCategory.subcategories.push(subcategory);
              }
            } else {
              acc[mainCategory].categories.push({
                category,
                subcategories: [subcategory]
              });
            }
          });

          return acc;
        }, {});

        setCategories(Object.values(categoriesMap));
      } catch (err) {
        console.error('Error setting up categories:', err);
      }
    }

    fetchCategories();
  }, []);

  // Helper function to get subcategories for a main category
  function getSubcategoriesForMainCategory(mainCategory: string): string[] {
    switch (mainCategory) {
      case 'Aardappel, groente en fruit':
        return ['Aardappelen', 'Groente', 'Fruit', 'Diepvries groente', 'Diepvries fruit', 'Gezonde kruiden', 'Snackgroente en snackfruit', 'Fruitsalde', 'Smoothies en sappen'];
      case 'Salades en maaltijden':
        return ['Salades', 'Kant en klare maaltijden', 'Quiches', 'Ovenschotels', 'Poffertjes en pannenkoeken', 'Pizza', 'Verse soepen', 'Verspakketten', 'Diepvries kant en klare maaltijden', 'Snel snacken', 'Sandwiches', 'Sushi'];
      case 'Kaas, vleeswaren en tapas':
        return ['Kaas', 'Vleeswaren', 'Hummus', 'Borrelhapjes', 'Droge worst', 'Dips en smeersels'];
      case 'Vlees, kip en vis':
        return ['Vlees', 'Vis', 'Rundvlees', 'Varkensvlees', 'Kip', 'Kalkoen', 'Halal', 'BBQ en Gourmet', 'Reepjes en blokjes vlees', 'Worst', 'Schelpdieren', 'Kalfsvlees en wild'];
      case 'Vegetarisch, plantaardig en vegan':
        return ['Vleesvervangers', 'Plantaardige', 'Visvervangers', 'Vegetarische en plantaardige vleeswaren', 'Tofu', 'Vegetarische spreads', 'Plantaardige spreads', 'Vegetarische snack', 'Plantaardige kaas'];
      case 'Zuivel, boter en eieren':
        return ['Zuivel', 'Eieren', 'Kaas', 'Boter en margarine', 'Melk', 'High Protein zuivel', 'Yoghurt en kwark', 'Koffiemelk en room', 'Toetjes', 'Drinkyohurt', 'Lactosevrijve zuivel', 'Zuivel tussendoortjes'];
      case 'Broden, bakkerij en banket':
        return ['Brood', 'Gebak en taart', 'Broodvervangers', 'Crackers en beschuit', 'Afbakbrood', 'Koek en cake', 'Toastcrackers', 'Koolhydraatarm en glutenvrij'];
      case 'Ontbijtgranen en beleg':
        return ['Ontbijtgranen', 'Zoet beleg', 'Broodsalades', 'Hartig broodbeleg', 'Vleeswaren beleg', 'Kaas beleg', 'Cereals en muesli', 'Poeders', 'Halal beleg', 'Plantaardig zoet beleg', 'Ontbijtkoek', 'Beschuiten', 'Crackers'];
      case 'Snoep, koek en chocolade':
        return ['Chocolade', 'Koeken', 'Drop', 'Snoepjes', 'Pepermunt en kauwgom', 'Zoete snacks', 'Bakken', 'Uitdeelzakken', 'Fruitbiscuit'];
      case 'Chips, popcorn en noten':
        return ['Chips', 'Noten', 'Popcorn', 'Zoutjes', 'Toastjes'];
      case 'Tussendoortjes':
        return ['Mueslirepen', 'Fruitsnacks', 'Notenrepen', 'Fruitrepen', 'Eiwitrepen', 'Ontbuitkoekrepen', 'Rijstwafels', 'Drinkboillon', 'Knackebrod'];
      case 'Frisdrank en sappen':
        return ['Frisdrank', 'Water', 'Sap', 'Energie drink', 'Smooties', 'Siroop en limonade', 'Water met smaak', 'Ice tea', 'Drinkpakjes'];
      case 'Koffie en thee':
        return ['Koffie', 'Thee'];
      case 'Bier, wijn en aperitieven':
        return ['Bier', 'Wijn', 'Sterke drank', 'Speciaalbier', 'Alcoholvrij bier', 'Aperitieven en mixdranken'];
      case 'Pasta, rijst en wereldkeuken':
        return ['Pasta', 'Rijst', 'Noedels en mie', 'Speciale voeding', 'Olie en azijn', 'Indonesisch', 'Italiaans en mediteriaans', 'Oosterse keuken', 'Maaltijdpakketten en mixen', 'Mexicaans', 'Hollandse keuken'];
      case 'Soepen, sauzen, kruiden en olie':
        return ['Soepen', 'Sauzen', 'Kruiden', 'Conserven', 'Smaakmakers', 'Garnering'];
      case 'Sport en dieetvoeding':
        return ['Supplementen en vitamines', 'Sportvoeding', 'Proteine poeder', 'Eiwitshakes', 'Dieetvoeding', 'Optiek', 'Zelfzorg'];
      case 'Diepvries':
        return ['IJs', 'Diepvries pizza', 'Diepvries snacks', 'Diepvries aardappel', 'Diepvries, vis en vlees', 'Diepvries, gebak en bladerdeeg', 'Diepvries kant en klare maaltijden', 'Diepvries glutenvrij', 'Diepvries babyvoeding'];
      case 'Drogisterij':
        return ['Lichaamsverzorging', 'Mondverzorging', 'Pijnstillers', 'Haarverzorging', 'Make up', 'Maandverband en tampons', 'Intimiteit'];
      case 'Baby en kind':
        return ['Luiers en doekjes', 'Babyvoeding', 'Baby en kind verzorging', 'Zwangerschap', 'Baby gezondheid'];
      case 'Huishouden':
        return ['Schoonmaakmiddelen', 'Wasmiddel en wasverzachters', 'Luchtverfrissers', 'Vaatwas en afwasmiddelen', 'Schoonmaak producten', 'Vuilniszakken en folies', 'Toiletpapier', 'Tissues en keukenpapier'];
      case 'Huisdier':
        return ['Honden', 'Katten', 'Vissen', 'Knaagdieren', 'Vogels'];
      case 'Koken, tafelen en vrije tijd':
        return ['Koken en bakken'];
      default:
        return [];
    }
  }

  // Helper function to determine parent category
  function getParentCategory(_subcategory: string, mainCategory: string): string {
    switch (mainCategory) {
      case 'Aardappel, groente en fruit':
        return 'Groente en Fruit';
      case 'Salades en maaltijden':
        return 'Maaltijden';
      case 'Kaas, vleeswaren en tapas':
        return 'Kaas en Vleeswaren';
      case 'Vlees, kip en vis':
        return 'Vlees en Vis';
      case 'Vegetarisch, plantaardig en vegan':
        return 'Vegetarisch';
      case 'Zuivel, boter en eieren':
        return 'Zuivel';
      case 'Broden, bakkerij en banket':
        return 'Brood en Bakkerij';
      case 'Ontbijtgranen en beleg':
        return 'Ontbijt';
      case 'Snoep, koek en chocolade':
        return 'Snoep en Koek';
      case 'Chips, popcorn en noten':
        return 'Snacks';
      case 'Tussendoortjes':
        return 'Tussendoortjes';
      case 'Frisdrank en sappen':
        return 'Dranken';
      case 'Koffie en thee':
        return 'Warme Dranken';
      case 'Bier, wijn en aperitieven':
        return 'Alcohol';
      case 'Pasta, rijst en wereldkeuken':
        return 'Wereldkeuken';
      case 'Soepen, sauzen, kruiden en olie':
        return 'Soepen en Sauzen';
      case 'Sport en dieetvoeding':
        return 'Sport en Dieet';
      case 'Diepvries':
        return 'Diepvries';
      case 'Drogisterij':
        return 'Drogisterij';
      case 'Baby en kind':
        return 'Baby';
      case 'Huishouden':
        return 'Huishouden';
      case 'Huisdier':
        return 'Huisdier';
      case 'Koken, tafelen en vrije tijd':
        return 'Koken';
      default:
        return mainCategory;
    }
  }

  // Initialize Fuse instance with products

  // Helper function to normalize store names
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

  // Configure Fuse with improved fuzzy search settings
  const fuseOptions = {
    keys: [
      { name: 'title', weight: 2 },
      { name: 'quantity_info', weight: 0.5 },
      { name: 'subcategory', weight: 0.3 }
    ],
    includeScore: true,
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    shouldSort: true,
    findAllMatches: true,
    location: 0,
    ignoreLocation: true,
  };

  // Filter and sort products based on search query and item name similarity
  const filteredProducts = useMemo(() => {
    // First, remove duplicates and filter by selected stores
    const uniqueProducts = products.reduce<Product[]>((acc, current) => {
      const isDuplicate = current.url && acc.some(item => 
        item.url === current.url && item.url !== null
      );

      if (!isDuplicate) {
        // Filter supermarket_data to only include selected stores
        const filteredSupermarketData = current.supermarket_data?.filter(store =>
          selectedStores.some(selectedStore => 
            selectedStore.isSelected && 
            normalizeStoreName(store.name) === normalizeStoreName(selectedStore.name)
          )
        ) || null;

        // Only include product if it has prices from selected stores
        if (filteredSupermarketData && filteredSupermarketData.length > 0) {
          acc.push({
            ...current,
            supermarket_data: filteredSupermarketData
          });
        }
      }
      return acc;
    }, []);

    // If there's a search query, use that for filtering
    if (searchQuery) {
      const fuse = new Fuse(uniqueProducts, fuseOptions);
      const searchResults = fuse.search(searchQuery);
      return searchResults.map(result => result.item);
    }
    
    // Otherwise, sort by similarity to the grocery item name
    const fuse = new Fuse(uniqueProducts, {
      ...fuseOptions,
      threshold: 0.3,
    });
    const results = fuse.search(itemName);
    
    // Combine fuzzy search results with remaining products
    const matchedProductIds = new Set(results.map(result => result.item.id));
    const remainingProducts = uniqueProducts.filter(product => !matchedProductIds.has(product.id));
    
    return [...results.map(result => result.item), ...remainingProducts];
  }, [searchQuery, itemName, products, selectedStores]);

  // Add a function to reset all state
  const resetState = () => {
    setProducts([]);
    setSearchQuery('');
    setSelectedProduct(null);
    setIsSelecting(false);
    setExpandedProduct(null);
    setSelectedMainCategory(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setShowCategorySelection(false);
  };

  // Update the onClose handler
  const handleClose = () => {
    resetState();
    onClose();
  };

  useEffect(() => {
    async function fetchProducts() {
      if (!isOpen) {
        console.log('Skipping fetch: drawer is closed');
        return;
      }

      try {
        setIsLoading(true);
        
        // If no subcategory, show category selection immediately
        if (!itemSubcategory) {
          setShowCategorySelection(true);
          setIsLoading(false);
          return;
        }

        console.log('Fetching products for subcategory:', itemSubcategory);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('subcategory', itemSubcategory);

        if (error) throw error;
        console.log('Fetched products:', data?.length || 0);
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
    
    // Reset state when drawer closes
    if (!isOpen) {
      resetState();
    }

    return () => {
      if (!isOpen) {
        resetState();
      }
    };
  }, [isOpen, itemSubcategory]);

  useEffect(() => {
    if (isOpen) {
      console.log('Current products:', products.length);
      console.log('Filtered products:', filteredProducts.length);
    }
  }, [isOpen, products, filteredProducts]);

  // Add subscription cleanup to useEffect
  useEffect(() => {
    if (!isOpen) {
      setProducts([]);
      setSearchQuery('');
      setSelectedProduct(null);
      return;
    }

    // Set up real-time subscription
    const subscription = supabase
      .channel('grocery_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items'
        },
        (payload: any) => {
          // Handle different types of changes
          if (payload.eventType === 'UPDATE' && payload.new.id === itemId) {
            // Close the drawer when the item is updated
            onClose();
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or when drawer closes
    return () => {
      subscription.unsubscribe();
    };
  }, [isOpen, itemId, onClose]);

  const handleProductSelect = async (productId: string) => {
    try {
      setSelectedProduct(productId);
      setIsSelecting(true);
      await onProductSelect(productId);
      onClose();
    } catch (error) {
      console.error('Error selecting product:', error);
    } finally {
      setIsSelecting(false);
      setSelectedProduct(null);
    }
  };

  const toggleProductExpansion = (productId: string) => {
    setExpandedProduct(current => current === productId ? null : productId);
  };

  const handleUpdateSubcategory = async () => {
    if (!selectedSubcategory) return;

    try {
      const { error } = await supabase
        .from('grocery_items')
        .update({ 
          subcategory: selectedSubcategory,
          category: selectedMainCategory
        })
        .eq('id', itemId);

      if (error) throw error;

      // Just close the drawer, the subscription will handle the update
      onClose();
    } catch (err) {
      console.error('Error updating subcategory:', err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const itemVariants = {
    hidden: { scale: 0.8 },
    visible: { scale: 1 }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="px-0 pt-0 pb-0 max-h-[95vh] h-auto">
        <div className="flex flex-col max-h-[95vh]">
          {/* Search - Only show when not in category selection */}
          {!showCategorySelection && (
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm px-4 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Zoek producten..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-2">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  </div>
                ) : filteredProducts.length === 0 || showCategorySelection ? (
                  <div className="flex flex-col items-center justify-center">
                    {!showCategorySelection ? (
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={containerVariants}
                        className="flex flex-col items-center justify-center py-4"
                      >
                        <Package className="w-6 h-6 text-blue-400 mb-2" />
                        <p className="text-xs text-gray-500 mb-2 px-4 text-center">
                          Geen producten gevonden voor "{itemName}"
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowCategorySelection(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 rounded-lg transition-colors"
                        >
                          <Package className="w-3.5 h-3.5" />
                          Selecteer categorie
                        </motion.button>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={containerVariants}
                        className="w-full"
                      >
                        <AnimatePresence mode="wait">
                          {!selectedMainCategory ? (
                            <motion.div
                              key="main-categories"
                              variants={containerVariants}
                              className="grid grid-cols-2 gap-2"
                            >
                              {categories.map((cat) => (
                                <motion.button
                                  key={cat.main_category}
                                  variants={itemVariants}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    setSelectedMainCategory(cat.main_category);
                                    setSelectedCategory(null);
                                    setSelectedSubcategory(null);
                                  }}
                                  className="p-2.5 text-xs rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-blue-50/20 transition-all duration-200 text-left shadow-sm hover:shadow-md"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{categoryEmojis[cat.main_category as keyof typeof categoryEmojis]}</span>
                                    <span className="line-clamp-2 font-medium text-gray-700">{cat.main_category}</span>
                                  </div>
                                </motion.button>
                              ))}
                            </motion.div>
                          ) : (
                            <motion.div
                              key="subcategories"
                              variants={containerVariants}
                              className="space-y-2"
                            >
                              <motion.div
                                variants={itemVariants}
                                className="flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-sm p-2 rounded-xl border border-gray-100/50"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{categoryEmojis[selectedMainCategory as keyof typeof categoryEmojis]}</span>
                                  <span className="text-sm font-medium text-gray-700">{selectedMainCategory}</span>
                                </div>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    setSelectedMainCategory(null);
                                    setSelectedCategory(null);
                                    setSelectedSubcategory(null);
                                  }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </motion.button>
                              </motion.div>

                              <div className="grid grid-cols-2 gap-2">
                                {getSubcategoriesForMainCategory(selectedMainCategory).map((subcat) => (
                                  <motion.button
                                    key={subcat}
                                    variants={itemVariants}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                      setSelectedSubcategory(subcat);
                                      const parentCategory = getParentCategory(subcat, selectedMainCategory);
                                      setSelectedCategory(parentCategory);
                                    }}
                                    className={cn(
                                      "p-2.5 text-xs rounded-xl transition-all duration-200 text-left",
                                      selectedSubcategory === subcat
                                        ? "bg-blue-500 text-white shadow-md"
                                        : "bg-white border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 shadow-sm hover:shadow-md"
                                    )}
                                  >
                                    <span className="line-clamp-2">{subcat}</span>
                                  </motion.button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Save Button */}
                        <AnimatePresence>
                          {selectedSubcategory && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              className="sticky bottom-0 py-2 mt-2 bg-gradient-to-t from-white via-white to-transparent"
                            >
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleUpdateSubcategory}
                                className="w-full p-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl shadow-lg transition-all duration-200"
                              >
                                Opslaan
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => {
                      const cheapestStore = product.supermarket_data 
                        ? [...product.supermarket_data].sort((a, b) => {
                            const priceA = parseFloat(a.price.replace('€', '').trim());
                            const priceB = parseFloat(b.price.replace('€', '').trim());
                            return priceA - priceB;
                          })[0]
                        : null;

                      const hasMultipleStores = product.supermarket_data && product.supermarket_data.length > 1;

                      return (
                        <div key={product.id} className="space-y-2">
                          <div
                            className={cn(
                              "w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all",
                              expandedProduct === product.id
                                ? "border-blue-200 bg-gradient-to-r from-blue-50/80 to-blue-50/40"
                                : "border-gray-100 hover:border-blue-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-blue-50/20"
                            )}
                          >
                            <button
                              onClick={() => toggleProductExpansion(product.id)}
                              className="flex items-start gap-2.5 flex-1 group"
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-lg bg-white border flex items-center justify-center",
                                expandedProduct === product.id
                                  ? "border-blue-200"
                                  : "border-gray-100"
                              )}>
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.title}
                                    className="w-6 h-6 object-contain"
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-blue-400" />
                                )}
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {product.title}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1.5 mt-0.5">
                                  <span className="text-xs text-gray-500 truncate">
                                    {product.quantity_info || product.subcategory}
                                  </span>
                                  {cheapestStore && (
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <img
                                          src={cheapestStore.logoUrl}
                                          alt={cheapestStore.name}
                                          className="w-3.5 h-3.5 object-contain"
                                        />
                                        <span className="text-xs font-medium text-gray-900">
                                          {cheapestStore.price}
                                        </span>
                                        {cheapestStore.offerText && (
                                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                            {cheapestStore.offerText}
                                          </span>
                                        )}
                                      </div>
                                      {hasMultipleStores && (
                                        <div className="flex items-center gap-1 text-xs text-blue-600 group-hover:text-blue-700 transition-colors">
                                          <span className="font-medium">
                                            Vergelijk {product.supermarket_data?.length || 0} winkels
                                          </span>
                                          {expandedProduct === product.id ? (
                                            <ChevronUp className="w-3.5 h-3.5" />
                                          ) : (
                                            <ChevronDown className="w-3.5 h-3.5 animate-bounce group-hover:animate-none" />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                            <button
                              onClick={() => handleProductSelect(product.id)}
                              disabled={isSelecting}
                              className={cn(
                                "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                                selectedProduct === product.id
                                  ? "bg-blue-500 text-white shadow-sm"
                                  : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 hover:shadow-sm"
                              )}
                            >
                              {selectedProduct === product.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Plus className="w-5 h-5" />
                              )}
                            </button>
                          </div>

                          {/* Price Comparison */}
                          {product.supermarket_data && product.supermarket_data.length > 0 && (
                            <div className={cn(
                              "overflow-hidden transition-all duration-200",
                              expandedProduct === product.id ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                            )}>
                              <div className="p-3 bg-white rounded-xl border border-gray-100">
                                <div className="text-xs font-medium text-gray-500 mb-2">
                                  Prijzen bij andere winkels
                                </div>
                                <div className="space-y-2">
                                  {[...product.supermarket_data]
                                    .sort((a, b) => {
                                      const priceA = parseFloat(a.price.replace('€', '').trim());
                                      const priceB = parseFloat(b.price.replace('€', '').trim());
                                      return priceA - priceB;
                                    })
                                    .map((store, index, array) => {
                                      const price = parseFloat(store.price.replace('€', '').trim());
                                      const cheapestPrice = parseFloat(array[0].price.replace('€', '').trim());
                                      const priceDiff = ((price - cheapestPrice) / cheapestPrice * 100).toFixed(1);
                                      
                                      return (
                                        <div 
                                          key={store.name}
                                          className={cn(
                                            "flex items-center gap-2.5 p-2.5 rounded-lg transition-all",
                                            index === 0 
                                              ? "bg-gradient-to-r from-blue-50 to-blue-50/50 border border-blue-100"
                                              : "hover:bg-gray-50/50"
                                          )}
                                        >
                                          {/* Store Logo */}
                                          <div className={cn(
                                            "w-9 h-9 rounded-lg bg-white border flex items-center justify-center p-1.5",
                                            index === 0 ? "border-blue-100" : "border-gray-100"
                                          )}>
                                            <img
                                              src={store.logoUrl}
                                              alt={store.name}
                                              className="w-full h-full object-contain"
                                            />
                                          </div>

                                          {/* Price Info */}
                                          <div className="flex flex-col flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                              <span className="text-sm font-medium text-gray-900">
                                                {store.price}
                                              </span>
                                              {index === 0 ? (
                                                <span className="text-xs font-medium text-blue-600 bg-blue-100/80 px-1.5 py-0.5 rounded-full">
                                                  Laagste prijs
                                                </span>
                                              ) : (
                                                <span className="text-xs text-gray-500 bg-gray-100/80 px-1.5 py-0.5 rounded-full">
                                                  +{priceDiff}%
                                                </span>
                                              )}
                                              {store.offerText && (
                                                <span className="text-xs font-medium text-blue-600 bg-blue-100/80 px-1.5 py-0.5 rounded-full">
                                                  {store.offerText}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-xs text-gray-500">
                                                {store.pricePerUnit}
                                              </span>
                                              {store.offerEndDate && (
                                                <>
                                                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                  <span className="text-xs text-gray-500">
                                                    {store.offerEndDate}
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 