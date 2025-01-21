import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Heart, Search, ChevronRight, Clock, Users, ArrowLeft, Lock } from 'lucide-react';
import { cookingService } from '@/services/cooking-service';
import type { Recipe } from '@/types/recipe';
import { RecipeModal } from '@/components/RecipeModal';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHousehold } from '@/contexts/household-context';
import { useAuth } from '@/contexts/auth-context';
import { Progress } from "@/components/ui/progress";
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface MessageContent {
  text: string;
  recipes?: Recipe[];
}

interface Message {
  id: string;
  content: MessageContent;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface QuickOption {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const quickOptions: QuickOption[] = [
  {
    id: '1',
    icon: '🧊',
    title: 'Koken met mijn koelkast',
    description: 'Ontdek recepten met ingrediënten die je al hebt'
  },
  {
    id: '2',
    icon: '⏲️',
    title: 'Snelle recepten',
    description: 'Maaltijden in 30 minuten of minder'
  },
  {
    id: '3',
    icon: '🥗',
    title: 'Gezonde opties',
    description: 'Voedzame en uitgebalanceerde recepten'
  },
  {
    id: '4',
    icon: '📱',
    title: 'Boodschappenlijst maken',
    description: 'Direct ingredienten toevoegen aan je lijst van een screenshot'
  }
];

const gradientText = "bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent";

async function storeImageInSupabase(imageUrl: string, recipeId: string): Promise<string> {
  try {
    // Create a fetch request with specific headers
    const response = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/*, */*',
        // Add a random cache buster to prevent caching
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // Important: Don't send credentials or cookies
      credentials: 'omit',
      // Use cors mode
      mode: 'cors'
    });

    if (!response.ok) {
      console.warn('Could not fetch image, using original URL:', imageUrl);
      return imageUrl;
    }

    // Get the image data as an ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'image/png' });

    // Generate a unique file path
    const filePath = `recipe-images/${recipeId}-${Date.now()}.png`;

    // Upload to Supabase storage
    const { error } = await supabase
      .storage
      .from('recipes')
      .upload(filePath, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.warn('Error uploading to Supabase:', error);
      return imageUrl;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('recipes')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error storing image:', error);
    // Fallback to original URL if storage fails
    return imageUrl;
  }
}

// Move the markdown components outside of the render function
const createMarkdownComponents = (messageType: 'user' | 'assistant'): Components => ({
  p: ({ children, ...props }) => (
    <p className="mb-4 last:mb-0" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong 
      className={messageType === 'user' 
        ? 'text-white font-semibold' 
        : 'text-gray-900 font-semibold'
      } 
      {...props}
    >
      {children}
    </strong>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-4 space-y-2" {...props}>
      {children}
    </ul>
  ),
  li: ({ children, ...props }) => (
    <li className="flex" {...props}>
      <span className="mr-2">•</span>
      <span>{children}</span>
    </li>
  ),
});

export function KokenPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const { household } = useHousehold();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [generationsLeft, setGenerationsLeft] = useState<number | null>(null);
  const navigate = useNavigate();

  // Add effect to check for updates
  useEffect(() => {
    // Function to check for updates
    const checkForUpdates = async () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          // Trigger a check for updates
          const registration = await navigator.serviceWorker.ready;
          await registration.update();
        } catch (error) {
          console.error('Error checking for updates:', error);
        }
      }
    };

    // Check for updates when the component mounts
    checkForUpdates();

    // Set up periodic update checks
    const updateInterval = setInterval(checkForUpdates, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      clearInterval(updateInterval);
    };
  }, []);

  useEffect(() => {
    const setupFavorites = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const loadFavorites = async () => {
        try {
          const { data, error } = await supabase
            .from('favorites')
            .select('recipe')
            .eq('user_id', user.id);
          
          if (error) throw error;
          if (data) {
            setFavorites(data.map(item => item.recipe));
          }
        } catch (error) {
          console.error('Error loading favorites:', error);
          toast({
            title: "Fout bij laden favorieten",
            description: "Kon favorieten niet laden. Probeer het later opnieuw.",
            variant: "destructive"
          });
        }
      };
      
      loadFavorites();

      const channel = supabase
        .channel('favorites_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'favorites',
            filter: `user_id=eq.${user.id}`
          },
          async () => {
            const { data, error } = await supabase
              .from('favorites')
              .select('recipe')
              .eq('user_id', user.id);
            
            if (!error && data) {
              setFavorites(data.map(item => item.recipe));
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    setupFavorites();
  }, [toast]);

  const fetchRemainingGenerations = async () => {
    if (!user?.id) return;
    try {
      const count = await cookingService.getCurrentGenerationCount(user.id);
      setGenerationsLeft(4 - count);
    } catch (error) {
      console.error('Error fetching remaining generations:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchRemainingGenerations();
    }
  }, [user?.id]);

  const handleSendMessage = async (message: string) => {
    if (!user?.id) {
      toast({
        title: "Niet ingelogd",
        description: "Log in om recepten te genereren",
        variant: "destructive"
      });
      return;
    }

    if (!message.trim()) return;

    const newMessage: Message = {
      id: Math.random().toString(),
      content: { text: message },
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await cookingService.getSmartRecipeResponse(message);
      
      const assistantMessage: Message = {
        id: Math.random().toString(),
        content: typeof response === 'string' 
          ? { text: response } 
          : { text: response.explanation, recipes: response.recipes },
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If recipes were generated, update the remaining generations count
      if (typeof response !== 'string' && response.recipes) {
        fetchRemainingGenerations();
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Math.random().toString(),
        content: {
          text: error instanceof Error ? error.message : 'Er ging iets mis. Probeer het later opnieuw.'
        },
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickOptionClick = async (option: QuickOption) => {
    let prompt = '';
    switch (option.id) {
      case '1': // Koken met mijn koelkast
        prompt = "Ik wil koken met ingrediënten die ik al heb. Hoe kan ik beginnen?";
        break;
      case '2': // Snelle recepten
        prompt = "Geef me wat suggesties voor snelle recepten die binnen 30 minuten klaar zijn.";
        break;
      case '3': // Gezonde opties
        prompt = "Ik zoek gezonde recepten. Wat raad je aan?";
        break;
      case '4': // Boodschappenlijst maken
        prompt = "Hoe kan ik een efficiënte boodschappenlijst maken voor mijn recepten?";
        break;
    }

    setInputValue(prompt);
    await handleSendMessage(prompt);
  };

  const handleRecipeClick = async (recipe: Recipe) => {
    if (!household?.id) {
      toast({
        title: "Geen huishouden geselecteerd",
        description: "Selecteer eerst een huishouden om recepten te kunnen bekijken.",
        variant: "destructive"
      });
      return;
    }

    setIsModalOpen(true);
    try {
      setSelectedRecipe(recipe);
    } catch (error) {
      console.error('Error loading recipe:', error);
      toast({
        title: "Fout bij laden",
        description: "Kon het recept niet laden.",
        variant: "destructive"
      });
    }
  };

  const handleToggleFavorite = async (recipe: Recipe): Promise<boolean | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Niet ingelogd",
          description: "Log in om recepten op te slaan",
          variant: "destructive"
        });
        return null;
      }

      // First check if the favorite already exists
      const { data: existingFavorite, error: fetchError } = await supabase
        .from('favorites')
        .select()
        .eq('user_id', user.id)
        .eq('recipe_id', recipe.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingFavorite) {
        // Delete if exists
        const { error: deleteError } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipe.id);

        if (deleteError) throw deleteError;
        
        // Optionally delete the stored image if no other favorites use it
        // This would require additional checks to ensure the image isn't used elsewhere
        
        toast({
          title: "Verwijderd uit favorieten",
          description: recipe.title
        });
        
        return false;
      } else {
        // Store image in Supabase storage if it's a URL
        let storedRecipe = { ...recipe };
        if (recipe.image && recipe.image.startsWith('http')) {
          const storedImageUrl = await storeImageInSupabase(recipe.image, recipe.id.toString());
          storedRecipe = {
            ...recipe,
            image: storedImageUrl
          };
        }

        // Insert if doesn't exist
        const { error: insertError } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            recipe_id: recipe.id,
            recipe: storedRecipe
          });

        if (insertError) throw insertError;
        
        toast({
          title: "Toegevoegd aan favorieten",
          description: recipe.title
        });
        
        return true;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Fout",
        description: "Kon favoriet niet opslaan",
        variant: "destructive"
      });
      return null;
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm pt-4">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="h-10 w-10 rounded-xl hover:bg-gray-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className={`text-2xl font-semibold ${gradientText}`}>
                  Koken
                </h1>
              </div>
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFavoritesModalOpen(true)}
                  className="h-10 w-10 rounded-xl bg-red-50 hover:bg-red-100 transition-colors relative"
                >
                  <Heart className="h-5 w-5 text-red-500" />
                  {favorites.length > 0 && (
                    <span className="absolute -top-2 -right-2 text-xs bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center">
                      {favorites.length}
                    </span>
                  )}
                </Button>
                <div className="absolute top-full right-0 mt-1 text-sm text-gray-500 whitespace-nowrap bg-white rounded-lg px-3 py-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  Favoriete recepten
                </div>
              </div>
            </div>

            {/* Add subtle line under header */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            
            {/* Progress bar */}
            {generationsLeft !== null && (
              <div className="bg-white rounded-xl p-3 border border-gray-100 mt-2">
                {generationsLeft === 0 ? (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">👨‍🍳</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        De keuken is gesloten voor vandaag!
                      </h3>
                      <p className="text-sm text-gray-500">
                        Je kunt morgen weer nieuwe recepten genereren. Je kunt wel nog vragen stellen over koken en recepten!
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-orange-500 bg-orange-50 px-3 py-1.5 rounded-lg">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm font-medium">0/4</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🧑‍🍳</span>
                        <span className="text-sm font-medium text-gray-700">
                          Recepten voor vandaag
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        nog {generationsLeft} te gaan
                      </span>
                    </div>
                    <Progress 
                      value={(generationsLeft / 4) * 100} 
                      className="h-1.5 bg-gray-100"
                      indicatorClassName="bg-gradient-to-r from-blue-500 to-blue-400"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 pb-24">
          <div className="mt-4">
            {/* Quick options - Only show if no messages */}
            {messages.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {quickOptions.map((option, index) => (
                  <motion.button
                    key={option.id}
                    className="relative p-4 rounded-2xl bg-white border border-gray-100 text-left hover:shadow-lg transition-all"
                    onClick={() => handleQuickOptionClick(option)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: index * 0.1 }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center text-2xl shadow-inner">
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                          {option.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Messages section with updated formatting */}
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                        message.sender === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={createMarkdownComponents(message.sender)}
                        >
                          {message.content.text}
                        </ReactMarkdown>
                      </div>

                      {/* Recipe cards rendering (unchanged) */}
                      {message.content.recipes && message.content.recipes.length > 0 && (
                        <div className="mt-4 space-y-4">
                          {message.content.recipes.map((recipe) => (
                            <motion.div
                              key={recipe.id}
                              className="relative rounded-2xl overflow-hidden border border-gray-100 bg-white hover:shadow-lg transition-all cursor-pointer group"
                              onClick={() => handleRecipeClick(recipe)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center gap-3">
                                {recipe.image && (
                                  <img 
                                    src={recipe.image} 
                                    alt={recipe.title}
                                    className="w-16 h-16 rounded-lg object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{recipe.title}</h4>
                                  <p className="text-xs text-gray-500">
                                    {recipe.readyInMinutes} minuten • {recipe.servings} personen
                                  </p>
                                  <div className="text-sm text-gray-600">
                                    {recipe.description || 'Geen beschrijving beschikbaar'}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-gray-100 p-4 rounded-2xl">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Input section - Fixed to bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-6">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                placeholder="Wat wil je eten of weten?"
                className="flex-1 rounded-xl border-gray-200 bg-white focus:border-blue-500 focus:ring-blue-500/20"
              />
              <Button
                onClick={() => handleSendMessage(inputValue)}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Modals */}
        <Dialog open={isFavoritesModalOpen} onOpenChange={setIsFavoritesModalOpen}>
          <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden rounded-3xl">
            <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-white to-gray-50/50">
              <DialogHeader className="text-left">
                <DialogTitle>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className={`text-2xl font-semibold leading-tight ${gradientText}`}>
                        Favoriete Recepten
                      </h2>
                      <p className="text-sm text-gray-500 font-normal mt-1">
                        {favorites.length} {favorites.length === 1 ? 'recept' : 'recepten'} opgeslagen
                      </p>
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              {/* Updated Search bar */}
              <div className="mt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Zoek in favorieten..."
                    className="pl-10 bg-white/50 border-gray-200 rounded-xl focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {favorites.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                    <Heart className="w-10 h-10 text-red-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nog geen favorieten
                  </h3>
                  <p className="text-sm text-gray-500 max-w-[280px] mx-auto leading-relaxed">
                    Klik op het hartje bij een recept om het toe te voegen aan je favorieten
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favorites.map((recipe) => (
                    <motion.div
                      key={recipe.id}
                      className="group relative rounded-2xl overflow-hidden border border-gray-100 bg-white hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => {
                        setIsFavoritesModalOpen(false);
                        handleRecipeClick(recipe);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-4 p-4">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                          <img 
                            src={recipe.image} 
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                        
                        <div className="flex-1 min-w-0 py-0.5">
                          <h4 className="font-medium text-gray-900 mb-1.5 leading-tight">
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
                          {recipe.description && (
                            <p className="text-sm text-gray-500 line-clamp-1 mt-1.5">
                              {recipe.description}
                            </p>
                          )}
                        </div>

                        <div className="self-center ml-2">
                          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <RecipeModal
          recipe={selectedRecipe}
          isOpen={isModalOpen}
          isFavorite={favorites.some(fav => fav.id === selectedRecipe?.id)}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setIsModalOpen(false)}
          householdId={household?.id || ''}
        />
      </div>
    </>
  );
} 