import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroceryItem } from '@/types/grocery';
import { Loader2, ChevronDown, ArrowRightLeft, Check, Search, X, MessageSquareWarning, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { hybridSearchService } from '@/services/hybrid-search-service';
import Fuse from 'fuse.js';
import { groceryService } from '@/services/grocery-service';
import { CATEGORIES, Category } from '@/constants/categories';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment variable
const GOOGLE_AI_KEY = import.meta.env.VITE_GOOGLE_AI_KEY;
const GOOGLE_AI_MODEL = import.meta.env.VITE_GOOGLE_AI_MODEL || 'gemini-pro';

// Initialize the Gemini AI client with API key
const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ model: GOOGLE_AI_MODEL });

// Helper function to get subcategories for a main category
export function getSubcategoriesForMainCategory(mainCategory: string): string[] {
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
      return ['Ontbijtgranen', 'Zoet beleg', 'Broodsalades', 'Hartig broodbeleg', 'Vleeswaren beleg', 'Kaas beleg', 'Cereals en muesli', 'Poeders', 'Halal beleg'];
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
      return ['IJs', 'Diepvries pizza', 'Diepvries snacks', 'Diepvries aardappel', 'Diepvries vis en vlees', 'Diepvries gebak en bladerdeeg', 'Diepvries kant en klare maaltijden', 'Diepvries glutenvrij', 'Diepvries babyvoeding'];
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

// Fuse.js options for fuzzy matching - Making it more Dutch-friendly and lenient

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
  const [switchingItems, setSwitchingItems] = useState<Set<string>>(new Set());
  const [switchedItems, setSwitchedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState<Set<string>>(new Set());
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  // Check welcome message status
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('has_seen_sale_welcome') === 'true';
    if (!hasSeenWelcome) {
      setShowWelcomePopup(true);
      onPopupChange?.(true);
    } else {
      setHasSeenWelcome(true);
    }
  }, [onPopupChange]);

  // Load recommendations when groceryList changes
  useEffect(() => {
    async function fetchRecommendations() {
      // Filter out completed items
      const activeItems = groceryList.filter(item => !item.completed);
      
      if (activeItems.length === 0) {
        setRecommendations({});
        return;
      }

      setIsLoading(true);
      try {
        // Get recommendations for all items
        const newRecs = await hybridSearchService.searchSaleItems(activeItems);
            
        // Group recommendations and filter out non-sale items
        const groupedRecs: GroupedRecommendations = {};
        newRecs.forEach(rec => {
          const key = rec.groceryItem.id;
          
          // Filter recommendations to only include items with active sales (offer text)
          const saleRecommendations = rec.recommendations.filter(item => 
            item.saleItem.supermarkets?.some(store => 
              store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
            )
          );
          
          // Only include products that have supermarkets with offer text
          if (saleRecommendations.length > 0) {
            // For each recommendation, only include supermarkets with offer text
            const cleanedRecommendations = saleRecommendations.map(item => ({
              ...item,
              saleItem: {
                ...item.saleItem,
                supermarkets: item.saleItem.supermarkets?.filter(store =>
                  store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
                )
              }
            }));

            groupedRecs[key] = {
              groceryItem: rec.groceryItem,
              recommendations: cleanedRecommendations
            };
          }
        });

        console.log('Fetched recommendations:', groupedRecs);
        setRecommendations(groupedRecs);
        
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
    }

    fetchRecommendations();
  }, [groceryList]);

  // Add debounced search function
  const [debouncedSearch] = useState(() => {
    let timeout: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (query.trim()) {
          handleSearch(query);
        } else {
          setSearchResults([]);
        }
      }, 500); // Wait 500ms after user stops typing
    };
  });

  const filterRecommendationsByFuzzyMatch = (groceryItemName: string, recommendations: Array<any>) => {
    // First, ensure we have recommendations to work with
    if (!recommendations || recommendations.length === 0) {
      return [];
    }

    // 1. Get all products that have offer text in supermarket_data
    const productsOnSale = recommendations.filter(rec => {
      // Check if any supermarket has an offer text
      const hasActiveSale = rec.saleItem.supermarkets?.some((store: SupermarketStore) => 
        store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
      );

      // Only include if there's an active sale with offer text
      return hasActiveSale;
    });

    // 2. If we have no products on sale, return empty array
    if (productsOnSale.length === 0) {
      return [];
    }

    // 3. Use basic Fuse.js for sorting purposes only
    const fuseOptions = {
      includeScore: true,
      threshold: 0.9,
      keys: ['saleItem.productName']
    };

    const fuse = new Fuse(productsOnSale, fuseOptions);
    const results = fuse.search(groceryItemName);

    // 4. Return only fuzzy matches that are on sale
    return results.map(result => ({
      ...result.item,
      saleItem: {
        ...result.item.saleItem,
        supermarkets: result.item.saleItem.supermarkets?.filter(store =>
          store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
        )
      }
    }));
  };

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
        // Filter to only include items with offer text
        const saleResults = results[0].recommendations.filter(item => 
          item.saleItem.supermarkets?.some(store => 
            store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
          )
        ).map(item => ({
          ...item,
          saleItem: {
            ...item.saleItem,
            supermarkets: item.saleItem.supermarkets?.filter((store: SupermarketStore) =>
              store.supermarket_data?.offerText && store.supermarket_data.offerText !== ''
            )
          }
        }));
        
        // Apply fuzzy matching to filtered results
        const filteredResults = filterRecommendationsByFuzzyMatch(
          query,
          saleResults
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

  async function handleAddToGroceryList(saleItem: SaleItem, store: SupermarketStore) {
    const itemKey = `search-${saleItem.id}-${store.name}`;
    
    if (isAddingItem.has(itemKey)) return;

    try {
      setIsAddingItem(prev => new Set([...prev, itemKey]));

      let mainCategory: Category = 'Overig';
      let subcategory = '';
      let emoji = '🛍️';

      try {
        // Step 1: First determine the main category
        const mainCategoryPrompt = `Given the Dutch grocery item name "${saleItem.productName}", determine which main category it belongs to. Only return the category name, nothing else.
        Available categories:
        ${CATEGORIES.map(cat => `- ${cat}`).join('\n')}

        Only respond with the category name, nothing else.`;

        const mainCategoryResult = await model.generateContent(mainCategoryPrompt);
        const suggestedCategory = mainCategoryResult.response.text().trim();
        
        // Validate the category
        if (CATEGORIES.includes(suggestedCategory as Category)) {
          mainCategory = suggestedCategory as Category;

          // Step 2: Then determine the subcategory and emoji
          const subcategoryPrompt = `Given this grocery item: "${saleItem.productName}" and its main category "${mainCategory}", 
choose the most appropriate subcategory from the following list. Only respond with the subcategory name, nothing else.

${getSubcategoriesForMainCategory(mainCategory).join('\n')}`;

          const subcategoryResult = await model.generateContent(subcategoryPrompt);
          const subCategory = subcategoryResult.response.text().trim();

          // Validate subcategory
          const typedSubCategories = getSubcategoriesForMainCategory(mainCategory);
          const isValidSubCategory = typedSubCategories.includes(subCategory);
          
          if (isValidSubCategory) {
            subcategory = subCategory;
          } else {
            console.warn(`Unexpected subcategory returned by AI: ${subCategory}`);
            subcategory = typedSubCategories[0] || ''; // Use first subcategory as fallback
          }

          // Step 3: Get an appropriate emoji
          const emojiPrompt = `Given this grocery item: "${saleItem.productName}" in category "${mainCategory}" and subcategory "${subcategory}", suggest a single appropriate emoji. Only respond with the emoji, nothing else.`;

          const emojiResult = await model.generateContent(emojiPrompt);
          emoji = emojiResult.response.text().trim();
        }
      } catch (aiError) {
        console.error('Error getting AI categorization:', aiError);
        // Keep default values if AI fails
      }

      // Parse the valid_until date if it exists
      let validUntil = null;
      if (store.validUntil) {
        try {
          // Check if it's a Dutch format like "t/m 04-02"
          if (store.validUntil.includes('t/m')) {
            const datePart = store.validUntil.split('t/m')[1].trim();
            const [day, month] = datePart.split('-').map(num => num.padStart(2, '0'));
            const year = new Date().getFullYear();
            validUntil = new Date(year, parseInt(month) - 1, parseInt(day)).toISOString();
          } else {
            // Try to parse as a regular date string
            validUntil = new Date(store.validUntil).toISOString();
          }
        } catch (error) {
          console.error('Error parsing valid_until date:', error);
          validUntil = null;
        }
      }

      // Create a new grocery item
      const newGroceryItem = {
        name: saleItem.productName,
        emoji: emoji,
        household_id: groceryList[0]?.household_id,
        completed: false,
        priority: false,
        product_id: saleItem.id,
        current_price: store.currentPrice,
        original_price: store.originalPrice,
        sale_type: store.saleType,
        valid_until: validUntil,
        supermarket: store.name,
        category: mainCategory,
        subcategory: subcategory,
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
                  debouncedSearch(e.target.value);
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
                                  onClick={() => handleAddToGroceryList(result.saleItem, store)}
                                  disabled={isAddingItem.has(`search-${result.saleItem.id}-${store.name}`)}
                                  className={cn(
                                    "group relative flex h-6 px-2 items-center justify-center rounded-md text-[11px] font-medium transition-all duration-200",
                                    isAddingItem.has(`search-${result.saleItem.id}-${store.name}`)
                                      ? "bg-gray-100 text-gray-400"
                                      : addedItems.has(`search-${result.saleItem.id}-${store.name}`)
                                      ? "bg-green-100 hover:bg-green-200 text-green-700"
                                      : "bg-blue-50 hover:bg-blue-100 text-blue-700"
                                  )}
                                >
                                  <AnimatePresence mode="wait">
                                    {isAddingItem.has(`search-${result.saleItem.id}-${store.name}`) ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : addedItems.has(`search-${result.saleItem.id}-${store.name}`) ? (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className="flex items-center gap-1"
                                      >
                                        <Check className="h-3 w-3" />
                                        <span>Toegevoegd</span>
                                      </motion.div>
                                    ) : (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className="flex items-center gap-1"
                                      >
                                        <Plus className="h-3 w-3" />
                                        <span>Toevoegen</span>
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