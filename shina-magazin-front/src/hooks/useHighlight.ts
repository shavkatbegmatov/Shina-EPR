import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Hook to handle highlighting items from search results
 * Reads 'highlight' param from URL and clears it after animation
 */
export function useHighlight() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightId, setHighlightId] = useState<string | number | null>(null);

  // Read highlight param on mount and when URL changes
  useEffect(() => {
    const highlight = searchParams.get('highlight');
    if (highlight) {
      // Try to parse as number, otherwise keep as string
      const id = /^\d+$/.test(highlight) ? parseInt(highlight, 10) : highlight;
      setHighlightId(id);
    }
  }, [searchParams]);

  // Clear highlight from URL and state
  const clearHighlight = useCallback(() => {
    setHighlightId(null);

    // Remove highlight param from URL without causing navigation
    const newParams = new URLSearchParams(searchParams);
    if (newParams.has('highlight')) {
      newParams.delete('highlight');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return {
    highlightId,
    clearHighlight,
  };
}
