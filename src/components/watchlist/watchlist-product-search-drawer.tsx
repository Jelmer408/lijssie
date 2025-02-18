import { useEffect, useState, useMemo } from 'react';
import { Search, Loader2, Plus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import Fuse from 'fuse.js';

interface WatchlistProductSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery?: string;
  onProductSelect: (productId: string) => Promise<void>;
}

interface Product {
  id: string;
  title: string;
  image_url: string | null;
  quantity_info: string | null;
  category: string | null;
  subcategory: string | null;
}

// Configure Fuse with more lenient fuzzy search settings
const fuseOptions = {
  keys: [
    { name: 'title', weight: 2 },
    { name: 'quantity_info', weight: 0.5 },
    { name: 'subcategory', weight: 0.3 }
  ],
  includeScore: true,
  threshold: 0.6, // More lenient threshold
  distance: 200, // Increased distance
  minMatchCharLength: 2,
  shouldSort: true,
  findAllMatches: true,
  location: 0,
  ignoreLocation: true,
};

export function WatchlistProductSearchDrawer({
  isOpen,
  onClose,
  searchQuery: initialSearchQuery = '',
  onProductSelect,
}: WatchlistProductSearchDrawerProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Add debounced search function
  const [debouncedSearch] = useState(() => {
    let timeout: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (query.trim()) {
          searchProducts(query);
        }
      }, 300);
    };
  });

  // Function to search products in database
  const searchProducts = async (query: string) => {
    if (!query.trim()) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`title.ilike.%${query}%,quantity_info.ilike.%${query}%,subcategory.ilike.%${query}%`)
        .order('title');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error searching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial products or search based on query
  useEffect(() => {
    async function fetchProducts() {
      if (!isOpen) return;

      try {
        setIsLoading(true);
        if (initialSearchQuery) {
          await searchProducts(initialSearchQuery);
        } else {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('title')
            .limit(100); // Limit initial load

          if (error) throw error;
          setProducts(data || []);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [isOpen, initialSearchQuery]);

  const handleProductClick = async (productId: string) => {
    setSelectedProduct(productId);
    try {
      await onProductSelect(productId);
      onClose();
    } catch (error) {
      console.error('Error selecting product:', error);
    } finally {
      setSelectedProduct(null);
    }
  };

  // Filter and sort products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;

    const fuse = new Fuse<Product>(products, fuseOptions);
    const searchResults = fuse.search(searchQuery);
    return searchResults.map(result => result.item);
  }, [searchQuery, products]);

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[75vh] min-h-[75vh]">
        <div className="space-y-4 p-4 h-full overflow-y-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                debouncedSearch(query);
              }}
              placeholder="Zoek een product..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'Geen producten gevonden' : 'Begin met zoeken'}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer transition-all",
                    "hover:border-blue-200 hover:bg-blue-50/50",
                    selectedProduct === product.id && "border-blue-500 bg-blue-50"
                  )}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {product.title}
                    </h3>
                    {(product.quantity_info || product.subcategory) && (
                      <p className="text-sm text-gray-500 truncate">
                        {product.quantity_info || product.subcategory}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product.id);
                    }}
                    disabled={selectedProduct === product.id}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      selectedProduct === product.id
                        ? "bg-blue-100 text-blue-700"
                        : "bg-blue-50 hover:bg-blue-100 text-blue-600"
                    )}
                  >
                    {selectedProduct === product.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Toevoegen</span>
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 