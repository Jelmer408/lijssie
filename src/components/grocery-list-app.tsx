import { useState, useEffect, useCallback } from 'react'
import { Plus, X, GripVertical, ArrowUpDown, Upload, Clock, Users, Heart, List } from 'lucide-react'
import { motion, AnimatePresence, PanInfo, Reorder } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { groceryService } from '@/services/grocery-service'
import { useAuth } from '@/contexts/auth-context'
import { useHousehold } from '@/contexts/household-context'
import { GroceryItem, CreateGroceryItem, NewItemState } from '@/types/grocery'
import { format, addDays } from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import { storeStatusService } from '@/services/store-status-service';
import { StoreStatus } from '@/types/store-status';
import { categoryService } from '@/services/category-service';
import { CATEGORIES, Category, categoryEmojis } from '@/constants/categories';
import { useToast } from "@/components/ui/use-toast"
import { recipeVisionService } from '@/services/recipe-vision-service';
import { RecipeIngredient } from '@/types/recipe';
import { mealService } from '@/services/meal-service';
import { MealProposal } from '@/types/meal';
import { supabase } from '@/lib/supabase';
import { RecipeModal } from "@/components/RecipeModal";
import { Recipe } from '@/types/recipe';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import * as offlineStore from '@/lib/offline-store';
import { SavedListsDrawer } from '@/components/saved-lists';
import { PreferencesModal } from '@/components/predictions';
import { SalesLayout } from './sales/SalesLayout';
import { SupermarketStories } from '@/components/supermarket-stories/supermarket-stories';
import { AddProductDrawer } from './add-product-drawer';
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { FinanceView } from '@/components/finance';
import { addGroceryItem, updateGroceryItem } from '../services/grocery-items-service';

const defaultCategory: Category = 'Overig';

interface DayScheduleItem {
  id: string;
  user_id: string;
  is_present: boolean;
  date: string;
  created_at: string;
  user_name: string | null;
  user_avatar: string | null;
}




function SwipeableItem({ 
  item, 
  onRemove, 
  onToggle 
}: { 
  item: GroceryItem; 
  onRemove: (id: string) => void;
  onToggle: (id: string, completed: boolean) => void;
}) {
  const swipeConfidenceThreshold = 10000;
  const swipeThreshold = 50;

  const determineSwipeAction = (offset: number, velocity: number) => {
    const swipe = Math.abs(offset) * velocity;
    return swipe > swipeConfidenceThreshold || Math.abs(offset) > swipeThreshold;
  };

  return (
    <motion.li 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (determineSwipeAction(info.offset.x, info.velocity.x)) {
          onRemove(item.id);
        }
      }}
      onClick={() => onToggle(item.id, item.completed)}
      className="relative flex flex-col py-1.5 border-b border-gray-100 last:border-b-0 group cursor-pointer hover:bg-gray-50/50 transition-colors duration-200"
      whileDrag={{ scale: 1.02 }}
    >
      <motion.div 
        className="absolute right-0 top-0 bottom-0 w-full bg-red-500/10 rounded-xl"
        initial={{ opacity: 0 }}
        whileDrag={{ opacity: 1 }}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm">
          <div 
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
              item.completed 
                ? "bg-blue-500 border-blue-500" 
                : "border-gray-300 hover:border-blue-500"
            )}
          >
            {item.completed && (
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
          <span className={cn(
            "text-gray-600 group-hover:text-gray-800 transition-all duration-300 ease-in-out flex items-center gap-1.5",
            item.completed && "line-through text-gray-400"
          )}>
            {item.emoji} {item.name}
            {item.quantity && (
              <span className="text-xs text-gray-400">
                ({item.quantity})
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Priority Badge */}
          {item.priority && (
            <motion.span 
              className="text-[10px] bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded-full shadow-sm"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              !
            </motion.span>
          )}
          
          {/* User Avatar */}
          {item.user_avatar ? (
            <img
              src={item.user_avatar}
              alt={item.user_name || 'User'}
              className="w-5 h-5 rounded-full border border-gray-200 shadow-sm object-cover"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-[10px] font-medium text-blue-600">
                {item.user_name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sales Data */}
      {item.current_price && item.original_price && (
        <div className="flex items-center gap-2 mt-1 ml-6">
          {/* Supermarket Logo */}
          {item.supermarket && (
            <div className="w-4 h-4 rounded-full bg-white border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
              <img
                src={`/supermarkets/${item.supermarket.toLowerCase()}-logo.png`}
                alt={item.supermarket}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs line-through text-gray-400">{item.original_price}</span>
            <span className="text-xs font-medium text-green-600">{item.current_price}</span>
            {item.sale_type && (
              <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full">
                {item.sale_type}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.li>
  );
}

interface TimerState {
  [key: string]: {
    remainingMinutes: number;
    remainingSeconds: number;
  };
}

// Add a type guard function to ensure user has required properties
function ensureUser(user: User | null): User & { email: string } {
  if (!user) throw new Error('No user found');
  if (!user.email) throw new Error('User has no email');
  return user as User & { email: string };
}

export function GroceryListAppComponent() {
  // 1. First, declare all context hooks
  const { user } = useAuth();
  const navigate = useNavigate();
  const { household, members, refetch: refetchHousehold } = useHousehold();
  const { toast } = useToast();

  // 2. All useState hooks
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);
  const [items, setItems] = useState<GroceryItem[]>([]);
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
    household_id: household?.id || ''
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [storeStatuses, setStoreStatuses] = useState<StoreStatus[]>([]);
  const [timers, setTimers] = useState<TimerState>({});
  const [orderedCategories, setOrderedCategories] = useState<string[]>([...CATEGORIES]);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [extractedIngredients, setExtractedIngredients] = useState<RecipeIngredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [isAddingIngredients, setIsAddingIngredients] = useState(false);
  const [daySchedule, setDaySchedule] = useState<DayScheduleItem[]>([]);
  const [mealProposals, setMealProposals] = useState<MealProposal[]>([]);
  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState(false);
  const [newMeal, setNewMeal] = useState({
    name: '',
    description: '',
    emoji: '🍽️'
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRecipeProposal, setSelectedRecipeProposal] = useState<MealProposal | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [proposalToDelete, setProposalToDelete] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'meals' | 'koken' | 'trends' | 'finance'>('list');
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState("Kopieer");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [, setIsManageHouseholdOpen] = useState(false);
  const [isSavedListsOpen, setIsSavedListsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [optimalStores, setOptimalStores] = useState<{ stores: string[]; totalPrice: number } | null>(null);
  const [isAddProductDrawerOpen, setIsAddProductDrawerOpen] = useState(false);

  // 3. Define all callback functions used in hooks
  const fetchDaySchedule = useCallback(async () => {
    if (!household?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('day_schedule')
        .select('*')
        .eq('household_id', household.id);
      
      if (error) throw error;
      setDaySchedule(data);
    } catch (error) {
      console.error('Error fetching day schedule:', error);
    }
  }, [household?.id]);

  const refreshAllData = useCallback(async () => {
    if (!household?.id || isSyncing) return;

    setIsSyncing(true);
    try {
      await refetchHousehold();
      await fetchDaySchedule();

      const [activeItems, completedItems] = await Promise.all([
        groceryService.getActiveItems(household.id),
        groceryService.getCompletedItemsFromToday(household.id)
      ]);
      setItems([...activeItems, ...completedItems]);

      const currentStatus = await storeStatusService.getCurrentStatus(household.id);
      setStoreStatuses(currentStatus);

      const { data: categoryOrder } = await supabase
        .from('category_order')
        .select('*')
        .eq('household_id', household.id)
        .single();
      if (categoryOrder) {
        setOrderedCategories(categoryOrder.order);
      }

      if (activeView === 'meals') {
        const { data: proposals } = await supabase
          .from('meal_proposals')
          .select('*')
          .order('created_at', { ascending: false });
        if (proposals) {
          setMealProposals(proposals);
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [household?.id, isSyncing, refetchHousehold, activeView, fetchDaySchedule]);

  // 4. All useEffect hooks
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAllData();
      }
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshAllData);
    window.addEventListener('online', refreshAllData);

    // Set up periodic refresh
    let refreshInterval: number | undefined;
    
    function startPeriodicRefresh() {
      if (document.visibilityState === 'visible') {
        refreshInterval = window.setInterval(() => {
          refreshAllData();
        }, 5 * 60 * 1000); // Refresh every 5 minutes when visible
      }
    }

    function stopPeriodicRefresh() {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = undefined;
      }
    }

    // Start periodic refresh initially if visible
    startPeriodicRefresh();

    // Update periodic refresh on visibility change
    const visibilityChangeHandler = () => {
      if (document.visibilityState === 'visible') {
        startPeriodicRefresh();
      } else {
        stopPeriodicRefresh();
      }
    };
    document.addEventListener('visibilitychange', visibilityChangeHandler);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('visibilitychange', visibilityChangeHandler);
      window.removeEventListener('focus', refreshAllData);
      window.removeEventListener('online', refreshAllData);
      stopPeriodicRefresh();
    };
  }, [household?.id, refreshAllData]); // Add refreshAllData to dependencies

  // 5. All useEffect hooks
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
        // Remove splash screen after membership check is complete
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
    let unsubscribe: (() => void) | undefined;

  const loadItems = async () => {
    if (!household?.id) return;

    try {
        // Initial load of items
      const [activeItems, completedItems] = await Promise.all([
        groceryService.getActiveItems(household.id),
        groceryService.getCompletedItemsFromToday(household.id)
      ]);
      setItems([...activeItems, ...completedItems]);

        // Set up real-time subscription
        const subscription = groceryService.subscribeToChanges(async () => {
          // Reload items when changes occur
          const [newActiveItems, newCompletedItems] = await Promise.all([
            groceryService.getActiveItems(household.id),
            groceryService.getCompletedItemsFromToday(household.id)
          ]);
          setItems([...newActiveItems, ...newCompletedItems]);
        }, household.id);

        unsubscribe = subscription.unsubscribe;
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

    loadItems();

    // Cleanup subscription on unmount or when household changes
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [household?.id]);

  // Add a debug effect to monitor items state
  useEffect(() => {
    console.log('Items state updated:', {
      itemCount: items.length,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        completed: item.completed
      }))
    });
  }, [items]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

  const setupSubscription = async () => {
    if (!household?.id) return;

    try {
        unsubscribe = storeStatusService.subscribeToStatus(
        household.id,
        (statuses) => {
          setStoreStatuses(statuses);
        }
      );

        // Initial status fetch with household ID
      const initialStatus = await storeStatusService.getCurrentStatus(household.id);
      setStoreStatuses(initialStatus);
    } catch (error) {
      console.error('Error setting up store status subscription:', error);
    }
  };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [household?.id]);

  useEffect(() => {
    const walkingStatuses = storeStatuses.filter(status => status.status === 'walking');
    if (walkingStatuses.length === 0) {
      setTimers({});
      return;
    }

    const initialTimers: TimerState = {};
    walkingStatuses.forEach(status => {
      const startTime = new Date(status.created_at);
      const targetTime = new Date(startTime.getTime() + status.arrival_time * 60 * 1000);
      const now = new Date();
      const remainingMs = targetTime.getTime() - now.getTime();
      
      if (remainingMs <= 0) {
        // Auto transition to in_store if timer expired
        if (status.user_id === user?.id && household?.id) {
          updateStoreStatus('in_store', 0);
        }
        return;
      }

      const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
      const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);

      initialTimers[status.user_id] = {
        remainingMinutes,
        remainingSeconds
      };
    });
    
    setTimers(initialTimers);

    const interval = setInterval(() => {
      setTimers(prevTimers => {
        const newTimers: TimerState = {};
        let hasActiveTimers = false;

        Object.entries(prevTimers).forEach(([userId, timer]) => {
          if (timer.remainingMinutes <= 0 && timer.remainingSeconds <= 0) {
            // Auto transition to in_store if timer expired
            if (userId === user?.id) {
              updateStoreStatus('in_store', 0);
            }
            return;
          }

          hasActiveTimers = true;
          if (timer.remainingSeconds > 0) {
            newTimers[userId] = {
              remainingMinutes: timer.remainingMinutes,
              remainingSeconds: timer.remainingSeconds - 1
            };
          } else {
            newTimers[userId] = {
              remainingMinutes: timer.remainingMinutes - 1,
              remainingSeconds: 59
            };
          }
        });

        return hasActiveTimers ? newTimers : {};
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [storeStatuses, user, household?.id]);

  // 6. Fix getAISuggestions function

  // 7. Fix addItem function to clear suggestion state
  const addItem = async (itemToAdd: NewItemState | Omit<GroceryItem, 'id' | 'created_at'>) => {
    if (!household?.id || !user) return;

    try {
      const newItem: CreateGroceryItem = {
        name: itemToAdd.name,
        category: itemToAdd.category,
        quantity: itemToAdd.quantity,
        priority: itemToAdd.priority,
        emoji: itemToAdd.emoji || '📦', // Provide default emoji
        unit: itemToAdd.unit || '',
        subcategory: itemToAdd.subcategory,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || null,
        user_avatar: user.user_metadata?.avatar_url || null,
        household_id: household.id
      };

      await addGroceryItem(newItem);
      
      // Reset form if it's a new item
      if ('name' in itemToAdd && !('household_id' in itemToAdd)) {
        setNewItem({
          name: '',
          quantity: '',
          unit: '',
          category: defaultCategory,
          subcategory: null,
          priority: false,
          emoji: '📦',
          user_id: user.id,
          user_name: user.user_metadata?.name || null,
          user_avatar: user.user_metadata?.avatar_url || null,
          household_id: household.id
        });
        setIsDialogOpen(false);
      }

      toast({
        title: "Product toegevoegd",
        description: `${newItem.name} is toegevoegd aan je lijst.`,
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er ging iets mis bij het toevoegen van het product.",
        variant: "destructive"
      });
    }
  };

  // Update toggleItemCompletion to use updateGroceryItem
  const toggleItemCompletion = async (id: string, currentlyCompleted: boolean) => {
    try {
      await updateGroceryItem(id, {
        completed: !currentlyCompleted
      });
    } catch (error) {
      console.error('Error toggling item completion:', error);
    }
  };

  const removeItem = async (id: string) => {
    try {
      await groceryService.deleteItem(id);
    } catch (error) {
      console.error('Error removing item:', error);
      // If error occurs, refetch to restore correct state
      if (household?.id) {
        const [activeItems, completedItems] = await Promise.all([
          groceryService.getActiveItems(household.id),
          groceryService.getCompletedItemsFromToday(household.id)
        ]);
        setItems([...activeItems, ...completedItems]);
      }
    }
  };

  const activeItems = items.filter(item => !item.completed)
  const purchasedItems = items.filter(item => item.completed)
  const priorityItems = items.filter(item => item.priority)

  const handleButtonClick = async () => {
    if (!user?.id || !household?.id) return;
    
    const currentStatus = storeStatuses.find(status => status.user_id === user.id)?.status || 'inactive';
    const currentUser = ensureUser(user);
    
    switch (currentStatus) {
      case 'inactive':
        setShowTimeDialog(true);
        break;
      case 'walking':
        await storeStatusService.updateStatus({
          user_id: currentUser.id,
          user_name: currentUser.user_metadata?.full_name || 'Anonymous',
          status: 'in_store',
          arrival_time: 0
        }, household.id);
        break;
      case 'in_store':
        await storeStatusService.updateStatus({
          user_id: currentUser.id,
          user_name: currentUser.user_metadata?.full_name || 'Anonymous',
          status: 'inactive',
          arrival_time: 0
        }, household.id);
        break;
    }
  };

  const handleStartWalking = async (minutes: number) => {
    try {
      if (!user || !household?.id) return;
      const currentUser = ensureUser(user);
      
      setShowTimeDialog(false);
      
      const currentStatus = storeStatuses.find(status => status.user_id === currentUser.id)?.status || 'inactive';
      if (currentStatus !== 'inactive') return;
      
      await storeStatusService.updateStatus({
        user_id: currentUser.id,
        user_name: currentUser.user_metadata?.full_name || 'Anonymous',
        status: 'walking',
        arrival_time: minutes
      }, household.id);

      setTimeout(async () => {
        const statusBeforeTransition = storeStatuses.find(status => status.user_id === currentUser.id)?.status;
        if (statusBeforeTransition === 'walking') {
          await storeStatusService.updateStatus({
            user_id: currentUser.id,
            user_name: currentUser.user_metadata?.full_name || 'Anonymous',
            status: 'in_store',
            arrival_time: 0
          }, household.id);
        }
      }, minutes * 60 * 1000);
    } catch (error) {
      console.error('Error in handleStartWalking:', error);
    }
  };

  const updateStoreStatus = async (status: 'walking' | 'in_store' | 'inactive', arrivalTime = 0) => {
    if (!user || !household?.id) return;

    try {
      const currentUser = ensureUser(user);

      await storeStatusService.updateStatus({
        user_id: currentUser.id,
        user_name: currentUser.user_metadata?.full_name || 'Anonymous',
        status,
        arrival_time: arrivalTime
      }, household.id);
    } catch (error) {
      console.error('Error updating store status:', error);
    }
  };

  // Updated quantity input handler

  useEffect(() => {
    // Add fetchSchedule to the initial data loading
    const loadInitialData = async () => {
      try {
        // Remove fetchHistory call
        // await fetchHistory();
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);

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

  // Fix the addSelectedIngredients function
  const addSelectedIngredients = async () => {
    if (!household?.id || !user) return;
    
    setIsAddingIngredients(true);
    
    try {
      const selectedItems: CreateGroceryItem[] = extractedIngredients
        .filter(ing => selectedIngredients.has(ing.id))
        .map(ing => ({
          name: ing.name,
          category: ing.category as Category,
          quantity: String(ing.amount || '1'),
          priority: false,
          emoji: categoryEmojis[ing.category as Category] || categoryEmojis['Overig'],
          completed: false,
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
          user_avatar: user.user_metadata?.avatar_url || null,
          household_id: household.id,
          // Add all required fields with defaults
          unit: 'st',
          subcategory: null,
          supermarket: null,
          current_price: null,
          original_price: null,
          sale_type: null,
          valid_until: null,
          image_url: null,
          product_url: null,
          stores: [],
          is_deleted: false
        }));

      for (const item of selectedItems) {
        await groceryService.addItem(item, household.id);
      }
      
      setIsUploadModalOpen(false);
      setSelectedIngredients(new Set());
      setExtractedIngredients([]);
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

  // Instead, use the browser's crypto API
  const generateUUID = () => {
    return window.crypto.randomUUID();
  };

  const handlePresenceToggle = async (dateStr: string, isPresent: boolean) => {
    if (!household?.id) return;

    try {
      await mealService.updatePresence(dateStr, isPresent, household.id);
      
      // Optionally update local state if needed
      setDaySchedule(prev => {
        const newSchedule = [...prev];
        const existingIndex = newSchedule.findIndex(
          item => item.user_id === user?.id && item.date === dateStr
        );
        
        if (existingIndex !== -1) {
          newSchedule[existingIndex] = {
            ...newSchedule[existingIndex],
            is_present: isPresent
          };
        } else if (user) {
          newSchedule.push({
            id: generateUUID(),
            user_id: user.id,
            date: dateStr,
            is_present: isPresent,
            created_at: new Date().toISOString(),
            user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            user_avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture
          });
        }
        
        return newSchedule;
      });
    } catch (error) {
      console.error('Error updating presence:', error);
      toast({
        title: "Fout",
        description: "Kon aanwezigheid niet bijwerken",
        variant: "destructive"
      });
    }
  };

  // Update the useEffect for meal proposals
  useEffect(() => {
    if (!household?.id) return;

    // Initial fetch
    const fetchProposals = async () => {
      try {
        const { data } = await supabase
          .from('meal_proposals')
          .select('*')
          .eq('household_id', household.id)
          .order('created_at', { ascending: false });
        
        setMealProposals(data || []);
      } catch (error) {
        console.error('Error fetching meal proposals:', error);
      }
    };

    fetchProposals();

    // Real-time subscription
    const channel = supabase
      .channel('meal_proposals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_proposals',
          filter: `household_id=eq.${household.id}`
        },
        (payload) => {
          console.log('Meal proposal change detected:', payload);
          
          // Update state based on the type of change
          if (payload.eventType === 'DELETE') {
            setMealProposals(prev => prev.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === 'INSERT') {
            const newProposal = payload.new as MealProposal;
            setMealProposals(prev => [newProposal, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedProposal = payload.new as MealProposal;
            setMealProposals(prev => prev.map(p => 
              p.id === updatedProposal.id ? updatedProposal : p
            ));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [household?.id]);

  // Update handleAddMealProposal to include all required fields
  const handleAddMealProposal = async () => {
    if (!household?.id || !user) return;

    try {
      const proposal = await mealService.addProposal({
        name: newMeal.name,
        description: newMeal.description || '',
        emoji: newMeal.emoji || '🍽️',
        date: selectedDate || format(new Date(), 'yyyy-MM-dd'),
        is_recipe: false,
        recipe: undefined,
        created_by: user.id,  // Add missing property
        household_id: household.id  // Add missing property
      }, household.id);

      // Send notification using the edge function
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          title: '🍽️ Nieuw maaltijdvoorstel',
          message: `${user.user_metadata?.full_name || user.email?.split('@')[0]} heeft ${newMeal.name} voorgesteld`,
          data: {
            type: 'meal_proposal',
            proposalId: proposal.id,
            householdId: household.id
          }
        })
      });

      setIsAddMealModalOpen(false);
      setNewMeal({
        name: '',
        description: '',
        emoji: '🍽️'
      });
      setSelectedDate(null);

      toast({
        title: "Voorstel toegevoegd",
        description: "Je maaltijdvoorstel is succesvol toegevoegd.",
      });
    } catch (error) {
      console.error('Error adding meal proposal:', error);
      toast({
        title: "Fout",
        description: "Kon het maaltijdvoorstel niet toevoegen.",
        variant: "destructive",
      });
    }
  };

  // Add this function to handle votes
  const handleVote = async (proposalId: string) => {
    if (!household?.id || !user?.id) return;

    try {
      await mealService.updateVotes(proposalId, user.id, household.id);
      // Optimistic update
      setMealProposals(prev => prev.map(proposal => {
        if (proposal.id === proposalId) {
          const hasVoted = proposal.votes.includes(user.id);
          const newVotes = hasVoted
            ? proposal.votes.filter(id => id !== user.id)
            : [...proposal.votes, user.id];
          return { ...proposal, votes: newVotes };
        }
        return proposal;
      }));
    } catch (error) {
      console.error('Error updating vote:', error);
      // Revert optimistic update on error
      const { data } = await supabase
        .from('meal_proposals')
        .select('*')
        .order('created_at', { ascending: false });
      setMealProposals(data || []);

      toast({
        title: "Error",
        description: "Could not update vote",
        variant: "destructive",
      });
    }
  };

  // Update handleAddRecipeProposal to handle type conversion
  const handleAddRecipeProposal = async (recipe: Recipe) => {
    if (!household?.id || !user) return;

    try {
      const mealServiceRecipe = {
        ...recipe,
        id: String(recipe.id),
        title: recipe.title,
        description: recipe.description || '',
        readyInMinutes: recipe.readyInMinutes,
        servings: recipe.servings,
        image: recipe.image,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions.map((text, index) => ({
          step: index + 1,
          text
        })),
        nutrition: recipe.nutrition ? {
          calories: Number(recipe.nutrition.calories),
          protein: Number(recipe.nutrition.protein),
          carbs: Number(recipe.nutrition.carbs),
          fat: Number(recipe.nutrition.fat)
        } : undefined
      };

      const proposalDate = selectedDate || format(new Date(), 'yyyy-MM-dd');
      const dayName = new Date(proposalDate).toLocaleDateString('nl-NL', { weekday: 'long' });

      const proposal = await mealService.addRecipeProposal(
        mealServiceRecipe,
        proposalDate,
        user.id,
        household.id
      );

      // Get all users in the household
      const { data: householdMembers, error: membersError } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', household.id);

      if (membersError) throw membersError;

      // Only send notification if we found household members
      if (householdMembers && householdMembers.length > 0) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            household_id: household.id,
            user_id: user.id,
            title: '👩‍🍳 Nieuw receptvoorstel',
            message: `${user.user_metadata?.full_name || user.email?.split('@')[0]} heeft ${recipe.title} voorgesteld voor ${dayName}`,
            data: {
              type: 'recipe_proposal',
              proposalId: proposal.id,
              householdId: household.id,
              recipeId: recipe.id,
              household_members: householdMembers.map(member => member.user_id)
            }
          })
        });
      }

      setIsAddMealModalOpen(false);
      setSelectedRecipe(null);
      setSelectedDate(null);

      toast({
        title: "Recept voorgesteld",
        description: "Je receptvoorstel is succesvol toegevoegd.",
      });
    } catch (error) {
      console.error('Error adding recipe proposal:', error);
      toast({
        title: "Er ging iets mis",
        description: "Het recept kon niet worden voorgesteld. Probeer het later opnieuw.",
        variant: "destructive"
      });
    }
  };

  // Add this function to handle deletion
  const handleDeleteProposal = async (proposalId: string) => {
    if (!household?.id) return;

    try {
      const { error } = await supabase
        .from('meal_proposals')
        .delete()
        .eq('id', proposalId)
        .eq('household_id', household.id); // Add household check for safety

      if (error) throw error;

      // Optimistically update the UI
      setMealProposals(prev => prev.filter(p => p.id !== proposalId));
      setProposalToDelete(null);

      toast({
        title: "Voorstel verwijderd",
        description: "Het maaltijdvoorstel is succesvol verwijderd.",
      });
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast({
        title: "Fout",
        description: "Kon het voorstel niet verwijderen.",
        variant: "destructive",
      });
    }
  };

  // Update the getWinningProposal helper function near the top of the component
  const getWinningProposal = (proposals: MealProposal[]) => {
    if (!proposals.length) return null;
    const maxVotes = Math.max(...proposals.map(p => p.votes?.length || 0));
    // Return null if no votes at all
    if (maxVotes === 0) return null;
    return proposals.reduce((prev, current) => 
      (current.votes?.length || 0) > (prev.votes?.length || 0) ? current : prev
    );
  };

  // Add this useEffect to fetch favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const { data } = await supabase
          .from('favorites')
          .select('recipe_id, recipe')  // Add recipe to the selection
          .eq('user_id', user.id);
        
        if (data) {
          const favMap = data.reduce((acc, fav) => ({
            ...acc,
            [fav.recipe_id]: true
          }), {} as Record<string, boolean>);
          setFavorites(favMap);

          // Update recipes state with the favorite recipes
          const favoriteRecipes = data
            .filter(fav => fav.recipe)
            .map(fav => fav.recipe as Recipe);
          setRecipes(favoriteRecipes);
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    };

    fetchFavorites();

    // Subscribe to changes with more specific filters
    const channel = supabase
      .channel('favorites_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${user?.id}`  // Add filter for current user
        },
        () => {
          fetchFavorites();  // Refetch all favorites when any change occurs
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]); // Add user?.id as dependency

  useEffect(() => {
    if (household?.id) {
      groceryService.getActiveItems(household.id);
      storeStatusService.getCurrentStatus(household.id);
    }
  }, [household?.id]);

  // Update the sync mechanism
  useEffect(() => {
    async function syncOfflineChanges() {
      if (!household?.id) return;

      try {
        const pendingChanges = await offlineStore.getPendingChanges();
        if (pendingChanges.length === 0) return;

        // Group changes by type for batch processing
        const changesByType = pendingChanges.reduce((acc, change) => {
          if (!acc[change.type]) acc[change.type] = [];
          acc[change.type].push(change);
          return acc;
        }, {} as Record<string, typeof pendingChanges>);

        const successfulChanges = [];
        const failedChanges = [];

        // Process each type of change in batches
        for (const [type, changes] of Object.entries(changesByType)) {
          try {
            switch (type) {
              case 'add':
                const { error: addError } = await supabase
                  .from('grocery_items')
                  .insert(changes.map(c => c.item))
                  .select();
                
                if (addError) throw addError;
                successfulChanges.push(...changes);
                break;

              case 'update':
                // Use Promise.all for parallel processing of updates
                await Promise.all(
                  changes.map(async (change) => {
                    try {
                      const { error: updateError } = await supabase
                        .from('grocery_items')
                        .update(change.item)
                        .eq('id', change.item.id);
                      
                      if (updateError) throw updateError;
                      successfulChanges.push(change);
                    } catch (error) {
                      console.error('Error processing update:', error);
                      failedChanges.push(change);
                    }
                  })
                );
                break;

              case 'delete':
                const { error: deleteError } = await supabase
                  .from('grocery_items')
                  .delete()
                  .in('id', changes.map(c => c.item.id));
                
                if (deleteError) throw deleteError;
                successfulChanges.push(...changes);
                break;
            }
          } catch (error) {
            console.error(`Error processing ${type} changes:`, error);
            failedChanges.push(...changes);
          }
        }

        // Clear successful changes and keep failed ones for retry
        if (successfulChanges.length > 0) {
          await offlineStore.clearProcessedChanges();
        }

        if (failedChanges.length > 0) {
          console.warn('Some changes failed to sync:', failedChanges.length);
          // Retry failed changes after a short delay
          setTimeout(() => syncOfflineChanges(), 5000);
        }

        // Refresh the list after syncing
        if (successfulChanges.length > 0 && household?.id) {
          await groceryService.getActiveItems(household.id);
        }
      } catch (error) {
        console.error('Error syncing offline changes:', error);
      }
    }

    function handleOnline() {
      setIsOnline(true);
      syncOfflineChanges();
      toast({
        title: "Online",
        description: "Je bent weer online. Wijzigingen worden gesynchroniseerd.",
      });
    }

    function handleOffline() {
      setIsOnline(false);
      toast({
        title: "Offline",
        description: "Je bent offline. Wijzigingen worden opgeslagen en later gesynchroniseerd.",
      });
    }

    // Add event listeners for online/offline status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [household?.id, toast]);

  // 8. Loading state check - AFTER all hooks are declared
  if (isCheckingMembership) {
    // Keep the splash screen visible while checking membership
    return null;
  }

  // Update the handleToggleFavorite function
  const handleToggleFavorite = async (recipe: Recipe): Promise<boolean | null> => {
    if (!user?.id || !household?.id) return null;

    try {
      // Check if recipe is already favorited
      const { data: existingFavorite } = await supabase
        .from('favorites')
        .select()
        .eq('user_id', user.id)
        .eq('recipe_id', recipe.id)
        .maybeSingle();

      if (existingFavorite) {
        // Remove from favorites
        const { error: deleteError } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipe.id);

        if (deleteError) throw deleteError;

        setFavorites(prev => {
          const newFavorites = { ...prev };
          delete newFavorites[recipe.id];
          return newFavorites;
        });

        return false;
      } else {
        // Add to favorites
        const { error: insertError } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            recipe_id: recipe.id,
            recipe: {
              id: recipe.id,
              title: recipe.title,
              description: recipe.description || '',
              image: recipe.image || '',
              readyInMinutes: recipe.readyInMinutes || 0,
              servings: recipe.servings || 0,
              ingredients: recipe.ingredients || [],
              instructions: recipe.instructions || [],
              nutrition: recipe.nutrition || null
            }
          });

        if (insertError) throw insertError;

        setFavorites(prev => ({
          ...prev,
          [recipe.id]: true
        }));

        return true;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return null;
    }
  };

  // Add this mapping function before the return statement
  const mapItemsForSavedList = (items: GroceryItem[]) => {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity || '',
      emoji: item.emoji || '',  // Ensure emoji is never undefined
      priority: Boolean(item.priority)  // Convert to boolean
    }));
  };

  // Add useEffect to calculate optimal stores when items change
  useEffect(() => {
    async function calculateOptimalStores() {
      if (!household?.id || !items.length) {
        setOptimalStores(null);
        return;
      }

      try {
        const result = await groceryService.calculateOptimalStores(items, household.id);
        setOptimalStores(result);
      } catch (error) {
        console.error('Error calculating optimal stores:', error);
        setOptimalStores(null);
      }
    }

    calculateOptimalStores();
  }, [items, household?.id]);

  // Define handlers
  const handleItemChange = (item: NewItemState) => {
    setNewItem({
      ...item,
      emoji: item.emoji || '📦',
      user_id: user?.id || '',
      user_name: user?.user_metadata?.name || null,
      user_avatar: user?.user_metadata?.avatar_url || null,
      household_id: household?.id || ''
    });
  };

  const handleAddItem = (item: NewItemState) => {
    if (!household?.id) return;
    void addItem({
      ...item,
      user_id: user?.id || '',
      user_name: user?.user_metadata?.name || null,
      user_avatar: user?.user_metadata?.avatar_url || null,
      household_id: household.id
    });
    setIsAddProductDrawerOpen(false);
  };

  // Update the useEffect that uses fetchDaySchedule
  useEffect(() => {
    // Initial fetch
    if (household?.id) {
      fetchDaySchedule();

      // Add real-time subscription for day schedule changes
      const channel = supabase
        .channel('day_schedule_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'day_schedule',
            filter: `household_id=eq.${household.id}`
          },
          () => {
            // Reload day schedule when changes occur
            fetchDaySchedule();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [household?.id, fetchDaySchedule]); // Add fetchDaySchedule to dependencies

  return (
    <>
        <div className="max-w-md mx-auto min-h-screen pb-24 bg-gradient-to-b from-gray-50 to-white text-gray-800 font-sans">
          <motion.header 
            className="sticky top-0 z-40 px-4 sm:px-6 pt-1 mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 bg-white/30 backdrop-blur-xl -z-10" />
            
            {!isOnline && (
              <div className="mb-1 px-3 py-1 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-700 flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                Offline modus - wijzigingen worden later gesynchroniseerd
              </div>
            )}
            
            <div className="flex flex-col space-y-2 p-2 sm:p-3 rounded-3xl border border-gray-100/20 shadow-lg bg-gradient-to-r from-blue-500/5 to-blue-600/5">
              <div className="flex items-center justify-between px-3 pt-4 pb-2">
                <div className="flex items-center gap-3">
                  <Dialog open={isHouseholdModalOpen} onOpenChange={setIsHouseholdModalOpen}>
                    <DialogTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center relative"
                      >
                        {user?.user_metadata?.avatar_url ? (
                          <>
                            <img
                              src={user.user_metadata.avatar_url}
                              alt={user.user_metadata?.full_name || 'User'}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                className="w-3 h-3 text-gray-500"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {user?.user_metadata?.full_name?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                className="w-3 h-3 text-gray-500"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </motion.button>
                    </DialogTrigger>
                  </Dialog>
                  <div className="flex flex-col">
                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                      {household?.name || 'Boodschappen'}
                    </h1>
                    {activeView === 'finance' && (
                      <p className="text-sm text-gray-500">
                        Huishoudboekje & Verrekeningen
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  {/* Add Product/Expense Button */}
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative group"
                        onClick={(e) => {
                          if (activeView === 'finance') {
                            e.preventDefault();
                            setIsAddExpenseOpen(true);
                          }
                        }}
                      >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full blur opacity-30 group-hover:opacity-75 transition duration-300" />
                        <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-full shadow-lg transition-all duration-300">
                          <Plus className="h-4 w-4 text-white" />
                        </div>
                      </motion.button>
                    </DialogTrigger>
                    {activeView !== 'finance' && (
                      <AddProductDrawer
                        isOpen={isDialogOpen}
                        onClose={() => setIsDialogOpen(false)}
                        onOpenUploadModal={() => setIsUploadModalOpen(true)}
                        newItem={newItem}
                        onItemChange={handleItemChange}
                        onAddItem={handleAddItem}
                        householdId={household?.id || ''}
                      />
                    )}
                  </Dialog>
                </div>
              </div>

              {activeView === 'list' && (
                <motion.div 
                  className="grid grid-cols-3 gap-2 sm:gap-3"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex flex-col items-center p-1.5 sm:p-2 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100/20 shadow-sm">
                    <span className="text-xs text-gray-500">Te Kopen</span>
                    <span className="text-lg sm:text-xl font-semibold text-blue-600">{activeItems.length}</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 sm:p-2 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100/20 shadow-sm">
                    <span className="text-xs text-gray-500">Gekocht</span>
                    <span className="text-lg sm:text-xl font-semibold text-green-600">
                      {purchasedItems.filter(item => {
                        if (!item.updated_at) return false;
                        const itemDate = new Date(item.updated_at);
                        const today = new Date();
                        return itemDate.toDateString() === today.toDateString();
                      }).length}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 sm:p-2 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100/20 shadow-sm">
                    <span className="text-xs text-gray-500">Prioriteit</span>
                    <span className="text-lg sm:text-xl font-semibold text-red-600">{priorityItems.length}</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Add Optimal Stores Display */}
            {optimalStores && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 border border-green-100 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Beste Combinatie</h3>
                    <span className="text-sm font-medium text-green-600">
                      € {optimalStores.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {optimalStores.stores.map((store) => (
                      <div
                        key={store}
                        className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white border border-green-100"
                      >
                        <div className="w-4 h-4 rounded-full bg-white border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
                          <img
                            src={`/supermarkets/${store.toLowerCase()}-logo.png`}
                            alt={store}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-xs text-gray-600">{store}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.header>





          <div className="pb-24">
            {activeView === 'list' ? (
              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="px-4">
                  {/* Time Selection and Content Container */}
                  <div className="relative">
                    {false && (storeStatuses.find(status => status.user_id === user?.id)?.status === 'walking' ? (
                      <motion.button
                        onClick={() => updateStoreStatus('in_store')}
                        className="relative w-full group overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-500"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"
                          animate={{ 
                            opacity: [0.5, 0.3, 0.5],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="relative flex items-center justify-center gap-3 py-3.5 px-4">
                          <motion.span 
                            className="text-xl"
                            animate={{ y: [0, -2, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            🏃
                          </motion.span>
                          <span className="text-white font-medium">Onderweg naar de winkel!</span>
                        </div>
                      </motion.button>
                    ) : storeStatuses.find(status => status.user_id === user?.id)?.status === 'in_store' ? (
                      <motion.button
                        onClick={() => updateStoreStatus('inactive')}
                        className="relative w-full group overflow-hidden rounded-xl bg-gradient-to-r from-green-500 to-emerald-500"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20"
                          animate={{ 
                            opacity: [0.5, 0.3, 0.5],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="relative flex items-center justify-center gap-3 py-3.5 px-4">
                          <motion.span 
                            className="text-xl"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            🛒
                          </motion.span>
                          <span className="text-white font-medium">Aan het winkelen!</span>
                        </div>
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={handleButtonClick}
                        className="relative w-full group overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-500"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={showTimeDialog}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"
                          animate={{ 
                            opacity: [0.5, 0.3, 0.5],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="relative flex items-center justify-center gap-3 py-3.5 px-4">
                          <motion.span 
                            className="text-xl"
                            animate={{ y: showTimeDialog ? -2 : 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            🏃
                          </motion.span>
                          <span className="text-white font-medium">Naar de supermarkt!</span>
                        </div>
                      </motion.button>
                    ))}

                    {/* Time Selection Dialog remains unchanged */}
                    {showTimeDialog && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ 
                          height: "auto", 
                          opacity: 1,
                          marginTop: 8,
                          transition: {
                            height: { duration: 0.3 },
                            opacity: { duration: 0.2, delay: 0.1 },
                            marginTop: { duration: 0.3 }
                          }
                        }}
                        exit={{ 
                          height: 0, 
                          opacity: 0,
                          marginTop: 0,
                          transition: {
                            height: { duration: 0.3 },
                            opacity: { duration: 0.2 },
                            marginTop: { duration: 0.3 }
                          }
                        }}
                        className="overflow-hidden"
                      >
                        <motion.div
                          initial={{ y: -10 }}
                          animate={{ y: 0 }}
                          exit={{ y: -10 }}
                          className="bg-white rounded-xl shadow-lg border border-blue-100/50"
                        >
                          <div className="p-4 space-y-4">
                            <h3 className="text-base font-medium text-gray-700">
                              Over hoeveel minuten ben je er?
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                              {[5, 10, 15].map((minutes) => (
                                <motion.button
                                  key={minutes}
                                  onClick={() => handleStartWalking(minutes)}
                                  className="relative group overflow-hidden"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <div className="relative py-2.5 px-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50">
                                    <motion.div
                                      className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-lg opacity-0 group-hover:opacity-100"
                                      initial={false}
                                      animate={{ opacity: [0.5, 0.3, 0.5] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <span className="relative text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                                      {minutes} min
                                    </span>
                                  </div>
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </div>

                  {/* Store Status Display - Will be pushed down by the time selection */}
                  {storeStatuses.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                      className="mt-4"
                    >
                      {storeStatuses.map((status) => (
                        <div key={status.id}>
                          {/* Status Card */}
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                              "relative overflow-hidden backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl",
                              status.status === 'walking' 
                                ? "bg-gradient-to-br from-blue-500/10 to-blue-600/5" 
                                : "bg-gradient-to-br from-green-500/10 to-green-600/5"
                            )}
                          >
                            {/* Animated background gradient */}
                            <motion.div
                              className={cn(
                                "absolute inset-0 opacity-30",
                                status.status === 'walking' 
                                  ? "bg-gradient-to-r from-blue-400/20 to-purple-400/20" 
                                  : "bg-gradient-to-r from-green-400/20 to-emerald-400/20"
                              )}
                              animate={{ 
                                backgroundPosition: ['0% 0%', '100% 100%'],
                                opacity: [0.3, 0.15, 0.3] 
                              }}
                              transition={{ 
                                duration: 5, 
                                repeat: Infinity,
                                repeatType: "reverse" 
                              }}
                            />

                            {/* Card Content */}
                            <div className="relative p-6">
                              <div className="flex items-center gap-5">
                                {/* Left side - User icon and info */}
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <div className={cn(
                                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                                      status.status === 'walking'
                                        ? "bg-gradient-to-br from-blue-100 to-blue-50"
                                        : "bg-gradient-to-br from-green-100 to-green-50"
                                    )}>
                                      <motion.div
                                        animate={status.status === 'walking' ? {
                                          y: [-2, 2],
                                          x: [-1, 1]
                                        } : undefined}
                                        transition={{ 
                                          repeat: Infinity,
                                          repeatType: "reverse",
                                          duration: 0.5 
                                        }}
                                      >
                                        <img 
                                          src={status.status === 'walking' ? "/animated-man-running.gif" : "/supermarket.png"}
                                          alt={status.status === 'walking' ? "Running man" : "Store"}
                                          className="w-10 h-10 object-contain mix-blend-multiply"
                                        />
                                      </motion.div>
                                    </div>
                                    {/* Glowing effect */}
                                    <motion.div
                                      className={cn(
                                        "absolute -inset-1 rounded-3xl blur-xl z-0",
                                        status.status === 'walking' ? "bg-blue-400/20" : "bg-green-400/20"
                                      )}
                                      animate={{ opacity: [0.2, 0.4, 0.2] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    />
                                  </div>

                                  <div className="flex flex-col">
                                    <h3 className="font-semibold text-gray-800 text-lg">
                                      {status.user_name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                      <motion.div 
                                        className={cn(
                                          "h-1.5 w-1.5 rounded-full",
                                          status.status === 'walking' 
                                            ? "bg-blue-500" 
                                            : "bg-green-500"
                                        )}
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                      />
                                      <p className="text-gray-500 text-sm">
                                        {status.status === 'walking' 
                                          ? "is onderweg naar de winkel"
                                          : "is in de winkel"}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Right side - Timer or Status */}
                                {status.status === 'walking' && (
                                  <div className="ml-auto flex flex-col items-end">
                                    <div className={cn(
                                      "px-4 py-2 rounded-xl backdrop-blur-sm",
                                      "bg-gradient-to-r from-blue-500/10 to-blue-600/10",
                                      "border border-blue-500/20"
                                    )}>
                                      {timers[status.user_id] ? (
                                        <div className="flex items-center gap-2">
                                          <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                            className="w-2 h-2 rounded-full bg-blue-500"
                                          />
                                          <p className="font-mono text-blue-600 font-medium tracking-tight">
                                            {String(timers[status.user_id].remainingMinutes).padStart(2, '0')}:
                                            {String(timers[status.user_id].remainingSeconds).padStart(2, '0')}
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="font-mono text-blue-600 font-medium">
                                          {String(status.arrival_time).padStart(2, '0')}:00
                                        </p>
                                      )}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-2 w-32">
                                      <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
                                        <motion.div
                                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                                          initial={{ width: "0%" }}
                                          animate={{ 
                                            width: timers[status.user_id] 
                                              ? `${((status.arrival_time * 60 - (timers[status.user_id].remainingMinutes * 60 + timers[status.user_id].remainingSeconds)) / (status.arrival_time * 60)) * 100}%`
                                              : "0%" 
                                          }}
                                          transition={{ duration: 0.5 }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>

                <div className="space-y-4 px-4">
                  {/* Add buttons container with flex justify-between */}
                  <div className="flex items-center justify-between">
                    {/* Save List Button on the left */}
                    <motion.button
                      onClick={() => setIsSavedListsOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm bg-gray-50 text-gray-400 hover:text-gray-600 transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <List className="h-4 w-4" />
                      <span>Lijsten</span>
                    </motion.button>

                    {/* Reorder mode toggle button on the right */}
                    <motion.button
                      onClick={() => setIsReorderMode(!isReorderMode)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all duration-300",
                        isReorderMode 
                          ? "bg-blue-100 text-blue-600" 
                          : "bg-gray-50 text-gray-400 hover:text-gray-600"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      <span>{isReorderMode ? 'Klaar met ordenen' : 'Volgorde'}</span>
                    </motion.button>
                  </div>

                  <Reorder.Group 
                    axis="y" 
                    values={orderedCategories} 
                    onReorder={async (newOrder) => {
                      if (!isReorderMode) return;
                      
                      // Only update if the order actually changed
                      if (JSON.stringify(newOrder) !== JSON.stringify(orderedCategories)) {
                      setOrderedCategories(newOrder);
                      try {
                        await categoryService.updateCategoryOrder(newOrder);
                      } catch (error) {
                        console.error('Error saving category order:', error);
                          // Revert on error
                          setOrderedCategories(orderedCategories);
                        }
                      }
                    }}
                    className={cn(
                      "space-y-4",
                      isReorderMode && "touch-none"
                    )}
                  >
                    {orderedCategories.map((category) => {
                      const categoryItems = activeItems.filter(item => item.category === category);
                      if (categoryItems.length === 0) return null;
                      
                      return (
                        <Reorder.Item
                          key={category}
                          value={category}
                          dragListener={isReorderMode}
                          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100"
                          onPointerDown={(e: React.PointerEvent) => {
                            if (isReorderMode) {
                              e.stopPropagation();
                              e.preventDefault();
                            }
                          }}
                          onTouchStart={(e: React.TouchEvent) => {
                            if (isReorderMode) {
                              e.stopPropagation();
                            }
                          }}
                          drag={isReorderMode}
                        >
                          <div className={cn(
                            "py-1.5 px-2.5 flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl transition-colors duration-200",
                            isReorderMode && "cursor-grab active:cursor-grabbing hover:bg-gray-100/50"
                          )}>
                            {isReorderMode && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <GripVertical className="h-3.5 w-3.5" />
                              </div>
                            )}
                            <h2 className="text-base font-semibold text-gray-700 flex items-center gap-1.5">
                              {categoryEmojis[category as Category] || categoryEmojis['Overig']} {category}
                            </h2>
                          </div>
                          
                          <div 
                            className={cn(
                              "relative",
                              isReorderMode && "pointer-events-none"
                            )}
                          >
                            <ul className="space-y-3 p-4">
                              <AnimatePresence>
                                {categoryItems.map((item) => (
                                  <SwipeableItem
                                    key={item.id}
                                    item={item}
                                    onRemove={removeItem}
                                    onToggle={toggleItemCompletion}
                                  />
                                ))}
                              </AnimatePresence>
                            </ul>
                          </div>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                </div>

                {/* Purchased Items Section */}
                {purchasedItems
                  .filter(item => {
                    if (!item.updated_at) return false;
                    const itemDate = new Date(item.updated_at);
                    const today = new Date();
                    return itemDate.toDateString() === today.toDateString();
                  })
                  .length > 0 && (
                  <motion.div 
                    className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-gray-100 mt-8 mx-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center bg-green-50 rounded-full">
                          ✓
                        </span>
                        Vandaag gekocht
                      </h2>
                    </div>
                    <ul className="space-y-1">
                      <AnimatePresence>
                        {purchasedItems
                          .filter(item => {
                            if (!item.updated_at) return false;
                            const itemDate = new Date(item.updated_at);
                            const today = new Date();
                            return itemDate.toDateString() === today.toDateString();
                          })
                          .map((item) => (
                          <motion.li 
                            key={item.id} 
                            onClick={() => toggleItemCompletion(item.id, item.completed)}
                            className="group relative overflow-hidden"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors duration-200">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-lg flex-shrink-0">{item.emoji}</span>
                                <div className="flex items-center gap-1.5 text-sm">
                                  <span className={cn(
                                    "text-gray-600 group-hover:text-gray-800 transition-all duration-300 ease-in-out flex items-center gap-1.5"
                                  )}>
                                    {item.name}
                                  </span>
                                  {item.quantity && (
                                    <span className="text-xs text-gray-400">
                                      ({item.quantity})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center">
                                {item.priority && (
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-50 flex items-center justify-center">
                                    <span className="text-[10px] font-medium text-red-600">!</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </motion.div>
                )}

                {/* Add credits at the bottom of the list view */}
                <div className="px-4 flex justify-center">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="group relative mt-8 w-fit"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <a
                      href="https://www.instagram.com/jelmer_hb/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <motion.div 
                        animate={{ rotate: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-2xl"
                      >
                        ✨
                      </motion.div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-600">Gemaakt met ❤️ door</span>
                        <span className="font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-center">
                          @jelmer_hb
                        </span>
                      </div>
                    </a>
                  </motion.div>
                </div>
              </motion.div>
            ) : activeView === 'meals' ? (
              <motion.div 
                className="space-y-4 px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-700">Maaltijden Deze Week</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Modify the date calculation to start from current day instead of start of week */}
                    {[...Array(7)].map((_: undefined, index: number) => {
                      const date = addDays(new Date(), index);
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const dayProposals = mealProposals.filter(proposal => proposal.date === dateStr);
                      
                      return (
                        <div key={dateStr} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-600">
                                {format(date, 'EEEE', { locale: nl })}
                              </span>
                              <span className="text-xs text-gray-400">
                                {format(date, 'd MMMM', { locale: nl })}
                              </span>
                            </div>
                            
                            {/* Add presence toggle */}
                            <Button
                              onClick={() => handlePresenceToggle(dateStr, !daySchedule.find(item => 
                                item.user_id === user?.id && 
                                item.date === dateStr
                              )?.is_present)}
                              variant="ghost"
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300",
                                daySchedule.find(item => 
                                  item.user_id === user?.id && 
                                  item.date === dateStr
                                )?.is_present
                                  ? "bg-green-50 text-green-600 hover:bg-green-100"
                                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              )}
                            >
                              {daySchedule.find(item => 
                                item.user_id === user?.id && 
                                item.date === dateStr
                              )?.is_present ? (
                                <>
                                  <span className="text-lg">✓</span>
                                  <span className="text-sm font-medium">Aanwezig</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  <span className="text-sm font-medium">Deelnemen</span>
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Show present users */}
                          {daySchedule.filter(item => item.date === dateStr && item.is_present).length > 0 && (
                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-100">
                              <span className="text-sm text-gray-600 font-medium">Aanwezig:</span>
                              <div className="flex items-center -space-x-2">
                                {daySchedule
                                  .filter(item => item.date === dateStr && item.is_present)
                                  .map(item => (
                                    <div
                                      key={item.user_id}
                                      className="relative w-7 h-7 rounded-full border-2 border-white shadow-sm group"
                                      title={item.user_name || 'User'}
                                    >
                                      {item.user_avatar ? (
                                        <img
                                          src={item.user_avatar}
                                          alt={item.user_name || 'User'}
                                          className="w-full h-full rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-sm">
                                          {item.user_name?.[0]?.toUpperCase() || '👤'}
                                        </div>
                                      )}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                                        {item.user_name || 'User'}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {dayProposals.length > 0 ? (
                            <div className="space-y-4">
                              {/* Existing proposals */}
                              <div className="space-y-2">
                                {dayProposals.map((proposal) => {
                                  const isWinner = getWinningProposal(dayProposals)?.id === proposal.id;
                                  
                                  return (
                                    <motion.div
                                      key={proposal.id}
                                      className={cn(
                                        "group relative overflow-hidden flex items-center justify-between p-2.5 rounded-xl bg-white transition-all duration-300",
                                        proposal.votes.length === Math.max(...dayProposals.map(p => p.votes.length)) && proposal.votes.length > 0
                                          ? "border-0 before:absolute before:inset-0 before:-z-10 before:rounded-xl before:p-[2px] before:bg-gradient-to-r before:from-blue-400 before:via-blue-500 before:to-blue-600"
                                          : "border border-gray-100 hover:border-blue-200"
                                      )}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                    >
                                      <div 
                                        className={cn(
                                          "flex items-center gap-2.5 flex-1 min-w-0",
                                          proposal.is_recipe && "cursor-pointer"
                                        )}
                                        onClick={() => {
                                          if (proposal.is_recipe && proposal.recipe) {
                                            setSelectedRecipeProposal(proposal);
                                          }
                                        }}
                                      >
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-lg flex-shrink-0">
                                          {proposal.emoji}
                                        </div>
                                      
                                        <div className="flex flex-col gap-1 min-w-0">
                                          {isWinner && (
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                                              <span>👑</span>
                                              <span>Meeste stemmen</span>
                                            </div>
                                          )}
                                          <span className="font-medium text-sm text-gray-900 truncate">
                                            {proposal.name}
                                          </span>
                                          {proposal.is_recipe && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 flex-shrink-0 w-fit">
                                              Recept
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {proposal.created_by === user?.id && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-gray-400 hover:text-red-500 h-7 w-7"
                                            onClick={() => setProposalToDelete(proposal.id)}
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                        <Button
                                          onClick={() => handleVote(proposal.id)}
                                          variant="ghost"
                                          size="sm"
                                          className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-300 h-7",
                                            proposal.votes.includes(user?.id || '') 
                                              ? "bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700" 
                                              : "hover:bg-blue-50 hover:text-blue-600"
                                          )}
                                        >
                                          <span className="text-xs font-medium">{proposal.votes.length}</span>
                                          <span className="text-sm">
                                            {proposal.votes.includes(user?.id || '') ? '✓' : '👍'}
                                          </span>
                                        </Button>
                                      </div>

                                    
                                    </motion.div>
                                  );
                                })}
                              </div>
                              
                              {/* Add new proposal button */}
                              <Button
                                onClick={() => {
                                  setNewMeal({ name: '', description: '', emoji: '🍽️' });
                                  setSelectedDate(dateStr);
                                  setIsAddMealModalOpen(true);
                                }}
                                variant="outline"
                                className="w-full py-6 border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 group transition-all duration-300"
                              >
                                <div className="flex items-center justify-center gap-2">
                                  <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                                  <span className="text-sm text-gray-500 group-hover:text-gray-600">
                                    Voeg nog een voorstel toe
                                  </span>
                                </div>
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => {
                                setNewMeal({ name: '', description: '', emoji: '🍽️' });
                                setSelectedDate(dateStr);
                                setIsAddMealModalOpen(true);
                              }}
                              variant="outline"
                              className="w-full py-6 border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 group transition-all duration-300"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                                <span className="text-sm text-gray-500 group-hover:text-gray-600">
                                  Voeg eerste voorstel toe
                                </span>
                              </div>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : activeView === 'finance' ? (
              <FinanceView 
                isAddExpenseOpen={isAddExpenseOpen}
                setIsAddExpenseOpen={setIsAddExpenseOpen}
              />
            ) : (
              <motion.div 
                className="flex-1 overflow-y-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mt-6">
                <SupermarketStories />
                <SalesLayout groceryList={items.filter(item => !item.completed)} householdName={household?.name} />
                </div>
              </motion.div>
            )}
          </div>

          

          {activeView === 'meals' && (
            <motion.div 
              className="space-y-4 px-4 pb-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* ... existing meals view content ... */}
            </motion.div>
          )}

          {/* Add back the bottom navbar */}
          <div>
            {/* Main content */}
            <div className="pb-20"> {/* Add padding to account for navbar */}
              {/* ... existing content ... */}
            </div>

            {/* Bottom navbar */}
            <motion.div className={cn(
              "fixed bottom-5 left-4 right-4 bg-white/80 backdrop-blur-xl border border-gray-100/20 shadow-2xl rounded-full z-50",
              isDialogOpen && "hidden" // Hide when product drawer is open
            )}>
              <div className="max-w-md mx-auto">
                <div className="flex justify-around items-center px-4 py-2">
                  <motion.button
                    onClick={() => setActiveView('list')}
                    className={`relative flex items-center justify-center p-2 transition-all duration-300 ${
                      activeView === 'list' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {activeView === 'list' && (
                      <motion.div
                        layoutId="navbarActive"
                        className="absolute inset-0 bg-blue-50/70 rounded-full shadow-sm"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative text-lg">📋</span>
                  </motion.button>

                  <motion.button
                    onClick={() => setActiveView('trends')}
                    className={`relative flex items-center justify-center p-2 transition-all duration-300 ${
                      activeView === 'trends' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {activeView === 'trends' && (
                      <motion.div
                        layoutId="navbarActive"
                        className="absolute inset-0 bg-blue-50/70 rounded-full shadow-sm"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative text-lg">🏷️</span>
                  </motion.button>

                  <motion.button
                    onClick={() => setActiveView('finance')}
                    className={`relative flex items-center justify-center p-2 transition-all duration-300 ${
                      activeView === 'finance' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {activeView === 'finance' && (
                      <motion.div
                        layoutId="navbarActive"
                        className="absolute inset-0 bg-blue-50/70 rounded-full shadow-sm"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative text-lg">💰</span>
                  </motion.button>

                  <motion.button
                    onClick={() => navigate('/koken')}
                    className="relative flex items-center justify-center p-2 transition-all duration-300 text-gray-400 hover:text-gray-600"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="relative text-lg">👨‍🍳</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>

         
          {/* Add the upload modal */}
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogContent className="sm:max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Upload Recept Foto
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {!extractedIngredients.length && (
                  <div className="relative group">
                    <input
                      id="recipe-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isProcessingImage}
                      className="hidden"
                    />
                    <label
                      htmlFor="recipe-image"
                      className="flex flex-col items-center justify-center w-full h-48 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 cursor-pointer transition-all duration-300 group-hover:border-blue-500 group-hover:bg-blue-50/50"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 space-y-2">
                        <Upload className="h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                        <p className="text-sm text-gray-500 group-hover:text-gray-600">
                          <span className="font-semibold">Klik om te uploaden</span> of sleep een foto hierheen
                        </p>
                        <p className="text-xs text-gray-400 group-hover:text-gray-500">
                          PNG, JPG of HEIC
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {isProcessingImage && (
                  <div className="flex flex-col items-center justify-center p-8 space-y-6">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Ingrediënten herkennen...</p>
                  </div>
                )}


                {extractedIngredients.length > 0 && (
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

                    <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {extractedIngredients.map((ingredient) => (
                        <motion.li
                          key={ingredient.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer",
                            selectedIngredients.has(ingredient.id)
                              ? "bg-blue-50/80 border border-blue-200"
                              : "bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50"
                          )}
                          onClick={() => toggleIngredientSelection(ingredient.id)}
                        >
                          <div className="flex-shrink-0">
                            <div className={cn(
                              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
                              selectedIngredients.has(ingredient.id)
                                ? "border-blue-500 bg-blue-500 text-white"
                                : "border-gray-300 bg-white"
                            )}>
                              {selectedIngredients.has(ingredient.id) && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                          
                          <span className="text-xl">{ingredient.emoji}</span>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700">{ingredient.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {ingredient.amount} {ingredient.unit}
                            </span>
                          </div>
                        </motion.li>
                      ))}
                    </ul>

                    <Button
                      onClick={addSelectedIngredients}
                      disabled={selectedIngredients.size === 0 || isAddingIngredients}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium transition-all duration-300 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingIngredients ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Toevoegen...</span>
                      </div>
                    ) : (
                      `Voeg ${selectedIngredients.size} ingredient${selectedIngredients.size === 1 ? '' : 'en'} toe`
                    )}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add this near the other dialogs */}
        <Dialog open={isAddMealModalOpen} onOpenChange={setIsAddMealModalOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col rounded-3xl bg-white border border-gray-100 shadow-xl p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Maaltijd Voorstellen</DialogTitle>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-6 px-6 pb-6">
              {Object.keys(favorites).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(favorites).map(([recipeId, isFavorite]) => {
                    // Find the recipe from favorites data
                    const recipe = recipes.find((r: Recipe) => String(r.id) === recipeId);
                    if (!recipe || !isFavorite) return null;
                    
                    return (
                      <motion.div
                        key={recipe.id}
                        className="group relative rounded-xl overflow-hidden border border-gray-100 bg-white hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedRecipe(recipe);
                          handleAddRecipeProposal(recipe);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start gap-4 p-4">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                            <img 
                              src={recipe.image} 
                              alt={recipe.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 mb-1">
                              {recipe.title}
                            </h4>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span>{recipe.readyInMinutes}m</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span>{recipe.servings}p</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nog geen favorieten
                  </h3>
                  <p className="text-sm text-gray-500 max-w-[280px] mx-auto">
                    Ga naar het Koken tabblad en klik op het hartje bij een recept om het toe te voegen aan je favorieten
                  </p>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Of kies een eigen recept</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meal-name">Naam</Label>
                <Input
                  id="meal-name"
                  value={newMeal.name}
                  onChange={(e) => setNewMeal(prev => ({ 
                    ...prev, 
                    name: e.target.value,
                    emoji: '🍽️',
                    description: 'Eigen recept'
                  }))}
                  placeholder="Bijv. Pasta Carbonara"
                />
              </div>

              <Button
                onClick={() => {
                  if (selectedRecipe) {
                    handleAddRecipeProposal(selectedRecipe);
                  } else {
                    handleAddMealProposal();
                  }
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
              >
                Voorstel Toevoegen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add Recipe Modal */}
      {selectedRecipeProposal?.recipe && (
        <RecipeModal
          recipe={selectedRecipeProposal.recipe}
          isOpen={!!selectedRecipeProposal}
          onClose={() => setSelectedRecipeProposal(null)}
          householdId={household?.id || ''}
          isFavorite={favorites[selectedRecipeProposal.recipe.id] || false}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* Add this CSS animation to your global styles or a nearby style tag */}
      <style>
        {`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-gradient {
            background-size: 200% 200%;
            animation: gradient 6s ease infinite;
          }
        `}
      </style>

      {/* Add this confirmation dialog near your other dialogs */}
      <Dialog open={!!proposalToDelete} onOpenChange={() => setProposalToDelete(null)}>
        <DialogContent className="sm:max-w-[300px] bg-white rounded-2xl border border-gray-100 shadow-xl p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-semibold">Voorstel verwijderen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Weet je zeker dat je dit maaltijdvoorstel wilt verwijderen?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setProposalToDelete(null)}
                className="px-3 h-8 text-sm"
              >
                Annuleren
              </Button>
              <Button
                variant="destructive"
                onClick={() => proposalToDelete && handleDeleteProposal(proposalToDelete)}
                className="px-3 h-8 text-sm"
              >
                Verwijderen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Add PreferencesModal at the end of the component */}
      <PreferencesModal
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
      />

      {/* Add this new Dialog import if not already present */}
      <Drawer open={isHouseholdModalOpen} onOpenChange={setIsHouseholdModalOpen}>
        <DrawerContent className="z-[600]">
          <div className="mx-auto w-full max-w-md">
            <div className="flex flex-col p-6">
              <div className="space-y-6">
                {/* Household Settings Section */}
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 space-y-4">
                  {/* Household Name */}
                  <div>
                    <label className="text-sm font-medium text-blue-800 mb-2 block">
                      Naam Huishouden
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="household-name"
                        defaultValue={household?.name || ''}
                        placeholder="Voer een naam in"
                        className="flex-1 px-3 py-2 bg-white rounded-xl border border-blue-100 text-blue-800 placeholder:text-blue-300"
                        onBlur={async (e) => {
                          if (!household?.id || e.target.value === household?.name) return;
                          try {
                            const { error } = await supabase
                              .from('households')
                              .update({ name: e.target.value })
                              .eq('id', household.id);

                            if (error) throw error;

                            toast({
                              title: "Naam bijgewerkt",
                              description: "De naam van het huishouden is succesvol bijgewerkt.",
                            });
                          } catch (error) {
                            console.error('Error updating household name:', error);
                            toast({
                              title: "Fout bij bijwerken",
                              description: "Kon de naam niet bijwerken. Probeer het opnieuw.",
                              variant: "destructive"
                            });
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Deze naam wordt gebruikt in de app en is zichtbaar voor alle huisgenoten
                    </p>
                  </div>

                  <div className="w-full h-px bg-blue-100/50" />

                  {/* Household Code */}
                  <div>
                    <label className="text-sm font-medium text-blue-800 mb-2 block">
                      Huishouden Code
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white rounded-xl border border-blue-100 text-blue-800 font-mono">
                        {household?.invite_code || 'No code available'}
                      </code>
                      <Button
                        onClick={async () => {
                          try {
                            const inviteCode = household?.invite_code || '';
                            
                            if (navigator.clipboard && window.isSecureContext) {
                              await navigator.clipboard.writeText(inviteCode);
                            } else {
                              const textArea = document.createElement('textarea');
                              textArea.value = inviteCode;
                              textArea.style.position = 'fixed';
                              textArea.style.left = '-999999px';
                              textArea.style.top = '-999999px';
                              document.body.appendChild(textArea);
                              textArea.focus();
                              textArea.select();
                              
                              try {
                                document.execCommand('copy');
                                textArea.remove();
                              } catch (error) {
                                console.error('Fallback: Oops, unable to copy', error);
                                textArea.remove();
                                throw error;
                              }
                            }
                            
                            setCopyButtonText("Gekopieerd!");
                            setTimeout(() => setCopyButtonText("Kopieer"), 2000);
                            
                            toast({
                              title: "Gekopieerd!",
                              description: "De code is naar je klembord gekopieerd.",
                            });
                          } catch (error) {
                            console.error('Failed to copy:', error);
                            toast({
                              title: "Fout bij kopiëren",
                              description: "Kon de code niet kopiëren. Probeer het handmatig.",
                              variant: "destructive"
                            });
                          }
                        }}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800"
                      >
                        {copyButtonText}
                      </Button>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Deel deze code met huisgenoten om ze uit te nodigen
                    </p>
                  </div>
                </div>

                {/* Members List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Huisgenoten</h3>
                  <div className="space-y-2">
                    {members.map((member) => {
                      const isCurrentUser = member.user_id === user?.id;
                      const firstName = member.user_name?.split(' ')[0] || member.email?.split('@')[0] || 'Gebruiker';
                      
                      return (
                        <div key={member.id} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50">
                          {member.user_avatar ? (
                            <img 
                              src={member.user_avatar} 
                              alt={firstName}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {firstName[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-gray-600">
                            {firstName}
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs text-blue-600 ml-auto">Jij</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Leave Household Button */}
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={async () => {
                      try {
                        if (!user?.id || !household?.id) return;
                        
                        // Delete the household membership
                        const { error: membershipError } = await supabase
                          .from('household_members')
                          .delete()
                          .eq('user_id', user.id)
                          .eq('household_id', household.id);
                        
                        if (membershipError) throw membershipError;
                        
                        // Update local state by refetching household data
                        await refetchHousehold();
                        
                        // Close the dialog
                        setIsManageHouseholdOpen(false);
                        
                        // Refresh the page
                        window.location.reload();
                        
                        toast({
                          title: "Huishouden verlaten",
                          description: "Je hebt het huishouden succesvol verlaten.",
                        });
                      } catch (error) {
                        console.error('Error leaving household:', error);
                        toast({
                          title: "Fout",
                          description: "Er ging iets mis bij het verlaten van het huishouden.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Huishouden Verlaten
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Add modals at the end of the component */}
      <SavedListsDrawer
        isOpen={isSavedListsOpen}
        onClose={() => setIsSavedListsOpen(false)}
        currentItems={mapItemsForSavedList(items)}
      />

      {/* Move AddProductDrawer outside condition */}
      <AddProductDrawer
        isOpen={isAddProductDrawerOpen}
        onClose={() => setIsAddProductDrawerOpen(false)}
        newItem={newItem}
        onItemChange={handleItemChange}
        onAddItem={handleAddItem}
        householdId={household?.id || ''}
      />
    </>
  )
}