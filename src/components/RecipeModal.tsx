import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Users, Plus, Check, Heart } from "lucide-react";
import type { Recipe, RecipeIngredient } from "@/types/recipe";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { groceryService } from "@/services/grocery-service";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import type { Category } from "@/constants/categories";

interface RecipeModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  householdId: string;
  isFavorite?: boolean;
  onToggleFavorite?: (recipe: Recipe) => Promise<boolean | null>;
}

// Add unit normalization helper
const normalizeUnit = (unit: string): string => {
  const unitMap: Record<string, string> = {
    'gram': 'g',
    'grams': 'g',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'liter': 'L',
    'liters': 'L',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'piece': 'st',
    'pieces': 'st',
    'tablespoon': 'el',
    'tablespoons': 'el',
    'teaspoon': 'tl',
    'teaspoons': 'tl',
    'cup': 'kopje',
    'cups': 'kopjes',
    '': 'st', // Default unit if empty
  };

  const normalizedUnit = unit.toLowerCase().trim();
  return unitMap[normalizedUnit] || unit;
};

// Update getInstructions function with proper typing
const getInstructions = (recipe: Recipe | null): { step: number; text: string }[] => {
  if (!recipe?.instructions) return [];
  
  return recipe.instructions.map((instruction: string, index: number) => ({
    step: index + 1,
    text: instruction
  }));
};

// Fix getIngredients return type
const getIngredients = (recipe: Recipe | null): RecipeIngredient[] => {
  if (!recipe?.ingredients) return [];
  return recipe.ingredients;
};

export function RecipeModal({ 
  recipe, 
  isOpen, 
  onClose, 
  isLoading,
  householdId,
  isFavorite: initialIsFavorite = false,
  onToggleFavorite
}: RecipeModalProps) {
  if (!recipe) return null;

  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
  const [addedIngredients, setAddedIngredients] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [addingIngredients, setAddingIngredients] = useState(false);
  const [processingIngredient, setProcessingIngredient] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const { toast } = useToast();

  // Update isFavorite when initialIsFavorite prop changes
  useEffect(() => {
    setIsFavorite(initialIsFavorite);
  }, [initialIsFavorite]);

  // Improved scroll handler with smooth transitions
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollPosition(scrollTop);
  };

  // Calculate header dimensions based on scroll position
  const headerHeight = Math.max(120, 320 - scrollPosition * 1.2);
  const imageOpacity = Math.max(0.3, 1 - (scrollPosition / 320));
  const titleScale = Math.max(0.8, 1 - (scrollPosition / 1000));
  const titleTranslateY = Math.min(0, -scrollPosition * 0.2);

  // Add type for nutrition keys
  type NutritionKey = keyof NonNullable<Recipe['nutrition']>;

  // Update getNutritionValue with proper typing and unit handling
  const getNutritionValue = (type: NutritionKey): string => {
    if (!recipe?.nutrition?.[type]) return '0g';
    const value = recipe.nutrition[type];
    return type === 'calories' ? `${value} kcal` : `${value}g`;
  };

  // Update the getIngredientEmoji function to be more specific to ingredients
  const getIngredientEmoji = (ingredient: RecipeIngredient): string => {
    const ingredientName = ingredient.name.toLowerCase();
    
    // Direct ingredient matches first
    const INGREDIENT_EMOJIS: Record<string, string> = {
      // Dairy / Zuivel
      'melk': '🥛',
      'yoghurt': '🫐',
      'kaas': '🧀',
      'boter': '🧈',
      'room': '🥛',
      
      // Vegetables / Groenten
      'ui': '🧅',
      'knoflook': '🧄',
      'tomaat': '🍅',
      'tomaten': '🍅',
      'wortel': '🥕',
      'wortels': '🥕',
      'paprika': '🫑',
      'sla': '🥬',
      'champignon': '🍄',
      'champignons': '🍄',
      'komkommer': '🥒',
      'courgette': '🥒',
      'broccoli': '🥦',
      'spinazie': '🥬',
      
      // Meat & Fish / Vlees & Vis
      'kip': '🍗',
      'kipfilet': '🍗',
      'gehakt': '🥩',
      'rundvlees': '🥩',
      'vis': '🐟',
      'zalm': '🐟',
      'tonijn': '🐟',
      'garnalen': '🦐',
      
      // Grains / Granen
      'rijst': '🍚',
      'pasta': '🍝',
      'noodles': '🍜',
      'brood': '🍞',
      'bloem': '🌾',
      
      // Fruits / Fruit
      'appel': '🍎',
      'banaan': '🍌',
      'citroen': '🍋',
      'limoen': '🫒',
      'sinaasappel': '🍊',
      
      // Condiments / Kruiden
      'zout': '🧂',
      'peper': '🌶️',
      'olie': '🫗',
      'sojasaus': '🥢',
      'azijn': '🫙',
      
      // Eggs / Eieren
      'ei': '🥚',
      'eieren': '🥚',
    };

    // Check for direct matches first
    for (const [key, emoji] of Object.entries(INGREDIENT_EMOJIS)) {
      if (ingredientName.includes(key)) {
        return emoji;
      }
    }

    // If no direct match, use category-based emoji
    const categoryMap: Record<string, string> = {
      'zuivel': '🥛',
      'groente': '🥬',
      'fruit': '🍎',
      'vlees': '🥩',
      'vis': '🐟',
      'graan': '🌾',
      'pasta': '🍝',
      'rijst': '🍚',
      'kruiden': '🌿',
      'saus': '🫙',
      'olie': '🫗',
      'specerijen': '🧂',
    };

    for (const [category, emoji] of Object.entries(categoryMap)) {
      if (ingredientName.includes(category)) {
        return emoji;
      }
    }

    // Default emoji if no match found
    return '🥄';
  };

  // Update handleAddToGroceryList function
  const handleAddToGroceryList = async (ingredient: RecipeIngredient) => {
    if (isProcessing || !householdId) return;
    setIsProcessing(ingredient.name);
    const ingredientId = getIngredientId(ingredient);
    setProcessingIngredient(ingredientId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      const quantity = `${ingredient.amount} ${normalizeUnit(ingredient.unit)}`;
      const item = {
        name: ingredient.name,
        quantity: quantity,
        category: ingredient.category as Category,
        emoji: ingredient.emoji,
        priority: false,
        completed: false,
        user_id: user.id,
        user_name: profile?.full_name || user.email,
        user_avatar: profile?.avatar_url || null,
        subcategory: null,
        unit: normalizeUnit(ingredient.unit),
        household_id: householdId
      };

      await groceryService.addItem(item, householdId);
      setAddedIngredients((prev) => [...prev, ingredientId]);
      toast({
        title: "Toegevoegd aan boodschappenlijst",
        description: `${ingredient.name} is toegevoegd aan je boodschappenlijst.`,
      });
    } catch (error) {
      console.error('Error adding ingredient to grocery list:', error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er ging iets mis bij het toevoegen aan je boodschappenlijst.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
      setProcessingIngredient(null);
    }
  };

  // Add helper function to get ingredient ID
  const getIngredientId = (ingredient: RecipeIngredient): string => {
    return `${ingredient.name}-${ingredient.amount}-${ingredient.unit}`;
  };

  // Update handleAddAllToGroceryList function
  const handleAddAllToGroceryList = async () => {
    if (addingIngredients || !recipe) return;
    setAddingIngredients(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      const ingredients = getIngredients(recipe);
      for (const ingredient of ingredients) {
        const quantity = `${ingredient.amount} ${normalizeUnit(ingredient.unit)}`;
        const item = {
          name: ingredient.name,
          quantity: quantity,
          category: ingredient.category as Category,
          emoji: ingredient.emoji,
          priority: false,
          completed: false,
          user_id: user.id,
          user_name: profile?.full_name || user.email,
          user_avatar: profile?.avatar_url || null,
          subcategory: null,
          unit: normalizeUnit(ingredient.unit),
          household_id: householdId
        };
        
        await groceryService.addItem(item, householdId);
        setAddedIngredients((prev) => [...prev, getIngredientId(ingredient)]);
      }

      toast({
        title: "Alle ingrediënten toegevoegd",
        description: "Alle ingrediënten zijn toegevoegd aan je boodschappenlijst.",
      });
    } catch (error) {
      console.error('Error adding all ingredients to grocery list:', error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er ging iets mis bij het toevoegen aan je boodschappenlijst.",
        variant: "destructive",
      });
    } finally {
      setAddingIngredients(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!recipe || isTogglingFavorite) return;
    
    setIsTogglingFavorite(true);
    try {
      if (onToggleFavorite) {
        const result = await onToggleFavorite(recipe);
        if (result !== null) {
          setIsFavorite(result);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Update the useEffect for real-time favorite status
  useEffect(() => {
    const checkInitialFavoriteStatus = async () => {
      if (!recipe || !isOpen) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', user.id)
          .eq('recipe_id', recipe.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking favorite status:', error);
          return;
        }

        setIsFavorite(!!data);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    // Create a separate async function for setting up subscription
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !recipe) return;

      const channel = supabase
        .channel(`favorites_changes_${recipe.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'favorites',
            filter: `user_id=eq.${user.id} AND recipe_id=eq.${recipe.id}`
          },
          async () => {
            checkInitialFavoriteStatus();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    let cleanup: (() => void) | undefined;

    // Execute both async operations
    const initialize = async () => {
      await checkInitialFavoriteStatus();
      cleanup = await setupSubscription();
    };

    initialize();

    // Return cleanup function
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [recipe, isOpen]);

  // Add loading state to the UI where needed
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto h-[100vh] p-0 overflow-hidden bg-white">
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto h-[100vh] p-0 overflow-hidden bg-white">
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <motion.button
            onClick={handleToggleFavorite}
            className={cn(
              "p-2 rounded-xl backdrop-blur-sm transition-colors",
              isFavorite 
                ? "bg-red-50 hover:bg-red-100" 
                : "bg-white/80 hover:bg-white/90",
              isTogglingFavorite && "opacity-50 cursor-not-allowed"
            )}
            disabled={isTogglingFavorite}
            whileTap={{ scale: isTogglingFavorite ? 1 : 0.95 }}
          >
            <AnimatePresence mode="wait">
              {isTogglingFavorite ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-5 h-5"
                >
                  <div className="w-full h-full border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                </motion.div>
              ) : (
                <motion.div
                  key="heart"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Heart 
                    className={cn(
                      "w-5 h-5 transition-all duration-300",
                      isFavorite 
                        ? "fill-red-500 text-red-500 scale-110" 
                        : "text-gray-600 hover:text-red-500 hover:scale-110"
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Smooth animated header */}
        <motion.div 
          className="relative z-10"
          style={{ 
            height: headerHeight,
            transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <motion.div
            className="absolute inset-0 w-full"
            style={{ 
              opacity: imageOpacity,
              transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <img 
              src={recipe?.image} 
              alt={recipe?.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </motion.div>

          {/* Recipe title and metadata with smooth scaling */}
          <motion.div 
            className="absolute bottom-0 left-0 right-0 p-6 text-white"
            style={{ 
              transform: `scale(${titleScale}) translateY(${titleTranslateY}px)`,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transformOrigin: 'left bottom'
            }}
          >
            <h2 className="text-2xl font-bold mb-2 text-white/95">{recipe?.title}</h2>
            <div className="flex gap-4 text-white/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-sm">{recipe?.readyInMinutes} min</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-sm">
                  {recipe?.servings ? `${recipe.servings} personen` : '0 personen'}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Modern nutrition cards */}
        {recipe?.nutrition && (
          <div className="px-6 -mt-6 mb-4 relative z-20">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'calories', label: 'Calorieën', icon: '🔥' },
                { key: 'protein', label: 'Eiwitten', icon: '🥩' },
                { key: 'carbs', label: 'Koolhydraten', icon: '🌾' },
                { key: 'fat', label: 'Vetten', icon: '🥑' }
              ].map(({ key, label, icon }) => (
                <motion.div
                  key={key}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                      <span className="text-lg">{icon}</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">
                        {label}
                      </div>
                      <div className="text-sm font-semibold text-gray-800">
                        {getNutritionValue(key as keyof typeof recipe.nutrition)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Modern tab buttons */}
        <div className="flex gap-2 px-6 mb-2">
          {['ingredients', 'instructions'].map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab as 'ingredients' | 'instructions')}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              {tab === 'ingredients' ? '👩‍🍳 Ingrediënten' : '📝 Bereiding'}
            </motion.button>
          ))}
        </div>

        {/* Content area */}
        <div 
          className="px-6 py-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
          onScroll={handleScroll}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'ingredients' ? (
              <motion.div
                key="ingredients"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <Button
                  onClick={handleAddAllToGroceryList}
                  disabled={addingIngredients}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-2.5"
                >
                  {addingIngredients ? "Bezig met toevoegen..." : "Voeg alles toe"}
                </Button>

                <div className="space-y-2">
                  {getIngredients(recipe).map((ingredient) => {
                    const ingredientId = getIngredientId(ingredient);
                    const isAdded = addedIngredients.includes(ingredientId);
                    const isProcessing = processingIngredient === ingredientId;
                    const ingredientEmoji = getIngredientEmoji(ingredient);
                    
                    return (
                      <motion.div
                        key={ingredientId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl shadow-sm">
                            {ingredientEmoji}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              {typeof ingredient.name === 'string' ? ingredient.name : 'Onbekend ingredient'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {ingredient.amount} {ingredient.unit}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToGroceryList(ingredient);
                          }}
                          disabled={isAdded || isProcessing}
                          className={cn(
                            "h-8 w-8",
                            isAdded && "text-green-500 hover:text-green-600",
                            !isAdded && "text-blue-500 hover:text-blue-600"
                          )}
                        >
                          {isProcessing ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              ⏳
                            </motion.div>
                          ) : isAdded ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="instructions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {getInstructions(recipe).map((instruction, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: index * 0.05 }
                    }}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      {instruction.step}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed flex-1">{instruction.text}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
} 