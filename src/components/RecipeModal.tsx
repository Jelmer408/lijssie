import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Recipe, RecipeIngredient } from '@/types/recipe';
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GroceryItem } from "@/types/grocery";
import { groceryService } from "@/services/grocery-service";
import { useToast } from "@/components/ui/use-toast";
import { Category } from "@/constants/categories";

interface RecipeModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  isFavorite: boolean;
  onToggleFavorite: (recipe: Recipe) => Promise<boolean | null>;
}

export function RecipeModal({ recipe, isOpen, onClose, householdId, isFavorite, onToggleFavorite }: RecipeModalProps) {
  const { toast } = useToast();

  // If no recipe, don't render the modal content
  if (!recipe) {
    return null;
  }

  const handleAddIngredient = async (ingredient: RecipeIngredient) => {
    if (!householdId) return;

    try {
      const newItem: Omit<GroceryItem, 'id' | 'created_at'> = {
        name: ingredient.name,
        quantity: `${ingredient.amount} ${ingredient.unit}`,
        category: ingredient.category as Category,
        emoji: ingredient.emoji,
        priority: false,
        completed: false,
        household_id: householdId,
        user_id: '',
        user_name: null,
        user_avatar: null
      };

      await groceryService.addItem(newItem, householdId);

      toast({
        title: "Ingredient toegevoegd",
        description: `${ingredient.name} is toegevoegd aan je lijst.`,
      });
    } catch (error) {
      console.error('Error adding ingredient:', error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er ging iets mis bij het toevoegen van het ingredient.",
        variant: "destructive"
      });
    }
  };

  const handleAddAllIngredients = async () => {
    if (!householdId) return;

    try {
      for (const ingredient of recipe.ingredients) {
        const newItem: Omit<GroceryItem, 'id' | 'created_at'> = {
          name: ingredient.name,
          quantity: `${ingredient.amount} ${ingredient.unit}`,
          category: ingredient.category as Category,
          emoji: ingredient.emoji,
          priority: false,
          completed: false,
          household_id: householdId,
          user_id: '',
          user_name: null,
          user_avatar: null
        };

        await groceryService.addItem(newItem, householdId);
      }

      toast({
        title: "Ingrediënten toegevoegd",
        description: `Alle ingrediënten zijn toegevoegd aan je lijst.`,
      });
    } catch (error) {
      console.error('Error adding ingredients:', error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er ging iets mis bij het toevoegen van de ingrediënten.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white rounded-3xl border border-gray-100 shadow-xl p-0 overflow-hidden">
        {/* Recipe Image */}
        <div className="relative w-full h-48 sm:h-64 bg-gray-100">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Favorite button */}
          <motion.button
            onClick={() => onToggleFavorite(recipe)}
            className={cn(
              "absolute top-4 left-4 p-2 rounded-full transition-colors",
              isFavorite 
                ? "bg-red-500 text-white hover:bg-red-600" 
                : "bg-black/20 hover:bg-black/30 text-white"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Heart className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
          </motion.button>

          {/* Recipe title */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-2xl font-bold text-white">{recipe.title}</h2>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-white/90">⏱️</span>
                <span className="text-sm text-white/90">{recipe.readyInMinutes}m</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-white/90">👥</span>
                <span className="text-sm text-white/90">{recipe.servings} personen</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recipe content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {recipe.description && (
            <p className="text-gray-600">{recipe.description}</p>
          )}

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ingrediënten</h3>
              <Button
                onClick={handleAddAllIngredients}
                variant="outline"
                className="text-sm"
              >
                Voeg alles toe
              </Button>
            </div>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient) => (
                <motion.li
                  key={ingredient.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{ingredient.emoji}</span>
                    <span className="text-gray-700">{ingredient.name}</span>
                    <span className="text-sm text-gray-500">
                      {ingredient.amount} {ingredient.unit}
                    </span>
                  </div>
                  <Button
                    onClick={() => handleAddIngredient(ingredient)}
                    variant="ghost"
                    className="h-8 px-3"
                  >
                    Toevoegen
                  </Button>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bereiding</h3>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction: string, index: number) => (
                <li key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <p className="text-gray-600 flex-1">{instruction}</p>
                </li>
              ))}
            </ol>
        </div>

          {/* Nutrition */}
          {recipe.nutrition && (
                          <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Voedingswaarden</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-green-50">
                  <div className="text-sm text-green-600 font-medium">Calorieën</div>
                  <div className="text-xl font-semibold text-green-700">{recipe.nutrition.calories} kcal</div>
                            </div>
                <div className="p-4 rounded-xl bg-blue-50">
                  <div className="text-sm text-blue-600 font-medium">Eiwitten</div>
                  <div className="text-xl font-semibold text-blue-700">{recipe.nutrition.protein}g</div>
                            </div>
                <div className="p-4 rounded-xl bg-yellow-50">
                  <div className="text-sm text-yellow-600 font-medium">Koolhydraten</div>
                  <div className="text-xl font-semibold text-yellow-700">{recipe.nutrition.carbs}g</div>
                          </div>
                <div className="p-4 rounded-xl bg-red-50">
                  <div className="text-sm text-red-600 font-medium">Vetten</div>
                  <div className="text-xl font-semibold text-red-700">{recipe.nutrition.fat}g</div>
                </div>
              </div>
                    </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 