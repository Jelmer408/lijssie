import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { Input } from "@/components/ui/input"
import { ChevronDown } from 'lucide-react';
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from "@/lib/utils"
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Camera } from 'lucide-react'
import { recipeVisionService } from '@/services/recipe-vision-service';
import { useHousehold } from '@/contexts/household-context'
import { useAuth } from '@/contexts/auth-context'
import { DatePicker } from "@/components/ui/date-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ReceiptItemsDrawer } from './receipt-items-drawer';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  paid_by: string;
  date: string;
  split_type: 'equal' | 'percentage' | 'fixed' | 'shares';
  created_at: string;
  store_name?: string;
  emoji: string;
  type: 'expense' | 'income' | 'transfer';
  expense_shares: {
    user_id: string;
    amount: number;
    shares: number;
  }[];
  has_receipt_items: boolean;
}

interface FinanceViewProps {
  isAddExpenseOpen: boolean;
  setIsAddExpenseOpen: (open: boolean) => void;
}

interface ReceiptItem {
  name: string;
  originalPrice: number;
  discountedPrice?: number;
  quantity: number;
  selected?: boolean;
}

interface NewExpense {
  type: 'expense' | 'income' | 'transfer';
  title: string;
  amount: string;
  paidBy: string;
  date: Date;
  splitType: 'equal' | 'percentage' | 'fixed' | 'shares';
  sharedWith: string[];
  shares: { [key: string]: number };
  splits: { [key: string]: number };
  emoji: string;
  storeName?: string;
  receiptItems?: ReceiptItem[];
}

interface HouseholdMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

// Add ReceiptItemsList component before FinanceView
function ReceiptItemsList({ transactionId }: { transactionId: string }) {
  const [items, setItems] = useState<{
    id: string;
    name: string;
    original_price: number;
    discounted_price?: number;
    quantity: number;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { data, error } = await supabase
          .from('receipt_items')
          .select('*')
          .eq('expense_id', transactionId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setItems(data || []);
      } catch (error) {
        console.error('Error fetching receipt items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [transactionId]);

  if (isLoading) {
    return (
      <div className="py-2 text-center text-sm text-gray-500">
        Laden...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex justify-between text-sm">
          <div className="flex-1">
            <div className="font-medium">{item.name}</div>
            {item.quantity > 1 && (
              <div className="text-xs text-gray-500">
                {item.quantity}x à €{(item.discounted_price || item.original_price).toFixed(2)}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className={cn(
              "text-right",
              item.discounted_price && "line-through text-gray-400"
            )}>
              €{(item.original_price * item.quantity).toFixed(2)}
            </div>
            {item.discounted_price && (
              <div className="text-green-600">
                €{(item.discounted_price * item.quantity).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FinanceView({ isAddExpenseOpen, setIsAddExpenseOpen }: FinanceViewProps) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'balance' | 'settlements'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  
  // Initialize newExpense with empty arrays/objects
  const [newExpense, setNewExpense] = useState<NewExpense>({
    type: 'expense',
    title: '',
    amount: '',
    paidBy: 'you',
    date: new Date(),
    splitType: 'shares',
    sharedWith: [],
    shares: {},
    splits: {},
    emoji: '🛒'
  });

  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [selectedShare, setSelectedShare] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Transaction | null>(null);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const { toast } = useToast();
  const { household } = useHousehold();
  const { user } = useAuth();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isEditDatePickerOpen, setIsEditDatePickerOpen] = useState(false);
  const [isReceiptItemsDrawerOpen, setIsReceiptItemsDrawerOpen] = useState(false);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [previousDrawerState, setPreviousDrawerState] = useState(false);
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());

  // Reset form when drawer is closed
  useEffect(() => {
    if (!isAddExpenseOpen) {
      resetForm();
    }
  }, [isAddExpenseOpen]);

  // Fetch current user when component mounts
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get household ID
        const { data: member } = await supabase
          .from('household_members')
          .select('household_id')
          .eq('user_id', user.id)
          .single();

        if (!member) return;

        // Set current user with household ID
        setCurrentUser({ ...user, household_id: member.household_id });
      } catch (error) {
        console.error('Error fetching current user:', error);
        setIsLoading(false);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch household members when current user changes
  useEffect(() => {
    const fetchHouseholdMembers = async () => {
      if (!currentUser?.household_id) return;

      try {
        const { data } = await supabase
          .from('household_members')
          .select('user_id, user_name, user_avatar')
          .eq('household_id', currentUser.household_id);

        if (data) {
          const members: HouseholdMember[] = data.map(m => ({
            user_id: m.user_id,
            display_name: m.user_name || 'Unknown',
            avatar_url: m.user_avatar
          }));
          
          setHouseholdMembers(members);
        }
      } catch (error) {
        console.error('Error fetching household members:', error);
        toast({
          title: "Fout bij ophalen",
          description: "Er ging iets mis bij het ophalen van de huisgenoten.",
          variant: "destructive"
        });
      }
    };

    fetchHouseholdMembers();
  }, [currentUser?.household_id]);

  // Fetch transactions when current user changes
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!currentUser?.household_id) return;

      try {
        const { data: expenses, error } = await supabase
          .from('expenses')
          .select(`
            *,
            expense_shares (
              user_id,
              amount,
              shares
            )
          `)
          .eq('household_id', currentUser.household_id)
          .order('date', { ascending: false });

        if (error) throw error;
        if (expenses) {
          setTransactions(expenses);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast({
          title: "Fout bij ophalen",
          description: "Er ging iets mis bij het ophalen van de uitgaven.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [currentUser?.household_id]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    return transactions.reduce((groups, transaction) => {
      const date = new Date(transaction.date).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    }, {} as { [key: string]: Transaction[] });
  }, [transactions]);

  const calculateSplits = (shares: { [key: string]: number }, amount: number) => {
    const totalShares = Object.values(shares).reduce((sum, share) => sum + share, 0);
    if (totalShares === 0) return {};

    const amountPerShare = amount / totalShares;
    return Object.fromEntries(
      Object.entries(shares).map(([person, shares]) => [
        person,
        shares * amountPerShare
      ])
    );
  };

  const handleSplitEqually = () => {
    const amount = parseFloat(newExpense.amount);
    if (!amount) return;

    // Create equal shares for all members
    const equalShares = Object.fromEntries(
      newExpense.sharedWith.map(person => [person, 1])
    );

    // Calculate splits based on equal shares
    const splits = calculateSplits(equalShares, amount);

    setNewExpense(prev => ({
      ...prev,
      splitType: 'equal',
      shares: equalShares,
      splits: splits
    }));
  };

  const handlePersonalShareChange = (person: string, change: number) => {
    const amount = parseFloat(newExpense.amount);
    if (!amount) {
      toast({
        title: "Vul eerst een bedrag in",
        description: "Je moet eerst een bedrag invullen voordat je de verdeling kan aanpassen.",
        variant: "destructive"
      });
      return;
    }

    const currentShares = newExpense.shares[person] || 0;
    const newShareCount = Math.max(0, currentShares + change); // Prevent negative shares
    const newShares = { 
      ...newExpense.shares,
      [person]: newShareCount
    };

    setNewExpense(prev => ({
      ...prev,
      splitType: 'shares',
      shares: newShares,
      splits: calculateSplits(newShares, amount)
    }));
  };

  // Update newExpense when householdMembers changes
  useEffect(() => {
    if (householdMembers.length > 0 && currentUser) {
      const currentUserMember = householdMembers.find(m => m.user_id === currentUser.id);
      setNewExpense(prev => ({
        ...prev,
        paidBy: currentUserMember?.display_name || prev.paidBy,
        sharedWith: householdMembers.map(m => m.display_name),
        shares: Object.fromEntries(householdMembers.map(m => [m.display_name, 0]))
      }));
    }
  }, [householdMembers, currentUser]);

  // Also update the reset logic in handleSubmit
  // Reset form with current household members
  const resetForm = () => {
    const currentUserMember = householdMembers.find(m => m.user_id === currentUser?.id);
    setNewExpense({
      type: 'expense',
      title: '',
      amount: '',
      paidBy: currentUserMember?.display_name || 'you',
      date: new Date(),
      splitType: 'shares',
      sharedWith: householdMembers.map(m => m.display_name),
      shares: Object.fromEntries(householdMembers.map(m => [m.display_name, 0])),
      splits: {},
      emoji: '🛒'
    });
  };

  // Add this function to get emoji suggestions
  const getEmojiSuggestion = async (title: string) => {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': import.meta.env.VITE_GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Suggest a single emoji that best represents this Dutch expense description: "${title}". For example: "boodschappen" -> "🛒", "restaurant" -> "🍽️", "benzine" -> "⛽". Only respond with the emoji, nothing else.`
            }]
          }]
        })
      });

      const data = await response.json();
      const emoji = data.candidates[0].content.parts[0].text.trim();
      return emoji || '🛒';
    } catch (error) {
      console.error('Error getting emoji suggestion:', error);
      return '🛒';
    }
  };

  // Add this effect to update emoji when title changes
  useEffect(() => {
    if (newExpense.title) {
      getEmojiSuggestion(newExpense.title).then(emoji => {
        setNewExpense(prev => ({ ...prev, emoji }));
      });
    }
  }, [newExpense.title]);

  // Update handleSubmit to include emoji
  const handleSubmit = async () => {
    console.log('handleSubmit called');
    console.log('newExpense:', newExpense);
    
    if (!newExpense.title || !newExpense.amount) {
      toast({
        title: "Vul alle velden in",
        description: "Beschrijving en bedrag zijn verplicht.",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Ongeldig bedrag",
        description: "Vul een geldig bedrag in.",
        variant: "destructive"
      });
      return;
    }

    // For equal splits, ensure all shares are set to 1
    if (newExpense.splitType === 'equal') {
      newExpense.sharedWith.forEach(person => {
        newExpense.shares[person] = 1;
      });
    }

    const totalShares = Object.values(newExpense.shares).reduce((sum, share) => sum + share, 0);
    console.log('totalShares:', totalShares);
    
    if (totalShares === 0) {
      toast({
        title: "Geen verdeling",
        description: "Verdeel de uitgave eerst over de huisgenoten.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current user and household
      if (!currentUser?.household_id) {
        toast({
          title: "Niet ingelogd",
          description: "Je moet ingelogd zijn om uitgaven toe te voegen.",
          variant: "destructive"
        });
        return;
      }

      // Create the expense
      console.log('Creating expense...');
      const selectedPayer = householdMembers.find(m => m.display_name === newExpense.paidBy);
      if (!selectedPayer) {
        toast({
          title: "Ongeldige betaler",
          description: "De geselecteerde betaler kon niet worden gevonden.",
          variant: "destructive"
        });
        return;
      }

      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          household_id: currentUser.household_id,
          created_by: currentUser.id,
          paid_by: selectedPayer.user_id,
          title: newExpense.title,
          amount: amount,
          date: format(newExpense.date, 'yyyy-MM-dd'),
          split_type: 'shares',
          emoji: newExpense.emoji,
          type: newExpense.type,
          store_name: newExpense.storeName,
          has_receipt_items: newExpense.receiptItems && newExpense.receiptItems.length > 0
        })
        .select()
        .single();

      if (expenseError) {
        console.error('Error creating expense:', expenseError);
        throw expenseError;
      }
      if (!expense) throw new Error('No expense returned after insert');

      console.log('Created expense:', expense);

      // Create expense shares
      // First, get all shares with non-zero values
      const nonZeroShares = Object.entries(newExpense.shares)
        .filter(([_, shares]) => shares > 0);

      // Calculate the amount per person based on selected shares only
      const totalSelectedShares = nonZeroShares.reduce((sum, [_, shares]) => sum + shares, 0);
      const amountPerShare = amount / totalSelectedShares;

      // First calculate all shares to get the total others will pay
      const shares = nonZeroShares.map(([name, shares]) => {
        const member = householdMembers.find(m => m.display_name === name);
        if (!member) return null;
        
        const isPayingMember = member.user_id === selectedPayer.user_id;
        const memberAmount = amountPerShare * shares;

        // For income, we reverse the logic: payer receives negative (gives money) and others get positive (receive money)
        // For expense, we keep the existing logic: payer receives positive (gets paid back) and others get negative (need to pay)
        const signMultiplier = newExpense.type === 'income' ? -1 : 1;

        return {
          expense_id: expense.id,
          user_id: member.user_id,
          shares: shares,
          amount: isPayingMember ? 
            signMultiplier * memberAmount : // Payer amount
            signMultiplier * -memberAmount  // Others amount
        };
      }).filter((share): share is NonNullable<typeof share> => share !== null);

      // Calculate total amount others will pay/receive
      const totalOthersAmount = shares
        .filter(share => share.user_id !== selectedPayer.user_id)
        .reduce((sum, share) => sum + Math.abs(share.amount), 0);

      // Update payer's amount to be the sum of what others pay/receive
      const payerShare = shares.find(share => share.user_id === selectedPayer.user_id);
      if (payerShare) {
        // For income, payer gives money (negative), for expense payer receives money (positive)
        payerShare.amount = newExpense.type === 'income' ? -totalOthersAmount : totalOthersAmount;
      } else if (totalOthersAmount > 0) {
        // If payer is not in shares (has 0 shares), add their entry
        shares.push({
          expense_id: expense.id,
          user_id: selectedPayer.user_id,
          shares: 0,
          amount: newExpense.type === 'income' ? -totalOthersAmount : totalOthersAmount
        });
      }

      console.log('Creating shares:', shares);
      
      const { error: sharesError } = await supabase
        .from('expense_shares')
        .insert(shares);

      if (sharesError) {
        console.error('Error creating shares:', sharesError);
        throw sharesError;
      }

      // Insert receipt items if any
      if (newExpense.receiptItems && newExpense.receiptItems.length > 0) {
        const selectedItems = newExpense.receiptItems.filter(item => item.selected);
        
        const { error: itemsError } = await supabase
          .from('receipt_items')
          .insert(selectedItems.map(item => ({
            expense_id: expense.id,
            name: item.name,
            original_price: item.originalPrice,
            discounted_price: item.discountedPrice,
            quantity: item.quantity,
            store_name: newExpense.storeName
          })));

        if (itemsError) throw itemsError;
      }

      // Refresh transactions list
      const { data: updatedExpenses, error: refreshError } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_shares (
            user_id,
            amount,
            shares
          )
        `)
        .eq('household_id', currentUser.household_id)
        .order('date', { ascending: false });

      if (refreshError) throw refreshError;
      if (updatedExpenses) {
        setTransactions(updatedExpenses);
      }

      // Use the resetForm function instead of inline reset
      resetForm();

      // Close drawer
      setIsAddExpenseOpen(false);

      // Show success message
      toast({
        title: newExpense.type === 'income' ? "Inkomsten toegevoegd" : "Uitgave toegevoegd",
        description: `De ${newExpense.type === 'income' ? 'inkomsten zijn' : 'uitgave is'} succesvol toegevoegd.`,
      });

    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Fout bij toevoegen",
        description: `Er ging iets mis bij het toevoegen van de ${newExpense.type === 'income' ? 'inkomsten' : 'uitgave'}.`,
        variant: "destructive"
      });
    }
  };

  // Update handleDeleteExpense
  const handleDeleteExpense = async () => {
    if (!selectedExpense || !currentUser?.household_id) return;

    try {
      // Delete expense shares first
      const { error: sharesError } = await supabase
        .from('expense_shares')
        .delete()
        .eq('expense_id', selectedExpense.id);

      if (sharesError) throw sharesError;

      // Then delete the expense
      const { error: expenseError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', selectedExpense.id);

      if (expenseError) throw expenseError;

      // Refresh transactions list
      const { data: updatedExpenses, error: refreshError } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_shares (
            user_id,
            amount,
            shares
          )
        `)
        .eq('household_id', currentUser.household_id)
        .order('date', { ascending: false });

      if (refreshError) throw refreshError;
      if (updatedExpenses) {
        setTransactions(updatedExpenses);
      }

      // Close drawer
      setIsEditExpenseOpen(false);
      setSelectedExpense(null);

      // Show success message
      toast({
        title: "Uitgave verwijderd",
        description: "De uitgave is succesvol verwijderd.",
      });

    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Fout bij verwijderen",
        description: "Er ging iets mis bij het verwijderen van de uitgave.",
        variant: "destructive"
      });
    }
  };

  // Update handleUpdateExpense
  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense || !currentUser?.household_id) return;

    try {
      // Update expense
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({
          title: selectedExpense.title,
          amount: selectedExpense.amount,
          paid_by: selectedExpense.paid_by,
          date: selectedExpense.date,
          emoji: selectedExpense.emoji
        })
        .eq('id', selectedExpense.id);

      if (expenseError) throw expenseError;

      // Calculate total shares
      const totalShares = selectedExpense.expense_shares.reduce((sum, s) => sum + s.shares, 0);
      if (totalShares === 0) {
        // If no shares, set all amounts to 0
        for (const share of selectedExpense.expense_shares) {
          const { error: shareError } = await supabase
            .from('expense_shares')
            .update({
              amount: 0,
              shares: share.shares
            })
            .eq('expense_id', selectedExpense.id)
            .eq('user_id', share.user_id);

          if (shareError) throw shareError;
        }
      } else {
        // Calculate amount per share
        const amountPerShare = selectedExpense.amount / totalShares;

        // First calculate what others will pay
        const totalOthersPay = selectedExpense.expense_shares
          .filter(s => s.user_id !== selectedExpense.paid_by)
          .reduce((sum, s) => sum + (amountPerShare * s.shares), 0);

        // Update each share
        for (const share of selectedExpense.expense_shares) {
          const isPayingMember = share.user_id === selectedExpense.paid_by;
          const shareAmount = isPayingMember ? totalOthersPay : -(amountPerShare * share.shares);

          const { error: shareError } = await supabase
            .from('expense_shares')
            .update({
              amount: shareAmount,
              shares: share.shares
            })
            .eq('expense_id', selectedExpense.id)
            .eq('user_id', share.user_id);

          if (shareError) throw shareError;
        }
      }

      // Refresh transactions list
      const { data: updatedExpenses, error: refreshError } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_shares (
            user_id,
            amount,
            shares
          )
        `)
        .eq('household_id', currentUser.household_id)
        .order('date', { ascending: false });

      if (refreshError) throw refreshError;
      if (updatedExpenses) {
        setTransactions(updatedExpenses);
      }

      // Close drawer
      setIsEditExpenseOpen(false);
      setSelectedExpense(null);

      // Show success message
      toast({
        title: "Uitgave bijgewerkt",
        description: "De uitgave is succesvol bijgewerkt.",
      });

    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Fout bij bijwerken",
        description: "Er ging iets mis bij het bijwerken van de uitgave.",
        variant: "destructive"
      });
    }
  };

  // Add emoji suggestion for edit mode
  useEffect(() => {
    if (selectedExpense?.title && !selectedExpense.emoji) {
      getEmojiSuggestion(selectedExpense.title).then(emoji => {
        setSelectedExpense(prev => prev ? { ...prev, emoji } : null);
      });
    }
  }, [selectedExpense?.title]);

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !household?.id || !user) return;

    setIsProcessingReceipt(true);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Extract receipt data using Vision API
          const receiptData = await recipeVisionService.extractReceiptData(reader.result as string);
          
          // Get store name
          const storeName = receiptData.storeName || 'Onbekende winkel';

          // Update the new expense form with initial data, but without amount
          setNewExpense(prev => ({
            ...prev,
            title: 'Boodschappen', // Simplified title
            storeName: storeName, // Keep store name for receipt details
            emoji: '🛒'
          }));

          // Store current drawer state and open receipt items drawer
          setPreviousDrawerState(isAddExpenseOpen);
          setIsAddExpenseOpen(false);
          setReceiptItems(receiptData.items.map(item => ({
            ...item,
            selected: true
          })));
          setIsReceiptItemsDrawerOpen(true);

          // Clear progress after a short delay
          setTimeout(() => setIsProcessingReceipt(false), 500);
        } catch (error) {
          console.error('Error processing receipt:', error);
          toast({
            title: "Fout bij verwerken",
            description: "Kon de kassabon niet verwerken.",
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
      toast({
        title: "Fout bij uploaden",
        description: "Kon de afbeelding niet inlezen.",
        variant: "destructive"
      });
    }
  };

  // Update handleReceiptItemsSelect to restore the previous drawer state
  const handleReceiptItemsSelect = (items: ReceiptItem[], isConfirming: boolean = false) => {
    setReceiptItems(items);
    
    if (isConfirming) {
      // Calculate total amount from selected items only
      const totalAmount = items
        .filter(item => item.selected)
        .reduce((sum, item) => {
          const itemPrice = item.discountedPrice || item.originalPrice;
          return sum + (itemPrice * item.quantity);
        }, 0);

      // Update expense with selected items and total amount
      setNewExpense(prev => ({
        ...prev,
        amount: totalAmount.toFixed(2),
        receiptItems: items
      }));

      // Close receipt items drawer and restore previous drawer state
      setIsReceiptItemsDrawerOpen(false);
      setIsAddExpenseOpen(previousDrawerState);
    } else {
      // Just update the items without setting the amount
      setNewExpense(prev => ({
        ...prev,
        receiptItems: items
      }));
    }
  };

  // Add function to toggle receipt expansion
  const toggleReceiptExpansion = (transactionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening the edit drawer
    setExpandedReceipts(prev => {
      const next = new Set(prev);
      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }
      return next;
    });
  };

  return (
    <>
      <motion.div 
        className="flex flex-col h-full bg-gradient-to-b from-gray-50/50 to-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Sticky Tabs */}
        <div className="sticky top-0 px-4 pt-2 pb-3 bg-gradient-to-b from-gray-50/90 via-gray-50/90 to-gray-50/80 backdrop-blur-sm z-10">
          <div className="flex p-1 gap-1 bg-gray-100/80 backdrop-blur-sm rounded-xl">
            {[
              { id: 'transactions', label: 'Transacties' },
              { id: 'balance', label: 'Balans' },
              { id: 'settlements', label: 'Inzichten' }
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium capitalize rounded-lg transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Transactions list */}
        {activeTab === 'transactions' && (
          <div className="flex-1 overflow-y-auto px-4 pb-20">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Laden...</div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-4xl mb-4">💸</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Geen uitgaven gevonden</h3>
                <p className="text-gray-500 max-w-sm">
                  Begin met het toevoegen van uitgaven om ze hier te zien verschijnen.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedTransactions)
                  .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                  .map(([date, transactions]) => (
                    <div key={date}>
                      <div className="text-sm font-medium text-gray-500 mb-3">
                        {format(new Date(date), 'EEEE, d MMM', { locale: nl })}
                      </div>
                      <div className="space-y-2">
                        {transactions.map((transaction) => {
                          const userShare = transaction.expense_shares?.find(
                            share => share.user_id === currentUser?.id
                          );
                          const amount = userShare?.amount || 0;
                          const hasShare = userShare && userShare.shares > 0;
                          const isIncome = transaction.type === 'income';
                          const isExpanded = expandedReceipts.has(transaction.id);

                          return (
                            <motion.div
                              key={transaction.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-2"
                            >
                              <div
                                className={cn(
                                  "flex items-center justify-between p-3 backdrop-blur-sm rounded-xl border transition-all duration-200",
                                  isIncome 
                                    ? "bg-green-50/60 border-green-100/50 hover:bg-green-50/80"
                                    : "bg-white/60 border-gray-100/50 hover:bg-white/80",
                                  transaction.has_receipt_items && "pb-2"
                                )}
                              >
                                <div 
                                  className="flex-1 flex items-center gap-3 cursor-pointer"
                                  onClick={() => {
                                    setSelectedExpense(transaction);
                                    setIsEditExpenseOpen(true);
                                  }}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center text-2xl",
                                    isIncome && "bg-green-100/50"
                                  )}>
                                    {transaction.emoji}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{transaction.title}</div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                      <span>
                                        {isIncome ? 'Ontvangen door' : 'Betaald door'} {transaction.paid_by === currentUser?.id ? 'jou' : 
                                          householdMembers.find(m => m.user_id === transaction.paid_by)?.display_name || 'Onbekend'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {hasShare && (
                                    <div className={cn(
                                      "font-medium px-2.5 py-1 rounded-lg",
                                      amount > 0 
                                        ? "text-green-600 bg-green-50"
                                        : "text-red-600 bg-red-50"
                                    )}>
                                      {amount > 0 ? '+' : ''}€{Math.abs(amount).toFixed(2)}
                                    </div>
                                  )}
                                  {transaction.has_receipt_items && (
                                    <button
                                      onClick={(e) => toggleReceiptExpansion(transaction.id, e)}
                                      className={cn(
                                        "p-1.5 rounded-lg transition-colors",
                                        isExpanded ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-400"
                                      )}
                                    >
                                      <motion.div
                                        animate={{ rotate: isExpanded ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        <ChevronDown className="w-4 h-4" />
                                      </motion.div>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Expandable Receipt View */}
                              {transaction.has_receipt_items && (
                                <motion.div
                                  initial={false}
                                  animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 bg-white rounded-xl border border-gray-100 space-y-3">
                                    <div className="text-center space-y-1">
                                      <div className="text-lg font-semibold">{transaction.store_name || 'Kassabon'}</div>
                                      <div className="text-sm text-gray-500">{format(new Date(transaction.date), 'dd/MM/yyyy HH:mm')}</div>
                                    </div>
                                    
                                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                                    
                                    <div className="space-y-2">
                                      {/* Fetch and display receipt items */}
                                      <ReceiptItemsList transactionId={transaction.id} />
                                    </div>
                                    
                                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                                    
                                    <div className="flex justify-between text-sm font-medium">
                                      <span>Totaal</span>
                                      <span>€{transaction.amount.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Balance view */}
        {activeTab === 'balance' && (
          <div className="flex-1 overflow-y-auto px-4 pb-20">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Laden...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {householdMembers
                  .map((member) => {
                    const balance = member.user_id === currentUser?.id ? 
                      transactions.reduce((sum, transaction) => {
                        const share = transaction.expense_shares?.find(s => s.user_id === currentUser.id);
                        return sum + (share?.amount || 0);
                      }, 0) : 
                      transactions.reduce((sum, transaction) => {
                        const share = transaction.expense_shares?.find(s => s.user_id === member.user_id);
                        return sum + (share?.amount || 0);
                      }, 0);
                    
                    return { member, balance };
                  })
                  .sort((a, b) => b.balance - a.balance) // Sort by balance in descending order
                  .map(({ member, balance }) => (
                    <motion.div
                      key={member.user_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100/50"
                    >
                      <div className="flex items-center gap-3">
                        {member.avatar_url ? (
                          <img 
                            src={member.avatar_url} 
                            alt={member.display_name}
                            className="w-10 h-10 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 flex items-center justify-center shadow-sm">
                            <span className="text-sm font-medium">{member.display_name[0]}</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.user_id === currentUser?.id ? 'Jij' : member.display_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {balance > 0 ? 'Krijgt terug' : 'Moet betalen'}
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "font-medium px-3 py-1.5 rounded-lg",
                        balance > 0 
                          ? "text-green-600 bg-green-50"
                          : balance < 0
                            ? "text-red-600 bg-red-50"
                            : "text-gray-600 bg-gray-50"
                      )}>
                        {balance > 0 ? '+' : balance < 0 ? '-' : ''}€{Math.abs(balance).toFixed(2)}
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Insights tab */}
        {activeTab === 'settlements' && (
          <div className="flex-1 overflow-y-auto px-4 pb-20">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Inzichten</h3>
              <p className="text-gray-500 max-w-sm">
                Hier krijg je binnenkort slimme inzichten over je uitgavenpatroon en tips om je huishoudbudget te beheren.
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Add Expense Drawer */}
      <Drawer open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DrawerContent className="bg-gradient-to-b from-white to-gray-50/90 max-h-[92vh] z-[900]">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              await handleSubmit();
            }}
            className="mx-auto w-full max-w-md"
          >
            <div className="flex flex-col p-6">
              <div className="space-y-6">
                {/* Type selector tabs */}
                <div className="flex p-1 gap-1 bg-gray-100/80 backdrop-blur-sm rounded-xl">
                  {[
                    { id: 'expense', label: 'Uitgave', icon: '💸' },
                    { id: 'income', label: 'Inkomsten', icon: '💰' }
                  ].map((type) => (
                    <motion.button
                      key={type.id}
                      type="button"
                      onClick={() => setNewExpense(prev => ({ ...prev, type: type.id as 'expense' | 'income' }))}
                      className={cn(
                        "flex-1 px-4 py-2.5 text-sm font-medium capitalize rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                        newExpense.type === type.id
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Receipt Analysis Button */}
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
                    <div className="flex items-center justify-center gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-blue-600">
                        Kassabon verwerken...
                      </span>
                    </div>
                  ) : (
                    <label
                      htmlFor="receipt-image"
                      className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 group cursor-pointer transition-all duration-300"
                    >
                      <Camera className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                      <span className="text-sm text-gray-500 group-hover:text-gray-600">
                        Scan kassabon
                      </span>
                    </label>
                  )}
                </div>

                {/* Main inputs group */}
                <div className="space-y-4">
                  <div className="flex-1">
                    <Label htmlFor="title">Beschrijving</Label>
                    <Input
                      id="title"
                      required
                      value={newExpense.title}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Bijv. Boodschappen"
                      className="w-full rounded-xl border-2 border-gray-200 bg-white/50 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Bedrag</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 font-medium">€</span>
                      </div>
                      <Input
                        id="amount"
                        required
                        type="number"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0,00"
                        step="0.01"
                        min="0"
                        className="pl-8 rounded-xl border-2 border-gray-200 bg-white/50 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Paid by & Date in a grid */}
                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label>
                        {newExpense.type === 'income' ? 'Ontvangen door' : 'Betaald door'}
                      </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                            className="flex items-center justify-between w-full rounded-xl border-2 border-gray-200 bg-white/50 px-3 py-2 text-sm hover:bg-white/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        >
                          <div className="flex items-center gap-2">
                            {householdMembers.find(m => m.display_name === newExpense.paidBy)?.avatar_url ? (
                              <img 
                                src={householdMembers.find(m => m.display_name === newExpense.paidBy)?.avatar_url!}
                                alt={newExpense.paidBy}
                                className="w-6 h-6 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {newExpense.paidBy === 'you' ? 'J' : newExpense.paidBy[0]}
                                </span>
                              </div>
                            )}
                            <span className="font-medium text-gray-700">
                                {newExpense.paidBy === 'you' ? 'Jij' : newExpense.paidBy}
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </button>
                      </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 z-[1000]" align="start">
                        <div className="space-y-1">
                          {householdMembers.map((member) => (
                            <button
                              key={member.user_id}
                              type="button"
                              onClick={() => {
                                setNewExpense(prev => ({ ...prev, paidBy: member.display_name }));
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                newExpense.paidBy === member.display_name
                                  ? "bg-blue-50 text-blue-600"
                                  : "hover:bg-gray-100 text-gray-700"
                              )}
                            >
                              {member.avatar_url ? (
                                <img 
                                  src={member.avatar_url} 
                                  alt={member.display_name}
                                  className="w-6 h-6 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 flex items-center justify-center">
                                  <span className="text-xs font-medium">{member.display_name[0]}</span>
                                </div>
                              )}
                              <span>{member.display_name}</span>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Datum</Label>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(true)}
                      className="flex items-center justify-between w-full rounded-xl border-2 border-gray-200 bg-white/50 px-3 py-2 text-sm hover:bg-white/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">📅</span>
                        <span className="font-medium text-gray-700">
                          {format(newExpense.date, 'd MMM', { locale: nl })}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
                    <DatePicker
                      isOpen={isDatePickerOpen}
                      onClose={() => setIsDatePickerOpen(false)}
                      selectedDate={newExpense.date}
                      onSelect={(date) => {
                        setNewExpense(prev => ({ ...prev, date }));
                        setIsDatePickerOpen(false);
                      }}
                    />
                  </div>
                </div>

                {/* Split section with more sleek styling */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[15px] font-medium text-gray-900">Verdelen</h3>
                      <button 
                        type="button"
                        onClick={handleSplitEqually}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50/80"
                      >
                        Gelijk verdelen
                      </button>
                    </div>
                  <div className="space-y-2">
                    {newExpense.sharedWith.map((name) => (
                      <div key={name} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {householdMembers.find(m => m.display_name === name)?.avatar_url ? (
                            <img 
                              src={householdMembers.find(m => m.display_name === name)?.avatar_url!}
                              alt={name}
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 flex items-center justify-center shadow-sm flex-shrink-0">
                              <span className="text-sm font-medium">{name[0]}</span>
                            </div>
                          )}
                          <span className="text-[15px] font-medium text-gray-900 truncate">{name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center">
                            <div className="relative flex items-center">
                              <motion.div
                                className="absolute right-full mr-1"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ 
                                  width: selectedShare === name ? 28 : 0,
                                  opacity: selectedShare === name ? 1 : 0
                                }}
                                transition={{ duration: 0.2 }}
                                style={{ pointerEvents: selectedShare === name ? 'auto' : 'none' }}
                              >
                                <button 
                                  type="button"
                                  onClick={() => handlePersonalShareChange(name, -1)}
                                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  -
                                </button>
                              </motion.div>

                              <button 
                                type="button"
                                onClick={() => {
                                  handlePersonalShareChange(name, 1);
                                  if (selectedShare !== name) {
                                    setSelectedShare(name);
                                  }
                                }}
                                className="w-10 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200"
                              >
                                {newExpense.shares[name] || 0}×
                              </button>

                              <motion.div
                                className="absolute left-full ml-1"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ 
                                  width: selectedShare === name ? 28 : 0,
                                  opacity: selectedShare === name ? 1 : 0
                                }}
                                transition={{ duration: 0.2 }}
                                style={{ pointerEvents: selectedShare === name ? 'auto' : 'none' }}
                              >
                                <button 
                                  type="button"
                                  onClick={() => handlePersonalShareChange(name, 1)}
                                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  +
                                </button>
                              </motion.div>
                            </div>
                            </div>
                            <div className="w-20 text-right">
                              <span className="text-[15px] font-medium text-gray-700">
                                €{(newExpense.splits[name] || 0).toFixed(2)}
                              </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

               

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-3 text-sm font-medium border-2 border-transparent hover:border-blue-500/20 transition-all duration-200"
                >
                  {newExpense.type === 'income' ? 'Inkomsten Toevoegen' : 'Uitgave Toevoegen'}
                </button>
              </div>
            </div>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Edit Expense Drawer */}
      <Drawer open={isEditExpenseOpen} onOpenChange={setIsEditExpenseOpen}>
        <DrawerContent className="bg-gradient-to-b from-white to-gray-50/90 max-h-[92vh] z-[900]">
          {selectedExpense && (
            <div className="mx-auto w-full max-w-md">
              <form onSubmit={handleUpdateExpense}>
                <div className="flex flex-col p-6">
                  <div className="space-y-6">
                    <div className="flex-1">
                      <Label htmlFor="edit-title">Beschrijving</Label>
                      <Input
                        id="edit-title"
                        required
                        value={selectedExpense.title}
                        onChange={(e) => {
                          setSelectedExpense(prev => prev ? { ...prev, title: e.target.value } : null);
                          getEmojiSuggestion(e.target.value).then(emoji => {
                            setSelectedExpense(prev => prev ? { ...prev, emoji } : null);
                          });
                        }}
                        placeholder="Bijv. Boodschappen"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white/50 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-amount">Bedrag</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 font-medium">€</span>
                        </div>
                        <Input
                          id="edit-amount"
                          required
                          type="number"
                          value={selectedExpense.amount}
                          onChange={(e) => {
                            const newAmount = parseFloat(e.target.value);
                            if (isNaN(newAmount)) return;
                            setSelectedExpense(prev => {
                              if (!prev) return null;
                              const totalShares = prev.expense_shares.reduce((sum, s) => sum + s.shares, 0);
                              if (totalShares === 0) {
                                return {
                                  ...prev,
                                  amount: newAmount,
                                  expense_shares: prev.expense_shares.map(s => ({
                                    ...s,
                                    amount: 0
                                  }))
                                };
                              }
                              return {
                                ...prev,
                                amount: newAmount,
                                expense_shares: prev.expense_shares.map(s => ({
                                  ...s,
                                  amount: s.user_id === prev.paid_by ? 
                                    (newAmount * s.shares) / totalShares :
                                    -(newAmount * s.shares) / totalShares
                                }))
                              };
                            });
                          }}
                          placeholder="0,00"
                          step="0.01"
                          min="0"
                          className="pl-8 rounded-xl border-2 border-gray-200 bg-white/50 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    {/* Paid by & Date in a grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          {selectedExpense.type === 'income' ? 'Ontvangen door' : 'Betaald door'}
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center justify-between w-full rounded-xl border-2 border-gray-200 bg-white/50 px-3 py-2 text-sm hover:bg-white/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                            >
                              <div className="flex items-center gap-2">
                                {householdMembers.find(m => m.user_id === selectedExpense.paid_by)?.avatar_url ? (
                                  <img 
                                    src={householdMembers.find(m => m.user_id === selectedExpense.paid_by)?.avatar_url!}
                                    alt={householdMembers.find(m => m.user_id === selectedExpense.paid_by)?.display_name}
                                    className="w-6 h-6 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 flex items-center justify-center">
                                    <span className="text-sm font-medium">
                                      {householdMembers.find(m => m.user_id === selectedExpense.paid_by)?.display_name[0]}
                                    </span>
                                  </div>
                                )}
                                <span className="font-medium text-gray-700">
                                  {selectedExpense.paid_by === currentUser.id ? 'Jij' : 
                                    householdMembers.find(m => m.user_id === selectedExpense.paid_by)?.display_name}
                                </span>
                              </div>
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 z-[1000]" align="start">
                            <div className="space-y-1">
                              {householdMembers.map((member) => (
                                <button
                                  key={member.user_id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedExpense(prev => prev ? { ...prev, paid_by: member.user_id } : null);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                    selectedExpense.paid_by === member.user_id
                                      ? "bg-blue-50 text-blue-600"
                                      : "hover:bg-gray-100 text-gray-700"
                                  )}
                                >
                                  {member.avatar_url ? (
                                    <img 
                                      src={member.avatar_url} 
                                      alt={member.display_name}
                                      className="w-6 h-6 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 flex items-center justify-center">
                                      <span className="text-xs font-medium">{member.display_name[0]}</span>
                                    </div>
                                  )}
                                  <span>{member.display_name}</span>
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Datum</Label>
                        <button
                          type="button"
                          onClick={() => setIsEditDatePickerOpen(true)}
                          className="flex items-center justify-between w-full rounded-xl border-2 border-gray-200 bg-white/50 px-3 py-2 text-sm hover:bg-white/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">📅</span>
                            <span className="font-medium text-gray-700">
                              {format(new Date(selectedExpense.date), 'd MMM', { locale: nl })}
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </button>
                        <DatePicker
                          isOpen={isEditDatePickerOpen}
                          onClose={() => setIsEditDatePickerOpen(false)}
                          selectedDate={new Date(selectedExpense.date)}
                          onSelect={(date) => {
                            setSelectedExpense(prev => prev ? { ...prev, date: format(date, 'yyyy-MM-dd') } : null);
                            setIsEditDatePickerOpen(false);
                          }}
                        />
                      </div>
                    </div>

                    {/* Split section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[15px] font-medium text-gray-900">Verdelen</h3>
                        <button 
                          type="button"
                          onClick={() => {
                            // Split equally among all members
                            const totalMembers = selectedExpense.expense_shares.length;
                            const shareAmount = selectedExpense.amount / totalMembers;
                            const equalShares = selectedExpense.expense_shares.map(share => ({
                              ...share,
                              shares: 1,
                              amount: share.user_id === selectedExpense.paid_by ? shareAmount : -shareAmount
                            }));
                            setSelectedExpense(prev => prev ? {
                              ...prev,
                              expense_shares: equalShares
                            } : null);
                          }}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50/80"
                        >
                          Gelijk verdelen
                        </button>
                      </div>
                      <div className="space-y-2">
                        {selectedExpense.expense_shares.map((share) => {
                          const member = householdMembers.find(m => m.user_id === share.user_id);
                          if (!member) return null;
                          
                          return (
                            <div key={share.user_id} className="flex items-center justify-between py-1.5">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {member.avatar_url ? (
                                  <img 
                                    src={member.avatar_url}
                                    alt={member.display_name}
                                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 flex items-center justify-center shadow-sm flex-shrink-0">
                                    <span className="text-sm font-medium">{member.display_name[0]}</span>
                                  </div>
                                )}
                                <span className="text-[15px] font-medium text-gray-900 truncate">{member.display_name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center">
                                  <div className="relative flex items-center">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newShares = selectedExpense.expense_shares.map(s => {
                                          if (s.user_id === share.user_id) {
                                            return {
                                              ...s,
                                              shares: Math.max(0, (s.shares || 0) - 1)
                                            };
                                          }
                                          return s;
                                        });

                                        const totalShares = newShares.reduce((sum, s) => sum + s.shares, 0);
                                        if (totalShares === 0) {
                                          setSelectedExpense(prev => prev ? {
                                            ...prev,
                                            expense_shares: newShares.map(s => ({ ...s, amount: 0 }))
                                          } : null);
                                          return;
                                        }

                                        const amountPerShare = selectedExpense.amount / totalShares;
                                        const updatedShares = newShares.map(s => ({
                                          ...s,
                                          amount: -(amountPerShare * s.shares)
                                        }));

                                        const totalOthersPay = updatedShares
                                          .filter(s => s.user_id !== selectedExpense.paid_by)
                                          .reduce((sum, s) => sum + Math.abs(s.amount), 0);

                                        const finalShares = updatedShares.map(s => ({
                                          ...s,
                                          amount: s.user_id === selectedExpense.paid_by ? totalOthersPay : s.amount
                                        }));

                                        setSelectedExpense(prev => prev ? {
                                          ...prev,
                                          expense_shares: finalShares
                                        } : null);
                                      }}
                                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                      -
                                    </button>

                                    <div className="w-10 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 mx-1">
                                      {share.shares || 0}×
                                    </div>

                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newShares = selectedExpense.expense_shares.map(s => {
                                          if (s.user_id === share.user_id) {
                                            return {
                                              ...s,
                                              shares: (s.shares || 0) + 1
                                            };
                                          }
                                          return s;
                                        });

                                        const totalShares = newShares.reduce((sum, s) => sum + s.shares, 0);
                                        if (totalShares === 0) {
                                          setSelectedExpense(prev => prev ? {
                                            ...prev,
                                            expense_shares: newShares.map(s => ({ ...s, amount: 0 }))
                                          } : null);
                                          return;
                                        }

                                        const amountPerShare = selectedExpense.amount / totalShares;
                                        const updatedShares = newShares.map(s => ({
                                          ...s,
                                          amount: -(amountPerShare * s.shares)
                                        }));

                                        const totalOthersPay = updatedShares
                                          .filter(s => s.user_id !== selectedExpense.paid_by)
                                          .reduce((sum, s) => sum + Math.abs(s.amount), 0);

                                        const finalShares = updatedShares.map(s => ({
                                          ...s,
                                          amount: s.user_id === selectedExpense.paid_by ? totalOthersPay : s.amount
                                        }));

                                        setSelectedExpense(prev => prev ? {
                                          ...prev,
                                          expense_shares: finalShares
                                        } : null);
                                      }}
                                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                                <div className="w-20 text-right">
                                  <span className="text-[15px] font-medium text-gray-700">
                                    €{Math.abs(share.user_id === selectedExpense.paid_by ? 
                                       -(selectedExpense.amount * share.shares) / selectedExpense.expense_shares.reduce((sum, s) => sum + s.shares, 0) : 
                                       share.amount).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDeleteExpense}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Verwijderen
                      </Button>
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                      >
                        Opslaan
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Receipt Items Drawer */}
      <ReceiptItemsDrawer
        isOpen={isReceiptItemsDrawerOpen}
        onClose={() => setIsReceiptItemsDrawerOpen(false)}
        storeName={newExpense.storeName}
        items={receiptItems}
        onItemsSelect={handleReceiptItemsSelect}
      />
    </>
  );
} 