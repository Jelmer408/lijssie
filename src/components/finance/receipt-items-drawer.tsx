"use client"

import { motion } from 'framer-motion'
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from 'react'

interface ReceiptItem {
  name: string;
  originalPrice: number;
  discountedPrice?: number;
  quantity: number;
  selected?: boolean;
}

interface ReceiptItemsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storeName?: string;
  items: ReceiptItem[];
  onItemsSelect: (items: ReceiptItem[], isConfirming?: boolean) => void;
}

export function ReceiptItemsDrawer({
  isOpen,
  onClose,
  storeName,
  items,
  onItemsSelect
}: ReceiptItemsDrawerProps) {
  const [editingPrice, setEditingPrice] = useState<{ index: number; type: 'original' | 'discounted' } | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Calculate total amount of selected items
  const selectedTotal = items
    .filter(item => item.selected)
    .reduce((sum, item) => {
      const itemPrice = item.discountedPrice || item.originalPrice;
      return sum + (itemPrice * item.quantity);
    }, 0);

  const handlePriceUpdate = (index: number, type: 'original' | 'discounted', newPrice: number) => {
    const updatedItems = items.map((item, idx) => {
      if (idx === index) {
        if (type === 'original') {
          return {
            ...item,
            originalPrice: newPrice,
            // If original price is less than discounted, remove discount
            discountedPrice: item.discountedPrice && newPrice <= item.discountedPrice ? undefined : item.discountedPrice
          };
        } else {
          // For discounted price
          return {
            ...item,
            discountedPrice: newPrice === item.originalPrice ? undefined : newPrice
          };
        }
      }
      return item;
    });
    onItemsSelect(updatedItems);
  };

  const handleQuantityUpdate = (index: number, newQuantity: number) => {
    const updatedItems = items.map((item, idx) => 
      idx === index ? { ...item, quantity: Math.max(1, newQuantity) } : item
    );
    onItemsSelect(updatedItems);
  };

  const startEditing = (index: number, type: 'original' | 'discounted', currentValue: number) => {
    setEditingPrice({ index, type });
    setEditValue(currentValue.toFixed(2));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, type: 'original' | 'discounted' | 'quantity') => {
    if (e.key === 'Enter') {
      const newValue = parseFloat(editValue);
      if (!isNaN(newValue) && newValue >= 0) {
        if (type === 'quantity') {
          handleQuantityUpdate(index, newValue);
          setEditingQuantity(null);
        } else {
          handlePriceUpdate(index, type as 'original' | 'discounted', newValue);
          setEditingPrice(null);
        }
      }
    } else if (e.key === 'Escape') {
      setEditingPrice(null);
      setEditingQuantity(null);
    }
    e.stopPropagation();
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-gradient-to-b from-white to-gray-50/90 max-h-[92vh]">
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Producten van {storeName || 'kassabon'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Totaal geselecteerd: €{selectedTotal.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updatedItems = items.map(item => ({ ...item, selected: true }));
                    onItemsSelect(updatedItems);
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Alles selecteren
                </button>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {items.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-100 transition-colors duration-200 cursor-pointer"
                    onClick={() => {
                      const updatedItems = items.map((i, idx) =>
                        idx === index ? { ...i, selected: !i.selected } : i
                      );
                      onItemsSelect(updatedItems);
                    }}
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 bg-white">
                      {item.selected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3 h-3 rounded-full bg-blue-500"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                            {editingQuantity === index ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                                onBlur={() => {
                                  const newQuantity = parseInt(editValue);
                                  if (!isNaN(newQuantity) && newQuantity > 0) {
                                    handleQuantityUpdate(index, newQuantity);
                                  }
                                  setEditingQuantity(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="w-12 px-1 py-0.5 text-center text-xs border rounded"
                              />
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingQuantity(index);
                                  setEditValue(item.quantity.toString());
                                }}
                                className="text-xs text-gray-400 hover:text-blue-600 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100"
                              >
                                {item.quantity}×
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {editingPrice?.index === index && editingPrice.type === 'original' ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 'original')}
                              onBlur={() => {
                                const newPrice = parseFloat(editValue);
                                if (!isNaN(newPrice) && newPrice >= 0) {
                                  handlePriceUpdate(index, 'original', newPrice);
                                }
                                setEditingPrice(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="w-20 px-2 py-0.5 text-right border rounded"
                              step="0.01"
                            />
                          ) : (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(index, 'original', item.originalPrice);
                              }}
                              className={cn(
                                "cursor-pointer hover:text-blue-600 transition-colors px-2 py-0.5 rounded hover:bg-gray-100",
                                item.discountedPrice && "line-through text-gray-400"
                              )}
                            >
                              €{item.originalPrice.toFixed(2)}
                            </span>
                          )}
                          {(editingPrice?.index === index && editingPrice.type === 'discounted') ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 'discounted')}
                              onBlur={() => {
                                const newPrice = parseFloat(editValue);
                                if (!isNaN(newPrice) && newPrice >= 0) {
                                  handlePriceUpdate(index, 'discounted', newPrice);
                                }
                                setEditingPrice(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="w-20 px-2 py-0.5 text-right border rounded text-green-600"
                              step="0.01"
                            />
                          ) : item.discountedPrice ? (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(index, 'discounted', item.discountedPrice!);
                              }}
                              className="text-green-600 cursor-pointer hover:text-green-700 transition-colors px-2 py-0.5 rounded hover:bg-gray-100"
                            >
                              €{item.discountedPrice.toFixed(2)}
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(index, 'discounted', item.originalPrice * 0.9);
                              }}
                              className="text-xs text-gray-400 hover:text-blue-600 transition-colors px-2 py-0.5 rounded hover:bg-gray-100"
                            >
                              + korting
                            </button>
                          )}
                        </div>
                      </div>
                      {item.discountedPrice && (
                        <p className="text-xs text-green-600" onClick={(e) => e.stopPropagation()}>
                          Korting: €{(item.originalPrice - item.discountedPrice).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    onItemsSelect(items, true);
                    onClose();
                  }}
                  className="flex-1"
                >
                  Annuleren
                </Button>
                <Button
                  onClick={() => {
                    onItemsSelect(items, true);
                    onClose();
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Bevestigen (€{selectedTotal.toFixed(2)})
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 