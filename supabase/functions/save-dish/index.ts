import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * FAZA 3: save-dish Edge Function
 *
 * Atomowy zapis potrawy z obliczeniami na backendzie:
 * - Oblicza makra przez PostgreSQL RPC (calculate_meal_nutrition)
 * - Pobiera category_id z tabeli categories
 * - Tworzy ingredients_description z ingredients_json
 * - Zapisuje wszystko w jednej transakcji
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

// ------------------------------
// CORS + response helpers
// ------------------------------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...CORS,
    ...(init.headers || {}),
  });
  return new Response(JSON.stringify(body), { ...init, headers });
}

function errorJson(status: number, code: string, message: string) {
  console.error(`❌ Error ${status}: ${code} - ${message}`);
  return json(
    { success: false, error: { code, message } },
    { status }
  );
}

// ------------------------------
// Env helpers
// ------------------------------
function envRequired(key: string): string {
  const val = Deno.env.get(key);
  if (!val) throw new Error(`Missing env: ${key}`);
  return val;
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1] ?? null;
}

// ------------------------------
// Types
// ------------------------------
interface IngredientInput {
  ingredient_id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_weight?: number;
}

interface SaveDishRequest {
  name: string;
  category: string;
  ingredients_json: IngredientInput[];
  instructions: string[];
  // Optional - if not provided, will be calculated by backend
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  calories?: number;
}

interface Dish {
  id: string;
  name: string;
  category: string;
  ingredients_description: string;
  ingredients_json: IngredientInput[];
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

// ------------------------------
// Helper: Create ingredients_description from ingredients_json
// ------------------------------
function createIngredientsDescription(ingredients: IngredientInput[]): string {
  return ingredients
    .map((ing) => {
      const qty = ing.quantity;
      const unit = ing.unit || "g";
      return `${ing.name} - ${qty}${unit}`;
    })
    .join(", ");
}

// ------------------------------
// Main handler
// ------------------------------
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return errorJson(405, "METHOD_NOT_ALLOWED", "Only POST requests allowed");
  }

  try {
    // Get auth token
    const token = getBearer(req);
    if (!token) {
      return errorJson(401, "UNAUTHORIZED", "Missing Authorization header");
    }

    // Create Supabase client with user's token
    const supabaseUrl = envRequired("SUPABASE_URL");
    const supabaseAnonKey = envRequired("SUPABASE_ANON_KEY");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return errorJson(401, "INVALID_TOKEN", "Invalid or expired token");
    }

    console.log(`✅ User authenticated: ${user.id}`);

    // Parse request body
    const body: SaveDishRequest = await req.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return errorJson(400, "VALIDATION_ERROR", "Dish name is required");
    }
    if (!body.category?.trim()) {
      return errorJson(400, "VALIDATION_ERROR", "Category is required");
    }
    if (!body.ingredients_json || body.ingredients_json.length === 0) {
      return errorJson(400, "VALIDATION_ERROR", "At least one ingredient is required");
    }

    console.log(`📝 Saving dish: ${body.name} with ${body.ingredients_json.length} ingredients`);

    // Step 1: Get category_id from categories table
    const { data: categoryData, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("name", body.category)
      .single();

    if (categoryError && categoryError.code !== "PGRST116") {
      console.error("Category lookup error:", categoryError);
    }

    const category_id = categoryData?.id || null;
    console.log(`📁 Category ID: ${category_id || "not found"}`);

    // Step 2: Calculate nutrition using PostgreSQL RPC
    let nutrition = {
      calories: body.calories ?? 0,
      protein: body.protein ?? 0,
      fat: body.fat ?? 0,
      carbs: body.carbs ?? 0,
      fiber: body.fiber ?? 0,
    };

    // Only call RPC if macros not provided
    const needsCalculation =
      body.calories === undefined ||
      body.protein === undefined ||
      body.fat === undefined ||
      body.carbs === undefined;

    if (needsCalculation) {
      console.log("🧮 Calculating nutrition via RPC...");

      const ingredientsForRpc = body.ingredients_json.map((ing) => ({
        id: ing.ingredient_id,
        quantity: ing.quantity,
        unit: ing.unit,
        unit_weight: ing.unit_weight,
      }));

      const { data: nutritionData, error: rpcError } = await supabase.rpc(
        "calculate_meal_nutrition",
        { p_ingredients: ingredientsForRpc }
      );

      if (rpcError) {
        console.error("RPC error:", rpcError);
        return errorJson(500, "CALCULATION_ERROR", "Failed to calculate nutrition");
      }

      if (nutritionData) {
        nutrition = {
          calories: nutritionData.calories ?? 0,
          protein: nutritionData.protein ?? 0,
          fat: nutritionData.fat ?? 0,
          carbs: nutritionData.carbs ?? 0,
          fiber: nutritionData.fiber ?? 0,
        };
        console.log("✅ Nutrition calculated:", nutrition);
      }
    }

    // Step 3: Create ingredients_description
    const ingredients_description = createIngredientsDescription(body.ingredients_json);
    console.log(`📝 Ingredients description: ${ingredients_description.substring(0, 100)}...`);

    // Step 4: Insert dish into database
    const { data: dish, error: insertError } = await supabase
      .from("dishes")
      .insert({
        name: body.name.trim(),
        category: body.category,
        category_id,
        ingredients_description,
        ingredients_json: body.ingredients_json,
        instructions: body.instructions || [],
        protein: nutrition.protein,
        fat: nutrition.fat,
        carbs: nutrition.carbs,
        fiber: nutrition.fiber,
        calories: nutrition.calories,
        user_id: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);

      // Handle duplicate dish errors
      if (insertError.code === "23505") {
        if (insertError.message.includes("dishes_name_user_id_unique_idx")) {
          return errorJson(409, "DUPLICATE_NAME", "Potrawa o tej nazwie już istnieje");
        }
        if (insertError.message.includes("dishes_ingredients_user_id_unique_idx")) {
          return errorJson(409, "DUPLICATE_INGREDIENTS", "Potrawa o identycznych składnikach już istnieje");
        }
      }

      return errorJson(500, "INSERT_ERROR", insertError.message);
    }

    console.log(`✅ Dish saved: ${dish.id}`);

    // Return success with created dish
    return json({
      success: true,
      dish: dish as Dish,
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return errorJson(
      500,
      "INTERNAL_ERROR",
      err instanceof Error ? err.message : "Unexpected error"
    );
  }
});
