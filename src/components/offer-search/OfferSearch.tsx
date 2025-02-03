import { useState } from 'react';
import { useOfferMatching } from '../../hooks/useOfferMatching';

export function OfferSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const { searchOffers, isLoading, error, matches } = useOfferMatching();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    await searchOffers(searchQuery);
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for grocery items..."
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      <div className="results">
        {matches.directMatches.length > 0 && (
          <div className="direct-matches">
            <h2>Direct Matches</h2>
            {matches.directMatches.map((match) => (
              <div key={match.id} className="offer-card">
                <h3>{match.product_name}</h3>
                <p>{match.supermarket}</p>
                <p>Offer Price: {match.offer_price}</p>
                <p>Original Price: {match.original_price}</p>
                <p>Discount: {match.discount_percentage}%</p>
              </div>
            ))}
          </div>
        )}

        {matches.semanticMatches.length > 0 && (
          <div className="semantic-matches">
            <h2>Similar Items</h2>
            {matches.semanticMatches.map((match) => (
              <div key={match.id} className="offer-card">
                <h3>{match.product_name}</h3>
                <p>{match.supermarket}</p>
                <p>Offer Price: {match.offer_price}</p>
                <p>Original Price: {match.original_price}</p>
                <p>Discount: {match.discount_percentage}%</p>
                <p>Similarity: {(match.similarity * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 