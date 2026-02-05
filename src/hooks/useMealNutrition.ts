import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabase';

export interface MealIngredient {
  id: string;
  quantity: number;
  unit: string;
  unit_weight?: number;
}

export interface NutritionResult {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

interface UseMealNutritionOptions {
  debounceMs?: number;
}

interface UseMealNutritionResult {
  nutrition: NutritionResult;
  isLoading: boolean;
  error: string | null;
  recalculate: () => void;
}

const EMPTY_NUTRITION: NutritionResult = {
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0
};

/**
 * Hook do obliczania wartości odżywczych posiłku przez PostgreSQL RPC.
 * Przenosi obliczenia z frontendu na backend (FAZA 2 optymalizacji).
 *
 * @param ingredients - tablica składników z id, quantity, unit
 * @param options - opcje: debounceMs (default 300)
 * @returns { nutrition, isLoading, error, recalculate }
 *
 * @example
 * const ingredients = [
 *   { id: 'abc-123', quantity: 150, unit: 'gramy' },
 *   { id: 'def-456', quantity: 2, unit: 'sztuka', unit_weight: 50 }
 * ];
 * const { nutrition, isLoading } = useMealNutrition(ingredients);
 * // nutrition = { calories: 450, protein: 32.5, fat: 12.3, carbs: 45.2, fiber: 5.1 }
 */
export function useMealNutrition(
  ingredients: MealIngredient[],
  options: UseMealNutritionOptions = {}
): UseMealNutritionResult {
  const { debounceMs = 300 } = options;

  const [nutrition, setNutrition] = useState<NutritionResult>(EMPTY_NUTRITION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref do śledzenia aktualnego requestu (cancel outdated)
  const requestIdRef = useRef(0);

  // Stabilna referencja do ingredients dla porównania
  const ingredientsJsonRef = useRef<string>('');

  const fetchNutrition = useCallback(async (currentRequestId: number) => {
    // Puste składniki = zerowe wartości
    if (!ingredients || ingredients.length === 0) {
      setNutrition(EMPTY_NUTRITION);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Przygotuj dane dla RPC
    const ingredientsForRpc = ingredients.map(ing => ({
      id: ing.id,
      quantity: ing.quantity,
      unit: ing.unit,
      unit_weight: ing.unit_weight
    }));

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('calculate_meal_nutrition', {
        p_ingredients: ingredientsForRpc
      });

      // Ignore outdated responses
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (rpcError) {
        throw rpcError;
      }

      setNutrition(data || EMPTY_NUTRITION);
    } catch (err) {
      // Ignore outdated errors
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Błąd obliczania wartości odżywczych';
      setError(errorMessage);
      setNutrition(EMPTY_NUTRITION);
    } finally {
      // Only update loading state for current request
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [ingredients]);

  // Manualne wywołanie przeliczenia
  const recalculate = useCallback(() => {
    const currentRequestId = ++requestIdRef.current;
    fetchNutrition(currentRequestId);
  }, [fetchNutrition]);

  // Auto-fetch z debounce gdy ingredients się zmienią
  useEffect(() => {
    // Serializuj ingredients do porównania
    const ingredientsJson = JSON.stringify(
      ingredients.map(i => ({ id: i.id, quantity: i.quantity, unit: i.unit, unit_weight: i.unit_weight }))
    );

    // Jeśli ingredients się nie zmieniły, nie rób nic
    if (ingredientsJson === ingredientsJsonRef.current) {
      return;
    }
    ingredientsJsonRef.current = ingredientsJson;

    // Increment request ID
    const currentRequestId = ++requestIdRef.current;

    // Debounce timer
    const timer = setTimeout(() => {
      fetchNutrition(currentRequestId);
    }, debounceMs);

    // Cleanup: cancel timer on unmount or ingredients change
    return () => {
      clearTimeout(timer);
    };
  }, [ingredients, debounceMs, fetchNutrition]);

  return { nutrition, isLoading, error, recalculate };
}

/**
 * Synchroniczna wersja - oblicza natychmiast (bez debounce).
 * Użyj gdy potrzebujesz wyniku od razu (np. przy zapisie).
 */
export async function calculateMealNutritionSync(
  ingredients: MealIngredient[]
): Promise<NutritionResult> {
  if (!ingredients || ingredients.length === 0) {
    return EMPTY_NUTRITION;
  }

  const ingredientsForRpc = ingredients.map(ing => ({
    id: ing.id,
    quantity: ing.quantity,
    unit: ing.unit,
    unit_weight: ing.unit_weight
  }));

  const { data, error } = await supabase.rpc('calculate_meal_nutrition', {
    p_ingredients: ingredientsForRpc
  });

  if (error) {
    throw new Error(error.message);
  }

  return data || EMPTY_NUTRITION;
}
