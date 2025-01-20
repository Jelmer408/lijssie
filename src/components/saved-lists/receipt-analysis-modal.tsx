import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Loader2, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { GroceryItem } from '@/types/grocery-item'
import { useAuth } from '@/contexts/auth-context'
import { savedListsService } from '@/services/saved-lists-service'
import { receiptVisionService } from '@/services/receipt-vision-service'

interface ReceiptAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
}

export function ReceiptAnalysisModal({ isOpen, onClose, householdId }: ReceiptAnalysisModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useAuth();

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const extractedItems = await receiptVisionService.extractItemsFromReceipt(base64);
      setItems(extractedItems);
      // Select all items by default
      setSelectedItems(new Set(extractedItems.map(item => item.id)));

      toast({
        title: "Bon geanalyseerd",
        description: `${extractedItems.length} producten gevonden.`,
      });
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      toast({
        title: "Fout bij analyseren",
        description: "Er ging iets mis bij het analyseren van de bon.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

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
      const selectedItemsList = items.filter(item => selectedItems.has(item.id));
      
      await savedListsService.createList({
        name: name.trim(),
        description: description.trim(),
        items: selectedItemsList.map(item => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          emoji: item.emoji || '🛒',
          priority: item.priority
        })),
        household_id: householdId,
        user_id: user.id
      });

      toast({
        title: "Lijst opgeslagen",
        description: "Je lijst is succesvol opgeslagen.",
      });

      setName('');
      setDescription('');
      setItems([]);
      setSelectedItems(new Set());
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
            Lijst maken van kassabon
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {items.length === 0 ? (
            <div className="space-y-4">
              <Label
                htmlFor="receipt-upload"
                className="w-full flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer group transition-all duration-300"
              >
                <Camera className="h-8 w-8 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    Upload een foto van je kassabon
                  </p>
                  <p className="text-sm text-gray-500">
                    Klik hier of sleep een foto
                  </p>
                </div>
                <Input
                  id="receipt-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={isAnalyzing}
                />
              </Label>

              {isAnalyzing && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Bon analyseren...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
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
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Beschrijving <span className="text-gray-400">(optioneel)</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Voeg een beschrijving toe..."
                  className="w-full rounded-xl border-gray-200 bg-white/50 focus:border-blue-500 focus:ring-blue-500/20 min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">
                    Gevonden producten ({selectedItems.size}/{items.length})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => setItems([])}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Opnieuw
                  </Button>
                </div>
                <ScrollArea className="h-[200px] w-full rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <AnimatePresence>
                    <div className="space-y-2">
                      {items.map((item) => (
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 