"use client"

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion'
import { Plus, Trash2, ChevronDown, ChevronUp, Camera } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { savedListsService } from '@/services/saved-lists-service'
import { useToast } from '@/components/ui/use-toast'
import { groceryService } from '@/services/grocery-service'
import { useHousehold } from '@/contexts/household-context'
import { useAuth } from '@/contexts/auth-context'
import { SavedList, SavedListItem } from '@/types/saved-list'
import { recipeVisionService } from '@/services/recipe-vision-service'
import { Category, categoryEmojis } from '@/constants/categories'
import { Button } from "@/components/ui/button"
import { aiService } from '@/services/ai-service'
import { Input } from "@/components/ui/input"

interface SavedListsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentItems: Array<{
    id: string;
    name: string;
    category: Category;
    quantity: string;
    emoji: string;
    priority: boolean;
    product_id?: string | undefined;
  }>;
}

interface ListWithItems extends SavedList {
  items?: SavedListItem[];
  isExpanded?: boolean;
}

interface ExtractedIngredient {
  id: string;
  name: string;
  amount?: string;
  unit?: string;
  category: Category;
  emoji: string;
}

export function SavedListsDrawer({ isOpen, onClose, currentItems }: SavedListsDrawerProps) {
  const [lists, setLists] = useState<ListWithItems[]>([]);
  const [selectedList, setSelectedList] = useState<ListWithItems | null>(null);
  const [, setIsDeletingList] = useState(false);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [extractedIngredients, setExtractedIngredients] = useState<ExtractedIngredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [isAddingIngredients, setIsAddingIngredients] = useState(false);
  const [isSavingCurrentList, setIsSavingCurrentList] = useState(false);
  const [newListName, setNewListName] = useState(`Lijst ${new Date().toLocaleDateString('nl-NL')}`);
  const [selectedCurrentItems, setSelectedCurrentItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { household } = useHousehold();
  const { user } = useAuth();

  // Load saved lists when drawer opens
  useEffect(() => {
    if (isOpen && household?.id) {
      savedListsService.getLists(household.id)
        .then(async loadedLists => {
          // Load items for each list
          const listsWithItems = await Promise.all(
            loadedLists.map(async list => {
              const items = await savedListsService.getListItems(list.id);
              return { ...list, items, isExpanded: false };
            })
          );
          setLists(listsWithItems);
        })
        .catch(error => {
          console.error('Error loading lists:', error);
          toast({
            title: "Fout",
            description: "Er ging iets mis bij het laden van de lijsten.",
            variant: "destructive"
          });
        });
    }
  }, [isOpen, household?.id, toast]);

  const handleAddToList = async (list: SavedList) => {
    if (!household?.id || !user) return;

    try {
      const items = await savedListsService.getListItems(list.id);
      for (const item of items) {
        await groceryService.addItem({
          name: item.name,
          category: item.category,
          subcategory: null,
          quantity: item.quantity,
          unit: '',
          emoji: item.emoji || '',
          priority: item.priority,
          product_id: item.product_id,
          user_id: user.id,
          user_name: user.user_metadata?.full_name || '',
          user_avatar: user.user_metadata?.avatar_url || '',
          household_id: household.id
        }, household.id);
      }

      toast({
        title: "Lijst toegevoegd",
        description: "De items zijn aan je boodschappenlijst toegevoegd.",
      });
      onClose();
    } catch (error) {
      console.error('Error adding list items:', error);
      toast({
        title: "Fout",
        description: "Er ging iets mis bij het toevoegen van de items.",
        variant: "destructive"
      });
    }
  };

  const toggleListExpansion = (listId: string) => {
    setLists(prevLists => 
      prevLists.map(list => 
        list.id === listId 
          ? { ...list, isExpanded: !list.isExpanded }
          : list
      )
    );
  };

  const handleDeleteList = async (list: SavedList) => {
    setIsDeletingList(true);

    try {
      await savedListsService.deleteList(list.id);
      setLists(lists.filter(l => l.id !== list.id));
      setSelectedList(null);
      
      toast({
        title: "Lijst verwijderd",
        description: "De opgeslagen lijst is verwijderd.",
      });
    } catch (error) {
      console.error('Error deleting list:', error);
      toast({
        title: "Fout",
        description: "Er ging iets mis bij het verwijderen van de lijst.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingList(false);
    }
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !household?.id || !user) return;

    setIsProcessingReceipt(true);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Extract ingredients using Vision API
          const ingredients = await recipeVisionService.extractIngredientsFromImage(reader.result as string);
          
          setExtractedIngredients(ingredients.map(ing => ({
            id: ing.id,
            name: ing.name,
            amount: ing.amount?.toString(),
            unit: ing.unit,
            category: ing.category as Category || 'Overig',
            emoji: categoryEmojis[ing.category as Category] || categoryEmojis['Overig']
          })));
          
          // Clear progress after a short delay
          setTimeout(() => setIsProcessingReceipt(false), 500);
        } catch (error) {
          console.error('Error processing receipt:', error);
          toast({
            title: "Fout bij verwerken",
            description: "Kon de items niet van de kassabon halen.",
            variant: "destructive"
          });
        } finally {
          setIsProcessingReceipt(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setIsProcessingReceipt(false);
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
    if (!household?.id || !user) return;
    setIsAddingIngredients(true);
    
    try {
      const selectedItems = await Promise.all(
        extractedIngredients
          .filter(ingredient => selectedIngredients.has(ingredient.id))
          .map(async ingredient => {
            // Get AI suggestions for the ingredient
            const aiSuggestion = await aiService.getItemSuggestions(ingredient.name);
            return {
              name: ingredient.name,
              category: aiSuggestion.category as Category,
              quantity: ingredient.amount ? `${ingredient.amount} ${ingredient.unit || ''}`.trim() : '',
              priority: false,
              emoji: aiSuggestion.emoji,
              product_id: null // Add required product_id field
            };
          })
      );

      // Create a new saved list with the selected items
      const newList = await savedListsService.createList({
        name: newListName,
        description: 'Gescand van kassabon',
        household_id: household.id,
        user_id: user.id,
        items: selectedItems
      });

      // Fetch the list with items to ensure correct types
      const items = await savedListsService.getListItems(newList.id);
      setLists(prevLists => [...prevLists, { ...newList, items, isExpanded: false }]);
      
      // Reset states
      setExtractedIngredients([]);
      setSelectedIngredients(new Set());
      setNewListName(`Kassabon ${new Date().toLocaleDateString('nl-NL')}`);
      
      toast({
        title: "Kassabon verwerkt",
        description: "De geselecteerde items zijn toegevoegd aan een nieuwe lijst.",
      });
    } catch (error) {
      console.error('Error adding ingredients:', error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er ging iets mis bij het toevoegen van de items.",
        variant: "destructive"
      });
    } finally {
      setIsAddingIngredients(false);
    }
  };

  const saveCurrentList = async () => {
    if (!household?.id || !user) return;
    setIsAddingIngredients(true);
    
    try {
      const selectedItems = currentItems
        .filter(item => selectedCurrentItems.has(item.id))
        .map(item => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          priority: item.priority,
          emoji: item.emoji,
          product_id: item.product_id || null
        }));

      // Create a new saved list with the selected items
      const newList = await savedListsService.createList({
        name: newListName,
        description: 'Opgeslagen van huidige lijst',
        household_id: household.id,
        user_id: user.id,
        items: selectedItems
      });

      // Fetch the list with items to ensure correct types
      const items = await savedListsService.getListItems(newList.id);
      setLists(prevLists => [...prevLists, { ...newList, items, isExpanded: false }]);
      
      // Reset states
      setIsSavingCurrentList(false);
      setSelectedCurrentItems(new Set());
      setNewListName(`Lijst ${new Date().toLocaleDateString('nl-NL')}`);
      
      toast({
        title: "Lijst opgeslagen",
        description: "De geselecteerde items zijn opgeslagen in een nieuwe lijst.",
      });
    } catch (error) {
      console.error('Error saving list:', error);
      toast({
        title: "Fout bij opslaan",
        description: "Er ging iets mis bij het opslaan van de lijst.",
        variant: "destructive"
      });
    } finally {
      setIsAddingIngredients(false);
    }
  };

  return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent>
        <ScrollArea className="h-[80vh]">
            <div className="container mx-auto max-w-md px-4">
              <div className="flex flex-col py-6">
              <div className="space-y-6">
                {/* Action Buttons */}
                {!extractedIngredients.length && !selectedList && !isSavingCurrentList && (
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                      onClick={() => setIsSavingCurrentList(true)}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 group transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                    <span className="text-sm text-gray-500 group-hover:text-gray-600">
                      Huidige lijst opslaan
                    </span>
                  </motion.button>

                    <div className="relative group">
                      <input
                        id="receipt-image"
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        disabled={isProcessingReceipt}
                        className="hidden"
                      />
                      {isProcessingReceipt ? (
                        <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/50">
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-blue-600">
                            Kassabon verwerken...
                          </span>
                        </div>
                      ) : (
                        <label
                          htmlFor="receipt-image"
                          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 group cursor-pointer transition-all duration-300"
                  >
                    <Camera className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                    <span className="text-sm text-gray-500 group-hover:text-gray-600">
                      Lijst van kassabon
                    </span>
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* Save Current List */}
                {isSavingCurrentList && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-700">Huidige lijst opslaan</h3>
                      <button
                        onClick={() => setSelectedCurrentItems(new Set(currentItems.map(item => item.id)))}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Selecteer alles
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Naam van de lijst
                        </label>
                        <Input
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          placeholder="Voer een naam in"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        {currentItems.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                              className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                            onClick={() => {
                              setSelectedCurrentItems(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(item.id)) {
                                  newSet.delete(item.id);
                                } else {
                                  newSet.add(item.id);
                                }
                                return newSet;
                              });
                            }}
                          >
                              <div className="flex items-center justify-center w-4 h-4 rounded-full border border-gray-300 bg-white mt-0.5">
                              {selectedCurrentItems.has(item.id) && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                    className="w-2.5 h-2.5 rounded-full bg-blue-500"
                                />
                              )}
                            </div>
                              <span className="text-base flex-shrink-0">{item.emoji}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 break-words line-clamp-2">
                                {item.name}
                              {item.quantity && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({item.quantity})
                                    </span>
                                  )}
                                </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsSavingCurrentList(false);
                          setSelectedCurrentItems(new Set());
                        }}
                        className="flex-1"
                      >
                        Annuleren
                      </Button>
                      <Button
                        onClick={saveCurrentList}
                        disabled={selectedCurrentItems.size === 0 || isAddingIngredients}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        {isAddingIngredients ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Opslaan...</span>
                          </div>
                        ) : (
                          "Opslaan"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Receipt Scanning */}
                {extractedIngredients.length > 0 && !selectedList && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-700">Gevonden Items</h3>
                      <button
                        onClick={() => setSelectedIngredients(new Set(extractedIngredients.map(ing => ing.id)))}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Selecteer alles
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Naam van de lijst
                        </label>
                        <Input
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          placeholder="Voer een naam in"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        {extractedIngredients.map((ingredient) => (
                          <motion.div
                            key={ingredient.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                              className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                            onClick={() => toggleIngredientSelection(ingredient.id)}
                          >
                              <div className="flex items-center justify-center w-4 h-4 rounded-full border border-gray-300 bg-white mt-0.5">
                              {selectedIngredients.has(ingredient.id) && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                    className="w-2.5 h-2.5 rounded-full bg-blue-500"
                                />
                              )}
                            </div>
                              <span className="text-base flex-shrink-0">{ingredient.emoji}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 break-words line-clamp-2">
                                {ingredient.name}
                              {ingredient.amount && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({ingredient.amount} {ingredient.unit || ''})
                                    </span>
                                  )}
                                </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
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

                {/* Lists Container */}
                {!extractedIngredients.length && !selectedList && !isSavingCurrentList && (
                    <div className="space-y-4">
                      {lists.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
                            <Plus className="h-8 w-8 text-blue-500" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Geen opgeslagen lijsten
                          </h3>
                          <p className="text-sm text-gray-500 max-w-[280px]">
                            Sla je huidige boodschappenlijst op om hem later opnieuw te gebruiken
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {lists.map((list) => (
                            <Card key={list.id} className="bg-white hover:shadow-md transition-all duration-300">
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-3">
                                      <div 
                                        className="flex-1 min-w-0 cursor-pointer"
                                        onClick={() => toggleListExpansion(list.id)}
                                      >
                                        <div className="flex items-center gap-2">
                                      <h3 className="font-medium text-gray-900 text-sm">{list.name}</h3>
                                          {list.isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-gray-400" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                          )}
                                        </div>
                                        {list.description && (
                                      <p className="text-xs text-gray-500 line-clamp-2">
                                            {list.description}
                                          </p>
                                        )}
                                      </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                          onClick={() => handleAddToList(list)}
                                      className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        >
                                          <Plus className="h-4 w-4" />
                                                </Button>
                                                <Button
                                      size="icon"
                                      variant="ghost"
                                                  onClick={() => handleDeleteList(list)}
                                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>

                                      {list.isExpanded && list.items && (
                                  <div className="mt-3 space-y-2 pt-3 border-t border-gray-100">
                                            {list.items.map((item) => (
                                              <div
                                                key={item.id}
                                        className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50"
                                      >
                                        <span className="text-base flex-shrink-0">{item.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-gray-700 break-words line-clamp-2">
                                            {item.name}
                                                {item.quantity && (
                                              <span className="text-xs text-gray-400 ml-1">
                                                ({item.quantity})
                                                  </span>
                                                )}
                                          </p>
                                        </div>
                                              </div>
                                            ))}
                                          </div>
                                      )}
                                  </div>
                                </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
            </div>
          </div>
        </ScrollArea>
        </DrawerContent>
      </Drawer>
  );
} 