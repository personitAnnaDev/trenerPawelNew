import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';

export interface SearchIngredient {
  id: string;
  name: string;
  unit: string;
  unit_weight: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

interface UseSearchIngredientsOptions {
  debounceMs?: number;
  limit?: number;
}

interface UseSearchIngredientsResult {
  results: SearchIngredient[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook do wyszukiwania składników przez PostgreSQL RPC.
 * Używa indeksu GIN dla szybkiego wyszukiwania (<5ms).
 *
 * @param searchTerm - tekst do wyszukania
 * @param options - opcje: debounceMs (default 300), limit (default 8)
 * @returns { results, isLoading, error }
 *
 * @example
 * const { results, isLoading } = useSearchIngredients(searchTerm);
 */
export function useSearchIngredients(
  searchTerm: string,
  options: UseSearchIngredientsOptions = {}
): UseSearchIngredientsResult {
  const { debounceMs = 300, limit = 8 } = options;

  const [results, setResults] = useState<SearchIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref do śledzenia aktualnego requestu (cancel outdated)
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Reset jeśli pusty search term
    if (!searchTerm || searchTerm.trim().length === 0) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Increment request ID
    const currentRequestId = ++requestIdRef.current;

    // Debounce timer
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('search_ingredients', {
          p_search_term: searchTerm.trim(),
          p_limit: limit
        });

        // Ignore outdated responses
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        if (rpcError) {
          throw rpcError;
        }

        setResults(data || []);
      } catch (err) {
        // Ignore outdated errors
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'Błąd wyszukiwania';
        setError(errorMessage);
        setResults([]);
      } finally {
        // Only update loading state for current request
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    // Cleanup: cancel timer on unmount or searchTerm change
    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, debounceMs, limit]);

  return { results, isLoading, error };
}
