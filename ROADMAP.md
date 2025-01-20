# Saved Grocery Lists Feature Roadmap

## Overview
This feature will allow users to save their current grocery list as a template and load it back later. This is particularly useful for recurring shopping lists or common combinations of items.

## Database Schema
1. Create a new `saved_lists` table in Supabase:
```sql
create table saved_lists (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table saved_list_items (
  id uuid default uuid_generate_v4() primary key,
  list_id uuid references saved_lists(id) on delete cascade,
  name text not null,
  category text not null,
  quantity text,
  emoji text,
  priority boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## Implementation Steps

### 1. Backend Service (saved-lists-service.ts)
- [ ] Create service with methods:
  - `createList(name: string, description: string, items: GroceryItem[])`
  - `getLists()`
  - `getListItems(listId: string)`
  - `deleteList(listId: string)`
  - `updateList(listId: string, updates: Partial<SavedList>)`
  - `addItemsToGroceryList(listId: string)`

### 2. Types (types/saved-list.ts)
- [ ] Define interfaces:
```typescript
interface SavedList {
  id: string;
  name: string;
  description: string;
  household_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface SavedListItem {
  id: string;
  list_id: string;
  name: string;
  category: Category;
  quantity: string;
  emoji: string;
  priority: boolean;
  created_at: string;
}
```

### 3. UI Components

#### 3.1. SavedListsModal Component
- [ ] Create modal component for viewing and managing saved lists
- [ ] Features:
  - List of saved lists with names and descriptions
  - Preview items in each list
  - Add all items to current grocery list
  - Delete saved lists
  - Edit list names and descriptions

#### 3.2. SaveCurrentListModal Component
- [ ] Create modal for saving current list
- [ ] Features:
  - Input field for list name
  - Optional description field
  - Preview of items to be saved
  - Save button

#### 3.3. UI Integration
- [ ] Add "Save List" button in the grocery list header
- [ ] Add "Saved Lists" button in the grocery list header
- [ ] Add loading states and error handling
- [ ] Add success/error notifications using toast

### 4. Offline Support
- [ ] Update offline store to handle saved lists:
  - Cache saved lists locally
  - Queue changes for sync when online
  - Update service worker to cache saved lists endpoints

### 5. Testing
- [ ] Test offline functionality
- [ ] Test synchronization
- [ ] Test edge cases:
  - Empty lists
  - Duplicate list names
  - Large lists
  - Network errors

### 6. User Experience Enhancements
- [ ] Add animations for list operations
- [ ] Add confirmation dialogs for destructive actions
- [ ] Add loading states and progress indicators
- [ ] Add empty states and helpful messages

### 7. Security
- [ ] Ensure proper access control:
  - Users can only access lists in their household
  - Only authenticated users can create/modify lists
  - Validate input data

## Future Enhancements (v2)
1. Share lists between households
2. Categories/tags for lists
3. Favorite/pin frequently used lists
4. Import/export lists
5. List templates (e.g., "Weekly Basics", "Party Shopping", etc.)
6. Schedule recurring lists

## Technical Considerations
1. Optimize for offline-first experience
2. Handle concurrent edits gracefully
3. Implement proper error boundaries
4. Add analytics for feature usage
5. Consider rate limiting for list creation
6. Implement proper data validation

## Migration Plan
1. Create new database tables
2. Deploy backend changes
3. Deploy frontend changes
4. Monitor for any issues
5. Gather user feedback

## Success Metrics
1. Number of lists created
2. Frequency of list reuse
3. Time saved per shopping session
4. User satisfaction metrics
5. Feature adoption rate 