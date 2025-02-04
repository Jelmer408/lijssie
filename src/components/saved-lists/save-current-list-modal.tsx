import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from 'framer-motion'
import { savedListsService } from '@/services/saved-lists-service'
import { useToast } from '@/components/ui/use-toast'
import { GroceryItem } from '@/types/grocery'
import { useAuth } from '@/contexts/auth-context'

interface SaveCurrentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GroceryItem[];
  householdId: string;
}

export function SaveCurrentListModal({ isOpen, onClose, items, householdId }: SaveCurrentListModalProps) {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Filter out completed items
  const activeItems = items.filter(item => !item.completed);
  
  // Track selected items
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(activeItems.map(item => item.id)));

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Naam verplicht",
        description: "Geef je lijst een naam om hem op te slaan.",
        variant: "destructive"
      });
      return;
    }

    if (selectedItems.size === 0) {
      toast({
        title: "Geen items",
        description: "Selecteer ten minste één product om op te slaan.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Niet ingelogd",
        description: "Je moet ingelogd zijn om een lijst op te slaan.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      const selectedItemsList = activeItems.filter(item => selectedItems.has(item.id));
      
      await savedListsService.createList({
        name: name.trim(),
        description: '',
        items: selectedItemsList.map(item => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity || '1',
          emoji: item.emoji || '📦',
          priority: Boolean(item.priority),
          product_id: item.product_id || null
        })),
        household_id: householdId,
        user_id: user.id
      });

      toast({
        title: "Lijst opgeslagen",
        description: "Je boodschappenlijst is succesvol opgeslagen.",
      });

      setName('');
      onClose();
    } catch (error) {
      console.error('Error saving list:', error);
      toast({
        title: "Fout bij opslaan",
        description: "Er ging iets mis bij het opslaan van je lijst.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Lijst Opslaan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Naam
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Wekelijkse Boodschappen"
              className="w-full rounded-xl border-gray-200 bg-white/50 focus:border-blue-500 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Items om op te slaan ({selectedItems.size}/{activeItems.length})
            </Label>
            <ScrollArea className="h-[400px] w-full rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <AnimatePresence>
                {activeItems.length > 0 ? (
                  <div className="space-y-2">
                    {activeItems.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100 shadow-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
                        />
                        <span className="text-lg">{item.emoji}</span>
                        <span className="text-sm text-gray-700">{item.name}</span>
                        {item.quantity && (
                          <span className="text-xs text-gray-400 ml-auto">
                            {item.quantity}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <p className="text-sm text-gray-500">
                      Geen items om op te slaan. Voeg eerst items toe aan je boodschappenlijst.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Annuleren
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || selectedItems.size === 0}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
            >
              {isSaving ? (
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
      </DialogContent>
    </Dialog>
  );
} 