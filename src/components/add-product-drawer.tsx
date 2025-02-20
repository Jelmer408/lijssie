"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ChevronLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { CATEGORIES, Category, categoryEmojis } from '@/constants/categories'
import { aiService } from '@/services/ai-service'
import { cn } from "@/lib/utils"
import { recipeVisionService } from '@/services/recipe-vision-service'
import { toast } from "@/components/ui/use-toast"
import { RecipeIngredient } from '@/types/recipe'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { CreateGroceryItem, NewItemState } from '@/types/grocery'
import { supabase } from '@/lib/supabase'
import { getSubcategoriesForMainCategory } from '@/components/sales/SaleRecommendations'

// Get API key from environment variable
const GOOGLE_AI_KEY = import.meta.env.VITE_GOOGLE_AI_KEY;
const GOOGLE_AI_MODEL = import.meta.env.VITE_GOOGLE_AI_MODEL || 'gemini-pro';

// Initialize the Gemini AI client with API key
const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ model: GOOGLE_AI_MODEL });

// Add debug logging
if (!GOOGLE_AI_KEY) {
  console.warn('Missing VITE_GOOGLE_AI_KEY environment variable');
}

if (GOOGLE_AI_KEY) {
  console.log('Gemini AI initialized with key length:', GOOGLE_AI_KEY.length);
}

interface HouseholdSettings {
  household_id: string;
  max_stores: number;
  selected_stores: Array<{ name: string; isSelected: boolean }>;
  show_price_features: boolean;
}

interface AddProductDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUploadModal?: () => void;
  newItem: NewItemState;
  onItemChange: (item: NewItemState) => void;
  onAddItem: (item: NewItemState) => void;
  householdId: string;
}

interface CategorySelectionScreenProps {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
  onBack: () => void;
}

function CategorySelectionScreen({ selectedCategory, onSelectCategory, onBack }: CategorySelectionScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -300 }}
      className="absolute inset-0 bg-white z-10 flex flex-col"
    >
      <div className="px-6 py-3 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-medium">Kies een categorie</h2>
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        <div className="grid grid-cols-4 gap-1.5 h-full">
          {CATEGORIES.map((category) => (
            <motion.button
              key={category}
              onClick={() => onSelectCategory(category as Category)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all ${
                selectedCategory === category
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-base">{categoryEmojis[category as Category]}</span>
              <span className="text-[10px] leading-tight text-center line-clamp-2 mt-0.5 px-0.5">{category}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function AddProductDrawer({
  isOpen,
  onClose,
  newItem,
  onItemChange,
  onAddItem,
  householdId
}: AddProductDrawerProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showCategoryScreen, setShowCategoryScreen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [extractedIngredients, setExtractedIngredients] = useState<RecipeIngredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [isAddingIngredients, setIsAddingIngredients] = useState(false);
  const [householdSettings, setHouseholdSettings] = useState<HouseholdSettings | null>(null);

  // Store the latest onItemChange in a ref
  const onItemChangeRef = useRef(onItemChange);
  useEffect(() => {
    onItemChangeRef.current = onItemChange;
  }, [onItemChange]);

  // Reset all states when drawer closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all drawer-related states
      setIsDropdownOpen(false);
      setIsProcessingImage(false);
      setExtractedIngredients([]);
      setSelectedIngredients(new Set());
      setIsAddingIngredients(false);
      
      // Reset the newItem state to initial values
      onItemChangeRef.current({
        name: '',
        quantity: '',
        unit: '',
        category: 'Overig',
        subcategory: null,
        priority: false,
        emoji: '📦',
        user_id: '',
        user_name: null,
        user_avatar: null,
        household_id: ''
      });
    }
  }, [isOpen]); // Remove onItemChange from dependencies

  // Add effect to load household settings
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
              selected_stores: [],
              show_price_features: false
            };

            const { data: newSettings, error: insertError } = await supabase
              .from('household_supermarket_settings')
              .insert(defaultSettings)
              .select()
              .single();

            if (insertError) throw insertError;
            setHouseholdSettings(newSettings);
          } else {
            throw error;
          }
        } else {
          setHouseholdSettings(data);
        }
      } catch (err) {
        console.error('Error loading household settings:', err);
      }
    }

    loadHouseholdSettings();

    // Subscribe to changes in household settings
    const channel = supabase
      .channel(`household_settings_${householdId}`)
      .on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table: 'household_supermarket_settings',
          filter: `household_id=eq.${householdId}`
        },
        (payload) => {
          if (payload.new) {
            setHouseholdSettings(payload.new as HouseholdSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  // Add debounce function at the top of the component
  const [debouncedGetSuggestions] = useState(() => {
    let timeout: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeout);
      setIsTyping(true);
      timeout = setTimeout(() => {
        if (value.length >= 2) {
          setIsAIProcessing(true);
          getAISuggestions(value);
        }
        setIsTyping(false);
      }, 1000); // Wait 1 second after typing stops
    };
  });

  // Add blur handler for mobile keyboards
  const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    onItemChangeRef.current({ 
      ...newItem, 
      name: newName,
      subcategory: newItem.subcategory ?? null  // Ensure subcategory is always set
    });
    debouncedGetSuggestions(newName);
  };

  const handleNameInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length >= 2) {
      getAISuggestions(value);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get AI suggestions when name changes
  const getAISuggestions = async (itemName: string) => {
    if (itemName.length < 2) return;
    
    try {
      // Check for API key
      if (!GOOGLE_AI_KEY) {
        console.warn('No Gemini AI key available, falling back to basic categorization');
        await fallbackToBasicCategorization(itemName);
        setIsAIProcessing(false);
        return;
      }

      // Log the request
      console.log('Requesting Gemini AI categorization for:', itemName);

      // Add store context to the prompt if price features are enabled
      const storeContext = householdSettings?.show_price_features && householdSettings.selected_stores.length > 0
        ? `\nThis item will be purchased at one of these stores: ${householdSettings.selected_stores
            .filter(s => s.isSelected)
            .map(s => s.name)
            .join(', ')}`
        : '';

      // Step 1: First determine the main category
      const mainCategoryPrompt = `Given the Dutch grocery item name "${itemName}"${storeContext}, determine which main category it belongs to. Only return the category name, nothing else.
      Available categories:
      - Aardappel, groente en fruit
      - Salades en maaltijden
      - Kaas, vleeswaren en tapas
      - Vlees, kip en vis
      - Vegetarisch, plantaardig en vegan
      - Zuivel, boter en eieren
      - Broden, bakkerij en banket
      - Ontbijtgranen en beleg
      - Snoep, koek en chocolade
      - Chips, popcorn en noten
      - Tussendoortjes
      - Frisdrank en sappen
      - Koffie en thee
      - Bier, wijn en aperitieven
      - Pasta, rijst en wereldkeuken
      - Soepen, sauzen, kruiden en olie
      - Sport en dieetvoeding
      - Diepvries
      - Drogisterij
      - Baby en kind
      - Huishouden
      - Huisdier
      - Koken, tafelen en vrije tijd`;

      try {
        console.log('Sending main category prompt to Gemini AI...');
        const mainCategoryResult = await model.generateContent(mainCategoryPrompt);
        const mainCategory = mainCategoryResult.response.text().trim();
        console.log('Received main category:', mainCategory);

        // Step 2: Then determine the subcategory based on the main category
        const subcategoryPrompt = `Given the Dutch grocery item "${itemName}" which belongs to the main category "${mainCategory}", determine:
        1. The most appropriate subcategory from the list below
        2. An appropriate emoji for this item

        Return as JSON:
        {
          "subcategory": "subcategory name",
          "emoji": "emoji"
        }

        Available subcategories for ${mainCategory}:
        ${getSubcategoriesForMainCategory(mainCategory).join(', ')}`;

        const subcategoryResult = await model.generateContent(subcategoryPrompt);
        const subcategoryText = subcategoryResult.response.text().trim();
        console.log('Received subcategory response:', subcategoryText);

        const subcategoryData = JSON.parse(subcategoryText.replace(/```json\n?|\n?```/g, '').trim());
        console.log('Parsed subcategory data:', subcategoryData);
        console.log('Subcategory value from AI:', subcategoryData.subcategory);

        // Update the item with AI suggestions
        const updatedItem = { 
          ...newItem,
          name: itemName,
          category: mainCategory as Category,
          subcategory: subcategoryData.subcategory ?? null,  // Ensure null if undefined
          emoji: subcategoryData.emoji
        };
        
        console.log('Updating item with:', updatedItem);
        onItemChangeRef.current(updatedItem);

        console.log('Updated item with AI suggestions:', {
          name: itemName,
          category: mainCategory,
          subcategory: subcategoryData.subcategory,
          emoji: subcategoryData.emoji
        });

      } catch (aiError) {
        console.error('Error with Gemini AI:', aiError);
        if (aiError instanceof Error && aiError.message.includes('403')) {
          console.error('API key authentication failed');
          toast({
            title: "API Fout",
            description: "Er is een probleem met de AI service authenticatie. Gebruik handmatige categorisatie.",
            variant: "destructive"
          });
        }
        // Fallback to basic categorization
        await fallbackToBasicCategorization(itemName);
      } finally {
        setIsAIProcessing(false);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      // Fallback to basic categorization
      await fallbackToBasicCategorization(itemName);
      setIsAIProcessing(false);
    }
  };

  // Separate function for fallback categorization
  const fallbackToBasicCategorization = async (itemName: string) => {
    try {
      const aiSuggestion = await aiService.getItemSuggestions(itemName);
      onItemChangeRef.current({ 
        ...newItem,
        name: itemName,
        category: aiSuggestion.category as Category,
        emoji: aiSuggestion.emoji
      });
    } catch (fallbackError) {
      console.error('Error in fallback categorization:', fallbackError);
      toast({
        title: "Fout bij categoriseren",
        description: "Kon het product niet automatisch categoriseren. Kies handmatig een categorie.",
        variant: "destructive"
      });
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Extract ingredients using Vision API
          const ingredients = await recipeVisionService.extractIngredientsFromImage(reader.result as string);
          
          setExtractedIngredients(ingredients.map(ing => ({
            ...ing,
            emoji: categoryEmojis[ing.category as Category] || categoryEmojis['Overig']
          })));
          
          // Clear progress after a short delay
          setTimeout(() => setIsProcessingImage(false), 500);
        } catch (error) {
          console.error('Error processing image:', error);
          toast({
            title: "Fout bij verwerken afbeelding",
            description: "Kon de ingrediënten niet uit de afbeelding halen.",
            variant: "destructive"
          });
        } finally {
          setIsProcessingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setIsProcessingImage(false);
    }
  };

  const toggleIngredientSelection = (ingredientId: string) => {
    setSelectedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  const addSelectedIngredients = async () => {
    setIsAddingIngredients(true);
    
    try {
      for (const ingredient of extractedIngredients) {
        if (selectedIngredients.has(ingredient.id)) {
          try {
            // Check for API key
            if (!GOOGLE_AI_KEY) {
              console.warn('No Gemini AI key available, falling back to basic categorization');
              const aiSuggestion = await aiService.getItemSuggestions(ingredient.name);
              
              // Create the item with basic AI suggestions
              const itemToAdd: CreateGroceryItem = {
                name: ingredient.name,
                category: aiSuggestion.category as Category,
                quantity: ingredient.amount ? `${ingredient.amount} ${ingredient.unit || ''}`.trim() : '1',
                unit: ingredient.unit || '',
                priority: false,
                emoji: aiSuggestion.emoji,
                subcategory: aiSuggestion.subcategory ?? null,
                completed: false,
                user_id: '',
                user_name: '',
                user_avatar: '',
                household_id: ''
              };
              
              await onAddItem(itemToAdd);
              continue;
            }

            // Step 1: First determine the main category
            const mainCategoryPrompt = `Given the Dutch grocery item name "${ingredient.name}", determine which main category it belongs to. Only return the category name, nothing else.
            Available categories: ${CATEGORIES.join(', ')}`;

            const mainCategoryResult = await model.generateContent(mainCategoryPrompt);
            const mainCategory = mainCategoryResult.response.text().trim();

            // Step 2: Then determine the subcategory based on the main category
            const subcategoryPrompt = `Given the Dutch grocery item "${ingredient.name}" which belongs to the main category "${mainCategory}", determine:
            1. The most appropriate subcategory from the list below
            2. An appropriate emoji for this item

            Return as JSON:
            {
              "subcategory": "subcategory name",
              "emoji": "emoji"
            }

            Available subcategories for ${mainCategory}:
            ${getSubcategoriesForMainCategory(mainCategory).join(', ')}`;

            const subcategoryResult = await model.generateContent(subcategoryPrompt);
            const subcategoryText = subcategoryResult.response.text().trim();
            const subcategoryData = JSON.parse(subcategoryText.replace(/```json\n?|\n?```/g, '').trim());

            // Create the item with AI suggestions
            const itemToAdd: CreateGroceryItem = {
              name: ingredient.name,
              category: mainCategory as Category,
              quantity: ingredient.amount ? `${ingredient.amount} ${ingredient.unit || ''}`.trim() : '1',
              unit: ingredient.unit || '',
              priority: false,
              emoji: subcategoryData.emoji,
              subcategory: subcategoryData.subcategory,
              completed: false,
              user_id: '',
              user_name: '',
              user_avatar: '',
              household_id: ''
            };

            console.log('Adding ingredient with AI data:', itemToAdd);
            await onAddItem(itemToAdd);

          } catch (error) {
            console.error('Error processing ingredient:', ingredient.name, error);
            // Fallback to basic categorization for this ingredient
            const aiSuggestion = await aiService.getItemSuggestions(ingredient.name);
            const itemToAdd: CreateGroceryItem = {
              name: ingredient.name,
              category: aiSuggestion.category as Category,
              quantity: ingredient.amount ? `${ingredient.amount} ${ingredient.unit || ''}`.trim() : '1',
              unit: ingredient.unit || '',
              priority: false,
              emoji: aiSuggestion.emoji,
              subcategory: aiSuggestion.subcategory ?? null,
              completed: false,
              user_id: '',
              user_name: '',
              user_avatar: '',
              household_id: ''
            };
            
            await onAddItem(itemToAdd);
          }
        }
      }
      
      // Reset states and close drawer
      setExtractedIngredients([]);
      setSelectedIngredients(new Set());
      onClose();
    } catch (error) {
      console.error('Error adding ingredients:', error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er ging iets mis bij het toevoegen van de ingrediënten.",
        variant: "destructive"
      });
    } finally {
      setIsAddingIngredients(false);
    }
  };

  const handleButtonClick = () => {
    const itemToAdd: CreateGroceryItem = {
      ...newItem,
      subcategory: newItem.subcategory || '',
      quantity: newItem.quantity || '1',
      unit: newItem.unit || '',
      completed: false,
      user_id: '',  // These will be set by the backend
      user_name: '',
      user_avatar: '',
      household_id: ''  // This will be set by the backend
    };
    console.log('Item being sent to addItem:', itemToAdd);
    onAddItem(itemToAdd);
    
    // Reset the newItem state to initial values
    onItemChangeRef.current({
      name: '',
      quantity: '',
      unit: '',
      category: 'Overig',
      subcategory: null,
      priority: false,
      emoji: '📦',
      user_id: '',
      user_name: null,
      user_avatar: null,
      household_id: ''
    });
    
    onClose();
  };

  // Remove the drawer height calculation effect since we'll use the parent drawer height
  useEffect(() => {
    if (!isOpen) {
      setShowCategoryScreen(false);
    }
  }, [isOpen]);

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent 
        className={cn(
          "z-[600]", 
          isDropdownOpen && "touch-none"
        )}
      >
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col p-6">
            <div className="space-y-6">
              {!extractedIngredients.length ? (
                <div className="relative group">
                  <input
                    id="recipe-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isProcessingImage}
                    className="hidden"
                  />
                  {isProcessingImage ? (
                    <div className="flex items-center justify-center gap-3 w-full h-16 rounded-xl bg-blue-50/50 border border-blue-200">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-blue-600">Ingrediënten herkennen...</p>
                    </div>
                  ) : (
                    <label
                      htmlFor="recipe-image"
                      className="flex items-center justify-center gap-3 w-full h-16 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 cursor-pointer transition-all duration-300 group-hover:border-blue-500 group-hover:bg-blue-50/50"
                    >
                      <Upload className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                      <p className="text-sm text-gray-500 group-hover:text-gray-600">
                        <span className="font-medium">Upload een foto</span> van je recept
                      </p>
                    </label>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-700">Gevonden Ingrediënten</h3>
                    <button
                      onClick={() => setSelectedIngredients(new Set(extractedIngredients.map(ing => ing.id)))}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Selecteer alles
                    </button>
                  </div>

                  <div className="space-y-2">
                    {extractedIngredients.map((ingredient) => (
                      <motion.div
                        key={ingredient.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                        onClick={() => toggleIngredientSelection(ingredient.id)}
                      >
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 bg-white">
                          {selectedIngredients.has(ingredient.id) && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-3 h-3 rounded-full bg-blue-500"
                            />
                          )}
                        </div>
                        <span className="text-lg">{ingredient.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {ingredient.name}
                          </p>
                          {ingredient.amount && (
                            <p className="text-xs text-gray-500">
                              {ingredient.amount} {ingredient.unit || ''}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex justify-between gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExtractedIngredients([]);
                        setSelectedIngredients(new Set());
                      }}
                      className="flex-1"
                    >
                      Annuleren
                    </Button>
                    <Button
                      onClick={addSelectedIngredients}
                      disabled={selectedIngredients.size === 0 || isAddingIngredients}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {isAddingIngredients ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Toevoegen...</span>
                        </div>
                      ) : (
                        "Toevoegen"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {!extractedIngredients.length && (
                <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">of voeg handmatig toe</span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Naam</Label>
                  <Input
                    id="name"
                    placeholder="Bijv. Melk"
                    value={newItem.name}
                        onChange={handleNameInputChange}
                        onBlur={handleNameInputBlur}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="flex items-center gap-2">
                    Categorie
                    <span className="text-xs text-gray-500 font-normal">(klik om zelf te kiezen)</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryScreen(true)}
                    className="flex items-center justify-between w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                  >
                    <span className="flex items-center gap-2">
                      <span>{categoryEmojis[newItem.category as Category]}</span>
                      <span>{newItem.category}</span>
                    </span>
                    <span className="text-xs text-gray-400 group-hover:text-gray-600">Wijzigen</span>
                  </button>
                </div>

                <AnimatePresence>
                  {showCategoryScreen && (
                    <CategorySelectionScreen
                      selectedCategory={newItem.category as Category}
                      onSelectCategory={async (category) => {
                        // First update the category immediately for UI responsiveness
                        onItemChangeRef.current({ ...newItem, category });
                        setShowCategoryScreen(false);

                        // Then regenerate the subcategory if we have a product name
                        if (newItem.name) {
                          setIsAIProcessing(true);
                          console.log('Starting subcategory regeneration for:', {
                            itemName: newItem.name,
                            newCategory: category,
                            previousCategory: newItem.category,
                            previousSubcategory: newItem.subcategory
                          });

                          try {
                            const subcategoryPrompt = `Given the Dutch grocery item "${newItem.name}" which belongs to the main category "${category}", determine:
                            1. The most appropriate subcategory from the list below
                            2. An appropriate emoji for this item

                            Return as JSON:
                            {
                              "subcategory": "subcategory name",
                              "emoji": "emoji"
                            }

                            Available subcategories for ${category}:
                            ${getSubcategoriesForMainCategory(category).join(', ')}`;

                            console.log('Sending subcategory prompt to AI:', subcategoryPrompt);

                            const subcategoryResult = await model.generateContent(subcategoryPrompt);
                            const subcategoryText = subcategoryResult.response.text().trim();
                            console.log('Received raw AI response:', subcategoryText);

                            const subcategoryData = JSON.parse(subcategoryText.replace(/```json\n?|\n?```/g, '').trim());
                            console.log('Parsed subcategory data:', subcategoryData);

                            // Update with new subcategory and emoji
                            const updatedItem = {
                              ...newItem,
                              category,
                              subcategory: subcategoryData.subcategory ?? null,
                              emoji: subcategoryData.emoji
                            };
                            console.log('Updating item with new data:', updatedItem);

                            onItemChangeRef.current(updatedItem);
                          } catch (error) {
                            console.error('Error regenerating subcategory:', error);
                            if (error instanceof Error) {
                              console.error('Error details:', {
                                message: error.message,
                                stack: error.stack
                              });
                            }
                            toast({
                              title: "Info",
                              description: "Kon geen subcategorie bepalen voor deze combinatie.",
                            });
                          } finally {
                            console.log('Finished subcategory regeneration process');
                            setIsAIProcessing(false);
                          }
                        } else {
                          console.log('Skipping subcategory regeneration - no item name provided');
                        }
                      }}
                      onBack={() => setShowCategoryScreen(false)}
                    />
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Hoeveelheid (optioneel)</Label>
                  <Input
                    id="quantity"
                    placeholder="Bijv. 2 pakken"
                    value={newItem.quantity}
                    onChange={(e) => onItemChangeRef.current({ ...newItem, quantity: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="priority" className="text-sm text-gray-700">
                    Prioriteit
                  </Label>
                  <Switch
                    id="priority"
                    checked={newItem.priority}
                    onCheckedChange={(checked) => onItemChangeRef.current({ ...newItem, priority: checked })}
                  />
                </div>

                <Button
                  onClick={handleButtonClick}
                  disabled={isAIProcessing || !newItem.name || isTyping}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-6"
                >
                  {isAIProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Categoriseren...</span>
                    </div>
                  ) : isTyping ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Wachten op invoer...</span>
                    </div>
                  ) : (
                    "Product Toevoegen"
                  )}
                </Button>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 