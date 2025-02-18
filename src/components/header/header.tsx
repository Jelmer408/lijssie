import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import { Household } from '@/types/household'
import { AddProductDrawer } from '@/components/add-product-drawer'
import { useState } from 'react'
import { NewItemState, CreateGroceryItem, GroceryItem } from '@/types/grocery'
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { addGroceryItem } from '@/services/grocery-items-service'
import { supabase } from '@/lib/supabase'
import { toast } from "@/components/ui/use-toast"
import { useHousehold } from '@/contexts/household-context'

interface HeaderProps {
  user: User | null;
  household: Household | null;
  isOnline: boolean;
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  isHouseholdModalOpen: boolean;
  setIsHouseholdModalOpen: (isOpen: boolean) => void;
  activeView: 'list' | 'meals' | 'koken' | 'trends' | 'finance';
  setIsAddExpenseOpen: (isOpen: boolean) => void;
  items: GroceryItem[];
  optimalStores: { stores: string[]; totalPrice: number } | null;
  isAddProductDrawerOpen?: boolean;
  setIsAddProductDrawerOpen?: (isOpen: boolean) => void;
}

export function Header({
  user,
  household,
  isOnline,
  isHouseholdModalOpen,
  setIsHouseholdModalOpen,
  activeView,
  setIsAddExpenseOpen,
  items,
  isAddProductDrawerOpen = false,
  setIsAddProductDrawerOpen = () => {},
}: HeaderProps) {
  const { members } = useHousehold();

  const activeItems = items.filter(item => !item.completed)
  const purchasedItems = items.filter(item => item.completed)
  const priorityItems = items.filter(item => item.priority)

  // Add state for the new item
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
  })

  const handleItemChange = (item: NewItemState) => {
    setNewItem({
      ...item,
      emoji: item.emoji || '📦',
      user_id: user?.id || '',
      user_name: user?.user_metadata?.name || null,
      user_avatar: user?.user_metadata?.avatar_url || null,
      household_id: household?.id || ''
    });
  }

  const handleAddItem = async (item: CreateGroceryItem) => {
    if (!household?.id) return;
    
    try {
      const newItem: CreateGroceryItem = {
        ...item,
        user_id: user?.id || '',
        user_name: user?.user_metadata?.name || null,
        user_avatar: user?.user_metadata?.avatar_url || null,
        household_id: household.id
      };

      await addGroceryItem(newItem);
      setIsAddProductDrawerOpen(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  }

  return (
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
            {/* Settings Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center relative"
              onClick={() => setIsHouseholdModalOpen(true)}
            >
              {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                <>
                  <img
                    src={user.user_metadata.avatar_url || user.user_metadata.picture}
                    alt={user.user_metadata?.full_name || user.user_metadata?.name || 'User'}
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
                      {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 
                       user?.user_metadata?.name?.[0]?.toUpperCase() || 
                       user?.email?.[0]?.toUpperCase() || '?'}
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
            {/* Add Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group"
              onClick={(e) => {
                e.preventDefault();
                if (activeView === 'finance') {
                  setIsAddExpenseOpen(true);
                  setIsAddProductDrawerOpen(false);
                  setNewItem({
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
                } else {
                  setIsAddProductDrawerOpen(true);
                }
              }}
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full blur opacity-30 group-hover:opacity-75 transition duration-300" />
              <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-full shadow-lg transition-all duration-300">
                <Plus className="h-4 w-4 text-white" />
              </div>
            </motion.button>
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

      {/* Add Product Drawer - Only render when not in finance view */}
      {activeView !== 'finance' && (
        <AddProductDrawer
          isOpen={isAddProductDrawerOpen}
          onClose={() => {
            setIsAddProductDrawerOpen(false);
            setNewItem({
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
          }}
          newItem={newItem}
          onItemChange={handleItemChange}
          onAddItem={handleAddItem}
          householdId={household?.id || ''}
        />
      )}

      {/* Household Settings Drawer */}
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
                      <input
                        type="text"
                        value={household?.name || ''}
                        className="flex-1 px-3 py-2 bg-white rounded-xl border border-blue-100 text-blue-800 placeholder:text-blue-300"
                        placeholder="Voer een naam in"
                        readOnly
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Deze naam wordt gebruikt in de app en is zichtbaar voor alle huisgenoten
                    </p>
                  </div>

                  {/* Invite Code */}
                  <div>
                    <label className="text-sm font-medium text-blue-800 mb-2 block">
                      Uitnodigingscode
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={household?.invite_code || ''}
                        className="flex-1 px-3 py-2 bg-white rounded-xl border border-blue-100 text-blue-800 font-mono"
                        readOnly
                      />
                      <button
                        onClick={async () => {
                          if (household?.invite_code) {
                            await navigator.clipboard.writeText(household.invite_code);
                            toast({
                              title: "Gekopieerd!",
                              description: "De uitnodigingscode is gekopieerd naar je klembord.",
                            });
                          }
                        }}
                        className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-100 transition-colors duration-200"
                      >
                        Kopieer
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Deel deze code met anderen om ze uit te nodigen voor je huishouden
                    </p>
                  </div>

                  <div className="w-full h-px bg-blue-100/50" />

                  {/* Members List */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">Huisgenoten</h3>
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div 
                          key={member.user_id} 
                          className="flex items-center gap-2 p-2 rounded-xl bg-gray-50"
                        >
                          {member.user_avatar ? (
                            <img 
                              src={member.user_avatar} 
                              alt={member.user_name || 'User'}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {member.user_name?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-gray-600">
                            {member.user_name || member.email?.split('@')[0] || 'User'}
                          </span>
                          {member.user_id === user?.id && (
                            <span className="text-xs text-blue-600 ml-auto">Jij</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Leave Household Button */}
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={async () => {
                        if (!user?.id || !household?.id) return;
                        
                        try {
                          // Delete the household membership
                          const { error: membershipError } = await supabase
                            .from('household_members')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('household_id', household.id);
                          
                          if (membershipError) throw membershipError;
                          
                          // Close the dialog and refresh the page
                          setIsHouseholdModalOpen(false);
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
          </div>
        </DrawerContent>
      </Drawer>
    </motion.header>
  )
} 