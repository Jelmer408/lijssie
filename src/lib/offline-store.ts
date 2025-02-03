import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { GroceryItem } from '@/types/grocery';

interface LijssieDB extends DBSchema {
  groceryItems: {
    key: string;
    value: GroceryItem & {
      localTimestamp: number;
      serverTimestamp?: number;
      version: number;
    };
    indexes: { 'by-household': string };
  };
  offlineChanges: {
    key: string;
    value: {
      type: 'update' | 'delete' | 'add';
      item: GroceryItem;
      timestamp: number;
      version: number;
    };
  };
}

const DB_NAME = 'lijssie-offline';
const DB_VERSION = 3;

let db: IDBPDatabase<LijssieDB> | null = null;
let dbInitPromise: Promise<IDBPDatabase<LijssieDB>> | null = null;
let initializationInProgress = false;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function closeExistingConnections(): Promise<void> {
  // Close any existing connection
  if (db) {
    try {
      db.close();
    } catch (error) {
      console.warn('Error closing existing database connection:', error);
    }
    db = null;
  }

  // Reset initialization state
  dbInitPromise = null;
  initializationInProgress = false;

  // Give time for connections to close
  await delay(100);
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const tempDb = await openDB(DB_NAME, DB_VERSION);
    const tx = tempDb.transaction('groceryItems', 'readonly');
    await tx.done;
    tempDb.close();
    return true;
  } catch (error) {
    console.warn('Database health check failed:', error);
    return false;
  }
}

export async function initOfflineStore(): Promise<IDBPDatabase<LijssieDB>> {
  // Prevent multiple simultaneous initializations
  if (initializationInProgress) {
    console.log('Initialization already in progress, waiting...');
    await delay(100);
    return initOfflineStore();
  }

  // If we already have a working database instance, return it
  if (db) {
    try {
      // Verify the connection is still valid
      const tx = db.transaction('groceryItems', 'readonly');
      await tx.done;
      return db;
    } catch (error) {
      console.warn('Existing database connection is invalid:', error);
      await closeExistingConnections();
    }
  }

  // If we're already initializing, wait for that to complete
  if (dbInitPromise) {
    try {
      return await dbInitPromise;
    } catch (error) {
      console.warn('Existing initialization promise failed:', error);
      await closeExistingConnections();
    }
  }

  initializationInProgress = true;

  try {
    // Check database health
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      console.log('Database is not healthy, closing connections and reinitializing...');
      await closeExistingConnections();
    }

    // Create a new initialization promise
    dbInitPromise = openDB<LijssieDB>(DB_NAME, DB_VERSION, {
      async upgrade(database, oldVersion, _newVersion, transaction) {
        console.log('Upgrading database from version', oldVersion, 'to', _newVersion);
        
        if (oldVersion < 1) {
          console.log('Creating initial database structure');
          const itemStore = database.createObjectStore('groceryItems', { keyPath: 'id' });
          itemStore.createIndex('by-household', 'household_id');
          
          database.createObjectStore('offlineChanges', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
        
        if (oldVersion < 2) {
          console.log('Upgrading to version 2: Adding timestamps and versions');
          const store = transaction.objectStore('groceryItems');
          const items = await store.getAll();
          
          for (const item of items) {
            if (!item.localTimestamp || !item.version) {
              item.localTimestamp = Date.now();
              item.version = 1;
              await store.put(item);
            }
          }
        }
      },
      blocked(currentVersion, blockedVersion) {
        console.warn(`Database upgrade blocked. Current version: ${currentVersion}, blocked version: ${blockedVersion}`);
      },
      blocking(currentVersion, blockedVersion) {
        console.warn(`Database is blocking version ${blockedVersion}. Current version: ${currentVersion}`);
        closeExistingConnections();
      },
      terminated() {
        console.warn('Database connection was terminated');
        closeExistingConnections();
      },
    });

    db = await dbInitPromise;
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    await closeExistingConnections();
    throw error;
  } finally {
    initializationInProgress = false;
  }
}

async function ensureDB(): Promise<IDBPDatabase<LijssieDB>> {
  let retries = 3;
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      if (!db) {
        db = await initOfflineStore();
      }

      // Verify the connection is still valid
      const tx = db.transaction('groceryItems', 'readonly');
      await tx.done;
      
      return db;
    } catch (error) {
      console.error(`Database connection failed, retries left: ${retries}`, error);
      lastError = error as Error;
      await closeExistingConnections();
      retries--;
      if (retries > 0) {
        await delay(500); // Longer delay between retries
      }
    }
  }

  throw lastError || new Error('Failed to ensure database connection after multiple retries');
}

// Store items locally with versioning
export async function storeItemsLocally(items: GroceryItem[]) {
  const database = await ensureDB();
  let retries = 3;

  while (retries > 0) {
    try {
      const tx = database.transaction('groceryItems', 'readwrite');
      const now = Date.now();
      
      await Promise.all([
        ...items.map(async item => {
          const existing = await tx.store.get(item.id);
          const version = existing ? existing.version + 1 : 1;
          
          return tx.store.put({
            ...item,
            localTimestamp: now,
            serverTimestamp: now,
            version
          });
        }),
        tx.done,
      ]);
      return;
    } catch (error) {
      console.error('Error storing items locally:', error);
      retries--;
      if (retries === 0) throw error;
      await delay(100);
    }
  }
}

// Get items from local store
export async function getLocalItems(householdId: string): Promise<GroceryItem[]> {
  const database = await ensureDB();
  let retries = 3;

  while (retries > 0) {
    try {
      const items = await database.getAllFromIndex('groceryItems', 'by-household', householdId);
      return items.map(({ localTimestamp, serverTimestamp, version, ...item }) => item);
    } catch (error) {
      console.error('Error getting local items:', error);
      retries--;
      if (retries === 0) return [];
      await delay(100);
    }
  }
  return [];
}

// Queue offline change with versioning
export async function queueOfflineChange(
  type: 'update' | 'delete' | 'add',
  item: GroceryItem
) {
  const database = await ensureDB();
  let retries = 3;

  while (retries > 0) {
    try {
      const tx = database.transaction(['offlineChanges', 'groceryItems'], 'readwrite');
      const timestamp = Date.now();
      
      // Get current version
      const existing = await tx.objectStore('groceryItems').get(item.id);
      const version = existing ? existing.version + 1 : 1;
      
      // Update local item
      if (type !== 'delete') {
        await tx.objectStore('groceryItems').put({
          ...item,
          localTimestamp: timestamp,
          version
        });
      }
      
      // Queue change
      await tx.objectStore('offlineChanges').add({
        type,
        item,
        timestamp,
        version
      });
      
      await tx.done;
      return;
    } catch (error) {
      console.error('Error queueing offline change:', error);
      retries--;
      if (retries === 0) throw error;
      await delay(100);
    }
  }
}

// Get pending changes ordered by timestamp
export async function getPendingChanges() {
  const database = await ensureDB();
  try {
    const changes = await database.getAll('offlineChanges');
    return changes.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Error getting pending changes:', error);
    return [];
  }
}

// Clear processed changes and update server timestamps
export async function clearProcessedChanges() {
  const database = await ensureDB();
  const tx = database.transaction(['offlineChanges', 'groceryItems'], 'readwrite');
  
  try {
    // Get all changes
    const changes = await tx.objectStore('offlineChanges').getAll();
    
    // Update server timestamps for processed items
    for (const change of changes) {
      if (change.type !== 'delete') {
        const item = await tx.objectStore('groceryItems').get(change.item.id);
        if (item) {
          item.serverTimestamp = Date.now();
          await tx.objectStore('groceryItems').put(item);
        }
      }
    }
    
    // Clear changes
    await tx.objectStore('offlineChanges').clear();
    await tx.done;
  } catch (error) {
    console.error('Error clearing processed changes:', error);
    throw error;
  }
}

// Update local item with versioning
export async function updateLocalItem(item: GroceryItem) {
  const database = await ensureDB();
  const tx = database.transaction('groceryItems', 'readwrite');
  
  try {
    const existing = await tx.store.get(item.id);
    const version = existing ? existing.version + 1 : 1;
    
    await tx.store.put({
      ...item,
      localTimestamp: Date.now(),
      version
    });
    
    await tx.done;
  } catch (error) {
    console.error('Error updating local item:', error);
    throw error;
  }
}

// Delete local item
export async function deleteLocalItem(id: string) {
  const database = await ensureDB();
  try {
    await database.delete('groceryItems', id);
  } catch (error) {
    console.error('Error deleting local item:', error);
    throw error;
  }
}

// Add local item with versioning
export async function addLocalItem(item: GroceryItem) {
  const database = await ensureDB();
  try {
    await database.put('groceryItems', {
      ...item,
      localTimestamp: Date.now(),
      serverTimestamp: undefined,
      version: 1
    });
  } catch (error) {
    console.error('Error adding local item:', error);
    throw error;
  }
}

// Clear specific changes
export async function clearSpecificChanges(changes: Array<{ type: string; item: GroceryItem; timestamp: number }>) {
  const database = await ensureDB();
  const tx = database.transaction('offlineChanges', 'readwrite');
  const store = tx.store;

  try {
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
  } catch (error) {
    console.error('Error clearing specific changes:', error);
    throw error;
  }
} 