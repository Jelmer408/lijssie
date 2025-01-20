import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Trash2, ChevronDown, ChevronUp, Camera } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { savedListsService } from '@/services/saved-lists-service'
import { useToast } from '@/components/ui/use-toast'
import { groceryService } from '@/services/grocery-service'
import { useHousehold } from '@/contexts/household-context'
import { useAuth } from '@/contexts/auth-context'
import { SavedList, SavedListItem } from '@/types/saved-list'
import { ReceiptAnalysisModal } from './receipt-analysis-modal'

interface SavedListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNewList: () => void;
}

interface ListWithItems extends SavedList {
  items?: SavedListItem[];
  isExpanded?: boolean;
}

export function SavedListsModal({ isOpen, onClose, onAddNewList }: SavedListsModalProps) {
  const [lists, setLists] = useState<ListWithItems[]>([]);
  const [selectedList, setSelectedList] = useState<SavedList | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const { toast } = useToast();
  const { household } = useHousehold();
  const { user } = useAuth();

  // Load saved lists when modal opens
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
          quantity: item.quantity,
          emoji: item.emoji || '',
          priority: item.priority,
          completed: false,
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

  const handleDeleteList = async () => {
    if (!selectedList) return;

    try {
      await savedListsService.deleteList(selectedList.id);
      setLists(lists.filter(l => l.id !== selectedList.id));
      setIsDeleteDialogOpen(false);
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
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Opgeslagen Lijsten
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                onClick={onAddNewList}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 group transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                <span className="text-sm text-gray-500 group-hover:text-gray-600">
                  Huidige lijst opslaan
                </span>
              </motion.button>

              <motion.button
                onClick={() => setIsReceiptModalOpen(true)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 group transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Camera className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                <span className="text-sm text-gray-500 group-hover:text-gray-600">
                  Lijst van kassabon
                </span>
              </motion.button>
            </div>

            {/* Lists Container */}
            <ScrollArea className="h-[400px] pr-4">
              <AnimatePresence>
                {lists.length > 0 ? (
                  <div className="space-y-3">
                    {lists.map((list) => (
                      <motion.div
                        key={list.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <Card className="p-4 bg-white hover:shadow-md transition-all duration-300 group">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div 
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => toggleListExpansion(list.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-gray-900">
                                    {list.name}
                                  </h3>
                                  {list.isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                                {list.description && (
                                  <p className="text-sm text-gray-500 line-clamp-2">
                                    {list.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <motion.button
                                  onClick={() => handleAddToList(list)}
                                  className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors duration-200"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Plus className="h-4 w-4" />
                                </motion.button>
                                <motion.button
                                  onClick={() => {
                                    setSelectedList(list);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-200"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </motion.button>
                              </div>
                            </div>

                            {/* List Items Preview */}
                            <AnimatePresence>
                              {list.isExpanded && list.items && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="pt-2 space-y-2 border-t border-gray-100">
                                    {list.items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                                      >
                                        <span className="text-lg">{item.emoji}</span>
                                        <span className="text-sm text-gray-700">{item.name}</span>
                                        {item.quantity && (
                                          <span className="text-xs text-gray-400 ml-auto">
                                            {item.quantity}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
                      <Plus className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Geen opgeslagen lijsten
                    </h3>
                    <p className="text-sm text-gray-500 max-w-[280px]">
                      Sla je huidige boodschappenlijst op om hem later opnieuw te gebruiken
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white rounded-2xl border border-gray-100 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Lijst verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze lijst wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteList}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {household && (
        <ReceiptAnalysisModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            // Refresh the lists when a new one is added
            if (household?.id) {
              savedListsService.getLists(household.id)
                .then(async loadedLists => {
                  const listsWithItems = await Promise.all(
                    loadedLists.map(async list => {
                      const items = await savedListsService.getListItems(list.id);
                      return { ...list, items, isExpanded: false };
                    })
                  );
                  setLists(listsWithItems);
                })
                .catch(console.error);
            }
          }}
          householdId={household.id}
        />
      )}
    </>
  );
} 