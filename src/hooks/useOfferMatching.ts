import { useState } from 'react';
import { aiService } from '../services/ai-service';

interface UseOfferMatchingProps {
  initialThreshold?: number;
  initialMatchCount?: number;
}

export function useOfferMatching({
  initialThreshold = 0.7,
  initialMatchCount = 10
}: UseOfferMatchingProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<{
    directMatches: any[];
    semanticMatches: any[];
  }>({
    directMatches: [],
    semanticMatches: []
  });

  const searchOffers = async (
    query: string,
    threshold = initialThreshold,
    matchCount = initialMatchCount
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const results = await aiService.matchOffers(query, threshold, matchCount);
      const formattedResults = aiService.formatMatchResults(results);
      
      setMatches(formattedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while searching offers');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    searchOffers,
    isLoading,
    error,
    matches,
  };
} 