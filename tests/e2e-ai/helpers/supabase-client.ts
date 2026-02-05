/**
 * Supabase Client for E2E AI Tests
 *
 * IMPORTANT: Uses the same Supabase client instance as the app
 * to ensure authentication sessions are shared with AIOptimizationService
 */

import { supabase } from '../../../src/utils/supabase'
import { Session } from '@supabase/supabase-js'

let currentSession: Session | null = null

/**
 * Initialize Supabase client with test credentials
 * Uses the same client instance as the production app
 */
export async function initializeSupabase() {
  // Use the existing supabase client from the app
  // This ensures the session is shared with AIOptimizationService

  // Authenticate with test user
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.VITE_TEST_USER_EMAIL!,
    password: process.env.VITE_TEST_USER_PASSWORD!,
  })

  if (error || !data.session) {
    throw new Error(`Failed to authenticate test user: ${error?.message}`)
  }

  currentSession = data.session
  console.log(`✅ Authenticated as: ${data.session.user.email}`)

  return supabase
}

/**
 * Get current Supabase client
 */
export function getSupabaseClient() {
  return supabase
}

/**
 * Get current session (for Edge Function calls)
 */
export function getSession(): Session {
  if (!currentSession) {
    throw new Error('No active session. Call initializeSupabase() first.')
  }
  return currentSession
}

/**
 * Get user ID for Edge Function requests
 */
export function getUserId(): string {
  return getSession().user.id
}

/**
 * Fetch real ingredients from database by names
 * Returns ONE ingredient per name, preferring 'gramy' unit
 * Filters by current test user's ingredients
 */
export async function fetchIngredientsByNames(names: string[]) {
  const client = getSupabaseClient()
  const userId = getUserId()

  const { data, error } = await client
    .from('ingredients')
    .select('*')
    .eq('user_id', userId)
    .in('name', names)

  if (error) {
    throw new Error(`Failed to fetch ingredients: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error(`No ingredients found for names: ${names.join(', ')}`)
  }

  // Group by name and pick best match (prefer 'gramy' unit, then any unit)
  const uniqueIngredients = new Map()

  for (const ingredient of data) {
    const currentBest = uniqueIngredients.get(ingredient.name)

    if (!currentBest) {
      uniqueIngredients.set(ingredient.name, ingredient)
    } else {
      // Prefer 'gramy' over other units
      if (ingredient.unit === 'gramy' && currentBest.unit !== 'gramy') {
        uniqueIngredients.set(ingredient.name, ingredient)
      }
    }
  }

  const result = Array.from(uniqueIngredients.values())

  // Check if we found all requested ingredients
  const foundNames = result.map(ing => ing.name)
  const missingNames = names.filter(name => !foundNames.includes(name))

  if (missingNames.length > 0) {
    throw new Error(
      `Missing ingredients: ${missingNames.join(', ')}\n` +
      `Found: ${foundNames.join(', ')}\n` +
      `Requested: ${names.join(', ')}`
    )
  }

  return result
}

/**
 * Fetch ingredients from a real dish in the database
 * Returns ingredients with their quantities from the dish recipe
 *
 * @param dishName - Name of the dish to fetch (e.g., "Pierś z kurczaka z ziemniakami")
 * @returns Array of ingredients with expanded data from ingredients table
 */
export async function fetchDishIngredients(dishName: string) {
  const client = getSupabaseClient()
  const userId = getUserId()

  // Fetch dish with its ingredients
  const { data: dish, error: dishError } = await client
    .from('dishes')
    .select('name, ingredients_json')
    .eq('user_id', userId)
    .eq('name', dishName)
    .single()

  if (dishError) {
    throw new Error(`Failed to fetch dish "${dishName}": ${dishError.message}`)
  }

  if (!dish || !dish.ingredients_json) {
    throw new Error(`Dish "${dishName}" not found or has no ingredients`)
  }

  const dishIngredients = dish.ingredients_json as Array<{
    ingredient_id: string
    name: string
    quantity: number
    unit: string
    unit_weight?: number
  }>

  // Fetch full ingredient data from ingredients table
  const ingredientIds = dishIngredients.map((ing: any) => ing.ingredient_id)
  const { data: fullIngredients, error: ingredientsError } = await client
    .from('ingredients')
    .select('*')
    .in('id', ingredientIds)

  if (ingredientsError) {
    throw new Error(`Failed to fetch ingredient details: ${ingredientsError.message}`)
  }

  // Merge dish quantities with ingredient nutritional data
  const result = dishIngredients.map((dishIng: any) => {
    const fullIng = fullIngredients?.find((ing: any) => ing.id === dishIng.ingredient_id)

    if (!fullIng) {
      throw new Error(`Ingredient "${dishIng.name}" (${dishIng.ingredient_id}) not found in database`)
    }

    return {
      id: fullIng.id,
      name: fullIng.name,
      unit: fullIng.unit,
      unit_weight: fullIng.unit_weight || 100,
      calories: parseFloat(fullIng.calories) || 0,
      protein: parseFloat(fullIng.protein) || 0,
      fat: parseFloat(fullIng.fat) || 0,
      carbs: parseFloat(fullIng.carbs) || 0,
      fiber: parseFloat(fullIng.fiber) || 0,
      // Dish-specific quantity and unit
      dish_quantity: dishIng.quantity,
      dish_unit: dishIng.unit,
    }
  })

  console.log(`✅ Fetched ${result.length} ingredients from dish "${dishName}"`)
  return result
}

/**
 * Convert ingredient quantity to grams
 * Handles 'szt' (pieces) by multiplying with unit_weight
 *
 * @param quantity - Quantity from dish recipe
 * @param unit - Unit from dish recipe ('szt', 'gramy', 'ml', etc.)
 * @param unitWeight - Weight of 1 piece in grams (from ingredients table)
 * @returns Quantity in grams
 */
export function convertToGrams(quantity: number, unit: string, unitWeight: number = 100): number {
  // Pieces need conversion
  if (unit === 'szt' || unit.includes('sztuk')) {
    return quantity * unitWeight
  }

  // Already in grams or ml (treat ml as grams for simplicity)
  return quantity
}

/**
 * Convert dish ingredients to AI request format
 * Properly handles unit conversion (pieces → grams)
 */
export function dishIngredientsToAIRequest(dishIngredients: any[]) {
  return dishIngredients.map((ing: any) => {
    // Convert quantity to grams for macro calculation
    const quantityInGrams = convertToGrams(ing.dish_quantity, ing.dish_unit, ing.unit_weight)

    return {
      id: ing.id,
      name: ing.name,
      quantity: quantityInGrams, // Always in grams now
      unit: 'gramy',
      calories: (ing.calories * quantityInGrams) / 100,
      protein: (ing.protein * quantityInGrams) / 100,
      fat: (ing.fat * quantityInGrams) / 100,
      carbs: (ing.carbs * quantityInGrams) / 100,
      fiber: (ing.fiber * quantityInGrams) / 100,
      original_unit: ing.dish_unit,
      original_quantity: ing.dish_quantity,
      unit_weight: ing.unit_weight || 100,
    }
  })
}

/**
 * Cleanup - sign out test user
 */
export async function cleanupSupabase() {
  await supabase.auth.signOut()
  currentSession = null
  console.log('✅ Signed out test user')
}
