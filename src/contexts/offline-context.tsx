import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import * as offlineStore from '@/lib/offline-store';
import { useAuth } from './auth-context';
import { useHousehold } from './household-context';
import { groceryService } from '@/services/grocery-service';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  syncPendingChanges: () => Promise<void>;
  lastSyncTimestamp: number | null;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { household } = useHousehold();

  // Function to check if we can reach Supabase
  const checkOnlineStatus = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      const isOnline = response.ok;
      setIsOnline(isOnline);
      return isOnline;
    } catch (error) {
      setIsOnline(false);
      return false;
    }
  }, []);

  // Sync changes when coming back online
  const syncPendingChanges = async () => {
    if (!user || !household?.id || !isOnline || isSyncing) return;

    try {
      setIsSyncing(true);
      
      // First, get the latest server data
      const serverItems = await groceryService.getActiveItems(household.id);
      
      // Store server items locally with timestamps
      await offlineStore.storeItemsLocally(serverItems);
      
      // Get pending changes
      const changes = await offlineStore.getPendingChanges();
      
      if (changes.length === 0) {
        setLastSyncTimestamp(Date.now());
        return;
      }

      // Process changes in order
      for (const change of changes) {
        try {
          switch (change.type) {
            case 'add':
              await groceryService.addItem(change.item, household.id);
              break;
            case 'update':
              await groceryService.updateItem(change.item.id, change.item);
              break;
            case 'delete':
              await groceryService.deleteItem(change.item.id);
              break;
          }
        } catch (error) {
          console.error(`Error processing change for item ${change.item.id}:`, error);
          // Continue with other changes
          continue;
        }
      }

      // Get final server state after all changes
      const finalServerItems = await groceryService.getActiveItems(household.id);
      await offlineStore.storeItemsLocally(finalServerItems);
      
      // Clear processed changes
      await offlineStore.clearProcessedChanges();
      
      setLastSyncTimestamp(Date.now());

      toast({
        title: "Synchronisatie voltooid ✨",
        description: `${changes.length} wijziging${changes.length === 1 ? '' : 'en'} gesynchroniseerd.`,
      });
    } catch (error) {
      console.error('Error syncing changes:', error);
      toast({
        title: "Synchronisatie fout",
        description: "Er ging iets mis bij het synchroniseren. Probeer het later opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle online status changes
  const handleOnline = useCallback(async () => {
    const isReachable = await checkOnlineStatus();
    if (isReachable) {
      setIsOnline(true);
      toast({
        title: "Je bent weer online! 🎉",
        description: "Je wijzigingen worden nu gesynchroniseerd.",
      });
      await syncPendingChanges();
    }
  }, [checkOnlineStatus, toast]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    toast({
      title: "Je bent offline 📡",
      description: "Je kunt nog steeds je lijst bekijken en bewerken.",
    });
  }, [toast]);

  useEffect(() => {
    // Initialize offline store
    offlineStore.initOfflineStore().catch(console.error);

    // Initial online status check and sync
    checkOnlineStatus().then(isOnline => {
      if (isOnline) {
        syncPendingChanges();
      }
    });

    // Set up online/offline listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic connection checking and syncing
    const intervalId = setInterval(async () => {
      const wasOnline = isOnline;
      const nowOnline = await checkOnlineStatus();
      
      if (!wasOnline && nowOnline) {
        handleOnline();
      } else if (wasOnline && !nowOnline) {
        handleOffline();
      } else if (nowOnline && !isSyncing) {
        // Periodic sync even if we stayed online
        await syncPendingChanges();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [handleOnline, handleOffline, checkOnlineStatus, isOnline, isSyncing]);

  useEffect(() => {
    if (!household?.id) return;


    // ... rest of the code ...
  }, [household?.id]);

  useEffect(() => {
    if (!household?.id) return;


    // ... rest of the code ...
  }, [household?.id]);

  return (
    <OfflineContext.Provider value={{ isOnline, isSyncing, syncPendingChanges, lastSyncTimestamp }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
} 