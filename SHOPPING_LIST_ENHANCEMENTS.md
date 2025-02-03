# Shopping List Enhancements Implementation Guide

## 1. Product Matching System

### Initial Item Entry
- When a user types "bread", show a smart dropdown with:
  - Previously bought bread products
  - Popular bread products
  - Generic "bread" option
- Use fuzzy search to match product names
- Show product images in the dropdown for easy recognition

### Product Specificity Levels
1. **Generic Level** (e.g., "bread")
   - Show aggregated price range across all bread products
   - Display average prices across stores
   - Use 🍞 emoji for visual recognition

2. **Type Level** (e.g., "whole wheat bread")
   - Filter prices for this specific type
   - Show popular brands in this category
   - Compare prices across different brands

3. **Brand Level** (e.g., "Wonder Bread White")
   - Show exact prices across stores
   - Display price history for this specific product
   - Include product image and details

### Learning User Preferences
- Track which specific products users choose
- Remember brand preferences per category
- Build user profiles for product matching
- Use purchase history for smart suggestions

## 2. UI Implementation

### List View Design
```
┌─────────────────────────────────────┐
│ 🍞 Bread                     €2.19  │
│   Wonder Bread White         JUMBO  │
│   ├─ AH: €2.29                     │
│   ├─ Lidl: €2.15                   │
│   └─ Plus: €2.19                   │
│                                     │
│ 🥛 Milk                     €1.09   │
│   [Generic]                 ALDI    │
│   + Tap to specify brand           │
└─────────────────────────────────────┘
```

### Item Card Components
1. **Collapsed View**
   - Emoji + Generic name
   - Best current price
   - Best store badge
   - Expandable indicator

2. **Expanded View**
   - Product image
   - Brand and variant details
   - Price comparison across stores
   - Price history graph
   - "Find Similar" button

### Interaction Patterns
1. **Tap Actions**
   - Single tap: Expand/collapse details
   - Long press: Show quick actions
   - Swipe right: Mark as bought
   - Swipe left: Remove from list

2. **Product Selection**
   - Tap "+" to add new item
   - Smart search with autocomplete
   - Recent products section
   - Barcode scanner option

## 3. Data Structure

### Product Hierarchy
```typescript
interface GenericProduct {
  type: string;          // "bread"
  emoji: string;         // "🍞"
  category: string;      // "bakery"
  variants: ProductType[];
}

interface ProductType {
  name: string;          // "whole wheat bread"
  brands: BrandProduct[];
  averagePrice: number;
}

interface BrandProduct {
  brand: string;         // "Wonder"
  name: string;          // "Wonder Whole Wheat"
  image: string;
  prices: StorePrice[];
  nutrition: NutritionInfo;
}

interface StorePrice {
  store: string;
  price: number;
  lastUpdated: Date;
  isOnSale: boolean;
}
```

### Shopping List Item
```typescript
interface ShoppingListItem {
  id: string;
  genericType: string;
  specificProduct?: BrandProduct;
  quantity: number;
  addedAt: Date;
  completed: boolean;
  preferredStores: string[];
}
```

## 4. Implementation Phases

### Phase 1: Basic Product Matching
- Implement fuzzy search for product names
- Show simple dropdown with previous purchases
- Display basic price information
- Generic product categorization

### Phase 2: Enhanced Product Selection
- Add product images to selection UI
- Implement barcode scanner
- Add price comparison view
- Store user preferences

### Phase 3: Smart Features
- Price history tracking
- Preferred store learning
- Brand preference analysis
- Predictive suggestions

## 5. User Experience Considerations

### First-Time Experience
- Tutorial overlay explaining features
- Quick add common items
- Import previous shopping lists
- Suggest popular products

### Regular Usage
- Quick access to frequent items
- Smart sorting based on shopping patterns
- Offline support with cached prices
- Cross-device synchronization

### Power Users
- Keyboard shortcuts
- Bulk add functionality
- Custom categories
- Advanced filters

## 6. Technical Implementation

### Frontend Components
```typescript
// Smart Product Input
const ProductInput: React.FC = () => {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  
  // Fuzzy search implementation
  const updateSuggestions = async (query: string) => {
    const matches = await searchProducts(query);
    setSuggestions(matches);
  };
  
  return (
    <AutoComplete
      value={search}
      onChange={setSearch}
      suggestions={suggestions}
      onSelect={handleSelection}
    />
  );
};

// Product Card
const ProductCard: React.FC<{item: ShoppingListItem}> = ({item}) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <SwipeableCard>
      <ProductInfo item={item} />
      {expanded && <PriceComparison product={item.specificProduct} />}
      {expanded && <PriceHistory product={item.specificProduct} />}
    </SwipeableCard>
  );
};
```

### Backend APIs
```typescript
// Product Search
async function searchProducts(query: string): Promise<Product[]> {
  // Fuzzy search implementation
  const matches = await db.products
    .where('name')
    .matches(fuzzyQuery(query))
    .limit(10);
    
  return matches;
}

// Price Updates
async function updatePrices(productId: string): Promise<void> {
  const prices = await fetchLatestPrices(productId);
  await db.prices.upsert(prices);
}
```

## 7. Performance Optimization

### Caching Strategy
- Cache product images
- Store frequent searches
- Keep price history local
- Periodic price updates

### Data Loading
- Lazy load images
- Progressive product details
- Background price updates
- Optimistic UI updates

### Offline Support
- Store essential product data
- Queue updates for sync
- Local price cache
- Offline product search 