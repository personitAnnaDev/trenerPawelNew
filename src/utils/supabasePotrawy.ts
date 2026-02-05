import { supabase } from './supabase';
import { CreatedPotrawa } from '@/components/NowaPotrawa';

/**
 * Struktura Dish z nowym polem ingredients_json (jsonb).
 * ingredients_json przechowuje pełną listę składników potrawy w formacie:
 * [
 *   {
 *     ingredient_id: string,
 *     name: string,
 *     quantity: number,
 *     unit: string,
 *     unit_weight: number
 *   },
 *   ...
 * ]
 * Cała logika wyświetlania, edycji i przeliczania makro powinna korzystać z tego pola.
 */
export interface Dish {
  id: string;
  name: string;
  category: string;
  ingredients_description: string;
  ingredients_json?: any; // Nowe pole: pełna struktura składników (jsonb)
  instructions: string[];
  protein: number;
  fat: number;
  carbs: number;
  fiber: number; // Dodano błonnik
  calories: number;
  created_at: string;
  category_id?: string;
  user_id?: string;
  // usunięto client_insert_id
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

// Fetch all dishes for the current user
export const getPotrawy = async (): Promise<Dish[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Fetch a single dish by ID
export const getPotrawaById = async (id: string): Promise<Dish | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
};

// Save a new dish
/**
 * Dodawanie nowej potrawy – ingredients_json zapisuje pełną strukturę składników.
 */
export const savePotrawa = async (potrawa: Omit<Dish, 'id' | 'created_at' | 'user_id'>): Promise<Dish> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // usunięto sprawdzanie client_insert_id

  // Find category ID by name
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('name', potrawa.category)
    .single();

  const { data, error } = await supabase
    .from('dishes')
    .insert({
      name: potrawa.name,
      category: potrawa.category,
      ingredients_description: potrawa.ingredients_description,
      ingredients_json: potrawa.ingredients_json, // Nowe pole: pełna struktura składników
      instructions: potrawa.instructions,
      protein: potrawa.protein,
      fat: potrawa.fat,
      carbs: potrawa.carbs,
      fiber: potrawa.fiber || 0,
      calories: potrawa.calories,
      category_id: category?.id || null,
      user_id: user.id,
      // usunięto client_insert_id
    })
    .select()
    .single();

  if (error) {
    // Handle duplicate dish errors
    if (error.code === '23505' && error.message.includes('dishes_name_user_id_unique_idx')) {
      throw new Error('Potrawa o tej nazwie już istnieje. Wybierz inną nazwę.');
    }
    if (error.code === '23505' && error.message.includes('dishes_ingredients_user_id_unique_idx')) {
      throw new Error('Potrawa o identycznych składnikach już istnieje.');
    }
    throw error;
  }
  return data;
};

// Update an existing dish
/**
 * Edycja istniejącej potrawy – ingredients_json nadpisuje pełną strukturę składników.
 * Jeśli zmieniły się składniki, nadpisuje także ingredients_description.
 */
export const updatePotrawa = async (id: string, updates: Partial<Dish>): Promise<Dish> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // If category is being updated, find the new category ID
  let category_id = updates.category_id;
  if (updates.category && !category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('name', updates.category)
      .single();
    category_id = category?.id || null;
  }

  const { data, error } = await supabase
    .from('dishes')
    .update({
      ...updates,
      ingredients_json: updates.ingredients_json, // Nadpisanie pełnej struktury składników
      ingredients_description: updates.ingredients_description, // Nadpisanie opisu jeśli zmieniono składniki
      category_id
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a dish
export const deletePotrawa = async (id: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('dishes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
  return true;
};

// Fetch all categories
export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
};

// Save a new category
export const saveCategory = async (category: Omit<Category, 'id' | 'created_at'>): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: category.name })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update a category
export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a category
export const deleteCategory = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// Get dishes by category
export const getPotrawyByCategory = async (category: string): Promise<Dish[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('category', category)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Transform dish data for frontend compatibility
export const transformDishToFrontend = (dish: Dish): CreatedPotrawa => {
  return {
    id: dish.id, // Zostaw id jako string
    nazwa: dish.name,
    kategoria: dish.category,
    skladniki: dish.ingredients_description,
    instrukcja: Array.isArray(dish.instructions) ? dish.instructions : [dish.instructions || ''],
    macro: {
      białko: dish.protein || 0,
      tłuszcz: dish.fat || 0,
      węglowodany: dish.carbs || 0,
      błonnik: dish.fiber || 0 // Mapowanie błonnika
    },
    kcal: dish.calories || 0,
    ingredients_json: dish.ingredients_json || [], // Przekazanie pełnej struktury składników
    // usunięto client_insert_id
  };
};


// Product/Ingredient interfaces
/**
 * Product/Ingredient – dodano unit_weight (wymagane dla ingredients_json).
 */
export interface Product {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  unit: string;
  unit_weight: number;
  created_at: string;
}

// Fetch all products (ingredients) for the current user
export const getProducts = async (): Promise<Product[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
};

// Transform product data for frontend compatibility
export const transformProductToFrontend = (product: any) => {
  return {
    id: product.id,
    nazwa: product.name,
    kcal: product.calories || 0,
    macro: {
      białko: product.protein || 0,
      tłuszcz: product.fat || 0,
      węglowodany: product.carbs || 0,
      błonnik: product.fiber || 0 // Dodano błonnik do macro
    },
    unit: product.unit,
    unit_weight: product.unit_weight
  };
};

/**
 * Transformacja danych z frontu do formatu Dish.
 * ingredients_json przekazuje pełną strukturę składników do backendu.
 */
export const transformFrontendToDish = (potrawa: CreatedPotrawa): Omit<Dish, 'id' | 'created_at' | 'user_id'> => {
  return {
    name: potrawa.nazwa,
    category: potrawa.kategoria,
    ingredients_description: potrawa.skladniki,
    ingredients_json: potrawa.ingredients_json,
    instructions: potrawa.instrukcja,
    protein: potrawa.macro.białko,
    fat: potrawa.macro.tłuszcz,
    carbs: potrawa.macro.węglowodany,
    fiber: potrawa.macro.błonnik !== undefined ? potrawa.macro.błonnik : 0,
    calories: potrawa.kcal,
    // usunięto client_insert_id
  };
};
