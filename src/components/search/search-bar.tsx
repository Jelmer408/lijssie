import { useState } from 'react';
import { useAiSearch } from '../../hooks/use-ai-search';
import { SupermarketOffer } from '@/types/supabase';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

function OfferCard({ offer }: { offer: SupermarketOffer }) {
  const discountPercentage = offer.discount_percentage || 0;
  const formattedDiscount = discountPercentage > 0 ? `${discountPercentage}%` : 'No discount';

  return (
    <div className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {offer.image_url && (
        <img 
          src={offer.image_url} 
          alt={offer.product_name}
          className="w-full h-32 object-cover rounded-md mb-2"
        />
      )}
      <h3 className="font-semibold text-lg">{offer.product_name}</h3>
      <p className="text-gray-600">{offer.supermarket}</p>
      <div className="mt-2">
        <p className="text-green-600 font-medium">€{offer.offer_price}</p>
        {offer.original_price && (
          <p className="text-gray-400 line-through text-sm">€{offer.original_price}</p>
        )}
      </div>
      <div className="mt-1">
        <span className="inline-block px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded">
          {formattedDiscount}
        </span>
      </div>
    </div>
  );
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const { isLoading, error, directMatches, semanticMatches, searchOffers } = useAiSearch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    await searchOffers(query);
    onSearch(query);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for grocery items..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {directMatches.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Exact Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {directMatches.map((match: SupermarketOffer) => (
              <OfferCard key={match.id} offer={match} />
            ))}
          </div>
        </div>
      )}

      {semanticMatches.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Similar Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {semanticMatches.map((match: SupermarketOffer) => (
              <OfferCard key={match.id} offer={match} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && directMatches.length === 0 && semanticMatches.length === 0 && query && (
        <div className="text-center text-gray-500 py-8">
          No matches found for "{query}"
        </div>
      )}
    </div>
  );
} 