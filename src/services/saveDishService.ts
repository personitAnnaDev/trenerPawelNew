/**
 * FAZA 3: save-dish Service
 *
 * Serwis do atomowego zapisu potrawy przez Edge Function.
 * Przenosi obliczenia i logikę zapisu na backend.
 */

import { supabase } from '@/utils/supabase';

export interface IngredientForSave {
  ingredient_id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_weight?: number;
}

export interface SaveDishRequest {
  name: string;
  category: string;
  ingredients_json: IngredientForSave[];
  instructions: string[];
  // Optional - przekaż jeśli już masz obliczone (np. z useMealNutrition)
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  calories?: number;
}

export interface SavedDish {
  id: string;
  name: string;
  category: string;
  ingredients_description: string;
  ingredients_json: IngredientForSave[];
  instructions: string[];
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  calories: number;
  category_id: string | null;
  user_id: string;
  created_at: string;
}

interface SaveDishResponse {
  success: boolean;
  dish?: SavedDish;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Zapisuje potrawę przez Edge Function.
 *
 * @param dish - dane potrawy do zapisania
 * @returns zapisana potrawa z id i created_at
 * @throws Error z polskim komunikatem dla użytkownika
 *
 * @example
 * const dish = await saveDishViaEdgeFunction({
 *   name: "Sałatka grecka",
 *   category: "Sałatki",
 *   ingredients_json: [
 *     { ingredient_id: "abc", name: "Pomidor", quantity: 150, unit: "gramy" },
 *   ],
 *   instructions: ["Pokrój pomidory"],
 * });
 */
export async function saveDishViaEdgeFunction(dish: SaveDishRequest): Promise<SavedDish> {
  // Get session for auth token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error('Musisz być zalogowany, aby zapisać potrawę');
  }

  // Call Edge Function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-dish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(dish),
    }
  );

  const data: SaveDishResponse = await response.json();

  if (!response.ok || !data.success) {
    // Map error codes to Polish messages
    const errorMessages: Record<string, string> = {
      UNAUTHORIZED: 'Musisz być zalogowany, aby zapisać potrawę',
      INVALID_TOKEN: 'Sesja wygasła. Zaloguj się ponownie.',
      VALIDATION_ERROR: data.error?.message || 'Nieprawidłowe dane potrawy',
      DUPLICATE_NAME: 'Potrawa o tej nazwie już istnieje',
      DUPLICATE_INGREDIENTS: 'Potrawa o identycznych składnikach już istnieje',
      CALCULATION_ERROR: 'Błąd obliczania wartości odżywczych',
      INSERT_ERROR: 'Błąd zapisu potrawy do bazy danych',
      INTERNAL_ERROR: 'Wystąpił nieoczekiwany błąd',
    };

    const code = data.error?.code || 'INTERNAL_ERROR';
    const message = errorMessages[code] || data.error?.message || 'Błąd zapisu potrawy';

    throw new Error(message);
  }

  if (!data.dish) {
    throw new Error('Brak danych potrawy w odpowiedzi');
  }

  return data.dish;
}

/**
 * Konwertuje format składników z NowaPotrawa do formatu Edge Function.
 *
 * @param ingredients - składniki z formatu NowaPotrawa
 * @returns składniki w formacie Edge Function
 */
export function convertIngredientsForSave(
  ingredients: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    unit_weight?: number;
  }>
): IngredientForSave[] {
  return ingredients.map((ing) => ({
    ingredient_id: ing.productId,
    name: ing.productName,
    quantity: ing.quantity,
    unit: ing.unit,
    unit_weight: ing.unit_weight,
  }));
}
