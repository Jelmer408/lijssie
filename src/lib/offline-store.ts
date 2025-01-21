import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { GroceryItem } from '@/types/grocery';

interface LijssieDB extends DBSchema {
  groceryItems: {
    key: string;
    value: GroceryItem;
    indexes: { 'by-household': string };
  };
  offlineChanges: {
    key: string;
    value: {
      type: 'update' | 'delete' | 'add';
      item: GroceryItem;
      timestamp: number;
    };
  };
}

let db: IDBPDatabase<LijssieDB>;

export async function initOfflineStore() {
  db = await openDB<LijssieDB>('lijssie-offline', 1, {
    upgrade(db) {
      // Create stores
      const itemStore = db.createObjectStore('groceryItems', { keyPath: 'id' });
      itemStore.createIndex('by-household', 'household_id');
      
      db.createObjectStore('offlineChanges', {
        keyPath: 'id',
        autoIncrement: true,
      });
    },
  });
}

// Store items locally
export async function storeItemsLocally(items: GroceryItem[]) {
  const tx = db.transaction('groceryItems', 'readwrite');
  await Promise.all([
    ...items.map(item => tx.store.put(item)),
    tx.done,
  ]);
}

// Get items from local store
export async function getLocalItems(householdId: string): Promise<GroceryItem[]> {
  return db.getAllFromIndex('groceryItems', 'by-household', householdId);
}

// Queue offline change
export async function queueOfflineChange(
  type: 'update' | 'delete' | 'add',
  item: GroceryItem
) {
  await db.add('offlineChanges', {
    type,
    item,
    timestamp: Date.now(),
  });
}

// Get pending offline changes
export async function getPendingChanges() {
  return db.getAll('offlineChanges');
}

// Clear processed changes
export async function clearProcessedChanges() {
  const tx = db.transaction('offlineChanges', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

// Update local item
export async function updateLocalItem(item: GroceryItem) {
  await db.put('groceryItems', item);
}

// Delete local item
export async function deleteLocalItem(id: string) {
  await db.delete('groceryItems', id);
}

// Add local item
export async function addLocalItem(item: GroceryItem) {
  await db.add('groceryItems', item);
}

// Clear specific changes
export async function clearSpecificChanges(changes: Array<{ type: string; item: GroceryItem; timestamp: number }>) {
  const tx = db.transaction('offlineChanges', 'readwrite');
  const store = tx.store;

  // Get all changes
  const allChanges = await store.getAll();

  // Filter out the changes we want to remove
  const changesToKeep = allChanges.filter(existingChange => 
    !changes.some(changeToRemove => 
      changeToRemove.type === existingChange.type && 
      changeToRemove.item.id === existingChange.item.id && 
      changeToRemove.timestamp === existingChange.timestamp
    )
  );

  // Clear the store and add back the changes we want to keep
  await store.clear();
  await Promise.all(changesToKeep.map(change => store.add(change)));
  await tx.done;
} 