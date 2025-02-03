import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { Star, Users, Plus, X, Clock, ShoppingCart, ChefHat, Calendar, Send, Upload, ChevronDown, Download } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils"
import { categoryEmojis, Category } from '@/constants/categories';
import { InstallDrawer } from '@/components/install/InstallDrawer';

interface DemoItem {
  id: string;
  name: string;
  emoji: string;
  category: string;
  completed: boolean;
  quantity: string;
  priority: boolean;
  user_name: string;
  user_avatar: null;
}

interface DemoVote {
  userId: string;
  userName: string;
  userAvatar?: string;
}

interface DemoPresence {
  date: string;
  users: DemoUser[];
}

interface DemoUser {
  id: string;
  name: string;
  avatar?: string;
}

interface DemoMeal {
  id: string;
  name: string;
  emoji: string;
  description: string;
  time: string;
  servings: number;
  votes: DemoVote[];
}

interface DemoMessage {
  id: string;
  content: {
    text: string;
    recipes?: {
      id: string;
      title: string;
      description: string;
      readyInMinutes: number;
      servings: number;
      image?: string;
    }[];
  };
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export function LandingPage() {
  const [demoItems, setDemoItems] = useState([
    { 
      id: '1', 
      name: 'Pasta', 
      emoji: '🍝', 
      category: 'Pasta & Rijst', 
      completed: false,
      quantity: '500g',
      priority: false,
      user_name: 'Demo User',
      user_avatar: null
    },
    { 
      id: '2', 
      name: 'Tomatensaus', 
      emoji: '🥫', 
      category: 'Conserven', 
      completed: false,
      quantity: '2 stuks',
      priority: true,
      user_name: 'Demo User',
      user_avatar: null
    },
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [activeDemoTab, setActiveDemoTab] = useState<'list' | 'meals' | 'cooking'>('list');
  const [isInstallDrawerOpen, setIsInstallDrawerOpen] = useState(false);

  // Expanded predefined demo items
  const demoNewItems: DemoItem[] = [
    { 
      id: 'demo-3',
      name: 'Brood',
      emoji: '🥖',
      category: 'Brood & Granen',
      completed: false,
      quantity: '1 stuk',
      priority: false,
      user_name: 'Demo User',
      user_avatar: null
    },
    { 
      id: 'demo-4',
      name: 'Bananen',
      emoji: '🍌',
      category: 'Groente & Fruit',
      completed: false,
      quantity: '5 stuks',
      priority: false,
      user_name: 'Demo User',
      user_avatar: null
    },
    {
      id: '5',
      name: 'Melk',
      emoji: '🥛',
      category: 'Zuivel',
      completed: false,
      quantity: '1 liter',
      priority: true,
      user_name: 'Demo User',
      user_avatar: null
    },
    {
      id: '6',
      name: 'Eieren',
      emoji: '🥚',
      category: 'Zuivel',
      completed: false,
      quantity: '12 stuks',
      priority: false,
      user_name: 'Demo User',
      user_avatar: null
    },
    {
      id: '7',
      name: 'Chips',
      emoji: '🥨',
      category: 'Snacks',
      completed: false,
      quantity: '2 zakken',
      priority: false,
      user_name: 'Demo User',
      user_avatar: null
    }
  ];

  const [currentDemoItemIndex, setCurrentDemoItemIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  // Add new state for completed items
  const [completedDemoItems, setCompletedDemoItems] = useState<DemoItem[]>([]);

  // Add new state for demo presence
  const [demoDayPresence, setDemoDayPresence] = useState<DemoPresence[]>([
    {
      date: '2024-03-18', // Monday
      users: [
        { id: 'user1', name: 'Sarah', avatar: '/103160_man_512x512.png' },
        { id: 'user2', name: 'Mike' }, // Will show initial 'M'
        { id: 'user3', name: 'Emma' }, // Will show initial 'E'
      ]
    },
    {
      date: '2024-03-19', // Tuesday
      users: [
        { id: 'user4', name: 'John' }, // Will show initial 'J'
        { id: 'user5', name: 'Lisa', avatar: '/103160_man_512x512.png' },
      ]
    }
  ]);

  // Update demo meals with mixed avatars
  const [demoMeals, setDemoMeals] = useState<Record<string, DemoMeal[]>>({
    'Maandag': [
      {
        id: '1',
        name: 'Pasta Carbonara',
        emoji: '🍝',
        description: 'Klassieke Italiaanse pasta met ei en spek',
        time: '30 min',
        servings: 4,
        votes: [
          { userId: 'user1', userName: 'Sarah', userAvatar: '/103160_man_512x512.png' },
          { userId: 'user2', userName: 'Mike' }, // Initial
          { userId: 'user3', userName: 'Emma' } // Initial
        ]
      },
      {
        id: '2',
        name: 'Vegetarische Curry',
        emoji: '🥘',
        description: 'Indiase curry met kikkererwten',
        time: '45 min',
        servings: 4,
        votes: [
          { userId: 'user4', userName: 'John' }, // Initial
          { userId: 'user5', userName: 'Lisa', userAvatar: '/103160_man_512x512.png' }
        ]
      }
    ],
    'Dinsdag': [
      {
        id: '3',
        name: 'Groene Curry',
        emoji: '🥘',
        description: 'Thaise curry met groenten en rijst',
        time: '45 min',
        servings: 3,
        votes: []
      }
    ],
    'Woensdag': []
  });

  // Add demo user state
  const [demoUser] = useState<DemoUser>({
    id: 'demo-user',
    name: 'Demo User'
  });

  // Add handleInputChange function
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isTyping) {
      setNewItemName(e.target.value);
    }
  };

  // Update the simulateTyping function
  const simulateTyping = async () => {
    if (isTyping || currentDemoItemIndex >= demoNewItems.length) {
      if (currentDemoItemIndex >= demoNewItems.length) {
        setCurrentDemoItemIndex(0);
        setDemoItems([]);
        setCompletedDemoItems([]);
        setIsTyping(false);
        return;
      }
      return;
    }
    
    setIsTyping(true);
    const itemToType = demoNewItems[currentDemoItemIndex].name;
    let currentText = '';

    for (let i = 0; i < itemToType.length; i++) {
      currentText += itemToType[i];
      setNewItemName(currentText);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    setIsTyping(false);
  };

  // Update the handleAddItem function
  const handleAddItem = () => {
    if (!newItemName.trim() || currentDemoItemIndex >= demoNewItems.length) return;
    
    const newItem = {
      ...demoNewItems[currentDemoItemIndex],
      id: `demo-${currentDemoItemIndex}-${Date.now()}`,
    };
    
    setDemoItems(prev => [newItem, ...prev]);
    setNewItemName('');
    setCurrentDemoItemIndex(prev => prev + 1);
  };

  // Add toggle completed function
  const toggleItemCompleted = (itemId: string) => {
    const itemToToggle = demoItems.find(item => item.id === itemId);
    if (!itemToToggle) return;

    // Remove from demoItems and add to completedDemoItems
    setDemoItems(prev => prev.filter(item => item.id !== itemId));
    setCompletedDemoItems(prev => [itemToToggle, ...prev]);
  };

  // Update the handleInputFocus function
  const handleInputFocus = () => {
    if (!isTyping && newItemName === '') {
      simulateTyping();
    }
  };

  // Group items by category for demo
  const demoItemsByCategory = demoItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof demoItems>);

  // Add these new functions to handle interactions
  const handlePresenceToggle = (dateStr: string) => {
    const day = dateStr === '2024-03-18' ? 'Maandag' : 
                dateStr === '2024-03-19' ? 'Dinsdag' : 'Woensdag';
                
    setDemoDayPresence(prev => {
      const newPresence = [...prev];
      const dayIndex = newPresence.findIndex(p => p.date === dateStr);
      
      if (dayIndex === -1) {
        // Add new day if it doesn't exist
        return [...prev, {
          date: dateStr,
          users: [{ ...demoUser }]
        }];
      } else {
        const userIndex = newPresence[dayIndex].users.findIndex(u => u.id === demoUser.id);
        if (userIndex === -1) {
          // Add user to existing day
          newPresence[dayIndex].users = [...newPresence[dayIndex].users, { ...demoUser }];
        } else {
          // Remove user from day and their votes
          newPresence[dayIndex].users = newPresence[dayIndex].users.filter(u => u.id !== demoUser.id);
          handleLeaveMeal(day);
        }
        return newPresence;
      }
    });
  };

  const handleVote = (day: string, mealId: string) => {
    setDemoMeals(prev => {
      const newMeals = { ...prev };
      const dayMeals = [...(newMeals[day] || [])];
      const mealIndex = dayMeals.findIndex(m => m.id === mealId);
      
      if (mealIndex !== -1) {
        const meal = { ...dayMeals[mealIndex] };
        const hasVoted = meal.votes.some((v: DemoVote) => v.userId === demoUser.id);
        
        if (hasVoted) {
          meal.votes = meal.votes.filter((v: DemoVote) => v.userId !== demoUser.id);
        } else {
          meal.votes = [...meal.votes, {
            userId: demoUser.id,
            userName: demoUser.name,
          }];
        }
        
        dayMeals[mealIndex] = meal;
        newMeals[day] = dayMeals;
      }
      
      return newMeals;
    });
  };

  // Add function to leave a meal
  const handleLeaveMeal = (day: string) => {
    setDemoMeals(prev => {
      const newMeals = { ...prev };
      const dayMeals = [...newMeals[day]];
      
      dayMeals.forEach(meal => {
        meal.votes = meal.votes.filter((v: DemoVote) => v.userId !== demoUser.id);
      });
      
      newMeals[day] = dayMeals;
      return newMeals;
    });

    // Also remove presence
    const dateStr = day === 'Maandag' ? '2024-03-18' : 
                   day === 'Dinsdag' ? '2024-03-19' : '2024-03-20';
    
    setDemoDayPresence(prev => {
      const newPresence = [...prev];
      const dayIndex = newPresence.findIndex(p => p.date === dateStr);
      
      if (dayIndex !== -1) {
        newPresence[dayIndex].users = newPresence[dayIndex].users.filter(
          u => u.id !== demoUser.id
        );
      }
      
      return newPresence;
    });
  };

  // Add this to your LandingPage component state
  const [demoChatMessages] = useState<DemoMessage[]>([
    {
      id: '1',
      content: {
        text: "Ik wil graag een poke bowl maken"
      },
      sender: 'user',
      timestamp: new Date()
    },
    {
      id: '2',
      content: {
        text: "Natuurlijk! Ik heb een heerlijk recept voor een Hawaiiaanse poke bowl met zalm. Het is een gezonde en verfrissende maaltijd die je in ongeveer 30 minuten kunt maken.",
        recipes: [
          {
            id: 'poke-1',
            title: 'Hawaiiaanse Poke Bowl met Zalm',
            image: '/pokebowl-met-zalm2.png',
            readyInMinutes: 30,
            servings: 2,
            description: 'Een frisse poke bowl met verse zalm, avocado, mango en sushirijst'
          }
        ]
      },
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);

  // Add state for managing open FAQ items
  const [openFaqId, setOpenFaqId] = useState<string>('faq-1');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100/50 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-8 sm:pb-16 overflow-hidden"
      >
        {/* Enhanced floating elements with modern gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ 
              y: [-20, 20],
              x: [-10, 10],
              rotate: [0, 10]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            className="absolute top-1/4 right-[-10%] w-64 h-64 bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-blue-200/40 via-indigo-200/30 to-purple-200/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              y: [20, -20],
              x: [10, -10],
              rotate: [10, 0]
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            className="absolute bottom-1/4 left-[-10%] w-72 h-72 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-200/30 via-indigo-200/20 to-purple-200/10 rounded-full blur-3xl"
          />
        </div>

        {/* Modern Navbar with Glassmorphism */}
        <motion.nav 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative flex justify-between items-center py-3 sm:py-4 mb-6 sm:mb-8 px-4 sm:px-6 rounded-2xl bg-white/60 backdrop-blur-lg border border-white/20 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-xl blur-sm"
                animate={{ opacity: [0.5, 0.3, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="relative w-10 h-10 rounded-xl"
              />
            </div>
            <span className="font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Lijssie
            </span>
          </div>
          <Button
            onClick={() => setIsInstallDrawerOpen(true)}
            variant="ghost"
            className="relative group px-6"
          >
            <span className="relative z-10 flex items-center gap-2 text-blue-600 group-hover:text-blue-700">
              <Download className="w-4 h-4" />
              Installeren
            </span>
            <motion.div
              className="absolute inset-0 bg-blue-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            />
          </Button>
        </motion.nav>

        {/* Modern Hero Content with Sparkle Effect */}
        <div className="relative text-center space-y-4 sm:space-y-6 mt-8 sm:mt-12">
          {/* Title with glow effect */}
          <div className="relative">
            <motion.div 
              className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-full blur-xl"
              animate={{ 
                opacity: [0.3, 0.5, 0.3],
                scale: [0.98, 1.02, 0.98]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.h1 
              className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight"
            >
              <span className="text-gray-800">Zet het ff op het</span>
              <br />
              <span className="relative inline-block mt-2">
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 blur-md" />
                <span className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                  lijssie
                </span>
                <span className="text-gray-800"> ✅</span>
              </span>
            </motion.h1>
          </div>

          {/* Interactive App Demo */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-md mx-auto mt-12 sm:mt-16"
          >
            {/* App Navigation */}
            <div className="bg-white/80 backdrop-blur-xl rounded-t-3xl p-3 sm:p-4 flex justify-around border-b border-gray-100">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveDemoTab('list')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                  activeDemoTab === 'list' ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="text-xs">Lijst</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveDemoTab('meals')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                  activeDemoTab === 'meals' ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Maaltijden</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveDemoTab('cooking')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                  activeDemoTab === 'cooking' ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <ChefHat className="h-5 w-5" />
                <span className="text-xs">Koken</span>
              </motion.button>
            </div>

            {/* Demo Content */}
            <div className="bg-white/80 backdrop-blur-xl rounded-b-3xl p-3 sm:p-6">
              <AnimatePresence mode="wait">
                {activeDemoTab === 'list' && (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-3 sm:space-y-4"
                  >
                    <div className="text-left mb-8">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Slimme Boodschappenlijst</h3>
                      <p className="text-gray-600">Deel je lijst met huisgenoten en werk samen in real-time</p>
                    </div>

                    {/* Interactive Demo Input */}
                    <div className="flex gap-2 mb-6">
                      <Input 
                        className={cn(
                          "bg-white/50",
                          isTyping && "cursor-not-allowed"
                        )}
                        placeholder={isTyping ? "Aan het typen..." : "Voeg een item toe..."}
                        value={newItemName}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        onClick={handleInputFocus}
                        readOnly={isTyping}
                      />
                      <Button
                        size="icon"
                        className={cn(
                          "bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200",
                          (!newItemName.trim() || isTyping) && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={handleAddItem}
                        disabled={!newItemName.trim() || isTyping}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* List Demo Section */}
                    <div className="space-y-6">
                      {/* Active Items */}
                      <div className="space-y-4">
                        <AnimatePresence>
                          {Object.entries(demoItemsByCategory).map(([category, items]) => (
                            <motion.div
                              key={category}
                              className="space-y-2"
                            >
                              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100">
                                <div className="py-1.5 px-2.5 flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                                  <div className="flex items-center gap-2">
                                    <span>{categoryEmojis[category as Category] || categoryEmojis['Overig']}</span>
                                    <span>{category}</span>
                                  </div>
                                </div>
                                
                                <ul className="space-y-3 p-4">
                                  <AnimatePresence>
                                    {items.map((item) => (
                                      <motion.li 
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        onClick={() => toggleItemCompleted(item.id)}
                                        className="relative flex items-center justify-between py-1.5 group cursor-pointer hover:bg-gray-50/50 transition-colors duration-200"
                                      >
                                        <div className="flex items-center gap-2 flex-1">
                                          <input
                                            type="checkbox"
                                            checked={item.completed}
                                            onChange={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDemoItems(demoItems.map(i => 
                                                i.id === item.id ? {...i, completed: !i.completed} : i
                                              ));
                                            }}
                                            className="peer relative h-4 w-4 shrink-0 appearance-none rounded-full border-2 border-blue-400 transition-colors duration-300 ease-in-out 
                                              checked:border-blue-500 checked:bg-blue-500 checked:hover:border-blue-600 checked:hover:bg-blue-600
                                              focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-0
                                              disabled:cursor-not-allowed disabled:opacity-50
                                              after:absolute after:left-0 after:top-0 after:h-full after:w-full after:bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PScwIDAgMTYgMTYnIGZpbGw9JyNmZmYnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PHBhdGggZD0nTTEyLjIwNyA0Ljc5M2ExIDEgMCAwIDEgMCAxLjQxNGwtNSA1YTEgMSAwIDAgMS0xLjQxNCAwbC0yLTJhMSAxIDAgMCAxIDEuNDE0LTEuNDE0TDYuNSA5LjA4NmwzLjc5My0zLjc5M2ExIDEgMCAwIDEgMS40MTQgMHonLz48L3N2Zz4=')) after:bg-center after:bg-no-repeat after:opacity-0 after:transition-opacity after:duration-300 after:ease-in-out
                                              checked:after:opacity-100
                                              hover:border-blue-500 hover:bg-blue-50/50"
                                          />
                                          <div className="flex items-center gap-1.5 text-sm">
                                            <span className="text-gray-600 group-hover:text-gray-800 transition-all duration-300 ease-in-out flex items-center gap-1.5">
                                              {item.emoji} {item.name}
                                              {item.quantity && (
                                                <span className="text-xs text-gray-400">
                                                  ({item.quantity})
                                                </span>
                                              )}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
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
                                      </motion.li>
                                    ))}
                                  </AnimatePresence>
                                </ul>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      {/* Completed Items */}
                      {completedDemoItems.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Gekocht</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCompletedDemoItems([])}
                              className="text-gray-500 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100">
                            <ul className="divide-y divide-gray-100">
                              <AnimatePresence>
                                {completedDemoItems.map((item) => (
                                  <motion.li
                                    key={item.id}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="flex items-center justify-between py-1.5 px-4 text-gray-400"
                                  >
                                    <span className="flex items-center gap-2">
                                      {item.emoji} {item.name}
                                      {item.quantity && (
                                        <span className="text-xs">({item.quantity})</span>
                                      )}
                                    </span>
                                  </motion.li>
                                ))}
                              </AnimatePresence>
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Demo Features Pills */}
                    <div className="flex flex-wrap gap-2 mt-6 justify-center">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                      >
                        <Users className="h-3 w-3" /> Real-time sync
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                      >
                        <Upload className="h-3 w-3" /> Scan recepten
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {activeDemoTab === 'meals' && (
                  <motion.div
                    key="meals"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-3 sm:space-y-4"
                  >
                    <div className="text-left mb-4 sm:mb-8">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">
                        Maaltijd Planning
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        Plan je maaltijden en stem af met je huisgenoten
                      </p>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(demoMeals).map(([day, meals]) => {
                        const dateStr = day === 'Maandag' ? '2024-03-18' : 
                                       day === 'Dinsdag' ? '2024-03-19' : '2024-03-20';
                        const dayPresence = demoDayPresence.find(p => p.date === dateStr);
                        const isUserPresent = dayPresence?.users.some(u => u.id === demoUser.id);

                        return (
                          <motion.div
                            key={day}
                            className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 overflow-hidden"
                            whileHover={{ scale: 1.02 }}
                          >
                            <div className="flex justify-between items-center p-4 border-b border-gray-100">
                              <span className="font-medium text-gray-700">{day}</span>
                              <Button
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isUserPresent) {
                                    handlePresenceToggle(dateStr);
                                  } else {
                                    handlePresenceToggle(dateStr);
                                  }
                                }}
                                className={cn(
                                  "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300",
                                  isUserPresent
                                    ? "bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-600"
                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                )}
                              >
                                {isUserPresent ? (
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
                            {dayPresence && dayPresence.users.length > 0 && (
                              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                                <span className="text-sm text-gray-600 font-medium">Aanwezig:</span>
                                <div className="flex items-center -space-x-2">
                                  {dayPresence.users.map(user => (
                                    <div
                                      key={user.id}
                                      className="relative w-7 h-7 rounded-full border-2 border-white shadow-sm group"
                                      title={user.name}
                                    >
                                      {user.avatar ? (
                                        <img
                                          src={user.avatar}
                                          alt={user.name}
                                          className="w-full h-full rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-sm">
                                          {user.name[0].toUpperCase()}
                                        </div>
                                      )}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                                        {user.name}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {meals.length > 0 ? (
                              <div className="p-3 space-y-2">
                                {meals.map((meal) => {
                                  const hasVoted = meal.votes.some(vote => vote.userId === demoUser.id);
                                  const isWinner = meal.votes.length === Math.max(...meals.map(m => m.votes.length));

                                  return (
                                    <motion.div
                                      key={meal.id}
                                      onClick={(e) => e.stopPropagation()}
                                      className={cn(
                                        "group relative overflow-hidden flex items-center justify-between p-2.5 rounded-xl bg-white transition-all duration-300",
                                        isWinner && meal.votes.length > 0
                                          ? "border-0 before:absolute before:inset-0 before:-z-10 before:rounded-xl before:p-[2px] before:bg-gradient-to-r before:from-blue-400 before:via-blue-500 before:to-blue-600"
                                          : "border border-gray-100 hover:border-blue-200"
                                      )}
                                    >
                                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-lg flex-shrink-0">
                                          {meal.emoji}
                                        </div>

                                        <div className="flex flex-col gap-1 min-w-0">
                                          {isWinner && meal.votes.length > 0 && (
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                                              <span>👑</span>
                                              <span>Meeste stemmen</span>
                                            </div>
                                          )}
                                          <span className="font-medium text-sm text-gray-900 truncate">
                                            {meal.name}
                                          </span>
                                          <div className="flex items-center gap-3 text-xs text-gray-500">
                                            {meal.time && (
                                              <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {meal.time}
                                              </span>
                                            )}
                                            {meal.servings && (
                                              <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {meal.servings} pers.
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          handleVote(day, meal.id);
                                        }}
                                        className={cn(
                                          "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-300 h-7",
                                          hasVoted
                                            ? "bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700"
                                            : "hover:bg-blue-50 hover:text-blue-600"
                                        )}
                                      >
                                        <span className="text-xs font-medium">{meal.votes.length}</span>
                                        <span className="text-sm">
                                          {hasVoted ? '✓' : '👍'}
                                        </span>
                                      </Button>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-8 text-center">
                                <p className="text-sm text-gray-500">
                                  Nog geen maaltijd gepland
                                </p>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Demo Features Pills */}
                    <div className="flex flex-wrap gap-2 mt-6 justify-center">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                      >
                        <Calendar className="h-3 w-3" /> Week planning
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                      >
                        <Star className="h-3 w-3" /> AI suggesties
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {activeDemoTab === 'cooking' && (
                  <motion.div
                    key="cooking"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-3 sm:space-y-4"
                  >
                    <div className="text-left mb-4 sm:mb-8">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">
                        AI Recepten Generator
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        Krijg persoonlijke recepten suggesties
                      </p>
                    </div>

                    {/* Chat Messages */}
                    <div className="space-y-4 mb-6">
                      {demoChatMessages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} w-full`}
                        >
                          <div className={`max-w-[80%] text-left ${
                            message.sender === 'user' 
                              ? 'bg-blue-500 text-white rounded-t-2xl rounded-l-2xl' 
                              : 'bg-white border border-gray-100 rounded-t-2xl rounded-r-2xl'
                          } p-4`}>
                            <p className={message.sender === 'user' ? 'text-white' : 'text-gray-700'}>
                              {message.content.text}
                            </p>

                            {message.content.recipes && (
                              <div className="mt-4 space-y-4">
                                {message.content.recipes.map((recipe) => (
                                  <motion.div
                                    key={recipe.id}
                                    className="relative rounded-2xl overflow-hidden border border-gray-100 bg-white hover:shadow-lg transition-all cursor-pointer group"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <div className="flex items-center gap-3 p-3">
                                      {recipe.image && (
                                        <img 
                                          src={recipe.image} 
                                          alt={recipe.title}
                                          className="w-16 h-16 rounded-lg object-cover"
                                        />
                                      )}
                                      <div className="flex-1">
                                        <h4 className="font-medium text-sm text-left">{recipe.title}</h4>
                                        <p className="text-xs text-gray-500 text-left">
                                          {recipe.readyInMinutes} minuten • {recipe.servings} personen
                                        </p>
                                        <div className="text-sm text-gray-600 text-left">
                                          {recipe.description}
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

                      {/* Typing Indicator */}
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
                    </div>

                    {/* Input Area */}
                    <div className="flex gap-2 mt-6">
                      <Input
                        placeholder="Wat wil je eten of weten?"
                        className="flex-1 rounded-xl border-gray-200 bg-white/50"
                        readOnly
                      />
                      <Button
                        className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Quick Options */}
                    <div className="mt-6 space-y-2">
                      <h4 className="text-sm font-medium text-gray-600 text-left">Suggesties:</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" className="rounded-full text-sm">
                          🥗 Gezonde recepten
                        </Button>
                        <Button variant="outline" className="rounded-full text-sm">
                          ⏲️ Snelle maaltijden
                        </Button>
                        <Button variant="outline" className="rounded-full text-sm">
                          🌱 Vegetarisch
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* After the demo section and before social proof */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="px-3 sm:px-4 py-16 sm:py-24 bg-gradient-to-b from-white via-blue-50/20 to-white"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.span 
              className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium mb-4"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
            >
              Zo werkt het
            </motion.span>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent mb-4">
              In 3 simpele stappen
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Lijssie maakt het makkelijk om samen met je huisgenoten boodschappen te doen en maaltijden te plannen
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <motion.div
              whileHover={{ y: -8 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
              <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-2">Slimme Boodschappenlijst</h3>
                <p className="text-gray-600">
                  Maak samen een boodschappenlijst en zie direct wie wat koopt. Scan recepten om ingrediënten automatisch toe te voegen.
                </p>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              whileHover={{ y: -8 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
              <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center mb-4">
                  <span className="text-2xl">📅</span>
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-2">Plan je Maaltijden</h3>
                <p className="text-gray-600">
                  Stem samen op recepten, zie wie wanneer kookt en plan de maaltijden voor de hele week. Nooit meer dubbele boodschappen.
                </p>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              whileHover={{ y: -8 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
              <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mb-4">
                  <span className="text-2xl">🛒‍🍳</span>
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Chef Assistent</h3>
                <p className="text-gray-600">
                  Krijg persoonlijke recepten van onze AI chef, gebaseerd op jouw voorkeuren en beschikbare ingrediënten.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      
      {/* FAQ Section - Now positioned right after How it Works */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="px-3 sm:px-4 py-16 sm:py-24"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <motion.span 
              className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium mb-4"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
            >
              FAQ
            </motion.span>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent mb-4">
              Veelgestelde vragen
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Alles wat je moet weten over Lijssie
            </p>
          </div>

          <div className="grid gap-4">
            {/* FAQ Item 1 */}
            <motion.div
              className="relative group"
              initial={false}
            >
              <button
                onClick={() => setOpenFaqId(openFaqId === 'faq-1' ? '' : 'faq-1')}
                className="w-full text-left"
              >
                <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Is Lijssie gratis te gebruiken?
                    </h3>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                        openFaqId === 'faq-1' ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaqId === 'faq-1' ? 'auto' : 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-gray-600 mt-4">
                      Ja, Lijssie is volledig gratis te gebruiken voor studenten en huisgenoten. 
                      We geloven in het toegankelijk maken van slim boodschappen doen voor iedereen.
                    </p>
                  </motion.div>
                </div>
              </button>
            </motion.div>

            {/* FAQ Item 2 */}
            <motion.div
              className="relative group"
              initial={false}
            >
              <button
                onClick={() => setOpenFaqId(openFaqId === 'faq-2' ? '' : 'faq-2')}
                className="w-full text-left"
              >
                <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Hoeveel huisgenoten kunnen er in één huishouden?
                    </h3>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                        openFaqId === 'faq-2' ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaqId === 'faq-2' ? 'auto' : 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-gray-600 mt-4">
                      Er is geen limiet aan het aantal huisgenoten. Of je nu met z'n tweeën of met tien 
                      mensen woont, Lijssie werkt voor elk huishouden.
                    </p>
                  </motion.div>
                </div>
              </button>
            </motion.div>

            {/* FAQ Item 3 */}
            <motion.div
              className="relative group"
              initial={false}
            >
              <button
                onClick={() => setOpenFaqId(openFaqId === 'faq-3' ? '' : 'faq-3')}
                className="w-full text-left"
              >
                <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Hoe werkt de AI chef?
                    </h3>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                        openFaqId === 'faq-3' ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaqId === 'faq-3' ? 'auto' : 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-gray-600 mt-4">
                      De AI chef helpt je met het vinden van recepten op basis van je voorkeuren en beschikbare ingrediënten. 
                      Hij kan ook recepten aanpassen aan het aantal personen en dieetwensen.
                    </p>
                  </motion.div>
                </div>
              </button>
            </motion.div>

            {/* FAQ Item 4 */}
            <motion.div
              className="relative group"
              initial={false}
            >
              <button
                onClick={() => setOpenFaqId(openFaqId === 'faq-4' ? '' : 'faq-4')}
                className="w-full text-left"
              >
                <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Kan ik mijn boodschappenlijst delen?
                    </h3>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                        openFaqId === 'faq-4' ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaqId === 'faq-4' ? 'auto' : 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-gray-600 mt-4">
                      Ja! Je kunt je boodschappenlijst delen met je huisgenoten. Alle wijzigingen worden direct gesynchroniseerd, 
                      zodat iedereen altijd de meest actuele lijst heeft.
                    </p>
                  </motion.div>
                </div>
              </button>
            </motion.div>

            {/* FAQ Item 5 */}
            <motion.div
              className="relative group"
              initial={false}
            >
              <button
                onClick={() => setOpenFaqId(openFaqId === 'faq-5' ? '' : 'faq-5')}
                className="w-full text-left"
              >
                <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Hoe plan ik maaltijden met mijn huisgenoten?
                    </h3>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                        openFaqId === 'faq-5' ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaqId === 'faq-5' ? 'auto' : 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-gray-600 mt-4">
                      In de maaltijdplanner kun je aangeven wie wanneer kookt en welk recept. Huisgenoten kunnen stemmen op 
                      recepten en aangeven wanneer ze mee-eten. De boodschappen worden automatisch toegevoegd aan je lijst.
                    </p>
                  </motion.div>
                </div>
              </button>
            </motion.div>

            {/* FAQ Item 6 */}
            <motion.div
              className="relative group"
              initial={false}
            >
              <button
                onClick={() => setOpenFaqId(openFaqId === 'faq-6' ? '' : 'faq-6')}
                className="w-full text-left"
              >
                <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Werkt Lijssie ook op mijn telefoon?
                    </h3>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                        openFaqId === 'faq-6' ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaqId === 'faq-6' ? 'auto' : 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-gray-600 mt-4">
                      Ja! Lijssie is volledig responsive en werkt perfect op je telefoon, tablet en computer. 
                      Je kunt zelfs recepten scannen met je telefoon camera.
                    </p>
                  </motion.div>
                </div>
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Final CTA Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="px-3 sm:px-4 py-24 sm:py-32 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <span className="inline-block px-4 py-1.5 bg-blue-400/20 text-white rounded-full text-sm font-medium">
              Start vandaag nog
            </span>
            
            <h2 className="text-4xl sm:text-5xl font-bold text-white">
              Klaar om slimmer boodschappen te doen?
            </h2>
            
            <p className="text-blue-100 text-lg max-w-2xl mx-auto">
              Join duizenden huisgenoten die al genieten van makkelijker boodschappen doen, 
              slim maaltijden plannen en minder voedselverspilling.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
              <Button
                onClick={() => setIsInstallDrawerOpen(true)}
                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Installeer nu
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const faqSection = document.getElementById('faq-section');
                  faqSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-blue-100 hover:text-white hover:bg-blue-500/20 px-8 py-6 rounded-xl text-lg font-semibold"
              >
                Meer weten
              </Button>
            </div>

            <div className="pt-8 flex items-center justify-center gap-2 text-blue-100">
              <Users className="w-5 h-5" />
              <span className="text-sm">
                Al meer dan 1000+ tevreden huisgenoten
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Creative Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="relative px-3 sm:px-4 py-12 bg-gradient-to-b from-gray-50 to-gray-100/50 overflow-hidden"
      >
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -right-24 -bottom-24 w-96 h-96 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              rotate: [360, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{ 
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -left-24 -bottom-24 w-96 h-96 bg-gradient-to-br from-indigo-100/20 to-blue-100/20 rounded-full blur-3xl"
          />
        </div>

        {/* Footer Content */}
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Creator Badge */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="group relative"
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
                  <span className="font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    @jelmer_hb
                  </span>
                </div>
              </a>
            </motion.div>

            {/* Additional Links */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <motion.a
                whileHover={{ y: -2 }}
                href="#"
                className="hover:text-blue-600 transition-colors duration-200"
              >
                Privacy
              </motion.a>
              <motion.a
                whileHover={{ y: -2 }}
                href="#"
                className="hover:text-blue-600 transition-colors duration-200"
              >
                Terms
              </motion.a>
              <motion.a
                whileHover={{ y: -2 }}
                href="#"
                className="hover:text-blue-600 transition-colors duration-200"
              >
                Contact
              </motion.a>
            </div>

            {/* Copyright */}
            <div className="text-sm text-gray-400">
              © {new Date().getFullYear()} Lijssie. All rights reserved.
            </div>
          </div>
        </div>
      </motion.footer>

      <InstallDrawer 
        isOpen={isInstallDrawerOpen}
        onOpenChange={setIsInstallDrawerOpen}
      />
    </div>
  );
} 
